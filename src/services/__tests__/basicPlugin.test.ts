import { describe, it, expect } from '@jest/globals';

describe('HEO Plugin Basic Tests', () => {
  describe('Environment Variables', () => {
    it('should have test environment set', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });
  });

  describe('Basic Math Functions', () => {
    // Test simple math functions to ensure Jest is working
    it('should calculate cosine similarity for orthogonal vectors', () => {
      // Simple cosine similarity implementation for testing
      const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB) || 0;
      };

      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBe(0); // Orthogonal vectors
    });

    it('should return 1 for identical vectors', () => {
      const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
        return dotProduct / (magnitudeA * magnitudeB) || 0;
      };

      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3];
      const similarity = cosineSimilarity(vecA, vecB);
      expect(similarity).toBeCloseTo(1, 5);
    });
  });

  describe('Hypothesis Parsing Logic', () => {
    it('should parse numbered hypotheses from text', () => {
      const parseHypotheses = (text: string, maxResults: number): string[] => {
        const lines = text.split('\n');
        const hypotheses: string[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          const match = trimmed.match(/^\d+\.\s*(.+)$/);
          if (match && hypotheses.length < maxResults) {
            hypotheses.push(match[1]);
          }
        }
        
        return hypotheses;
      };

      const llmResponse = `
        1. First hypothesis about CRISPR gene editing
        2. Second hypothesis about protein folding
        3. Third hypothesis about drug discovery
      `;
      
      const result = parseHypotheses(llmResponse, 3);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('First hypothesis about CRISPR gene editing');
      expect(result[1]).toBe('Second hypothesis about protein folding');
      expect(result[2]).toBe('Third hypothesis about drug discovery');
    });

    it('should limit results to maxHypotheses', () => {
      const parseHypotheses = (text: string, maxResults: number): string[] => {
        const lines = text.split('\n');
        const hypotheses: string[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim();
          const match = trimmed.match(/^\d+\.\s*(.+)$/);
          if (match && hypotheses.length < maxResults) {
            hypotheses.push(match[1]);
          }
        }
        
        return hypotheses;
      };

      const llmResponse = `
        1. First hypothesis
        2. Second hypothesis
        3. Third hypothesis
        4. Fourth hypothesis
        5. Fifth hypothesis
      `;
      
      const result = parseHypotheses(llmResponse, 2);
      expect(result).toHaveLength(2);
    });
  });

  describe('Plugin Configuration Validation', () => {
    it('should validate plugin type format', () => {
      const pluginType = 'elizaos:plugin:2.4.0';
      const isValidFormat = /^elizaos:plugin:\d+\.\d+\.\d+$/.test(pluginType);
      expect(isValidFormat).toBe(true);
    });

    it('should validate version format', () => {
      const version = '1.0.0';
      const isValidSemver = /^\d+\.\d+\.\d+$/.test(version);
      expect(isValidSemver).toBe(true);
    });
  });
}); 