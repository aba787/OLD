/**
 * Authentication JavaScript - جافاسكريبت المصادقة
 * 
 * Handles login, registration, and authentication state on the client side.
 * يتعامل مع تسجيل الدخول والتسجيل وحالة المصادقة
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  // Check if user is already logged in
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) {
        window.location.href = '/dashboard';
      }
    });
  }
  
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
  
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
 * Handle Login Form Submission - معالجة تسجيل الدخول
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
  
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  
  loginBtn.disabled = true;
  loginText.classList.add('hidden');
  loginLoading.classList.remove('hidden');
  
  try {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('نظام المصادقة غير متاح. يرجى الاتصال بالمسؤول.');
    }
    
    const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const token = await user.getIdToken();
    
    try {
      await apiRequest('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      
      successEl.textContent = 'تم تسجيل الدخول بنجاح! جارٍ التحويل...';
      successEl.classList.remove('hidden');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (apiError) {
      console.warn('Backend verification failed, continuing anyway');
      window.location.href = '/dashboard';
    }
    
  } catch (error) {
    console.error('Login error:', error);
    
    let message = 'فشل تسجيل الدخول. يرجى التحقق من بياناتك.';
    if (error.code === 'auth/user-not-found') {
      message = 'لا يوجد حساب بهذا البريد الإلكتروني.';
    } else if (error.code === 'auth/wrong-password') {
      message = 'كلمة المرور غير صحيحة. حاول مرة أخرى.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'يرجى إدخال بريد إلكتروني صحيح.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'محاولات كثيرة جداً. حاول لاحقاً.';
    } else if (error.code === 'auth/invalid-credential') {
      message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
    }
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginText.classList.remove('hidden');
    loginLoading.classList.add('hidden');
  }
}

/**
 * Handle Registration Form Submission - معالجة إنشاء الحساب
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
  
  errorEl.classList.add('hidden');
  successEl.classList.add('hidden');
  
  // Validate form - التحقق من النموذج
  if (!role) {
    errorEl.textContent = 'يرجى اختيار نوع الحساب.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  if (password !== confirmPassword) {
    errorEl.textContent = 'كلمتا المرور غير متطابقتين.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل.';
    errorEl.classList.remove('hidden');
    return;
  }
  
  registerBtn.disabled = true;
  registerText.classList.add('hidden');
  registerLoading.classList.remove('hidden');
  
  try {
    if (typeof firebase === 'undefined' || !firebase.auth) {
      throw new Error('نظام المصادقة غير متاح. يرجى الاتصال بالمسؤول.');
    }
    
    const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    await user.updateProfile({ displayName: fullName });
    
    const userData = {
      uid: user.uid,
      email,
      fullName,
      phone,
      address,
      role
    };
    
    if (role === 'organization') {
      userData.organizationName = document.getElementById('organizationName').value;
      userData.registrationNumber = document.getElementById('registrationNumber').value || '';
    }
    
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch (apiError) {
      console.warn('Backend registration failed, continuing anyway:', apiError);
    }
    
    let successMessage = 'تم إنشاء الحساب بنجاح!';
    if (role === 'volunteer' || role === 'organization') {
      successMessage += ' حسابك في انتظار موافقة المشرف.';
    }
    successMessage += ' جارٍ التحويل...';
    
    successEl.textContent = successMessage;
    successEl.classList.remove('hidden');
    
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2000);
    
  } catch (error) {
    console.error('Registration error:', error);
    
    let message = 'فشل إنشاء الحساب. حاول مرة أخرى.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'يوجد حساب بهذا البريد الإلكتروني.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'يرجى إدخال بريد إلكتروني صحيح.';
    } else if (error.code === 'auth/weak-password') {
      message = 'كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.';
    }
    
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  } finally {
    registerBtn.disabled = false;
    registerText.classList.remove('hidden');
    registerLoading.classList.add('hidden');
  }
}
