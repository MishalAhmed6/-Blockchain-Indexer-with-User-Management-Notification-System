const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Use the MONGODB_URI from .env file with a fallback to localhost
    const mongoURI = process.env.MONGODB_URI ;
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,      
      useUnifiedTopology: true,    
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;