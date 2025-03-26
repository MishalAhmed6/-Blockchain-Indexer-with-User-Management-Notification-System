const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ethers = require('ethers');

// Debugging: Log ethers version and methods
console.log('Ethers version:', ethers.version || 'Unknown');
console.log('Ethers.utils:', ethers.utils);
console.log('Ethers.verifyMessage:', ethers.verifyMessage);

function verifyWalletSignature(walletAddress, message, signature) {
  try {
    console.log('Verifying wallet signature...');

    // Handle both ethers v5 and v6
    let recoveredAddress;
    if (ethers.utils && ethers.utils.verifyMessage) {
      // Ethers v5
      console.log('Using ethers v5 verification');
      recoveredAddress = ethers.utils.verifyMessage(message, signature);
    } else if (ethers.verifyMessage) {
      // Ethers v6
      console.log('Using ethers v6 verification');
      recoveredAddress = ethers.verifyMessage(message, signature);
    } else {
      throw new Error('Could not find verifyMessage method in ethers');
    }

    console.log('Recovered address:', recoveredAddress);
    console.log('Expected address:', walletAddress);

    // Compare addresses (case-insensitive)
    if (recoveredAddress.toLowerCase() === walletAddress.toLowerCase()) {
      console.log('Wallet verification succeeded!');
      return true;
    } else {
      console.log('Wallet verification failed: address mismatch');
      return false;
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    throw error;
  }
}

router.post('/register', async (req, res) => {
  try {
    const { 
      walletAddress, 
      signature, 
      messageToSign, 
      fcmToken, 
      email, 
      name 
    } = req.body;

    console.log('Received registration request with:', {
      walletAddress,
      signature,
      messageToSign,
      fcmToken,
      email,
      name
    });

    // Validate required fields
    if (!fcmToken || !email || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        requiredFields: ['fcmToken', 'email', 'name']
      });
    }

    // Verify the wallet signature
    const isValid = verifyWalletSignature(walletAddress, messageToSign, signature);

    if (!isValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Wallet verification failed' 
      });
    }

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { walletAddress: walletAddress.toLowerCase() },
        { email: email.toLowerCase() }
      ]
    });

    // If user doesn't exist, create new user
    if (!user) {
      user = new User({
        walletAddress: walletAddress.toLowerCase(),
        fcmToken,
        email: email.toLowerCase(),
        name,
        lastLogin: new Date()
      });
      await user.save();
    } else {
      // Update existing user details
      user.fcmToken = fcmToken;
      user.email = email.toLowerCase();
      user.name = name;
      user.lastLogin = new Date();
      await user.save();
    }

    return res.status(200).json({ 
      success: true, 
      message: 'User registered successfully',
      user: {
        walletAddress: user.walletAddress,
        email: user.email,
        name: user.name,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        message: 'Wallet address or email already registered' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      message: 'Server error during registration',
      error: error.message 
    });
  }
});

module.exports = router;