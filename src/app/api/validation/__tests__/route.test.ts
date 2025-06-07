import { GET, POST } from '../route';
import type { NextRequest } from 'next/server';
import { validationService } from '../../../../services/validationService';

jest.mock('../../../../services/validationService', () => ({
  validationService: { validateExperimentResults: jest.fn() }
}));

describe('/api/validation', () => {
  it('GET returns informational message', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data).toHaveProperty('message');
    expect(data.message).toContain('HEO Validation Endpoint');
  });

  it('POST with invalid payload returns 400', async () => {
    const badBody = {};
    const request = { json: async () => badBody } as NextRequest;
    const res = await POST(request);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toHaveProperty('success', false);
    expect(data).toHaveProperty('error');
  });

  it('POST with valid payload calls service and returns success', async () => {
    const mockResult = { validated: true };
    (validationService.validateExperimentResults as jest.Mock).mockResolvedValue(mockResult);
    const validBody = {
      protocol_instance_id: 'p1',
      raw_data: {
        experiment_id: 'e1', protocol_template_id: 't1', reagents_used: [],
        procedure_steps: [], safety_measures_observed: { safety_cabinet_used: false, ppe_kit_used: false }
      },
      metadata: { executed_by: 'user', execution_timestamp: new Date().toISOString() }
    };
    const request = { json: async () => validBody } as NextRequest;
    const res = await POST(request);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(validationService.validateExperimentResults).toHaveBeenCalled();
    expect(data).toHaveProperty('success', true);
    expect(data.data).toEqual(mockResult);
  });
}); 