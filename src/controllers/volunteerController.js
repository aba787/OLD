/**
 * Volunteer Controller
 * 
 * Handles volunteer-specific functionality:
 * - Profile management (skills, availability)
 * - Viewing and accepting help requests
 * - Logging volunteer hours
 */

const { db } = require('../firebase');
const { validationResult } = require('express-validator');
const { logActivity, ACTION_TYPES } = require('./activityLogController');

/**
 * Get volunteer's profile
 */
const getProfile = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        fullName: 'Demo Volunteer',
        email: 'volunteer@demo.com',
        skills: ['Shopping', 'Transportation'],
        availability: { monday: true, tuesday: true },
        bio: 'Happy to help!',
        totalHours: 24,
        completedRequests: 8,
        rating: 4.8,
        verified: true
      });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(userDoc.data());
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * Update volunteer's profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { skills, availability, bio } = req.body;
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (skills) updateData.skills = skills;
    if (availability) updateData.availability = availability;
    if (bio) updateData.bio = bio;

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
 * Get available help requests
 */
const getAvailableRequests = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        requests: [
          { 
            id: '1', 
            type: 'shopping', 
            description: 'Weekly grocery shopping', 
            urgency: 'medium',
            elderlyName: 'Mary Johnson',
            preferredDate: new Date().toISOString(),
            address: '123 Main St',
            status: 'pending'
          },
          { 
            id: '2', 
            type: 'hospital', 
            description: 'Doctor appointment transportation', 
            urgency: 'high',
            elderlyName: 'Robert Smith',
            preferredDate: new Date().toISOString(),
            address: '456 Oak Ave',
            status: 'pending'
          }
        ]
      });
    }

    // Get pending requests
    const snapshot = await db.collection('requests')
      .where('status', '==', 'pending')
      .orderBy('urgency', 'desc')
      .orderBy('createdAt', 'asc')
      .get();

    const requests = [];
    for (const doc of snapshot.docs) {
      const request = { id: doc.id, ...doc.data() };
      
      // Get elderly user's name
      const elderlyDoc = await db.collection('users').doc(request.elderlyId).get();
      if (elderlyDoc.exists) {
        request.elderlyName = elderlyDoc.data().fullName;
      }
      
      requests.push(request);
    }

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
};

/**
 * Accept a help request
 */
const acceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    if (!db) {
      await logActivity(
        ACTION_TYPES.REQUEST_ACCEPTED,
        req.user.uid,
        req.user.fullName,
        req.user.role,
        requestId,
        'request',
        {}
      );
      return res.json({ message: 'تم قبول الطلب بنجاح' });
    }

    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const request = requestDoc.data();
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'هذا الطلب لم يعد متاحاً' });
    }

    // Update request with volunteer assignment
    await requestRef.update({
      status: 'assigned',
      volunteerId: req.user.uid,
      volunteerName: req.user.fullName,
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await logActivity(
      ACTION_TYPES.REQUEST_ACCEPTED,
      req.user.uid,
      req.user.fullName,
      req.user.role,
      requestId,
      'request',
      { elderlyName: request.elderlyName, type: request.type }
    );

    res.json({ message: 'تم قبول الطلب بنجاح' });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Failed to accept request' });
  }
};

/**
 * Mark a request as completed
 */
const completeRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { hoursSpent, notes } = req.body;
    
    if (!db) {
      await logActivity(
        ACTION_TYPES.REQUEST_COMPLETED,
        req.user.uid,
        req.user.fullName,
        req.user.role,
        requestId,
        'request',
        { hoursSpent }
      );
      return res.json({ message: 'تم إتمام الطلب بنجاح' });
    }

    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const request = requestDoc.data();
    if (request.volunteerId !== req.user.uid) {
      return res.status(403).json({ error: 'أنت غير مخصص لهذا الطلب' });
    }

    // Update request status
    await requestRef.update({
      status: 'completed',
      hoursSpent: parseFloat(hoursSpent) || 1,
      completionNotes: notes || '',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update volunteer's stats
    const volunteerRef = db.collection('users').doc(req.user.uid);
    const volunteerDoc = await volunteerRef.get();
    const volunteerData = volunteerDoc.data();

    await volunteerRef.update({
      totalHours: (volunteerData.totalHours || 0) + (parseFloat(hoursSpent) || 1),
      completedRequests: (volunteerData.completedRequests || 0) + 1,
      updatedAt: new Date().toISOString()
    });

    await logActivity(
      ACTION_TYPES.REQUEST_COMPLETED,
      req.user.uid,
      req.user.fullName,
      req.user.role,
      requestId,
      'request',
      { elderlyName: request.elderlyName, type: request.type, hoursSpent }
    );

    res.json({ message: 'تم إتمام الطلب بنجاح' });
  } catch (error) {
    console.error('Complete request error:', error);
    res.status(500).json({ error: 'Failed to complete request' });
  }
};

/**
 * Get volunteer's logged hours
 */
const getHours = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        totalHours: 24.5,
        thisMonth: 8,
        logs: [
          { date: '2024-01-15', hours: 2, description: 'Grocery shopping' },
          { date: '2024-01-18', hours: 3, description: 'Hospital visit' }
        ]
      });
    }

    // Get user's total hours
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();

    // Get hour logs
    const logsSnapshot = await db.collection('hourLogs')
      .where('volunteerId', '==', req.user.uid)
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const logs = [];
    logsSnapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    res.json({
      totalHours: userData.totalHours || 0,
      completedRequests: userData.completedRequests || 0,
      logs
    });
  } catch (error) {
    console.error('Get hours error:', error);
    res.status(500).json({ error: 'Failed to get hours' });
  }
};

/**
 * Log volunteer hours manually
 */
const logHours = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hours, description, date } = req.body;
    
    if (!db) {
      return res.json({ message: 'Hours logged (demo mode)' });
    }

    // Create hour log entry
    const logEntry = {
      volunteerId: req.user.uid,
      volunteerName: req.user.fullName,
      hours: parseFloat(hours),
      description,
      date,
      createdAt: new Date().toISOString(),
      status: 'pending' // Requires admin approval
    };

    await db.collection('hourLogs').add(logEntry);

    res.json({ message: 'Hours logged successfully (pending approval)' });
  } catch (error) {
    console.error('Log hours error:', error);
    res.status(500).json({ error: 'Failed to log hours' });
  }
};

/**
 * Get requests assigned to this volunteer
 */
const getMyRequests = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        requests: [
          { 
            id: '1', 
            type: 'shopping', 
            description: 'Weekly groceries', 
            status: 'assigned',
            elderlyName: 'Mary Johnson',
            assignedAt: new Date().toISOString()
          }
        ]
      });
    }

    const snapshot = await db.collection('requests')
      .where('volunteerId', '==', req.user.uid)
      .orderBy('assignedAt', 'desc')
      .get();

    const requests = [];
    for (const doc of snapshot.docs) {
      const request = { id: doc.id, ...doc.data() };
      
      const elderlyDoc = await db.collection('users').doc(request.elderlyId).get();
      if (elderlyDoc.exists) {
        request.elderlyName = elderlyDoc.data().fullName;
      }
      
      requests.push(request);
    }

    res.json({ requests });
  } catch (error) {
    console.error('Get my requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getAvailableRequests,
  acceptRequest,
  completeRequest,
  getHours,
  logHours,
  getMyRequests
};
