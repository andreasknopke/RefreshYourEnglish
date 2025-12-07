import express from 'express';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import {
  addToActionReviews,
  markAsRemembered,
  getDueActionReviews,
  getActionReviewStats
} from '../controllers/actionModeController.js';

const router = express.Router();

// Add word to action mode review system (when "Forgot" clicked)
router.post('/reviews', authenticateToken, addToActionReviews);

// Mark word as remembered
router.post('/reviews/remember', authenticateToken, markAsRemembered);

// Get due words for action mode
router.get('/reviews/due', optionalAuth, getDueActionReviews);

// Get stats
router.get('/reviews/stats', optionalAuth, getActionReviewStats);

export default router;
