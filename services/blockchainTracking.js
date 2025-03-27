const connectDB = require('C:/Users/Laptop Gallery/blockchain-notification-system/config/db');
const BlockchainListener = require('C:/Users/Laptop Gallery/blockchain-notification-system/services/BlockchainListener.js');
const User = require('C:/Users/Laptop Gallery/blockchain-notification-system/models/User.js');
const admin = require('firebase-admin');

async function setupBlockchainTracking(alchemyUrl) {
    try {
        // Connect to MongoDB first
        await connectDB();
        console.log('MongoDB Connected successfully before Blockchain Tracking');

        console.log('Setting up Blockchain Tracking...');

        // Create listener with verbose logging
        const listener = new BlockchainListener(alchemyUrl, User, {
            pollingInterval: 15000
        });

        // Connect and initialize
        await listener.connect();
        await listener.initialize();

        // Handle transactions
        listener.on('transaction', async (txData) => {
            console.log('Relevant Transaction Detected:', txData);

            try {
                // Find users associated with the transaction (both from and to addresses)
                const fromRelevantUsers = await listener.findRelevantUsers(txData.from);
                const toRelevantUsers = await listener.findRelevantUsers(txData.to);

                // Combine unique users
                const relevantUsers = [...new Set([...fromRelevantUsers, ...toRelevantUsers])];

                console.log(`Found ${relevantUsers.length} relevant users for transaction`);

                // Send Firebase notifications
                for (const user of relevantUsers) {
                    if (user[listener.options.fcmTokenField]) {
                        // Determine transaction type
                        const transactionType = user[listener.options.walletAddressField].toLowerCase() === txData.to.toLowerCase()
                            ? 'Received'
                            : 'Sent';

                        const message = {
                            notification: {
                                title: `${transactionType} Ethereum Transaction`,
                                body: `Transaction Details: - Amount: ${txData.value} ETH - From: ${txData.from} - To: ${txData.to}`
                            },
                            data: {
                                transactionHash: txData.transactionHash,
                                amount: txData.value,
                                from: txData.from,
                                to: txData.to,
                                timestamp: txData.timestamp.toString(),
                                blockNumber: txData.blockNumber.toString(),
                                type: transactionType
                            },
                            token: user[listener.options.fcmTokenField]
                        };

                        try {
                            await admin.messaging().send(message);
                            console.log(`Notification sent to user: ${user._id}`);
                        } catch (notificationError) {
                            console.error('Notification sending error:', notificationError);
                        }
                    }
                }
            } catch (error) {
                console.error('Transaction processing error:', error);
            }
        });

        // Start listening
        await listener.startListening();

        console.log('Blockchain Tracking Setup Complete');
        return listener;
    } catch (error) {
        console.error('Failed to setup Blockchain Tracking:', error);
        throw error;
    }
}

module.exports = { setupBlockchainTracking };