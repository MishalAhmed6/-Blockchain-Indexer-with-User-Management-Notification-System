const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Update Notification Preferences
router.post('/notification-preferences', async (req, res) => {
  try {
    const { 
      walletAddress, 
      generalNotifications = true,
      transactionNotifications = true,
      marketNotifications = true,
      chatNotifications = true
    } = req.body;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    // Find and update user
    const user = await User.findOneAndUpdate(
      { walletAddress: walletAddress.toLowerCase() }, 
      { 
        notificationPreferences: {
          generalNotifications,
          transactionNotifications,
          marketNotifications,
          chatNotifications
        }
      },
      { 
        new: true,  // Return the updated document
        runValidators: true  // Run model validations
      }
    );

    // Check if user exists
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Respond with updated preferences
    res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      notificationPreferences: user.notificationPreferences
    });

  } catch (error) {
    console.error('Notification Preferences Error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid notification preferences',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    // Generic server error
    res.status(500).json({ 
      success: false, 
      message: 'Server error updating notification preferences',
      error: error.message 
    });
  }
});

// Get Notification Preferences
router.get('/notification-preferences', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet address is required' 
      });
    }

    // Find user
    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Respond with current preferences
    res.status(200).json({
      success: true,
      notificationPreferences: user.notificationPreferences || {
        generalNotifications: true,
        transactionNotifications: true,
        marketNotifications: true,
        chatNotifications: true
      }
    });

  } catch (error) {
    console.error('Fetch Notification Preferences Error:', error);

    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching notification preferences',
      error: error.message 
    });
  }
});

module.exports = router;