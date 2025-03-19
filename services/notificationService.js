const { admin } = require('../config/firebase');
const User = require('../models/User');

/**
 * Sends a notification to a user about a blockchain transaction
 * @param {string} walletAddress 
 * @param {Object} transaction 
 * @returns {Promise<void>}
 */
const sendTransactionNotification = async (walletAddress, transaction) => {
  try {
    // Find the user by wallet address
    const user = await User.findOne({ walletAddress });

    if (!user || !user.notificationsEnabled || !user.fcmToken) {
      console.log(`Notification not sent: User not found, notifications disabled, or missing FCM token`);
      return;
    }

    // Create a notification message
    const direction = transaction.from.toLowerCase() === walletAddress.toLowerCase() ? 'sent' : 'received';
    const message = {
      notification: {
        title: `Transaction ${direction}`,
        body: `You have ${direction} ${transaction.amount} in a transaction`
      },
      data: {
        transactionHash: transaction.hash,
        amount: transaction.amount.toString(),
        fromAddress: transaction.from,
        toAddress: transaction.to,
        timestamp: transaction.timestamp.toString()
      },
      token: user.fcmToken
    };

    // Send the notification
    const response = await admin.messaging().send(message);
    console.log('Notification sent successfully:', response);

    // Update last activity timestamp
    await User.findByIdAndUpdate(user._id, {
      lastActivityTimestamp: new Date()
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = { sendTransactionNotification };