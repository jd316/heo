import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { protocolService } from "../../../../services/protocolService";

// Schema for protocol execution request
const executionSchema = z.object({
  template_id: z.string(),
  hypothesis_id: z.string().optional(),
  name: z.string(),
  parameters: z.record(z.string(), z.unknown()),
  initiator_public_key: z.string(),
  safety_affirmations: z.record(z.string(), z.boolean()).optional(),
});

/**
 * POST /api/protocol/execute
 * Initializes a protocol instance for execution.
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const result = executionSchema.safeParse(requestBody);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: result.error.errors },
        { status: 400 }
      );
    }
    const input = result.data;
    const context = { config: { ...process.env }, logger: console };
    const instance = await protocolService.initializeProtocolInstance(input, context);
    return NextResponse.json({ success: true, data: instance });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 