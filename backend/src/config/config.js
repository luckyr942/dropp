import dotenv from 'dotenv';
dotenv.config({ override: true });

export const config = Object.freeze({
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/dropp_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://dropp_admin:dropp_password@localhost:5672',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_dropp_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Required for every restaurant/operations write. Set a long random value in
  // production; the development value exists only to make the local demo usable.
  operationsKey: process.env.OPERATIONS_API_KEY || (process.env.NODE_ENV === 'production' ? null : 'dropp-demo-operations-key'),
  defaultCustomerId: process.env.DEFAULT_CUSTOMER_ID || 'cust_default',
  geminiApiKey: process.env.GEMINI_API_KEY || null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  geminiVoice: process.env.GEMINI_VOICE || 'Callirrhoe',
  // gemini-3.8-flash-tts has better quota; 3.1-flash-tts-preview exhausts at 10 req/day
  geminiTtsModel: process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts',
  sarvamApiKey: process.env.SARVAM_API_KEY || null,
  sarvamSpeaker: process.env.SARVAM_SPEAKER || 'ishita',
  sarvamModel: process.env.SARVAM_MODEL || 'bulbul:v3',
});
