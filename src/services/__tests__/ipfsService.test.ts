/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('ipfs-http-client', () => ({
  create: () => ({
    version: () => Promise.resolve({ version: 'test' }),
    add: jest.fn().mockResolvedValue({ cid: { toString: () => 'testcid' }, size: 0 }),
    cat: async function* () { yield Buffer.from(''); }
  })
}));

import { ipfsService } from '../ipfsService';
// Use any for test context to simplify config typing
// import type { ElizaOSContext } from '../../elizaos/types';

describe('IPFSService', () => {
  const defaultGateway = 'https://ipfs.io/ipfs/';
  let context: any;

  beforeEach(() => {
    // Reset private client for test via any cast
    (ipfsService as any).client = null;
    // Reset private initialized flag for test via any cast
    (ipfsService as any).initialized = false;

    // Mock context logger
    context = {
      config: {},
      logger: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
      },
    } as any;
    // Override service logger to route warnings and debug to our mock
    (ipfsService as any).logger = context.logger;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getGatewayUrl returns default URL when uninitialized and no context', () => {
    const url = ipfsService.getGatewayUrl('abc');
    expect(url).toBe(`${defaultGateway}abc`);
  });

  test('getGatewayUrl logs warning when called before initialization', () => {
    const url = ipfsService.getGatewayUrl('xyz', context);
    expect(context.logger.warn).toHaveBeenCalledWith(
      'IPFSService: getGatewayUrl called before explicit initialization. Gateway URL might be default.'
    );
    expect(context.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Getting gateway URL for CID: xyz')
    );
    expect(url).toBe(`${defaultGateway}xyz`);
  });

  test('initialize picks up custom gateway from context.config', () => {
    // Add custom gateway to context config
    context.config.IPFS_GATEWAY_URL = 'https://custom.gateway/';
    ipfsService.initialize(context);
    // Force warning branch: mark as uninitialized via any cast
    (ipfsService as any).initialized = false;
    const url = ipfsService.getGatewayUrl('id123', context);
    expect(context.logger.warn).toHaveBeenCalled();
    expect(context.logger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Getting gateway URL for CID: id123')
    );
    expect(url).toBe('https://custom.gateway/id123');
  });

  test('shutdown resets initialization flag', () => {
    ipfsService.initialize(context);
    ipfsService.shutdown(context);
    expect((ipfsService as any).initialized).toBe(false);
    // After shutdown, getGatewayUrl should warn again
    ipfsService.getGatewayUrl('shut', context);
    expect(context.logger.warn).toHaveBeenCalled();
  });
}); 