/**
 * Firebase Configuration File
 * 
 * This file initializes Firebase Admin SDK for server-side operations.
 * Firebase Admin SDK allows us to:
 * - Verify user authentication tokens
 * - Access Firestore database
 * - Manage users and custom claims (roles)
 * - Access Firebase Storage
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// In production, you would use a service account key file
// For now, we'll initialize with project credentials from environment variables
let db, auth, storage;

try {
  // Check if Firebase credentials are available
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the service account JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: `${serviceAccount.project_id}.appspot.com`
    });
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Initialize with project ID only (limited functionality)
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  } else {
    // Initialize with default credentials (for local development)
    console.warn('Firebase credentials not found. Running in demo mode.');
    admin.initializeApp({
      projectId: 'demo-volunteer-platform'
    });
  }

  // Get references to Firebase services
  db = admin.firestore();
  auth = admin.auth();
  storage = admin.storage();

  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase:', error.message);
  // Create mock objects for demo mode
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
