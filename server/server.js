import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import presentationRoutes from './routes/presentationRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config({ path: '../.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6000;
const isProduction = process.env.NODE_ENV === 'production';

// Connect to MongoDB
connectDB();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// GZIP compression
app.use(compression());

// Logging
if (isProduction) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 100 : 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Favicon handler
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
  });
});

// Serve static files in production
if (isProduction) {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error Handler
app.use(errorHandler);

// Graceful shutdown
const server = app.listen(PORT, () => {
  console.log(`🚀 SlideEdge Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🌍 Env: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('⏹️  SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('⏹️  SIGINT received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

export default app;
