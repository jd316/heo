'use client';
import { useState } from 'react';
import type { ProofResult } from '@/services/zkSnarkService';

// Define type for combined generate-and-anchor response
type GaResponse = { proofResult: ProofResult; transactionId: string };

export default function ProofPage() {
  const [protocolInstanceId, setProtocolInstanceId] = useState('');
  const [rawData, setRawData] = useState('{}');
  const [generateResult, setGenerateResult] = useState<ProofResult | null>(null);
  const [gaResult, setGaResult] = useState<GaResponse | null>(null);
  const [anchorResult, setAnchorResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingGen, setLoadingGen] = useState(false);
  const [loadingGa, setLoadingGa] = useState(false);
  const [loadingAnchor, setLoadingAnchor] = useState(false);
  const [proofJson, setProofJson] = useState('');
  const [ipfsCid, setIpfsCid] = useState('');

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault(); setError(null); setGenerateResult(null); setLoadingGen(true);
    try {
      const res = await fetch('/api/heo/proof/generate', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ protocolInstanceId, rawData: JSON.parse(rawData) })
      });
      const json = await res.json();
      if (!json.success) setError(json.error || 'Generate failed');
      else setGenerateResult(json.data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally { setLoadingGen(false); }
  }

  async function handleGenerateAndAnchor(e: React.FormEvent) {
    e.preventDefault(); setError(null); setGaResult(null); setLoadingGa(true);
    try {
      const res = await fetch('/api/heo/proof/generate-and-anchor', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ protocolInstanceId, rawData: JSON.parse(rawData) })
      });
      const json = await res.json();
      if (!json.success) setError(json.error || 'Generate & Anchor failed');
      else setGaResult(json.data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally { setLoadingGa(false); }
  }

  async function handleAnchor(e: React.FormEvent) {
    e.preventDefault(); setError(null); setAnchorResult(null); setLoadingAnchor(true);
    try {
      const res = await fetch('/api/heo/proof/anchor', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ protocolInstanceId, proof: JSON.parse(proofJson), ipfsCid })
      });
      const json = await res.json();
      if (!json.success) setError(json.error || 'Anchor failed');
      else setAnchorResult(json.transactionId || json.data);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally { setLoadingAnchor(false); }
  }

  return (
    <main className="p-6 max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold">Proof Generation & Anchoring</h1>
      {error && <p className="text-red-600">Error: {error}</p>}

      <section className="border p-4 rounded">
        <h2 className="font-medium mb-2">Generate Proof</h2>
        <form onSubmit={handleGenerate} className="space-y-2">
          <input className="w-full border p-2 rounded" value={protocolInstanceId} onChange={e => setProtocolInstanceId(e.target.value)} placeholder="Protocol Instance ID" disabled={loadingGen} />
          <textarea placeholder="Raw Data JSON" className="w-full border p-2 rounded h-32" value={rawData} onChange={e => setRawData(e.target.value)} disabled={loadingGen} />
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded" disabled={loadingGen}>{loadingGen ? 'Generating…' : 'Generate Proof'}</button>
        </form>
        {generateResult && <pre className="mt-2 bg-gray-100 p-2 rounded">{JSON.stringify(generateResult, null, 2)}</pre>}
      </section>

      <section className="border p-4 rounded">
        <h2 className="font-medium mb-2">Generate & Anchor Proof</h2>
        <form onSubmit={handleGenerateAndAnchor} className="space-y-2">
          <input className="w-full border p-2 rounded" value={protocolInstanceId} onChange={e => setProtocolInstanceId(e.target.value)} placeholder="Protocol Instance ID" disabled={loadingGa} />
          <textarea placeholder="Raw Data JSON" className="w-full border p-2 rounded h-32" value={rawData} onChange={e => setRawData(e.target.value)} disabled={loadingGa} />
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded" disabled={loadingGa}>{loadingGa ? 'Working…' : 'Generate & Anchor'}</button>
        </form>
        {gaResult && <pre className="mt-2 bg-gray-100 p-2 rounded">{JSON.stringify(gaResult, null, 2)}</pre>}
      </section>

      <section className="border p-4 rounded">
        <h2 className="font-medium mb-2">Anchor Existing Proof</h2>
        <form onSubmit={handleAnchor} className="space-y-2">
          <input className="w-full border p-2 rounded" value={protocolInstanceId} onChange={e => setProtocolInstanceId(e.target.value)} placeholder="Protocol Instance ID" disabled={loadingAnchor} />
          <textarea className="w-full border p-2 rounded h-32" value={proofJson} onChange={e => setProofJson(e.target.value)} disabled={loadingAnchor} placeholder="Proof JSON" />
          <input className="w-full border p-2 rounded" value={ipfsCid} onChange={e => setIpfsCid(e.target.value)} placeholder="IPFS CID" disabled={loadingAnchor} />
          <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded" disabled={loadingAnchor}>{loadingAnchor ? 'Anchoring…' : 'Anchor Proof'}</button>
        </form>
        {anchorResult && <p className="mt-2 bg-gray-100 p-2 rounded">Transaction: {anchorResult}</p>}
      </section>
    </main>
  );
} 