jest.mock('ipfs-http-client', () => ({
  create: () => ({
    version: () => Promise.resolve({ version: 'test' }),
    add: jest.fn().mockResolvedValue({ cid: { toString: () => 'testcid' }, size: 0 }),
    cat: async function* () { yield Buffer.from(''); }
  })
}));

import { fairService, type FairPackageInput } from '../fairService';

describe('FairService', () => {
  it('should generate valid JSON-LD structure', () => {
    const input: FairPackageInput = {
      protocol_instance_id: 'instance123',
      protocol_template_id: 'templateXYZ',
      raw_data_cid: 'QmTestCid',
      solana_tx_uri: 'solana://tx123',
      metadata: { executed_by: 'user1' }
    };

    const jsonLd = fairService.toJsonLd(input);
    // Basic checks
    expect(jsonLd).toHaveProperty('@context');
    expect(jsonLd).toHaveProperty('@id', 'urn:uuid:instance123');
    expect(jsonLd).toHaveProperty('@type', 'schema:Dataset');
    expect(jsonLd['schema:identifier']).toBe('instance123');
    // Check raw_data_cid mapping
    const isBasedOn = jsonLd['schema:isBasedOn'] as Record<string, unknown>;
    expect(isBasedOn['@id']).toBe('ipfs://QmTestCid');
    // Check solanaTx
    expect(jsonLd['fair:solanaTx']).toBe('solana://tx123');
    // Check hasPart protocol template
    const hasPart = jsonLd['schema:hasPart'] as Record<string, unknown>;
    expect(hasPart['schema:identifier']).toBe('templateXYZ');
  });
}); 