import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import http from 'http';

import { config } from './config/config';
import { testConnection } from './config/db';
import { getRedis } from './config/redis';
import { initWebSocket } from './websocket';
import { errorHandler, notFound } from './middleware/errorHandler';
import { logger } from './utils/logger';

// Routes
import authRoutes       from './modules/auth/auth.routes';
import ambulanceRoutes  from './modules/ambulance/ambulance.routes';
import emergencyRoutes  from './modules/emergency/emergency.routes';
import routeRoutes      from './modules/route/route.routes';
import trafficRoutes    from './modules/traffic/traffic.routes';
import junctionRoutes   from './modules/junction/junction.routes';
import alertRoutes      from './modules/alert/alert.routes';
import hospitalRoutes   from './modules/hospital/hospital.routes';
import analyticsRoutes  from './modules/analytics/analytics.routes';
import adminRoutes      from './modules/admin/admin.routes';
import simulationRoutes from './modules/simulation/simulation.routes';

const app = express();
const server = http.createServer(app);

// ─── Security & Logging ─────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────
app.use('/api/', rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  message:  { success: false, message: 'Too many requests, please try again later.' },
}));

// ─── Health ──────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const db    = await testConnection();
  const redis = await getRedis().then(r => !!r).catch(() => false);
  res.json({
    status: 'ok',
    db:    db    ? 'connected' : 'unavailable',
    redis: redis ? 'connected' : 'unavailable',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/ambulances',  ambulanceRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/routes',      routeRoutes);
app.use('/api/traffic',     trafficRoutes);
app.use('/api/junctions',   junctionRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api/hospitals',   hospitalRoutes);
app.use('/api/analytics',   analyticsRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/simulation',  simulationRoutes);

// Notifications endpoint
app.get('/api/notifications', async (req: any, res) => {
  const { authenticate } = await import('./middleware/auth');
  authenticate(req, res, async () => {
    const { getUserNotifications } = await import('./services/notificationService');
    const notes = await getUserNotifications(req.user.userId);
    res.json({ success: true, data: notes });
  });
});

// ─── 404 + Error ─────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── WebSocket ───────────────────────────────────────────
initWebSocket(server);

// ─── Start ───────────────────────────────────────────────
async function start(): Promise<void> {
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.warn('⚠️  Database not connected — some features will not work');
  } else {
    logger.info('✅ Database connected');
  }

  await getRedis(); // optional — won't crash if unavailable

  server.listen(config.port, () => {
    logger.info(`🚀 RapidRoute AI Backend running on http://localhost:${config.port}`);
    logger.info(`🔌 WebSocket ready at ws://localhost:${config.port}/ws`);
  });
}

start().catch((err) => {
  logger.error('Fatal startup error', { error: err.message });
  process.exit(1);
});

export default app;
