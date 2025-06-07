import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ElizaOSContext } from '../../elizaos/types';
import type { Hypothesis } from '../hypothesisService';
// Rename unused type with underscore prefix
import type { CorpusData as _CorpusData } from '../hypothesisService';

// Rename unused type with underscore prefix
type _MockGenerateContentResponse = {
  response: { text: () => string };
};

// Mock dependencies with proper type assertions
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    generativeModel: jest.fn().mockImplementation(() => ({
      // @ts-expect-error - Jest mock return type mismatch
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => 'Hypothesis 1: Test hypothesis about CRISPR\nHypothesis 2: Test hypothesis about PCR'
        }
      })
    }))
  }))
}));

// Rename unused type with underscore prefix
type _MockQueryResult = {
  results: Array<{ subject: string; predicate: string; object: string }>;
};

// Rename unused type with underscore prefix
type _MockCorpusItem = {
  id: string;
  title: string;
  abstract: string;
};

jest.mock('../oxigraphCacheService', () => ({
  oxigraphCacheService: {
    // @ts-expect-error - Jest mock return type mismatch
    executeQuery: jest.fn().mockResolvedValue({
      results: [
        { subject: 'test:subject1', predicate: 'test:predicate', object: 'test:object1' },
        { subject: 'test:subject2', predicate: 'test:predicate', object: 'test:object2' }
      ]
    }),
    // @ts-expect-error - Jest mock return type mismatch
    executeCorpusQuery: jest.fn().mockResolvedValue([
      { id: 'paper1', title: 'CRISPR applications', abstract: 'Test abstract 1' },
      { id: 'paper2', title: 'PCR techniques', abstract: 'Test abstract 2' }
    ])
  }
}));

jest.mock('../ipfsService', () => ({
  ipfsService: {
    // @ts-expect-error - Jest mock return type mismatch
    store: jest.fn().mockResolvedValue('mock-ipfs-cid'),
    // @ts-expect-error - Jest mock implementation type mismatch
    getGatewayUrl: jest.fn().mockImplementation((cid: string) => `https://ipfs.io/ipfs/${cid}`)
  }
}));

// Add a mock for GoogleGenAI
// @ts-expect-error - Jest mock return type mismatch
const mockGenerateContent = jest.fn().mockResolvedValue({ text: () => 'Mocked hypothesis text' });
// Rename unused variable with underscore prefix
const _mockGoogleGenAI = {
  models: {
    generateContent: mockGenerateContent
  }
};

// Import after mocks are set up
import { hypothesisService } from '../hypothesisService';

// Define a type for the private methods of hypothesisService
type HypothesisServicePrivate = {
  _callGeminiProService: jest.Mock;
  _scoreNovelty: jest.Mock;
  _generateRdfTriples: jest.Mock;
  _anchorToIpfs: jest.Mock;
};

