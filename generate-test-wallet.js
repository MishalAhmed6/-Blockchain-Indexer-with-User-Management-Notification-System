const ethers = require('ethers');

function generateTestWallet() {
  const wallet = ethers.Wallet.createRandom();
  const message = "Verify wallet ownership for blockchain-notification-system";
  
  return {
    walletAddress: wallet.address,
    privateKey: wallet.privateKey,
    message: message,
    
    wallet: wallet
  };
}

const walletData = generateTestWallet();
console.log('Test Wallet Generated:');
console.log('Wallet Address:', walletData.walletAddress);
console.log('Private Key:', walletData.privateKey);
console.log('Message to Sign:', walletData.message);
console.log('\nSave these details for subsequent test steps');

module.exports = walletData;