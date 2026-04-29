let currentUser = null;
let currentRole = null;
let userProfile = null;
let authStateResolved = false;

document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

async function initializeDashboard() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    showError('نظام المصادقة غير متاح. يرجى تحديث الصفحة.', true);
    return;
  }

  firebase.auth().onAuthStateChanged(async (user) => {
    authStateResolved = true;
    if (user) {
      currentUser = user;
      await loadOrCreateUserProfile(user);
    } else {
      window.location.href = '/login';
    }
  });

  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('request-form')?.addEventListener('submit', handleCreateRequest);
  document.getElementById('org-profile-form')?.addEventListener('submit', handleUpdateOrgProfile);
  document.getElementById('elderly-profile-form')?.addEventListener('submit', handleUpdateElderlyProfile);
}

async function loadOrCreateUserProfile(user) {
  try {
    let userData = null;
    try {
      userData = await dataApi.get('users', user.uid);
    } catch (e) {
      showRoleSelectionScreen(user);
      return;
    }

    currentRole = userData.role;
    let additionalProfile = {};
    const roleCol = getRoleCollection(userData.role);

    if (roleCol) {
      try {
        additionalProfile = await dataApi.get(roleCol, user.uid);
      } catch (e) {
        additionalProfile = await createRoleProfile(user, userData);
      }
    }

    userProfile = {
      uid: user.uid,
      email: user.email,
      fullName: userData.fullName || user.displayName || 'مستخدم',
      role: userData.role,
      status: userData.status || 'approved',
      phone: userData.phone || '',
      address: userData.address || '',
      ...additionalProfile
    };

    displayDashboard(userProfile);
  } catch (error) {
    console.error('Error loading profile:', error);
    showRoleSelectionScreen(user);
  }
}

function getRoleCollection(role) {
  return {
    elderly: 'elder_profiles',
    volunteer: 'volunteer_profiles',
    organization: 'organizations'
  }[role] || null;
}

async function createRoleProfile(user, userData) {
  const role = userData.role;
  const base = {
    uid: user.uid,
    id: user.uid,
    fullName: userData.fullName || user.displayName || '',
    email: user.email,
    phone: userData.phone || '',
    address: userData.address || ''
  };

  if (role === 'elderly') {
    return dataApi.save('elder_profiles', { ...base, emergencyContact: '', specialNeeds: '' });
  } else if (role === 'volunteer') {
    return dataApi.save('volunteer_profiles', {
      ...base, skills: [], availability: {}, bio: '',
      totalHours: 0, completedRequests: 0, rating: 0, ratingCount: 0,
      verified: false, verifiedBy: null
    });
  } else if (role === 'organization') {
    return dataApi.save('organizations', {
      ...base,
      organizationName: userData.organizationName || userData.fullName || '',
      registrationNumber: userData.registrationNumber || '',
      description: '', website: '', verifiedVolunteers: []
    });
  }
  return {};
}

