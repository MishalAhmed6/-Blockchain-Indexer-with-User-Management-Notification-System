// First, let's determine which version of ethers we're using
console.log("=== Signature Verification Test ===");

// Try importing ethers in different ways
let ethers;
try {
  // Try direct import (ethers v5 style)
  ethers = require('ethers');
  console.log("Ethers version:", ethers.version || "Unknown");
} catch (error) {
  console.error("Error importing ethers:", error);
  process.exit(1);
}

async function testSignatureVerification() {
  try {
    const message = "Verify wallet ownership for blockchain-notification-system";
    const walletAddress = "0x786B443F4A3E472cA700989F8725494bC8F4D6ab";
    const signature = "0x54282478464386d93050f71f7e7a33963965de6acb60e7b89b52d9620ca3f20f448e84a1566397ddbc9e8fb8752437d8e585a8ff5dfaf748c24de74a66cc37131b";
    
    console.log(`Message to sign: ${message}`);
    console.log(`Wallet Address: ${walletAddress}`);
    console.log(`Signature: ${signature}`);
    
    let recoveredAddress;
    
    // Check if we're using ethers v5 or v6
    if (ethers.utils && ethers.utils.verifyMessage) {
      // Ethers v5
      console.log("Using ethers v5 verification method");
      recoveredAddress = ethers.utils.verifyMessage(message, signature);
    } else if (ethers.verifyMessage) {
      // Ethers v6
      console.log("Using ethers v6 verification method");
      recoveredAddress = ethers.verifyMessage(message, signature);
    } else {
      // Try another approach with ethers v5
      console.log("Trying alternative approach");
      const messageHash = ethers.utils?.hashMessage?.(message) || 
                          ethers.hashMessage?.(message);
      
      if (!messageHash) {
        throw new Error("Cannot hash message - ethers methods not found");
      }
      
      recoveredAddress = ethers.utils?.recoverAddress?.(messageHash, signature) || 
                         ethers.recoverAddress?.(messageHash, signature);
      
      if (!recoveredAddress) {
        throw new Error("Cannot recover address - ethers methods not found");
      }
    }
    
    console.log(`Recovered Address: ${recoveredAddress}`);
    
    console.log(`Verification Result: ${recoveredAddress.toLowerCase() === walletAddress.toLowerCase()}`);
  } catch (error) {
    console.error("Error during signature verification test:", error);
    console.error("Error stack:", error.stack);
  }
}

testSignatureVerification();