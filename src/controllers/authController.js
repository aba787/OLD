/**
 * Authentication Controller
 * 
 * Handles user registration, verification, and profile management.
 * Works with Firebase Authentication and Firestore.
 */

const { db, auth } = require('../firebase');
const { validationResult } = require('express-validator');

/**
 * Register a new user
 * Called after successful Firebase authentication on the client side
 * SECURITY: User identity is derived from verified token, not client input
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // SECURITY: Use verified user info from token, not client-supplied data
    const uid = req.user.uid;
    const email = req.user.email;
    const { fullName, phone, role, address } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    // Create user document in Firestore
    const userData = {
      uid,
      email,
      fullName,
      phone: phone || '',
      role,
      address: address || '',
      status: role === 'elderly' ? 'approved' : 'pending', // Elderly users auto-approved
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add role-specific initial data
    if (role === 'volunteer') {
      userData.skills = [];
      userData.availability = {};
      userData.bio = '';
      userData.totalHours = 0;
      userData.completedRequests = 0;
      userData.rating = 0;
      userData.verified = false;
      userData.verifiedBy = null;
    } else if (role === 'organization') {
      userData.organizationName = '';
      userData.registrationNumber = '';
      userData.website = '';
      userData.description = '';
      userData.verifiedVolunteers = [];
    } else if (role === 'elderly') {
      userData.emergencyContact = '';
      userData.specialNeeds = '';
    }

    // Save to Firestore (if available)
    if (db) {
      await db.collection('users').doc(uid).set(userData);
      
      // Set custom claims for role-based access (if auth is available)
      if (auth) {
        await auth.setCustomUserClaims(uid, { role, status: userData.status });
      }
    }

    res.status(201).json({
      message: 'Registration successful',
      user: {
        uid,
        email,
        fullName,
        role,
        status: userData.status
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * Verify user token and return user data
 */
const verifyUser = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    res.json({
      authenticated: true,
      user: {
        uid: req.user.uid,
        email: req.user.email,
        role: req.user.role,
        fullName: req.user.fullName,
        status: req.user.status
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
};

/**
 * Get current user's profile
 */
const getProfile = async (req, res) => {
  try {
    if (db) {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Don't send sensitive fields
        delete userData.password;
        return res.json(userData);
      }
    }
    
    // Return basic user info if Firestore not available
    res.json(req.user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, phone, address, emergencyContact, specialNeeds } = req.body;
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    // Only update provided fields
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;
    if (emergencyContact) updateData.emergencyContact = emergencyContact;
    if (specialNeeds) updateData.specialNeeds = specialNeeds;

    if (db) {
      await db.collection('users').doc(req.user.uid).update(updateData);
    }

    res.json({ message: 'Profile updated successfully', updates: updateData });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * Handle logout
 */
const logout = async (req, res) => {
  try {
    // Clear auth cookie if using cookies
    res.clearCookie('authToken');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

module.exports = {
  register,
  verifyUser,
  getProfile,
  updateProfile,
  logout
};
