import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ipfsService } from '@/services/ipfsService';
import type { ElizaOSContext } from '@/elizaos/types';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cid = searchParams.get('cid');
  if (!cid) {
    return NextResponse.json({ success: false, error: 'Missing cid query parameter' }, { status: 400 });
  }
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  ipfsService.initialize(context);
  try {
    const buffer = await ipfsService.retrieve(cid);
    const dataString = buffer.toString('utf-8');
    return NextResponse.json({ success: true, data: dataString });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 