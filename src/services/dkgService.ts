import DKG from 'dkg.js';
import { BLOCKCHAIN_IDS } from 'dkg.js/constants';
import type { ElizaOSContext } from '../elizaos/types';

interface IDkgClient {
  node: { info(): Promise<unknown> };
  graph: { query(sparql: string, opts?: Record<string, unknown>): Promise<unknown> };
  asset: {
    create(content: unknown, options?: Record<string, unknown>): Promise<unknown>;
    get(ual: string, opts: { contentType: 'all' | 'public' | 'private' }): Promise<unknown>;
    increaseAllowance(amount: string): Promise<unknown>;
    decreaseAllowance(amount: string): Promise<unknown>;
    setAllowance(amount: string): Promise<unknown>;
    getCurrentAllowance(): Promise<unknown>;
  };
  network: { getBidSuggestion(content: unknown, options?: Record<string, unknown>): Promise<unknown> };
  assertion: {
    formatGraph(content: unknown): Promise<unknown>;
    getTriplesNumber(content: unknown): Promise<number>;
    getChunksNumber(content: unknown): Promise<number>;
  };
}

export class DkgService {
  // Using any until dkg.js provides type definitions
  private client: IDkgClient | null = null;
  private logger: ElizaOSContext['logger'] = console;

  /**
   * Initialize the DKG client using context.config and context.logger
   */
  initialize(context: ElizaOSContext): void {
    this.logger = context.logger || console;
    const cfg = context.config as Record<string, string>;
    const endpoint = cfg.OT_NODE_HOSTNAME || process.env.OT_NODE_HOSTNAME!;
    const port = Number(cfg.OT_NODE_PORT || process.env.OT_NODE_PORT);
    const chainKey = cfg.BLOCKCHAIN_ID || process.env.BLOCKCHAIN_ID!;
    const blockchainName = BLOCKCHAIN_IDS[chainKey];
    this.logger.info('DkgService: Initializing DKG client', { endpoint, port, chain: blockchainName });
    this.client = new DKG({
      environment: cfg.ENVIRONMENT || process.env.ENVIRONMENT as string,
      endpoint,
      port,
      blockchain: {
        name: blockchainName,
        publicKey: cfg.PUBLIC_KEY || process.env.PUBLIC_KEY!,
        privateKey: cfg.PRIVATE_KEY || process.env.PRIVATE_KEY!,
      },
    }) as unknown as IDkgClient;
  }

/**
   * Retrieve node info to verify connection
 */
  async nodeInfo(): Promise<unknown> {
    // Returns node info metadata
    return this.client!.node.info();
      }
      
  /**
   * Execute a SPARQL SELECT query against the DKG
   */
  async query(sparql: string): Promise<unknown> {
    return this.client!.graph.query(sparql, { type: 'SELECT' });
  }

  /**
   * Create a new Knowledge Asset or Collection with flexible options
   */
  async createAsset(content: unknown, options?: Record<string, unknown>): Promise<unknown> {
    return this.client!.asset.create(content, options || {});
      }

  /**
   * Retrieve a Knowledge Asset by its UAL (public/private/all)
   */
  async getAsset(ual: string, contentType: 'all' | 'public' | 'private' = 'all'): Promise<unknown> {
    return this.client!.asset.get(ual, { contentType });
  }

  /**
   * Suggest bid amount for publishing asset
   */
  async getBidSuggestion(content: unknown, options?: Record<string, unknown>): Promise<unknown> {
    return this.client!.network.getBidSuggestion(content, options || {});
  }

  /**
   * Format assertion graph and metadata
   */
  async formatGraph(content: unknown): Promise<unknown> {
    return this.client!.assertion.formatGraph(content);
  }

  /**
   * Get number of triples in public assertion
   */
  async getTriplesNumber(content: unknown): Promise<number> {
    return this.client!.assertion.getTriplesNumber(content);
  }

  /**
   * Get number of chunks for public assertion
   */
  async getChunksNumber(content: unknown): Promise<number> {
    return this.client!.assertion.getChunksNumber(content);
  }

  /**
   * Increase token allowance for DKG contract
   */
  async increaseAllowance(amount: string): Promise<unknown> {
    return this.client!.asset.increaseAllowance(amount);
  }

  /**
   * Decrease token allowance for DKG contract
   */
  async decreaseAllowance(amount: string): Promise<unknown> {
    return this.client!.asset.decreaseAllowance(amount);
  }

  /**
   * Set token allowance for DKG contract
   */
  async setAllowance(amount: string): Promise<unknown> {
    return this.client!.asset.setAllowance(amount);
  }

  /**
   * Get current token allowance for DKG contract
   */
  async getCurrentAllowance(): Promise<unknown> {
    return this.client!.asset.getCurrentAllowance();
  }
}

export const dkgService = new DkgService();