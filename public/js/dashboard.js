/**
 * Dashboard JavaScript - جافاسكريبت لوحة التحكم
 * 
 * Handles dashboard functionality for all user roles
 * يتعامل مع وظائف لوحة التحكم لجميع الأدوار
 */

let currentUser = null;
let currentRole = null;
let userProfile = null;
let authStateResolved = false;

document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

/**
 * Initialize the dashboard - تهيئة لوحة التحكم
 */
async function initializeDashboard() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase not loaded');
    showError('نظام المصادقة غير متاح. يرجى تحديث الصفحة.', true);
    return;
  }
  
  firebase.auth().onAuthStateChanged(async (user) => {
    authStateResolved = true;
    
    if (user) {
      currentUser = user;
      await loadUserProfileFromFirestore(user.uid);
    } else {
      window.location.href = '/login';
    }
  });
  
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('request-form')?.addEventListener('submit', handleCreateRequest);
  document.getElementById('org-profile-form')?.addEventListener('submit', handleUpdateOrgProfile);
}

/**
 * Load user profile from Firestore - تحميل ملف المستخدم من Firestore
 */
async function loadUserProfileFromFirestore(uid) {
  try {
    const db = firebase.firestore();
    
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      showProfileSetupMessage();
      return;
    }
    
    const userData = userDoc.data();
    currentRole = userData.role;
    
    let additionalProfile = null;
    
    if (userData.role === 'volunteer') {
      try {
        const volDoc = await db.collection('volunteer_profiles').doc(uid).get();
        if (volDoc.exists) {
          additionalProfile = volDoc.data();
        }
      } catch (e) {
        console.warn('Could not load volunteer profile:', e);
      }
    } else if (userData.role === 'organization' && userData.organizationId) {
      try {
        const orgDoc = await db.collection('organizations').doc(userData.organizationId).get();
        if (orgDoc.exists) {
          additionalProfile = orgDoc.data();
        }
      } catch (e) {
        console.warn('Could not load organization profile:', e);
      }
    }
    
    userProfile = {
      uid: uid,
      email: currentUser.email,
      fullName: userData.fullName || currentUser.displayName || 'مستخدم',
      role: userData.role,
      status: userData.status || 'approved',
      phone: userData.phone || '',
      address: userData.address || '',
      ...additionalProfile
    };
    
    displayDashboard(userProfile);
    
  } catch (error) {
    console.error('Error loading profile from Firestore:', error);
    
    try {
      await loadUserProfileFromBackend();
    } catch (backendError) {
      console.error('Backend fallback also failed:', backendError);
      showProfileSetupMessage();
    }
  }
}

/**
 * Fallback: Load user profile from backend API
 */
async function loadUserProfileFromBackend() {
  const profile = await apiRequest('/api/auth/profile');
  
  if (!profile || !profile.role) {
    showProfileSetupMessage();
    return;
  }
  
  currentRole = profile.role;
  userProfile = {
    uid: currentUser.uid,
    email: currentUser.email,
    fullName: profile.fullName || currentUser.displayName || 'مستخدم',
    role: profile.role,
    status: profile.status || 'approved',
    ...profile
  };
  
  displayDashboard(userProfile);
}

/**
 * Show profile setup message instead of logging out
 */
function showProfileSetupMessage() {
  document.getElementById('loading-screen').classList.add('hidden');
  
  const mainContent = document.querySelector('.dashboard-main');
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="dashboard-section" style="text-align: center; padding: 3rem;">
        <div style="font-size: 4rem; margin-bottom: 1rem;">👤</div>
        <h3 style="margin-bottom: 1rem; color: var(--primary-color);">مرحباً بك في رعاية!</h3>
        <p style="margin-bottom: 1.5rem; color: var(--text-light);">
          يبدو أن ملفك الشخصي غير مكتمل أو لم يتم إنشاؤه بعد.
          <br>
          يرجى التواصل مع المشرف أو إعادة التسجيل.
        </p>
        <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
          <a href="/register" class="btn btn-primary">إنشاء حساب جديد</a>
          <button onclick="handleLogout()" class="btn btn-outline">تسجيل الخروج</button>
        </div>
      </div>
    `;
  }
  
  document.getElementById('user-info').textContent = `مرحباً، ${currentUser.displayName || currentUser.email}`;
  document.getElementById('role-title').textContent = 'إعداد الحساب';
  document.getElementById('status-badge').classList.add('hidden');
}

/**
 * Display the dashboard with loaded profile
 */
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

/**
 * Show error message
 */
function showError(message, force = false) {
  if (!authStateResolved && !force) {
    return;
  }
  
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
      </div>
    `;
  }
}