function showRoleSelectionScreen(user) {
  document.getElementById('loading-screen').classList.add('hidden');
  const mainContent = document.querySelector('.dashboard-main');
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="dashboard-section" style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👋</div>
        <h3 style="margin-bottom: 1rem; color: var(--primary-color);">مرحباً بك في رعاية!</h3>
        <p style="margin-bottom: 2rem; color: var(--text-light);">يرجى اختيار نوع حسابك للمتابعة:</p>
        <div class="role-selector" style="max-width: 600px; margin: 0 auto 2rem;">
          <label class="role-option" style="cursor: pointer;">
            <input type="radio" name="setup-role" value="elderly" style="display: none;">
            <span class="role-card" style="display: block; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 1rem;">
              <span style="font-size: 2.5rem; display: block;">👴</span>
              <span style="font-size: 1.2rem; font-weight: 600; display: block;">مستخدم مسن</span>
              <span style="color: var(--text-light); font-size: 0.9rem;">أحتاج مساعدة في المهام اليومية</span>
            </span>
          </label>
          <label class="role-option" style="cursor: pointer;">
            <input type="radio" name="setup-role" value="volunteer" style="display: none;">
            <span class="role-card" style="display: block; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 1rem;">
              <span style="font-size: 2.5rem; display: block;">🙌</span>
              <span style="font-size: 1.2rem; font-weight: 600; display: block;">متطوع</span>
              <span style="color: var(--text-light); font-size: 0.9rem;">أريد مساعدة الآخرين</span>
            </span>
          </label>
          <label class="role-option" style="cursor: pointer;">
            <input type="radio" name="setup-role" value="organization" style="display: none;">
            <span class="role-card" style="display: block; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 1rem;">
              <span style="font-size: 2.5rem; display: block;">🏢</span>
              <span style="font-size: 1.2rem; font-weight: 600; display: block;">منظمة</span>
              <span style="color: var(--text-light); font-size: 0.9rem;">جمعية خيرية أو منظمة غير ربحية</span>
            </span>
          </label>
        </div>
        <button id="complete-setup-btn" class="btn btn-primary btn-lg" disabled>متابعة</button>
        <div style="margin-top: 2rem;"><button onclick="handleLogout()" class="btn btn-outline">تسجيل الخروج</button></div>
      </div>`;

    const completeBtn = document.getElementById('complete-setup-btn');
    mainContent.querySelectorAll('input[name="setup-role"]').forEach(option => {
      option.addEventListener('change', (e) => {
        mainContent.querySelectorAll('.role-card').forEach(card => {
          card.style.borderColor = '#e0e0e0';
          card.style.background = 'white';
        });
        e.target.closest('.role-option').querySelector('.role-card').style.borderColor = 'var(--primary-color)';
        e.target.closest('.role-option').querySelector('.role-card').style.background = 'var(--bg-alt)';
        completeBtn.disabled = false;
      });
    });

    completeBtn.addEventListener('click', async () => {
      const selectedRole = mainContent.querySelector('input[name="setup-role"]:checked')?.value;
      if (selectedRole) await completeProfileSetup(user, selectedRole);
    });
  }
  document.getElementById('user-info').textContent = `مرحباً، ${user.displayName || user.email}`;
  document.getElementById('role-title').textContent = 'إعداد الحساب';
  document.getElementById('status-badge').classList.add('hidden');
}

async function completeProfileSetup(user, role) {
  const btn = document.getElementById('complete-setup-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'جارٍ الإعداد...'; }

  try {
    const userData = {
      uid: user.uid, id: user.uid,
      email: user.email,
      fullName: user.displayName || 'مستخدم',
      phone: '', address: '',
      role, status: 'approved'
    };
    if (role === 'organization') userData.organizationId = user.uid;
    await dataApi.save('users', userData);
    await createRoleProfile(user, userData);

    showToast('تم إنشاء الحساب بنجاح!', 'success');
    setTimeout(() => window.location.reload(), 800);
  } catch (error) {
    console.error('Profile setup error:', error);
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    showToast('حدث خطأ أثناء إعداد الحساب.', 'error');
  }
}

function displayDashboard(profile) {
  document.getElementById('user-info').textContent = `مرحباً، ${profile.fullName}`;
  document.getElementById('role-title').textContent = getRoleTitle(profile.role);
  const statusBadge = document.getElementById('status-badge');
  statusBadge.textContent = getStatusText(profile.status);
  statusBadge.className = `status-badge status-${profile.status || 'approved'}`;
  setupSidebar(profile.role);
  document.getElementById('loading-screen').classList.add('hidden');
  showDashboard(profile.role, profile);
}

function showError(message, force = false) {
  if (!authStateResolved && !force) return;
  document.getElementById('loading-screen').classList.add('hidden');
  const mainContent = document.querySelector('.dashboard-main');
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="dashboard-section" style="text-align: center; padding: 3rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
        <h3 style="margin-bottom: 1rem; color: var(--danger-color);">حدث خطأ</h3>
        <p style="margin-bottom: 1.5rem; color: var(--text-light);">${message}</p>
        <div style="display: flex; gap: 1rem; justify-content: center;">
          <button onclick="location.reload()" class="btn btn-primary">تحديث الصفحة</button>
          <a href="/" class="btn btn-outline">العودة للرئيسية</a>
        </div>
      </div>`;
  }
}

function getRoleTitle(role) {
  return { admin: 'لوحة تحكم المشرف', volunteer: 'لوحة تحكم المتطوع', elderly: 'لوحة التحكم الخاصة بي', organization: 'لوحة تحكم المنظمة' }[role] || 'لوحة التحكم';
}

function getStatusText(status) {
  return { pending: 'في الانتظار', approved: 'مفعّل', suspended: 'موقوف' }[status] || status;
}

