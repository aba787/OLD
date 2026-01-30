/**
 * Firebase Configuration for Client-Side
 * 
 * This file initializes Firebase for authentication on the client side.
 * Replace the configuration values with your Firebase project settings.
 */

// Firebase configuration object
// Get these values from your Firebase Console > Project Settings > SDK setup
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Check if we have environment-provided config (for production)
// These would be injected by the server or build process
if (typeof window !== 'undefined') {
  // Try to get config from meta tags if available
  const apiKeyMeta = document.querySelector('meta[name="firebase-api-key"]');
  const projectIdMeta = document.querySelector('meta[name="firebase-project-id"]');
  const appIdMeta = document.querySelector('meta[name="firebase-app-id"]');
  
  if (apiKeyMeta) firebaseConfig.apiKey = apiKeyMeta.content;
  if (projectIdMeta) {
    firebaseConfig.projectId = projectIdMeta.content;
    firebaseConfig.authDomain = projectIdMeta.content + '.firebaseapp.com';
    firebaseConfig.storageBucket = projectIdMeta.content + '.appspot.com';
  }
  if (appIdMeta) firebaseConfig.appId = appIdMeta.content;
}

// Initialize Firebase (only if not already initialized)
let app;
let auth;

try {
  // Check if Firebase is available
  if (typeof firebase !== 'undefined') {
    // Initialize app if not already done
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.app();
    }
    
    // Get auth instance
    auth = firebase.auth();
    
    // Set persistence to LOCAL (persists even after browser restart)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => {
        console.warn('Could not set auth persistence:', error.message);
      });
    
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase SDK not loaded');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

/**
 * Helper function to get the current user's ID token
 * Used for authenticating API requests to the backend
 */
async function getAuthToken() {
  if (auth && auth.currentUser) {
    try {
      return await auth.currentUser.getIdToken(true);
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }
  return null;
}

/**
 * Make an authenticated API request
 * Automatically includes the auth token in the request headers
 */
async function apiRequest(url, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
}
