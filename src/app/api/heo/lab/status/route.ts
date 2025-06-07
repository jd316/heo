import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { labAutomationService } from '@/services/labAutomationService';
import type { ElizaOSContext } from '@/elizaos/types';

const statusSchema = z.object({ runId: z.string(), intervalMs: z.number().optional() });

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = statusSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const { runId, intervalMs } = parse.data;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  labAutomationService.initialize(context);
  try {
    const status = await labAutomationService.pollRunStatus(runId, intervalMs);
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 