const express = require('express');
const router = express.Router();
const { registerUser, updateNotificationPreferences } = require('../controllers/userController');

// Register a new user
router.post('/register', registerUser);

// Update notification preferences
router.post('/notifications', updateNotificationPreferences);

module.exports = router;