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
function resolvePort(rawPort) {
  if (!rawPort) return 6000;

  const direct = Number(rawPort);
  if (Number.isInteger(direct) && direct > 0 && direct <= 65535) {
    return direct;
  }

  const firstNumericMatch = String(rawPort).match(/\d+/);
  if (firstNumericMatch) {
    const parsed = Number(firstNumericMatch[0]);
    if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
      console.warn(`⚠️ Invalid PORT value "${rawPort}" detected. Falling back to parsed port ${parsed}.`);
      return parsed;
    }
  }

  console.warn(`⚠️ Invalid PORT value "${rawPort}" detected. Falling back to 6000.`);
  return 6000;
}

const PORT = resolvePort(process.env.PORT);
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
const envAllowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()),
].filter(Boolean);

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://presentationgenai.netlify.app',
];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envAllowedOrigins]));
const allowNetlifyPreview = (process.env.ALLOW_NETLIFY_PREVIEW || 'true').toLowerCase() !== 'false';

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (allowNetlifyPreview) {
      try {
        const hostname = new URL(origin).hostname;
        if (hostname.endsWith('.netlify.app')) {
          callback(null, true);
          return;
        }
      } catch {
        // ignore malformed origin and return not allowed below
      }
    }

    if (!origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '50mb';
app.use(express.json({ limit: jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: jsonBodyLimit }));
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
