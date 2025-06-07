/* eslint-disable */
// Jest provides globals (jest, describe, it, expect, beforeEach, afterEach)
// Mocks must be declared before requiring modules to apply properly
jest.mock('dkg.js', () =>
  jest.fn().mockImplementation(() => ({
    graph: {
      query: jest.fn().mockResolvedValue('mock-query-result'),
    },
    asset: {
      create: jest.fn().mockResolvedValue('mock-create-result'),
      get: jest.fn().mockResolvedValue('mock-get-result'),
    },
  }))
);

jest.mock('dkg.js/constants', () => ({
  BLOCKCHAIN_IDS: { chiado: 'test-chain' },
}));

const DKG = require('dkg.js');
const { BLOCKCHAIN_IDS } = require('dkg.js/constants');
const { DkgService } = require('../dkgService');

describe('DkgService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    process.env.OT_NODE_HOSTNAME = 'http://localhost';
    process.env.OT_NODE_PORT = '7878';
    process.env.BLOCKCHAIN_ID = 'chiado';
    process.env.ENVIRONMENT = 'test';
    process.env.PUBLIC_KEY = 'public-key';
    process.env.PRIVATE_KEY = 'private-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('initializes DKG client with correct parameters', () => {
    const service = new DkgService();
    service.initialize({ logger: console, config: {} });
    expect(DKG).toHaveBeenCalledWith({
      environment: 'test',
      endpoint: 'http://localhost',
      port: 7878,
      blockchain: {
        name: 'test-chain',
        publicKey: 'public-key',
        privateKey: 'private-key',
      },
    });
  });

  it('queries the graph via DKG client', async () => {
    const service = new DkgService();
    service.initialize({ logger: console, config: {} });
    const result = await service.query('sparql');
    expect(result).toBe('mock-query-result');
  });

  it('creates assets via DKG client', async () => {
    const service = new DkgService();
    service.initialize({ logger: console, config: {} });
    const result = await service.createAsset({ foo: 'bar' }, { epochsNum: 1 });
    expect(result).toBe('mock-create-result');
  });

  it('retrieves assets via DKG client', async () => {
    const service = new DkgService();
    service.initialize({ logger: console, config: {} });
    const result = await service.getAsset('ual', 'all');
    expect(result).toBe('mock-get-result');
  });
}); 