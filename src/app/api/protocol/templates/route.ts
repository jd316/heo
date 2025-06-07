import { NextResponse } from "next/server";
import { protocolService } from "../../../../services/protocolService";

/**
 * GET /api/protocol/templates
 * Lists all available protocol templates.
 */
export async function GET() {
  const context = { config: { ...process.env }, logger: console };
  const templates = protocolService.getProtocolTemplates(context);
  return NextResponse.json({ success: true, data: templates });
} 