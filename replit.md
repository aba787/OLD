# CareConnect - Humanitarian Volunteer Platform

## Overview
CareConnect is a full-stack web application that connects elderly people with trusted volunteers for everyday assistance. The platform includes admin supervision for safety and allows organizations (charities) to verify volunteers.

## Tech Stack
- **Backend**: Node.js + Express.js
- **Frontend**: HTML, CSS, Vanilla JavaScript
- **Authentication**: Firebase Authentication (email/password)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage

## Project Structure
```
├── public/                 # Frontend static files
│   ├── css/
│   │   └── style.css      # Main stylesheet
│   ├── js/
│   │   ├── app.js         # General utilities
│   │   ├── auth.js        # Authentication logic
│   │   ├── dashboard.js   # Dashboard functionality
│   │   └── firebase-config.js  # Firebase client config
│   ├── index.html         # Landing page
│   ├── login.html         # Login page
│   ├── register.html      # Registration page
│   └── dashboard.html     # Role-based dashboard
├── src/
│   ├── controllers/       # Route handlers
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── elderlyController.js
│   │   ├── organizationController.js
│   │   └── volunteerController.js
│   ├── middleware/
│   │   └── auth.js        # Authentication middleware
│   ├── routes/            # API route definitions
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── elderly.js
│   │   ├── organization.js
│   │   └── volunteer.js
│   ├── firebase.js        # Firebase Admin SDK config
│   └── server.js          # Express server entry point
├── package.json
└── replit.md
```

## User Roles
1. **Admin**: Review and approve accounts, manage users, view statistics
2. **Volunteer**: Create profile, view/accept help requests, log hours
3. **Elderly User**: Create help requests, rate volunteers
4. **Organization**: Register details, verify volunteers

## Core Features
- User registration with role selection
- Email/password authentication via Firebase
- Role-based access control (middleware)
- Admin approval workflow for volunteers/organizations
- Help request management (create, accept, complete)
- Volunteer hour logging
- Rating system for completed requests

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify token
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/logout` - Logout

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/users/pending` - Get pending approvals
- `PUT /api/admin/users/:id/approve` - Approve user
- `PUT /api/admin/users/:id/reject` - Reject user
- `PUT /api/admin/users/:id/suspend` - Suspend user
- `GET /api/admin/stats` - Get platform statistics

### Volunteer
- `GET /api/volunteer/profile` - Get volunteer profile
- `PUT /api/volunteer/profile` - Update profile
- `GET /api/volunteer/requests` - Get available requests
- `POST /api/volunteer/requests/:id/accept` - Accept request
- `POST /api/volunteer/requests/:id/complete` - Complete request
- `GET /api/volunteer/hours` - Get logged hours

### Elderly
- `POST /api/elderly/requests` - Create help request
- `GET /api/elderly/requests` - Get my requests
- `PUT /api/elderly/requests/:id` - Update request
- `DELETE /api/elderly/requests/:id` - Cancel request
- `POST /api/elderly/requests/:id/rate` - Rate volunteer

### Organization
- `GET /api/organization/profile` - Get organization profile
- `PUT /api/organization/profile` - Update profile
- `GET /api/organization/volunteers` - Get verified volunteers
- `POST /api/organization/volunteers/:id/verify` - Verify volunteer

## Firebase Setup
To enable full functionality, configure Firebase:

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Email/Password authentication
3. Create a Firestore database
4. Add your web app configuration to `public/js/firebase-config.js`
5. For server-side operations, add Firebase service account credentials as `FIREBASE_SERVICE_ACCOUNT` environment variable

## Environment Variables
- `PORT` - Server port (default: 5000)
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` - Firebase Admin SDK service account JSON

## Running the Application
```bash
npm start
```

The server will start on port 5000.

## Security Features
- Firebase token verification
- Role-based access control middleware
- Input validation with express-validator
- Account status checks (pending, approved, suspended)
- Admin approval required for sensitive roles

## Recent Changes
- Initial project setup (January 2026)
- Created complete backend with Express routes and controllers
- Built frontend with role-based dashboards
- Implemented authentication flow with Firebase

## Notes
- The application runs in demo mode if Firebase is not configured
- All volunteer and organization accounts require admin approval
- Elderly users are auto-approved upon registration
