// Type declarations for ipfs-http-client v56.0.2
declare module 'ipfs-http-client' {
  export interface IPFSHTTPClient {
    add(content: string | Buffer | Blob): Promise<{ cid: { toString(): string }, path: string, size: number }>;
    cat(cid: string): AsyncIterable<Uint8Array>;
    version(): Promise<{ version: string, commit?: string, repo?: string, system?: string }>;
    pin: {
      add(cid: string): Promise<unknown>;
      rm(cid: string): Promise<unknown>;
      ls(options?: { paths?: string[], status?: string[] }): AsyncIterable<unknown>;
    };
    dag: {
      get(cid: string, options?: { path?: string, localResolve?: boolean }): Promise<unknown>;
      put(dagNode: unknown, options?: { format?: string, hashAlg?: string, pin?: boolean }): Promise<{ cid: { toString(): string } }>;
    };
  }
  
  export interface CreateOptions {
    url?: string;
    host?: string;
    port?: number;
    protocol?: string;
    headers?: Record<string, string>;
    timeout?: number;
  }
  
  export function create(options?: CreateOptions): IPFSHTTPClient;
} 