/**
 * Get role display title - عناوين الأدوار
 */
function getRoleTitle(role) {
  const titles = {
    admin: 'لوحة تحكم المشرف',
    volunteer: 'لوحة تحكم المتطوع',
    elderly: 'لوحة التحكم الخاصة بي',
    organization: 'لوحة تحكم المنظمة'
  };
  return titles[role] || 'لوحة التحكم';
}

/**
 * Get status text - نص الحالة
 */
function getStatusText(status) {
  const statuses = {
    pending: 'في الانتظار',
    approved: 'مفعّل',
    suspended: 'موقوف'
  };
  return statuses[status] || status;
}

/**
 * Setup sidebar navigation - إعداد القائمة الجانبية
 */
function setupSidebar(role) {
  const nav = document.getElementById('sidebar-nav');
  const navItems = [];
  
  switch (role) {
    case 'admin':
      navItems.push(
        { href: '#overview', text: 'نظرة عامة', icon: '📊' },
        { href: '#users', text: 'إدارة المستخدمين', icon: '👥' },
        { href: '#requests', text: 'جميع الطلبات', icon: '📋' },
        { href: '#stats', text: 'الإحصائيات', icon: '📈' }
      );
      break;
    case 'volunteer':
      navItems.push(
        { href: '#available', text: 'الطلبات المتاحة', icon: '📖' },
        { href: '#my-requests', text: 'طلباتي', icon: '📋' },
        { href: '#hours', text: 'تسجيل الساعات', icon: '⏰' },
        { href: '#profile', text: 'ملفي الشخصي', icon: '👤' }
      );
      break;
    case 'elderly':
      navItems.push(
        { href: '#request-help', text: 'اطلب المساعدة', icon: '🙏' },
        { href: '#my-requests', text: 'طلباتي', icon: '📋' },
        { href: '#profile', text: 'ملفي الشخصي', icon: '👤' }
      );
      break;
    case 'organization':
      navItems.push(
        { href: '#overview', text: 'نظرة عامة', icon: '🏢' },
        { href: '#volunteers', text: 'المتطوعون', icon: '👥' },
        { href: '#profile', text: 'ملف المنظمة', icon: '👤' }
      );
      break;
  }
  
  nav.innerHTML = navItems.map(item => 
    `<a href="${item.href}"><span>${item.icon}</span> ${item.text}</a>`
  ).join('');
}

/**
 * Show the appropriate dashboard - عرض لوحة التحكم المناسبة
 */
function showDashboard(role, profile) {
  document.querySelectorAll('.dashboard-content').forEach(el => {
    el.classList.add('hidden');
  });
  
  const dashboardId = `${role}-dashboard`;
  const dashboard = document.getElementById(dashboardId);
  if (dashboard) {
    dashboard.classList.remove('hidden');
  }
  
  switch (role) {
    case 'admin':
      loadAdminDashboard();
      break;
    case 'volunteer':
      loadVolunteerDashboard(profile);
      break;
    case 'elderly':
      loadElderlyDashboard();
      break;
    case 'organization':
      loadOrganizationDashboard(profile);
      break;
  }
}

/**
 * Load Admin Dashboard - لوحة تحكم المشرف
 */
async function loadAdminDashboard() {
  try {
    const stats = await apiRequest('/api/admin/stats');
    
    document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-pending').textContent = stats.pendingApprovals || 0;
    document.getElementById('stat-volunteers').textContent = stats.totalVolunteers || 0;
    document.getElementById('stat-requests').textContent = stats.totalRequests || 0;
    
    const pendingData = await apiRequest('/api/admin/users/pending');
    displayPendingUsers(pendingData.users || []);
    
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    document.getElementById('stat-total-users').textContent = '٠';
    document.getElementById('stat-pending').textContent = '٠';
    document.getElementById('stat-volunteers').textContent = '٠';
    document.getElementById('stat-requests').textContent = '٠';
    
    displayPendingUsers([]);
  }
}

