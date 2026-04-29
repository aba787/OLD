/**
 * Authentication JavaScript - جافاسكريبت المصادقة
 * Uses local server-side auth (no Firebase).
 */

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  try {
    const me = await authApi.me();
    if (me && me.user) {
      window.location.href = '/dashboard';
      return;
    }
  } catch (e) { /* not logged in */ }

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
    document.querySelectorAll('input[name="role"]').forEach(input => {
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
    await authApi.login(email, password);
    successEl.textContent = 'تم تسجيل الدخول بنجاح! جارٍ التحويل...';
    successEl.classList.remove('hidden');
    setTimeout(() => { window.location.href = '/dashboard'; }, 600);
  } catch (error) {
    errorEl.textContent = error.message || 'فشل تسجيل الدخول';
    errorEl.classList.remove('hidden');
    loginBtn.disabled = false;
    loginText.classList.remove('hidden');
    loginLoading.classList.add('hidden');
  }
}

async function handleRegister(e) {
  e.preventDefault();
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

  if (!role) { errorEl.textContent = 'يرجى اختيار نوع الحساب.'; errorEl.classList.remove('hidden'); return; }
  if (password !== confirmPassword) { errorEl.textContent = 'كلمتا المرور غير متطابقتين.'; errorEl.classList.remove('hidden'); return; }
  if (password.length < 6) { errorEl.textContent = 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل.'; errorEl.classList.remove('hidden'); return; }

  registerBtn.disabled = true;
  registerText.classList.add('hidden');
  registerLoading.classList.remove('hidden');

  try {
    const payload = { email, password, fullName, phone, address, role };
    if (role === 'organization') {
      payload.organizationName = document.getElementById('organizationName').value || fullName;
      payload.registrationNumber = document.getElementById('registrationNumber').value || '';
    }
    await authApi.register(payload);
    successEl.textContent = 'تم إنشاء الحساب بنجاح! جارٍ التحويل...';
    successEl.classList.remove('hidden');
    setTimeout(() => { window.location.href = '/dashboard'; }, 800);
  } catch (error) {
    errorEl.textContent = error.message || 'فشل إنشاء الحساب';
    errorEl.classList.remove('hidden');
    registerBtn.disabled = false;
    registerText.classList.remove('hidden');
    registerLoading.classList.add('hidden');
  }
}
