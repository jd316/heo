import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { validationService, type ExperimentResultInput } from "@/services/validationService";
import type { ElizaOSContext } from "@/elizaos/types";

const reagentSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_hazardous: z.boolean(),
  quantity_used: z.number(),
  unit: z.string(),
});

const stepSchema = z.object({
  step_id: z.string(),
  description: z.string(),
  equipment_used: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  actions_taken: z.array(z.string()).optional(),
});

const experimentalDataSchema = z.object({
  experiment_id: z.string(),
  protocol_template_id: z.string(),
  reagents_used: z.array(reagentSchema),
  procedure_steps: z.array(stepSchema),
  safety_measures_observed: z.object({
    safety_cabinet_used: z.boolean(),
    ppe_kit_used: z.boolean(),
  }),
  raw_instrument_outputs: z.record(z.string(), z.unknown()).optional(),
});

const validateSchema = z.object({
  protocol_instance_id: z.string(),
  raw_data: experimentalDataSchema,
  metadata: z.object({
    executed_by: z.string(),
    execution_timestamp: z.string(),
  }),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = validateSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ success: false, errors: parse.error.errors }, { status: 400 });
  }
  const input = parse.data as ExperimentResultInput;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  try {
    const status = await validationService.validateExperimentResults(input, context);
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
} 