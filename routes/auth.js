// src/routes/auth.js (or wherever you handle user authentication)
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ... Your existing auth routes ...

/**
 * Register FCM token for a user
 * This should be called when the user logs in from a device
 */
router.post('/register-device', async (req, res) => {
  try {
    const { userId, fcmToken, deviceInfo } = req.body;
    
    if (!userId || !fcmToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Store/update FCM token in database
    const token = await prisma.fcmToken.upsert({
      where: {
        token_userId: {
          token: fcmToken,
          userId: userId
        }
      },
      update: {
        lastUpdated: new Date(),
        deviceInfo: deviceInfo || {}
      },
      create: {
        userId: userId,
        token: fcmToken,
        deviceInfo: deviceInfo || {},
      }
    });
    
    return res.status(200).json({ success: true, token });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;