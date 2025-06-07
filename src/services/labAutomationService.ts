import type { ElizaOSContext } from '../elizaos/types.ts';
import { internalHelpers } from './hypothesisService.ts'; // Use Gemini helper for mock generation and analysis

export class LabAutomationService {
  // Fallback to mock if no ECL credentials provided
  private useMock: boolean = !process.env.ECL_API_KEY || !process.env.ECL_API_URL;
  private apiKey = process.env.ECL_API_KEY!;
  private baseUrl = process.env.ECL_API_URL!;

  initialize(context: ElizaOSContext): void {
    // No initialization needed for labAutomationService
    context.logger?.info('LabAutomationService: initialized');
  }

  /**
   * Submit a validated protocol payload to the cloud-lab API and return a runId
   */
  async submitRun(protocolPayload: unknown): Promise<string> {
    if (this.useMock) {
      console.warn('LabAutomationService: Missing ECL credentials, returning mock runId');
      return Promise.resolve('mock-run-id');
    }
    const res = await fetch(`${this.baseUrl}/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(protocolPayload),
    });
    if (!res.ok) throw new Error(`ECL submit failed: ${res.status}`);
    const json = await res.json();
    return json.runId;
  }

  /**
   * Poll run status until completion (status "completed" or "failed")
   */
  async pollRunStatus(runId: string, intervalMs = 5000): Promise<unknown> {
    if (this.useMock) {
      console.warn('LabAutomationService: Missing ECL credentials, returning mock status');
      return Promise.resolve({ runId, status: 'completed' });
    }
    while (true) {
      const res = await fetch(`${this.baseUrl}/runs/${runId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) throw new Error(`ECL status failed: ${res.status}`);
      const statusJson = await res.json();
      if (statusJson.status !== 'running') return statusJson;
      await new Promise(r => setTimeout(r, intervalMs));
    }
  }

  /**
   * Fetch raw experimental results (CSV, images, logs)
   */
  async fetchResults(runId: string): Promise<unknown> {
    if (this.useMock) {
      console.warn('LabAutomationService: Missing ECL credentials, generating mock results via Gemini');
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) throw new Error('Gemini API key is required for mock result generation');
      const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
      const prompt = `Simulate detailed experimental results as JSON for runId: ${runId}`;
      const [jsonText] = await internalHelpers.callGeminiProService({
        apiKey: geminiApiKey,
        prompt,
        modelName,
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      });
      let cleanText = jsonText.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\s*/, '').replace(/```$/,'').trim();
      }
      try {
        return JSON.parse(cleanText);
      } catch {
        throw new Error(`Failed to parse Gemini mock results JSON: ${cleanText}`);
      }
    }
    const res = await fetch(`${this.baseUrl}/runs/${runId}/results`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) throw new Error(`ECL fetchResults failed: ${res.status}`);
    return res.json();
  }

  /**
   * Analyze raw experimental results by calling Gemini LLM for a summary.
   */
  async analyzeResults(results: unknown): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) throw new Error('Gemini API key is required for analysis');
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    const prompt = `Analyze the following experimental results and provide a concise summary and key metrics in JSON:\n${JSON.stringify(results)}`;
    const [analysisText] = await internalHelpers.callGeminiProService({
      apiKey: geminiApiKey,
      prompt,
      modelName,
      generationConfig: { temperature: 0.2, maxOutputTokens: 300 }
    });
    return analysisText;
  }
}

export const labAutomationService = new LabAutomationService(); 