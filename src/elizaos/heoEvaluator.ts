import type { ElizaOSContext, Message } from './types';

/**
 * HEO Evaluator for ElizaOS integration
 * Evaluates agent messages to identify scientific queries and hypothesis requests
 */
export class HeoEvaluator {
  /**
   * Evaluate a message for scientific content
   * @param message Message to evaluate
   * @param context ElizaOS context
   */
  static async evaluate(message: Message, _context: ElizaOSContext): Promise<Record<string, unknown>> {
    const text = typeof message.text === 'string' ? message.text.toLowerCase() : '';
    
    const isQuery = text.includes('research') || 
                    text.includes('hypothesis') || 
                    text.includes('experiment') ||
                    text.includes('crispr') ||
                    text.includes('protocol');
    
    return {
      isScientificQuery: isQuery,
      confidence: isQuery ? 0.85 : 0.2,
      suggestedAction: isQuery ? 'generateHypothesis' : null,
      metadata: {
        timestamp: new Date().toISOString()
      }
    };
  }
} 