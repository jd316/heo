import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fairService, type FairPackageInput } from '../../../../services/fairService';
import { redundantStorageService } from '../../../../services/redundantStorageService';
import type { ElizaOSContext } from '../../../../elizaos/types';

// Force Node.js runtime so ipfs-http-client and Buffer work correctly
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<FairPackageInput>;
    const { protocol_instance_id, protocol_template_id, raw_data_cid, solana_tx_uri, metadata } = body;

    if (!protocol_instance_id || !protocol_template_id || !raw_data_cid || !solana_tx_uri) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields in request body' },
        { status: 400 }
      );
    }

    const input: FairPackageInput = { protocol_instance_id, protocol_template_id, raw_data_cid, solana_tx_uri, metadata };

    const context: ElizaOSContext = { config: { ...process.env }, logger: console };
    // Store JSON-LD on IPFS
    const ipfsCid = await fairService.storeFairPackage(input, context);
    const jsonLd = fairService.toJsonLd(input);
    // Store redundantly on Filecoin
    const filecoinCid = await redundantStorageService.storeJsonLd(jsonLd, `${protocol_instance_id}.json`);

    return NextResponse.json({ success: true, data: { ipfsCid, filecoinCid } });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
} 