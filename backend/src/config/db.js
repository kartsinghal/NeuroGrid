/**
 * NeuroGrid AI — Database Configuration
 * Hybrid: MongoDB Atlas → Local MongoDB → In-Memory Fallback
 */

const mongoose = require('mongoose');

let dbMode = 'memory'; // 'atlas' | 'local' | 'memory'
let isConnected = false;

const connect = async () => {
  const configuredMode = process.env.DB_MODE || 'auto';
  const atlasUri = process.env.MONGODB_ATLAS_URI;
  const localUri = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/neurogrid';

  mongoose.set('strictQuery', false);

  // Force memory mode
  if (configuredMode === 'memory') {
    console.log('💾 [DB] Forced in-memory mode — no database persistence');
    dbMode = 'memory';
    return dbMode;
  }

  // Try Atlas if URI provided and mode isn't forced local
  if (atlasUri && configuredMode !== 'local') {
    try {
      console.log('🌐 [DB] Connecting to MongoDB Atlas...');
      await mongoose.connect(atlasUri, {
        serverSelectionTimeoutMS: 6000,
        socketTimeoutMS: 30000,
      });
      dbMode = 'atlas';
      isConnected = true;
      console.log('✅ [DB] Connected to MongoDB Atlas');
      return dbMode;
    } catch (err) {
      console.warn(`⚠️  [DB] Atlas connection failed: ${err.message}`);
    }
  }

  // Try local MongoDB
  if (configuredMode !== 'atlas') {
    try {
      console.log('🏠 [DB] Connecting to local MongoDB...');
      await mongoose.connect(localUri, {
        serverSelectionTimeoutMS: 4000,
        socketTimeoutMS: 10000,
      });
      dbMode = 'local';
      isConnected = true;
      console.log('✅ [DB] Connected to local MongoDB');
      return dbMode;
    } catch (err) {
      console.warn(`⚠️  [DB] Local MongoDB unavailable: ${err.message}`);
    }
  }

  // Graceful in-memory fallback
  console.log('💾 [DB] Using in-memory fallback — all data is ephemeral');
  dbMode = 'memory';
  return dbMode;
};

const getMode = () => dbMode;
const isDbConnected = () => isConnected;

// Graceful disconnection
const disconnect = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 [DB] Disconnected from MongoDB');
  }
};

mongoose.connection.on('disconnected', () => {
  if (isConnected) {
    console.warn('⚠️  [DB] MongoDB connection lost');
    isConnected = false;
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 [DB] MongoDB reconnected');
  isConnected = true;
});

module.exports = { connect, disconnect, getMode, isDbConnected };
