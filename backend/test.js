import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Force port 5002 for tests to avoid port conflicts
process.env.PORT = '5002';
process.env.JWT_SECRET = 'test_secret_key_987';
process.env.NODE_ENV = 'test';

// Remove old test fallback database file if exists to keep test clean
const testDbFile = path.resolve('terrasecure_db.json');
if (fs.existsSync(testDbFile)) {
  fs.unlinkSync(testDbFile);
}

// Start server
console.log('Starting Test Server on port 5002...');
const serverImport = await import('./server.js');
const server = serverImport.default;

const BASE_URL = 'http://localhost:5002/api';
let officerToken = '';
let adminToken = '';
let testPropertyId = '';
let testTransferId = '';

const runTests = async () => {
  try {
    console.log('\n--- STARTING INTEGRATION TESTS ---\n');

    // 1. Test Citizen/Officer Registration
    console.log('Test 1: Registering Test Officer...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_officer',
        password: 'password123',
        fullName: 'Test Verifier Officer',
        nationalId: 'NID-TEST-001',
        role: 'officer',
      }),
    });
    const regData = await regRes.json();
    if (regRes.status !== 201 || !regData.token) {
      throw new Error(`Failed to register test officer. Status: ${regRes.status}. Message: ${regData.message}`);
    }
    officerToken = regData.token;
    console.log('✔ Test Officer registered successfully.\n');

    // 2. Test Admin Registration
    console.log('Test 2: Registering Test Admin...');
    const adminRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_admin',
        password: 'password123',
        fullName: 'Test Board Admin',
        nationalId: 'NID-TEST-002',
        role: 'admin',
      }),
    });
    const adminRegData = await adminRegRes.json();
    if (adminRegRes.status !== 201 || !adminRegData.token) {
      throw new Error(`Failed to register test admin. Status: ${adminRegRes.status}`);
    }
    adminToken = adminRegData.token;
    console.log('✔ Test Admin registered successfully.\n');

    // 3. Test Profile Fetching
    console.log('Test 3: Fetching profile (GET /auth/me)...');
    const profileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    const profileData = await profileRes.json();
    if (profileRes.status !== 200 || profileData.username !== 'test_officer') {
      throw new Error(`Failed to get correct profile. Username received: ${profileData.username}`);
    }
    console.log('✔ Profile details fetched successfully.\n');

    // 4. Test Property Registration
    console.log('Test 4: Registering a new property (POST /properties)...');
    const propRes = await fetch(`${BASE_URL}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        address: '500 Test Lane, Cypress Hill',
        area: 950,
        propertyType: 'Residential',
        currentOwner: 'David Miller',
        boundaryCoordinates: 'Polygon((5 5, 5 15, 15 15, 15 5, 5 5))',
      }),
    });
    const propData = await propRes.json();
    if (propRes.status !== 201 || !propData.propertyId) {
      throw new Error(`Failed to register property. Status: ${propRes.status}`);
    }
    testPropertyId = propData.propertyId;
    console.log(`✔ Property registered successfully. Generated ID: ${testPropertyId}\n`);

    // 5. Test Public Search
    console.log(`Test 5: Public Search for Property ${testPropertyId}...`);
    const searchRes = await fetch(`${BASE_URL}/properties/search/${testPropertyId}`);
    const searchData = await searchRes.json();
    if (searchRes.status !== 200 || searchData.currentOwner !== 'David Miller') {
      throw new Error(`Property public search failed. Status: ${searchRes.status}`);
    }
    console.log('✔ Public property search returned correct details.\n');

    // 6. Test Ownership Transfer Initiation
    console.log('Test 6: Initiating ownership transfer (POST /transfers)...');
    const transferRes = await fetch(`${BASE_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({
        propertyId: testPropertyId,
        fromOwner: 'David Miller',
        toOwner: 'Sarah Jenkins',
        saleValue: 320000,
      }),
    });
    const transferData = await transferRes.json();
    if (transferRes.status !== 201 || !transferData.transferId) {
      throw new Error(`Failed to initiate transfer. Status: ${transferRes.status}`);
    }
    testTransferId = transferData._id; // Database document primary key ID
    console.log(`✔ Transfer initiated successfully. Transfer Record ID: ${testTransferId}\n`);

    // Check that property is now locked under "Transfer Pending"
    console.log('Test 6b: Verifying property status is now locked...');
    const checkPropRes = await fetch(`${BASE_URL}/properties/search/${testPropertyId}`);
    const checkPropData = await checkPropRes.json();
    if (checkPropData.status !== 'Transfer Pending') {
      throw new Error(`Property status not locked. Expected 'Transfer Pending', got: ${checkPropData.status}`);
    }
    console.log('✔ Property locked during transfer.\n');

    // 7. Test Ownership Transfer Approval
    console.log(`Test 7: Approving ownership transfer (POST /transfers/${testTransferId}/approve)...`);
    const approveRes = await fetch(`${BASE_URL}/transfers/${testTransferId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${officerToken}`,
      },
      body: JSON.stringify({ action: 'Approve' }),
    });
    const approveData = await approveRes.json();
    if (approveRes.status !== 200 || approveData.status !== 'Approved') {
      throw new Error(`Failed to approve transfer. Status: ${approveRes.status}`);
    }
    console.log('✔ Transfer approved successfully.\n');

    // Verify property owner is updated and unlocked
    console.log('Test 7b: Verifying new owner in public database...');
    const finalPropRes = await fetch(`${BASE_URL}/properties/search/${testPropertyId}`);
    const finalPropData = await finalPropRes.json();
    if (finalPropData.currentOwner !== 'Sarah Jenkins' || finalPropData.status !== 'Registered') {
      throw new Error(
        `Ownership update failed. Owner: ${finalPropData.currentOwner}, Status: ${finalPropData.status}`
      );
    }
    console.log(`✔ New owner verified: Sarah Jenkins. Registry unlocked and sealed.\n`);

    // 8. Test Administrative Metrics
    console.log('Test 8: Checking admin statistics (GET /stats/summary)...');
    const statsRes = await fetch(`${BASE_URL}/stats/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await statsRes.json();
    if (statsRes.status !== 200 || !statsData.metrics || statsData.metrics.totalProperties !== 1) {
      throw new Error(`Failed to compile stats correctly. Metrics: ${JSON.stringify(statsData.metrics)}`);
    }
    console.log('✔ Admin dashboard metrics compiled correctly.\n');

    console.log('--------------------------------------------');
    console.log(' 🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ');
    console.log('--------------------------------------------\n');
    cleanup(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:');
    console.error(err.message);
    cleanup(1);
  }
};

const cleanup = (exitCode) => {
  console.log('Closing server connections...');
  server.close(async () => {
    console.log('Server shut down.');
    try {
      if (mongoose.connection && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        console.log('MongoDB connection disconnected.');
      }
    } catch (e) {
      console.warn('Error during mongoose cleanup:', e.message);
    }
    // Clean up test file
    if (fs.existsSync(testDbFile)) {
      fs.unlinkSync(testDbFile);
      console.log('Cleaned up test database file.');
    }
    console.log(`Exiting test runner with code ${exitCode}.`);
    process.exit(exitCode);
  });
};

// Wait 1 second for DB fallback to settle and trigger test suite
setTimeout(runTests, 1000);
