/**
 * Volunteer Routes
 * 
 * Routes for volunteer functionality:
 * - Create and update volunteer profile
 * - View available help requests
 * - Accept and complete requests
 * - Log volunteering hours
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const volunteerController = require('../controllers/volunteerController');
const { verifyToken, volunteerOnly, requireApproval } = require('../middleware/auth');

// All volunteer routes require authentication
router.use(verifyToken);

// Profile validation rules
const profileValidation = [
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('availability').optional().isObject().withMessage('Availability must be an object'),
  body('bio').optional().trim().escape()
];

/**
 * GET /api/volunteer/profile
 * Get volunteer's profile
 */
router.get('/profile', volunteerOnly, volunteerController.getProfile);

/**
 * PUT /api/volunteer/profile
 * Update volunteer's profile (skills, availability, bio)
 */
router.put('/profile', volunteerOnly, profileValidation, volunteerController.updateProfile);

/**
 * GET /api/volunteer/requests
 * Get available help requests that the volunteer can accept
 */
router.get('/requests', volunteerOnly, requireApproval, volunteerController.getAvailableRequests);

/**
 * POST /api/volunteer/requests/:requestId/accept
 * Accept a help request
 */
router.post('/requests/:requestId/accept', volunteerOnly, requireApproval, volunteerController.acceptRequest);

/**
 * POST /api/volunteer/requests/:requestId/complete
 * Mark a request as completed and log hours
 */
router.post('/requests/:requestId/complete', volunteerOnly, requireApproval, volunteerController.completeRequest);

/**
 * GET /api/volunteer/hours
 * Get volunteer's logged hours summary
 */
router.get('/hours', volunteerOnly, volunteerController.getHours);

/**
 * POST /api/volunteer/hours
 * Log volunteering hours manually
 */
router.post('/hours', volunteerOnly, requireApproval, [
  body('hours').isFloat({ min: 0.5, max: 24 }).withMessage('Hours must be between 0.5 and 24'),
  body('description').notEmpty().trim().escape().withMessage('Description is required'),
  body('date').isISO8601().withMessage('Valid date is required')
], volunteerController.logHours);

/**
 * GET /api/volunteer/my-requests
 * Get requests assigned to this volunteer
 */
router.get('/my-requests', volunteerOnly, volunteerController.getMyRequests);

module.exports = router;
