const ethers = require('ethers');

/**
 * Verifies a wallet address using signature verification
 * @param {string} walletAddress - The wallet address to verify
 * @param {string} signature - The signature provided by the user
 * @param {string} message - The message that was signed
 * @returns {boolean} - True if verification is successful, false otherwise
 */
const verifyWalletAddress = (walletAddress, signature, message) => {
  try {
    
    const messageHash = ethers.utils.hashMessage(message);
    
    // Recover the address from the signature
    const recoveredAddress = ethers.utils.recoverAddress(messageHash, signature);
    
    // Check if the recovered address matches the provided wallet address
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
  } catch (error) {
    console.error('Wallet verification error:', error);
    return false;
  }
};

module.exports = { verifyWalletAddress };