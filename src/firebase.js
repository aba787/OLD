/**
 * Firebase Configuration File
 * 
 * This file initializes Firebase Admin SDK for server-side operations.
 * Firebase Admin SDK allows us to:
 * - Verify user authentication tokens
 * - Access Firestore database
 * - Manage users and custom claims (roles)
 * - Access Firebase Storage
 * 
 * DEMO MODE: When Firebase credentials are not provided, the app runs in
 * demo mode with mock data for testing and development.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let db = null;
let auth = null;
let storage = null;
let isDemo = false;

try {
  // Check if Firebase credentials are available
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
    
    // Get references to Firebase services
    db = admin.firestore();
    auth = admin.auth();
    storage = admin.storage();
    
    console.log('Firebase Admin SDK initialized successfully');
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Initialize with project ID only (limited functionality)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
    
    db = admin.firestore();
    auth = admin.auth();
    storage = admin.storage();
    
    console.log('Firebase Admin SDK initialized with project ID');
  } else {
    // DEMO MODE: No Firebase credentials provided
    // Set all services to null so controllers use demo data
    console.warn('Firebase credentials not found. Running in demo mode.');
    isDemo = true;
    db = null;
    auth = null;
    storage = null;
  }
} catch (error) {
  console.error('Error initializing Firebase:', error.message);
  console.warn('Falling back to demo mode.');
  isDemo = true;
  db = null;
  auth = null;
  storage = null;
}

// Export Firebase services for use in other modules
module.exports = {
  admin,
  db,
  auth,
  storage
};