/**
 * Display pending users - عرض المستخدمين المعلقين
 */
function displayPendingUsers(users) {
  const container = document.getElementById('pending-users-list');
  
  if (!users.length) {
    container.innerHTML = '<p class="empty-state">لا توجد طلبات معلقة</p>';
    return;
  }
  
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
    </div>
  `).join('');
}

/**
 * Get Arabic role name - اسم الدور بالعربية
 */
function getRoleArabic(role) {
  const roles = {
    admin: 'مشرف',
    volunteer: 'متطوع',
    elderly: 'مستخدم مسن',
    organization: 'منظمة'
  };
  return roles[role] || role;
}

/**
 * Approve a user - الموافقة على مستخدم
 */
async function approveUser(userId) {
  try {
    await apiRequest(`/api/admin/users/${userId}/approve`, { method: 'PUT' });
    showToast('تمت الموافقة على المستخدم بنجاح!', 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast('فشلت الموافقة: ' + error.message, 'error');
  }
}

/**
 * Reject a user - رفض مستخدم
 */
async function rejectUser(userId) {
  const reason = prompt('أدخل سبب الرفض (اختياري):');
  try {
    await apiRequest(`/api/admin/users/${userId}/reject`, { 
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
    showToast('تم رفض المستخدم.', 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast('فشل الرفض: ' + error.message, 'error');
  }
}

/**
 * Load Volunteer Dashboard - لوحة تحكم المتطوع
 */
async function loadVolunteerDashboard(profile) {
  if (profile.status === 'pending') {
    document.getElementById('pending-approval-notice')?.classList.remove('hidden');
  }
  
  document.getElementById('vol-total-hours').textContent = profile.totalHours || '٠';
  document.getElementById('vol-completed').textContent = profile.completedRequests || '٠';
  document.getElementById('vol-rating').textContent = profile.rating ? profile.rating.toFixed(1) : 'غير متاح';
  document.getElementById('vol-status').textContent = profile.verified ? 'معتمد' : 'غير معتمد';
  
  try {
    const requestsData = await apiRequest('/api/volunteer/requests');
    displayAvailableRequests(requestsData.requests || []);
  } catch (error) {
    console.error('Error loading requests:', error);
    displayAvailableRequests([]);
  }
  
  try {
    const myRequestsData = await apiRequest('/api/volunteer/my-requests');
    displayMyActiveRequests(myRequestsData.requests || []);
  } catch (error) {
    console.error('Error loading my requests:', error);
    displayMyActiveRequests([]);
  }
}

/**
 * Display available requests - عرض الطلبات المتاحة
 */
function displayAvailableRequests(requests) {
  const container = document.getElementById('available-requests');
  
  if (!requests.length) {
    container.innerHTML = '<p class="empty-state">لا توجد طلبات متاحة حالياً</p>';
    return;
  }
  
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
    </div>
  `).join('');
}

/**
 * Display my active requests - عرض طلباتي النشطة
 */
function displayMyActiveRequests(requests) {
  const container = document.getElementById('my-active-requests');
  
  const activeRequests = requests.filter(r => r.status === 'assigned');
  
  if (!activeRequests.length) {
    container.innerHTML = '<p class="empty-state">لا توجد طلبات نشطة</p>';
    return;
  }
  
  container.innerHTML = activeRequests.map(req => `
    <div class="request-item">
      <div class="request-header">
        <span class="request-type">${formatRequestType(req.type)}</span>
        <span class="request-status status-assigned">قيد التنفيذ</span>
      </div>
      <p class="request-description">${req.description}</p>
      <div class="request-meta">
        <span>لـ: ${req.elderlyName || 'مجهول'}</span>
      </div>
      <div class="request-actions">
        <button class="btn btn-success btn-small" onclick="completeRequest('${req.id}')">إتمام الطلب</button>
      </div>
    </div>
  `).join('');
}

