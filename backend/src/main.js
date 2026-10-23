// Entry point for Dropp Backend & Aura AI Engine (Gemini Active)
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import http from 'node:http';

import { config } from './config/config.js';
import { connectMongo } from './infrastructure/database/db.js';
import { connectRabbitMQ } from './infrastructure/rabbitmq/index.js';
import { setupWebSockets } from './infrastructure/websocket/wsServer.js';

// Route Imports
import catalogRouter from './modules/catalog/catalogRoutes.js';
import orderRouter from './modules/orders/orderRoutes.js';
import auraRouter from './aura/auraRoutes.js';
import rideRouter from './modules/rides/rideRoutes.js';
import driverRouter from './modules/drivers/driverRoutes.js';


//Map 
import geocodeRoutes from './modules/geoCode/geoRoutes.js';


const app = express();
const server = http.createServer(app);

// -------------------------------------------------------------
// 1. Security & Hardening Middleware
// -------------------------------------------------------------
app.disable('x-powered-by'); // Don't advertise Express to attackers
app.use(helmet()); // Secure HTTP headers (XSS, clickjacking protection)

// CORS: allow mobile apps (which have no origin) + localhost web dev
const allowedOrigins = new Set([
  'http://localhost:8081', // Expo Web
  'http://localhost:19006', // Expo Web legacy
  'http://localhost:5173', // Vite Web UI
  'http://localhost:3000',
]);

app.use(
  cors({
    origin(origin, callback) {
      // Native apps (Expo/React Native) or server-to-server calls omit Origin
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  })
);

// Behind Render/Railway/Reverse Proxies, derive real client IP
app.set('trust proxy', 1);

// Prevent payload exhaustion attacks (e.g. someone sending 50MB of JSON)
app.use(express.json({ limit: '10mb' }));

// Request Logger: Logs every incoming HTTP request and response status
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`📡 [${req.method}] ${req.originalUrl} - ${color}${res.statusCode}\x1b[0m (${duration}ms)`);
  });
  next();
});

// Tier 1: Loose rate limiter for standard catalog/order API traffic
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Tier 2: Tight rate limiter specifically guarding LLM quota on /voice-turn (20 turns/min)
const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Aura is receiving too many requests. Please slow down a little.' },
});

app.use('/api', apiLimiter);
app.use('/api/aura/voice-turn', voiceLimiter);


// -------------------------------------------------------------
// 2. Base & Health Endpoints
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    message: 'Dropp Aura API is online 🎙️',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      catalog: '/api/catalog',
      orders: '/api/orders',
      rides: '/api/rides',
      aura: '/api/aura',
    },
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'dropp-backend', time: new Date().toISOString() });
});

// -------------------------------------------------------------
// 3. Mount Service Modules
// -------------------------------------------------------------
app.use('/api/catalog', catalogRouter);
app.use('/api/orders', orderRouter);
app.use('/api/rides', rideRouter);
app.use('/api/drivers', driverRouter);
app.use('/api/aura', auraRouter);
app.use('/api/geocode', geocodeRoutes);


// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// -------------------------------------------------------------
// 4. Safe Centralized Error Handler
// Never leak database stack traces or internal filenames to users!
// -------------------------------------------------------------
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  console.error('[Server Error]', {
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
  });

  const status = Number.isInteger(err.status) ? err.status : 500;
  res.status(status).json({
    success: false,
    error: status >= 500 ? 'Internal server error' : err.message,
  });
});

// -------------------------------------------------------------
// 5. Graceful Startup & Shutdown Handling
// -------------------------------------------------------------
let shuttingDown = false;

async function start() {
  await connectMongo();
  await connectRabbitMQ();
  setupWebSockets(server);

  server.listen(config.port, () => {
    console.log(`[Dropp] Production-ready backend listening on port ${config.port}`);
    console.log(`[Dropp] Health → http://localhost:${config.port}/health`);
  });

  server.on('error', (err) => {
    console.error('[Dropp] Server startup error:', err);
    process.exitCode = 1;
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Dropp] ${signal} received: closing HTTP and WebSocket connections...`);

  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }

  server.close((err) => {
    if (err) {
      console.error('[Dropp] Error while closing HTTP server:', err);
    }
    console.log('[Dropp] Cleanup complete. Process exiting gracefully.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

start().catch((err) => {
  console.error('[Dropp] Fatal startup failure:', err.message);
  process.exit(1);
});
