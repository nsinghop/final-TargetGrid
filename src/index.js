import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Import routes
import leadRoutes from './routes/leadRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import scoringRoutes from './routes/scoringRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

// Import middleware
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter, eventLimiter, uploadLimiter } from './middlewares/rateLimiter.js';

// Import services and controllers
import { ScoringService } from './services/scoringService.js';
import { EventController } from './controllers/eventController.js';
import logger from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Set Socket.IO instance for event controller
EventController.setSocketIO(io);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use('/api', apiLimiter);
app.use('/api/events', eventLimiter);
app.use('/api/events/upload', uploadLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'TargetGrid API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/leads', leadRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/scoring-rules', scoringRoutes);
app.use('/webhooks', webhookRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-lead', (leadId) => {
    socket.join(`lead-${leadId}`);
    logger.info(`Client ${socket.id} joined lead room: ${leadId}`);
  });

  socket.on('leave-lead', (leadId) => {
    socket.leave(`lead-${leadId}`);
    logger.info(`Client ${socket.id} left lead room: ${leadId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const PORT = process.env.PORT || 3001;

// Initialize application
async function startServer() {
  try {
    // Initialize default scoring rules
    await ScoringService.initializeDefaultRules();
    logger.info('Default scoring rules initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`TargetGrid API server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();