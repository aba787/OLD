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
      await loadOrCreateUserProfile(user);
    } else {
      window.location.href = '/login';
    }
  });
  
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('request-form')?.addEventListener('submit', handleCreateRequest);
  document.getElementById('org-profile-form')?.addEventListener('submit', handleUpdateOrgProfile);
}

/**
 * Load or create user profile from Firestore
 */
async function loadOrCreateUserProfile(user) {
  try {
    const db = firebase.firestore();
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      console.log('User document not found, showing role selection');
      showRoleSelectionScreen(user);
      return;
    }
    
    const userData = userDoc.data();
    currentRole = userData.role;
    
    let additionalProfile = null;
    const roleCollection = getRoleCollection(userData.role);
    
    if (roleCollection) {
      const profileId = userData.role === 'organization' ? (userData.organizationId || user.uid) : user.uid;
      try {
        const profileDoc = await db.collection(roleCollection).doc(profileId).get();
        if (profileDoc.exists) {
          additionalProfile = profileDoc.data();
        } else {
          console.log(`Role profile not found in ${roleCollection}, creating...`);
          additionalProfile = await createRoleProfile(db, user, userData);
        }
      } catch (e) {
        console.warn('Could not load role profile:', e);
        additionalProfile = await createRoleProfile(db, user, userData);
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
    console.error('Error loading profile from Firestore:', error);
    showRoleSelectionScreen(user);
  }
}

/**
 * Get the Firestore collection name for a role
 */
function getRoleCollection(role) {
  const collections = {
    'elderly': 'elder_profiles',
    'volunteer': 'volunteer_profiles',
    'organization': 'organizations'
  };
  return collections[role] || null;
}

/**
 * Create role-specific profile
 */
async function createRoleProfile(db, user, userData) {
  const now = new Date().toISOString();
  const role = userData.role;
  let profile = {};
  
  if (role === 'elderly') {
    profile = {
      uid: user.uid,
      fullName: userData.fullName || user.displayName || '',
      phone: userData.phone || '',
      address: userData.address || '',
      emergencyContact: '',
      specialNeeds: '',
      createdAt: now,
      updatedAt: now
    };
    await db.collection('elder_profiles').doc(user.uid).set(profile);
    console.log('Created elder_profiles/' + user.uid);
  } else if (role === 'volunteer') {
    profile = {
      uid: user.uid,
      fullName: userData.fullName || user.displayName || '',
      phone: userData.phone || '',
      address: userData.address || '',
      skills: [],
      availability: {},
      bio: '',
      totalHours: 0,
      completedRequests: 0,
      rating: 0,
      ratingCount: 0,
      verified: false,
      verifiedBy: null,
      createdAt: now,
      updatedAt: now
    };
    await db.collection('volunteer_profiles').doc(user.uid).set(profile);
    console.log('Created volunteer_profiles/' + user.uid);
  } else if (role === 'organization') {
    const orgId = userData.organizationId || user.uid;
    profile = {
      uid: user.uid,
      organizationName: userData.organizationName || userData.fullName || '',
      registrationNumber: userData.registrationNumber || '',
      email: user.email,
      phone: userData.phone || '',
      address: userData.address || '',
      description: '',
      website: '',
      verifiedVolunteers: [],
      createdAt: now,
      updatedAt: now
    };
    await db.collection('organizations').doc(orgId).set(profile);
    console.log('Created organizations/' + orgId);
  }
  
  return profile;
}

/**
 * Show role selection screen for users without profile
 */
function showRoleSelectionScreen(user) {
  document.getElementById('loading-screen').classList.add('hidden');
  
  const mainContent = document.querySelector('.dashboard-main');
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="dashboard-section" style="text-align: center; padding: 2rem;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">👋</div>
        <h3 style="margin-bottom: 1rem; color: var(--primary-color);">مرحباً بك في رعاية!</h3>
        <p style="margin-bottom: 2rem; color: var(--text-light);">
          يرجى اختيار نوع حسابك للمتابعة:
        </p>
        
        <div class="role-selector" style="max-width: 600px; margin: 0 auto 2rem;">
          <label class="role-option" style="cursor: pointer;">
            <input type="radio" name="setup-role" value="elderly" style="display: none;">
            <span class="role-card" style="display: block; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 1rem; transition: all 0.2s;">
              <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">👴</span>
              <span style="font-size: 1.2rem; font-weight: 600; display: block;">مستخدم مسن</span>
              <span style="color: var(--text-light); font-size: 0.9rem;">أحتاج مساعدة في المهام اليومية</span>
            </span>
          </label>
          
          <label class="role-option" style="cursor: pointer;">
            <input type="radio" name="setup-role" value="volunteer" style="display: none;">
            <span class="role-card" style="display: block; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 1rem; transition: all 0.2s;">
              <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🙌</span>
              <span style="font-size: 1.2rem; font-weight: 600; display: block;">متطوع</span>
              <span style="color: var(--text-light); font-size: 0.9rem;">أريد مساعدة الآخرين</span>
            </span>
          </label>
          
          <label class="role-option" style="cursor: pointer;">
            <input type="radio" name="setup-role" value="organization" style="display: none;">
            <span class="role-card" style="display: block; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 1rem; transition: all 0.2s;">
              <span style="font-size: 2.5rem; display: block; margin-bottom: 0.5rem;">🏢</span>
              <span style="font-size: 1.2rem; font-weight: 600; display: block;">منظمة</span>
              <span style="color: var(--text-light); font-size: 0.9rem;">جمعية خيرية أو منظمة غير ربحية</span>
            </span>
          </label>
        </div>
        
        <button id="complete-setup-btn" class="btn btn-primary btn-lg" style="padding: 1rem 3rem; font-size: 1.1rem;" disabled>
          متابعة
        </button>
        
        <div style="margin-top: 2rem;">
          <button onclick="handleLogout()" class="btn btn-outline">تسجيل الخروج</button>
        </div>
      </div>
    `;
    
    const roleOptions = mainContent.querySelectorAll('input[name="setup-role"]');
    const completeBtn = document.getElementById('complete-setup-btn');
    
    roleOptions.forEach(option => {
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
      if (selectedRole) {
        await completeProfileSetup(user, selectedRole);
      }
    });
  }
  
  document.getElementById('user-info').textContent = `مرحباً، ${user.displayName || user.email}`;
  document.getElementById('role-title').textContent = 'إعداد الحساب';
  document.getElementById('status-badge').classList.add('hidden');
}

/**
 * Complete profile setup - Tries backend API first, then client-side Firestore
 */
async function completeProfileSetup(user, role) {
  const btn = document.getElementById('complete-setup-btn');
  const originalText = btn ? btn.textContent : '';
  
  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'جارٍ الإعداد...';
    }
    
    const profileData = {
      email: user.email,
      fullName: user.displayName || 'مستخدم',
      phone: '',
      address: '',
      role
    };
    
    if (role === 'organization') {
      profileData.organizationName = user.displayName || 'منظمة';
      profileData.registrationNumber = '';
    }
    
    let success = false;
    
    // Try backend API first
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(profileData)
      });
      console.log('Profile created via backend API');
      success = true;
    } catch (apiError) {
      console.warn('Backend API failed, trying client-side Firestore:', apiError.message);
      
      // Fallback to client-side Firestore
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        const now = new Date().toISOString();
        const status = role === 'elderly' ? 'approved' : 'pending';
        
        const userData = {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || 'مستخدم',
          phone: '',
          address: '',
          role,
          status,
          createdAt: now,
          updatedAt: now
        };
        
        if (role === 'organization') {
          userData.organizationId = user.uid;
        }
        
        // Write to users collection
        await db.collection('users').doc(user.uid).set(userData);
        console.log('Created users/' + user.uid + ' via client-side Firestore');
        
        // Create role-specific profile
        await createRoleProfileDirect(db, user.uid, role, userData);
        success = true;
      }
    }
    
    if (success) {
      showToast('تم إنشاء الحساب بنجاح!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      throw new Error('Could not create profile');
    }
    
  } catch (error) {
    console.error('Error completing profile setup:', error);
    
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
    
    showToast('حدث خطأ أثناء إعداد الحساب. يرجى المحاولة مرة أخرى.', 'error');
  }
}

/**
 * Create role-specific profile directly in Firestore
 */
async function createRoleProfileDirect(db, uid, role, userData) {
  const now = new Date().toISOString();
  
  if (role === 'elderly') {
    await db.collection('elder_profiles').doc(uid).set({
      uid,
      fullName: userData.fullName || '',
      phone: userData.phone || '',
      address: userData.address || '',
      emergencyContact: '',
      specialNeeds: '',
      createdAt: now,
      updatedAt: now
    });
    console.log('Created elder_profiles/' + uid);
  } else if (role === 'volunteer') {
    await db.collection('volunteer_profiles').doc(uid).set({
      uid,
      fullName: userData.fullName || '',
      phone: userData.phone || '',
      address: userData.address || '',
      skills: [],
      availability: {},
      bio: '',
      totalHours: 0,
      completedRequests: 0,
      rating: 0,
      ratingCount: 0,
      verified: false,
      verifiedBy: null,
      createdAt: now,
      updatedAt: now
    });
    console.log('Created volunteer_profiles/' + uid);
  } else if (role === 'organization') {
    await db.collection('organizations').doc(uid).set({
      uid,
      organizationName: userData.organizationName || userData.fullName || '',
      registrationNumber: '',
      email: userData.email,
      phone: userData.phone || '',
      address: userData.address || '',
      description: '',
      website: '',
      verifiedVolunteers: [],
      createdAt: now,
      updatedAt: now
    });
    console.log('Created organizations/' + uid);
  }
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
        { href: '#hours', text: 'ساعات التطوع', icon: '⏰' },
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
  document.getElementById('vol-status').textContent = profile.verified ? 'معتمد ✓' : 'غير معتمد';
  
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
 * Display organization's verified volunteers
 */
function displayOrgVolunteers(volunteers) {
  const container = document.getElementById('org-volunteers-list');
  
  if (!volunteers.length) {
    container.innerHTML = '<p class="empty-state">لا يوجد متطوعون معتمدون</p>';
    return;
  }
  
  container.innerHTML = volunteers.map(vol => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${vol.fullName}</h4>
        <p>${vol.email} - ${vol.totalHours || 0} ساعة تطوع</p>
      </div>
      <span class="badge badge-success">معتمد ✓</span>
    </div>
  `).join('');
}

