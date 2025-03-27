const { expect } = require('chai');
const sinon = require('sinon');
const BlockchainListener = require('../services/BlockchainListener');
const { PrismaClient } = require('@prisma/client');

describe('BlockchainListener', () => {
  let blockchainListener;
  let prismaStub;

  beforeEach(() => {
    // Mock Prisma client
    prismaStub = {
      wallet: {
        findMany: sinon.stub(),
        findUnique: sinon.stub(),
        create: sinon.stub(),
        update: sinon.stub(),
        delete: sinon.stub(),
      },
      transaction: {
        create: sinon.stub(),
        findMany: sinon.stub(),
        findUnique: sinon.stub(),
        update: sinon.stub(),
        delete: sinon.stub(),
      },
      notification: {
        create: sinon.stub(),
        findMany: sinon.stub(),
        findUnique: sinon.stub(),
        update: sinon.stub(),
        delete: sinon.stub(),
      },
      notificationPreference: {
        findMany: sinon.stub(),
        findUnique: sinon.stub(),
        create: sinon.stub(),
        update: sinon.stub(),
        delete: sinon.stub(),
      },
    };

    // Replace Prisma client with stub
    sinon.stub(PrismaClient.prototype, 'constructor').returns(prismaStub);
    global.prisma = prismaStub;

    // Initialize blockchain listener with test configuration
    blockchainListener = new BlockchainListener('wss://eth-mainnet.g.alchemy.com/v2/test', {
      blockConfirmations: 1,
      reconnectDelay: 1000,
      maxReconnectAttempts: 3,
      walletSyncInterval: 5000,
      pollInterval: 2000,
    });
  });

  afterEach(() => {
    sinon.restore();
    if (blockchainListener) {
      blockchainListener.cleanup();
    }
  });

  describe('stopListening', () => {
    it('should stop listening and clean up resources', async () => {
      // Initialize the listener first
      await blockchainListener.initialize();
      
      // Verify the listener is running
      expect(blockchainListener.blockPollInterval).to.not.be.null;
      expect(blockchainListener.walletSyncIntervalId).to.not.be.null;
      
      // Stop the listener
      blockchainListener.stopListening();
      
      // Verify cleanup
      expect(blockchainListener.blockPollInterval).to.be.null;
      expect(blockchainListener.walletSyncIntervalId).to.be.null;
      expect(blockchainListener.connectionActive).to.be.false;
    });
  });
}); 