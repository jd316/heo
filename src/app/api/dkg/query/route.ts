import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { dkgService } from '@/services/dkgService';
import type { ElizaOSContext } from '@/elizaos/types';

export const runtime = 'nodejs';

interface QueryPayload {
  query: string;
  domain?: string;
}

export async function POST(request: NextRequest) {
  const { query } = (await request.json()) as QueryPayload;
  const context: ElizaOSContext = { config: { ...process.env }, logger: console };
  dkgService.initialize(context);
  try {
    // Determine if input is a raw SPARQL query or natural language
    const trimmed = query.trim();
    let sparqlQuery: string;
    if (/^SELECT\s+/i.test(trimmed)) {
      sparqlQuery = trimmed;
    } else {
      // Basic natural language fallback: search literal values
      const sanitized = trimmed.replace(/['"\\]/g, '\\$&');
      sparqlQuery = `PREFIX schema: <http://schema.org/>
SELECT DISTINCT ?subject ?predicate ?object WHERE {
  ?subject ?predicate ?object .
  FILTER(CONTAINS(LCASE(STR(?object)), LCASE(\"${sanitized}\")))
} LIMIT 20`;
    }
    const data = await dkgService.query(sparqlQuery);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
} 