import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { labAutomationService } from "@/services/labAutomationService";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: { runId: string } }) {
  try {
    const { runId } = params;
    const results = await labAutomationService.fetchResults(runId);
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
} 