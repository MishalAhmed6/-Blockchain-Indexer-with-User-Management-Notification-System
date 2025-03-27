# Blockchain Transaction Notification System

A real-time notification system that monitors blockchain transactions and sends push notifications to users when their wallet addresses are involved in transactions.

## Features

- Real-time blockchain transaction monitoring
- Push notifications for wallet transactions
- User registration with wallet verification
- Transaction history tracking
- Rate limiting and security measures
- Firebase Cloud Messaging integration
- MongoDB for data persistence

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Firebase project with Cloud Messaging enabled
- Alchemy API key for blockchain monitoring

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
API_BASE_URL=http://localhost:3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/blockchain1

# Alchemy Configuration
ALCHEMY_WEBSOCKET_URL=wss://eth-mainnet.g.alchemy.com/v2/YOUR_WEBSOCKET_KEY
ALCHEMY_HTTP_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_HTTP_KEY

# Firebase Configuration
FIREBASE_DATABASE_URL=your_firebase_database_url
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-credentials.json
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/blockchain-notification-system.git
cd blockchain-notification-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up Firebase:
   - Create a Firebase project
   - Download service account credentials
   - Save as `firebase-credentials.json` in the root directory

4. Set up Alchemy:
   - Create an Alchemy account
   - Get your API keys
   - Update the `.env` file with your keys

## Usage

1. Start the server:
```bash
npm start
```

2. Test all the end points
   node tests / test-ALL-APIs.js


## API Endpoints

### User Management
- `POST /api/users/register` - Register a new user
- `POST /api/users/monitor` - Start monitoring wallet transactions
- `POST /api/users/stop-monitoring` - Stop monitoring wallet transactions
- `GET /api/users/transactions` - Get user's transaction history

### Wallet Verification
- `POST /api/verify-wallet` - Verify wallet ownership

### Transaction Management
- `POST /api/users/send-transaction` - Send a transaction
- `GET /api/users/transaction-status/:hash` - Check transaction status

## Security Features

- Rate limiting on sensitive endpoints
- Wallet signature verification
- Environment variable protection
- CORS configuration
- Request validation
- Error handling middleware

## Project Structure

```
blockchain-notification-system/
├── config/
│   ├── db.js
│   └── firebase.js
├── models/
│   └── User.js
├── services/
│   ├── BlockchainListener.js
│   └── NotificationService.js
├── utils/
│   └── walletVerification.js
├── routes/
│   └── userRoutes.js
├── scripts/
│   └── clear-fcm-tokens.js
├── server.js
└── .env
```

## Error Handling

The system includes comprehensive error handling for:
- Invalid FCM tokens
- Database connection issues
- Blockchain monitoring errors
- Rate limiting
- Invalid signatures
- Missing required fields

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Firebase for push notification infrastructure
- Alchemy for blockchain data access
- MongoDB for data persistence
- Ethers.js for blockchain interaction
