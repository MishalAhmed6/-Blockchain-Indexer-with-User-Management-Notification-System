const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();

// Enhanced middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware for frontend integration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    return res.status(200).json({});
  }
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  if (req.method === 'POST' && req.originalUrl.includes('/register')) {
    // Log registration request details, but protect sensitive data
    const { address, message } = req.body;
    const signature = req.body.signature ? `${req.body.signature.substring(0, 10)}...` : undefined;
    console.log('Registration request:', { address, message, signature: signature });
  }
  next();
});

// Version checker middleware
app.use((req, res, next) => {
  // Check and log ethers version for debugging
  try {
    const ethers = require('ethers');
    console.log('Ethers version:', ethers.version || 'Unknown');
  } catch (error) {
    console.log('Ethers import error:', error.message);
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to database
try {
  connectDB();
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

// Initialize Firebase
try {
  initializeFirebase();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Continue anyway as this might not be critical
}

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Default route
app.get('/', (req, res) => {
  res.send('Blockchain Notification API is running');
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't exit the process as it would stop the server
});