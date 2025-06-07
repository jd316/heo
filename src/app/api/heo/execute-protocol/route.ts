import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { protocolService, type ProtocolInitiationInput } from '@/services/protocolService';
import type { ElizaOSContext } from '@/elizaos/types';

const executeSchema = z.object({
  template_id: z.string(),
  hypothesis_id: z.string().optional(),
  name: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  initiator_public_key: z.string(),
  safety_affirmations: z.record(z.string(), z.boolean()).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = executeSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const input = parse.data as ProtocolInitiationInput;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  try {
    const instance = await protocolService.initializeProtocolInstance(input, context);
    return NextResponse.json({ success: true, data: instance });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 