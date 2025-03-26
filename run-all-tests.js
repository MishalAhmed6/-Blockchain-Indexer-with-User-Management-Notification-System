const ethers = require('ethers');
const axios = require('axios');
const { sendTransactionNotification } = require('./services/notificationService');

async function runAllTests() {
  try {
    // Step 1: Generate a test wallet
    console.log('STEP 1: GENERATING TEST WALLET');
    console.log('==============================');
    const wallet = ethers.Wallet.createRandom();
    const message = "Verify wallet ownership for blockchain-notification-system";
    
    console.log('Wallet Address:', wallet.address);
    console.log('Private Key:', wallet.privateKey);
    console.log('Message to Sign:', message);
    
    // Step 2: Sign the message
    console.log('\nSTEP 2: SIGNING MESSAGE');
    console.log('======================');
    const signature = await wallet.signMessage(message);
    console.log('Signature:', signature);
    
    // Step 3: Register a new user
    console.log('\nSTEP 3: REGISTERING USER');
    console.log('=======================');
    try {
      const registerResponse = await axios.post('http://localhost:3000/api/users/register', {
        name: 'Complete Test User',
        email: 'completetest@example.com',
        walletAddress: wallet.address,
        fcmToken: 'complete-test-fcm-token-123',
        signature: signature,
        messageToSign: message  // Add this line to include the message
      });
      
      console.log('Registration successful!');
      console.log('API Response:', registerResponse.data);
    } catch (error) {
      console.error('Registration failed:');
      if (error.response) {
        console.error('Error data:', error.response.data);
        console.error('Full error response:', error.response);
      } else {
        console.error('Error:', error.message);
      }
      // Continue with tests even if this one fails
    }
    
    // Step 4: Update notification preferences
    console.log('\nSTEP 4: UPDATING NOTIFICATION PREFERENCES');
    console.log('======================================');
    try {
      const prefResponse = await axios.post('http://localhost:3000/api/users/notifications', {
        walletAddress: wallet.address,
        notificationsEnabled: false
      });
      
      console.log('Update successful!');
      console.log('API Response:', prefResponse.data);
    } catch (error) {
      console.error('Update failed:');
      if (error.response) {
        console.error('Error data:', error.response.data);
      } else {
        console.error('Error:', error.message);
      }
      // Continue with tests even if this one fails
    }
    
    // Step 5: Test notification sending
    console.log('\nSTEP 5: TESTING NOTIFICATION SENDING');
    console.log('==================================');
    try {
      // Create a mock transaction
      const mockTransaction = {
        hash: '0x' + '1'.repeat(64),
        from: wallet.address,
        to: '0x' + '2'.repeat(40),
        amount: '0.5',
        timestamp: Date.now()
      };
      
      console.log('Mock Transaction:', mockTransaction);
      
      // Try to send a notification
      console.log('\nSending test notification...');
      await sendTransactionNotification(wallet.address, mockTransaction);
      
      console.log('Notification sent successfully!');
    } catch (error) {
      console.error('Notification sending failed:');
      console.error('Error:', error);
    }
    
    console.log('\nALL TESTS COMPLETED');
  } catch (error) {
    console.error('TEST SUITE FAILED:');
    console.error('Error:', error);
  }
}

// Make sure to install axios before running this test
// npm install axios
// Run the tests
runAllTests();