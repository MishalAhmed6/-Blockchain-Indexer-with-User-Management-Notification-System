const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require('../firebase-credentials.json');

const initializeFirebase = () => {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://blockchain-indexer-223eb-default-rtdb.firebaseio.com'
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    process.exit(1);
  }
};

module.exports = { initializeFirebase };