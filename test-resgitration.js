// test-registration.js
const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:3000/api/users/register';
const MESSAGE_TO_SIGN = 'Verify wallet ownership for blockchain-notification-system';

async function testRegistration() {
  try {
    console.log('Save these details for subsequent test steps');
    console.log('Generated test data:');
    
    // Import ethers and determine version
    let ethers;
    try {
      ethers = require('ethers');
      console.log('Ethers version:', ethers.version || 'Unknown');
    } catch (error) {
      console.error('Error importing ethers:', error);
      process.exit(1);
    }
    
    // Create a new wallet for testing - handle both v5 and v6
    let wallet;
    if (ethers.Wallet && ethers.Wallet.createRandom) {
      // Ethers v5
      wallet = ethers.Wallet.createRandom();
    } else if (ethers.wallet && ethers.wallet.createRandom) {
      // Ethers v6
      wallet = ethers.wallet.createRandom();
    } else {
      throw new Error('Could not find Wallet.createRandom method');
    }
    
    const walletAddress = wallet.address;
    console.log('Wallet Address:', walletAddress);
    
    // Sign the message
    const signature = await wallet.signMessage(MESSAGE_TO_SIGN);
    console.log('Signature:', signature);
    
    // Verify the signature on the client side first
    let recoveredAddress;
    if (ethers.utils && ethers.utils.verifyMessage) {
      // Ethers v5
      console.log('Using ethers v5 verification method');
      recoveredAddress = ethers.utils.verifyMessage(MESSAGE_TO_SIGN, signature);
    } else if (ethers.verifyMessage) {
      // Ethers v6
      console.log('Using ethers v6 verification method');
      recoveredAddress = ethers.verifyMessage(MESSAGE_TO_SIGN, signature);
    } else {
      throw new Error('Could not find verifyMessage method');
    }
    
    console.log('Recovered Address:', recoveredAddress);
    console.log('Verification Match:', recoveredAddress.toLowerCase() === walletAddress.toLowerCase());
    
    // Prepare registration data
    const registrationData = {
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      fcmToken: 'test-fcm-token',
      walletAddress: walletAddress,
      signature: signature,
      messageToSign: MESSAGE_TO_SIGN
    };
    
    console.log('Sending registration request...');
    const response = await axios.post(API_URL, registrationData);
    
    console.log('Registration successful!');
    console.log('Response:', response.data);
    
    return {
      walletAddress,
      signature,
      messageToSign: MESSAGE_TO_SIGN
    };
  } catch (error) {
    console.log('Registration failed:');
    if (error.response) {
      console.log('Error data:', error.response.data);
      console.log('Status code:', error.response.status);
    } else {
      console.log('Error:', error.message);
      console.log('Error stack:', error.stack);
    }
    return null;
  }
}

// Run the test
testRegistration();