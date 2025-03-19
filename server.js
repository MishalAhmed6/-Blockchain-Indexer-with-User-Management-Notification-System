const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { initializeFirebase } = require('./config/firebase');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

// Initialize Firebase
initializeFirebase();

// Initialize Express
const app = express();

// Middleware
app.use(bodyParser.json());

// Routes
app.use('/api/users', require('./routes/userRoutes'));

// Default route
app.get('/', (req, res) => {
  res.send('Blockchain Notification API is running');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});