const express = require('express');
const router = express.Router();
const BlockchainListener = require('../services/BlockchainListener');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const ethers = require('ethers');
const admin = require('firebase-admin');

// Blockchain Listener Initialization
let blockchainListener = null;

// Utility function to initialize BlockchainListener
async function initializeBlockchainListener() {
    if (!blockchainListener) {
        const alchemyUrl = process.env.ALCHEMY_WEBSOCKET_URL;
        blockchainListener = new BlockchainListener(alchemyUrl, User);
        
        try {
            await blockchainListener.connect();
            await blockchainListener.initialize();
            
            // Set up transaction event listener
            blockchainListener.on('transaction', async (txDetails) => {
                try {
                    // Find relevant users for this transaction
                    const relevantUsers = await blockchainListener.findRelevantUsers(txDetails.from);
                    
                    // Send notifications to relevant users
                    for (const user of relevantUsers) {
                        // Update user's transaction notifications
                        await User.findByIdAndUpdate(user._id, {
                            $push: {
                                transactionNotifications: {
                                    from: txDetails.from,
                                    to: txDetails.to,
                                    value: txDetails.value,
                                    blockNumber: txDetails.blockNumber,
                                    timestamp: txDetails.timestamp
                                }
                            }
                        });
                    }
                } catch (error) {
                    console.error('Error processing transaction notification:', error);
                }
            });

            await blockchainListener.startListening();
            console.log('Blockchain Listener initialized and started');
        } catch (error) {
            console.error('Failed to initialize Blockchain Listener:', error);
        }
    }
    return blockchainListener;
}

// Wallet Signature Verification Utility
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

// Blockchain Listener Routes
router.post('/blockchain/start', async (req, res) => {
    try {
        const listener = await initializeBlockchainListener();
        res.status(200).json({ 
            message: 'Blockchain Listener started',
            lastProcessedBlock: listener.lastProcessedBlock
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to start Blockchain Listener',
            error: error.message 
        });
    }
});

router.post('/blockchain/stop', (req, res) => {
    if (blockchainListener) {
        blockchainListener.stopListening();
        blockchainListener = null;
        res.status(200).json({ message: 'Blockchain Listener stopped' });
    } else {
        res.status(400).json({ message: 'No active Blockchain Listener' });
    }
});

router.get('/blockchain/status', (req, res) => {
    if (blockchainListener) {
        res.status(200).json({ 
            isListening: blockchainListener.isListening,
            lastProcessedBlock: blockchainListener.lastProcessedBlock,
            options: blockchainListener.options
        });
    } else {
        res.status(200).json({ 
            isListening: false,
            message: 'Blockchain Listener is not active' 
        });
    }
});

router.get('/blockchain/recent-transactions', async (req, res) => {
  try {
      const { page = 1, limit = 10, walletAddress } = req.query;
      
      if (!walletAddress) {
          return res.status(400).json({ message: 'Wallet address is required' });
      }

      // Find user and paginate transaction notifications
      const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Slice the array manually
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + parseInt(limit);
      const paginatedTransactions = user.transactionNotifications.slice(startIndex, endIndex);

      const totalTransactions = user.transactionNotifications.length;

      res.status(200).json({
          transactions: paginatedTransactions,
          totalPages: Math.ceil(totalTransactions / limit),
          currentPage: page
      });
  } catch (error) {
      res.status(500).json({ 
          message: 'Error fetching transactions',
          error: error.message 
      });
  }
});
router.put('/blockchain/config', (req, res) => {
    if (!blockchainListener) {
        return res.status(400).json({ message: 'Blockchain Listener not initialized' });
    }

    try {
        // Update options
        const { pollingInterval, verbose } = req.body;
        
        if (pollingInterval) {
            blockchainListener.options.pollingInterval = pollingInterval;
        }
        
        if (verbose !== undefined) {
            blockchainListener.options.verbose = verbose;
        }

        res.status(200).json({ 
            message: 'Configuration updated',
            newConfig: blockchainListener.options 
        });
    } catch (error) {
        res.status(500).json({ 
            message: 'Failed to update configuration',
            error: error.message 
        });
    }
});

// User Registration Routes
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
router.post('/blockchain/log-transaction', async (req, res) => {
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
router.post('/notifications/register-device', async (req, res) => {
  try {
      const { userId, token } = req.body;

      // Validate input
      if (!userId || !token) {
          return res.status(400).json({ 
              success: false, 
              message: 'User ID and token are required' 
          });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ 
              success: false, 
              message: 'User not found' 
          });
      }

      // Register device token
      await notificationService.registerDeviceToken(userId, token);

      res.status(200).json({ 
          success: true, 
          message: 'Device token registered successfully' 
      });
  } catch (error) {
      console.error('Device Token Registration Error:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Error registering device token',
          error: error.message 
      });
  }
});

router.post('/notifications/unregister-device', async (req, res) => {
  try {
      const { userId } = req.body;

      // Validate input
      if (!userId) {
          return res.status(400).json({ 
              success: false, 
              message: 'User ID is required' 
          });
      }

      // Find user
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ 
              success: false, 
              message: 'User not found' 
          });
      }

      // Unregister device token
      await notificationService.unregisterDeviceToken(userId);

      res.status(200).json({ 
          success: true, 
          message: 'Device token unregistered successfully' 
      });
  } catch (error) {
      console.error('Device Token Unregistration Error:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Error unregistering device token',
          error: error.message 
      });
  }
});

