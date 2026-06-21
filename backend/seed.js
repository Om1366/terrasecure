import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, Property, Transfer, Activity, connectDB } from './config/db.js';

const generatePropertyHash = (propertyId, address, area, owner, status) => {
  const content = `${propertyId}|${address}|${area}|${owner}|${status}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

const generateDeedHash = (propertyId, fromOwner, toOwner, saleValue, dateStr) => {
  const content = `${propertyId}|${fromOwner}|${toOwner}|${saleValue}|${dateStr}`;
  return crypto.createHash('sha256').update(content).digest('hex');
};

const seed = async () => {
  console.log('Starting seed process...');
  // Force connecting to DB (will fallback to JSON file database if MongoDB is down)
  await connectDB();

  // 1. Clear database / collections (only if fallback is in use, or you want to reset)
  // For safety and user convenience, we'll wipe the fallback file data to guarantee a fresh seed
  // if MongoDB isn't running. If MongoDB is running, we check if users exist before seeding.
  // Wipe database before seeding
  console.log('Clearing database for fresh seed...');
  if (User.isFallback && User.isFallback()) {
    fs.writeFileSync(
      path.resolve('terrasecure_db.json'),
      JSON.stringify({ users: [], properties: [], transfers: [], activities: [] }, null, 2)
    );
  } else {
    try {
      await mongoose.connection.db.dropDatabase();
      console.log('Database dropped.');
    } catch (err) {
      console.warn('Could not drop database, attempting manual deletes...');
      // Fallback manual cleanup
      await User.deleteOne({ username: 'admin' });
      await User.deleteOne({ username: 'officer' });
      await User.deleteOne({ username: 'citizen' });
    }
  }

  console.log('Seeding fresh mock data...');


  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const officerPassword = await bcrypt.hash('officer123', 10);
  const citizenPassword = await bcrypt.hash('citizen123', 10);

  // 2. Create Users
  const admin = await User.create({
    username: 'admin',
    password: adminPassword,
    fullName: 'Chief Registrar Admin',
    role: 'admin',
    nationalId: 'NID-ADMIN-001',
  });

  const officer = await User.create({
    username: 'officer',
    password: officerPassword,
    fullName: 'Senior Verifying Officer',
    role: 'officer',
    nationalId: 'NID-OFFICER-001',
  });

  const citizen = await User.create({
    username: 'citizen',
    password: citizenPassword,
    fullName: 'Jane Doe Citizen',
    role: 'citizen',
    nationalId: 'NID-CITIZEN-001',
  });

  console.log('Users created successfully.');

  // 3. Create Properties
  const p1Hash = generatePropertyHash('PROP-2026-1001', '101 Government Ave, Capital City', 450, 'Jane Doe Citizen', 'Registered');
  const p1 = await Property.create({
    propertyId: 'PROP-2026-1001',
    address: '101 Government Ave, Capital City',
    area: 450,
    boundaryCoordinates: 'Polygon((0 0, 0 15, 30 15, 30 0, 0 0))',
    propertyType: 'Commercial',
    currentOwner: 'Jane Doe Citizen',
    status: 'Registered',
    securityHash: p1Hash,
  });

  const p2Hash = generatePropertyHash('PROP-2026-1002', '202 Oak Ridge Dr, Pine Valley', 1200, 'John Smith', 'Registered');
  const p2 = await Property.create({
    propertyId: 'PROP-2026-1002',
    address: '202 Oak Ridge Dr, Pine Valley',
    area: 1200,
    boundaryCoordinates: 'Polygon((10 10, 10 40, 50 40, 50 10, 10 10))',
    propertyType: 'Residential',
    currentOwner: 'John Smith',
    status: 'Registered',
    securityHash: p2Hash,
  });

  const p3Hash = generatePropertyHash('PROP-2026-1003', '404 Harvest Road, Greenfield Farms', 15000, 'Alice Cooper', 'Registered');
  const p3 = await Property.create({
    propertyId: 'PROP-2026-1003',
    address: '404 Harvest Road, Greenfield Farms',
    area: 15000,
    boundaryCoordinates: 'Polygon((100 100, 100 250, 200 250, 200 100, 100 100))',
    propertyType: 'Agricultural',
    currentOwner: 'Alice Cooper',
    status: 'Registered',
    securityHash: p3Hash,
  });

  const p4Hash = generatePropertyHash('PROP-2026-1004', '808 Tech Park Circle, Industrial Sector 4', 8500, 'Apex Logistics Inc', 'Transfer Pending');
  const p4 = await Property.create({
    propertyId: 'PROP-2026-1004',
    address: '808 Tech Park Circle, Industrial Sector 4',
    area: 8500,
    boundaryCoordinates: 'Polygon((50 50, 50 150, 135 150, 135 50, 50 50))',
    propertyType: 'Industrial',
    currentOwner: 'Apex Logistics Inc',
    status: 'Transfer Pending',
    securityHash: p4Hash,
  });

  console.log('Properties created successfully.');

  // 4. Create Transfers
  // 4a. Approved Transfer
  const tx1Date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago
  const tx1Deed = generateDeedHash('PROP-2026-1001', 'Legacy Holdings Ltd', 'Jane Doe Citizen', 450000, tx1Date);
  await Transfer.create({
    transferId: 'TX-2026-4999',
    propertyId: 'PROP-2026-1001',
    fromOwner: 'Legacy Holdings Ltd',
    toOwner: 'Jane Doe Citizen',
    transferDate: tx1Date,
    saleValue: 450000,
    status: 'Approved',
    approvedBy: 'officer',
    deedHash: tx1Deed,
  });

  // 4b. Pending Transfer
  const tx2Date = new Date().toISOString();
  const tx2Deed = generateDeedHash('PROP-2026-1004', 'Apex Logistics Inc', 'Global Freight Corp', 1250000, tx2Date);
  await Transfer.create({
    transferId: 'TX-2026-5001',
    propertyId: 'PROP-2026-1004',
    fromOwner: 'Apex Logistics Inc',
    toOwner: 'Global Freight Corp',
    transferDate: tx2Date,
    saleValue: 1250000,
    status: 'Pending Approval',
    deedHash: tx2Deed,
  });

  console.log('Transfers created successfully.');

  // 5. Create System Activities
  await Activity.create({
    action: 'System Seeded',
    details: 'Database seeded with default configurations, admin, officer, and initial property registry.',
    performedBy: 'system',
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
  });

  await Activity.create({
    action: 'Property Registered',
    details: 'Registered Agricultural property PROP-2026-1003 for owner Alice Cooper',
    performedBy: 'admin',
    timestamp: new Date(Date.now() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
  });

  await Activity.create({
    action: 'Property Registered',
    details: 'Registered Industrial property PROP-2026-1004 for owner Apex Logistics Inc',
    performedBy: 'admin',
    timestamp: new Date(Date.now() - 5.2 * 24 * 60 * 60 * 1000).toISOString(),
  });

  await Activity.create({
    action: 'Transfer Initiated',
    details: 'Initiated transfer TX-2026-4999 for PROP-2026-1001 from Legacy Holdings Ltd to Jane Doe Citizen',
    performedBy: 'officer',
    timestamp: new Date(Date.now() - 5.1 * 24 * 60 * 60 * 1000).toISOString(),
  });

  await Activity.create({
    action: 'Transfer Approved',
    details: 'Approved transfer TX-2026-4999. Ownership of PROP-2026-1001 transferred to Jane Doe Citizen',
    performedBy: 'officer',
    timestamp: new Date(Date.now() - 5.0 * 24 * 60 * 60 * 1000).toISOString(),
  });

  await Activity.create({
    action: 'Transfer Initiated',
    details: 'Initiated transfer TX-2026-5001 for PROP-2026-1004 from Apex Logistics Inc to Global Freight Corp',
    performedBy: 'officer',
    timestamp: tx2Date,
  });

  console.log('Activities created successfully.');
  console.log('Seeding finished successfully!');
  process.exit(0);
};

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
