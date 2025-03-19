const mongoose = require('mongoose');

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
  }
}, { 
  collection: 'block',
  timestamps: true
});

// Add an index for faster queries
//UserSchema.index({ walletAddress: 1 });

module.exports = mongoose.model('User', UserSchema, 'block');