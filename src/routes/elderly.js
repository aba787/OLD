/**
 * Elderly User Routes
 * 
 * Routes for elderly users to:
 * - Create help requests
 * - View their request history
 * - Rate volunteers after service
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const elderlyController = require('../controllers/elderlyController');
const { verifyToken, elderlyOnly } = require('../middleware/auth');

// All elderly routes require authentication
router.use(verifyToken, elderlyOnly);

// Request validation rules
const requestValidation = [
  body('type').isIn(['shopping', 'hospital', 'paperwork', 'companionship', 'other'])
    .withMessage('Invalid request type'),
  body('description').notEmpty().trim().escape()
    .withMessage('Please describe what you need help with'),
  body('urgency').isIn(['low', 'medium', 'high'])
    .withMessage('Please select urgency level'),
  body('preferredDate').optional().isISO8601()
    .withMessage('Please enter a valid date'),
  body('address').optional().trim().escape()
];

/**
 * POST /api/elderly/requests
 * Create a new help request
 */
router.post('/requests', requestValidation, elderlyController.createRequest);

/**
 * GET /api/elderly/requests
 * Get all requests made by this elderly user
 */
router.get('/requests', elderlyController.getMyRequests);

/**
 * GET /api/elderly/requests/:requestId
 * Get details of a specific request
 */
router.get('/requests/:requestId', elderlyController.getRequestDetails);

/**
 * PUT /api/elderly/requests/:requestId
 * Update a request (only if still pending)
 */
router.put('/requests/:requestId', requestValidation, elderlyController.updateRequest);

/**
 * DELETE /api/elderly/requests/:requestId
 * Cancel a request (only if still pending)
 */
router.delete('/requests/:requestId', elderlyController.cancelRequest);

/**
 * POST /api/elderly/requests/:requestId/rate
 * Rate a volunteer after service completion
 */
router.post('/requests/:requestId/rate', [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim().escape()
], elderlyController.rateVolunteer);

module.exports = router;
