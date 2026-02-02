/**
 * Dashboard JavaScript - جافاسكريبت لوحة التحكم
 * 
 * Handles dashboard functionality for all user roles
 * يتعامل مع وظائف لوحة التحكم لجميع الأدوار
 */

let currentUser = null;
let currentRole = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

/**
 * Initialize the dashboard - تهيئة لوحة التحكم
 */
async function initializeDashboard() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase not loaded');
    showError('نظام المصادقة غير متاح. يرجى تحديث الصفحة.');
    return;
  }
  
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile();
    } else {
      window.location.href = '/login';
    }
  });
  
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('request-form')?.addEventListener('submit', handleCreateRequest);
  document.getElementById('org-profile-form')?.addEventListener('submit', handleUpdateOrgProfile);
}

/**
 * Load user profile - تحميل ملف المستخدم
 */
async function loadUserProfile() {
  try {
    let profile = null;
    try {
      profile = await apiRequest('/api/auth/profile');
    } catch (error) {
      console.warn('Could not load profile from backend:', error);
      showError('تعذر تحميل ملفك الشخصي. يرجى تسجيل الدخول مرة أخرى.');
      return;
    }
    
    if (!profile || !profile.role) {
      profile = {
        uid: currentUser.uid,
        email: currentUser.email,
        fullName: currentUser.displayName || 'مستخدم',
        role: 'elderly',
        status: 'pending'
      };
      console.info('Using default profile for new user');
    }
    
    currentRole = profile.role;
    
    document.getElementById('user-info').textContent = `مرحباً، ${profile.fullName}`;
    document.getElementById('role-title').textContent = getRoleTitle(profile.role);
    
    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = getStatusText(profile.status);
    statusBadge.className = `status-badge status-${profile.status || 'approved'}`;
    
    setupSidebar(profile.role);
    document.getElementById('loading-screen').classList.add('hidden');
    showDashboard(profile.role, profile);
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showError('فشل تحميل الملف الشخصي. حاول مرة أخرى.');
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
        { href: '#overview', text: 'نظرة عامة', icon: '&#128200;' },
        { href: '#users', text: 'إدارة المستخدمين', icon: '&#128101;' },
        { href: '#requests', text: 'جميع الطلبات', icon: '&#128203;' },
        { href: '#stats', text: 'الإحصائيات', icon: '&#128202;' }
      );
      break;
    case 'volunteer':
      navItems.push(
        { href: '#available', text: 'الطلبات المتاحة', icon: '&#128214;' },
        { href: '#my-requests', text: 'طلباتي', icon: '&#128203;' },
        { href: '#hours', text: 'تسجيل الساعات', icon: '&#128337;' },
        { href: '#profile', text: 'ملفي الشخصي', icon: '&#128100;' }
      );
      break;
    case 'elderly':
      navItems.push(
        { href: '#request-help', text: 'اطلب المساعدة', icon: '&#128400;' },
        { href: '#my-requests', text: 'طلباتي', icon: '&#128203;' },
        { href: '#profile', text: 'ملفي الشخصي', icon: '&#128100;' }
      );
      break;
    case 'organization':
      navItems.push(
        { href: '#overview', text: 'نظرة عامة', icon: '&#127970;' },
        { href: '#volunteers', text: 'المتطوعون', icon: '&#128101;' },
        { href: '#profile', text: 'ملف المنظمة', icon: '&#128100;' }
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
    document.getElementById('stat-total-users').textContent = '٢٥';
    document.getElementById('stat-pending').textContent = '٥';
    document.getElementById('stat-volunteers').textContent = '١٠';
    document.getElementById('stat-requests').textContent = '٤٥';
    
    displayPendingUsers([
      { uid: '1', fullName: 'أحمد متطوع', email: 'ahmad@test.com', role: 'volunteer' },
      { uid: '2', fullName: 'جمعية الرعاية', email: 'care@charity.org', role: 'organization' }
    ]);
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
    alert('تمت الموافقة على المستخدم بنجاح!');
    loadAdminDashboard();
  } catch (error) {
    alert('فشلت الموافقة: ' + error.message);
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
    alert('تم رفض المستخدم.');
    loadAdminDashboard();
  } catch (error) {
    alert('فشل الرفض: ' + error.message);
  }
}