function setupSidebar(role) {
  const nav = document.getElementById('sidebar-nav');
  const navItems = [];
  switch (role) {
    case 'admin':
      navItems.push({ id: 'overview', text: 'نظرة عامة', icon: '📊' }, { id: 'users', text: 'إدارة المستخدمين', icon: '👥' }, { id: 'requests', text: 'جميع الطلبات', icon: '📋' }, { id: 'stats', text: 'الإحصائيات', icon: '📈' });
      break;
    case 'volunteer':
      navItems.push({ id: 'available', text: 'الطلبات المتاحة', icon: '📖' }, { id: 'my-requests', text: 'طلباتي', icon: '📋' }, { id: 'verification', text: 'حالة الاعتماد', icon: '✓' }, { id: 'profile', text: 'ملفي الشخصي', icon: '👤' });
      break;
    case 'elderly':
      navItems.push({ id: 'request-help', text: 'اطلب المساعدة', icon: '🙏' }, { id: 'my-requests', text: 'طلباتي', icon: '📋' }, { id: 'complaints', text: 'تقديم شكوى', icon: '⚠️' }, { id: 'profile', text: 'ملفي الشخصي', icon: '👤' });
      break;
    case 'organization':
      navItems.push({ id: 'overview', text: 'نظرة عامة', icon: '🏢' }, { id: 'pending-volunteers', text: 'قبول المتطوعين', icon: '✅' }, { id: 'volunteers', text: 'المعتمدون', icon: '👥' }, { id: 'profile', text: 'ملف المنظمة', icon: '👤' });
      break;
  }
  nav.innerHTML = navItems.map((item, index) => `<a href="#${item.id}" data-section="${item.id}" class="${index === 0 ? 'active' : ''}"><span>${item.icon}</span> ${item.text}</a>`).join('');
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateToSection(role, link.dataset.section);
      nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

function navigateToSection(role, sectionId) {
  const dashboard = document.getElementById(`${role}-dashboard`);
  if (!dashboard) return;
  if (role === 'elderly') {
    const quickActions = dashboard.querySelector('.quick-actions');
    const requestsSection = document.getElementById('elderly-my-requests-section');
    const profileSection = document.getElementById('elderly-profile-section');
    const complaintsSection = document.getElementById('elderly-complaints-section');
    if (quickActions) quickActions.classList.add('hidden');
    if (requestsSection) requestsSection.classList.add('hidden');
    if (profileSection) profileSection.classList.add('hidden');
    if (complaintsSection) complaintsSection.classList.add('hidden');
    switch (sectionId) {
      case 'request-help':
        if (quickActions) quickActions.classList.remove('hidden');
        if (requestsSection) requestsSection.classList.remove('hidden');
        break;
      case 'my-requests':
        if (requestsSection) requestsSection.classList.remove('hidden');
        loadElderlyDashboard();
        break;
      case 'profile':
        if (profileSection) profileSection.classList.remove('hidden');
        loadElderlyProfile();
        break;
      case 'complaints':
        if (complaintsSection) complaintsSection.classList.remove('hidden');
        loadMyComplaints();
        break;
    }
  } else if (role === 'volunteer') {
    const verificationSection = document.getElementById('volunteer-verification-section');
    const availableSection = dashboard.querySelectorAll('.dashboard-section')[1];
    const myRequestsSection = dashboard.querySelectorAll('.dashboard-section')[2];
    const profileSection = document.getElementById('volunteer-profile-section');
    if (profileSection) profileSection.classList.add('hidden');
    switch (sectionId) {
      case 'available': availableSection?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'my-requests': myRequestsSection?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'verification': verificationSection?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'profile':
        if (profileSection) profileSection.classList.remove('hidden');
        profileSection?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  } else if (role === 'organization') {
    const map = {
      'overview': dashboard.querySelector('.stats-grid'),
      'pending-volunteers': document.getElementById('org-unverified-list')?.closest('.dashboard-section'),
      'volunteers': document.getElementById('org-volunteers-list')?.closest('.dashboard-section'),
      'profile': dashboard.querySelectorAll('.dashboard-section')[0]
    };
    map[sectionId]?.scrollIntoView({ behavior: 'smooth' });
  } else if (role === 'admin') {
    const map = {
      'overview': dashboard.querySelector('.stats-grid'),
      'users': dashboard.querySelectorAll('.dashboard-section')[0],
      'requests': dashboard.querySelectorAll('.dashboard-section')[1],
      'stats': dashboard.querySelector('.stats-grid')
    };
    map[sectionId]?.scrollIntoView({ behavior: 'smooth' });
  }
}

function loadElderlyProfile() {
  if (userProfile) {
    document.getElementById('elderly-name').value = userProfile.fullName || '';
    document.getElementById('elderly-phone').value = userProfile.phone || '';
    document.getElementById('elderly-address').value = userProfile.address || '';
    document.getElementById('elderly-emergency').value = userProfile.emergencyContact || '';
    document.getElementById('elderly-needs').value = userProfile.specialNeeds || '';
  }
}

function showDashboard(role, profile) {
  document.querySelectorAll('.dashboard-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`${role}-dashboard`)?.classList.remove('hidden');
  switch (role) {
    case 'admin': loadAdminDashboard(); break;
    case 'volunteer': loadVolunteerDashboard(profile); break;
    case 'elderly': loadElderlyDashboard(); break;
    case 'organization': loadOrganizationDashboard(profile); break;
  }
}

async function loadAdminDashboard() {
  try {
    const allUsers = await dataApi.list('users');
    const requests = await dataApi.list('requests');
    const pendingUsers = allUsers.filter(u => u.status === 'pending');
    const volunteers = allUsers.filter(u => u.role === 'volunteer');

    document.getElementById('stat-total-users').textContent = allUsers.length;
    document.getElementById('stat-pending').textContent = pendingUsers.length;
    document.getElementById('stat-volunteers').textContent = volunteers.length;
    document.getElementById('stat-requests').textContent = requests.length;

    displayPendingUsers(pendingUsers);
    displayAllUsers(allUsers);
    loadComplaints();
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
  }
}

function displayAllUsers(users) {
  const container = document.getElementById('all-users-list');
  if (!container) return;
  if (!users.length) { container.innerHTML = '<p class="empty-state">لا يوجد مستخدمون مسجلون</p>'; return; }
  const statusLabel = { approved: 'مفعّل', pending: 'انتظار', rejected: 'مرفوض', suspended: 'موقوف' };
  const statusColor = { approved: '#27ae60', pending: '#f39c12', rejected: '#e74c3c', suspended: '#95a5a6' };
  container.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${user.fullName || 'مستخدم'}</h4>
        <p>${user.email} - ${getRoleArabic(user.role)}</p>
      </div>
      <span style="font-size:0.85rem; font-weight:600; color:${statusColor[user.status] || '#666'}">${statusLabel[user.status] || user.status}</span>
    </div>`).join('');
}

async function loadComplaints() {
  const container = document.getElementById('complaints-list');
  if (!container) return;
  try {
    const complaints = await dataApi.list('complaints');
    displayComplaints(complaints);
  } catch (e) {
    container.innerHTML = '<p class="empty-state">لا توجد شكاوى</p>';
  }
}

function displayComplaints(complaints) {
  const container = document.getElementById('complaints-list');
  if (!container) return;
  if (!complaints.length) { container.innerHTML = '<p class="empty-state">لا توجد شكاوى</p>'; return; }
  const typeLabels = { inappropriate_behavior: 'سلوك غير لائق', no_show: 'عدم الحضور', poor_service: 'خدمة سيئة', safety_concern: 'مخاوف أمنية', other: 'أخرى' };
  const statusLabels = { pending: 'في الانتظار', under_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض' };
  container.innerHTML = complaints.map(comp => `
    <div class="complaint-item status-${comp.status}">
      <div class="complaint-header">
        <span class="complaint-type">${typeLabels[comp.type] || comp.type}</span>
        <span class="complaint-status">${statusLabels[comp.status] || comp.status}</span>
      </div>
      <p class="complaint-description">${comp.description}</p>
      <div class="complaint-meta">
        <span>من: ${comp.reporterName}</span>
        <span>ضد: ${comp.targetName}</span>
        <span>${formatRelativeTime(comp.createdAt)}</span>
      </div>
      ${comp.status === 'pending' || comp.status === 'under_review' ? `
        <div class="complaint-actions">
          <button class="btn btn-small btn-success" onclick="reviewComplaint('${comp.id}', 'resolved')">حل</button>
          <button class="btn btn-small btn-outline" onclick="reviewComplaint('${comp.id}', 'dismissed')">رفض</button>
        </div>` : ''}
    </div>`).join('');
}

async function reviewComplaint(complaintId, status) {
  const adminNotes = prompt('ملاحظات المراجعة (اختياري):') || '';
  try {
    await dataApi.update('complaints', complaintId, { status, adminNotes, reviewedBy: currentUser.uid });
    showToast('تم تحديث الشكوى', 'success');
    loadComplaints();
  } catch (e) { showToast('فشل التحديث', 'error'); }
}

function displayPendingUsers(users) {
  const container = document.getElementById('pending-users-list');
  if (!container) return;
  if (!users.length) { container.innerHTML = '<p class="empty-state">لا توجد طلبات معلقة</p>'; return; }
  container.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${user.fullName}</h4>
        <p>${user.email} - ${getRoleArabic(user.role)}</p>
      </div>
      <div class="user-item-actions">
        <button class="btn btn-success btn-small" onclick="approveUser('${user.uid}')">موافقة</button>
        <button class="btn btn-danger btn-small" onclick="rejectUser('${user.uid}')">رفض</button>
      </div>
    </div>`).join('');
}

function getRoleArabic(role) {
  return { admin: 'مشرف', volunteer: 'متطوع', elderly: 'مستخدم مسن', organization: 'منظمة' }[role] || role;
}

async function approveUser(userId) {
  try {
    await dataApi.update('users', userId, { status: 'approved', approvedBy: currentUser.uid, approvedAt: new Date().toISOString() });
    showToast('تمت الموافقة على المستخدم!', 'success');
    loadAdminDashboard();
  } catch (e) { showToast('فشلت الموافقة', 'error'); }
}

async function rejectUser(userId) {
  const reason = prompt('سبب الرفض (اختياري):');
  try {
    await dataApi.update('users', userId, { status: 'rejected', rejectedBy: currentUser.uid, rejectedAt: new Date().toISOString(), rejectionReason: reason || '' });
    showToast('تم رفض المستخدم', 'success');
    loadAdminDashboard();
  } catch (e) { showToast('فشل الرفض', 'error'); }
}

async function loadVolunteerDashboard(profile) {
  if (profile.status === 'pending') document.getElementById('pending-approval-notice')?.classList.remove('hidden');
  document.getElementById('vol-total-hours').textContent = profile.totalHours || '٠';
  document.getElementById('vol-completed').textContent = profile.completedRequests || '٠';
  document.getElementById('vol-rating').textContent = profile.rating ? profile.rating.toFixed(1) : 'غير متاح';
  document.getElementById('vol-status').textContent = profile.verified ? 'معتمد ✓' : 'غير معتمد';

  displayVolunteerVerificationInfo(profile);
  loadVolunteerProfile(profile);

  try {
    const allRequests = await dataApi.list('requests');
    const available = allRequests.filter(r => r.status === 'pending');
    const mine = allRequests.filter(r => r.volunteerId === currentUser.uid);
    displayAvailableRequests(available);
    displayMyActiveRequests(mine);
  } catch (e) {
    displayAvailableRequests([]);
    displayMyActiveRequests([]);
  }
}

function displayVolunteerVerificationInfo(profile) {
  const verifiedBadge = document.getElementById('vol-verified-badge');
  const orgInfo = document.getElementById('vol-organization-info');
  const notVerifiedNote = document.getElementById('vol-not-verified-note');
  if (profile.verified) {
    verifiedBadge.innerHTML = '<span class="verified-badge">✓ متطوع معتمد</span>';
    notVerifiedNote.classList.add('hidden');
    if (profile.verifiedByOrg) {
      orgInfo.classList.remove('hidden');
      document.getElementById('vol-org-name').textContent = profile.verifiedByOrgName || 'منظمة معتمدة';
      document.getElementById('vol-verified-date').textContent = formatDate(profile.verifiedAt);
    }
  } else {
    verifiedBadge.innerHTML = '<span class="pending-badge">في انتظار الاعتماد</span>';
    orgInfo.classList.add('hidden');
    notVerifiedNote.classList.remove('hidden');
  }
}

function loadVolunteerProfile(profile) {
  const nameInput = document.getElementById('vol-name');
  const phoneInput = document.getElementById('vol-phone');
  const bioInput = document.getElementById('vol-bio');
  if (nameInput) nameInput.value = profile.fullName || '';
  if (phoneInput) phoneInput.value = profile.phone || '';
  if (bioInput) bioInput.value = profile.bio || '';
  if (profile.skills && profile.skills.length) {
    profile.skills.forEach(skill => {
      const checkbox = document.querySelector(`input[name="skills"][value="${skill}"]`);
      if (checkbox) checkbox.checked = true;
    });
  }
  const form = document.getElementById('volunteer-profile-form');
  if (form && !form.hasAttribute('data-bound')) {
    form.setAttribute('data-bound', 'true');
    form.addEventListener('submit', handleVolunteerProfileSubmit);
  }
}

async function handleVolunteerProfileSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const skills = [];
  document.querySelectorAll('input[name="skills"]:checked').forEach(cb => skills.push(cb.value));
  const data = { fullName: formData.get('fullName'), phone: formData.get('phone'), bio: formData.get('bio'), skills };
  try {
    await dataApi.update('volunteer_profiles', currentUser.uid, data);
    await dataApi.update('users', currentUser.uid, { fullName: data.fullName, phone: data.phone });
    if (userProfile) Object.assign(userProfile, data);
    showToast('تم حفظ الملف الشخصي', 'success');
  } catch (e) { showToast('فشل حفظ الملف', 'error'); }
}

function displayAvailableRequests(requests) {
  const container = document.getElementById('available-requests');
  if (!container) return;
  if (!requests.length) { container.innerHTML = '<p class="empty-state">لا توجد طلبات متاحة حالياً</p>'; return; }
  container.innerHTML = requests.map(req => `
    <div class="request-item urgency-${req.urgency}">
      <div class="request-header">
        <span class="request-type">${formatRequestType(req.type)}</span>
        <span class="request-status status-pending-request">${formatUrgency(req.urgency)}</span>
      </div>
      <p class="request-description">${req.description}</p>
      <div class="request-meta">
        <span>من: ${req.elderlyName || 'مجهول'}</span>
        ${req.preferredDate ? `<span>التاريخ المفضل: ${formatDate(req.preferredDate)}</span>` : ''}
      </div>
      <div class="request-actions">
        <button class="btn btn-primary btn-small" onclick="acceptRequest('${req.id}')">قبول الطلب</button>
      </div>
    </div>`).join('');
}

function displayMyActiveRequests(requests) {
  const container = document.getElementById('my-active-requests');
  if (!container) return;
  const active = requests.filter(r => r.status === 'assigned');
  if (!active.length) { container.innerHTML = '<p class="empty-state">لا توجد طلبات نشطة</p>'; return; }
  container.innerHTML = active.map(req => `
    <div class="request-item">
      <div class="request-header">
        <span class="request-type">${formatRequestType(req.type)}</span>
        <span class="request-status status-assigned">قيد التنفيذ</span>
      </div>
      <p class="request-description">${req.description}</p>
      <div class="request-meta"><span>لـ: ${req.elderlyName || 'مجهول'}</span></div>
      <div class="request-actions">
        <button class="btn btn-success btn-small" onclick="completeRequest('${req.id}')">إتمام الطلب</button>
      </div>
    </div>`).join('');
}

async function acceptRequest(requestId) {
  try {
    await dataApi.update('requests', requestId, {
      status: 'assigned',
      volunteerId: currentUser.uid,
      volunteerName: userProfile.fullName || 'متطوع',
      assignedAt: new Date().toISOString()
    });
    showToast('تم قبول الطلب! ✓', 'success');
    loadVolunteerDashboard(userProfile);
  } catch (e) { showToast('فشل قبول الطلب', 'error'); }
}

async function completeRequest(requestId) {
  const hours = prompt('كم ساعة قضيت؟');
  if (!hours) return;
  const h = parseFloat(hours);
  try {
    await dataApi.update('requests', requestId, { status: 'completed', hoursSpent: h, completedAt: new Date().toISOString() });
    let prof;
    try { prof = await dataApi.get('volunteer_profiles', currentUser.uid); } catch { prof = {}; }
    await dataApi.update('volunteer_profiles', currentUser.uid, {
      totalHours: (prof.totalHours || 0) + h,
      completedRequests: (prof.completedRequests || 0) + 1
    });
    showToast('تم إتمام الطلب. شكراً لتطوعك!', 'success');
    loadVolunteerDashboard(userProfile);
  } catch (e) { showToast('فشل إتمام الطلب', 'error'); }
}

async function loadElderlyDashboard() {
  try {
    const all = await dataApi.list('requests');
    const mine = all.filter(r => r.elderlyId === currentUser.uid);
    displayElderlyRequests(mine);
    loadComplaintTargets(mine);
    loadMyComplaints();
    setupComplaintForm();
  } catch (e) {
    displayElderlyRequests([]);
  }
}

function loadComplaintTargets(requests) {
  const select = document.getElementById('complaint-target');
  if (!select) return;
  const volunteers = new Map();
  requests.forEach(req => { if (req.volunteerId && req.volunteerName) volunteers.set(req.volunteerId, req.volunteerName); });
  select.innerHTML = '<option value="">-- اختر المتطوع --</option>';
  volunteers.forEach((name, id) => {
    const option = document.createElement('option');
    option.value = id; option.textContent = name;
    select.appendChild(option);
  });
}

function setupComplaintForm() {
  const form = document.getElementById('complaint-form');
  if (form && !form.hasAttribute('data-initialized')) {
    form.setAttribute('data-initialized', 'true');
    form.addEventListener('submit', handleComplaintSubmit);
  }
}

async function handleComplaintSubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const targetId = formData.get('targetId');
  const targetSelect = document.getElementById('complaint-target');
  const targetName = targetSelect.options[targetSelect.selectedIndex]?.text || '';
  try {
    await dataApi.save('complaints', {
      reporterId: currentUser.uid,
      reporterName: userProfile.fullName || 'مستخدم',
      targetId, targetName,
      type: formData.get('type'),
      description: formData.get('description'),
      status: 'pending'
    });
    showToast('تم إرسال الشكوى. سيقوم المشرف بمراجعتها.', 'success');
    e.target.reset();
    loadMyComplaints();
  } catch (e) { showToast('فشل إرسال الشكوى', 'error'); }
}

