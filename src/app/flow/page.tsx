'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import type { ChangeEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

// Define types for the flow state
interface Hypothesis { id: string; text: string; confidence_score: number; }
interface ProtocolTemplate { id: string; name: string; }
interface ProtocolInstance { id: string; }
type LabResults = unknown;
interface ValidationResult { status: string; ipfs_data_cid: string; }
interface FairResult { jsonLd: unknown; ipfsCid: string; }
type DkgResult = unknown;

export default function FlowPage() {
  const [step, setStep] = useState<number>(0);
  const totalSteps = 7;

  // Step 0: Hypothesis
  const [query, setQuery] = useState<string>('');
  const [_hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [selectedHypothesis, setSelectedHypothesis] = useState<Hypothesis | null>(null);

  // Step 1: Protocol
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ProtocolTemplate | null>(null);
  const [protocolInstance, setProtocolInstance] = useState<ProtocolInstance | null>(null);

  // Step 2: Lab results
  const [labResults, setLabResults] = useState<LabResults | null>(null);

  // Step 3: Validation
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Step 4: Proof
  const [transactionId, setTransactionId] = useState<string>('');

  // Step 5: FAIR packaging
  const [fairResult, setFairResult] = useState<FairResult | null>(null);

  // Step 6: DKG publish
  const [dkgResult, setDkgResult] = useState<DkgResult | null>(null);

  // Load protocol templates when entering step 1
  useEffect(() => {
    if (step === 1) {
      fetch('/api/heo/protocol/templates')
        .then(r => r.json())
        .then(j => { if (j.success) setTemplates(j.data); });
    }
  }, [step]);

  async function handleGenerate() {
    const res = await fetch('/api/heo/generate', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ query }) });
    const j = await res.json();
    if (j.success && j.data.length) {
      setHypotheses(j.data);
      setSelectedHypothesis(j.data[0]);
      setStep(1);
    }
  }

  async function handleInitProtocol() {
    const payload = { template_id: selectedTemplate!.id, name: selectedTemplate!.name, parameters: {}, initiator_public_key: '' };
    const res = await fetch('/api/heo/execute-protocol', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await res.json();
    if (j.success) {
      setProtocolInstance(j.data);
      setStep(2);
    }
  }

  async function handleRunLab() {
    // Submit run
    const res1 = await fetch('/api/heo/lab/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ template_id: selectedTemplate!.id, name: '', parameters: {}, initiator_public_key: '' }) });
    const j1 = await res1.json();
    if (!j1.success) return;
    const runId = j1.runId;
    // Poll status
    let status = 'running';
    while (status === 'running') {
      const res2 = await fetch('/api/heo/lab/status', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ runId }) });
      const j2 = await res2.json();
      if (!j2.success) break;
      status = j2.status.status;
      if (status !== 'running') {
        const res3 = await fetch('/api/heo/lab/results', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ runId }) });
        const j3 = await res3.json();
        if (j3.success) {
          setLabResults(j3.results);
          setStep(3);
        }
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  async function handleValidate() {
    const body = { protocol_instance_id: protocolInstance!.id, raw_data: labResults, metadata: { executed_by:'flow-user', execution_timestamp: new Date().toISOString() } };
    const res = await fetch('/api/heo/validate', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.success) {
      setValidationResult(j.data);
      setStep(4);
    }
  }

  async function handleProof() {
    const body = { protocolInstanceId: protocolInstance!.id, rawData: labResults };
    const res = await fetch('/api/heo/proof/generate-and-anchor', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.success) {
      setTransactionId(j.data.transactionId);
      setStep(5);
    }
  }

  async function handleFair() {
    const body = { protocol_instance_id: protocolInstance!.id, protocol_template_id: selectedTemplate!.id, raw_data_cid: validationResult!.ipfs_data_cid, solana_tx_uri: transactionId, metadata:{} };
    const res = await fetch('/api/heo/fair', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    if (j.success) {
      setFairResult(j.data);
      setStep(6);
    }
  }

  async function handlePublishDkg() {
    const content = { jsonLd: fairResult!.jsonLd };
    const res = await fetch('/api/dkg/publish', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ content }) });
    const j = await res.json();
    if (j.success) {
      setDkgResult(j.data);
      setStep(7);
    }
  }

  return (
    <main className="p-6">
      {step === 0 ? (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>HEO End-to-End Flow (Step {step} of {totalSteps})</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={Math.round((step / totalSteps) * 100)} className="mb-4" />
            <h2 className="font-semibold text-lg mb-2">1. Generate Hypotheses</h2>
            <Label htmlFor="flow-query" className="block text-sm font-medium mb-1">Research Query</Label>
            <Input
              id="flow-query"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Enter research topic"
              className="mb-4 w-full"
            />
          </CardContent>
          <CardFooter>
            <Button onClick={handleGenerate} className="w-full">Generate</Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <h1 className="text-2xl font-semibold mb-4">HEO End-to-End Flow (Step {step} of {totalSteps})</h1>
          <Progress value={Math.round((step / totalSteps) * 100)} className="mb-6" />
          {step === 1 && (
            <section>
              <h2 className="font-semibold mb-2">2. Initialize Protocol</h2>
              <label htmlFor="flow-protocol-template" className="block text-sm font-medium text-gray-700 mb-1">Protocol Template</label>
              <select
                id="flow-protocol-template"
                onChange={e => setSelectedTemplate(templates.find(t => t.id === e.target.value) ?? null)}
                className="w-full border p-2 mb-2"
              >
                <option value="">Select template</option>
                {templates.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <Button onClick={handleInitProtocol} disabled={!selectedTemplate} className="w-full" variant="default">Initialize</Button>
            </section>
          )}
          {step === 2 && (
            <section>
              <h2 className="font-semibold mb-2">3. Run Lab Protocol</h2>
              <Button onClick={handleRunLab} className="w-full" variant="default">Run Lab</Button>
            </section>
          )}
          {step === 3 && (
            <section>
              <h2 className="font-semibold mb-2">4. Validate Results</h2>
              <Button onClick={handleValidate} className="w-full" variant="default">Validate</Button>
            </section>
          )}
          {step === 4 && (
            <section>
              <h2 className="font-semibold mb-2">5. Generate & Anchor Proof</h2>
              <Button onClick={handleProof} className="w-full" variant="default">Generate Proof</Button>
            </section>
          )}
          {step === 5 && (
            <section>
              <h2 className="font-semibold mb-2">6. FAIR Packaging</h2>
              <Button onClick={handleFair} className="w-full" variant="default">Package</Button>
            </section>
          )}
          {step === 6 && (
            <section>
              <h2 className="font-semibold mb-2">7. Publish to DKG</h2>
              <Button onClick={handlePublishDkg} className="w-full" variant="default">Publish</Button>
            </section>
          )}
          {step === totalSteps && (
            <section>
              <h2 className="font-semibold mb-2">🎉 Flow Complete</h2>
              <div className="space-y-2">
                <p><strong>Hypothesis:</strong> {selectedHypothesis?.text}</p>
                <p><strong>Protocol Instance ID:</strong> {protocolInstance?.id}</p>
                <p><strong>Lab Results:</strong> <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(labResults, null, 2)}</pre></p>
                <p><strong>Validation Status:</strong> {validationResult?.status}</p>
                <p><strong>Solana Tx:</strong> {transactionId}</p>
                <p><strong>FAIR CID:</strong> {fairResult?.ipfsCid}</p>
                <p><strong>DKG Result:</strong> <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto">{JSON.stringify(dkgResult, null, 2)}</pre></p>
              </div>
              <Button onClick={() => setStep(0)} className="mt-4 w-full" variant="default">Restart Flow</Button>
            </section>
          )}
        </>
      )}
    </main>
  );
} 