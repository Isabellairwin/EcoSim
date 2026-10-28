/**
 * EcoSim — MongoDB Atlas Diagnostic & Connectivity Test Tool
 * 
 * Performs safe pre-flight diagnostics (DNS, TCP, Public IP, TLS Handshake)
 * and verifies Mongoose database connectivity without exposing secrets.
 * 
 * Run with: npm run test:db
 */
require('dotenv').config({ override: true });
const mongoose = require('mongoose');
const dns = require('dns').promises;
const net = require('net');
const https = require('https');

/**
 * Safely masks MongoDB URI credentials for logging
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
 * Fetches current public IP to assist user with Atlas IP allowlisting
 */
function fetchPublicIP() {
  return new Promise((resolve) => {
    const req = https.get('https://api.ipify.org?format=json', { timeout: 3000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ip || null);
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

/**
 * Tests direct TCP connection to host on port 27017
 */
function testTcpPort(host, port = 27017, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port, timeout: timeoutMs });
    socket.on('connect', () => {
      socket.destroy();
      resolve({ success: true });
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve({ success: false, reason: 'TIMED_OUT' });
    });
    socket.on('error', (err) => {
      resolve({ success: false, reason: err.code || err.message });
    });
  });
}

async function runDatabaseDiagnostics() {
  console.log('='.repeat(70));
  console.log(' 🔍 EcoSim — MongoDB Atlas Connection Diagnostic Tool');
  console.log('='.repeat(70));

  const rawUri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

  // 1. URI Presence & Validation
  if (!rawUri) {
    console.error('\x1b[31m%s\x1b[0m', '❌ [CATEGORY: INVALID_URI] MONGODB_URI is empty or missing in EcoSim/.env');
    console.log('\n👉 ACTION REQUIRED:');
    console.log('1. Open EcoSim/.env');
    console.log('2. Add MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ecosim?retryWrites=true&w=majority');
    console.log('3. Save the file (Ctrl+S) and run "npm run test:db" again.\n');
    process.exit(1);
  }

  if (rawUri.includes('<') && rawUri.includes('>')) {
    console.error('\x1b[31m%s\x1b[0m', '❌ [CATEGORY: INVALID_URI] Detected placeholder angle brackets < > in MONGODB_URI');
    console.log('👉 ACTION REQUIRED: Replace <username> and <password> with your actual database user credentials.\n');
    process.exit(1);
  }

  if (!rawUri.startsWith('mongodb://') && !rawUri.startsWith('mongodb+srv://')) {
    console.error('\x1b[31m%s\x1b[0m', '❌ [CATEGORY: INVALID_URI] Connection string must start with mongodb+srv:// or mongodb://');
    process.exit(1);
  }

  const masked = maskUri(rawUri);
  console.log(`📡 Target Cluster URI : ${masked}`);

  // Extract cluster hostname
  const hostMatch = rawUri.match(/@([^/?#]+)/);
  const clusterHost = hostMatch ? hostMatch[1].split(':')[0] : null;

  if (!clusterHost) {
    console.error('\x1b[31m%s\x1b[0m', '❌ [CATEGORY: INVALID_URI] Could not parse cluster hostname from URI.');
    process.exit(1);
  }
  console.log(`🌐 Cluster Hostname   : ${clusterHost}`);

  // Fetch Public IP in parallel
  const publicIP = await fetchPublicIP();
  if (publicIP) {
    console.log(`📍 Detected Public IP : ${publicIP}`);
  }

  // 2. DNS SRV Resolution Check
  console.log('\n⏳ Step 1: Checking DNS SRV resolution for cluster...');
  let resolvedHosts = [];
  try {
    const srvRecords = await dns.resolveSrv(`_mongodb._tcp.${clusterHost}`);
    resolvedHosts = srvRecords.map(r => r.name);
    console.log('\x1b[32m%s\x1b[0m', `   ✔ DNS OK: Resolved ${resolvedHosts.length} shard server(s)`);
  } catch (dnsErr) {
    console.error('\x1b[31m%s\x1b[0m', `   ✖ DNS FAILED: ${dnsErr.message}`);
    console.log('\n👉 [CATEGORY: DNS_RESOLUTION_FAILURE]');
    console.log('   - Verify that your cluster hostname is spelled correctly in .env.');
    console.log('   - Check your internet connection or try switching DNS to Google (8.8.8.8) or Cloudflare (1.1.1.1).');
    console.log('   - If you are connected to a VPN, try disconnecting or testing without the VPN.');
    process.exit(1);
  }

  // 3. TCP Port 27017 Reachability Check
  console.log('⏳ Step 2: Testing TCP port 27017 reachability...');
  const firstHost = resolvedHosts[0];
  const tcpResult = await testTcpPort(firstHost, 27017);
  if (tcpResult.success) {
    console.log('\x1b[32m%s\x1b[0m', `   ✔ TCP OK: Port 27017 on ${firstHost} is reachable`);
  } else {
    console.warn('\x1b[33m%s\x1b[0m', `   ⚠️ TCP Warning: Could not connect to port 27017 (${tcpResult.reason})`);
    console.log('   - Your local firewall, ISP, router, or VPN may be blocking outbound port 27017.');
  }

  // 4. Mongoose Database Connection Handshake
  console.log('⏳ Step 3: Establishing authenticated Mongoose session...');
  const startTime = Date.now();

  try {
    // Avoid double connect if already active
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(rawUri, {
      dbName: 'ecosim',
      serverSelectionTimeoutMS: 6000,
      connectTimeoutMS: 8000
    });

    const elapsed = Date.now() - startTime;
    console.log('\x1b[32m%s\x1b[0m', `\n✅ SUCCESS: Connected to MongoDB Atlas in ${elapsed}ms!`);
    console.log(`📦 Active Database  : ${mongoose.connection.name}`);
    console.log(`🔌 Mongoose State   : Connected (readyState ${mongoose.connection.readyState})`);

    // Verify collection access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📂 Collections (${collections.length}):`, collections.map(c => c.name).join(', ') || 'Ready for initialization (none yet)');

    console.log('\n✨ Database is 100% operational and ready for EcoSim CRUD operations!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '\n❌ DATABASE CONNECTION FAILED:');
    
    // Categorize error based on low-level indicators
    let category = 'GENERAL_ERROR';
    const errMsg = err.message || '';
    
    // Check underlying server descriptions if available
    let serverErrors = [];
    if (err.reason && err.reason.servers) {
      for (const [addr, desc] of err.reason.servers) {
        if (desc.error) {
          serverErrors.push(desc.error.message || '');
        }
      }
    }
    const combinedErrorText = (errMsg + ' ' + serverErrors.join(' ')).toLowerCase();

    if (
      combinedErrorText.includes('ssl alert number 80') ||
      combinedErrorText.includes('tlsv1 alert internal error') ||
      combinedErrorText.includes('whitelisted') ||
      combinedErrorText.includes('whitelist') ||
      combinedErrorText.includes('access list')
    ) {
      category = 'NETWORK_ACCESS_IP_ALLOWLIST';
    } else if (
      combinedErrorText.includes('auth') ||
      combinedErrorText.includes('authentication') ||
      combinedErrorText.includes('bad auth') ||
      combinedErrorText.includes('password')
    ) {
      category = 'AUTHENTICATION_FAILURE';
    } else if (
      combinedErrorText.includes('querysrv') ||
      combinedErrorText.includes('enotfound')
    ) {
      category = 'DNS_SRV_FAILURE';
    } else if (
      combinedErrorText.includes('cluster is paused') ||
      combinedErrorText.includes('cluster paused')
    ) {
      category = 'CLUSTER_PAUSED';
    } else if (
      combinedErrorText.includes('timed out') ||
      combinedErrorText.includes('etimedout')
    ) {
      category = 'CONNECTION_TIMEOUT';
    }

    console.log(`🏷️  Failure Category: [${category}]`);
    console.log(`💬 Diagnostic Detail: ${errMsg}`);

    console.log('\n👉 NEXT TROUBLESHOOTING ACTIONS:');

    if (category === 'NETWORK_ACCESS_IP_ALLOWLIST' || category === 'CONNECTION_TIMEOUT') {
      console.log('1. [ATLAS NETWORK ACCESS - CRITICAL]');
      console.log('   MongoDB Atlas rejected the connection because your current public IP is not in your cluster allowlist.');
      if (publicIP) {
        console.log(`   👉 Your detected Public IP is: ${publicIP}`);
      }
      console.log('   Steps to fix in MongoDB Atlas:');
      console.log('     a. Log in to https://cloud.mongodb.com');
      console.log('     b. In the left menu under "Security", click "Network Access".');
      console.log('     c. Click the "Add IP Address" button.');
      console.log('     d. Click "Add Current IP Address" (or enter your public IP).');
      console.log('     e. Click "Confirm" and wait ~1 minute for Atlas to apply the status to "Active".');
      console.log('\n2. [VPN / MOBILE HOTSPOT USERS]');
      console.log('   If you are connected to a VPN, your public IP matches the VPN gateway.');
      console.log('   - Either add your VPN public IP to Atlas Network Access, OR');
      console.log('   - Temporarily disconnect from the VPN, check your IP again, and add that IP to Atlas.');
    } else if (category === 'AUTHENTICATION_FAILURE') {
      console.log('1. [ATLAS DATABASE ACCESS - USER CREDENTIALS]');
      console.log('   - Go to MongoDB Atlas -> Security -> Database Access.');
      console.log('   - Ensure your database user exists and has "Read and write to any database" (or ecosim database).');
      console.log('   - Click "Edit" on the user and reset/verify the password.');
      console.log('   - If your password has special characters like @, :, #, or /, URL-encode them in .env (e.g. @ -> %40).');
    } else if (category === 'DNS_SRV_FAILURE') {
      console.log('1. [DNS / NETWORK CONFIGURATION]');
      console.log('   - Verify cluster hostname ecosim.uub8f8t.mongodb.net in .env.');
      console.log('   - Disconnect any VPN or proxy that might fail DNS SRV queries.');
    } else if (category === 'CLUSTER_PAUSED') {
      console.log('1. [ATLAS CLUSTER RESUME]');
      console.log('   - Go to MongoDB Atlas -> Deployments -> Database.');
      console.log('   - If your free cluster is paused due to inactivity, click "Resume".');
    } else {
      console.log('1. Verify your connection string in EcoSim/.env.');
      console.log('2. Check Atlas dashboard at https://cloud.mongodb.com to confirm cluster health.');
    }

    console.log('\nAfter applying the fix above, test again with: npm run test:db\n');
    process.exit(1);
  }
}

runDatabaseDiagnostics();
