import { GET, POST } from '../route';
import { dkgService } from '@/services/dkgService';

// Mock DKG SDK imports
jest.mock('dkg.js', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    node: { info: jest.fn() },
    graph: { query: jest.fn() },
    asset: {
      create: jest.fn(),
      get: jest.fn(),
      increaseAllowance: jest.fn(),
      decreaseAllowance: jest.fn(),
      setAllowance: jest.fn(),
      getCurrentAllowance: jest.fn(),
    },
    network: { getBidSuggestion: jest.fn() },
    assertion: {
      formatGraph: jest.fn(),
      getTriplesNumber: jest.fn(),
      getChunksNumber: jest.fn(),
    },
  })),
}));
jest.mock('dkg.js/constants', () => ({
  BLOCKCHAIN_IDS: { testChain: 'test-chain' },
}));

// Mock initialize to be a no-op
jest.spyOn(dkgService, 'initialize').mockImplementation(() => {});

describe('DKG API route', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET handler', () => {
    it('returns node info', async () => {
      const mockInfo = { version: '8.0.0' };
      jest.spyOn(dkgService, 'nodeInfo').mockResolvedValue(mockInfo);

      const request = new Request('http://localhost/api/dkg/node-info');
      const response = await GET(request, { params: { dkg: ['node-info'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockInfo });
    });

    it('returns asset data', async () => {
      const mockAsset = { foo: 'bar' };
      jest.spyOn(dkgService, 'getAsset').mockResolvedValue(mockAsset);

      const url = 'http://localhost/api/dkg/asset/get/UAL?contentType=public';
      const request = new Request(url);
      const response = await GET(request, { params: { dkg: ['asset', 'get', 'UAL'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockAsset });
    });

    it('returns allowance', async () => {
      const mockAllowance = '1000';
      jest.spyOn(dkgService, 'getCurrentAllowance').mockResolvedValue(mockAllowance);

      const request = new Request('http://localhost/api/dkg/allowance');
      const response = await GET(request, { params: { dkg: ['allowance'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockAllowance });
    });

    it('handles unsupported action', async () => {
      const request = new Request('http://localhost/api/dkg/unknown');
      const response = await GET(request, { params: { dkg: ['unknown'] } });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: 'Unsupported GET action: unknown' });
    });
  });

  describe('POST handler', () => {
    it('handles query', async () => {
      const mockResult = [{ id: 1 }];
      jest.spyOn(dkgService, 'query').mockResolvedValue(mockResult);

      const body = { sparql: 'SELECT *' };
      const request = new Request('http://localhost/api/dkg/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['query'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockResult });
    });

    it('handles asset create', async () => {
      const mockCreate = { UAL: 'did:123' };
      jest.spyOn(dkgService, 'createAsset').mockResolvedValue(mockCreate);

      const body = { content: { public: {} }, options: { epochsNum: 2 } };
      const request = new Request('http://localhost/api/dkg/asset/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['asset', 'create'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockCreate });
    });

    it('handles bid suggestion', async () => {
      const mockBid = { bid: '0.001' };
      jest.spyOn(dkgService, 'getBidSuggestion').mockResolvedValue(mockBid);

      const body = { content: { public: {} }, options: { epochsNum: 2 } };
      const request = new Request('http://localhost/api/dkg/bid-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['bid-suggestion'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockBid });
    });

    it('handles format graph', async () => {
      const mockFmt = { public: {} };
      jest.spyOn(dkgService, 'formatGraph').mockResolvedValue(mockFmt);

      const body = { content: { public: {} } };
      const request = new Request('http://localhost/api/dkg/format-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['format-graph'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockFmt });
    });

    it('handles triples number', async () => {
      jest.spyOn(dkgService, 'getTriplesNumber').mockResolvedValue(42);

      const body = { content: { public: {} } };
      const request = new Request('http://localhost/api/dkg/triples-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['triples-number'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: 42 });
    });

    it('handles chunks number', async () => {
      jest.spyOn(dkgService, 'getChunksNumber').mockResolvedValue(5);

      const body = { content: { public: {} } };
      const request = new Request('http://localhost/api/dkg/chunks-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['chunks-number'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: 5 });
    });

    it('handles increase allowance', async () => {
      const mockRes = 'ok';
      jest.spyOn(dkgService, 'increaseAllowance').mockResolvedValue(mockRes);

      const body = { amount: '1000' };
      const request = new Request('http://localhost/api/dkg/allowance/increase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['allowance', 'increase'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockRes });
    });

    it('handles decrease allowance', async () => {
      const mockRes = 'ok';
      jest.spyOn(dkgService, 'decreaseAllowance').mockResolvedValue(mockRes);

      const body = { amount: '500' };
      const request = new Request('http://localhost/api/dkg/allowance/decrease', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['allowance', 'decrease'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockRes });
    });

    it('handles set allowance', async () => {
      const mockRes = 'ok';
      jest.spyOn(dkgService, 'setAllowance').mockResolvedValue(mockRes);

      const body = { amount: '1234' };
      const request = new Request('http://localhost/api/dkg/allowance/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const response = await POST(request, { params: { dkg: ['allowance', 'set'] } });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true, data: mockRes });
    });

    it('handles unsupported action', async () => {
      const request = new Request('http://localhost/api/dkg/unknown', { method: 'POST', body: '{}' });
      const response = await POST(request, { params: { dkg: ['unknown'] } });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: 'Unsupported POST action: unknown' });
    });
  });
}); 