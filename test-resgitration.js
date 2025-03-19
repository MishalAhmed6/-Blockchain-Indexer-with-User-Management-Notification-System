const axios = require('axios');
const ethers = require('ethers');
const walletData = require('./generate-test-wallet');

async function testUserRegistration() {
  try {
    // Use the wallet from the first script
    const wallet = walletData.wallet;
    const message = walletData.message;
    
    // Sign the message
    const signature = await wallet.signMessage(message);
    
    console.log('Generated test data:');
    console.log('Wallet Address:', wallet.address);
    console.log('Signature:', signature);
    
    // Make the API request to register the user
    console.log('\nSending registration request...');
    const response = await axios.post('http://localhost:3000/api/users/register', {
      name: 'Test User',
      email: 'testuser@example.com',
      walletAddress: wallet.address,
      fcmToken: 'test-fcm-token-123', // In a real app, this would come from Firebase
      signature: signature
    });
    
    console.log('\nRegistration successful!');
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('\nRegistration failed:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error data:', error.response.data);
      console.error('Status code:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
  }
}


testUserRegistration();