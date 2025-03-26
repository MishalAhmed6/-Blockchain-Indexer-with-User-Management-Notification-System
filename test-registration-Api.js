const { ethers } = require('ethers');
const axios = require('axios');

async function invokeRegistration() {
  try {
    // Create a wallet (for testing)
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;

    // Prepare message to sign
    const messageToSign = `Register to our platform: ${Date.now()}`;

    // Sign the message
    const signature = await wallet.signMessage(messageToSign);

    // Prepare registration payload
    const payload = {
      walletAddress,
      signature,
      messageToSign,
      // Add required fields
      fcmToken: 'test-fcm-token-' + Date.now(),
      email: `user-${Date.now()}@example.com`,
      name: `User ${Math.floor(Math.random() * 1000)}`
    };

    // API endpoint (ensure this matches your actual setup)
    const apiUrl = 'http://localhost:3000/api/users/register';

    console.log('Sending request to:', apiUrl);
    console.log('Payload:', payload);

    // Send registration request
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Log successful response
    console.log('Registration Response:', {
      status: response.status,
      data: response.data
    });

  } catch (error) {
    // Handle errors with more detailed logging
    if (error.response) {
      console.error('Registration Error:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

// Multiple invocation test function
async function testMultipleRegistrations() {
  console.log('Starting multiple registration tests...');

  // Test 1: First registration
  console.log('\nTest 1: First Registration');
  await invokeRegistration();

  // Test 2: Repeat same wallet registration
  console.log('\nTest 2: Repeat Registration');
  await invokeRegistration();
}

// Run the tests
testMultipleRegistrations().catch(console.error);