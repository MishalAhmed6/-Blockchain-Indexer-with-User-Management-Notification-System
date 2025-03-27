const connectDB = require('C:/Users/Laptop Gallery/blockchain-notification-system/config/db.js'); // adjust path as needed
const BlockchainListener = require('C:/Users/Laptop Gallery/blockchain-notification-system/services/BlockchainListener.js');

async function initializeApplication() {
  try {
    // Connect to MongoDB first
    await connectDB();

    // Then start your blockchain listener
    const blockchainListener = new BlockchainListener();
    blockchainListener.start(); // or whatever method initializes your listener
  } catch (error) {
    console.error('Application initialization failed:', error);
  }
}

initializeApplication();