import { NextResponse } from 'next/server';
import { protocolService } from '@/services/protocolService';
import type { ElizaOSContext } from '@/elizaos/types';

export const runtime = 'nodejs';

export async function GET() {
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  protocolService.initialize(context);
  const templates = protocolService.getProtocolTemplates(context);
  return NextResponse.json({ success: true, data: templates });
} 