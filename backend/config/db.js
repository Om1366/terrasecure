import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve('terrasecure_db.json');
let useFallback = false;

// Ensure local JSON DB file exists
const initFallbackDB = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ users: [], properties: [], transfers: [], activities: [] }, null, 2)
    );
  }
};

// Fallback Database Helpers
const loadFallbackData = () => {
  initFallbackDB();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
};

const saveFallbackData = (data) => {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Connect to MongoDB with timeout fallback
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/terrasecure';
  console.log(`Connecting to MongoDB at: ${mongoURI}...`);
  try {
    // Attempt Mongoose connection with a short timeout (3 seconds)
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
    });
    console.log('MongoDB Connected successfully.');
  } catch (err) {
    console.warn('MongoDB connection failed. Switching to Local File Fallback (terrasecure_db.json)');
    useFallback = true;
    initFallbackDB();
  }
};

// Mongoose Schemas definitions
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'officer', 'citizen'] },
  fullName: { type: String, required: true },
  nationalId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const PropertySchema = new mongoose.Schema({
  propertyId: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  area: { type: Number, required: true },
  boundaryCoordinates: { type: String, required: true },
  propertyType: { type: String, required: true },
  currentOwner: { type: String, required: true }, // Owner's full name or username
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, required: true, default: 'Registered' }, // 'Registered' | 'Pending Approval' | 'Disputed' | 'Transfer Pending'
  securityHash: { type: String, required: true },
});

const TransferSchema = new mongoose.Schema({
  transferId: { type: String, required: true, unique: true },
  propertyId: { type: String, required: true },
  fromOwner: { type: String, required: true },
  toOwner: { type: String, required: true },
  transferDate: { type: Date, default: Date.now },
  saleValue: { type: Number, required: true },
  status: { type: String, required: true, default: 'Pending Approval' }, // 'Pending Approval' | 'Approved' | 'Rejected'
  approvedBy: { type: String }, // Officer name
  deedHash: { type: String, required: true },
});

const ActivitySchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: { type: String, required: true },
  performedBy: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

// Compile Mongoose models
const MongoUser = mongoose.model('User', UserSchema);
const MongoProperty = mongoose.model('Property', PropertySchema);
const MongoTransfer = mongoose.model('Transfer', TransferSchema);
const MongoActivity = mongoose.model('Activity', ActivitySchema);

// Helper function to generate unique ID for fallback DB
const generateId = () => Math.random().toString(36).substring(2, 9);

// Mock Query / Model wrapper that transparently switches between MongoDB and Local JSON fallback
const createModelWrapper = (collectionName, MongoModel) => {
  return {
    find: async (query = {}) => {
      if (!useFallback) {
        return await MongoModel.find(query).lean();
      }
      const data = loadFallbackData();
      return data[collectionName].filter(item => {
        return Object.entries(query).every(([key, val]) => {
          if (val && typeof val === 'object' && val.$ne !== undefined) {
            return item[key] !== val.$ne;
          }
          return item[key] === val;
        });
      });
    },

    findOne: async (query = {}) => {
      if (!useFallback) {
        return await MongoModel.findOne(query).lean();
      }
      const data = loadFallbackData();
      return data[collectionName].find(item => {
        return Object.entries(query).every(([key, val]) => item[key] === val);
      }) || null;
    },

    findById: async (id) => {
      if (!useFallback) {
        return await MongoModel.findById(id).lean();
      }
      const data = loadFallbackData();
      return data[collectionName].find(item => item._id === id) || null;
    },

    create: async (docData) => {
      if (!useFallback) {
        const doc = new MongoModel(docData);
        return (await doc.save()).toObject();
      }
      const data = loadFallbackData();
      const newDoc = {
        _id: generateId(),
        createdAt: new Date().toISOString(),
        ...docData,
      };
      // For property / transfer schemas having defaults
      if (collectionName === 'properties' && !newDoc.registrationDate) {
        newDoc.registrationDate = new Date().toISOString();
      }
      if (collectionName === 'transfers' && !newDoc.transferDate) {
        newDoc.transferDate = new Date().toISOString();
      }
      if (collectionName === 'activities' && !newDoc.timestamp) {
        newDoc.timestamp = new Date().toISOString();
      }

      data[collectionName].push(newDoc);
      saveFallbackData(data);
      return newDoc;
    },

    updateOne: async (query, updateData) => {
      if (!useFallback) {
        const updateObj = updateData.$set || updateData;
        return await MongoModel.updateOne(query, updateObj);
      }
      const data = loadFallbackData();
      const idx = data[collectionName].findIndex(item => {
        return Object.entries(query).every(([key, val]) => item[key] === val);
      });
      if (idx !== -1) {
        const updateObj = updateData.$set || updateData;
        data[collectionName][idx] = { ...data[collectionName][idx], ...updateObj };
        saveFallbackData(data);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },

    findByIdAndUpdate: async (id, updateData, options = {}) => {
      if (!useFallback) {
        const updateObj = updateData.$set || updateData;
        return await MongoModel.findByIdAndUpdate(id, updateObj, { new: true }).lean();
      }
      const data = loadFallbackData();
      const idx = data[collectionName].findIndex(item => item._id === id);
      if (idx !== -1) {
        const updateObj = updateData.$set || updateData;
        data[collectionName][idx] = { ...data[collectionName][idx], ...updateObj };
        saveFallbackData(data);
        return data[collectionName][idx];
      }
      return null;
    },

    deleteOne: async (query) => {
      if (!useFallback) {
        return await MongoModel.deleteOne(query);
      }
      const data = loadFallbackData();
      const initialLength = data[collectionName].length;
      data[collectionName] = data[collectionName].filter(item => {
        return !Object.entries(query).every(([key, val]) => item[key] === val);
      });
      saveFallbackData(data);
      return { deletedCount: initialLength - data[collectionName].length };
    },

    countDocuments: async (query = {}) => {
      if (!useFallback) {
        return await MongoModel.countDocuments(query);
      }
      const data = loadFallbackData();
      return data[collectionName].filter(item => {
        return Object.entries(query).every(([key, val]) => item[key] === val);
      }).length;
    },

    isFallback: () => useFallback
  };
};

export const User = createModelWrapper('users', MongoUser);
export const Property = createModelWrapper('properties', MongoProperty);
export const Transfer = createModelWrapper('transfers', MongoTransfer);
export const Activity = createModelWrapper('activities', MongoActivity);
