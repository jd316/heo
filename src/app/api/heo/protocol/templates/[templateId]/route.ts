import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { ElizaOSContext } from '@/elizaos/types';
import { protocolService } from '@/services/protocolService';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { templateId: string } }) {
  const { templateId } = params;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  protocolService.initialize(context);
  const details = protocolService.getTemplateDetails(templateId, context);
  if (!details) {
    return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: details });
} 