const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    hash: {
        type: String,
        required: true,
        index: true
    },
    from: {
        type: String,
        required: true,
        lowercase: true
    },
    to: {
        type: String,
        required: true,
        lowercase: true
    },
    value: {
        type: String,
        required: true
    },
    tokenAddress: {
        type: String,
        default: null
    },
    tokenSymbol: {
        type: String,
        default: 'ETH'
    },
    blockNumber: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    type: {
        type: String,
        enum: ['SEND', 'RECEIVE', 'CONTRACT_INTERACTION'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'FAILED'],
        default: 'PENDING'
    },
    gasUsed: {
        type: String,
        default: null
    },
    gasPrice: {
        type: String,
        default: null
    }
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    walletAddress: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    fcmToken: {
        type: String,
        required: true
    },
    notificationsEnabled: {
        type: Boolean,
        default: true
    },
    lastActivityTimestamp: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    notificationPreferences: {
        generalNotifications: {
            type: Boolean,
            default: true
        },
        transactionNotifications: {
            type: Boolean,
            default: true
        },
        marketNotifications: {
            type: Boolean,
            default: true
        },
        chatNotifications: {
            type: Boolean,
            default: true
        }
    },
    transactionHistory: [TransactionSchema]
}, {
    collection: 'block',
    timestamps: true
});

module.exports = mongoose.model('User', UserSchema, 'block');