const mongoose = require('mongoose');
const User = require('../models/User'); // Adjust path as needed

// MongoDB Connection String - REPLACE with your actual connection string
const MONGODB_URI = 'mongodb://localhost:27017/blockchain1';

async function addTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB Connected Successfully');

    // Generate a unique wallet address and email
    const testWalletAddress = `0x${Math.random().toString(36).substring(2, 42)}`;
    const testEmail = `test_user_${Date.now()}@example.com`;

    // Create a new user
    const newUser = new User({
      name: 'Test MongoDB User',
      email: testEmail,
      walletAddress: testWalletAddress,
      fcmToken: 'test-fcm-token-123'
    });

    // Save the user
    const savedUser = await newUser.save();
    
    console.log('User added successfully:', savedUser);

    // Optional: List all users to verify
    const users = await User.find({});
    console.log('All Users:', users);

  } catch (error) {
    console.error('Error adding user:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
}

// Run the test
addTestUser();