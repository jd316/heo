import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dkgService } from '@/services/dkgService';
import type { ElizaOSContext } from '@/elizaos/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { content, options } = body as { content: unknown; options?: { epochsNum: number } };
  if (!content) {
    return NextResponse.json({ success: false, error: 'Missing content in request body' }, { status: 400 });
  }
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  dkgService.initialize(context);
  try {
    const data = await dkgService.createAsset(content, options ?? { epochsNum: 1 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 