const { setupBlockchainTracking } = require('./services/blockchainTracking');

setupBlockchainTracking('wss://eth-mainnet.g.alchemy.com/v2/x22B2s_jwKxv_m7DwwZGducW8ak_g5pY')
    .then(() => console.log('Tracking started'))
    .catch(error => console.error('Setup failed', error));