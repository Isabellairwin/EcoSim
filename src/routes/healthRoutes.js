const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { connectDB, getConnectionStatus } = require('../config/database');

/**
 * GET /api/health
 * Returns application health, server uptime, and MongoDB status
 */
router.get('/', (req, res) => {
  const dbStatus = getConnectionStatus();
  const uptimeSeconds = Math.round(process.uptime());

  const isConnected = mongoose.connection.readyState === 1;

  res.status(isConnected ? 200 : 200).json({
    status: isConnected ? 'healthy' : 'pending_db_config',
    app: 'EcoSim — Miniature Smart City Simulator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds} seconds`,
    nodeVersion: process.version,
    database: {
      status: dbStatus.status,
      connected: isConnected,
      name: dbStatus.databaseName,
      message: dbStatus.message,
      lastAttempt: dbStatus.lastAttempt,
      instructions: !isConnected
        ? 'Open EcoSim/.env and paste your MongoDB Atlas connection string after MONGODB_URI=, then save with Ctrl+S.'
        : 'MongoDB is actively connected to Atlas.'
    }
  });
});

/**
 * POST /api/health/reconnect
 * Allows client UI to trigger a fresh connection attempt after updating .env
 */
router.post('/reconnect', async (req, res) => {
  // Reload dotenv to pick up any edits to .env file without full restart
  require('dotenv').config({ override: true });

  const success = await connectDB();
  const dbStatus = getConnectionStatus();

  res.json({
    success,
    dbStatus
  });
});

module.exports = router;

