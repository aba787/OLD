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
 * Creates users/{uid} AND role-specific profile
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const uid = req.user.uid;
    const email = req.user.email;
    const { fullName, phone, role, address, organizationName, registrationNumber } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'Authentication required' });
    }

    const now = new Date().toISOString();
    const autoApprovedEmails = ['reemalomrani5@gmail.com', '461004641@stu.ut.edu.sa'];
    const status = (role === 'elderly' || autoApprovedEmails.includes(email.toLowerCase())) ? 'approved' : 'pending';

    const userData = {
      uid,
      email,
      fullName,
      phone: phone || '',
      address: address || '',
      role,
      status,
      createdAt: now,
      updatedAt: now
    };

    if (role === 'organization') {
      userData.organizationId = uid;
    }

    if (db) {
      await db.collection('users').doc(uid).set(userData, { merge: true });
      console.log(`Created/updated users/${uid}`);

      if (role === 'elderly') {
        const elderProfile = {
          uid,
          fullName,
          phone: phone || '',
          address: address || '',
          emergencyContact: '',
          specialNeeds: '',
          createdAt: now,
          updatedAt: now
        };
        await db.collection('elder_profiles').doc(uid).set(elderProfile, { merge: true });
        console.log(`Created elder_profiles/${uid}`);
      } else if (role === 'volunteer') {
        const volunteerProfile = {
          uid,
          fullName,
          phone: phone || '',
          address: address || '',
          skills: [],
          availability: {},
          bio: '',
          totalHours: 0,
          completedRequests: 0,
          rating: 0,
          ratingCount: 0,
          verified: false,
          verifiedBy: null,
          createdAt: now,
          updatedAt: now
        };
        await db.collection('volunteer_profiles').doc(uid).set(volunteerProfile, { merge: true });
        console.log(`Created volunteer_profiles/${uid}`);
      } else if (role === 'organization') {
        const orgProfile = {
          uid,
          organizationName: organizationName || fullName,
          registrationNumber: registrationNumber || '',
          email,
          phone: phone || '',
          address: address || '',
          description: '',
          website: '',
          verifiedVolunteers: [],
          createdAt: now,
          updatedAt: now
        };
        await db.collection('organizations').doc(uid).set(orgProfile, { merge: true });
        console.log(`Created organizations/${uid}`);
      }
      
      if (auth) {
        try {
          await auth.setCustomUserClaims(uid, { role, status });
        } catch (claimsError) {
          console.warn('Could not set custom claims:', claimsError.message);
        }
      }
    }

    res.status(201).json({
      message: 'Registration successful',
      user: {
        uid,
        email,
        fullName,
        role,
        status
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
        
        let roleProfile = null;
        const role = userData.role;
        
        if (role === 'elderly') {
          const profileDoc = await db.collection('elder_profiles').doc(req.user.uid).get();
          if (profileDoc.exists) {
            roleProfile = profileDoc.data();
          }
        } else if (role === 'volunteer') {
          const profileDoc = await db.collection('volunteer_profiles').doc(req.user.uid).get();
          if (profileDoc.exists) {
            roleProfile = profileDoc.data();
          }
        } else if (role === 'organization') {
          const orgId = userData.organizationId || req.user.uid;
          const profileDoc = await db.collection('organizations').doc(orgId).get();
          if (profileDoc.exists) {
            roleProfile = profileDoc.data();
          }
        }
        
        delete userData.password;
        return res.json({ ...userData, ...roleProfile });
      }
    }
    
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

    const { fullName, phone, address, emergencyContact, specialNeeds, bio, skills } = req.body;
    const now = new Date().toISOString();
    
    const updateData = {
      updatedAt: now
    };

    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    if (db) {
      await db.collection('users').doc(req.user.uid).update(updateData);
      
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const role = userDoc.exists ? userDoc.data().role : null;
      
      if (role === 'elderly' && (emergencyContact || specialNeeds)) {
        const elderUpdate = { updatedAt: now };
        if (emergencyContact) elderUpdate.emergencyContact = emergencyContact;
        if (specialNeeds) elderUpdate.specialNeeds = specialNeeds;
        await db.collection('elder_profiles').doc(req.user.uid).update(elderUpdate);
      } else if (role === 'volunteer' && (bio || skills)) {
        const volUpdate = { updatedAt: now };
        if (bio) volUpdate.bio = bio;
        if (skills) volUpdate.skills = skills;
        await db.collection('volunteer_profiles').doc(req.user.uid).update(volUpdate);
      }
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