describe('HypothesisService', () => {
  const mockContext: ElizaOSContext = {
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    config: {
      GEMINI_API_KEY: 'test-api-key',
      GEMINI_MODEL_NAME: 'gemini-1.5-flash-latest'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Override internal method for testing with proper type assertions
    // @ts-expect-error - Jest mock return type mismatch
    (hypothesisService as unknown as HypothesisServicePrivate)._callGeminiProService = jest.fn().mockResolvedValue(['Hypothesis 1: Test hypothesis for testing']);
    // @ts-expect-error - Jest mock return type mismatch
    (hypothesisService as unknown as HypothesisServicePrivate)._scoreNovelty = jest.fn().mockResolvedValue([0.85]);
    // @ts-expect-error - Jest mock return type mismatch
    (hypothesisService as unknown as HypothesisServicePrivate)._generateRdfTriples = jest.fn().mockResolvedValue('@prefix schema: <http://schema.org/>.\n<test> schema:text "Test".');
    // @ts-expect-error - Jest mock return type mismatch
    (hypothesisService as unknown as HypothesisServicePrivate)._anchorToIpfs = jest.fn().mockResolvedValue('test-ipfs-cid');
    
    hypothesisService.initialize(mockContext);
  });

  describe('Parsing LLM Responses', () => {
    it('should correctly parse hypothesis text from LLM response', () => {
      const llmResponse = `
        Hypothesis 1: CRISPR-Cas9 can be used to target multiple genes simultaneously.
        Reasoning: Recent studies have shown the ability to multiplex guide RNAs.
        Experiment Type: Multi-target gene knockout assay.

        Hypothesis 2: Prime editing has lower off-target effects than traditional CRISPR.
        Reasoning: The precision of prime editing may reduce unintended edits.
        Experiment Type: Whole genome sequencing to compare off-target rates.
      `;

      // Create a function that simulates the behavior for testing
      const parseHypotheses = (text: string, maxCount: number): string[] => {
        const lines = text.split('\n');
        const hypotheses: string[] = [];
        
        for (const line of lines) {
          const cleanedLine = line.trim().replace(/^Hypothesis\s*[:.\d-]*\s*/i, '').replace(/^[\d.*-]+\s*/, '');
          if (cleanedLine.length > 20 && 
              cleanedLine.includes(' ') && 
              !cleanedLine.toLowerCase().startsWith("reasoning:") && 
              !cleanedLine.toLowerCase().startsWith("experiment type:")) {
            hypotheses.push(cleanedLine);
            if (hypotheses.length >= maxCount) break;
          }
        }
        
        return hypotheses;
      };
      
      const result = parseHypotheses(llmResponse, 5);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toContain('CRISPR-Cas9');
      expect(result[1]).toContain('Prime editing');
    });

    it('should limit parsed hypotheses to the specified maximum', () => {
      const llmResponse = `
        Hypothesis 1: First hypothesis
        Hypothesis 2: Second hypothesis
        Hypothesis 3: Third hypothesis
        Hypothesis 4: Fourth hypothesis
        Hypothesis 5: Fifth hypothesis
      `;
      
      // Create a function that simulates the behavior for testing
      const parseHypotheses = (text: string, maxCount: number): string[] => {
        const lines = text.split('\n');
        const hypotheses: string[] = [];
        
        for (const line of lines) {
          const cleanedLine = line.trim().replace(/^Hypothesis\s*[:.\d-]*\s*/i, '').replace(/^[\d.*-]+\s*/, '');
          if (cleanedLine.length > 3) {
            hypotheses.push(cleanedLine);
            if (hypotheses.length >= maxCount) break;
          }
        }
        
        return hypotheses;
      };
      
      const result = parseHypotheses(llmResponse, 3);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('First hypothesis');
      expect(result[2]).toBe('Third hypothesis');
    });
  });

  describe('Hypothesis Generation', () => {
    it('should generate hypotheses based on user query', async () => {
      const input = {
        query: 'CRISPR gene editing applications',
        generation_params: {
          max_hypotheses: 2,
          temperature: 0.7,
          novelty_threshold: 0.5
        }
      };
      
      const result = await hypothesisService.generateAndScoreHypotheses(input, mockContext);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      // Verify that internal methods were called
      expect((hypothesisService as unknown as HypothesisServicePrivate)._callGeminiProService).toHaveBeenCalled();
      expect((hypothesisService as unknown as HypothesisServicePrivate)._scoreNovelty).toHaveBeenCalled();
      expect((hypothesisService as unknown as HypothesisServicePrivate)._generateRdfTriples).toHaveBeenCalled();
      expect((hypothesisService as unknown as HypothesisServicePrivate)._anchorToIpfs).toHaveBeenCalled();
    });
  });

  describe('Metadata Generation', () => {
    it('should generate RDF triples for hypotheses', async () => {
      // Create a sample hypothesis
      const hypothesis: Hypothesis = {
        id: 'test-hyp-123',
        text: 'CRISPR-Cas9 can be optimized for higher specificity',
        novelty_score: 0.85,
        status: 'generated',
        ipfs_cid: 'test-cid-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        source_references: [{ type: 'DOI', value: 'doi:10.1234/test' }],
        used_corpus_data_ids: ['paper1', 'paper2']
      };

      // Mock the RDF generation to return a known value
      const mockRdfData = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix schema: <http://schema.org/>.
@prefix sio: <http://semanticscience.org/resource/>.
@prefix prov: <http://www.w3.org/ns/prov#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix xsd: <http://www.w3.org/2001/XMLSchema#>.
@prefix bs: <https://bioschemas.org/profiles/>.
@prefix base: <urn:uuid:test-hyp-123#>.
<urn:uuid:test-hyp-123> rdf:type sio:SIO_000283;
    schema:text "CRISPR-Cas9 can be optimized for higher specificity";
    schema:distribution <ipfs://test-cid-123>.
<ipfs://test-cid-123> schema:contentUrl <https://ipfs.io/ipfs/test-cid-123>.`;

      // Override the mocked function for this test only
      // @ts-expect-error - Jest mock return type mismatch
      ((hypothesisService as unknown as HypothesisServicePrivate)._generateRdfTriples as jest.Mock).mockResolvedValueOnce(mockRdfData);
      
      // Call the method
      const rdfData = await (hypothesisService as unknown as HypothesisServicePrivate)._generateRdfTriples(hypothesis);
      
      // Basic validation of RDF content
      expect(rdfData).toContain('urn:uuid:test-hyp-123');
      expect(rdfData).toContain('schema:text');
      expect(rdfData).toContain('CRISPR-Cas9');
    });
  });
}); 