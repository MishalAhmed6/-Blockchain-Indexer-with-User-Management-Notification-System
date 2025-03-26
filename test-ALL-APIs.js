const { ethers } = require('ethers');
const axios = require('axios');

async function testBlockchainAPIs() {
  try {
    // Create a wallet (for testing)
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;

    // Prepare message to sign
    const messageToSign = `Register to our platform: ${Date.now()}`;

    // Sign the message
    const signature = await wallet.signMessage(messageToSign);

    // First, register the user
    const registrationPayload = {
      walletAddress,
      signature,
      messageToSign,
      fcmToken: 'test-fcm-token-' + Date.now(),
      email: `user-${Date.now()}@example.com`,
      name: `User ${Math.floor(Math.random() * 1000)}`
    };

    const registrationResponse = await axios.post(
      'http://localhost:3000/api/users/register', 
      registrationPayload
    );

    console.log('User Registration:', registrationResponse.data);

    // Test starting blockchain listener
    const startListenerResponse = await axios.post(
      'http://localhost:3000/api/users/blockchain/start'
    );
    console.log('Blockchain Listener Start:', startListenerResponse.data);

    // Test getting blockchain listener status
    const statusResponse = await axios.get(
      'http://localhost:3000/api/users/blockchain/status'
    );
    console.log('Blockchain Listener Status:', statusResponse.data);

    // Test updating blockchain listener configuration
    const configUpdateResponse = await axios.put(
      'http://localhost:3000/api/users/blockchain/config',
      {
        pollingInterval: 5000,
        verbose: true
      }
    );
    console.log('Blockchain Listener Config Update:', configUpdateResponse.data);

    // Test notification preferences update
    const updatePreferencesPayload = {
      walletAddress,
      generalNotifications: false,
      transactionNotifications: false,
      marketNotifications: true,
      chatNotifications: true
    };

    const updateResponse = await axios.post(
      'http://localhost:3000/api/users/notification-preferences', 
      updatePreferencesPayload
    );
    console.log('Update Notification Preferences:', updateResponse.data);

   
   

    // Test stopping blockchain listener
    const stopListenerResponse = await axios.post(
      'http://localhost:3000/api/users/blockchain/stop'
    );
    console.log('Blockchain Listener Stop:', stopListenerResponse.data);

  } catch (error) {
    // Handle errors with more detailed logging
    if (error.response) {
      console.error('Error:', {
        status: error.response.status,
        data: error.response.data,
      });
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the tests
testBlockchainAPIs().catch(console.error);