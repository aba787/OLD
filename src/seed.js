const crypto = require('crypto');
const store = require('./store');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

const TEST_ACCOUNTS = [
  { key: 'admin',   email: 'admin@careconnect.com',     password: 'Admin@123456',   fullName: 'مشرف النظام',   role: 'admin' },
  { key: 'org',     email: 'org@careconnect.com',       password: 'Org@123456',     fullName: 'منظمة رعاية',   role: 'organization', organizationName: 'منظمة رعاية للتطوع' },
  { key: 'vol',     email: 'volunteer@careconnect.com', password: 'Vol@123456',     fullName: 'متطوع تجريبي',  role: 'volunteer' },
  { key: 'elderly', email: 'elderly@careconnect.com',   password: 'Elderly@123456', fullName: 'أحمد المسن',    role: 'elderly' }
];

function ensureAccount(acc) {
  const emailKey = acc.email.trim().toLowerCase();
  const existing = store.get('credentials', emailKey);
  if (existing) {
    return { uid: existing.uid, created: false };
  }

  const uid = store.genId();
  const { salt, hash } = hashPassword(acc.password);
  store.set('credentials', emailKey, { uid, salt, hash, email: emailKey });

  const now = new Date().toISOString();
  const userData = {
    uid, id: uid, email: emailKey, fullName: acc.fullName,
    phone: '', address: '',
    role: acc.role, status: 'approved', createdAt: now
  };
  if (acc.role === 'organization') userData.organizationId = uid;
  store.set('users', uid, userData);

  if (acc.role === 'elderly') {
    store.set('elder_profiles', uid, {
      uid, id: uid, fullName: acc.fullName, email: emailKey,
      phone: '', address: '', emergencyContact: '', specialNeeds: '', createdAt: now
    });
  } else if (acc.role === 'volunteer') {
    store.set('volunteer_profiles', uid, {
      uid, id: uid, fullName: acc.fullName, email: emailKey,
      phone: '', address: '', skills: [], availability: {}, bio: '',
      totalHours: 0, completedRequests: 0, rating: 0, ratingCount: 0,
      verified: false, verifiedBy: null, createdAt: now
    });
  } else if (acc.role === 'organization') {
    store.set('organizations', uid, {
      uid, id: uid,
      organizationName: acc.organizationName || acc.fullName,
      registrationNumber: '',
      email: emailKey, phone: '', address: '',
      description: '', website: '',
      verifiedVolunteers: [], createdAt: now
    });
  }
  return { uid, created: true };
}

function unlinkVolunteerFromOrg(volUid, orgUid) {
  const volProfile = store.get('volunteer_profiles', volUid);
  if (volProfile && volProfile.verified) {
    store.replace('volunteer_profiles', volUid, {
      ...volProfile,
      verified: false,
      verifiedBy: null,
      verifiedByOrg: null,
      verifiedByOrgName: null,
      verifiedAt: null
    });
  }
  const org = store.get('organizations', orgUid);
  if (org && Array.isArray(org.verifiedVolunteers) && org.verifiedVolunteers.includes(volUid)) {
    const filtered = org.verifiedVolunteers.filter(id => id !== volUid);
    store.replace('organizations', orgUid, { ...org, verifiedVolunteers: filtered });
  }
}

function seedTestAccounts() {
  const ids = {};
  let createdCount = 0;
  for (const acc of TEST_ACCOUNTS) {
    const { uid, created } = ensureAccount(acc);
    ids[acc.key] = uid;
    if (created) createdCount++;
  }

  if (ids.vol && ids.org) {
    unlinkVolunteerFromOrg(ids.vol, ids.org);
  }

  if (createdCount > 0) {
    console.log(`[seed] Created ${createdCount} test account(s).`);
  } else {
    console.log('[seed] All test accounts present.');
  }
}

module.exports = { seedTestAccounts, TEST_ACCOUNTS };
