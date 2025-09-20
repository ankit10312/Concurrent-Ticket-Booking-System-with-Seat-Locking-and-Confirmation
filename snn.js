const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Simulating an in-memory seat reservation system
let seats = {
  "1": { status: "available", lockExpiresAt: null },
  "2": { status: "available", lockExpiresAt: null },
  "3": { status: "available", lockExpiresAt: null },
  "4": { status: "available", lockExpiresAt: null },
  "5": { status: "available", lockExpiresAt: null },
};

// Middleware to parse JSON bodies
app.use(express.json());

// Endpoint to get the current status of seats
app.get('/seats', (req, res) => {
  res.status(200).json(seats);
});

// Endpoint to lock a seat
app.post('/lock/:seatId', (req, res) => {
  const seatId = req.params.seatId;
  const seat = seats[seatId];

  if (!seat) {
    return res.status(400).json({ message: "Seat not found." });
  }

  if (seat.status === "locked") {
    return res.status(400).json({ message: `Seat ${seatId} is already locked.` });
  }

  // Lock the seat for 1 minute
  seat.status = "locked";
  seat.lockExpiresAt = Date.now() + 60000; // Lock expires in 1 minute

  return res.status(200).json({
    message: `Seat ${seatId} locked successfully. Confirm within 1 minute.`,
  });
});

// Endpoint to confirm booking of a seat
app.post('/confirm/:seatId', (req, res) => {
  const seatId = req.params.seatId;
  const seat = seats[seatId];

  if (!seat) {
    return res.status(400).json({ message: "Seat not found." });
  }

  if (seat.status !== "locked") {
    return res.status(400).json({ message: `Seat ${seatId} is not locked and cannot be booked.` });
  }

  if (Date.now() > seat.lockExpiresAt) {
    seat.status = "available";
    seat.lockExpiresAt = null;
    return res.status(400).json({ message: `Seat ${seatId} lock expired. Please lock the seat again.` });
  }

  seat.status = "booked";
  seat.lockExpiresAt = null;

  return res.status(200).json({ message: `Seat ${seatId} booked successfully!` });
});

// Cleanup expired locks every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (let seatId in seats) {
    if (seats[seatId].lockExpiresAt && now > seats[seatId].lockExpiresAt) {
      seats[seatId].status = "available";
      seats[seatId].lockExpiresAt = null;
      console.log(`Lock for seat ${seatId} expired and reset.`);
    }
  }
}, 30000); // Run every 30 seconds

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
