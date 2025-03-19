const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();


const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../firebase-credentials.json');

const initializeFirebase = () => {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    process.exit(1);
  }
};

module.exports = { initializeFirebase, admin };