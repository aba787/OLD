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
  document.getElementById('elderly-profile-form')?.addEventListener('submit', handleUpdateElderlyProfile);
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
 * Create role-specific profile - direct Firestore write
 * This is called when user document exists but role profile is missing
 */
async function createRoleProfile(db, user, userData) {
  const now = new Date().toISOString();
  const role = userData.role;
  let profile = {};
  
  // Direct Firestore write - rules should allow authenticated users to write their own profile
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
        const status = 'approved';
        
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
        { id: 'overview', text: 'نظرة عامة', icon: '📊' },
        { id: 'users', text: 'إدارة المستخدمين', icon: '👥' },
        { id: 'requests', text: 'جميع الطلبات', icon: '📋' },
        { id: 'stats', text: 'الإحصائيات', icon: '📈' }
      );
      break;
    case 'volunteer':
      navItems.push(
        { id: 'available', text: 'الطلبات المتاحة', icon: '📖' },
        { id: 'my-requests', text: 'طلباتي', icon: '📋' },
        { id: 'verification', text: 'حالة الاعتماد', icon: '✓' },
        { id: 'profile', text: 'ملفي الشخصي', icon: '👤' }
      );
      break;
    case 'elderly':
      navItems.push(
        { id: 'request-help', text: 'اطلب المساعدة', icon: '🙏' },
        { id: 'my-requests', text: 'طلباتي', icon: '📋' },
        { id: 'complaints', text: 'تقديم شكوى', icon: '⚠️' },
        { id: 'profile', text: 'ملفي الشخصي', icon: '👤' }
      );
      break;
    case 'organization':
      navItems.push(
        { id: 'overview', text: 'نظرة عامة', icon: '🏢' },
        { id: 'pending-volunteers', text: 'قبول المتطوعين', icon: '✅' },
        { id: 'volunteers', text: 'المعتمدون', icon: '👥' },
        { id: 'profile', text: 'ملف المنظمة', icon: '👤' }
      );
      break;
  }
  
  nav.innerHTML = navItems.map((item, index) => 
    `<a href="#${item.id}" data-section="${item.id}" class="${index === 0 ? 'active' : ''}"><span>${item.icon}</span> ${item.text}</a>`
  ).join('');
  
  // Add click handlers for navigation
  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sectionId = link.dataset.section;
      navigateToSection(role, sectionId);
      
      // Update active state
      nav.querySelectorAll('a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    });
  });
}

/**
 * Navigate to a section within the dashboard
 */
