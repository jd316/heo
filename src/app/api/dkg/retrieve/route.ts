import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { dkgService } from '@/services/dkgService';
import type { ElizaOSContext } from '@/elizaos/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ual, contentType } = body as { ual?: string; contentType?: 'all' | 'public' | 'private' };
  if (!ual) {
    return NextResponse.json({ success: false, error: 'Missing ual in request body' }, { status: 400 });
  }
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  dkgService.initialize(context);
  try {
    const data = await dkgService.getAsset(ual, contentType ?? 'all');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 