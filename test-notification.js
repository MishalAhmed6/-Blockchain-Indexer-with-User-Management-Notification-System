const { sendTransactionNotification } = require('./services/notificationService');
const walletData = require('./generate-test-wallet');

async function testSendNotification() {
  try {
    const walletAddress = walletData.walletAddress;
    
    // Create a mock transaction
    const mockTransaction = {
      hash: '0x' + '1'.repeat(64), // fake transaction hash
      from: walletAddress,
      to: '0x' + '2'.repeat(40), // fake recipient address
      amount: '0.1',
      timestamp: Date.now()
    };
    
    console.log('Testing transaction notification:');
    console.log('Wallet Address:', walletAddress);
    console.log('Transaction:', mockTransaction);
    
    // Send a test notification
    console.log('\nSending test notification...');
    await sendTransactionNotification(walletAddress, mockTransaction);
    
    console.log('\nNotification sent successfully!');
  } catch (error) {
    console.error('\nNotification sending failed:');
    console.error('Error:', error);
  }
}


testSendNotification();