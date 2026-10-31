import mongoose from 'mongoose';
import { config } from '../../config/config.js';

export async function connectMongo() {
  try {
    mongoose.set('bufferCommands', false);
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    // Masked log: hides username and password completely
    const dbHost = config.mongoUri?.split('@')[1]?.split('?')[0] || 'localhost';
    console.log(`[MongoDB]: Connected to Dropp database (${dbHost})`);
    return mongoose.connection;
  } catch (error) {
    console.warn('[MongoDB]: Not connected, running with in-memory fallback mode:', error.message);
    return null;
  }
}