/**
 * Accept a request - قبول طلب
 */
async function acceptRequest(requestId) {
  try {
    await apiRequest(`/api/volunteer/requests/${requestId}/accept`, { method: 'POST' });
    showToast('تم قبول الطلب! ستتم مشاركة تفاصيل التواصل.', 'success');
    loadVolunteerDashboard(userProfile);
  } catch (error) {
    showToast('فشل قبول الطلب: ' + error.message, 'error');
  }
}

/**
 * Complete a request - إتمام طلب
 */
async function completeRequest(requestId) {
  const hours = prompt('كم ساعة قضيت؟');
  if (!hours) return;
  
  try {
    await apiRequest(`/api/volunteer/requests/${requestId}/complete`, { 
      method: 'POST',
      body: JSON.stringify({ hoursSpent: parseFloat(hours), notes: '' })
    });
    showToast('تم إتمام الطلب. شكراً لتطوعك!', 'success');
    loadVolunteerDashboard(userProfile);
  } catch (error) {
    showToast('فشل إتمام الطلب: ' + error.message, 'error');
  }
}

/**
 * Load Elderly Dashboard - لوحة تحكم كبار السن
 */
async function loadElderlyDashboard() {
  try {
    const requestsData = await apiRequest('/api/elderly/requests');
    displayElderlyRequests(requestsData.requests || []);
  } catch (error) {
    console.error('Error loading requests:', error);
    displayElderlyRequests([]);
  }
}

/**
 * Display elderly user's requests - عرض طلبات المستخدم المسن
 */
