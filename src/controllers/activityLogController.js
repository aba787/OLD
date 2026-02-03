const { db } = require('../firebase');

const logActivity = async (action, actorId, actorName, actorRole, targetId, targetType, details = {}) => {
  try {
    if (!db) {
      console.log('Activity log (demo mode):', { action, actorId, actorName, actorRole, targetId, targetType, details });
      return;
    }

    const logData = {
      action,
      actorId,
      actorName,
      actorRole,
      targetId,
      targetType,
      details,
      timestamp: new Date().toISOString()
    };

    await db.collection('activity_logs').add(logData);
    console.log('Activity logged:', action);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const { action, startDate, endDate, limit: queryLimit } = req.query;
    const limitNum = parseInt(queryLimit) || 50;

    if (!db) {
      return res.json({
        logs: [
          {
            id: '1',
            action: 'request_created',
            actorId: 'elder1',
            actorName: 'أحمد محمد',
            actorRole: 'elderly',
            targetId: 'req1',
            targetType: 'request',
            details: { requestType: 'shopping' },
            timestamp: new Date().toISOString()
          },
          {
            id: '2',
            action: 'request_accepted',
            actorId: 'vol1',
            actorName: 'سعد عبدالله',
            actorRole: 'volunteer',
            targetId: 'req1',
            targetType: 'request',
            details: { elderlyName: 'أحمد محمد' },
            timestamp: new Date().toISOString()
          },
          {
            id: '3',
            action: 'user_approved',
            actorId: 'admin1',
            actorName: 'المسؤول',
            actorRole: 'admin',
            targetId: 'vol1',
            targetType: 'user',
            details: { role: 'volunteer' },
            timestamp: new Date().toISOString()
          }
        ]
      });
    }

    let query = db.collection('activity_logs').orderBy('timestamp', 'desc');

    if (action) {
      query = query.where('action', '==', action);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    query = query.limit(limitNum);

    const snapshot = await query.get();
    const logs = [];
    snapshot.forEach(doc => {
      logs.push({ id: doc.id, ...doc.data() });
    });

    res.json({ logs });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'فشل في تحميل سجل الأنشطة' });
  }
};

const ACTION_TYPES = {
  REQUEST_CREATED: 'request_created',
  REQUEST_ACCEPTED: 'request_accepted',
  REQUEST_COMPLETED: 'request_completed',
  REQUEST_CANCELLED: 'request_cancelled',
  REQUEST_RATED: 'request_rated',
  USER_REGISTERED: 'user_registered',
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
  USER_SUSPENDED: 'user_suspended',
  VOLUNTEER_VERIFIED: 'volunteer_verified',
  COMPLAINT_FILED: 'complaint_filed',
  COMPLAINT_RESOLVED: 'complaint_resolved'
};

module.exports = {
  logActivity,
  getActivityLogs,
  ACTION_TYPES
};
