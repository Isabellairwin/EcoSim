const mongoose = require('mongoose');

let connectionState = {
  status: 'INITIALIZING', // 'CONNECTED' | 'DISCONNECTED' | 'WAITING_FOR_CREDENTIALS' | 'ERROR'
  message: 'Database connection has not been initialized yet.',
  databaseName: 'ecosim',
  lastAttempt: null,
  error: null
};

/**
 * Safely masks MongoDB URI credentials for logging
 */
function maskUri(uri) {
  if (!uri) return 'NOT_CONFIGURED';
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  } catch (e) {
    return 'MASKED_URI';
  }
}

/**
 * Initializes and manages MongoDB Atlas connection
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

  if (!uri) {
    connectionState = {
      status: 'WAITING_FOR_CREDENTIALS',
      message: 'MongoDB URI is empty. Please paste your MongoDB Atlas connection string after MONGODB_URI= in EcoSim/.env',
      databaseName: 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: 'Missing MONGODB_URI in .env'
    };
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [EcoSim] MONGODB_URI is not set in EcoSim/.env.');
    console.warn('\x1b[33m%s\x1b[0m', '👉  Open EcoSim/.env and paste your MongoDB Atlas connection string immediately after MONGODB_URI=, then save with Ctrl+S.');
    return false;
  }

  // Check for lingering placeholder brackets <username> or <password>
  if (uri.includes('<') && uri.includes('>')) {
    connectionState = {
      status: 'WAITING_FOR_CREDENTIALS',
      message: 'MongoDB URI still contains placeholder angle brackets < >. Please replace <username> and <password> with your actual database credentials.',
      databaseName: 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: 'Placeholder angle brackets detected in MONGODB_URI'
    };
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [EcoSim] Detected placeholder angle brackets < > in MONGODB_URI. Replace with actual Atlas username and password.');
    return false;
  }

  try {
    connectionState.lastAttempt = new Date().toISOString();
    connectionState.status = 'CONNECTING';
    connectionState.message = `Connecting to MongoDB Atlas... (${maskUri(uri)})`;

    // Ensure database name is ecosim if not specified in URI path
    const options = {
      dbName: 'ecosim',
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000
    };

    await mongoose.connect(uri, options);

    connectionState = {
      status: 'CONNECTED',
      message: 'Successfully connected to MongoDB Atlas (ecosim database)',
      databaseName: mongoose.connection.name || 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: null
    };

    console.log('\x1b[32m%s\x1b[0m', '✅ [EcoSim] MongoDB Atlas connected successfully! Database: ' + connectionState.databaseName);
    return true;
  } catch (err) {
    connectionState = {
      status: 'ERROR',
      message: 'Failed to connect to MongoDB Atlas. Check your username, password, network IP access list, or cluster address.',
      databaseName: 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: err.message
    };
    console.error('\x1b[31m%s\x1b[0m', '❌ [EcoSim] MongoDB Connection Error: ' + err.message);
    return false;
  }
}

// Mongoose connection event hooks
mongoose.connection.on('connected', () => {
  connectionState.status = 'CONNECTED';
  connectionState.message = 'MongoDB connection active.';
});

mongoose.connection.on('disconnected', () => {
  if (connectionState.status === 'CONNECTED') {
    connectionState.status = 'DISCONNECTED';
    connectionState.message = 'MongoDB connection lost. Attempting reconnect...';
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [EcoSim] MongoDB connection disconnected.');
  }
});

mongoose.connection.on('error', (err) => {
  connectionState.status = 'ERROR';
  connectionState.message = err.message;
  console.error('\x1b[31m%s\x1b[0m', '❌ [EcoSim] Mongoose runtime error: ' + err.message);
});

function getConnectionStatus() {
  return {
    ...connectionState,
    mongooseReadyState: mongoose.connection.readyState,
    readyStateText: ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'][mongoose.connection.readyState] || 'Unknown'
  };
}

module.exports = {
  connectDB,
  getConnectionStatus,
  maskUri
};

