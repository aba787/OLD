/**
 * Main Application JavaScript - جافاسكريبت التطبيق الرئيسي
 * 
 * General utilities and functions for the public pages
 * الأدوات والوظائف العامة للصفحات العامة
 */

document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Add animation on scroll
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, observerOptions);
  
  document.querySelectorAll('.feature-card, .step, .help-type').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
  
  // Add visible class styles
  const style = document.createElement('style');
  style.textContent = `
    .visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);
});

/**
 * Utility: Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Utility: Format currency (Arabic) - تنسيق العملة
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(amount);
}

/**
 * Utility: Show toast notification - عرض إشعار
 */
window.showToast = function(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  const bgColor = type === 'error' ? '#ef5350' : type === 'success' ? '#66bb6a' : '#5a9cb5';
  
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 24px;
    padding: 1rem 1.5rem;
    border-radius: 10px;
    color: white;
    background: ${bgColor};
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    z-index: 10000;
    animation: slideInRTL 0.3s ease;
    font-family: 'Cairo', 'Tajawal', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    max-width: 90vw;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRTL 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Add toast animations for RTL
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideInRTL {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRTL {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(-100%); opacity: 0; }
  }
`;
document.head.appendChild(toastStyles);

/**
 * API Request helper - مساعد طلبات الـ API
 */
async function apiRequest(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };
  
  // Add auth token if available
  if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
    try {
      const token = await firebase.auth().currentUser.getIdToken();
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.warn('Could not get auth token:', error);
    }
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'حدث خطأ في الطلب');
  }
  
  return data;
}
