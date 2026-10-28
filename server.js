require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB, getConnectionStatus } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/health', require('./src/routes/healthRoutes'));
app.use('/api/cities', require('./src/routes/cityRoutes'));
app.use('/api/simulation', require('./src/routes/simulationRoutes'));

// Root fallback to serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API Endpoint Not Found',
    path: req.originalUrl
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

// Start Server and initialize MongoDB connection
const server = app.listen(PORT, async () => {
  console.log('='.repeat(65));
  console.log(` 🌱 EcoSim — Miniature Smart City Simulator`);
  console.log(` 🚀 Server listening on: http://localhost:${PORT}`);
  console.log(` 🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(65));

  // Connect to MongoDB Atlas (or notify if URI is pending)
  await connectDB();
});

module.exports = { app, server };

