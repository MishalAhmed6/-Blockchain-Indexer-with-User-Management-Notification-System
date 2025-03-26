const { ethers } = require('ethers');

async function verifyWalletAddress(address, message, signature) {
  try {
    console.log('====== VERIFICATION DEBUG ======');
    
    // Make sure all parameters exist
    if (!address || !message || !signature) {
      console.log('Missing parameters:', { 
        address: !!address, 
        message: !!message, 
        signature: !!signature 
      });
      return false;
    }

    // Log parameters for debugging
    console.log('Raw verification parameters:', { 
      address, 
      message, 
      signature: signature.substring(0, 10) + '...' 
    });
    
    // In Ethers v6, verifyMessage is directly available
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    console.log('Recovered address:', recoveredAddress);
    const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
    
    console.log('Addresses to compare:');
    console.log(`- Recovered: ${recoveredAddress.toLowerCase()}`);
    console.log(`- Provided:  ${address.toLowerCase()}`);
    console.log('Verification result:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Wallet verification error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Example route handler
async function registerUser(req, res) {
  const { walletAddress, signature, messageToSign } = req.body;

  try {
    // Verify signature
    const isSignatureValid = await verifyWalletAddress(
      walletAddress, 
      messageToSign, 
      signature
    );

    if (!isSignatureValid) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid signature' 
      });
    }

    // Proceed with user registration
    // ... (your existing registration logic)
    
    res.status(200).json({ 
      success: true, 
      message: 'User registered successfully' 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
}

module.exports = {
  verifyWalletAddress,
  registerUser
};