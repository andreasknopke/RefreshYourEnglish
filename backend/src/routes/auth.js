import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import db from '../models/database.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Register
router.post('/register',
  body('username').isLength({ min: 3 }).trim(),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    const email = req.body.email.toLowerCase().trim(); // Manuell normalisieren

    console.log('📝 Registration attempt:', { username, email });

    try {
      // Check if user exists
      const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
      if (existingUser) {
        console.log('❌ User already exists:', email);
        return res.status(400).json({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Insert user
      console.log('💾 Inserting user into database...');
      const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, passwordHash);
      console.log('✅ User inserted with ID:', result.lastInsertRowid);

      // Verify insertion
      const verifyUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(result.lastInsertRowid);
      console.log('🔍 Verified user in DB:', verifyUser);

      // Generate verification token
      const verificationToken = emailService.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Stunden
      
      db.prepare('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?')
        .run(verificationToken, expiresAt.toISOString(), result.lastInsertRowid);

      // Send verification email
      await emailService.sendVerificationEmail(email, username, verificationToken);

      // Generate token
      const token = jwt.sign({ userId: result.lastInsertRowid, username }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'User created successfully. Please check your email to verify your account.',
        token,
        user: { id: result.lastInsertRowid, username, email, emailVerified: false }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Login
router.post('/login',
  body('email').isEmail(),
  body('password').exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.toLowerCase().trim(); // Manuell normalisieren
    const { password } = req.body;

    console.log('🔐 Login attempt for email:', email);

    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) {
        console.log('❌ User not found:', email);
        // List all users for debugging
        const allUsers = db.prepare('SELECT id, username, email FROM users').all();
        console.log('📋 All users in DB:', allUsers);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('✅ User found:', { id: user.id, username: user.username, email: user.email });

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        console.log('❌ Invalid password for user:', email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('✅ Password valid, logging in user:', user.username);

      // Update last login
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

      // Generate token
      const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token,
        user: { 
          id: user.id, 
          username: user.username, 
          email: user.email,
          emailVerified: user.email_verified === 1
        }
      });
    } catch (error) {
      console.log('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Check if token expired
    const now = new Date();
    const expiresAt = new Date(user.verification_token_expires);
    
    if (now > expiresAt) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Verify user
    db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?')
      .run(user.id);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend Verification Email
router.post('/resend-verification',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.toLowerCase().trim();

    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      if (!user) {
        // Aus Sicherheitsgründen keine genaue Fehlermeldung
        return res.json({ message: 'If the email exists, a verification link has been sent' });
      }

      if (user.email_verified === 1) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      // Generate new verification token
      const verificationToken = emailService.generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      db.prepare('UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?')
        .run(verificationToken, expiresAt.toISOString(), user.id);

      await emailService.sendVerificationEmail(email, user.username, verificationToken);

      res.json({ message: 'Verification email sent' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Forgot Password
router.post('/forgot-password',
  body('email').isEmail(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const email = req.body.email.toLowerCase().trim();

    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      
      // Aus Sicherheitsgründen immer die gleiche Antwort
      if (!user) {
        return res.json({ message: 'If the email exists, a password reset link has been sent' });
      }

      // Generate reset token
      const resetToken = emailService.generateToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde
      
      db.prepare('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?')
        .run(resetToken, expiresAt.toISOString(), user.id);

      await emailService.sendPasswordResetEmail(email, user.username, resetToken);

      res.json({ message: 'If the email exists, a password reset link has been sent' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Reset Password
router.post('/reset-password',
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;

    try {
      const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token);
      
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      // Check if token expired
      const now = new Date();
      const expiresAt = new Date(user.reset_token_expires);
      
      if (now > expiresAt) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?')
        .run(passwordHash, user.id);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

export default router;