async function loadMyComplaints() {
  const container = document.getElementById('my-complaints');
  if (!container) return;
  try {
    const all = await dataApi.list('complaints');
    const mine = all.filter(c => c.reporterId === currentUser.uid);
    displayMyComplaints(mine);
  } catch (e) {
    container.innerHTML = '<h4>شكاواي السابقة</h4><p class="empty-state">لا توجد شكاوى</p>';
  }
}

function displayMyComplaints(complaints) {
  const container = document.getElementById('my-complaints');
  if (!container) return;
  const statusLabels = { pending: 'في الانتظار', under_review: 'قيد المراجعة', resolved: 'تم الحل', dismissed: 'مرفوض' };
  const typeLabels = { inappropriate_behavior: 'سلوك غير لائق', no_show: 'عدم الحضور', poor_service: 'خدمة سيئة', safety_concern: 'مخاوف أمنية', other: 'أخرى' };
  if (!complaints.length) { container.innerHTML = '<h4>شكاواي السابقة</h4><p class="empty-state">لا توجد شكاوى سابقة</p>'; return; }
  container.innerHTML = `<h4>شكاواي السابقة</h4>${complaints.map(comp => `
    <div class="complaint-item status-${comp.status}">
      <div class="complaint-header">
        <span class="complaint-type">${typeLabels[comp.type] || comp.type}</span>
        <span class="complaint-status">${statusLabels[comp.status] || comp.status}</span>
      </div>
      <p class="complaint-description">${comp.description}</p>
      <div class="complaint-meta">
        <span>ضد: ${comp.targetName}</span>
        <span>${formatRelativeTime(comp.createdAt)}</span>
      </div>
      ${comp.adminNotes ? `<p class="admin-notes"><strong>رد المشرف:</strong> ${comp.adminNotes}</p>` : ''}
    </div>`).join('')}`;
}

