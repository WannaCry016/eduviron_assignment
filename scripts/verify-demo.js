#!/usr/bin/env node

/**
 * Demo Verification Script
 * 
 * This script verifies that all components are working:
 * 1. API is running
 * 2. Database connection works
 * 3. Authentication works
 * 4. All reporting endpoints return data
 * 
 * Run: node scripts/verify-demo.js
 */

const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CREDENTIALS = {
  username: 'super.admin',
  password: 'ChangeMe123!',
};

let accessToken = null;

function makeRequest(method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = res.headers['content-type']?.includes('application/json')
            ? JSON.parse(data)
            : data;
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
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

async function checkHealth() {
  console.log('✓ Checking health endpoint...');
  const res = await makeRequest('GET', '/health');
  if (res.status === 200 && res.data.status === 'ok') {
    console.log('  ✓ API is running');
    return true;
  }
  console.error('  ✗ Health check failed:', res.status, res.data);
  return false;
}

async function login() {
  console.log('✓ Logging in...');
  const res = await makeRequest('POST', '/auth/login', {}, CREDENTIALS);
  if (res.status === 201 && res.data.accessToken) {
    accessToken = res.data.accessToken;
    console.log('  ✓ Login successful, token received');
    return true;
  }
  console.error('  ✗ Login failed:', res.status, res.data);
  return false;
}

async function checkDashboard() {
  console.log('✓ Checking dashboard endpoint...');
  const res = await makeRequest('GET', '/reports/dashboard', {
    Authorization: `Bearer ${accessToken}`,
  });
  if (res.status === 200 && res.data.totals) {
    console.log(`  ✓ Dashboard loaded: ${res.data.totals.amountDue} due, ${res.data.totals.amountCollected} collected`);
    return true;
  }
  console.error('  ✗ Dashboard failed:', res.status, res.data);
  return false;
}

async function checkPendingPayments() {
  console.log('✓ Checking pending payments endpoint...');
  const res = await makeRequest('GET', '/reports/pending-payments?page=1&limit=10', {
    Authorization: `Bearer ${accessToken}`,
  });
  if (res.status === 200 && res.data.total !== undefined) {
    console.log(`  ✓ Pending payments loaded: ${res.data.total} total, ${res.data.data.length} in page`);
    return true;
  }
  console.error('  ✗ Pending payments failed:', res.status, res.data);
  return false;
}

async function checkExport() {
  console.log('✓ Checking CSV export endpoint...');
  const res = await makeRequest('GET', '/reports/pending-payments/export?limit=10', {
    Authorization: `Bearer ${accessToken}`,
  });
  if (res.status === 200 && res.headers['content-type']?.includes('text/csv')) {
    console.log(`  ✓ CSV export working (${res.data.length} bytes)`);
    return true;
  }
  console.error('  ✗ Export failed:', res.status, res.headers['content-type']);
  return false;
}

async function main() {
  console.log('\n🚀 Starting Demo Verification\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const checks = [
    { name: 'Health', fn: checkHealth },
    { name: 'Login', fn: login },
    { name: 'Dashboard', fn: checkDashboard },
    { name: 'Pending Payments', fn: checkPendingPayments },
    { name: 'CSV Export', fn: checkExport },
  ];

  let passed = 0;
  for (const check of checks) {
    try {
      const result = await check.fn();
      if (result) passed++;
    } catch (error) {
      console.error(`  ✗ ${check.name} error:`, error.message);
    }
    console.log('');
  }

  console.log(`\n📊 Results: ${passed}/${checks.length} checks passed\n`);

  if (passed === checks.length) {
    console.log('✅ All systems operational! Ready for demo.\n');
    console.log('Next steps:');
    console.log('1. Import postman/reporting-engine.postman_collection.json into Postman');
    console.log('2. Run "2. Login - Super Admin" request');
    console.log('3. Copy the accessToken from response');
    console.log('4. Paste it into the collection variable "accessToken"');
    console.log('5. Run all other requests to see the full demo\n');
    process.exit(0);
  } else {
    console.log('❌ Some checks failed. Please verify:');
    console.log('- API is running (npm run start:dev)');
    console.log('- Database is connected and migrations/seeds completed');
    console.log('- .env file has correct DATABASE_* values\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

