import { z } from "zod";
import type { NextRequest } from "next/server";
import { hypothesisService, type HypothesisGenerationInput } from '@/services/hypothesisService';
import type { ElizaOSContext } from '@/elizaos/types';

const generateSchema = z.object({
  query: z.string().min(1),
  corpus_filters: z.object({
    start_year: z.number().optional(),
    keywords: z.array(z.string()).optional(),
    corpus_data_ids: z.array(z.string()).optional(),
  }).optional(),
  generation_params: z.object({
    max_hypotheses: z.number().optional(),
    novelty_threshold: z.number().optional(),
    model_name: z.string().optional(),
    temperature: z.number().optional(),
    maxOutputTokens: z.number().optional(),
    topK: z.number().optional(),
    topP: z.number().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parse = generateSchema.safeParse(body);
  if (!parse.success) {
    return new Response(JSON.stringify({ success: false, errors: parse.error.errors }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const input = parse.data as HypothesisGenerationInput;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  const startTime = Date.now();
  try {
    const rawHyps = await hypothesisService.generateAndScoreHypotheses(input, context);
    const duration = Date.now() - startTime;
    const uiHyps = rawHyps.map(h => ({
      id: h.id,
      text: h.text,
      confidence_score: h.novelty_score,
      generated_at: h.created_at,
      metadata: {
        model_used: input.generation_params?.model_name ?? 'gemini-default',
        tokens_used: input.generation_params?.maxOutputTokens ?? 0,
        processing_time_ms: duration
      }
    }));
    return new Response(JSON.stringify({ success: true, data: uiHyps }), {
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