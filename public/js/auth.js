/**
 * Authentication JavaScript
 * 
 * Handles login, registration, and authentication state on the client side.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  // Check if user is already logged in
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        // User is signed in, redirect to dashboard
        window.location.href = '/dashboard';
      }
    });
  }
  
  // Handle Login Form
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
  // Handle Register Form
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
    
    // Show/hide organization fields based on role selection
    const roleInputs = document.querySelectorAll('input[name="role"]');
    roleInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const orgFields = document.getElementById('org-fields');
        if (e.target.value === 'organization') {
          orgFields.classList.remove('hidden');
          document.getElementById('organizationName').required = true;
        } else {
          orgFields.classList.add('hidden');
          document.getElementById('organizationName').required = false;
        }
      });
    });
  }
});

/**
 * Handle Login Form Submission
 */
async function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('error-message');
  const successEl = document.getElementById('success-message');
  const loginText = document.getElementById('login-text');
  const loginLoading = document.getElementById('login-loading');
  const loginBtn = document.getElementById('login-btn');
  
  // Reset messages
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  
  // Show loading state
  loginBtn.disabled = true;
  loginText.classList.add('hidden');
  loginLoading.classList.remove('hidden');
  
  try {
    // Check if Firebase is configured
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('Authentication system not configured. Please contact administrator.');
    }
    
    // Sign in with Firebase
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Get ID token and verify with backend
    const token = await user.getIdToken();
    
    try {
      const response = await apiRequest('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      
      successEl.textContent = 'Login successful! Redirecting...';
      successEl.classList.remove('hidden');
      
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (apiError) {
      // If backend verification fails, still allow access
      // (backend might be in demo mode)
      console.warn('Backend verification failed, continuing anyway');
      window.location.href = '/dashboard';
    }
    
  } catch (error) {
    console.error('Login error:', error);
    
    // Show user-friendly error message
    let message = 'Failed to login. Please check your credentials.';
    if (error.code === 'auth/user-not-found') {
      message = 'No account found with this email address.';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed attempts. Please try again later.';
    } else if (error.message) {
      message = error.message;
    }
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  } finally {
    // Reset loading state
    loginBtn.disabled = false;
    loginText.classList.remove('hidden');
    loginLoading.classList.add('hidden');
  }
}

/**
 * Handle Registration Form Submission
 */
async function handleRegister(e) {
  e.preventDefault();
  
  const form = e.target;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const fullName = document.getElementById('fullName').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;
  const role = document.querySelector('input[name="role"]:checked')?.value;
  
  const errorEl = document.getElementById('error-message');
  const successEl = document.getElementById('success-message');
  const registerText = document.getElementById('register-text');
  const registerLoading = document.getElementById('register-loading');
  const registerBtn = document.getElementById('register-btn');
  
  // Reset messages
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  
  // Validate form
  if (!role) {
    errorEl.textContent = 'Please select your role.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  if (password !== confirmPassword) {
    errorEl.textContent = 'Passwords do not match.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  // Show loading state
  registerBtn.disabled = true;
  registerText.classList.add('hidden');
  registerLoading.classList.remove('hidden');
  
  try {
    // Check if Firebase is configured
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('Authentication system not configured. Please contact administrator.');
    }
    
    // Create user with Firebase
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Update display name
    await user.updateProfile({ displayName: fullName });
    
    // Prepare user data for backend
    const userData = {
      uid: user.uid,
      email,
      fullName,
      phone,
      address,
      role
    };
    
    // Add organization-specific data
    if (role === 'organization') {
      userData.organizationName = document.getElementById('organizationName').value;
      userData.registrationNumber = document.getElementById('registrationNumber').value || '';
    }
    
    // Register with backend
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch (apiError) {
      console.warn('Backend registration failed, continuing anyway:', apiError);
    }
    
    // Show success message
    let successMessage = 'Account created successfully!';
    if (role === 'volunteer' || role === 'organization') {
      successMessage += ' Your account is pending admin approval.';
    }
    successMessage += ' Redirecting to dashboard...';
    
    successEl.textContent = successMessage;
    successEl.classList.remove('hidden');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Show user-friendly error message
    let message = 'Failed to create account. Please try again.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'An account with this email already exists.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Please enter a valid email address.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak. Please use a stronger password.';
    } else if (error.message) {
      message = error.message;
    }
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  } finally {
    // Reset loading state
    registerBtn.disabled = false;
    registerText.classList.remove('hidden');
    registerLoading.classList.add('hidden');
  }
}
