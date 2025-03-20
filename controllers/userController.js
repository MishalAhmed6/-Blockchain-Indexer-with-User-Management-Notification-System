const { verifyWalletAddress } = require('../utils/walletVerification');
exports.registerUser = async (req, res) => {
    try {
      const { name, email, fcmToken, walletAddress, signature, messageToSign } = req.body;
  
      console.log('Received registration request with:', {
        name,
        email,
        fcmToken,
        walletAddress,
        signature,
        messageToSign
      });
  
      // Validate required fields
      if (!name || !email || !fcmToken || !walletAddress || !signature || !messageToSign) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
  
      // Verify wallet address
      const ethers = require('ethers');
      console.log('Ethers version in userController:', ethers.version || 'Unknown');
  
      let recoveredAddress;
      try {
        if (ethers.utils && ethers.utils.verifyMessage) {
          // Ethers v5
          console.log('Using ethers v5 verification');
          recoveredAddress = ethers.utils.verifyMessage(messageToSign, signature);
        } else {
          // Ethers v6
          console.log('Using ethers v6 verification');
          recoveredAddress = ethers.verifyMessage(messageToSign, signature);
        }
  
        console.log('Recovered address:', recoveredAddress);
        console.log('Expected address:', walletAddress);
  
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          console.log('Address mismatch:', {
            recovered: recoveredAddress.toLowerCase(),
            expected: walletAddress.toLowerCase()
          });
          return res.status(401).json({ success: false, message: 'Wallet verification failed - address mismatch' });
        }
      } catch (error) {
        console.error('Verification error:', error);
        return res.status(401).json({ success: false, message: 'Wallet verification failed - error during verification' });
      }
  
      console.log('Wallet verification succeeded!');
  
      // Check if the wallet address is already registered
      const existingUser = await User.findOne({ walletAddress });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Wallet address already registered' });
      }
  
      // Create a new user
      const newUser = new User({
        name,
        email,
        walletAddress,
        fcmToken,
        notificationsEnabled: true,
        lastActivityTimestamp: Date.now()
      });
  
      await newUser.save();
  
      // Return success response
      return res.status(200).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };