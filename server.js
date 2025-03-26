const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');
const { verifyWalletAddress } = require('./utils/walletVerification');
const User = require('./models/User');
const ethers = require('ethers');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Enhanced middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware for frontend integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' && req.originalUrl.includes('/register')) {
    // Log registration request details, but protect sensitive data
    const { walletAddress, messageToSign, signature } = req.body;
    const truncatedSignature = signature ? `${signature.substring(0, 10)}...` : undefined;
    console.log('Registration request:', { walletAddress, messageToSign, signature: truncatedSignature });
  }
  next();
});

// Version checker middleware
app.use((req, res, next) => {
  // Check and log ethers version for debugging
  try {
    console.log('Ethers version:', ethers.version || 'Unknown');
  } catch (error) {
    console.log('Ethers import error:', error.message);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to database
try {
  connectDB();
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

// Initialize Firebase
try {
  initializeFirebase();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Continue anyway as this might not be critical
}

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Wallet verification endpoint
app.post('/api/verify-wallet', async (req, res) => {
  const { walletAddress, signature, messageToSign } = req.body;

  console.log('Received verification request with:', {
    walletAddress: walletAddress,
    signature: signature,
    messageToSign: messageToSign
  });

  if (!walletAddress || !signature || !messageToSign) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const isValid = await verifyWalletAddress(walletAddress, messageToSign, signature);

  if (isValid) {
    return res.status(200).json({ message: 'Wallet verification succeeded' });
  } else {
    return res.status(401).json({ message: 'Wallet verification failed' });
  }
});

// New Wallet Registration Route
app.post('/api/users/register', async (req, res) => {
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
    const isValid = await verifyWalletAddress(walletAddress, messageToSign, signature);
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
app.post('/api/users/log-transaction', async (req, res) => {
  try {
      const { 
          walletAddress, 
          transactionData 
      } = req.body;

      // Validate required fields
      if (!walletAddress || !transactionData) {
          return res.status(400).json({ 
              success: false, 
              message: 'Missing required fields',
              requiredFields: ['walletAddress', 'transactionData']
          });
      }

      // Find the user by wallet address
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

      // Prepare transaction data
      const newTransaction = {
          hash: transactionData.hash || '',
          from: transactionData.from ? transactionData.from.toLowerCase() : user.walletAddress,
          to: transactionData.to ? transactionData.to.toLowerCase() : '',
          value: transactionData.value || '0',
          tokenAddress: transactionData.tokenAddress || null,
          tokenSymbol: transactionData.tokenSymbol || 'ETH',
          blockNumber: transactionData.blockNumber || 0,
          timestamp: transactionData.timestamp || new Date(),
          type: transactionData.type || 'SEND',
          status: transactionData.status || 'CONFIRMED',
          gasUsed: transactionData.gasUsed || null,
          gasPrice: transactionData.gasPrice || null
      };

      // Add transaction to user's transaction history
      user.transactionHistory.push(newTransaction);

      // Save the updated user document
      await user.save();

      return res.status(200).json({ 
          success: true, 
          message: 'Transaction logged successfully',
          transaction: newTransaction
      });
  } catch (error) {
      console.error('Transaction Logging Error:', error);

      // Handle validation errors
      if (error.name === 'ValidationError') {
          return res.status(400).json({ 
              success: false, 
              message: 'Invalid transaction data',
              errors: Object.values(error.errors).map(err => err.message)
          });
      }

      // Generic server error
      return res.status(500).json({ 
          success: false, 
          message: 'Server error logging transaction',
          error: error.message 
      });
  }
});
// Notification Preferences Routes
app.get('/api/users/notification-preferences', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Normalize wallet address (lowercase)
    const normalizedWalletAddress = walletAddress.toLowerCase();

    // Find the user by wallet address, case-insensitive
    const user = await User.findOne({ 
      walletAddress: { $regex: new RegExp(`^${normalizedWalletAddress}$`, 'i') } 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the user's notification preferences
    return res.status(200).json({
      generalNotifications: user.generalNotifications || false,
      transactionNotifications: user.transactionNotifications || false,
      marketNotifications: user.marketNotifications || false,
      chatNotifications: user.chatNotifications || false
    });
  } catch (error) {
    console.error('Error retrieving notification preferences:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Updated Notification Preferences Update Route
app.put('/api/users/notification-preferences', async (req, res) => {
  try {
    const { 
      walletAddress, 
      generalNotifications, 
      transactionNotifications, 
      marketNotifications, 
      chatNotifications,
      emailNotifications,
      pushNotifications,
      smsNotifications,
      preferredNotificationChannels
    } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ message: 'Wallet address is required' });
    }

    // Normalize wallet address (lowercase)
    const normalizedWalletAddress = walletAddress.toLowerCase();

    // Find and update the user
    const user = await User.findOneAndUpdate(
      { walletAddress: { $regex: new RegExp(`^${normalizedWalletAddress}$`, 'i') } },
      {
        generalNotifications,
        transactionNotifications,
        marketNotifications,
        chatNotifications,
        emailNotifications,
        pushNotifications,
        smsNotifications,
        preferredNotificationChannels
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated successfully',
      notificationPreferences: {
        generalNotifications: user.generalNotifications,
        transactionNotifications: user.transactionNotifications,
        marketNotifications: user.marketNotifications,
        chatNotifications: user.chatNotifications,
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        smsNotifications: user.smsNotifications,
        preferredNotificationChannels: user.preferredNotificationChannels
      }
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Default route
app.get('/', (req, res) => {
  res.send('Blockchain Notification API is running');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't exit the process as it would stop the server
});