/**
 * Handle organization profile update
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
    showToast('تم تحديث ملف المنظمة بنجاح!', 'success');
  } catch (error) {
    showToast('فشل تحديث الملف: ' + error.message, 'error');
  }
}

/**
 * Handle logout - تسجيل الخروج
 */
async function handleLogout() {
  try {
    await firebase.auth().signOut();
    window.location.href = '/login';
  } catch (error) {
    console.error('Logout error:', error);
    showToast('فشل تسجيل الخروج', 'error');
  }
}

/**
 * Format request type - تنسيق نوع الطلب
 */
function formatRequestType(type) {
  const types = {
    shopping: 'تسوق 🛒',
    hospital: 'زيارة مستشفى 🏥',
    paperwork: 'أوراق رسمية 📄',
    companionship: 'مرافقة 💬',
    other: 'أخرى'
  };
  return types[type] || type;
}

/**
 * Format urgency - تنسيق الاستعجال
 */
function formatUrgency(urgency) {
  const levels = {
    low: 'غير مستعجل',
    medium: 'متوسط',
    high: 'عاجل 🔴'
  };
  return levels[urgency] || urgency;
}

/**
 * Format status - تنسيق الحالة
 */
function formatStatus(status) {
  const statuses = {
    pending: 'في الانتظار',
    assigned: 'تم التعيين',
    completed: 'مكتمل ✓',
    cancelled: 'ملغي'
  };
  return statuses[status] || status;
}

/**
 * Format date - تنسيق التاريخ
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateStr;
  }
}
