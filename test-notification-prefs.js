const axios = require('axios');
const walletData = require('./generate-test-wallet');

async function testNotificationPreferences() {
  try {
    const walletAddress = walletData.walletAddress;
    
    console.log('Testing notification preferences update:');
    console.log('Wallet Address:', walletAddress);
    
    // Make the API request to update notification preferences
    console.log('\nSending notification preferences update request...');
    const response = await axios.post('http://localhost:3000/api/users/notifications', {
      walletAddress: walletAddress,
      notificationsEnabled: false
    });
    
    console.log('\nUpdate successful!');
    console.log('API Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('\nUpdate failed:');
    if (error.response) {
      console.error('Error data:', error.response.data);
      console.error('Status code:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
  }
}

testNotificationPreferences();