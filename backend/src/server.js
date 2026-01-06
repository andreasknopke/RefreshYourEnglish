import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import vocabularyRoutes from './routes/vocabulary.js';
import progressRoutes from './routes/progress.js';
import flashcardRoutes from './routes/flashcardRoutes.js';
import gamificationRoutes from './routes/gamification.js';
import actionModeRoutes from './routes/actionModeRoutes.js';
import llmRoutes from './routes/llmRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Parse CORS origins (support comma-separated list)
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

console.log('🔗 CORS enabled for:', corsOrigins.join(', '));

// Health checks BEFORE any middleware - must be accessible from Railway/monitoring
app.get('/health', (req, res) => {
  console.log('💚 Health check from:', req.headers['user-agent'] || req.ip);
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cors: {
      allowedOrigins: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    }
  });
});

// Alternative health check endpoints that Railway might use
app.get('/', (req, res) => {
  console.log('💚 Root health check from:', req.headers['user-agent'] || req.ip);
  res.json({ 
    status: 'ok',
    name: 'RefreshYourEnglish API',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Parse JSON BEFORE CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or Railway health checks)
    if (!origin) {
      console.log('✅ CORS: Request with no origin allowed (likely health check)');
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      console.log('✅ CORS: Origin allowed:', origin);
      callback(null, true);
    } else {
      console.warn('⚠️ CORS: Origin blocked:', origin, '| Allowed:', corsOrigins.join(', '));
      // DON'T throw error, just block with false - prevents server crash
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400 // 24 hours
}));

// Additional CORS headers for preflight requests
app.options('*', cors());

// Request logging
app.use((req, res, next) => {
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress
  };
  
  // Extra logging für LLM-Requests
  if (req.path.includes('/llm')) {
    console.log('🔵 [SERVER] LLM Request incoming:', {
      ...logData,
      body: req.body ? Object.keys(req.body) : 'no body',
      contentType: req.headers['content-type']
    });
  } else {
    console.log(`${logData.timestamp} - ${logData.method} ${logData.path}`);
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/action-mode', actionModeRoutes);
app.use('/api/llm', llmRoutes);

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  // Don't crash on CORS errors
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'CORS policy blocked this request', origin: req.headers.origin });
  }
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Configuration:`);
  console.log(`   - Allowed Origins: ${corsOrigins.join(', ')}`);
  console.log(`   - Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH`);
  console.log(`   - Credentials: enabled`);
  console.log(`   - Max Age: 24 hours\n`);
});

export default app;
