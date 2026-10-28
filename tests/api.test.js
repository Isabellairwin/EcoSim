const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { app } = require('../server');

let testServer;
let testPort;

test.before(async () => {
  await new Promise((resolve, reject) => {
    testServer = app.listen(0, '127.0.0.1', () => {
      testPort = testServer.address().port;
      resolve();
    });
    testServer.on('error', reject);
  });
});

test.after(async () => {
  if (testServer) {
    await new Promise(resolve => testServer.close(resolve));
  }
});

// Helper to make local HTTP requests against running test server
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: testPort,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('API Health Endpoint - Returns Status & Diagnostics', async () => {
  const res = await request('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.ok(res.body.app.includes('EcoSim'));
  assert.ok(res.body.database);
  assert.ok(res.body.uptime);
});

test('API Simulation Calculate Endpoint - Valid Computation', async () => {
  const payload = {
    vehicles: 100,
    buildings: 80,
    trees: 400,
    solarPanels: 200,
    greenSpaceSqKm: 5,
    publicTransitRatio: 40
  };

  const res = await request('POST', '/api/simulation/calculate', payload);
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.ok(res.body.simulation.metrics.sustainability.score >= 0);
  assert.equal(res.body.simulation.isEstimate, true);
});

test('API Validation Middleware - Rejects Invalid City Data', async () => {
  // Empty city name
  const resEmptyName = await request('POST', '/api/cities', {
    cityName: '',
    vehicles: 10,
    buildings: 10,
    trees: 10,
    solarPanels: 10
  });
  assert.equal(resEmptyName.status, 400);
  assert.equal(resEmptyName.body.success, false);

  // Negative values
  const resNegative = await request('POST', '/api/cities', {
    cityName: 'Negative City',
    vehicles: -50,
    buildings: 10,
    trees: 10,
    solarPanels: 10
  });
  assert.equal(resNegative.status, 400);
  assert.equal(resNegative.body.success, false);

  // Non-integer values
  const resFloat = await request('POST', '/api/cities', {
    cityName: 'Float City',
    vehicles: 23.45,
    buildings: 10,
    trees: 10,
    solarPanels: 10
  });
  assert.equal(resFloat.status, 400);
  assert.equal(resFloat.body.success, false);
});

test('API ObjectId Validation - Rejects Malformed ID', async () => {
  const resInvalidId = await request('GET', '/api/cities/not-a-valid-mongo-id');
  assert.equal(resInvalidId.status, 400);
  assert.equal(resInvalidId.body.success, false);
  assert.ok(resInvalidId.body.error.includes('Invalid City ID'));
});

test('API 404 Route Handling - Non-existent Endpoint', async () => {
  const res = await request('GET', '/api/unknown-endpoint');
  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
});
