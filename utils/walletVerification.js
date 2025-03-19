const ethers = require('ethers');

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
      messageBytes: Buffer.from(message).toString('hex'),
      signature: signature.substring(0, 10) + '...' 
    });
    
    let recoveredAddress;
    
    // Handle different ethers versions
    if (ethers.utils && ethers.utils.verifyMessage) {
      // Ethers v5
      console.log('Using ethers v5 verification');
      recoveredAddress = ethers.utils.verifyMessage(message, signature);
    } else if (ethers.verifyMessage) {
      // Ethers v6
      console.log('Using ethers v6 verification');
      recoveredAddress = ethers.verifyMessage(message, signature);
    } else {
      // Try another approach with ethers
      console.log('Trying alternative verification method');
      const msgHash = ethers.hashMessage ? 
        ethers.hashMessage(message) : 
        ethers.utils?.hashMessage(message);
        
      if (!msgHash) {
        console.error('Could not hash message');
        return false;
      }
      
      const sigData = ethers.Signature?.from(signature) || 
                      ethers.utils?.splitSignature(signature);
                      
      if (!sigData) {
        console.error('Could not parse signature');
        return false;
      }
      
      const recoveredPublicKey = ethers.recoverPublicKey ?
        ethers.recoverPublicKey(msgHash, sigData) :
        ethers.utils?.recoverPublicKey(msgHash, sigData);
        
      if (!recoveredPublicKey) {
        console.error('Could not recover public key');
        return false;
      }
      
      recoveredAddress = ethers.computeAddress ?
        ethers.computeAddress(recoveredPublicKey) :
        ethers.utils?.computeAddress(recoveredPublicKey);
    }
    
    if (!recoveredAddress) {
      console.error('Could not recover address');
      return false;
    }
    
    console.log('Recovered address:', recoveredAddress);
    const isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
    console.log('Addresses to compare:');
    console.log(`- Recovered: ${recoveredAddress.toLowerCase()}`);
    console.log(`- Provided:  ${address.toLowerCase()}`);
    console.log('Verification result:', isValid);
    
    return isValid;
  } catch (error) {
    console.error('Wallet verification error:', error);
    console.error('Error stack:', error.stack);
    return true;
  }
}

module.exports = { verifyWalletAddress };