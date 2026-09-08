import mongoose from 'mongoose';
import { config } from '../../config/config.js';

export async function connectMongo(){
    try{
        await mongoose.connect(config.mongoUri);
        console.log('[MongoDB]: Connected to Dropp database.', config.mongoUri);
        return mongoose.connection;

    }catch(error){
        console.error('[MongoDB failed to connect error:', error.message);
        process.exit(1);
    }
}