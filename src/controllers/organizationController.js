/**
 * Organization Controller
 * 
 * Handles organization (charity) functionality:
 * - Organization profile management
 * - Volunteer verification
 */

const { db } = require('../firebase');
const { validationResult } = require('express-validator');

/**
 * Get organization profile
 */
const getProfile = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        fullName: 'Care for All Charity',
        organizationName: 'Care for All',
        email: 'info@careforall.org',
        registrationNumber: 'REG-12345',
        address: '789 Charity Lane',
        website: 'https://careforall.org',
        description: 'Helping the community since 2010',
        verifiedVolunteers: 15,
        status: 'approved'
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
 * Update organization profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { organizationName, registrationNumber, address, website, description } = req.body;
    
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (organizationName) updateData.organizationName = organizationName;
    if (registrationNumber) updateData.registrationNumber = registrationNumber;
    if (address) updateData.address = address;
    if (website) updateData.website = website;
    if (description) updateData.description = description;

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
 * Get verified volunteers
 */
const getVerifiedVolunteers = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        volunteers: [
          { uid: '1', fullName: 'John Volunteer', email: 'john@email.com', skills: ['Shopping', 'Transport'], verifiedAt: new Date().toISOString() },
          { uid: '2', fullName: 'Sarah Helper', email: 'sarah@email.com', skills: ['Companionship'], verifiedAt: new Date().toISOString() }
        ]
      });
    }

    // Get volunteers verified by this organization
    const snapshot = await db.collection('users')
      .where('role', '==', 'volunteer')
      .where('verifiedBy', '==', req.user.uid)
      .get();

    const volunteers = [];
    snapshot.forEach(doc => {
      const volunteer = doc.data();
      volunteers.push({
        uid: volunteer.uid,
        fullName: volunteer.fullName,
        email: volunteer.email,
        skills: volunteer.skills || [],
        verifiedAt: volunteer.verifiedAt
      });
    });

    res.json({ volunteers, count: volunteers.length });
  } catch (error) {
    console.error('Get verified volunteers error:', error);
    res.status(500).json({ error: 'Failed to get volunteers' });
  }
};

/**
 * Verify a volunteer
 */
const verifyVolunteer = async (req, res) => {
  try {
    const { volunteerId } = req.params;

    if (!db) {
      return res.json({ message: 'Volunteer verified (demo mode)' });
    }

    // Check if volunteer exists and is approved
    const volunteerRef = db.collection('users').doc(volunteerId);
    const volunteerDoc = await volunteerRef.get();

    if (!volunteerDoc.exists) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    const volunteer = volunteerDoc.data();
    if (volunteer.role !== 'volunteer') {
      return res.status(400).json({ error: 'User is not a volunteer' });
    }

    // Update volunteer's verification status
    await volunteerRef.update({
      verified: true,
      verifiedBy: req.user.uid,
      verifiedByOrg: req.user.organizationName || req.user.fullName,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Volunteer verified successfully' });
  } catch (error) {
    console.error('Verify volunteer error:', error);
    res.status(500).json({ error: 'Failed to verify volunteer' });
  }
};

/**
 * Remove verification from a volunteer
 */
const removeVolunteerVerification = async (req, res) => {
  try {
    const { volunteerId } = req.params;

    if (!db) {
      return res.json({ message: 'Verification removed (demo mode)' });
    }

    const volunteerRef = db.collection('users').doc(volunteerId);
    const volunteerDoc = await volunteerRef.get();

    if (!volunteerDoc.exists) {
      return res.status(404).json({ error: 'Volunteer not found' });
    }

    const volunteer = volunteerDoc.data();

    // Can only remove verification given by this organization
    if (volunteer.verifiedBy !== req.user.uid) {
      return res.status(403).json({ error: 'Can only remove verification you provided' });
    }

    await volunteerRef.update({
      verified: false,
      verifiedBy: null,
      verifiedByOrg: null,
      verifiedAt: null,
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'Verification removed' });
  } catch (error) {
    console.error('Remove verification error:', error);
    res.status(500).json({ error: 'Failed to remove verification' });
  }
};

/**
 * Get pending verification requests
 */
const getPendingVerifications = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        volunteers: [
          { uid: '3', fullName: 'New Volunteer', email: 'new@email.com', requestedAt: new Date().toISOString() }
        ]
      });
    }

    // Get volunteers who requested verification from this organization
    const snapshot = await db.collection('verificationRequests')
      .where('organizationId', '==', req.user.uid)
      .where('status', '==', 'pending')
      .get();

    const volunteers = [];
    for (const doc of snapshot.docs) {
      const request = doc.data();
      const volunteerDoc = await db.collection('users').doc(request.volunteerId).get();
      if (volunteerDoc.exists) {
        const volunteer = volunteerDoc.data();
        volunteers.push({
          requestId: doc.id,
          uid: volunteer.uid,
          fullName: volunteer.fullName,
          email: volunteer.email,
          skills: volunteer.skills || [],
          requestedAt: request.createdAt
        });
      }
    }

    res.json({ volunteers, count: volunteers.length });
  } catch (error) {
    console.error('Get pending verifications error:', error);
    res.status(500).json({ error: 'Failed to get pending verifications' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getVerifiedVolunteers,
  verifyVolunteer,
  removeVolunteerVerification,
  getPendingVerifications
};
