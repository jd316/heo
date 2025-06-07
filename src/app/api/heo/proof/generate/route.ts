import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { zkSnarkService } from '@/services/zkSnarkService';
import { ipfsService } from '@/services/ipfsService';
import type { ElizaOSContext } from '@/elizaos/types';
import type { ExperimentalData } from '@/services/zkSnarkService';

const proofSchema = z.object({
  protocolInstanceId: z.string(),
  rawData: z.any(),
});

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = proofSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const { protocolInstanceId, rawData } = parse.data;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  ipfsService.initialize(context);
  zkSnarkService.initialize(context);
  try {
    const params = { protocolInstanceId, rawData: rawData as ExperimentalData };
    const result = await zkSnarkService.generateProof(params);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 