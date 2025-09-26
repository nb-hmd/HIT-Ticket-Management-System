import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection, initializeDatabase } from './models/index';
import { errorHandler, notFoundHandler, healthCheck, gracefulShutdown } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import ticketRoutes from './routes/tickets';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import reportRoutes from './routes/reports';
import uploadRoutes from './routes/upload';
import adminRoutes from './routes/admin';
import assignmentRoutes from './routes/assignments';
import auditRoutes from './routes/audit';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/audit', auditRoutes);

// Health check endpoint is now handled by the enhanced healthCheck middleware

// Initialize database on startup
const initApp = async () => {
  try {
    await testConnection();
    await initializeDatabase();
    console.log('🚀 Application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    console.log('⚠️ Server will continue running with limited functionality');
    // Don't exit the process, allow server to run without database
  }
};

// Initialize when app starts
initApp();

// Enhanced health check endpoint
app.get('/api/health', healthCheck);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

export default app;