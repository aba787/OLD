/**
 * Admin Routes
 * 
 * Routes for admin dashboard functionality:
 * - View all users and their statuses
 * - Approve or reject volunteer/organization registrations
 * - Block or suspend users
 * - View platform statistics
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { getActivityLogs } = require('../controllers/activityLogController');
const { getAllComplaints, reviewComplaint } = require('../controllers/complaintController');
const { verifyToken, adminOnly } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(verifyToken, adminOnly);

/**
 * GET /api/admin/users
 * Get all users with optional filtering by role and status
 * Query params: role, status, page, limit
 */
router.get('/users', adminController.getAllUsers);

/**
 * GET /api/admin/users/pending
 * Get all users pending approval (volunteers and organizations)
 */
router.get('/users/pending', adminController.getPendingUsers);

/**
 * PUT /api/admin/users/:userId/approve
 * Approve a user's registration
 */
router.put('/users/:userId/approve', adminController.approveUser);

/**
 * PUT /api/admin/users/:userId/reject
 * Reject a user's registration
 */
router.put('/users/:userId/reject', adminController.rejectUser);

/**
 * PUT /api/admin/users/:userId/suspend
 * Suspend a user's account
 */
router.put('/users/:userId/suspend', adminController.suspendUser);

/**
 * PUT /api/admin/users/:userId/activate
 * Reactivate a suspended user
 */
router.put('/users/:userId/activate', adminController.activateUser);

/**
 * GET /api/admin/stats
 * Get platform statistics (total users, requests, etc.)
 */
router.get('/stats', adminController.getStats);

/**
 * GET /api/admin/requests
 * Get all help requests for monitoring
 */
router.get('/requests', adminController.getAllRequests);

/**
 * GET /api/admin/activity-logs
 * Get platform activity logs for monitoring
 * Query params: action, startDate, endDate, limit
 */
router.get('/activity-logs', getActivityLogs);

/**
 * GET /api/admin/complaints
 * Get all complaints
 * Query params: status
 */
router.get('/complaints', getAllComplaints);

/**
 * PUT /api/admin/complaints/:id/review
 * Review and update a complaint
 */
router.put('/complaints/:id/review', reviewComplaint);

module.exports = router;
