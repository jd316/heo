import type { NextRequest } from "next/server";
import { z } from "zod";
import { validationService, type ExperimentResultInput } from "../../../services/validationService";

// Detailed schema for ExperimentalData
const experimentalDataSchema = z.object({
  experiment_id: z.string(),
  protocol_template_id: z.string(),
  reagents_used: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      is_hazardous: z.boolean(),
      quantity_used: z.number(),
      unit: z.string(),
    })
  ),
  procedure_steps: z.array(
    z.object({
      step_id: z.string(),
      description: z.string(),
      equipment_used: z.array(z.string()).optional(),
      settings: z.record(z.string(), z.unknown()).optional(),
      actions_taken: z.array(z.string()).optional(),
    })
  ),
  safety_measures_observed: z.object({
    safety_cabinet_used: z.boolean(),
    ppe_kit_used: z.boolean(),
  }),
  raw_instrument_outputs: z.record(z.string(), z.unknown()).optional(),
});

// Schema for validation request matching ExperimentResultInput
const validationSchema = z.object({
  protocol_instance_id: z.string(),
  raw_data: experimentalDataSchema,
  metadata: z.object({
    executed_by: z.string(),
    execution_timestamp: z.string(),
  }),
});

/**
 * POST /api/validation
 * Validates experimental results: stores data on IPFS, generates proof, anchors on-chain.
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const result = validationSchema.safeParse(requestBody);
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: "Invalid request", details: result.error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const input = result.data as ExperimentResultInput;
    const context = { config: { ...process.env }, logger: console };
    const status = await validationService.validateExperimentResults(
      input,
      context
    );
    return new Response(JSON.stringify({ success: true, data: status }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Optional GET for status
export function GET() {
  return new Response(JSON.stringify({ message: "HEO Validation Endpoint. Use POST to validate experiment results." }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
} 