import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { solanaService } from '@/services/solanaService';
import type { ElizaOSContext } from '@/elizaos/types';
import type { ProofData } from '@/services/solanaService';

const anchorSchema = z.object({
  protocolInstanceId: z.string(),
  proof: z.any(),
  ipfsCid: z.string(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = anchorSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const { protocolInstanceId, proof, ipfsCid } = parse.data;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  await solanaService.initialize(context);
  try {
    const txId = await solanaService.anchorProof(
      protocolInstanceId,
      proof as ProofData,
      ipfsCid,
      context
    );
    return NextResponse.json({ success: true, transactionId: txId });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 