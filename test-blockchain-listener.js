// test-blockchain-listener.js
require('dotenv').config();
const BlockchainListener = require('./src/services/BlockchainListener');

// Get RPC WebSocket URL from environment variable
const WEB3_WEBSOCKET_URL = process.env.WEB3_WEBSOCKET_URL;

if (!WEB3_WEBSOCKET_URL) {
  console.error('Please set WEB3_WEBSOCKET_URL in your .env file');
  process.exit(1);
}

// Create and initialize the blockchain listener
const listener = new BlockchainListener(WEB3_WEBSOCKET_URL, {
  blockConfirmations: 1,
  reconnectDelay: 5000,
  maxReconnectAttempts: 5,
  walletSyncInterval: 60 * 1000, // 1 minute
  pollInterval: 4000 // 4 seconds (backup polling)
});

// Start listening
listener.initialize().then(() => {
  console.log('Blockchain listener started successfully');
  
  // Optional: Add some test wallets to the listener for testing
  listener.registeredWallets.add('0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'.toLowerCase()); 
  console.log('Added test wallet for monitoring');
  
  // Check pending transactions periodically
  setInterval(() => {
    listener.checkPendingTransactions();
  }, 30000); // Check every 30 seconds
}).catch(error => {
  console.error('Failed to initialize blockchain listener:', error);
});

// Handle application shutdown
process.on('SIGINT', () => {
  console.log('Shutting down blockchain listener...');
  listener.cleanup();
  process.exit(0);
});