function displayElderlyRequests(requests) {
  const container = document.getElementById('elderly-requests');
  if (!container) return;
  if (!requests.length) { container.innerHTML = '<p class="empty-state">لم تقم بأي طلبات بعد. انقر أعلاه لطلب المساعدة!</p>'; return; }
  container.innerHTML = requests.map(req => `
    <div class="request-item">
      <div class="request-header">
        <span class="request-type">${formatRequestType(req.type)}</span>
        <span class="request-status status-${req.status === 'pending' ? 'pending-request' : req.status}">${formatStatus(req.status)}</span>
      </div>
      <p class="request-description">${req.description}</p>
      <div class="request-meta">
        <span>تاريخ الإنشاء: ${formatDate(req.createdAt)}</span>
        ${req.volunteerName ? `<span>المتطوع: ${req.volunteerName}</span>` : ''}
      </div>
      ${req.status === 'completed' && !req.rated ? `
        <div class="request-actions">
          <button class="btn btn-primary btn-small" onclick="rateVolunteer('${req.id}')">تقييم المتطوع</button>
        </div>` : ''}
      ${req.status === 'pending' ? `
        <div class="request-actions">
          <button class="btn btn-outline btn-small" onclick="cancelRequest('${req.id}')">إلغاء</button>
        </div>` : ''}
    </div>`).join('');
}

