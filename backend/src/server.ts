import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Import routes
import authRoutes from './routes/auth';
import propertyRoutes from './routes/properties';
import applicationRoutes from './routes/applications';
import paymentRoutes from './routes/payments';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import maintenanceRoutes from './routes/maintenance';
import vendorRoutes from './routes/vendors';
import tenantRoutes from './routes/tenant';
import mobileRoutes from './routes/mobile';
import fareActRoutes from './routes/fareAct';
import analyticsRoutes from './routes/analytics';
// import healthRoutes from './routes/health'; // Temporarily disabled
import inspectionsRoutes from './routes/inspections';
import leasesRoutes from './routes/leases';
import notificationsRoutes from './routes/notifications';
import messagesRoutes from './routes/messages';
import searchRoutes from './routes/search';
import uploadRoutes from './routes/upload';

// Import middleware
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { createRateLimit } from './middleware/security';
import { authenticateToken } from './middleware/auth';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const apiRateLimit = createRateLimit(15 * 60 * 1000, 100); // 100 requests per 15 minutes
app.use('/api/', apiRateLimit);

// Static files
app.use('/uploads', express.static('uploads'));

// Health check
// app.use('/', healthRoutes);

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/vendors', vendorRoutes);
// app.use('/api/tenant', tenantRoutes); // Temporarily disabled due to schema issues
// app.use('/api/mobile', mobileRoutes); // Temporarily disabled due to TypeScript issues
// app.use('/api/fare-act', fareActRoutes); // Temporarily disabled
// app.use('/api/analytics', analyticsRoutes); // Temporarily disabled due to TypeScript issues
// app.use('/api/inspections', inspectionsRoutes); // Temporarily disabled
// app.use('/api/leases', leasesRoutes); // Temporarily disabled
// app.use('/api/notifications', notificationsRoutes); // Temporarily disabled
// app.use('/api/messages', messagesRoutes); // Temporarily disabled
// app.use('/api/search', searchRoutes); // Temporarily disabled
// app.use('/api/upload', uploadRoutes); // Temporarily disabled

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', (room) => {
    socket.join(room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });

  socket.on('leave-room', (room) => {
    socket.leave(room);
    console.log(`Client ${socket.id} left room: ${room}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(globalErrorHandler);

const PORT = process.env.PORT || 5000;

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export { io };