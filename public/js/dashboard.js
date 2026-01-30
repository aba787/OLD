/**
 * Dashboard JavaScript
 * 
 * Handles dashboard functionality for all user roles:
 * - Admin: User management, approvals, statistics
 * - Volunteer: Available requests, hour logging
 * - Elderly: Creating help requests
 * - Organization: Volunteer verification
 */

// Global state
let currentUser = null;
let currentRole = null;

document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

/**
 * Initialize the dashboard
 */
async function initializeDashboard() {
  // Check if Firebase is available
  if (typeof firebase === 'undefined' || !firebase.auth) {
    console.error('Firebase not loaded');
    showError('Authentication system not available. Please refresh the page.');
    return;
  }
  
  // Listen for auth state changes
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      currentUser = user;
      await loadUserProfile();
    } else {
      // Not logged in, redirect to login
      window.location.href = '/login';
    }
  });
  
  // Setup logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Setup request form
  document.getElementById('request-form')?.addEventListener('submit', handleCreateRequest);
  
  // Setup organization profile form
  document.getElementById('org-profile-form')?.addEventListener('submit', handleUpdateOrgProfile);
}

/**
 * Load user profile and initialize appropriate dashboard
 */
async function loadUserProfile() {
  try {
    // Try to get profile from backend
    let profile = null;
    try {
      profile = await apiRequest('/api/auth/profile');
    } catch (error) {
      console.warn('Could not load profile from backend:', error);
    }
    
    // If no profile from backend, use Firebase user data
    if (!profile) {
      profile = {
        uid: currentUser.uid,
        email: currentUser.email,
        fullName: currentUser.displayName || 'User',
        role: 'elderly', // Default role
        status: 'approved'
      };
    }
    
    currentRole = profile.role;
    
    // Update UI with user info
    document.getElementById('user-info').textContent = `Welcome, ${profile.fullName}`;
    document.getElementById('role-title').textContent = getRoleTitle(profile.role);
    
    // Update status badge
    const statusBadge = document.getElementById('status-badge');
    statusBadge.textContent = profile.status || 'Active';
    statusBadge.className = `status-badge status-${profile.status || 'approved'}`;
    
    // Setup sidebar navigation
    setupSidebar(profile.role);
    
    // Hide loading screen
    document.getElementById('loading-screen').classList.add('hidden');
    
    // Show appropriate dashboard
    showDashboard(profile.role, profile);
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showError('Failed to load profile. Please try again.');
  }
}

/**
 * Get role display title
 */
function getRoleTitle(role) {
  const titles = {
    admin: 'Admin Dashboard',
    volunteer: 'Volunteer Dashboard',
    elderly: 'My Dashboard',
    organization: 'Organization Dashboard'
  };
  return titles[role] || 'Dashboard';
}

/**
 * Setup sidebar navigation based on role
 */
function setupSidebar(role) {
  const nav = document.getElementById('sidebar-nav');
  const navItems = [];
  
  switch (role) {
    case 'admin':
      navItems.push(
        { href: '#overview', text: 'Overview', icon: '&#128200;' },
        { href: '#users', text: 'Manage Users', icon: '&#128101;' },
        { href: '#requests', text: 'All Requests', icon: '&#128203;' },
        { href: '#stats', text: 'Statistics', icon: '&#128202;' }
      );
      break;
    case 'volunteer':
      navItems.push(
        { href: '#available', text: 'Available Requests', icon: '&#128214;' },
        { href: '#my-requests', text: 'My Requests', icon: '&#128203;' },
        { href: '#hours', text: 'Log Hours', icon: '&#128337;' },
        { href: '#profile', text: 'My Profile', icon: '&#128100;' }
      );
      break;
    case 'elderly':
      navItems.push(
        { href: '#request-help', text: 'Request Help', icon: '&#128400;' },
        { href: '#my-requests', text: 'My Requests', icon: '&#128203;' },
        { href: '#profile', text: 'My Profile', icon: '&#128100;' }
      );
      break;
    case 'organization':
      navItems.push(
        { href: '#overview', text: 'Overview', icon: '&#127970;' },
        { href: '#volunteers', text: 'Volunteers', icon: '&#128101;' },
        { href: '#profile', text: 'Organization Profile', icon: '&#128100;' }
      );
      break;
  }
  
  nav.innerHTML = navItems.map(item => 
    `<a href="${item.href}"><span>${item.icon}</span> ${item.text}</a>`
  ).join('');
}

/**
 * Show the appropriate dashboard based on role
 */
