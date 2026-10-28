/**
 * EcoSim — MongoDB Atlas Diagnostic & Connectivity Test Tool
 * 
 * Run with: npm run test:db
 */
require('dotenv').config({ override: true });
const mongoose = require('mongoose');

async function testDatabaseConnection() {
  console.log('='.repeat(65));
  console.log(' 🔍 EcoSim — MongoDB Atlas Connection Verifier');
  console.log('='.repeat(65));

  const uri = process.env.MONGODB_URI ? process.env.MONGODB_URI.trim() : '';

  if (!uri) {
    console.error('\x1b[31m%s\x1b[0m', '❌ FAILURE: MONGODB_URI is empty or missing in EcoSim/.env');
    console.log('\n👉 Instructions:');
    console.log('1. Open EcoSim/.env');
    console.log('2. Paste your MongoDB Atlas connection string after MONGODB_URI=');
    console.log('3. Example: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecosim');
    console.log('4. Save the file (Ctrl+S) and run "npm run test:db" again.\n');
    process.exit(1);
  }

  if (uri.includes('<') && uri.includes('>')) {
    console.error('\x1b[31m%s\x1b[0m', '❌ FAILURE: MONGODB_URI still contains placeholder angle brackets < >');
    console.log('Replace <username> and <password> with your actual Atlas database user credentials.');
    process.exit(1);
  }

  // Mask credentials for display
  const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`📡 Target Cluster URI: ${masked}`);
  console.log('⏳ Connecting to MongoDB Atlas cluster...');

  const startTime = Date.now();

  try {
    await mongoose.connect(uri, {
      dbName: 'ecosim',
      serverSelectionTimeoutMS: 8000
    });

    const elapsed = Date.now() - startTime;
    console.log('\x1b[32m%s\x1b[0m', `\n✅ SUCCESS: Connected to MongoDB Atlas in ${elapsed}ms!`);
    console.log(`📦 Database: ${mongoose.connection.name}`);
    console.log(`🔌 ReadyState: ${mongoose.connection.readyState} (Connected)`);
    
    // Check collection access
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`📂 Existing Collections (${collections.length}):`, collections.map(c => c.name).join(', ') || 'None (ready to initialize)');

    console.log('\n✨ Database is 100% operational and ready for EcoSim CRUD operations!\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '\n❌ CONNECTION FAILED:');
    console.error(err.message);
    console.log('\n🔧 Troubleshooting Tips:');
    console.log('1. Verify your database username and password in MongoDB Atlas > Database Access.');
    console.log('2. Ensure Network Access in MongoDB Atlas allows your IP (or 0.0.0.0/0 for anywhere).');
    console.log('3. If your password has special characters (@, :, #, /), URL-encode them.');
    console.log('4. Make sure your cluster is not paused in the Atlas dashboard.\n');
    process.exit(1);
  }
}

testDatabaseConnection();

