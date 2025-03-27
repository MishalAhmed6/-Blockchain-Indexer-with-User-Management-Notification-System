const { ethers } = require('ethers');
const axios = require('axios');

const { expect } = require('chai');

async function testBlockchainAPIs() {
  try {
    // Create a wallet (for testing)
    const wallet = ethers.Wallet.createRandom();
    const walletAddress = wallet.address;
    const privateKey = wallet.privateKey;

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

    // Test transaction logging
    const transactionData = {
        hash: '0x1234567890abcdef',
        from: walletAddress,
        to: '0x9876543210abcdef',
        value: '1.5',
        tokenAddress: null,
        tokenSymbol: 'ETH',
        blockNumber: 123456,
        timestamp: Math.floor(Date.now() / 1000),
        type: 'SEND',
        status: 'CONFIRMED',
        gasUsed: 21000,
        gasPrice: '5000000000'
    };

    const logTransactionResponse = await axios.post(
        'http://localhost:3000/api/users/log-transaction',
        {
            walletAddress,
            transactionData
        }
    );
    console.log('Transaction Logging:', logTransactionResponse.data);

    // Test transaction notification
    const notifyTransactionResponse = await axios.post(
        'http://localhost:3000/api/users/notify-transaction',
        {
            walletAddress,
            transactionHash: '0x1234567890abcdef'
        }
    );
    console.log('Transaction Notification:', notifyTransactionResponse.data);

    // Test sending a transaction
    const sendTransactionResponse = await axios.post(
        'http://localhost:3000/api/users/send-transaction',
        {
            from: walletAddress,
            to: '0x9876543210abcdef',
            value: '0.1',
            privateKey,
            walletAddress
        }
    );
    console.log('Send Transaction:', sendTransactionResponse.data);

    // Test error cases
    try {
        // Test missing fields in transaction logging
        await axios.post(
            'http://localhost:3000/api/users/log-transaction',
            { walletAddress }
        );
    } catch (error) {
        console.log('Transaction Logging Error (Expected):', error.response.data);
    }

    try {
        // Test invalid transaction hash
        await axios.post(
            'http://localhost:3000/api/users/notify-transaction',
            {
                walletAddress,
                transactionHash: 'invalid_hash'
            }
        );
    } catch (error) {
        console.log('Transaction Notification Error (Expected):', error.response.data);
    }

    try {
        // Test invalid private key
        await axios.post(
            'http://localhost:3000/api/users/send-transaction',
            {
                from: walletAddress,
                to: '0x9876543210abcdef',
                value: '0.1',
                privateKey: 'invalid_private_key',
                walletAddress
            }
        );
    } catch (error) {
        console.log('Send Transaction Error (Expected):', error.response.data);
    }

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