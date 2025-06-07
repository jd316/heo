declare module 'dkg.js' {
  export type DKGConfig = {
    environment?: string;
    endpoint: string;
    port: number;
    blockchain: {
      name: string;
      publicKey: string;
      privateKey: string;
    };
  };

  export default class DKG {
    constructor(config: DKGConfig);
    node: {
      info(): Promise<unknown>;
    };
    graph: {
      query(query: string, opts: { type: 'SELECT' | string }): Promise<unknown>;
    };
    asset: {
      create(content: unknown, options: Record<string, unknown>): Promise<unknown>;
      get(ual: string, opts: { contentType: 'all' | 'public' | 'private' }): Promise<unknown>;
    };
  }
}

declare module 'dkg.js/constants' {
  export const BLOCKCHAIN_IDS: Record<string, string>;
} 