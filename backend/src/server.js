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

// Middleware
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${corsOrigins.join(', ')}\n`);
});

export default app;