function openRequestModal(type) {
  document.getElementById('request-type').value = type;
  document.getElementById('request-modal').classList.remove('hidden');
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('request-date').min = today;
}

function closeModal() {
  document.getElementById('request-modal').classList.add('hidden');
  document.getElementById('request-form').reset();
}

async function handleCreateRequest(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    type: formData.get('type'),
    description: formData.get('description'),
    urgency: formData.get('urgency'),
    preferredDate: formData.get('preferredDate') || null,
    address: formData.get('address') || '',
    elderlyId: currentUser.uid,
    elderlyName: userProfile.fullName || 'مستخدم',
    status: 'pending',
    volunteerId: null,
    volunteerName: null
  };
  try {
    await dataApi.save('requests', data);
    showToast('تم إرسال طلب المساعدة بنجاح!', 'success');
    closeModal();
    loadElderlyDashboard();
  } catch (err) {
    showToast('فشل إرسال الطلب: ' + err.message, 'error');
  }
}

async function rateVolunteer(requestId) {
  const rating = prompt('قيّم المتطوع (١-٥ نجوم):');
  if (!rating || rating < 1 || rating > 5) { showToast('يرجى إدخال تقييم بين ١ و ٥', 'error'); return; }
  const feedback = prompt('أي ملاحظات؟ (اختياري)');
  try {
    await dataApi.update('requests', requestId, { rating: parseInt(rating), feedback: feedback || '', rated: true, ratedAt: new Date().toISOString() });
    const req = await dataApi.get('requests', requestId);
    if (req.volunteerId) {
      try {
        const vp = await dataApi.get('volunteer_profiles', req.volunteerId);
        const newCount = (vp.ratingCount || 0) + 1;
        const newRating = (((vp.rating || 0) * (vp.ratingCount || 0)) + parseInt(rating)) / newCount;
        await dataApi.update('volunteer_profiles', req.volunteerId, { rating: newRating, ratingCount: newCount });
      } catch {}
    }
    showToast('شكراً على تقييمك!', 'success');
    loadElderlyDashboard();
  } catch (e) { showToast('فشل إرسال التقييم', 'error'); }
}

