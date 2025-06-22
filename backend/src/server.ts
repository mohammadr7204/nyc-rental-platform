import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import session from 'express-session';
import RedisStore from 'connect-redis';
import Redis from 'ioredis';

// Configuration and utilities
import { config, features, validateConfig } from './config';
import { logger, httpLogger, logSecurityEvent } from './utils/logger';
import {
  healthCheckHandler,
  readinessHandler,
  livenessHandler,
  metricsHandler,
  performanceMonitoring,
  setupGracefulShutdown
} from './utils/health';

// Security middleware
import {
  createRateLimit,
  createSlowDown,
  preventSQLInjection,
  xssProtection,
  requestId,
  securityHeaders,
  secureFileUpload
} from './middleware/security';

// Error handling
import {
  globalErrorHandler,
  notFoundHandler,
  CustomError,
  ValidationError,
  AuthenticationError
} from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import propertyRoutes from './routes/properties';
import applicationRoutes from './routes/applications';
import messageRoutes from './routes/messages';
import paymentRoutes from './routes/payments';
import uploadRoutes from './routes/upload';
import searchRoutes from './routes/search';
import adminRoutes from './routes/admin';
import fareActRoutes from './routes/fareAct';
import maintenanceRoutes from './routes/maintenance';
import vendorRoutes from './routes/vendors';
import analyticsRoutes from './routes/analytics';
import inspectionRoutes from './routes/inspections';
import leaseRoutes from './routes/leases';

// Import middleware
import { authenticateToken } from './middleware/auth';

// Import socket handlers
import { handleSocketConnection } from './sockets/messageHandler';

// Validate configuration on startup
validateConfig();

const app = express();
const server = createServer(app);

// Redis setup for sessions and caching
const redis = new Redis(config.services.redis.url, {
  maxRetriesPerRequest: config.services.redis.retryAttempts,
  lazyConnect: true,
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: config.security.corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Trust proxy settings for production
if (config.isProduction) {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(requestId);
app.use(securityHeaders);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "https://js.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com", "https://maps.googleapis.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      workerSrc: ["'self'", "blob:"],
      childSrc: ["'self'", "blob:"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow embedding for Stripe
}));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (config.security.corsOrigins.includes(origin)) {
      return callback(null, true);
    }

    logSecurityEvent('CORS violation', { origin }, undefined, 'medium');
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token']
}));

// Compression for production
if (config.performance.enableCompression) {
  app.use(compression({
    level: config.performance.compressionLevel,
    threshold: 1024 // Only compress responses larger than 1KB
  }));
}

// Body parsing with size limits
app.use(express.json({
  limit: config.server.maxRequestSize,
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: config.server.maxRequestSize
}));

// Request logging
app.use(httpLogger);

// Performance monitoring
app.use(performanceMonitoring);

// Session configuration
if (config.security.sessionSecret) {
  app.use(session({
    store: new RedisStore({ client: redis }),
    secret: config.security.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.isProduction,
      httpOnly: true,
      maxAge: config.security.sessionMaxAge,
      sameSite: config.isProduction ? 'strict' : 'lax'
    },
    name: 'sessionId'
  }));
}

// Security middleware
app.use(preventSQLInjection);
app.use(xssProtection);

// Rate limiting
if (features.rateLimit) {
  // General API rate limit
  app.use('/api/', createRateLimit(
    config.rateLimit.api.windowMs,
    config.rateLimit.api.maxRequests,
    'API rate limit exceeded'
  ));

  // Strict rate limiting for auth endpoints
  app.use('/api/auth/', createRateLimit(
    config.rateLimit.auth.windowMs,
    config.rateLimit.auth.maxRequests,
    'Authentication rate limit exceeded'
  ));

  // Slow down for repeated requests
  app.use('/api/auth/', createSlowDown(
    config.rateLimit.auth.windowMs,
    2, // Start slowing down after 2 requests
    5000 // Max delay of 5 seconds
  ));

  // Upload rate limiting
  app.use('/api/upload/', createRateLimit(
    config.rateLimit.upload.windowMs,
    config.rateLimit.upload.maxRequests,
    'Upload rate limit exceeded'
  ));
}

