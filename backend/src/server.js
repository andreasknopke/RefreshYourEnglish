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

// CORS Configuration - IMPORTANT: Must be before other middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin is allowed
    if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn('⚠️ CORS blocked:', origin, '| Allowed:', corsOrigins.join(', '));
      callback(new Error('Not allowed by CORS'));
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Welcome page
app.get('/', (req, res) => {
  res.json({
    name: 'RefreshYourEnglish API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      vocabulary: {
        getAll: 'GET /api/vocabulary',
        getOne: 'GET /api/vocabulary/:id',
        create: 'POST /api/vocabulary',
        update: 'PUT /api/vocabulary/:id',
        delete: 'DELETE /api/vocabulary/:id'
      },
      progress: {
        getProgress: 'GET /api/progress',
        updateProgress: 'POST /api/progress/:vocabularyId',
        startSession: 'POST /api/progress/session/start',
        completeSession: 'POST /api/progress/session/:id/complete',
        getStats: 'GET /api/progress/stats'
      },
      flashcards: {
        addToFlashcardDeck: 'POST /api/flashcards',
        getDueFlashcards: 'GET /api/flashcards/due',
        getAllFlashcards: 'GET /api/flashcards',
        getStats: 'GET /api/flashcards/stats',
        reviewFlashcard: 'POST /api/flashcards/:flashcardId/review',
        removeFlashcard: 'DELETE /api/flashcards/:flashcardId'
      }
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    cors: {
      allowedOrigins: corsOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
    }
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404 Not Found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'CORS policy blocked this request', origin: req.headers.origin });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
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