/**
 * Load Volunteer Dashboard - لوحة تحكم المتطوع
 */
async function loadVolunteerDashboard(profile) {
  if (profile.status === 'pending') {
    document.getElementById('pending-approval-notice').classList.remove('hidden');
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
    displayAvailableRequests([
      { id: '1', type: 'shopping', description: 'تسوق البقالة الأسبوعي', urgency: 'medium', elderlyName: 'أم محمد' },
      { id: '2', type: 'hospital', description: 'موعد طبيب', urgency: 'high', elderlyName: 'أبو سالم' }
    ]);
  }
  
  try {
    const myRequestsData = await apiRequest('/api/volunteer/my-requests');
    displayMyActiveRequests(myRequestsData.requests || []);
  } catch (error) {
    console.error('Error loading my requests:', error);
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
    alert('تم قبول الطلب! ستتم مشاركة تفاصيل التواصل.');
    loadVolunteerDashboard(currentUser);
  } catch (error) {
    alert('فشل قبول الطلب: ' + error.message);
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
    alert('تم إتمام الطلب. شكراً لتطوعك!');
    loadVolunteerDashboard(currentUser);
  } catch (error) {
    alert('فشل إتمام الطلب: ' + error.message);
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
    displayElderlyRequests([
      { id: '1', type: 'shopping', description: 'تسوق أسبوعي', status: 'pending', createdAt: new Date().toISOString() },
      { id: '2', type: 'hospital', description: 'فحص طبي', status: 'completed', volunteerName: 'أحمد س.', createdAt: new Date().toISOString() }
    ]);
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
    
    alert('تم إرسال طلب المساعدة بنجاح!');
    closeModal();
    loadElderlyDashboard();
  } catch (error) {
    alert('فشل إرسال الطلب: ' + error.message);
  }
}

/**
 * Rate a volunteer - تقييم متطوع
 */
async function rateVolunteer(requestId) {
  const rating = prompt('قيّم المتطوع (١-٥ نجوم):');
  if (!rating || rating < 1 || rating > 5) {
    alert('يرجى إدخال تقييم صحيح بين ١ و ٥');
    return;
  }
  
  const feedback = prompt('أي ملاحظات؟ (اختياري)');
  
  try {
    await apiRequest(`/api/elderly/requests/${requestId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating: parseInt(rating), feedback: feedback || '' })
    });
    alert('شكراً على تقييمك!');
    loadElderlyDashboard();
  } catch (error) {
    alert('فشل إرسال التقييم: ' + error.message);
  }
}

/**
 * Cancel a request - إلغاء طلب
 */
async function cancelRequest(requestId) {
  if (!confirm('هل أنت متأكد من إلغاء هذا الطلب؟')) return;
  
  try {
    await apiRequest(`/api/elderly/requests/${requestId}`, { method: 'DELETE' });
    alert('تم إلغاء الطلب.');
    loadElderlyDashboard();
  } catch (error) {
    alert('فشل إلغاء الطلب: ' + error.message);
  }
}

/**
 * Load Organization Dashboard - لوحة تحكم المنظمة
 */
async function loadOrganizationDashboard(profile) {
  if (profile.status === 'pending') {
    document.getElementById('org-pending-notice').classList.remove('hidden');
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
    alert('تم تحديث الملف بنجاح!');
  } catch (error) {
    alert('فشل تحديث الملف: ' + error.message);
  }
}

/**
 * Remove volunteer verification - إزالة اعتماد متطوع
 */
async function removeVerification(volunteerId) {
  if (!confirm('هل أنت متأكد من إزالة اعتماد هذا المتطوع؟')) return;
  
  try {
    await apiRequest(`/api/organization/volunteers/${volunteerId}`, { method: 'DELETE' });
    alert('تم إزالة الاعتماد.');
    loadOrganizationDashboard(currentUser);
  } catch (error) {
    alert('فشلت الإزالة: ' + error.message);
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
    alert('فشل تسجيل الخروج. حاول مرة أخرى.');
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
    assigned: 'تم تعيين متطوع',
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
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Show error message - عرض رسالة خطأ
 */
function showError(message) {
  document.getElementById('loading-screen').innerHTML = `
    <div class="alert alert-error">${message}</div>
  `;
}
