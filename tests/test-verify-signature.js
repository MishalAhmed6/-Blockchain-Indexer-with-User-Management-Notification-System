// Include all required dependencies directly
const ethers = require('ethers');

// First, let's define the verification function inside the test file to avoid import issues
// Copy of your verification function with slight modifications
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
    return false;
  }
}

async function runVerificationTest() {
  console.log('=== WALLET VERIFICATION TEST ===');
  
  // First, determine which version of ethers we're using
  console.log('Ethers Version Check:');
  console.log('- ethers.version:', ethers.version || 'undefined');
  console.log('- ethers.utils exists:', !!ethers.utils);
  console.log('- ethers.verifyMessage exists:', !!ethers.verifyMessage);
  
  // Step 1: Generate a new wallet
  console.log('\nStep 1: Creating test wallet...');
  let wallet;
  
  try {
    // Handle different ethers versions
    if (ethers.Wallet && ethers.Wallet.createRandom) {
      wallet = ethers.Wallet.createRandom();
    } else if (ethers.wallet && ethers.wallet.createRandom) {
      wallet = ethers.wallet.createRandom();
    } else {
      console.error('Could not create wallet - ethers version incompatibility');
      return;
    }
    
    console.log(`Generated wallet address: ${wallet.address}`);
  } catch (error) {
    console.error('Error creating wallet:', error);
    return;
  }
  
  // Step 2: Create a test message
  const testMessage = "Hello, this is a test message for signature verification.";
  console.log(`\nStep 2: Test message: "${testMessage}"`);
  
  // Step 3: Sign the message
  console.log('\nStep 3: Signing message...');
  let signature;
  
  try {
    // Handle different ethers versions
    if (wallet.signMessage) {
      signature = await wallet.signMessage(testMessage);
    } else if (wallet._signingKey && wallet._signingKey().signMessage) {
      signature = await wallet._signingKey().signMessage(testMessage);
    } else {
      console.error('Could not find signMessage method');
      console.log('Available wallet methods:', Object.keys(wallet));
      return;
    }
    
    console.log(`Signature generated: ${signature.substring(0, 10)}...`);
  } catch (error) {
    console.error('Error signing message:', error);
    return;
  }
  
  // Step 4: Verify using ethers directly (as a reference)
  console.log('\nStep 4: Verifying with ethers directly...');
  let directVerification = false;
  try {
    let recoveredAddress;
    
    if (ethers.utils && ethers.utils.verifyMessage) {
      // Ethers v5
      recoveredAddress = ethers.utils.verifyMessage(testMessage, signature);
    } else if (ethers.verifyMessage) {
      // Ethers v6
      recoveredAddress = ethers.verifyMessage(testMessage, signature);
    } else {
      console.error('Could not find verifyMessage method');
      return;
    }
    
    directVerification = recoveredAddress.toLowerCase() === wallet.address.toLowerCase();
    console.log('Direct verification result:', directVerification);
    console.log(`- Recovered address: ${recoveredAddress}`);
    console.log(`- Original address:  ${wallet.address}`);
  } catch (error) {
    console.error('Error with direct verification:', error);
  }
  
  // Step 5: Verify using your function
  console.log('\nStep 5: Verifying with your function...');
  const isValid = await verifyWalletAddress(wallet.address, testMessage, signature);
  console.log('Your function verification result:', isValid);
  
  // Step 6: Compare results
  console.log('\nStep 6: Comparison');
  if (directVerification && isValid) {
    console.log('✅ Both methods verified successfully');
  } else if (directVerification && !isValid) {
    console.log('❌ Direct verification worked but your function failed');
    console.log('   This suggests an issue with your verification function');
  } else if (!directVerification && isValid) {
    console.log('⚠️ Strange: Your function verified but direct verification failed');
  } else {
    console.log('❌ Both verification methods failed');
    console.log('   This suggests an issue with the signature generation');
  }
  
  // Return test data for further examination
  return {
    wallet: wallet.address,
    message: testMessage,
    signature: signature,
    directVerification,
    functionVerification: isValid
  };
}

// Run the test
runVerificationTest()
  .then(results => {
    console.log('\n=== TEST COMPLETED ===');
    console.log('Test Data:', JSON.stringify(results, null, 2));
  })
  .catch(error => {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error);
  });