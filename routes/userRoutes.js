// userRoutes.js
const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const User = require('../models/User');

// Helper function to verify signature
async function verifyWalletSignature(messageToSign, signature, walletAddress) {
  try {
    console.log('Verifying signature with:');
    console.log('Message:', messageToSign);
    console.log('Signature:', signature);
    console.log('Wallet Address:', walletAddress);
    
    // The message needs to be properly formatted as it would be when signed with ethers
    // This is how ethers formats messages for signing
    const formattedMessage = `\x19 Verify wallet ownership for blockchain-notification-system\n${messageToSign.length}${messageToSign}`;
    
    // Alternatively, use ethers.utils.verifyMessage
    const recoveredAddress = ethers.utils.verifyMessage(messageToSign, signature);
    
    console.log('Recovered Address:', recoveredAddress);
    
    // Compare addresses in lowercase
    const isValid = recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    console.log('Signature valid:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * User Registration API
 * POST /api/users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, fcmToken, walletAddress, signature, messageToSign } = req.body;
    
    // Log the incoming request for debugging
    console.log('Registration request received:');
    console.log('Name:', name);
    console.log('Email:', email);
    console.log('Wallet Address:', walletAddress);
    console.log('Message to Sign:', messageToSign);
    console.log('Signature:', signature);
    
    // Validate required fields
    if (!name || !email || !walletAddress || !signature || !messageToSign) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Verify wallet ownership
    const isSignatureValid = await verifyWalletSignature(messageToSign, signature, walletAddress);
    
    if (!isSignatureValid) {
      return res.status(401).json({
        success: false,
        message: 'Wallet verification failed'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this wallet address already exists'
      });
    }
    
    // Create new user
    const newUser = new User({
      name,
      email,
      fcmToken,
      walletAddress: walletAddress.toLowerCase(),
      notificationsEnabled: true,
      lastActivity: new Date()
    });
    
    await newUser.save();
    
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        walletAddress: newUser.walletAddress,
        notificationsEnabled: newUser.notificationsEnabled
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
});

module.exports = router;