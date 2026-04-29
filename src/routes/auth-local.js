const express = require('express');
const crypto = require('crypto');
const store = require('../store');

const router = express.Router();
const COOKIE = 'cc_session';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60 * 1000 };

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(password, s, 64).toString('hex');
  return { salt: s, hash: h };
}

function verifyPassword(password, salt, hash) {
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(hash, 'hex'));
  } catch (e) {
    return false;
  }
}

function newToken() {
  return crypto.randomBytes(32).toString('hex');
}

function readToken(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(/(?:^|; )cc_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

function getUserFromRequest(req) {
  const token = readToken(req);
  if (!token) return null;
  const sess = store.get('sessions', token);
  if (!sess) return null;
  return store.get('users', sess.uid);
}

router.post('/register', (req, res) => {
  const { email, password, fullName, phone, address, role, organizationName, registrationNumber } = req.body || {};
  if (!email || !password || !fullName || !role) {
    return res.status(400).json({ error: 'البريد والاسم وكلمة المرور والدور مطلوبة' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل' });
  if (!['admin', 'volunteer', 'elderly', 'organization'].includes(role)) {
    return res.status(400).json({ error: 'دور غير صالح' });
  }
  const emailKey = email.trim().toLowerCase();
  const existing = store.get('credentials', emailKey);
  if (existing) return res.status(409).json({ error: 'يوجد حساب بهذا البريد الإلكتروني' });

  const uid = store.genId();
  const { salt, hash } = hashPassword(password);
  store.set('credentials', emailKey, { uid, salt, hash, email: emailKey });

  const now = new Date().toISOString();
  const userData = {
    uid, id: uid, email: emailKey, fullName,
    phone: phone || '', address: address || '',
    role, status: 'approved', createdAt: now
  };
  if (role === 'organization') userData.organizationId = uid;
  store.set('users', uid, userData);

  if (role === 'elderly') {
    store.set('elder_profiles', uid, {
      uid, id: uid, fullName, email: emailKey,
      phone: phone || '', address: address || '',
      emergencyContact: '', specialNeeds: '', createdAt: now
    });
  } else if (role === 'volunteer') {
    store.set('volunteer_profiles', uid, {
      uid, id: uid, fullName, email: emailKey,
      phone: phone || '', address: address || '',
      skills: [], availability: {}, bio: '',
      totalHours: 0, completedRequests: 0,
      rating: 0, ratingCount: 0,
      verified: false, verifiedBy: null, createdAt: now
    });
  } else if (role === 'organization') {
    store.set('organizations', uid, {
      uid, id: uid,
      organizationName: organizationName || fullName,
      registrationNumber: registrationNumber || '',
      email: emailKey, phone: phone || '', address: address || '',
      description: '', website: '',
      verifiedVolunteers: [], createdAt: now
    });
  }

  const token = newToken();
  store.set('sessions', token, { uid, createdAt: now });
  res.cookie(COOKIE, token, COOKIE_OPTS);
  res.json({ user: userData });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
  const emailKey = email.trim().toLowerCase();
  const cred = store.get('credentials', emailKey);
  if (!cred) return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  if (!verifyPassword(password, cred.salt, cred.hash)) {
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  }
  const user = store.get('users', cred.uid);
  if (!user) return res.status(500).json({ error: 'الحساب غير مكتمل' });
  const token = newToken();
  store.set('sessions', token, { uid: cred.uid, createdAt: new Date().toISOString() });
  res.cookie(COOKIE, token, COOKIE_OPTS);
  res.json({ user });
});

router.post('/logout', (req, res) => {
  const token = readToken(req);
  if (token) store.remove('sessions', token);
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'غير مسجل دخول' });
  res.json({ user });
});

router.post('/ensure-test-account', (req, res) => {
  const { email, password, fullName, role, organizationName } = req.body || {};
  if (!email || !password || !role) return res.status(400).json({ error: 'بيانات ناقصة' });
  const emailKey = email.trim().toLowerCase();
  const existing = store.get('credentials', emailKey);
  if (existing) {
    const user = store.get('users', existing.uid);
    return res.json({ user, alreadyExists: true });
  }
  req.body = { email: emailKey, password, fullName, role, organizationName, phone: '', address: '' };
  return router.handle({ ...req, url: '/register', method: 'POST' }, res, () => {});
});

module.exports = { router, getUserFromRequest };
