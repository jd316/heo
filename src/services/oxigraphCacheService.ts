// import { logger } from '../utils/logger'; // Logger will be passed via context
import type { ElizaOSContext } from '../elizaos/types.ts'; // Import ElizaOSContext
import { ApplicationError, ErrorCode } from '../utils/errorHandling.ts';

const DEFAULT_OXIGRAPH_ENDPOINT_URL = 'http://localhost:7878';
const OXIGRAPH_ENDPOINT_CONFIG_KEY = 'OXIGRAPH_ENDPOINT_URL';

/**
 * Represents the expected structure of a SPARQL query result (simplified).
 * Adjust based on actual OxiGraph response structure for SELECT queries.
 */
export interface SparqlQueryResult {
  head: {
    vars: string[];
  };
  results: {
    bindings: Array<Record<string, { type: string; value: string; datatype?: string; 'xml:lang'?: string }>>;
  };
}

class OxigraphCacheService {
  private queryEndpoint: string = `${DEFAULT_OXIGRAPH_ENDPOINT_URL}/query`;
  private updateEndpoint: string = `${DEFAULT_OXIGRAPH_ENDPOINT_URL}/update`;
  private logger: ElizaOSContext['logger'] = console; // Default logger
  private isInitialized: boolean = false;

  constructor() {
    // Constructor is now minimal, setup happens in initialize
  }

  initialize(context: ElizaOSContext): void {
    this.logger = context.logger || console;
    const baseUrl = context.config?.[OXIGRAPH_ENDPOINT_CONFIG_KEY] as string || 
                    process.env[OXIGRAPH_ENDPOINT_CONFIG_KEY] || 
                    DEFAULT_OXIGRAPH_ENDPOINT_URL;
    
    this.queryEndpoint = `${baseUrl}/query`;
    this.updateEndpoint = `${baseUrl}/update`; // Or often just baseUrl for POST updates
    
    this.isInitialized = true;
    this.logger.info(`OxigraphCacheService initialized with base URL: ${baseUrl}`);
  }

  private async ensureInitialized(context: ElizaOSContext): Promise<void> {
    if (!this.isInitialized) {
      this.logger.info('OxigraphCacheService: Auto-initializing...');
      this.initialize(context);
    }
  }

  /**
   * Executes a SPARQL SELECT query against the OxiGraph store.
   * @param sparqlQuery The SPARQL query string.
   * @returns A promise that resolves to the query results.
   */
  async executeQuery(sparqlQuery: string): Promise<string> {
    try {
      const response = await fetch(`${this.queryEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': 'application/sparql-results+json',
        },
        body: sparqlQuery,
      });

      if (!response.ok) {
        this.logger.error('OxiGraph query failed', { 
          status: response.status, 
          statusText: response.statusText 
        });
        throw new ApplicationError(
          'SPARQL query failed',
          ErrorCode.SERVICE_UNAVAILABLE,
          { status: response.status }
        );
      }

      const result = await response.text();
      this.logger.info('OxiGraph query executed successfully', { 
        queryLength: sparqlQuery.length,
        resultLength: result.length 
      });
      
      return result;
    } catch (error) {
      this.logger.error('Error executing SPARQL query', { error });
      throw new ApplicationError(
        'Failed to execute SPARQL query',
        ErrorCode.SERVICE_UNAVAILABLE,
        { originalError: error }
      );
    }
  }

  /**
   * Executes a SPARQL UPDATE query (INSERT/DELETE) against the OxiGraph store.
   * @param sparqlUpdate The SPARQL update string.
   * @returns A promise that resolves when the update is complete.
   */
  async executeUpdate(sparqlUpdate: string, context: ElizaOSContext): Promise<void> {
    await this.ensureInitialized(context);
    const effectiveLogger = context.logger || this.logger;

    effectiveLogger.info('OxigraphCacheService: Executing SPARQL update', { update: sparqlUpdate.substring(0, 100) + '...' });
    try {
      const response = await fetch(this.updateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-update',
        },
        body: sparqlUpdate,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        effectiveLogger.error('OxigraphCacheService: Failed to execute SPARQL update', {
          status: response.status,
          statusText: response.statusText,
          update: sparqlUpdate,
          errorBody,
        });
        throw new ApplicationError(
          `Failed to execute SPARQL update: ${response.statusText}`,
          ErrorCode.SERVICE_UNAVAILABLE,
          { detail: errorBody, status: response.status }
        );
      }
      if (response.status === 200 || response.status === 204) {
        effectiveLogger.info('OxigraphCacheService: SPARQL update executed successfully');
      } else {
        effectiveLogger.warn('OxigraphCacheService: SPARQL update executed with unexpected status', { status: response.status });
      }
    } catch (error) {
      effectiveLogger.error('OxigraphCacheService: Error during SPARQL update execution', { 
          error: error instanceof Error ? error.message : String(error), 
          update: sparqlUpdate 
      });
      if (error instanceof ApplicationError) {
        throw error;
      }
      throw new ApplicationError(
        'Error during SPARQL update execution',
        ErrorCode.INTERNAL_ERROR,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  async insertTriples(nTriplesContent: string): Promise<void> {
    try {
      const response = await fetch(`${this.updateEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sparql-update',
        },
        body: `INSERT DATA { ${nTriplesContent} }`,
      });

      if (!response.ok) {
        this.logger.error('OxiGraph triple insertion failed', { 
          status: response.status, 
          statusText: response.statusText 
        });
        throw new ApplicationError(
          'Triple insertion failed',
          ErrorCode.SERVICE_UNAVAILABLE,
          { status: response.status }
        );
      }

      this.logger.info('Triples inserted successfully', { 
        contentLength: nTriplesContent.length 
      });
    } catch (error) {
      this.logger.error('Error inserting triples', { error });
      throw new ApplicationError(
        'Failed to insert triples',
        ErrorCode.SERVICE_UNAVAILABLE,
        { originalError: error }
      );
    }
  }
}

export const oxigraphCacheService = new OxigraphCacheService(); 