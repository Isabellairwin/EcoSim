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

  let instructions = 'MongoDB is actively connected to Atlas.';
  if (!isConnected) {
    if (dbStatus.category === 'NETWORK_ACCESS_IP_ALLOWLIST') {
      instructions = 'MongoDB Atlas rejected connection: Add your current public IP in Atlas -> Security -> Network Access.';
    } else if (dbStatus.category === 'AUTHENTICATION_FAILURE') {
      instructions = 'Authentication failed: Verify database user and password in Atlas -> Security -> Database Access.';
    } else if (dbStatus.category === 'MISSING_URI') {
      instructions = 'Open EcoSim/.env and paste your connection string after MONGODB_URI=';
    } else {
      instructions = dbStatus.message || 'Check MongoDB Atlas cluster status and credentials in EcoSim/.env';
    }
  }

  res.status(200).json({
    status: isConnected ? 'healthy' : 'pending_db_config',
    app: 'EcoSim — Miniature Smart City Simulator',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds} seconds`,
    nodeVersion: process.version,
    database: {
      status: dbStatus.status,
      category: dbStatus.category || 'NONE',
      connected: isConnected,
      name: dbStatus.databaseName,
      message: dbStatus.message,
      lastAttempt: dbStatus.lastAttempt,
      instructions
    }
  });
});

/**
 * POST /api/health/reconnect
 * Allows client UI to trigger a fresh connection attempt after updating .env or Atlas IP allowlist
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