function displayElderlyRequests(requests) {
  const container = document.getElementById('elderly-requests');
  
  if (!requests.length) {
    container.innerHTML = '<p class="empty-state">لم تقم بأي طلبات بعد. انقر أعلاه لطلب المساعدة!</p>';
    return;
  }
  
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
        </div>
      ` : ''}
      ${req.status === 'pending' ? `
        <div class="request-actions">
          <button class="btn btn-outline btn-small" onclick="cancelRequest('${req.id}')">إلغاء</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

/**
 * Open request modal - فتح نافذة الطلب
 */
function openRequestModal(type) {
  document.getElementById('request-type').value = type;
  document.getElementById('request-modal').classList.remove('hidden');
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('request-date').min = today;
}

/**
 * Close modal - إغلاق النافذة
 */
function closeModal() {
  document.getElementById('request-modal').classList.add('hidden');
  document.getElementById('request-form').reset();
}

/**
 * Handle create request - إنشاء طلب جديد
 */
async function handleCreateRequest(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    type: formData.get('type'),
    description: formData.get('description'),
    urgency: formData.get('urgency'),
    preferredDate: formData.get('preferredDate') || null,
    address: formData.get('address') || ''
  };
  
  try {
    await apiRequest('/api/elderly/requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    showToast('تم إرسال طلب المساعدة بنجاح!', 'success');
    closeModal();
    loadElderlyDashboard();
  } catch (error) {
    showToast('فشل إرسال الطلب: ' + error.message, 'error');
  }
}

/**
 * Rate a volunteer - تقييم متطوع
 */
async function rateVolunteer(requestId) {
  const rating = prompt('قيّم المتطوع (١-٥ نجوم):');
  if (!rating || rating < 1 || rating > 5) {
    showToast('يرجى إدخال تقييم صحيح بين ١ و ٥', 'error');
    return;
  }
  
  const feedback = prompt('أي ملاحظات؟ (اختياري)');
  
  try {
    await apiRequest(`/api/elderly/requests/${requestId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating: parseInt(rating), feedback: feedback || '' })
    });
    showToast('شكراً على تقييمك!', 'success');
    loadElderlyDashboard();
  } catch (error) {
    showToast('فشل إرسال التقييم: ' + error.message, 'error');
  }
}

/**
 * Cancel a request - إلغاء طلب
 */
async function cancelRequest(requestId) {
  if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
  
  try {
    await apiRequest(`/api/elderly/requests/${requestId}`, { method: 'DELETE' });
    showToast('تم إلغاء الطلب.', 'success');
    loadElderlyDashboard();
  } catch (error) {
    showToast('فشل إلغاء الطلب: ' + error.message, 'error');
  }
}

/**
 * Load Organization Dashboard - لوحة تحكم المنظمة
 */
async function loadOrganizationDashboard(profile) {
  if (profile.status === 'pending') {
    document.getElementById('org-pending-notice')?.classList.remove('hidden');
  }
  
  document.getElementById('org-name').value = profile.organizationName || '';
  document.getElementById('org-reg').value = profile.registrationNumber || '';
  document.getElementById('org-desc').value = profile.description || '';
  
  try {
    const volunteersData = await apiRequest('/api/organization/volunteers');
    document.getElementById('org-verified').textContent = volunteersData.count || 0;
    displayOrgVolunteers(volunteersData.volunteers || []);
  } catch (error) {
    console.error('Error loading volunteers:', error);
    document.getElementById('org-verified').textContent = '٠';
    displayOrgVolunteers([]);
  }
  
  try {
    const pendingData = await apiRequest('/api/organization/volunteers/pending');
    document.getElementById('org-pending-verifications').textContent = pendingData.count || 0;
  } catch (error) {
    document.getElementById('org-pending-verifications').textContent = '٠';
  }
}

/**
 * Display organization's volunteers - عرض متطوعي المنظمة
 */
function displayOrgVolunteers(volunteers) {
  const container = document.getElementById('org-volunteers-list');
  
  if (!volunteers.length) {
    container.innerHTML = '<p class="empty-state">لا يوجد متطوعون معتمدون بعد</p>';
    return;
  }
  
  container.innerHTML = volunteers.map(vol => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${vol.fullName}</h4>
        <p>${vol.email}</p>
      </div>
      <div class="user-item-actions">
        <button class="btn btn-outline btn-small" onclick="removeVerification('${vol.uid}')">إزالة</button>
      </div>
    </div>
  `).join('');
}

/**
 * Handle organization profile update - تحديث ملف المنظمة
 */
async function handleUpdateOrgProfile(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    organizationName: formData.get('organizationName'),
    registrationNumber: formData.get('registrationNumber'),
    description: formData.get('description')
  };
  
  try {
    await apiRequest('/api/organization/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    showToast('تم تحديث الملف بنجاح!', 'success');
  } catch (error) {
    showToast('فشل تحديث الملف: ' + error.message, 'error');
  }
}

/**
 * Remove volunteer verification - إزالة اعتماد متطوع
 */
async function removeVerification(volunteerId) {
  if (!confirm('هل أنت متأكد من إزالة اعتماد هذا المتطوع؟')) return;
  
  try {
    await apiRequest(`/api/organization/volunteers/${volunteerId}`, { method: 'DELETE' });
    showToast('تم إزالة الاعتماد.', 'success');
    loadOrganizationDashboard(userProfile);
  } catch (error) {
    showToast('فشلت الإزالة: ' + error.message, 'error');
  }
}

/**
 * Handle logout - تسجيل الخروج
 */
async function handleLogout() {
  try {
    await firebase.auth().signOut();
    
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Backend logout failed:', error);
    }
    
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    showToast('فشل تسجيل الخروج. حاول مرة أخرى.', 'error');
  }
}

/**
 * Format request type - تنسيق نوع الطلب
 */
function formatRequestType(type) {
  const types = {
    shopping: 'مساعدة التسوق',
    hospital: 'زيارة المستشفى',
    paperwork: 'مساعدة الأوراق',
    companionship: 'المرافقة',
    other: 'أخرى'
  };
  return types[type] || type;
}

/**
 * Format urgency - تنسيق الاستعجال
 */
function formatUrgency(urgency) {
  const urgencies = {
    low: 'منخفض',
    medium: 'متوسط',
    high: 'عاجل'
  };
  return urgencies[urgency] || urgency;
}

/**
 * Format status - تنسيق الحالة
 */
function formatStatus(status) {
  const statuses = {
    pending: 'في الانتظار',
    assigned: 'قيد التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغي'
  };
  return statuses[status] || status;
}

/**
 * Format date - تنسيق التاريخ
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
  } else {
    alert(message);
  }
}
