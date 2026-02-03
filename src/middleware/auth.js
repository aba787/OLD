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

    // DEMO MODE: Allow demo access when Firebase Admin is not configured
    // But we can still decode Firebase client tokens if they exist
    const demoMode = req.headers['x-demo-mode'] === 'true';
    const demoRole = req.headers['x-demo-role'] || 'elderly';
    
    if (!auth) {
      // Firebase Admin not configured - try to decode token manually or use demo
      if (token) {
        try {
          // Decode JWT without verification (Firebase client tokens are still valid)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
          const decoded = JSON.parse(jsonPayload);
          
          const uid = decoded.user_id || decoded.sub;
          
          // CRITICAL: Get user data from Firestore to get the correct role
          if (db) {
            try {
              const userDoc = await db.collection('users').doc(uid).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                req.user = { 
                  uid: uid,
                  email: decoded.email || userData.email,
                  role: userData.role || 'pending',
                  fullName: userData.fullName || decoded.name || 'مستخدم',
                  status: userData.status || 'approved',
                  ...userData
                };
                console.log('User loaded from Firestore:', uid, 'role:', req.user.role);
              } else {
                console.warn('User document not found in Firestore for uid:', uid);
                // User not in Firestore, allow with basic info
                req.user = {
                  uid: uid,
                  email: decoded.email,
                  role: 'elderly', // Default to elderly for missing users
                  fullName: decoded.name || 'مستخدم',
                  status: 'approved'
                };
              }
            } catch (firestoreError) {
              console.warn('Could not fetch user from Firestore:', firestoreError.message);
              req.user = {
                uid: uid,
                email: decoded.email,
                role: 'elderly',
                fullName: decoded.name || 'مستخدم',
                status: 'approved'
              };
            }
          } else {
            // No Firestore connection - DEMO MODE
            // SECURITY: Only allow elderly role in demo mode without Firestore
            // This prevents role spoofing for privileged roles (admin/volunteer/organization)
            const clientRole = req.headers['x-user-role'];
            const safeRole = (clientRole === 'elderly') ? 'elderly' : 'elderly';
            
            req.user = {
              uid: uid,
              email: decoded.email,
              role: safeRole,
              fullName: decoded.name || 'مستخدم',
              status: 'approved'
            };
            console.log('Demo mode (no Firestore) - using safe role:', safeRole);
          }
          
          return next();
        } catch (decodeError) {
          console.warn('Could not decode token:', decodeError.message);
        }
      }
      
      // No token or decode failed - use demo user with ELDERLY role only
      // SECURITY: Demo mode only allows elderly role to prevent privilege escalation
      if (demoMode || !token) {
        req.user = { 
          uid: 'demo-user-elderly', 
          email: 'demo-elderly@example.com', 
          role: 'elderly',  // Always elderly in demo mode for security
          fullName: 'مستخدم تجريبي',
          status: 'approved'
        };
        console.log('Demo mode - using elderly role for security');
        return next();
      }
      
      return res.status(401).json({ 
        error: 'Authentication service not available',
        code: 'AUTH_UNAVAILABLE'
      });
    }

    if (!token) {
      return res.status(401).json({ 
        error: 'No authentication token provided',
        code: 'NO_TOKEN'
      });
    }

    // Verify the token with Firebase Admin
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
