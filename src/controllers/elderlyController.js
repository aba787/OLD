/**
 * Elderly User Controller
 * 
 * Handles elderly user functionality:
 * - Creating help requests
 * - Viewing request history
 * - Rating volunteers
 */

const { db } = require('../firebase');
const { validationResult } = require('express-validator');
const { logActivity, ACTION_TYPES } = require('./activityLogController');

/**
 * Create a new help request
 */
const createRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, description, urgency, preferredDate, address } = req.body;

    const requestData = {
      elderlyId: req.user.uid,
      elderlyName: req.user.fullName,
      type,
      description,
      urgency,
      preferredDate: preferredDate || null,
      address: address || req.user.address || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!db) {
      await logActivity(
        ACTION_TYPES.REQUEST_CREATED,
        req.user.uid,
        req.user.fullName,
        req.user.role,
        'demo-1',
        'request',
        { type, urgency }
      );
      
      return res.json({ 
        message: 'تم إنشاء الطلب بنجاح',
        request: { id: 'demo-1', ...requestData }
      });
    }

    const docRef = await db.collection('requests').add(requestData);
    
    await logActivity(
      ACTION_TYPES.REQUEST_CREATED,
      req.user.uid,
      req.user.fullName,
      req.user.role,
      docRef.id,
      'request',
      { type, urgency }
    );

    res.status(201).json({ 
      message: 'تم إنشاء طلب المساعدة بنجاح',
      request: { id: docRef.id, ...requestData }
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
};

/**
 * Get all requests made by this elderly user
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
            urgency: 'medium',
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          { 
            id: '2', 
            type: 'hospital', 
            description: 'Doctor checkup', 
            urgency: 'high',
            status: 'completed',
            volunteerName: 'John Smith',
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    const snapshot = await db.collection('requests')
      .where('elderlyId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const requests = [];
    snapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    res.json({ requests });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
};

/**
 * Get details of a specific request
 */
const getRequestDetails = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!db) {
      return res.json({
        id: requestId,
        type: 'shopping',
        description: 'Weekly groceries',
        urgency: 'medium',
        status: 'assigned',
        volunteerName: 'John Smith',
        volunteerPhone: '555-0123',
        createdAt: new Date().toISOString()
      });
    }

    const requestDoc = await db.collection('requests').doc(requestId).get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = { id: requestDoc.id, ...requestDoc.data() };

    // Verify ownership
    if (request.elderlyId !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get volunteer details if assigned
    if (request.volunteerId) {
      const volunteerDoc = await db.collection('users').doc(request.volunteerId).get();
      if (volunteerDoc.exists) {
        const volunteer = volunteerDoc.data();
        request.volunteerName = volunteer.fullName;
        request.volunteerPhone = volunteer.phone;
        request.volunteerRating = volunteer.rating;
      }
    }

    res.json(request);
  } catch (error) {
    console.error('Get request details error:', error);
    res.status(500).json({ error: 'Failed to get request details' });
  }
};

/**
 * Update a request (only if pending)
 */
const updateRequest = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestId } = req.params;
    const { type, description, urgency, preferredDate, address } = req.body;

    if (!db) {
      return res.json({ message: 'Request updated (demo mode)' });
    }

    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestDoc.data();

    // Verify ownership
    if (request.elderlyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow updates to pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only update pending requests' });
    }

    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (type) updateData.type = type;
    if (description) updateData.description = description;
    if (urgency) updateData.urgency = urgency;
    if (preferredDate) updateData.preferredDate = preferredDate;
    if (address) updateData.address = address;

    await requestRef.update(updateData);

    res.json({ message: 'Request updated successfully' });
  } catch (error) {
    console.error('Update request error:', error);
    res.status(500).json({ error: 'Failed to update request' });
  }
};

/**
 * Cancel a request
 */
const cancelRequest = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!db) {
      return res.json({ message: 'Request cancelled (demo mode)' });
    }

    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestDoc.data();

    // Verify ownership
    if (request.elderlyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow cancellation of pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending requests' });
    }

    await requestRef.update({
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Request cancelled successfully' });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
};

/**
 * Rate a volunteer after service
 */
const rateVolunteer = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { requestId } = req.params;
    const { rating, feedback } = req.body;

    if (!db) {
      return res.json({ message: 'Rating submitted (demo mode)' });
    }

    const requestRef = db.collection('requests').doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestDoc.data();

    // Verify ownership and completion
    if (request.elderlyId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (request.status !== 'completed') {
      return res.status(400).json({ error: 'Can only rate completed requests' });
    }

    if (request.rated) {
      return res.status(400).json({ error: 'Already rated' });
    }

    // Update request with rating
    await requestRef.update({
      rating,
      feedback: feedback || '',
      rated: true,
      ratedAt: new Date().toISOString()
    });

    // Update volunteer's average rating
    if (request.volunteerId) {
      const volunteerRef = db.collection('users').doc(request.volunteerId);
      const volunteerDoc = await volunteerRef.get();
      const volunteer = volunteerDoc.data();

      // Calculate new average rating
      const totalRatings = (volunteer.totalRatings || 0) + 1;
      const currentSum = (volunteer.rating || 0) * (volunteer.totalRatings || 0);
      const newAverage = (currentSum + rating) / totalRatings;

      await volunteerRef.update({
        rating: Math.round(newAverage * 10) / 10,
        totalRatings,
        updatedAt: new Date().toISOString()
      });
    }

    res.json({ message: 'Thank you for your rating!' });
  } catch (error) {
    console.error('Rate volunteer error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

module.exports = {
  createRequest,
  getMyRequests,
  getRequestDetails,
  updateRequest,
  cancelRequest,
  rateVolunteer
};
