// File: src/app.js
const express = require('express');
const app = express();

app.use(express.json());

// ----------------------
// Configuration
// ----------------------
const LOCK_DURATION_MS = 60 * 1000; // 1 minute
const DEFAULT_PORT = process.env.PORT || 3000;

// ----------------------
// In-memory seat storage
// ----------------------
const seats = new Map();
for (let i = 1; i <= 10; i++) {
  seats.set(i, {
    id: i,
    status: 'available', // 'available' | 'locked' | 'booked'
    lockedBy: null,
    lockExpires: null,
    lockTimer: null,
  });
}

function seatSnapshot(seat) {
  const { lockTimer, ...rest } = seat;
  return rest;
}

function releaseLock(seat) {
  if (!seat) return;
  if (seat.lockTimer) {
    clearTimeout(seat.lockTimer);
    seat.lockTimer = null;
  }
  seat.status = 'available';
  seat.lockedBy = null;
  seat.lockExpires = null;
}

// ----------------------
// Routes
// ----------------------

// Root route
app.get('/', (req, res) => {
  res.send('🎉 Welcome to the Concurrent Ticket Booking System!');
});

// View all seats
app.get('/seats', (req, res) => {
  res.json({ success: true, seats: Array.from(seats.values()).map(seatSnapshot) });
});

// View single seat
app.get('/seats/:id', (req, res) => {
  const id = Number(req.params.id);
  const seat = seats.get(id);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });
  res.json({ success: true, seat: seatSnapshot(seat) });
});

// Lock a seat temporarily
app.post('/lock', (req, res) => {
  const { seatId, userId } = req.body;
  if (!seatId || !userId)
    return res.status(400).json({ success: false, message: 'seatId and userId are required' });

  const id = Number(seatId);
  const seat = seats.get(id);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });

  if (seat.status === 'booked') {
    return res.status(409).json({ success: false, message: 'Seat already booked' });
  }

  if (seat.status === 'locked') {
    if (seat.lockExpires && Date.now() > seat.lockExpires) {
      releaseLock(seat); // expired lock
    } else {
      return res.status(409).json({ success: false, message: `Seat currently locked by ${seat.lockedBy}` });
    }
  }

  // Lock the seat
  seat.status = 'locked';
  seat.lockedBy = userId;
  seat.lockExpires = Date.now() + LOCK_DURATION_MS;

  if (seat.lockTimer) clearTimeout(seat.lockTimer);

  seat.lockTimer = setTimeout(() => {
    if (seat.status === 'locked' && seat.lockedBy === userId && Date.now() >= seat.lockExpires) {
      releaseLock(seat);
      console.log(`Lock expired for seat ${seat.id} (user: ${userId})`);
    }
  }, LOCK_DURATION_MS + 50);

  return res.json({
    success: true,
    message: `Seat ${id} locked for user ${userId} for ${LOCK_DURATION_MS / 1000} seconds`,
    seat: seatSnapshot(seat),
  });
});

// Confirm booking
app.post('/confirm', (req, res) => {
  const { seatId, userId } = req.body;
  if (!seatId || !userId)
    return res.status(400).json({ success: false, message: 'seatId and userId are required' });

  const id = Number(seatId);
  const seat = seats.get(id);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });

  if (seat.status === 'booked')
    return res.status(409).json({ success: false, message: 'Seat already booked' });

  if (seat.status !== 'locked')
    return res.status(409).json({ success: false, message: 'Seat is not locked' });

  if (seat.lockedBy !== userId)
    return res.status(403).json({ success: false, message: 'You do not own the lock for this seat' });

  if (seat.lockExpires && Date.now() > seat.lockExpires) {
    releaseLock(seat);
    return res.status(409).json({ success: false, message: 'Lock has expired. Please try locking again.' });
  }

  if (seat.lockTimer) clearTimeout(seat.lockTimer);
  seat.lockTimer = null;
  seat.status = 'booked';
  seat.lockedBy = userId;
  seat.lockExpires = null;

  return res.json({
    success: true,
    message: `Seat ${id} successfully booked by ${userId}`,
    seat: seatSnapshot(seat),
  });
});

// Release lock manually
app.post('/release', (req, res) => {
  const { seatId, userId } = req.body;
  if (!seatId || !userId)
    return res.status(400).json({ success: false, message: 'seatId and userId are required' });

  const id = Number(seatId);
  const seat = seats.get(id);
  if (!seat) return res.status(404).json({ success: false, message: 'Seat not found' });

  if (seat.status !== 'locked')
    return res.status(409).json({ success: false, message: 'Seat is not locked' });

  if (seat.lockedBy !== userId)
    return res.status(403).json({ success: false, message: 'You do not own the lock' });

  releaseLock(seat);
  return res.json({ success: true, message: `Lock released for seat ${id}` });
});

// Catch-all route
app.all('*', (req, res) => {
  res.status(404).send('❌ Route not found');
});

// ----------------------
// Start server with auto-port fallback
// ----------------------
function startServer(port) {
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`✅ Server running at ${url}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);
