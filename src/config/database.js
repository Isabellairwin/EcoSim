const mongoose = require('mongoose');

let connectionState = {
  status: 'INITIALIZING', // 'CONNECTED' | 'DISCONNECTED' | 'WAITING_FOR_CREDENTIALS' | 'ERROR'
  category: 'NONE',
  message: 'Database connection has not been initialized yet.',
  databaseName: 'ecosim',
  lastAttempt: null,
  error: null
};

/**
 * Safely masks MongoDB URI credentials for logging and UI display
 */
function maskUri(uri) {
  if (!uri) return 'NOT_CONFIGURED';
  try {
    return uri.replace(/\/\/([^@]+)@/, '//***:***@');
  } catch (e) {
    return 'MASKED_URI';
  }
}

/**
 * Categorizes Mongoose connection errors to provide actionable guidance
 */
function categorizeError(err) {
  const errMsg = (err && err.message) ? err.message : '';
  let serverErrors = [];
  if (err && err.reason && err.reason.servers) {
    for (const [addr, desc] of err.reason.servers) {
      if (desc.error) {
        serverErrors.push(desc.error.message || '');
      }
    }
  }
  const combined = (errMsg + ' ' + serverErrors.join(' ')).toLowerCase();

  if (
    combined.includes('ssl alert number 80') ||
    combined.includes('tlsv1 alert internal error') ||
    combined.includes('whitelisted') ||
    combined.includes('whitelist') ||
    combined.includes('access list')
  ) {
    return {
      category: 'NETWORK_ACCESS_IP_ALLOWLIST',
      userMessage: 'Atlas IP Allowlist: Your current public IP is not whitelisted in MongoDB Atlas Network Access.'
    };
  }

  if (
    combined.includes('auth') ||
    combined.includes('authentication') ||
    combined.includes('bad auth') ||
    combined.includes('password')
  ) {
    return {
      category: 'AUTHENTICATION_FAILURE',
      userMessage: 'Authentication Failed: Verify database username and password in Atlas Database Access.'
    };
  }

  if (combined.includes('querysrv') || combined.includes('enotfound')) {
    return {
      category: 'DNS_SRV_FAILURE',
      userMessage: 'DNS SRV Failure: Cluster hostname could not be resolved. Check internet or VPN connection.'
    };
  }

  if (combined.includes('cluster is paused') || combined.includes('cluster paused')) {
    return {
      category: 'CLUSTER_PAUSED',
      userMessage: 'Cluster Paused: Resume your free tier cluster from the Atlas dashboard.'
    };
  }

  return {
    category: 'CONNECTION_FAILURE',
    userMessage: 'Could not connect to MongoDB Atlas cluster. Check network access or cluster status.'
  };
}

/**
 * Initializes and manages MongoDB Atlas connection
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

  if (!uri) {
    connectionState = {
      status: 'WAITING_FOR_CREDENTIALS',
      category: 'MISSING_URI',
      message: 'MongoDB URI is empty. Open EcoSim/.env and paste your connection string after MONGODB_URI=',
      databaseName: 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: 'Missing MONGODB_URI in .env'
    };
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [EcoSim] MONGODB_URI is not set in EcoSim/.env.');
    return false;
  }

  // Check for lingering placeholder brackets <username> or <password>
  if (uri.includes('<') && uri.includes('>')) {
    connectionState = {
      status: 'WAITING_FOR_CREDENTIALS',
      category: 'PLACEHOLDER_URI',
      message: 'MongoDB URI still contains placeholder angle brackets < >. Replace with actual Atlas credentials.',
      databaseName: 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: 'Placeholder angle brackets detected in MONGODB_URI'
    };
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [EcoSim] Detected placeholder angle brackets < > in MONGODB_URI.');
    return false;
  }

  // Avoid duplicate connect if already connected or connecting
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  if (mongoose.connection.readyState === 2) {
    return false; // Connection in flight
  }

  try {
    connectionState.lastAttempt = new Date().toISOString();
    connectionState.status = 'CONNECTING';
    connectionState.category = 'CONNECTING';
    connectionState.message = `Connecting to MongoDB Atlas... (${maskUri(uri)})`;

    const options = {
      dbName: 'ecosim',
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 8000,
      socketTimeoutMS: 45000
    };

    await mongoose.connect(uri, options);

    connectionState = {
      status: 'CONNECTED',
      category: 'NONE',
      message: 'Successfully connected to MongoDB Atlas (ecosim database)',
      databaseName: mongoose.connection.name || 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: null
    };

    console.log('\x1b[32m%s\x1b[0m', '✅ [EcoSim] MongoDB Atlas connected successfully! Database: ' + connectionState.databaseName);
    return true;
  } catch (err) {
    const analysis = categorizeError(err);

    connectionState = {
      status: 'ERROR',
      category: analysis.category,
      message: analysis.userMessage,
      databaseName: 'ecosim',
      lastAttempt: new Date().toISOString(),
      error: maskUri(err.message)
    };

    console.error('\x1b[31m%s\x1b[0m', `❌ [EcoSim] MongoDB Connection Error [${analysis.category}]: ${analysis.userMessage}`);
    return false;
  }
}

// Mongoose connection event hooks
mongoose.connection.on('connected', () => {
  connectionState.status = 'CONNECTED';
  connectionState.category = 'NONE';
  connectionState.message = 'MongoDB connection active.';
});

mongoose.connection.on('disconnected', () => {
  if (connectionState.status === 'CONNECTED') {
    connectionState.status = 'DISCONNECTED';
    connectionState.category = 'DISCONNECTED';
    connectionState.message = 'MongoDB connection lost. Attempting reconnect...';
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  [EcoSim] MongoDB connection disconnected.');
  }
});

mongoose.connection.on('error', (err) => {
  connectionState.status = 'ERROR';
  connectionState.message = maskUri(err.message);
  console.error('\x1b[31m%s\x1b[0m', '❌ [EcoSim] Mongoose runtime error: ' + maskUri(err.message));
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