router.post('/notifications/send-test', async (req, res) => {
  try {
      const { userId } = req.body;

      // Find user
      const user = await User.findById(userId);
      if (!user) {
          return res.status(404).json({ 
              success: false, 
              message: 'User not found' 
          });
      }

      // Check if FCM token exists
      if (!user.fcmToken) {
          return res.status(400).json({ 
              success: false, 
              message: 'No FCM token registered for this user' 
          });
      }

      // Send test notification
      const testPayload = {
          token: user.fcmToken,
          notification: {
              title: 'Test Notification',
              body: 'This is a test notification from your blockchain app'
          },
          data: {
              type: 'test',
              timestamp: new Date().toISOString()
          }
      };

      const response = await notificationService.sendTransactionNotification(testPayload);

      res.status(200).json({ 
          success: true, 
          message: 'Test notification sent successfully',
          response 
      });
  } catch (error) {
      console.error('Test Notification Error:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Error sending test notification',
          error: error.message 
      });
  }
});

// API to log a transaction
router.post('/transactions/log', async (req, res) => {
    try {
        const {
            walletAddress,
            transactionData
        } = req.body;

        // Find the user
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add transaction to user's transaction history
        user.transactionHistory.push({
            hash: transactionData.hash,
            from: transactionData.from,
            to: transactionData.to,
            value: transactionData.value,
            tokenAddress: transactionData.tokenAddress,
            tokenSymbol: transactionData.tokenSymbol,
            blockNumber: transactionData.blockNumber,
            timestamp: transactionData.timestamp,
            type: transactionData.type,
            status: transactionData.status,
            gasUsed: transactionData.gasUsed,
            gasPrice: transactionData.gasPrice
        });

        await user.save();
        res.status(201).json({ 
            message: 'Transaction logged successfully', 
            transaction: user.transactionHistory[user.transactionHistory.length - 1]
        });
    } catch (error) {
        console.error('Error logging transaction:', error);
        res.status(500).json({ message: 'Failed to log transaction', error: error.message });
    }
});

// API to send transaction notifications
router.post('/transactions/notify', async (req, res) => {
    try {
        const { transactionHash, walletAddress } = req.body;

        // Find the user
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Find the transaction in user's history
        const transaction = user.transactionHistory.find(tx => tx.hash === transactionHash);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check if user has notifications enabled and FCM token
        if (!user.notificationsEnabled || !user.fcmToken) {
            return res.status(400).json({ message: 'User notifications not enabled or FCM token missing' });
        }

        const isSender = user.walletAddress.toLowerCase() === transaction.from.toLowerCase();
        const isReceiver = user.walletAddress.toLowerCase() === transaction.to.toLowerCase();
        
        let title = 'Transaction Alert';
        let body = '';
        
        if (isSender) {
            body = `You sent ${transaction.value} ${transaction.tokenSymbol} to ${transaction.to}`;
        } else if (isReceiver) {
            body = `You received ${transaction.value} ${transaction.tokenSymbol} from ${transaction.from}`;
        }

        const message = {
            notification: {
                title,
                body
            },
            token: user.fcmToken
        };

        try {
            await admin.messaging().send(message);
            console.log(`Notification sent to user ${user._id}`);
            
            // Update transaction notification status
            transaction.notificationSent = true;
            await user.save();

            res.status(200).json({ 
                message: 'Notification sent successfully'
            });
        } catch (error) {
            console.error(`Failed to send notification to user ${user._id}:`, error);
            res.status(500).json({ message: 'Failed to send notification', error: error.message });
        }
    } catch (error) {
        console.error('Error processing notification:', error);
        res.status(500).json({ message: 'Failed to process notification', error: error.message });
    }
});

// API to make a transaction
router.post('/transactions/send', async (req, res) => {
    try {
        const { from, to, value, privateKey, walletAddress } = req.body;

        // Create Web3 provider
        const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_HTTP_URL);
        
        // Create wallet instance
        const wallet = new ethers.Wallet(privateKey, provider);

        // Create transaction object
        const tx = {
            to,
            value: ethers.utils.parseEther(value)
        };

        // Send transaction
        const transaction = await wallet.sendTransaction(tx);
        
        // Wait for transaction to be mined
        const receipt = await transaction.wait();

        // Find user and log the transaction
        const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const block = await provider.getBlock(receipt.blockNumber);
        user.transactionHistory.push({
            hash: transaction.hash,
            from,
            to,
            value,
            blockNumber: receipt.blockNumber,
            timestamp: block.timestamp,
            type: 'SEND',
            status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
            gasUsed: receipt.gasUsed,
            gasPrice: transaction.gasPrice.toString()
        });

        await user.save();

        res.status(200).json({
            message: 'Transaction sent successfully',
            transactionHash: transaction.hash,
            receipt
        });
    } catch (error) {
        console.error('Error sending transaction:', error);
        res.status(500).json({ message: 'Failed to send transaction', error: error.message });
    }
});

module.exports = router;