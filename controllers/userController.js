const User = require('../models/User');
const { verifyWalletAddress } = require('../utils/walletVerification');

// Register  new user
const registerUser = async (req, res) => {
  try {
    const { name, email, walletAddress, fcmToken, signature } = req.body;

    // Validation
    if (!name || !email || !walletAddress || !fcmToken || !signature) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ 
      $or: [
        { email },
        { walletAddress }
      ]
    });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Verify wallet ownership
    const message = `Verify wallet ownership for blockchain-notification-system`;
    const isVerified = verifyWalletAddress(walletAddress, signature, message);

    if (!isVerified) {
      return res.status(401).json({ message: 'Wallet verification failed' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      walletAddress,
      fcmToken,
      lastActivityTimestamp: new Date()
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      walletAddress: user.walletAddress,
      notificationsEnabled: user.notificationsEnabled
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    const { walletAddress, notificationsEnabled } = req.body;

    // Validation
    if (walletAddress === undefined || notificationsEnabled === undefined) {
      return res.status(400).json({ message: 'Both walletAddress and notificationsEnabled are required' });
    }

    // Find user by wallet address
    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update notification preferences
    user.notificationsEnabled = notificationsEnabled;
    user.lastActivityTimestamp = new Date();
    await user.save();

    res.status(200).json({
      _id: user._id,
      walletAddress: user.walletAddress,
      notificationsEnabled: user.notificationsEnabled
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { registerUser, updateNotificationPreferences };