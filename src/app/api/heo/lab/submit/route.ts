import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { labAutomationService } from '@/services/labAutomationService';
import type { ElizaOSContext } from '@/elizaos/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const protocolPayload = await request.json();
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  labAutomationService.initialize(context);
  try {
    const runId = await labAutomationService.submitRun(protocolPayload);
    return NextResponse.json({ success: true, runId });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 