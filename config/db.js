const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Get the URI from environment variables with a fallback
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/';
    
    console.log('Attempting to connect to MongoDB at:', mongoURI);
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    // Don't exit the process here to allow the server to continue running
    // process.exit(1);
    throw error;
  }
};

module.exports = connectDB;