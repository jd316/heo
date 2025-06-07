import { POST } from '../route';
import type { NextRequest } from 'next/server';
import { hypothesisService } from '../../../../../services/hypothesisService';

jest.mock('../../../../../services/hypothesisService', () => ({
  hypothesisService: { generateAndScoreHypotheses: jest.fn() }
}));

describe('/api/heo/generate', () => {
  it('returns 400 on invalid input', async () => {
    const request = { json: async () => ({ corpus_filters: {} }) } as NextRequest;
    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('errors');
  });

  it('returns 200 and formatted data on valid input', async () => {
    const mockHyps = [
      { id: 'h1', text: 'Text1', novelty_score: 0.5, created_at: 't', updated_at: 't', source_references: [], used_corpus_data_ids: [] }
    ];
    (hypothesisService.generateAndScoreHypotheses as jest.Mock).mockResolvedValue(mockHyps);
    const validBody = { query: 'test' };
    const request = { json: async () => validBody } as NextRequest;
    const res = await POST(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('success', true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data[0]).toHaveProperty('id', 'h1');
    expect(data.data[0]).toHaveProperty('text', 'Text1');
    expect(data.data[0]).toHaveProperty('confidence_score', 0.5);
  });
}); 