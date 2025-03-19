const ethers = require('ethers');
const walletData = require('./generate-test-wallet');

async function signMessage() {
  try {
    const wallet = walletData.wallet;
    const message = walletData.message;
    
    // Sign the message
    const signature = await wallet.signMessage(message);
    
    console.log('Message Signature Generated:');
    console.log('Wallet Address:', wallet.address);
    console.log('Message:', message);
    console.log('Signature:', signature);
    
    return {
      walletAddress: wallet.address,
      message,
      signature
    };
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}


signMessage();