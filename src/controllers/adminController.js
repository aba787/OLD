/**
 * Admin Controller
 * 
 * Handles administrative functions:
 * - User management (approve, reject, suspend)
 * - Platform statistics
 * - Request monitoring
 */

const { db, auth } = require('../firebase');

/**
 * Get all users with optional filtering
 */
const getAllUsers = async (req, res) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;
    
    if (!db) {
      // Demo mode: return sample users
      return res.json({
        users: [
          { uid: '1', email: 'volunteer@test.com', fullName: 'John Volunteer', role: 'volunteer', status: 'pending' },
          { uid: '2', email: 'elderly@test.com', fullName: 'Mary Elder', role: 'elderly', status: 'approved' },
          { uid: '3', email: 'org@test.com', fullName: 'Care Charity', role: 'organization', status: 'pending' }
        ],
        total: 3,
        page: 1
      });
    }

    let query = db.collection('users');
    
    // Apply filters
    if (role) {
      query = query.where('role', '==', role);
    }
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(parseInt(limit)).get();
    
    const users = [];
    snapshot.forEach(doc => {
      const user = doc.data();
      delete user.password; // Never expose password
      users.push(user);
    });

    res.json({ users, total: users.length, page: parseInt(page) });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * Get users pending approval
 */
const getPendingUsers = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        users: [
          { uid: '1', email: 'volunteer@test.com', fullName: 'John Volunteer', role: 'volunteer', status: 'pending', createdAt: new Date().toISOString() }
        ]
      });
    }

    const snapshot = await db.collection('users')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .get();
    
    const users = [];
    snapshot.forEach(doc => {
      users.push(doc.data());
    });

    res.json({ users, count: users.length });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ error: 'Failed to get pending users' });
  }
};

/**
 * Approve a user's registration
 */
const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!db) {
      return res.json({ message: 'User approved successfully (demo mode)' });
    }

    // Update user status in Firestore
    await db.collection('users').doc(userId).update({
      status: 'approved',
      approvedBy: req.user.uid,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update custom claims
    if (auth) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        await auth.setCustomUserClaims(userId, { 
          role: userData.role, 
          status: 'approved' 
        });
      }
    }

    res.json({ message: 'User approved successfully' });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ error: 'Failed to approve user' });
  }
};

/**
 * Reject a user's registration
 */
const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!db) {
      return res.json({ message: 'User rejected (demo mode)' });
    }

    await db.collection('users').doc(userId).update({
      status: 'rejected',
      rejectedBy: req.user.uid,
      rejectionReason: reason || 'No reason provided',
      rejectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    res.json({ message: 'User registration rejected' });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ error: 'Failed to reject user' });
  }
};

/**
 * Suspend a user's account
 */
const suspendUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!db) {
      return res.json({ message: 'User suspended (demo mode)' });
    }

    await db.collection('users').doc(userId).update({
      status: 'suspended',
      suspendedBy: req.user.uid,
      suspensionReason: reason || 'No reason provided',
      suspendedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update custom claims
    if (auth) {
      await auth.setCustomUserClaims(userId, { status: 'suspended' });
    }

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

/**
 * Reactivate a suspended user
 */
const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!db) {
      return res.json({ message: 'User activated (demo mode)' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await db.collection('users').doc(userId).update({
      status: 'approved',
      reactivatedBy: req.user.uid,
      reactivatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Update custom claims
    if (auth) {
      await auth.setCustomUserClaims(userId, { status: 'approved' });
    }

    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

/**
 * Get platform statistics
 */
const getStats = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        totalUsers: 25,
        pendingApprovals: 5,
        totalVolunteers: 10,
        totalElderly: 12,
        totalOrganizations: 3,
        totalRequests: 45,
        completedRequests: 38,
        totalHoursLogged: 156
      });
    }

    // Get user counts by role
    const usersSnapshot = await db.collection('users').get();
    let stats = {
      totalUsers: 0,
      pendingApprovals: 0,
      totalVolunteers: 0,
      totalElderly: 0,
      totalOrganizations: 0
    };

    usersSnapshot.forEach(doc => {
      const user = doc.data();
      stats.totalUsers++;
      if (user.status === 'pending') stats.pendingApprovals++;
      if (user.role === 'volunteer') stats.totalVolunteers++;
      if (user.role === 'elderly') stats.totalElderly++;
      if (user.role === 'organization') stats.totalOrganizations++;
    });

    // Get request statistics
    const requestsSnapshot = await db.collection('requests').get();
    stats.totalRequests = requestsSnapshot.size;
    stats.completedRequests = 0;
    stats.totalHoursLogged = 0;

    requestsSnapshot.forEach(doc => {
      const request = doc.data();
      if (request.status === 'completed') {
        stats.completedRequests++;
        stats.totalHoursLogged += request.hoursSpent || 0;
      }
    });

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

/**
 * Get all help requests for monitoring
 */
const getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    if (!db) {
      return res.json({
        requests: [
          { id: '1', type: 'shopping', description: 'Need groceries', status: 'pending', createdAt: new Date().toISOString() },
          { id: '2', type: 'hospital', description: 'Doctor appointment', status: 'assigned', createdAt: new Date().toISOString() }
        ]
      });
    }

    let query = db.collection('requests');
    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    const requests = [];
    snapshot.forEach(doc => {
      requests.push({ id: doc.id, ...doc.data() });
    });

    res.json({ requests, total: requests.length });
  } catch (error) {
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
  }
};

module.exports = {
  getAllUsers,
  getPendingUsers,
  approveUser,
  rejectUser,
  suspendUser,
  activateUser,
  getStats,
  getAllRequests
};