function navigateToSection(role, sectionId) {
  // Get the dashboard container for the current role
  const dashboard = document.getElementById(`${role}-dashboard`);
  if (!dashboard) return;
  
  // Get all sections in this dashboard
  const allSections = dashboard.querySelectorAll('.dashboard-section, .quick-actions, .stats-grid, .notice');
  
  if (role === 'elderly') {
    const quickActions = dashboard.querySelector('.quick-actions');
    const requestsSection = document.getElementById('elderly-my-requests-section');
    const profileSection = document.getElementById('elderly-profile-section');
    const complaintsSection = document.getElementById('elderly-complaints-section');
    
    // Hide all sections by default
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
    
    // Hide profile section by default
    if (profileSection) profileSection.classList.add('hidden');
    
    switch (sectionId) {
      case 'available':
        if (availableSection) availableSection.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'my-requests':
        if (myRequestsSection) myRequestsSection.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'verification':
        if (verificationSection) verificationSection.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'profile':
        if (profileSection) profileSection.classList.remove('hidden');
        profileSection.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  } else if (role === 'organization') {
    const sectionsMap = {
      'overview': dashboard.querySelector('.stats-grid'),
      'pending-volunteers': document.getElementById('org-unverified-list')?.closest('.dashboard-section'),
      'volunteers': document.getElementById('org-volunteers-list')?.closest('.dashboard-section'),
      'profile': dashboard.querySelectorAll('.dashboard-section')[0]
    };
    
    const targetSection = sectionsMap[sectionId];
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  } else if (role === 'admin') {
    const sectionsMap = {
      'overview': dashboard.querySelector('.stats-grid'),
      'users': dashboard.querySelectorAll('.dashboard-section')[0],
      'requests': dashboard.querySelectorAll('.dashboard-section')[1],
      'stats': dashboard.querySelector('.stats-grid')
    };
    
    const targetSection = sectionsMap[sectionId];
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/**
 * Load elderly profile into form
 */
function loadElderlyProfile() {
  if (userProfile) {
    document.getElementById('elderly-name').value = userProfile.fullName || '';
    document.getElementById('elderly-phone').value = userProfile.phone || '';
    document.getElementById('elderly-address').value = userProfile.address || '';
    document.getElementById('elderly-emergency').value = userProfile.emergencyContact || '';
    document.getElementById('elderly-needs').value = userProfile.specialNeeds || '';
  }
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
    const db = firebase.firestore();

    const usersSnap = await db.collection('users').get();
    const allUsers = [];
    usersSnap.forEach(doc => allUsers.push(doc.data()));

    const pendingUsers = allUsers.filter(u => u.status === 'pending');
    const volunteers = allUsers.filter(u => u.role === 'volunteer');

    let totalRequests = 0;
    try {
      const reqSnap = await db.collection('requests').get();
      totalRequests = reqSnap.size;
    } catch (e) {}

    document.getElementById('stat-total-users').textContent = allUsers.length;
    document.getElementById('stat-pending').textContent = pendingUsers.length;
    document.getElementById('stat-volunteers').textContent = volunteers.length;
    document.getElementById('stat-requests').textContent = totalRequests;

    displayPendingUsers(pendingUsers);
    displayAllUsers(allUsers);
    loadActivityLogs();
    loadComplaints();

  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    document.getElementById('stat-total-users').textContent = '٠';
    document.getElementById('stat-pending').textContent = '٠';
    document.getElementById('stat-volunteers').textContent = '٠';
    document.getElementById('stat-requests').textContent = '٠';
    displayPendingUsers([]);
    displayAllUsers([]);
  }
}

function displayAllUsers(users) {
  const container = document.getElementById('all-users-list');
  if (!container) return;

  if (!users.length) {
    container.innerHTML = '<p class="empty-state">لا يوجد مستخدمون مسجلون</p>';
    return;
  }

  const statusLabel = { approved: 'مفعّل', pending: 'انتظار', rejected: 'مرفوض', suspended: 'موقوف' };
  const statusColor = { approved: '#27ae60', pending: '#f39c12', rejected: '#e74c3c', suspended: '#95a5a6' };

  container.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${user.fullName || 'مستخدم'}</h4>
        <p>${user.email} - ${getRoleArabic(user.role)}</p>
      </div>
      <span style="font-size:0.85rem; font-weight:600; color:${statusColor[user.status] || '#666'}">
        ${statusLabel[user.status] || user.status}
      </span>
    </div>
  `).join('');
}

async function loadActivityLogs() {
  const filter = document.getElementById('activity-filter')?.value || '';
  const container = document.getElementById('recent-activity');
  
  try {
    const url = filter ? `/api/admin/activity-logs?action=${filter}` : '/api/admin/activity-logs';
    const data = await apiRequest(url);
    displayActivityLogs(data.logs || []);
  } catch (error) {
    console.error('Error loading activity logs:', error);
    container.innerHTML = '<p class="empty-state">فشل تحميل سجل الأنشطة</p>';
  }
}

function displayActivityLogs(logs) {
  const container = document.getElementById('recent-activity');
  
  if (!logs.length) {
    container.innerHTML = '<p class="empty-state">لا توجد أنشطة مسجلة</p>';
    return;
  }
  
  const actionLabels = {
    request_created: 'إنشاء طلب',
    request_accepted: 'قبول طلب',
    request_completed: 'إتمام طلب',
    request_cancelled: 'إلغاء طلب',
    request_rated: 'تقييم طلب',
    user_registered: 'تسجيل مستخدم',
    user_approved: 'اعتماد مستخدم',
    user_rejected: 'رفض مستخدم',
    user_suspended: 'إيقاف حساب',
    volunteer_verified: 'اعتماد متطوع',
    complaint_filed: 'تقديم شكوى',
    complaint_resolved: 'حل شكوى'
  };
  
  container.innerHTML = logs.slice(0, 20).map(log => `
    <div class="activity-item">
      <div class="activity-icon">${getActivityIcon(log.action)}</div>
      <div class="activity-content">
        <strong>${log.actorName}</strong> - ${actionLabels[log.action] || log.action}
        ${log.details?.targetName ? `<br><small>الهدف: ${log.details.targetName}</small>` : ''}
      </div>
      <div class="activity-time">${formatRelativeTime(log.timestamp)}</div>
    </div>
  `).join('');
}

function getActivityIcon(action) {
  const icons = {
    request_created: '📝',
    request_accepted: '✅',
    request_completed: '🎉',
    request_cancelled: '❌',
    user_approved: '👍',
    user_rejected: '👎',
    user_suspended: '🚫',
    complaint_filed: '⚠️',
    complaint_resolved: '✔️'
  };
  return icons[action] || '📋';
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${days} يوم`;
}

async function loadComplaints() {
  const filter = document.getElementById('complaint-filter')?.value || '';
  const container = document.getElementById('complaints-list');
  
  try {
    const url = filter ? `/api/admin/complaints?status=${filter}` : '/api/admin/complaints';
    const data = await apiRequest(url);
    displayComplaints(data.complaints || []);
  } catch (error) {
    console.error('Error loading complaints:', error);
    container.innerHTML = '<p class="empty-state">فشل تحميل الشكاوى</p>';
  }
}

function displayComplaints(complaints) {
  const container = document.getElementById('complaints-list');
  
  if (!complaints.length) {
    container.innerHTML = '<p class="empty-state">لا توجد شكاوى</p>';
    return;
  }
  
  const typeLabels = {
    inappropriate_behavior: 'سلوك غير لائق',
    no_show: 'عدم الحضور',
    poor_service: 'خدمة سيئة',
    safety_concern: 'مخاوف أمنية',
    other: 'أخرى'
  };
  
  const statusLabels = {
    pending: 'في الانتظار',
    under_review: 'قيد المراجعة',
    resolved: 'تم الحل',
    dismissed: 'مرفوض'
  };
  
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
          <button class="btn btn-small btn-primary" onclick="reviewComplaint('${comp.id}', 'under_review')">مراجعة</button>
          <button class="btn btn-small btn-success" onclick="reviewComplaint('${comp.id}', 'resolved')">حل</button>
          <button class="btn btn-small btn-outline" onclick="reviewComplaint('${comp.id}', 'dismissed')">رفض</button>
          <button class="btn btn-small btn-danger" onclick="reviewComplaintWithAction('${comp.id}', 'suspend_user')">إيقاف الحساب</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

async function reviewComplaint(complaintId, status) {
  const adminNotes = prompt('ملاحظات المراجعة (اختياري):') || '';
  
  try {
    await apiRequest(`/api/admin/complaints/${complaintId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes })
    });
    showToast('تم تحديث الشكوى بنجاح', 'success');
    loadComplaints();
  } catch (error) {
    showToast('فشل تحديث الشكوى: ' + error.message, 'error');
  }
}

async function reviewComplaintWithAction(complaintId, action) {
  if (!confirm('هل أنت متأكد من إيقاف حساب المستخدم؟')) return;
  
  const adminNotes = prompt('سبب الإيقاف:') || 'مخالفة لقواعد المنصة';
  
  try {
    await apiRequest(`/api/admin/complaints/${complaintId}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'resolved', adminNotes, action })
    });
    showToast('تم إيقاف الحساب وحل الشكوى', 'success');
    loadComplaints();
    loadAdminDashboard();
  } catch (error) {
    showToast('فشل الإجراء: ' + error.message, 'error');
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
    const db = firebase.firestore();
    await db.collection('users').doc(userId).update({
      status: 'approved',
      approvedBy: currentUser.uid,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
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
    const db = firebase.firestore();
    await db.collection('users').doc(userId).update({
      status: 'rejected',
      rejectedBy: currentUser.uid,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString()
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
  
  displayVolunteerVerificationInfo(profile);
  loadVolunteerProfile(profile);
  
  try {
    const db = firebase.firestore();
    const reqSnap = await db.collection('requests').where('status', '==', 'pending').get();
    const requests = [];
    reqSnap.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));
    displayAvailableRequests(requests);
  } catch (error) {
    console.error('Error loading requests:', error);
    displayAvailableRequests([]);
  }

  try {
    const db = firebase.firestore();
    const mySnap = await db.collection('requests').where('volunteerId', '==', currentUser.uid).get();
    const myRequests = [];
    mySnap.forEach(doc => myRequests.push({ id: doc.id, ...doc.data() }));
    displayMyActiveRequests(myRequests);
  } catch (error) {
    console.error('Error loading my requests:', error);
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
  if (form) {
    form.addEventListener('submit', handleVolunteerProfileSubmit);
  }
}

async function handleVolunteerProfileSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const skills = [];
  document.querySelectorAll('input[name="skills"]:checked').forEach(cb => {
    skills.push(cb.value);
  });
  
  try {
    await apiRequest('/api/volunteer/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        bio: formData.get('bio'),
        skills: skills
      })
    });
    showToast('تم حفظ الملف الشخصي بنجاح', 'success');
  } catch (error) {
    showToast('فشل حفظ الملف: ' + error.message, 'error');
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
    const db = firebase.firestore();
    await db.collection('requests').doc(requestId).update({
      status: 'assigned',
      volunteerId: currentUser.uid,
      volunteerName: userProfile.fullName || 'متطوع',
      assignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    showToast('تم قبول الطلب!', 'success');
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
    const db = firebase.firestore();
    await db.collection('requests').doc(requestId).update({
      status: 'completed',
      hoursSpent: parseFloat(hours),
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const volDoc = db.collection('volunteer_profiles').doc(currentUser.uid);
    const volSnap = await volDoc.get();
    const currentHours = volSnap.exists ? (volSnap.data().totalHours || 0) : 0;
    const currentCompleted = volSnap.exists ? (volSnap.data().completedRequests || 0) : 0;
    await volDoc.update({
      totalHours: currentHours + parseFloat(hours),
      completedRequests: currentCompleted + 1,
      updatedAt: new Date().toISOString()
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
    const db = firebase.firestore();
    const snap = await db.collection('requests').where('elderlyId', '==', currentUser.uid).get();
    const requests = [];
    snap.forEach(doc => requests.push({ id: doc.id, ...doc.data() }));
    displayElderlyRequests(requests);
    loadComplaintTargets(requests);
    loadMyComplaints();
    setupComplaintForm();
  } catch (error) {
    console.error('Error loading requests:', error);
    displayElderlyRequests([]);
  }
}

function loadComplaintTargets(requests) {
  const select = document.getElementById('complaint-target');
  if (!select) return;
  
  const volunteers = new Map();
  requests.forEach(req => {
    if (req.volunteerId && req.volunteerName) {
      volunteers.set(req.volunteerId, req.volunteerName);
    }
  });
  
  select.innerHTML = '<option value="">-- اختر المتطوع --</option>';
  volunteers.forEach((name, id) => {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = name;
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
    await apiRequest('/api/elderly/complaints', {
      method: 'POST',
      body: JSON.stringify({
        targetId,
        targetName,
        type: formData.get('type'),
        description: formData.get('description')
      })
    });
    showToast('تم إرسال الشكوى بنجاح. سيقوم المشرف بمراجعتها.', 'success');
    e.target.reset();
    loadMyComplaints();
  } catch (error) {
    showToast('فشل إرسال الشكوى: ' + error.message, 'error');
  }
}

async function loadMyComplaints() {
  const container = document.getElementById('my-complaints');
  if (!container) return;
  
  try {
    const data = await apiRequest('/api/elderly/complaints');
    displayMyComplaints(data.complaints || []);
  } catch (error) {
    console.error('Error loading complaints:', error);
    container.innerHTML = '<h4>شكاواي السابقة</h4><p class="empty-state">فشل تحميل الشكاوى</p>';
  }
}

function displayMyComplaints(complaints) {
  const container = document.getElementById('my-complaints');
  
  const statusLabels = {
    pending: 'في الانتظار',
    under_review: 'قيد المراجعة',
    resolved: 'تم الحل',
    dismissed: 'مرفوض'
  };
  
  const typeLabels = {
    inappropriate_behavior: 'سلوك غير لائق',
    no_show: 'عدم الحضور',
    poor_service: 'خدمة سيئة',
    safety_concern: 'مخاوف أمنية',
    other: 'أخرى'
  };
  
  if (!complaints.length) {
    container.innerHTML = '<h4>شكاواي السابقة</h4><p class="empty-state">لا توجد شكاوى سابقة</p>';
    return;
  }
  
  container.innerHTML = `
    <h4>شكاواي السابقة</h4>
    ${complaints.map(comp => `
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
      </div>
    `).join('')}
  `;
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
    address: formData.get('address') || '',
    elderlyId: currentUser.uid,
    elderlyName: userProfile.fullName || 'مستخدم',
    status: 'pending',
    volunteerId: null,
    volunteerName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  try {
    const db = firebase.firestore();
    await db.collection('requests').add(data);
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
    const db = firebase.firestore();
    await db.collection('requests').doc(requestId).update({
      rating: parseInt(rating),
      feedback: feedback || '',
      ratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
    const db = firebase.firestore();
    await db.collection('requests').doc(requestId).update({
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });
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
    const db = firebase.firestore();

    // Get this org's verified volunteers list from the org document
    const orgDoc = await db.collection('organizations').doc(currentUser.uid).get();
    const verifiedIds = orgDoc.exists ? (orgDoc.data().verifiedVolunteers || []) : [];

    // Get ALL volunteers
    const usersSnap = await db.collection('users').where('role', '==', 'volunteer').get();
    const allVolunteers = [];
    usersSnap.forEach(doc => allVolunteers.push(doc.data()));

    const verifiedVols = allVolunteers.filter(v => verifiedIds.includes(v.uid));
    const unverifiedVols = allVolunteers.filter(v => !verifiedIds.includes(v.uid));

    document.getElementById('org-verified').textContent = verifiedVols.length;
    document.getElementById('org-pending-verifications').textContent = unverifiedVols.length;

    displayOrgVolunteers(verifiedVols);
    displayUnverifiedVolunteers(unverifiedVols);
  } catch (error) {
    console.error('Error loading volunteers:', error);
    document.getElementById('org-verified').textContent = '٠';
    document.getElementById('org-pending-verifications').textContent = '٠';
    displayOrgVolunteers([]);
    displayUnverifiedVolunteers([]);
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

function displayUnverifiedVolunteers(volunteers) {
  const container = document.getElementById('org-unverified-list');
  if (!container) return;

  if (!volunteers.length) {
    container.innerHTML = '<p class="empty-state">لا يوجد متطوعون في انتظار القبول</p>';
    return;
  }

  container.innerHTML = volunteers.map(vol => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${vol.fullName || 'متطوع'}</h4>
        <p>${vol.email}</p>
      </div>
      <div class="user-item-actions">
        <button class="btn btn-success btn-small" onclick="verifyVolunteerByOrg('${vol.uid}', '${(vol.fullName || '').replace(/'/g, '')}')">قبول ✓</button>
      </div>
    </div>
  `).join('');
}

async function verifyVolunteerByOrg(volunteerId, volunteerName) {
  try {
    const db = firebase.firestore();
    await db.collection('organizations').doc(currentUser.uid).update({
      verifiedVolunteers: firebase.firestore.FieldValue.arrayUnion(volunteerId),
      updatedAt: new Date().toISOString()
    });
    showToast(`تم قبول المتطوع ${volunteerName} بنجاح ✓`, 'success');
    loadOrganizationDashboard(userProfile);
  } catch (error) {
    showToast('فشل قبول المتطوع: ' + error.message, 'error');
  }
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
 * Handle elderly profile update - تحديث ملف المستخدم المسن
 */
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
    await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    // Update local userProfile
    if (userProfile) {
      userProfile.fullName = data.fullName || userProfile.fullName;
      userProfile.phone = data.phone || userProfile.phone;
      userProfile.address = data.address || userProfile.address;
      userProfile.emergencyContact = data.emergencyContact || userProfile.emergencyContact;
      userProfile.specialNeeds = data.specialNeeds || userProfile.specialNeeds;
    }
    
    showToast('تم حفظ ملفك الشخصي بنجاح!', 'success');
  } catch (error) {
    showToast('فشل حفظ الملف الشخصي: ' + error.message, 'error');
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
