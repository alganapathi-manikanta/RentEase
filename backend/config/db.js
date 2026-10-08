import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

let mongodInstance = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rent-ease';

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB connected successfully to host: ${conn.connection.host} (Database: ${conn.connection.name})`);
    return conn;
  } catch (initialError) {
    const isLocal = uri.includes('127.0.0.1') || uri.includes('localhost');
    if (isLocal) {
      console.log('Local MongoDB service not found at 127.0.0.1:27017. Starting persistent local database engine...');
      try {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const dbPath = path.resolve('./data/db');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }
        if (!mongodInstance) {
          mongodInstance = await MongoMemoryServer.create({
            instance: {
              port: 27017,
              dbPath,
              storageEngine: 'wiredTiger',
              dbName: 'rent-ease',
            },
          });
        }
        const fallbackUri = 'mongodb://127.0.0.1:27017/rent-ease';
        const conn = await mongoose.connect(fallbackUri, { serverSelectionTimeoutMS: 5000 });
        console.log(`MongoDB persistent local database connected successfully: ${conn.connection.host} (Database: ${conn.connection.name})`);
        return conn;
      } catch (embeddedError) {
        console.error('Failed to start local database engine:', embeddedError.message);
        throw initialError;
      }
    } else {
      console.error(`MongoDB connection error to ${uri}: ${initialError.message}`);
      throw initialError;
    }
  }
};

