const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionHash: {
        type: String,
        required: true,
        unique: true
    },
    from: {
        type: String,
        required: true
    },
    to: {
        type: String,
        required: true
    },
    value: {
        type: String,
        required: true
    },
    blockNumber: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    },
    gasUsed: {
        type: Number
    },
    status: {
        type: Boolean
    },
    notificationSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', transactionSchema); 