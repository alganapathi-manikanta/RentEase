import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { getUploadDirectory } from './config/media.js';
import { seedDemoUsers } from './utils/seedDemoUsers.js';
import authRoutes from './routes/authRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import userRoutes from './routes/userRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';

dotenv.config();
dotenv.config({ path: './backend/.env' });

const app = express();
const PORT = process.env.PORT || 5000;

const configuredOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [process.env.CLIENT_URL, process.env.FRONTEND_URL].filter(Boolean);
const allowedOrigins = new Set(configuredOrigins.map((value) => {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    return url.origin;
  } catch {
    throw new Error(`Invalid frontend origin in CORS configuration: ${value}`);
  }
}));

const isLocalOrLanOrigin = (origin) => {
  try {
    const { hostname } = new URL(origin);
    if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
      return true;
    }
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const [, o1, o2] = ipv4Match.map(Number);
      if (o1 === 10) return true;
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;
      if (o1 === 192 && o2 === 168) return true;
    }
    return false;
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (process.env.NODE_ENV !== 'production' && isLocalOrLanOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(getUploadDirectory())
);

app.get('/api/health', (req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    success: true,
    message: 'Rent Ease backend is running',
    database: databaseConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

const requireDatabase = (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ success: false, message: 'Database connection is unavailable. Start MongoDB and try again.' });
};

app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/users', requireDatabase, userRoutes);
app.use('/api/favorites', requireDatabase, favoriteRoutes);
app.use('/api/wishlist', requireDatabase, wishlistRoutes);
app.use('/api/uploads', requireDatabase, uploadRoutes);
app.use('/api/properties', requireDatabase, propertyRoutes);
app.use('/api/admin', requireDatabase, adminRoutes);
app.use('/api/chat', requireDatabase, chatRoutes);
app.use(notFound);
app.use(errorHandler);

const connectWithRetry = async () => {
  try {
    await connectDB();
    await seedDemoUsers();
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}. Retrying in 5 seconds.`);
    setTimeout(connectWithRetry, 5000);
  }
};

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    connectWithRetry();
  });
};

startServer();
