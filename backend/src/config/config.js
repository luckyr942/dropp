import dotenv from 'dotenv';
dotenv.config();

export const config = Object.freeze({
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/dropp_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rabbitmqUrl: process.env.RABBITMQ_URL || 'amqp://dropp_admin:dropp_password@localhost:5672',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_dropp_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
});
