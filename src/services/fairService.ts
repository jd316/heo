import type { ElizaOSContext } from '../elizaos/types';
import { ipfsService } from './ipfsService';

/**
 * Input for FAIR JSON-LD packaging
 */
export interface FairPackageInput {
  protocol_instance_id: string;
  protocol_template_id: string;
  raw_data_cid: string;
  solana_tx_uri: string;
  metadata?: Record<string, unknown>;
}

export class FairService {
  /**
   * Assemble a FAIR-compliant JSON-LD object
   */
  toJsonLd(input: FairPackageInput): Record<string, unknown> {
    const context = {
      schema: 'http://schema.org/',
      prov: 'http://www.w3.org/ns/prov#',
      fair: 'https://w3id.org/fair/terms/'
    };

    const id = `urn:uuid:${input.protocol_instance_id}`;

    const jsonLd: Record<string, unknown> = {
      '@context': context,
      '@id': id,
      '@type': 'schema:Dataset',
      'schema:identifier': input.protocol_instance_id,
      'schema:isBasedOn': {
        '@id': input.raw_data_cid.startsWith('ipfs://')
          ? input.raw_data_cid
          : `ipfs://${input.raw_data_cid}`
      },
      'fair:solanaTx': input.solana_tx_uri,
      'schema:dateCreated': new Date().toISOString()
    };

    if (input.metadata) {
      jsonLd['schema:additionalProperty'] = input.metadata;
    }

    // Include protocol template reference
    jsonLd['schema:hasPart'] = {
      '@type': 'schema:CreativeWork',
      'schema:identifier': input.protocol_template_id
    };

    return jsonLd;
  }

  /**
   * Store the assembled JSON-LD on IPFS and return the CID
   */
  async storeFairPackage(
    input: FairPackageInput,
    _context: ElizaOSContext
  ): Promise<string> {
    const jsonLd = this.toJsonLd(input);
    const dataStr = JSON.stringify(jsonLd);
    return await ipfsService.store(dataStr);
  }
}

export const fairService = new FairService(); 