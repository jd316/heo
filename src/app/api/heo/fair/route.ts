import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fairService, type FairPackageInput } from '@/services/fairService';
import { ipfsService } from '@/services/ipfsService';
import type { ElizaOSContext } from '@/elizaos/types';
import { redundantStorageService } from '@/services/redundantStorageService';

const fairSchema = z.object({
  protocol_instance_id: z.string(),
  protocol_template_id: z.string(),
  raw_data_cid: z.string(),
  solana_tx_uri: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = fairSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const input = parse.data as FairPackageInput;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };

  // Initialize IPFS client before storing JSON-LD
  ipfsService.initialize(context);

  try {
    // Store JSON-LD on IPFS
    const ipfsCid = await fairService.storeFairPackage(input, context);
    const jsonLd = fairService.toJsonLd(input);
    // Store redundantly on Filecoin via Web3.Storage
    const filecoinCid = await redundantStorageService.storeJsonLd(jsonLd, `${input.protocol_instance_id}.json`);
    return NextResponse.json({ success: true, data: { ipfsCid, filecoinCid, jsonLd } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 