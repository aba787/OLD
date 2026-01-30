/**
 * Authentication and Authorization Middleware
 * 
 * This middleware handles:
 * 1. Token verification - Ensures users are logged in
 * 2. Role-based access control - Restricts routes based on user roles
 * 3. Account status checks - Blocks suspended users
 */

const { auth, db } = require('../firebase');

/**
 * Verify Firebase ID Token
 * This middleware checks if the request has a valid Firebase auth token
 * In demo mode, accepts a demo header for testing
 */
const verifyToken = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if (req.cookies && req.cookies.authToken) {
      token = req.cookies.authToken;
    }

    // DEMO MODE: Allow demo access when Firebase is not configured
    // Check for demo header or if no auth service is available
    const demoMode = req.headers['x-demo-mode'] === 'true';
    const demoRole = req.headers['x-demo-role'] || 'elderly';
    
    if (!auth) {
      // Demo mode - use demo user based on headers or defaults
      if (demoMode || !token) {
        req.user = { 
          uid: 'demo-user-' + demoRole, 
          email: `demo-${demoRole}@example.com`, 
          role: demoRole,
          fullName: 'Demo ' + demoRole.charAt(0).toUpperCase() + demoRole.slice(1),
          status: 'approved'
        };
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
    }

    // Verify the token with Firebase
    if (auth) {
      const decodedToken = await auth.verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'pending'
      };

      // Get additional user data from Firestore
      if (db) {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          req.user = { ...req.user, ...userData };
          
          // Check if user is suspended
          if (userData.status === 'suspended') {
            return res.status(403).json({
              error: 'Your account has been suspended. Please contact admin.',
              code: 'ACCOUNT_SUSPENDED'
            });
          }
        }
      }
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * Restricts access to routes based on user roles
 * 
 * @param {Array} allowedRoles - Array of roles that can access the route
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'You do not have permission to access this resource',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Admin Only Middleware
 * Shortcut for routes that only admins can access
 */
const adminOnly = requireRole(['admin']);

/**
 * Volunteer Only Middleware
 * For routes that approved volunteers can access
 */
const volunteerOnly = requireRole(['volunteer', 'admin']);

/**
 * Elderly User Middleware
 * For routes that elderly users can access
 */
const elderlyOnly = requireRole(['elderly', 'admin']);

/**
 * Organization Middleware
 * For routes that organizations can access
 */
const organizationOnly = requireRole(['organization', 'admin']);

/**
 * Approved Users Only
 * Ensures the user's account has been approved by admin
 */
const requireApproval = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.status !== 'approved' && req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Your account is pending approval',
      code: 'PENDING_APPROVAL',
      status: req.user.status || 'pending'
    });
  }

  next();
};

module.exports = {
  verifyToken,
  requireRole,
  adminOnly,
  volunteerOnly,
  elderlyOnly,
  organizationOnly,
  requireApproval
};
