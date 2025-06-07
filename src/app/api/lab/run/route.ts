import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { labAutomationService } from "@/services/labAutomationService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const runId = await labAutomationService.submitRun(payload);
    return NextResponse.json({ success: true, runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
} 