import { NextResponse } from "next/server";
import { protocolService } from "../../../../../services/protocolService";

/**
 * GET /api/protocol/templates/[id]
 * Gets details for a specific protocol template.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const context = { config: { ...process.env }, logger: console };
  const template = protocolService.getTemplateDetails(id, context);
  if (!template) {
    return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: template });
} 