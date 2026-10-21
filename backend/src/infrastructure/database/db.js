import mongoose from 'mongoose';
import { config } from '../../config/config.js';

export async function connectMongo(){
    try{
        await mongoose.connect(config.mongoUri);
        console.log('[MongoDB]: Connected to Dropp database.', config.mongoUri);
        return mongoose.connection;

    }catch(error){
        console.warn('[MongoDB]: Not connected, running with in-memory fallback mode:', error.message);
        return null;
    }
}