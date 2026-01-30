/**
 * Authentication Routes
 * 
 * Handles user registration, login verification, and profile management.
 * Firebase Authentication is done on the client-side, these routes handle
 * the server-side user data management.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Validation rules for registration
const registerValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('role').isIn(['volunteer', 'elderly', 'organization'])
    .withMessage('Invalid role selected'),
  body('fullName').notEmpty().trim().escape()
    .withMessage('Full name is required'),
  body('phone').optional().isMobilePhone()
    .withMessage('Please enter a valid phone number')
];

// Validation rules for profile update
const profileValidation = [
  body('fullName').optional().trim().escape(),
  body('phone').optional().isMobilePhone(),
  body('address').optional().trim().escape()
];

/**
 * POST /api/auth/register
 * Register a new user after Firebase authentication
 * Creates user document in Firestore with initial pending status
 * Requires valid Firebase token to prevent impersonation
 */
router.post('/register', verifyToken, registerValidation, authController.register);

/**
 * POST /api/auth/verify
 * Verify a Firebase ID token and return user data
 * Used to check if user is logged in and get their profile
 */
router.post('/verify', verifyToken, authController.verifyUser);

/**
 * GET /api/auth/profile
 * Get the current user's profile
 */
router.get('/profile', verifyToken, authController.getProfile);

/**
 * PUT /api/auth/profile
 * Update the current user's profile
 */
router.put('/profile', verifyToken, profileValidation, authController.updateProfile);

/**
 * POST /api/auth/logout
 * Handle logout (clear session data if needed)
 */
router.post('/logout', authController.logout);

module.exports = router;