async function cancelRequest(requestId) {
  if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
  try {
    await dataApi.update('requests', requestId, { status: 'cancelled' });
    showToast('تم إلغاء الطلب', 'success');
    loadElderlyDashboard();
  } catch (e) { showToast('فشل إلغاء الطلب', 'error'); }
}

async function loadOrganizationDashboard(profile) {
  if (profile.status === 'pending') document.getElementById('org-pending-notice')?.classList.remove('hidden');
  document.getElementById('org-name').value = profile.organizationName || '';
  document.getElementById('org-reg').value = profile.registrationNumber || '';
  document.getElementById('org-desc').value = profile.description || '';

  try {
    let org;
    try { org = await dataApi.get('organizations', currentUser.uid); }
    catch { org = await createRoleProfile(currentUser, { ...profile, role: 'organization' }); }
    const verifiedIds = org.verifiedVolunteers || [];

    const allVolunteers = await dataApi.list('volunteer_profiles');
    const verifiedVols = allVolunteers.filter(v => verifiedIds.includes(v.uid));
    const unverifiedVols = allVolunteers.filter(v => !verifiedIds.includes(v.uid));

    document.getElementById('org-verified').textContent = verifiedVols.length;
    document.getElementById('org-pending-verifications').textContent = unverifiedVols.length;
    displayOrgVolunteers(verifiedVols);
    displayUnverifiedVolunteers(unverifiedVols);
  } catch (e) {
    console.error('Org dashboard error:', e);
    document.getElementById('org-verified').textContent = '٠';
    document.getElementById('org-pending-verifications').textContent = '٠';
    displayOrgVolunteers([]);
    displayUnverifiedVolunteers([]);
  }
}