// Health check endpoints (before authentication)
app.get('/health', healthCheckHandler);
app.get('/health/ready', readinessHandler);
app.get('/health/live', livenessHandler);
app.get('/metrics', metricsHandler);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/applications', authenticateToken, applicationRoutes);
app.use('/api/messages', authenticateToken, messageRoutes);
app.use('/api/payments', authenticateToken, paymentRoutes);
app.use('/api/maintenance', authenticateToken, maintenanceRoutes);
app.use('/api/vendors', authenticateToken, vendorRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/inspections', authenticateToken, inspectionRoutes);
app.use('/api/leases', authenticateToken, leaseRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/fare-act', fareActRoutes);

// Protected routes
if (features.fileUploads) {
  app.use('/api/upload', authenticateToken, uploadRoutes);
}

// Admin routes with additional rate limiting
if (config.isDevelopment || config.isStaging) {
  const adminRateLimit = createRateLimit(900000, 50, 'Admin rate limit exceeded');
  app.use('/api/admin', adminRateLimit, authenticateToken, adminRoutes);
}

// API documentation (development only)
if (features.apiDocs) {
  app.get('/api/docs', (req, res) => {
    res.json({
      title: 'NYC Rental Platform API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Complete API for NYC rental platform with FARE Act compliance',
      environment: config.isDevelopment ? 'development' : 'production',
      features: Object.entries(features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name),
      endpoints: {
        auth: {
          path: '/api/auth',
          description: 'Authentication endpoints',
          methods: ['POST /login', 'POST /register', 'GET /verify', 'POST /forgot-password']
        },
        users: {
          path: '/api/users',
          description: 'User management',
          protected: true,
          methods: ['GET /profile', 'PUT /profile', 'PUT /change-password']
        },
        properties: {
          path: '/api/properties',
          description: 'Property listings',
          methods: ['GET /', 'GET /:id', 'POST /', 'PUT /:id', 'DELETE /:id']
        },
        applications: {
          path: '/api/applications',
          description: 'Rental applications',
          protected: true,
          methods: ['POST /', 'GET /my-applications', 'GET /property-applications']
        },
        messages: {
          path: '/api/messages',
          description: 'Real-time messaging',
          protected: true,
          methods: ['POST /', 'GET /conversations', 'GET /conversation/:partnerId']
        },
        payments: {
          path: '/api/payments',
          description: 'Payment processing',
          protected: true,
          methods: ['POST /create-payment-intent', 'POST /confirm-payment', 'GET /history']
        },
        maintenance: {
          path: '/api/maintenance',
          description: 'Maintenance request management',
          protected: true,
          methods: ['POST /', 'GET /', 'GET /:id', 'PATCH /:id', 'DELETE /:id', 'GET /stats/summary']
        },
        vendors: {
          path: '/api/vendors',
          description: 'Vendor management for maintenance contractors',
          protected: true,
          methods: ['GET /', 'GET /:id', 'POST /', 'PUT /:id', 'DELETE /:id', 'POST /:id/services', 'DELETE /:vendorId/services/:serviceId', 'POST /:id/reviews', 'PUT /assign/:maintenanceId']
        },
        analytics: {
          path: '/api/analytics',
          description: 'Property and portfolio analytics',
          protected: true,
          methods: ['GET /property/:propertyId', 'GET /portfolio', 'GET /financial-report', 'GET /market-insights']
        },
        inspections: {
          path: '/api/inspections',
          description: 'Property inspection scheduling and management',
          protected: true,
          methods: ['GET /', 'GET /:id', 'POST /', 'PUT /:id', 'DELETE /:id', 'POST /:id/photos', 'DELETE /:id/photos/:photoIndex', 'GET /property/:propertyId/availability', 'GET /dashboard/stats']
        },
        leases: {
          path: '/api/leases',
          description: 'Lease management and renewal automation',
          protected: true,
          methods: ['GET /', 'GET /:id', 'POST /from-application/:applicationId', 'PUT /:id', 'POST /:id/terminate', 'GET /renewals/candidates', 'POST /:id/renew', 'GET /dashboard/stats']
        },
        search: {
          path: '/api/search',
          description: 'Advanced search',
          methods: ['GET /properties', 'GET /suggestions', 'GET /filters']
        },
        fareAct: {
          path: '/api/fare-act',
          description: 'FARE Act compliance',
          methods: ['GET /validate/:propertyId', 'POST /update-compliance', 'GET /info']
        },
        health: {
          path: '/health',
          description: 'Health check endpoints',
          methods: ['GET /health', 'GET /health/ready', 'GET /health/live', 'GET /metrics']
        }
      },
      rateLimit: features.rateLimit ? {
        api: `${config.rateLimit.api.maxRequests} requests per ${config.rateLimit.api.windowMs / 60000} minutes`,
        auth: `${config.rateLimit.auth.maxRequests} requests per ${config.rateLimit.auth.windowMs / 60000} minutes`,
        upload: `${config.rateLimit.upload.maxRequests} requests per ${config.rateLimit.upload.windowMs / 60000} minutes`
      } : 'Disabled',
      cors: {
        origins: config.security.corsOrigins,
        credentials: true
      }
    });
  });
}

// Webhook endpoints (bypass rate limiting)
app.use('/webhooks/stripe', express.raw({ type: 'application/json' }), paymentRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New socket connection', { socketId: socket.id, ip: socket.handshake.address });
  handleSocketConnection(io, socket);
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(globalErrorHandler);

// Graceful shutdown setup
setupGracefulShutdown(server);

// Server startup
const PORT = config.server.port;
const HOST = config.server.host;

server.listen(PORT, HOST, () => {
  logger.info('🚀 Server started successfully', {
    port: PORT,
    host: HOST,
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    features: Object.entries(features).filter(([, enabled]) => enabled).map(([name]) => name),
    nodeVersion: process.version,
    uptime: process.uptime()
  });

  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${config.services.frontend.url}`);
  console.log(`💚 Health Check: http://${HOST}:${PORT}/health`);

  if (features.apiDocs) {
    console.log(`📚 API Documentation: http://${HOST}:${PORT}/api/docs`);
  }

  console.log(`🔧 Features enabled: ${Object.entries(features).filter(([, enabled]) => enabled).map(([name]) => name).join(', ')}`);

  // Log startup metrics
  logger.info('Server startup metrics', {
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    platform: process.platform,
    arch: process.arch
  });
});

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });

  // Graceful shutdown
  server.close(() => {
    process.exit(1);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    process.exit(1);
  }, 5000);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString()
  });

  // In production, you might want to exit the process
  if (config.isProduction) {
    process.exit(1);
  }
});

// Memory monitoring
if (config.isProduction) {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const threshold = 500 * 1024 * 1024; // 500MB

    if (memUsage.heapUsed > threshold) {
      logger.warn('High memory usage detected', {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        threshold: `${threshold / 1024 / 1024}MB`
      });
    }
  }, 60000); // Check every minute
}

export { io, server };
export default app;