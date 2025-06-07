/* eslint-disable @typescript-eslint/no-explicit-any */
import { labAutomationService } from '../labAutomationService';

describe('LabAutomationService', () => {
  beforeEach(() => {
    delete process.env.ECL_API_KEY;
    delete process.env.ECL_API_URL;
    // reinstantiate service to pick up env changes
    (labAutomationService as any).useMock = !process.env.ECL_API_KEY || !process.env.ECL_API_URL;
  });

  it('uses mock when credentials are missing', async () => {
    const runId = await labAutomationService.submitRun({});
    expect(runId).toBe('mock-run-id');
    const status = await labAutomationService.pollRunStatus('any');
    expect(status).toEqual({ runId: 'any', status: 'completed' });
    const results = await labAutomationService.fetchResults('any');
    expect(results).toEqual({ runId: 'any', data: { result: 'mock experimental data' } });
  });

  it('throws error when credentials are present but endpoint is invalid', async () => {
    process.env.ECL_API_KEY = 'key';
    process.env.ECL_API_URL = 'http://invalid';
    (labAutomationService as any).useMock = !process.env.ECL_API_KEY || !process.env.ECL_API_URL;
    await expect(labAutomationService.submitRun({})).rejects.toThrow();
  });
}); 