const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class BlockchainListener {
  constructor(rpcUrl, options = {}) {
    this.rpcUrl = rpcUrl;
    this.options = {
      blockConfirmations: options.blockConfirmations || 1,
      reconnectDelay: options.reconnectDelay || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 5,
      walletSyncInterval: options.walletSyncInterval || 60 * 1000, // 1 minute
      pollInterval: options.pollInterval || 4000, // 4 seconds
    };
    this.registeredWallets = new Set();
    this.reconnectAttempts = 0;
    this.connectionActive = false;
    this.latestBlockProcessed = 0;
    this.provider = null;
    this.blockPollInterval = null;
    this.pendingTxs = new Map(); // Track pending transactions
  }

  async initialize() {
    try {
      // Create provider (v6 handles WebSockets differently)
      this.provider = await this.createProvider();
      
      // Initial load of registered wallets from database
      await this.syncWallets();
      
      // Set up periodic wallet sync
      this.walletSyncIntervalId = setInterval(() => {
        this.syncWallets();
      }, this.options.walletSyncInterval);
      
      // Get current block and start listening
      const currentBlock = await this.provider.getBlockNumber();
      this.latestBlockProcessed = currentBlock;
      console.log(`Starting to listen from block ${currentBlock}`);
      
      // Start listening to new blocks
      this.startListening();
      
      console.log("Blockchain listener initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing blockchain listener:", error);
      throw error;
    }
  }

  async createProvider() {
    try {
      // In v6, WebSocketProvider is created differently
      const provider = new ethers.WebSocketProvider(this.rpcUrl);
      
      // Set up reconnection logic
      provider._websocket.on("close", () => {
        console.log("WebSocket connection closed");
        this.connectionActive = false;
        clearInterval(this.blockPollInterval);
        
        if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`);
          
          setTimeout(async () => {
            try {
              this.provider = await this.createProvider();
              this.startListening();
            } catch (error) {
              console.error("Error reconnecting:", error);
            }
          }, this.options.reconnectDelay);
        } else {
          console.error("Maximum reconnection attempts reached. Please restart the service manually.");
          this.cleanup();
        }
      });
      
      provider._websocket.on("open", () => {
        console.log("WebSocket connection established");
        this.connectionActive = true;
        this.reconnectAttempts = 0;
      });
      
      provider._websocket.on("error", (error) => {
        console.error("WebSocket error:", error);
      });
      
      return provider;
    } catch (error) {
      console.error("Error creating provider:", error);
      throw error;
    }
  }

  async syncWallets() {
    try {
      // Get all registered wallets from the database
      const wallets = await prisma.wallet.findMany({
        select: {
          address: true
        }
      });
      
      // Update the Set with current wallet addresses (case-insensitive)
      this.registeredWallets.clear();
      wallets.forEach(wallet => {
        this.registeredWallets.add(wallet.address.toLowerCase());
      });
      
      console.log(`Synced ${this.registeredWallets.size} wallet addresses`);
    } catch (error) {
      console.error("Error syncing wallets:", error);
    }
  }

  startListening() {
    // In ethers v6, we'll use a combination of block events and polling
    this.provider.on("block", (blockNumber) => {
      this.processNewBlock(blockNumber);
    });
    
    // Also set up a failsafe polling mechanism
    this.blockPollInterval = setInterval(async () => {
      try {
        const latestBlock = await this.provider.getBlockNumber();
        if (latestBlock > this.latestBlockProcessed) {
          console.log(`Polling detected new block ${latestBlock}`);
          this.processNewBlock(latestBlock);
        }
      } catch (error) {
        console.error("Error polling for new blocks:", error);
      }
    }, this.options.pollInterval);
    
    console.log("Started listening for new blocks");
  }

  async processNewBlock(blockNumber) {
    try {
      // Process all blocks from last processed to current
      for (let i = this.latestBlockProcessed + 1; i <= blockNumber; i++) {
        await this.processBlock(i);
      }
      
      this.latestBlockProcessed = blockNumber;
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }

  async processBlock(blockNumber) {
    try {
      console.log(`Processing block ${blockNumber}`);
      const block = await this.provider.getBlock(blockNumber, true);
      
      if (!block || !block.transactions) {
        console.warn(`No transactions found in block ${blockNumber}`);
        return;
      }
      
      // Process each transaction in the block
      for (const tx of block.transactions) {
        await this.checkAndProcessTransaction(tx);
      }
      
      console.log(`Processed ${block.transactions.length} transactions in block ${blockNumber}`);
    } catch (error) {
      console.error(`Error processing block ${blockNumber}:`, error);
    }
  }

  async checkAndProcessTransaction(tx) {
    try {
      const fromAddress = tx.from?.toLowerCase();
      const toAddress = tx.to?.toLowerCase();
      
      // Check if either the sender or receiver is in our registered wallets
      const isRelevantTransaction = 
        (fromAddress && this.registeredWallets.has(fromAddress)) || 
        (toAddress && this.registeredWallets.has(toAddress));
      
      if (isRelevantTransaction) {
        // Get transaction receipt for additional details
        const receipt = await this.provider.getTransactionReceipt(tx.hash);
        
        // Skip if transaction is not confirmed enough
        if (receipt && receipt.confirmations < this.options.blockConfirmations) {
          // Track this pending tx to check later
          this.pendingTxs.set(tx.hash, {
            tx,
            blockNumber: receipt.blockNumber
          });
          return;
        }
        
        // Process the relevant transaction
        await this.handleRelevantTransaction(tx, receipt);
      }
    } catch (error) {
      console.error(`Error checking transaction ${tx.hash}:`, error);
    }
  }

  async checkPendingTransactions() {
    // Process any pending transactions that might have enough confirmations now
    for (const [hash, data] of this.pendingTxs.entries()) {
      try {
        const receipt = await this.provider.getTransactionReceipt(hash);
        
        if (receipt && receipt.confirmations >= this.options.blockConfirmations) {
          await this.handleRelevantTransaction(data.tx, receipt);
          this.pendingTxs.delete(hash);
        }
      } catch (error) {
        console.error(`Error checking pending transaction ${hash}:`, error);
      }
    }
  }

  async handleRelevantTransaction(tx, receipt) {
    try {
      // Extract important transaction details
      const txDetails = {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        blockNumber: tx.blockNumber,
        timestamp: (await this.provider.getBlock(tx.blockNumber)).timestamp,
        gasUsed: receipt ? receipt.gasUsed.toString() : tx.gasLimit.toString(),
        gasPrice: ethers.formatUnits(tx.gasPrice || tx.maxFeePerGas || 0, 'gwei'),
        status: receipt ? (receipt.status ? 'success' : 'failed') : 'unknown'
      };
      
      console.log(`Relevant transaction detected: ${txDetails.hash}`);
      
      // Store transaction in database
      await this.storeTransaction(txDetails);
      
      // Trigger notification for the relevant wallet(s)
      await this.triggerNotification(txDetails);
    } catch (error) {
      console.error(`Error handling transaction ${tx.hash}:`, error);
    }
  }

  async storeTransaction(txDetails) {
    try {
      // Store transaction in the database
      await prisma.transaction.create({
        data: {
          hash: txDetails.hash,
          fromAddress: txDetails.from,
          toAddress: txDetails.to,
          value: txDetails.value,
          blockNumber: txDetails.blockNumber,
          timestamp: new Date(txDetails.timestamp * 1000),
          gasUsed: txDetails.gasUsed,
          gasPrice: txDetails.gasPrice,
          status: txDetails.status
        }
      });
      
      console.log(`Transaction ${txDetails.hash} stored in database`);
    } catch (error) {
      // Handle duplicate transaction errors gracefully
      if (!error.toString().includes("Unique constraint")) {
        console.error(`Error storing transaction ${txDetails.hash}:`, error);
      }
    }
  }

  async triggerNotification(txDetails) {
    try {
      // Find users associated with the wallet addresses
      const fromWallet = txDetails.from?.toLowerCase();
      const toWallet = txDetails.to?.toLowerCase();
      
      const userWallets = await prisma.wallet.findMany({
        where: {
          OR: [
            { address: { equals: fromWallet, mode: 'insensitive' } },
            { address: { equals: toWallet, mode: 'insensitive' } }
          ]
        },
        include: {
          user: {
            include: {
              notificationPreferences: true
            }
          }
        }
      });
      
      // Process notifications for each affected user
      for (const wallet of userWallets) {
        const isOutgoing = wallet.address.toLowerCase() === fromWallet;
        const type = isOutgoing ? 'OUTGOING' : 'INCOMING';
        
        // Create notification entry
        await prisma.notification.create({
          data: {
            userId: wallet.userId,
            type: type,
            message: `${type} transaction of ${txDetails.value} ETH ${isOutgoing ? 'to' : 'from'} ${isOutgoing ? txDetails.to : txDetails.from}`,
            transactionHash: txDetails.hash,
            read: false,
          }
        });
        
        console.log(`Notification created for user ${wallet.userId} for transaction ${txDetails.hash}`);
        
        // Check if user has enabled notifications for this type
        if (wallet.user.notificationPreferences?.some(pref => 
          pref.type === type && pref.enabled
        )) {
          // Trigger push notification, email, etc. based on user preferences
          // This would integrate with your notification service
          console.log(`Push notification triggered for user ${wallet.userId}`);
        }
      }
    } catch (error) {
      console.error(`Error creating notification for transaction ${txDetails.hash}:`, error);
    }
  }

  cleanup() {
    // Clear intervals and remove listeners
    if (this.walletSyncIntervalId) {
      clearInterval(this.walletSyncIntervalId);
    }
    
    if (this.blockPollInterval) {
      clearInterval(this.blockPollInterval);
    }
    
    if (this.provider && this.connectionActive) {
      this.provider.removeAllListeners();
    }
    
    console.log("Blockchain listener resources cleaned up");
  }
}

module.exports = BlockchainListener;