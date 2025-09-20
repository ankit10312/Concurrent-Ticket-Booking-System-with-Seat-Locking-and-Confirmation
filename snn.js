// File: src/app.js

const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// ----------------------
// Example Routes
// ----------------------
app.get('/', (req, res) => {
  res.send('🎉 Welcome to the Ticket Booking System');
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express API!' });
});

// ----------------------
// Start Server with Auto Port Fallback
// ----------------------
const DEFAULT_PORT = process.env.PORT || 3000;

function startServer(port) {
  const server = app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`✅ Server running at ${url}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} is busy, trying ${port + 1}...`);
      startServer(port + 1); // retry with next port
    } else {
      console.error('❌ Server error:', err);
      process.exit(1);
    }
  });
}

startServer(DEFAULT_PORT);
