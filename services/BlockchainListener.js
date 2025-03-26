const Web3 = require('web3');
const { EventEmitter } = require('events');
const mongoose = require('mongoose');

class BlockchainListener extends EventEmitter {
    constructor(alchemyUrl, UserModel, options = {}) {
        super();
        this.alchemyUrl = alchemyUrl;
        this.UserModel = UserModel;
        
        this.options = {
            pollingInterval: 15000,
            walletAddressField: 'walletAddress',
            notificationEnabledField: 'notificationsEnabled',
            fcmTokenField: 'fcmToken',
            verbose: true,
            ...options
        };

        this.web3 = null;
        this.lastProcessedBlock = null;
        this.isListening = false;
    }

    async connect() {
        try {
            console.log('[Blockchain Listener] Connecting to Alchemy...');

            // Create Web3 instance with WebSocket provider
            this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.alchemyUrl, {
                timeout: 30000,
                reconnect: {
                    auto: true,
                    delay: 5000,
                    maxAttempts: 5
                }
            }));

            // Verify connection with multiple checks
            const networkId = await this.web3.eth.net.getId();
            const blockNumber = await this.web3.eth.getBlockNumber();
            const networkType = await this.web3.eth.net.getNetworkType();

            console.log('[Blockchain Listener] Connected Successfully!');
            console.log('- Network ID: ' + networkId);
            console.log('- Current Block: ' + blockNumber);
            console.log('- Network Type: ' + networkType);

            return this.web3;
        } catch (error) {
            console.error('[Blockchain Listener] Connection Error:', error.message);
            throw new Error('Failed to connect to Alchemy: ' + error.message);
        }
    }

    async initialize() {
        try {
            // Ensure connection
            if (!this.web3) {
                await this.connect();
            }

            // Get the current block number to start from
            this.lastProcessedBlock = await this.web3.eth.getBlockNumber();

            console.log('[Blockchain Listener] Initialized. Starting from block: ' + this.lastProcessedBlock);
        } catch (error) {
            console.error('[Blockchain Listener] Initialization Error:', error.message);
            throw error;
        }
    }

    async getUserWallets() {
        try {
            // Detailed connection state logging
            console.log('Mongoose Connection State:', mongoose.connection.readyState);
            console.log('Mongoose Connection:', mongoose.connection);
    
            // More robust connection check
            if (mongoose.connection.readyState !== 1) {
                console.error('[CRITICAL] MongoDB is not connected');
                
                // Additional diagnostics
                console.log('Connection Details:', {
                    host: mongoose.connection.host,
                    port: mongoose.connection.port,
                    name: mongoose.connection.name
                });
    
                return [];
            }
    
            // Count total users for context
            const totalUsers = await this.UserModel.countDocuments();
            console.log('Total Users in Database: ' + totalUsers);
    
            const users = await this.UserModel.find({
                [this.options.walletAddressField]: { $exists: true, $ne: null }
            })
            .select(this.options.walletAddressField)
            .lean()
            .maxTimeMS(10000);  // Increased timeout
    
            const wallets = users
                .map(user => user[this.options.walletAddressField])
                .filter(wallet => wallet && typeof wallet === 'string')
                .map(wallet => wallet.toLowerCase());
    
            console.log('[Blockchain Listener] Fetched ' + wallets.length + ' valid user wallets');
            
            // Log first few wallets for verification
            console.log('Sample Wallets:', wallets.slice(0, 5));
    
            return wallets;
        } catch (error) {
            console.error('[CRITICAL] Wallet Fetching Error:', {
                message: error.message,
                name: error.name,
                stack: error.stack
            });
            return [];
        }
    }

    async startListening() {
        if (this.isListening) return;
        this.isListening = true;

        const pollTransactions = async () => {
            try {
                // Get the latest block number
                const currentBlock = await this.web3.eth.getBlockNumber();

                // If no new blocks, skip
                if (currentBlock <= this.lastProcessedBlock) {
                    return;
                }

                console.log('[Blockchain Listener] Processing blocks from ' + (this.lastProcessedBlock + 1) + ' to ' + currentBlock);

                // Fetch blocks since last processed
                for (let blockNumber = this.lastProcessedBlock + 1; blockNumber <= currentBlock; blockNumber++) {
                    await this.processBlock(blockNumber);
                }

                // Update last processed block
                this.lastProcessedBlock = currentBlock;
            } catch (error) {
                console.error('[Blockchain Listener] Polling Error:', error);
            } finally {
                // Continue polling if still listening
                if (this.isListening) {
                    setTimeout(pollTransactions, this.options.pollingInterval);
                }
            }
        };

        // Start initial poll
        await pollTransactions();
    }

    async processBlock(blockNumber) {
        try {
            // Fetch the full block with transaction details
            const block = await this.web3.eth.getBlock(blockNumber, true);

            if (!block || !block.transactions) return;

            // Fetch all user wallet addresses
            const userWallets = await this.getUserWallets();

            // Process each transaction
            for (const tx of block.transactions) {
                // Normalize addresses for comparison
                const fromAddress = tx.from.toLowerCase();
                const toAddress = tx.to ? tx.to.toLowerCase() : null;

                // Check if transaction involves any of our users
                const isRelevantTransaction = userWallets.some(
                    wallet => fromAddress === wallet || toAddress === wallet
                );

                if (isRelevantTransaction) {
                    console.log('[Blockchain Listener] Relevant Transaction Found in Block ' + blockNumber);
                    
                    // Fetch transaction receipt for additional details
                    const txReceipt = await this.web3.eth.getTransactionReceipt(tx.hash);

                    // Emit event for relevant transaction
                    this.emit('transaction', {
                        blockNumber,
                        transactionHash: tx.hash,
                        from: tx.from,
                        to: tx.to,
                        value: this.web3.utils.fromWei(tx.value, 'ether'),
                        timestamp: block.timestamp, // Added timestamp
                        gasUsed: txReceipt ? txReceipt.gasUsed : null,
                        status: txReceipt ? txReceipt.status : null
                    });
                }
            }
        } catch (error) {
            console.error('[Blockchain Listener] Error processing block ' + blockNumber + ':', error);
        }
    }

    async findRelevantUsers(transactionAddress) {
        try {
            return await this.UserModel.find({
                [this.options.walletAddressField]: { $regex: new RegExp('^' + transactionAddress + '$', 'i') },
                [this.options.notificationEnabledField]: true
            });
        } catch (error) {
            console.error('[Blockchain Listener] Error finding relevant users:', error);
            return [];
        }
    }

    stopListening() {
        this.isListening = false;
        if (this.web3 && this.web3.currentProvider) {
            this.web3.currentProvider.disconnect();
        }
    }
}

module.exports = BlockchainListener;