const express = require('express');
const router = express.Router();
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
    const { walletAddress, signature, messageToSign } = req.body;

    console.log('Received registration request with:', {
      walletAddress,
      signature,
      messageToSign
    });

    // Verify the wallet signature
    const isValid = verifyWalletSignature(walletAddress, messageToSign, signature);

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Wallet verification failed' });
    }

    // Continue with registration logic...
    return res.status(200).json({ success: true, message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;