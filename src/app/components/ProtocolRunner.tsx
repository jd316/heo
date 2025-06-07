'use client';

import { useState, useEffect } from 'react';

interface ProtocolTemplate {
  id: string;
  name: string;
  required_params: string[];
}

interface LabRunStatus {
  runId: string;
  status: string;
  [key: string]: unknown;
}

export default function ProtocolRunner() {
  const [templates, setTemplates] = useState<ProtocolTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [parameters, setParameters] = useState<Record<string, string>>({});
  const [initiator, setInitiator] = useState<string>('');
  const [runId, setRunId] = useState<string | null>(null);
  const [status, setStatus] = useState<LabRunStatus | null>(null);
  const [results, setResults] = useState<unknown | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/protocol/templates')
      .then(res => res.json())
      .then(json => { if (json.success) setTemplates(json.data); })
      .catch(err => console.error('Failed to load templates:', err));
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = templates.find(t => t.id === selectedTemplate);
      if (tmpl) {
        const initParams: Record<string, string> = {};
        tmpl.required_params.forEach(param => { initParams[param] = ''; });
        setParameters(initParams);
      }
    } else {
      setParameters({});
    }
  }, [selectedTemplate, templates]);

  const startRun = async () => {
    setError(null);
    setLoading(true);
    setRunId(null);
    setStatus(null);
    setResults(null);
    try {
      const payload = {
        template_id: selectedTemplate,
        name: `Run-${Date.now()}`,
        parameters,
        initiator_public_key: initiator,
      };
      const res = await fetch('/api/lab/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setRunId(json.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/lab/run/${runId}`);
          const json = await res.json();
          if (json.success) {
            setStatus(json.status);
            if (json.status.status !== 'running') {
              clearInterval(interval);
              const res2 = await fetch(`/api/lab/run/${runId}/results`);
              const json2 = await res2.json();
              if (json2.success) setResults(json2.data);
            }
          } else {
            setError(json.error);
            clearInterval(interval);
          }
        } catch (err) {
          setError(String(err));
          clearInterval(interval);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [runId]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <h2 className="text-2xl font-bold mb-6">🚀 Protocol Runner</h2>
      {error && <div className="p-4 bg-red-50 border border-red-200 rounded mb-4 text-red-700">{error}</div>}

      <div className="mb-4">
        <label htmlFor="protocol-template" className="block text-sm font-medium text-gray-700 mb-1">Protocol Template</label>
        <select
          id="protocol-template"
          aria-label="Protocol Template"
          value={selectedTemplate}
          onChange={e => setSelectedTemplate(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">Select a template</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="initiator-key" className="block text-sm font-medium text-gray-700 mb-1">Initiator Public Key</label>
        <input
          id="initiator-key"
          type="text"
          value={initiator}
          onChange={e => setInitiator(e.target.value)}
          placeholder="Enter public key"
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>

      {selectedTemplate && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Parameters</h4>
          <div className="space-y-2">
            {Object.keys(parameters).map(key => (
              <div key={key}>
                <label htmlFor={`param-${key}`} className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                <input
                  id={`param-${key}`}
                  type="text"
                  value={parameters[key]}
                  onChange={e => setParameters(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={`Enter ${key}`}
                  className="w-full p-2 border border-gray-300 rounded"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={startRun}
        disabled={loading || !selectedTemplate || !initiator}
        className="px-6 py-3 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
      >
        {loading ? 'Starting Run...' : 'Start Protocol Run'}
      </button>

      {runId && (
        <div className="mt-6 space-y-4">
          <p><strong>Run ID:</strong> {runId}</p>
          {status ? (
            <p><strong>Status:</strong> {status.status}</p>
          ) : null}
          {results != null ? (
            <div>
              <h4 className="font-semibold">Results</h4>
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">{JSON.stringify(results, null, 2)}</pre>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
} 