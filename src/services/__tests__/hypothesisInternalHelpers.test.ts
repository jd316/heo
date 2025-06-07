/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('ipfs-http-client', () => ({
  create: () => ({
    version: () => Promise.resolve({ version: 'test' }),
    add: jest.fn().mockResolvedValue({ cid: { toString: () => 'testcid' }, size: 0 }),
    cat: async function* () { yield Buffer.from(''); }
  })
}));

import { internalHelpers } from '../hypothesisService';
import { oxigraphCacheService } from '../oxigraphCacheService';

jest.mock('../oxigraphCacheService', () => ({
  oxigraphCacheService: { executeQuery: jest.fn() }
}));

describe.skip('internalHelpers', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(internalHelpers.cosineSimilarity([1,2,3], [1,2,3])).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(internalHelpers.cosineSimilarity([1,0], [0,1])).toBeCloseTo(0);
    });
  });

  describe('normalizeQueryToContents', () => {
    it('wraps string into Content array', () => {
      const result = internalHelpers.normalizeQueryToContents('hello');
      expect(result).toEqual([{ role: 'user', parts: [{ text: 'hello' }] }]);
    });

    it('leaves Content array unchanged', () => {
      const content = { role: 'user', parts: [{ text: 'x' }] };
      expect(internalHelpers.normalizeQueryToContents(content)).toEqual([content]);
    });
  });

  describe('fetchContextFromOxigraph', () => {
    it('returns empty array when no bindings', async () => {
      (oxigraphCacheService.executeQuery as jest.Mock).mockResolvedValue(JSON.stringify({ results: { bindings: [] } }));
      const res = await internalHelpers.fetchContextFromOxigraph('test', { logger: console, config: {}, runtime: {} as any }, console);
      expect(res).toEqual([]);
    });

    it('parses bindings into strings', async () => {
      const fakeResult = {
        results: {
          bindings: [
            { textualContent: { value: 'foo' }, sourceDocument: { value: 'doc1' } },
            { textualContent: { value: 'bar' } }
          ]
        }
      };
      (oxigraphCacheService.executeQuery as jest.Mock).mockResolvedValue(JSON.stringify(fakeResult));
      const res = await internalHelpers.fetchContextFromOxigraph('test', { logger: console, config: {}, runtime: {} as any }, console);
      expect(res).toContain('[Source: doc1] foo');
      expect(res).toContain('bar');
    });
  });
}); 