function displayOrgVolunteers(volunteers) {
  const container = document.getElementById('org-volunteers-list');
  if (!container) return;
  if (!volunteers.length) { container.innerHTML = '<p class="empty-state">لا يوجد متطوعون معتمدون</p>'; return; }
  container.innerHTML = volunteers.map(vol => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${vol.fullName}</h4>
        <p>${vol.email} - ${vol.totalHours || 0} ساعة تطوع</p>
      </div>
      <span class="badge badge-success">معتمد ✓</span>
    </div>`).join('');
}

function displayUnverifiedVolunteers(volunteers) {
  const container = document.getElementById('org-unverified-list');
  if (!container) return;
  if (!volunteers.length) { container.innerHTML = '<p class="empty-state">لا يوجد متطوعون في انتظار القبول</p>'; return; }
  container.innerHTML = volunteers.map(vol => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${vol.fullName || 'متطوع'}</h4>
        <p>${vol.email}</p>
      </div>
      <div class="user-item-actions">
        <button class="btn btn-success btn-small" onclick="verifyVolunteerByOrg('${vol.uid}', '${(vol.fullName || '').replace(/'/g, '')}')">قبول ✓</button>
      </div>
    </div>`).join('');
}

async function verifyVolunteerByOrg(volunteerId, volunteerName) {
  try {
    await dataApi.arrayAdd('organizations', currentUser.uid, 'verifiedVolunteers', volunteerId);
    await dataApi.update('volunteer_profiles', volunteerId, {
      verified: true,
      verifiedByOrg: currentUser.uid,
      verifiedByOrgName: userProfile.organizationName || userProfile.fullName,
      verifiedAt: new Date().toISOString()
    });
    showToast(`تم قبول المتطوع ${volunteerName} ✓`, 'success');
    loadOrganizationDashboard(userProfile);
  } catch (e) { showToast('فشل قبول المتطوع', 'error'); }
}

async function handleUpdateOrgProfile(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    organizationName: formData.get('organizationName'),
    registrationNumber: formData.get('registrationNumber'),
    description: formData.get('description')
  };
  try {
    await dataApi.update('organizations', currentUser.uid, data);
    await dataApi.update('users', currentUser.uid, { fullName: data.organizationName });
    if (userProfile) Object.assign(userProfile, data);
    showToast('تم تحديث ملف المنظمة بنجاح!', 'success');
  } catch (e) { showToast('فشل تحديث الملف', 'error'); }
}

async function handleUpdateElderlyProfile(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const data = {
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    emergencyContact: formData.get('emergencyContact'),
    specialNeeds: formData.get('specialNeeds')
  };
  try {
    await dataApi.update('users', currentUser.uid, { fullName: data.fullName, phone: data.phone, address: data.address });
    await dataApi.update('elder_profiles', currentUser.uid, data);
    if (userProfile) Object.assign(userProfile, data);
    showToast('تم حفظ ملفك الشخصي بنجاح!', 'success');
  } catch (e) { showToast('فشل حفظ الملف', 'error'); }
}

async function handleLogout() {
  try {
    await firebase.auth().signOut();
    window.location.href = '/login';
  } catch (e) { showToast('فشل تسجيل الخروج', 'error'); }
}

function formatRequestType(type) {
  return { shopping: 'تسوق 🛒', hospital: 'زيارة مستشفى 🏥', paperwork: 'أوراق رسمية 📄', companionship: 'مرافقة 💬', other: 'أخرى' }[type] || type;
}

function formatUrgency(urgency) {
  return { low: 'غير مستعجل', medium: 'متوسط', high: 'عاجل 🔴' }[urgency] || urgency;
}

function formatStatus(status) {
  return { pending: 'في الانتظار', assigned: 'تم التعيين', completed: 'مكتمل ✓', cancelled: 'ملغي' }[status] || status;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch { return dateStr; }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const diff = new Date() - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}
