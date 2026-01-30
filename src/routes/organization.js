/**
 * Organization Routes
 * 
 * Routes for charity organizations to:
 * - Register organization details
 * - Verify volunteers
 * - View organization's verified volunteers
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const organizationController = require('../controllers/organizationController');
const { verifyToken, organizationOnly, requireApproval } = require('../middleware/auth');

// All organization routes require authentication
router.use(verifyToken, organizationOnly);

// Organization profile validation
const profileValidation = [
  body('organizationName').notEmpty().trim().escape()
    .withMessage('Organization name is required'),
  body('registrationNumber').optional().trim().escape(),
  body('address').optional().trim().escape(),
  body('website').optional().isURL().withMessage('Please enter a valid URL'),
  body('description').optional().trim().escape()
];

/**
 * GET /api/organization/profile
 * Get organization profile
 */
router.get('/profile', organizationController.getProfile);

/**
 * PUT /api/organization/profile
 * Update organization details
 */
router.put('/profile', profileValidation, organizationController.updateProfile);

/**
 * GET /api/organization/volunteers
 * Get list of volunteers verified by this organization
 */
router.get('/volunteers', requireApproval, organizationController.getVerifiedVolunteers);

/**
 * POST /api/organization/volunteers/:volunteerId/verify
 * Verify a volunteer (confirm they work with this organization)
 */
router.post('/volunteers/:volunteerId/verify', requireApproval, organizationController.verifyVolunteer);

/**
 * DELETE /api/organization/volunteers/:volunteerId
 * Remove verification from a volunteer
 */
router.delete('/volunteers/:volunteerId', requireApproval, organizationController.removeVolunteerVerification);

/**
 * GET /api/organization/volunteers/pending
 * Get volunteers who requested verification from this organization
 */
router.get('/volunteers/pending', requireApproval, organizationController.getPendingVerifications);

module.exports = router;
