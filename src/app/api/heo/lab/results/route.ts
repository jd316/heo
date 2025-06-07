import z from 'zod';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { labAutomationService } from '@/services/labAutomationService';
import type { ElizaOSContext } from '@/elizaos/types';

const resultsSchema = z.object({ runId: z.string() });

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = resultsSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const { runId } = parse.data;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  labAutomationService.initialize(context);
  try {
    const results = await labAutomationService.fetchResults(runId);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 