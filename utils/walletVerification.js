const ethers = require('ethers');

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