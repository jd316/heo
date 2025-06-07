import { create as createW3UpClient, type Client } from '@web3-storage/w3up-client';
import { Blob } from 'buffer';

/**
 * Service to store JSON-LD data redundantly on Web3.Storage (IPFS + Filecoin) using the w3up client.
 */
export class RedundantStorageService {
  private clientPromise: Promise<Client>;

  constructor() {
    // Initialize the w3up client (will prompt email login if not yet logged in)
    this.clientPromise = createW3UpClient();
  }

  /**
   * Uploads a JSON object as a file to Web3.Storage and returns the content CID.
   * @param json The JSON-LD object to store.
   * @param fileName The filename to assign in the archive (default: metadata.json).
   */
  async storeJsonLd(json: object, fileName = 'metadata.json'): Promise<string> {
    const client = await this.clientPromise;
    const jsonString = JSON.stringify(json, null, 2);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blob = new Blob([jsonString], { type: 'application/json' }) as any;
    blob.name = fileName;
    // Upload the 'file' and return its CID
    const cid = await client.uploadFile(blob);
    return cid.toString();
  }
}

export const redundantStorageService = new RedundantStorageService(); 