function showDashboard(role, profile) {
  // Hide all dashboards first
  document.querySelectorAll('.dashboard-content').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Show role-specific dashboard
  const dashboardId = `${role}-dashboard`;
  const dashboard = document.getElementById(dashboardId);
  if (dashboard) {
    dashboard.classList.remove('hidden');
  }
  
  // Load role-specific data
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
 * Load Admin Dashboard Data
 */
async function loadAdminDashboard() {
  try {
    // Load statistics
    const stats = await apiRequest('/api/admin/stats');
    
    document.getElementById('stat-total-users').textContent = stats.totalUsers || 0;
    document.getElementById('stat-pending').textContent = stats.pendingApprovals || 0;
    document.getElementById('stat-volunteers').textContent = stats.totalVolunteers || 0;
    document.getElementById('stat-requests').textContent = stats.totalRequests || 0;
    
    // Load pending users
    const pendingData = await apiRequest('/api/admin/users/pending');
    displayPendingUsers(pendingData.users || []);
    
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    // Show demo data on error
    document.getElementById('stat-total-users').textContent = '25';
    document.getElementById('stat-pending').textContent = '5';
    document.getElementById('stat-volunteers').textContent = '10';
    document.getElementById('stat-requests').textContent = '45';
    
    displayPendingUsers([
      { uid: '1', fullName: 'John Volunteer', email: 'john@test.com', role: 'volunteer' },
      { uid: '2', fullName: 'Care Charity', email: 'care@charity.org', role: 'organization' }
    ]);
  }
}

/**
 * Display pending users for admin approval
 */
function displayPendingUsers(users) {
  const container = document.getElementById('pending-users-list');
  
  if (!users.length) {
    container.innerHTML = '<p class="empty-state">No pending approvals</p>';
    return;
  }
  
  container.innerHTML = users.map(user => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${user.fullName}</h4>
        <p>${user.email} - ${user.role}</p>
      </div>
      <div class="user-item-actions">
        <button class="btn btn-success btn-small" onclick="approveUser('${user.uid}')">Approve</button>
        <button class="btn btn-danger btn-small" onclick="rejectUser('${user.uid}')">Reject</button>
      </div>
    </div>
  `).join('');
}

/**
 * Approve a user
 */
async function approveUser(userId) {
  try {
    await apiRequest(`/api/admin/users/${userId}/approve`, { method: 'PUT' });
    alert('User approved successfully!');
    loadAdminDashboard();
  } catch (error) {
    alert('Failed to approve user: ' + error.message);
  }
}

/**
 * Reject a user
 */
async function rejectUser(userId) {
  const reason = prompt('Enter reason for rejection (optional):');
  try {
    await apiRequest(`/api/admin/users/${userId}/reject`, { 
      method: 'PUT',
      body: JSON.stringify({ reason })
    });
    alert('User rejected.');
    loadAdminDashboard();
  } catch (error) {
    alert('Failed to reject user: ' + error.message);
  }
}

/**
 * Load Volunteer Dashboard Data
 */
async function loadVolunteerDashboard(profile) {
  // Show pending notice if not approved
  if (profile.status === 'pending') {
    document.getElementById('pending-approval-notice').classList.remove('hidden');
  }
  
  // Update stats
  document.getElementById('vol-total-hours').textContent = profile.totalHours || '0';
  document.getElementById('vol-completed').textContent = profile.completedRequests || '0';
  document.getElementById('vol-rating').textContent = profile.rating ? profile.rating.toFixed(1) : 'N/A';
  document.getElementById('vol-status').textContent = profile.verified ? 'Verified' : 'Not Verified';
  
  // Load available requests
  try {
    const requestsData = await apiRequest('/api/volunteer/requests');
    displayAvailableRequests(requestsData.requests || []);
  } catch (error) {
    console.error('Error loading requests:', error);
    displayAvailableRequests([
      { id: '1', type: 'shopping', description: 'Weekly grocery shopping', urgency: 'medium', elderlyName: 'Mary J.' },
      { id: '2', type: 'hospital', description: 'Doctor appointment', urgency: 'high', elderlyName: 'Robert S.' }
    ]);
  }
  
  // Load my active requests
  try {
    const myRequestsData = await apiRequest('/api/volunteer/my-requests');
    displayMyActiveRequests(myRequestsData.requests || []);
  } catch (error) {
    console.error('Error loading my requests:', error);
  }
}

/**
 * Display available requests for volunteers
 */
function displayAvailableRequests(requests) {
  const container = document.getElementById('available-requests');
  
  if (!requests.length) {
    container.innerHTML = '<p class="empty-state">No available requests at the moment</p>';
    return;
  }
  
  container.innerHTML = requests.map(req => `
    <div class="request-item urgency-${req.urgency}">
      <div class="request-header">
        <span class="request-type">${formatRequestType(req.type)}</span>
        <span class="request-status status-pending-request">${req.urgency} priority</span>
      </div>
      <p class="request-description">${req.description}</p>
      <div class="request-meta">
        <span>Requested by: ${req.elderlyName || 'Anonymous'}</span>
        ${req.preferredDate ? `<span>Preferred date: ${formatDate(req.preferredDate)}</span>` : ''}
      </div>
      <div class="request-actions">
        <button class="btn btn-primary btn-small" onclick="acceptRequest('${req.id}')">Accept Request</button>
      </div>
    </div>
  `).join('');
}

/**
 * Display volunteer's active requests
 */
function displayMyActiveRequests(requests) {
  const container = document.getElementById('my-active-requests');
  
  const activeRequests = requests.filter(r => r.status === 'assigned');
  
  if (!activeRequests.length) {
    container.innerHTML = '<p class="empty-state">No active requests</p>';
    return;
  }
  
  container.innerHTML = activeRequests.map(req => `
    <div class="request-item">
      <div class="request-header">
        <span class="request-type">${formatRequestType(req.type)}</span>
        <span class="request-status status-assigned">In Progress</span>
      </div>
      <p class="request-description">${req.description}</p>
      <div class="request-meta">
        <span>For: ${req.elderlyName || 'Anonymous'}</span>
      </div>
      <div class="request-actions">
        <button class="btn btn-success btn-small" onclick="completeRequest('${req.id}')">Mark Complete</button>
      </div>
    </div>
  `).join('');
}

/**
 * Accept a request
 */
async function acceptRequest(requestId) {
  try {
    await apiRequest(`/api/volunteer/requests/${requestId}/accept`, { method: 'POST' });
    alert('Request accepted! Contact details will be shared.');
    loadVolunteerDashboard(currentUser);
  } catch (error) {
    alert('Failed to accept request: ' + error.message);
  }
}

/**
 * Complete a request
 */
async function completeRequest(requestId) {
  const hours = prompt('How many hours did you spend?');
  if (!hours) return;
  
  try {
    await apiRequest(`/api/volunteer/requests/${requestId}/complete`, { 
      method: 'POST',
      body: JSON.stringify({ hoursSpent: parseFloat(hours), notes: '' })
    });
    alert('Request marked as complete. Thank you for volunteering!');
    loadVolunteerDashboard(currentUser);
  } catch (error) {
    alert('Failed to complete request: ' + error.message);
  }
}

/**
 * Load Elderly Dashboard Data
 */
async function loadElderlyDashboard() {
  try {
    const requestsData = await apiRequest('/api/elderly/requests');
    displayElderlyRequests(requestsData.requests || []);
  } catch (error) {
    console.error('Error loading requests:', error);
    displayElderlyRequests([
      { id: '1', type: 'shopping', description: 'Weekly groceries', status: 'pending', createdAt: new Date().toISOString() },
      { id: '2', type: 'hospital', description: 'Doctor checkup', status: 'completed', volunteerName: 'John S.', createdAt: new Date().toISOString() }
    ]);
  }
}

/**
 * Display elderly user's requests
 */
function displayElderlyRequests(requests) {
  const container = document.getElementById('elderly-requests');
  
  if (!requests.length) {
    container.innerHTML = '<p class="empty-state">You haven\'t made any requests yet. Click above to request help!</p>';
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
        <span>Created: ${formatDate(req.createdAt)}</span>
        ${req.volunteerName ? `<span>Volunteer: ${req.volunteerName}</span>` : ''}
      </div>
      ${req.status === 'completed' && !req.rated ? `
        <div class="request-actions">
          <button class="btn btn-primary btn-small" onclick="rateVolunteer('${req.id}')">Rate Volunteer</button>
        </div>
      ` : ''}
      ${req.status === 'pending' ? `
        <div class="request-actions">
          <button class="btn btn-outline btn-small" onclick="cancelRequest('${req.id}')">Cancel</button>
        </div>
      ` : ''}
    </div>
  `).join('');
}

/**
 * Open request modal
 */
function openRequestModal(type) {
  document.getElementById('request-type').value = type;
  document.getElementById('request-modal').classList.remove('hidden');
  
  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('request-date').min = today;
}

/**
 * Close modal
 */
function closeModal() {
  document.getElementById('request-modal').classList.add('hidden');
  document.getElementById('request-form').reset();
}

/**
 * Handle create request form submission
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
    
    alert('Help request submitted successfully!');
    closeModal();
    loadElderlyDashboard();
  } catch (error) {
    alert('Failed to submit request: ' + error.message);
  }
}

/**
 * Rate a volunteer
 */
async function rateVolunteer(requestId) {
  const rating = prompt('Rate the volunteer (1-5 stars):');
  if (!rating || rating < 1 || rating > 5) {
    alert('Please enter a valid rating between 1 and 5');
    return;
  }
  
  const feedback = prompt('Any feedback? (optional)');
  
  try {
    await apiRequest(`/api/elderly/requests/${requestId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating: parseInt(rating), feedback: feedback || '' })
    });
    alert('Thank you for your feedback!');
    loadElderlyDashboard();
  } catch (error) {
    alert('Failed to submit rating: ' + error.message);
  }
}

/**
 * Cancel a request
 */
async function cancelRequest(requestId) {
  if (!confirm('Are you sure you want to cancel this request?')) return;
  
  try {
    await apiRequest(`/api/elderly/requests/${requestId}`, { method: 'DELETE' });
    alert('Request cancelled.');
    loadElderlyDashboard();
  } catch (error) {
    alert('Failed to cancel request: ' + error.message);
  }
}

/**
 * Load Organization Dashboard Data
 */
async function loadOrganizationDashboard(profile) {
  // Show pending notice if not approved
  if (profile.status === 'pending') {
    document.getElementById('org-pending-notice').classList.remove('hidden');
  }
  
  // Fill in profile form
  document.getElementById('org-name').value = profile.organizationName || '';
  document.getElementById('org-reg').value = profile.registrationNumber || '';
  document.getElementById('org-desc').value = profile.description || '';
  
  // Load verified volunteers
  try {
    const volunteersData = await apiRequest('/api/organization/volunteers');
    document.getElementById('org-verified').textContent = volunteersData.count || 0;
    displayOrgVolunteers(volunteersData.volunteers || []);
  } catch (error) {
    console.error('Error loading volunteers:', error);
    document.getElementById('org-verified').textContent = '0';
  }
  
  // Load pending verifications
  try {
    const pendingData = await apiRequest('/api/organization/volunteers/pending');
    document.getElementById('org-pending-verifications').textContent = pendingData.count || 0;
  } catch (error) {
    document.getElementById('org-pending-verifications').textContent = '0';
  }
}

/**
 * Display organization's verified volunteers
 */
function displayOrgVolunteers(volunteers) {
  const container = document.getElementById('org-volunteers-list');
  
  if (!volunteers.length) {
    container.innerHTML = '<p class="empty-state">No verified volunteers yet</p>';
    return;
  }
  
  container.innerHTML = volunteers.map(vol => `
    <div class="user-item">
      <div class="user-item-info">
        <h4>${vol.fullName}</h4>
        <p>${vol.email}</p>
      </div>
      <div class="user-item-actions">
        <button class="btn btn-outline btn-small" onclick="removeVerification('${vol.uid}')">Remove</button>
      </div>
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
    alert('Profile updated successfully!');
  } catch (error) {
    alert('Failed to update profile: ' + error.message);
  }
}

/**
 * Remove volunteer verification
 */
async function removeVerification(volunteerId) {
  if (!confirm('Are you sure you want to remove this volunteer\'s verification?')) return;
  
  try {
    await apiRequest(`/api/organization/volunteers/${volunteerId}`, { method: 'DELETE' });
    alert('Verification removed.');
    loadOrganizationDashboard(currentUser);
  } catch (error) {
    alert('Failed to remove verification: ' + error.message);
  }
}

/**
 * Handle logout
 */
async function handleLogout() {
  try {
    // Sign out from Firebase
    await firebase.auth().signOut();
    
    // Clear backend session
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Backend logout failed:', error);
    }
    
    // Redirect to home
    window.location.href = '/';
  } catch (error) {
    console.error('Logout error:', error);
    alert('Failed to logout. Please try again.');
  }
}

/**
 * Helper: Format request type
 */
function formatRequestType(type) {
  const types = {
    shopping: 'Shopping Help',
    hospital: 'Hospital Visit',
    paperwork: 'Paperwork Help',
    companionship: 'Companionship',
    other: 'Other'
  };
  return types[type] || type;
}

/**
 * Helper: Format status
 */
function formatStatus(status) {
  const statuses = {
    pending: 'Pending',
    assigned: 'Volunteer Assigned',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };
  return statuses[status] || status;
}

/**
 * Helper: Format date
 */
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Show error message
 */
function showError(message) {
  document.getElementById('loading-screen').innerHTML = `
    <div class="alert alert-error">${message}</div>
  `;
}
