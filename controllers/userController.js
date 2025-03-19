// Enhanced userController.js with detailed logging
const { verifyWalletAddress } = require('../utils/walletVerification');

exports.registerUser = async (req, res) => {
  // In userController.js - replace your verification with this:
try {
    const { walletAddress, signature, messageToSign } = req.body;
    
    console.log('Verification attempt with:', {
      address: walletAddress,
      message: messageToSign,
      signature: signature
    });
    
    // Direct implementation using ethers v6
    const ethers = require('ethers');
    
    // Try both v5 and v6 methods
    let recoveredAddress;
    try {
      if (ethers.utils && ethers.utils.verifyMessage) {
        recoveredAddress = ethers.utils.verifyMessage(messageToSign, signature);
      } else {
        recoveredAddress = ethers.verifyMessage(messageToSign, signature);
      }
      
      console.log('Recovered address:', recoveredAddress);
      console.log('Expected address:', walletAddress);
      
      // In your test-registration.js, add this before sending the request
       
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({ message: 'Wallet verification failed - address mismatch' });
      }
    } catch (error) {
      console.error('Verification error:', error);
      return res.status(401).json({ message: 'Wallet verification failed - error during verification' });
    }
    
    // If we get here, verification succeeded
    console.log('Wallet verification succeeded!');
    
    // Continue with your registration process...
    
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error' });
  } 
}