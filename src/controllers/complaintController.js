const { db } = require('../firebase');
const { logActivity, ACTION_TYPES } = require('./activityLogController');

const createComplaint = async (req, res) => {
  try {
    const { targetId, targetName, targetRole, relatedRequestId, type, description } = req.body;

    if (!targetId || !type || !description) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const complaintData = {
      reporterId: req.user.uid,
      reporterName: req.user.fullName,
      reporterRole: req.user.role,
      targetId,
      targetName: targetName || 'غير محدد',
      targetRole: targetRole || 'volunteer',
      relatedRequestId: relatedRequestId || null,
      type,
      description,
      status: 'pending',
      adminNotes: '',
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date().toISOString()
    };

    if (!db) {
      await logActivity(
        ACTION_TYPES.COMPLAINT_FILED,
        req.user.uid,
        req.user.fullName,
        req.user.role,
        'demo-complaint',
        'complaint',
        { type, targetId }
      );

      return res.json({
        message: 'تم تقديم الشكوى بنجاح (وضع تجريبي)',
        complaint: { id: 'demo-1', ...complaintData }
      });
    }

    const docRef = await db.collection('complaints').add(complaintData);

    await logActivity(
      ACTION_TYPES.COMPLAINT_FILED,
      req.user.uid,
      req.user.fullName,
      req.user.role,
      docRef.id,
      'complaint',
      { type, targetId, targetName }
    );

    res.status(201).json({
      message: 'تم تقديم الشكوى بنجاح',
      complaint: { id: docRef.id, ...complaintData }
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    res.status(500).json({ error: 'فشل في تقديم الشكوى' });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    if (!db) {
      return res.json({
        complaints: [
          {
            id: '1',
            targetName: 'متطوع تجريبي',
            type: 'no_show',
            description: 'لم يحضر في الموعد',
            status: 'pending',
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    const snapshot = await db.collection('complaints')
      .where('reporterId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();

    const complaints = [];
    snapshot.forEach(doc => {
      complaints.push({ id: doc.id, ...doc.data() });
    });

    res.json({ complaints });
  } catch (error) {
    console.error('Get my complaints error:', error);
    res.status(500).json({ error: 'فشل في تحميل الشكاوى' });
  }
};

const getAllComplaints = async (req, res) => {
  try {
    const { status } = req.query;

    if (!db) {
      return res.json({
        complaints: [
          {
            id: '1',
            reporterName: 'أحمد محمد',
            reporterRole: 'elderly',
            targetName: 'سعد عبدالله',
            targetRole: 'volunteer',
            type: 'no_show',
            description: 'لم يحضر في الموعد المحدد',
            status: 'pending',
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            reporterName: 'فاطمة علي',
            reporterRole: 'elderly',
            targetName: 'خالد سعد',
            targetRole: 'volunteer',
            type: 'poor_service',
            description: 'الخدمة كانت سيئة جداً',
            status: 'under_review',
            createdAt: new Date().toISOString()
          }
        ]
      });
    }

    let query = db.collection('complaints').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const complaints = [];
    snapshot.forEach(doc => {
      complaints.push({ id: doc.id, ...doc.data() });
    });

    res.json({ complaints });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({ error: 'فشل في تحميل الشكاوى' });
  }
};

const reviewComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, action } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'الحالة مطلوبة' });
    }

    const updateData = {
      status,
      adminNotes: adminNotes || '',
      updatedAt: new Date().toISOString()
    };

    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedBy = req.user.uid;
      updateData.resolvedAt = new Date().toISOString();
    }

    if (!db) {
      await logActivity(
        ACTION_TYPES.COMPLAINT_RESOLVED,
        req.user.uid,
        req.user.fullName,
        req.user.role,
        id,
        'complaint',
        { status, action }
      );

      return res.json({
        message: 'تم تحديث الشكوى بنجاح (وضع تجريبي)',
        complaint: { id, ...updateData }
      });
    }

    await db.collection('complaints').doc(id).update(updateData);

    if (action === 'suspend_user') {
      const complaintDoc = await db.collection('complaints').doc(id).get();
      if (complaintDoc.exists) {
        const complaint = complaintDoc.data();
        await db.collection('users').doc(complaint.targetId).update({
          status: 'suspended',
          suspendedAt: new Date().toISOString(),
          suspendReason: `شكوى: ${complaint.type}`
        });
      }
    }

    await logActivity(
      ACTION_TYPES.COMPLAINT_RESOLVED,
      req.user.uid,
      req.user.fullName,
      req.user.role,
      id,
      'complaint',
      { status, adminNotes, action }
    );

    res.json({
      message: 'تم تحديث الشكوى بنجاح',
      complaint: { id, ...updateData }
    });
  } catch (error) {
    console.error('Review complaint error:', error);
    res.status(500).json({ error: 'فشل في تحديث الشكوى' });
  }
};

const COMPLAINT_TYPES = {
  INAPPROPRIATE_BEHAVIOR: 'inappropriate_behavior',
  NO_SHOW: 'no_show',
  POOR_SERVICE: 'poor_service',
  SAFETY_CONCERN: 'safety_concern',
  OTHER: 'other'
};

module.exports = {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  reviewComplaint,
  COMPLAINT_TYPES
};
