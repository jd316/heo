/* istanbul ignore file */
'use client';

import { useState } from 'react';

// QueryResult holds the response data from the DKG API; structure is unknown until runtime
type QueryResult = unknown;

export default function KnowledgeGraphExplorer() {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('biology');
  const [results, setResults] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishData, setPublishData] = useState<unknown | null>(null);

  const domains = [
    { value: 'biology', label: 'Biology' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'medicine', label: 'Medicine' }
  ];

  const sampleQueries = [
    'CRISPR gene editing mechanisms',
    'protein folding pathways',
    'cancer biomarkers discovery',
    'drug target identification',
    'metabolic pathway analysis'
  ];

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    if (query.length < 3) {
      setError('Query must be at least 3 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/dkg/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, domain })
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'DKG query failed');
      }
      setResults(json.data);
    } catch (err) {
      setError('Failed to query knowledge graph. Please try again.');
      console.error('Knowledge graph query error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add DKG publish handler
  const publishAsset = async () => {
    /* istanbul ignore next: unreachable when results is null */
    if (!results) return;
    setPublishLoading(true);
    setPublishError(null);
    setPublishData(null);
    try {
      const res2 = await fetch('/api/dkg/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: results })
      });
      const json2 = await res2.json();
      if (!json2.success) throw new Error(json2.error || 'Publish failed');
      setPublishData(json2.data);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : String(err));
    } finally {
      setPublishLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">🌐 Knowledge Graph Explorer</h2>
      
      <div className="space-y-6">
        {/* Query Input */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3">
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              Search Query
            </label>
            <input
              id="query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your research topic or question..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && executeQuery()}
            />
          </div>
          
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
              Domain
            </label>
            <select
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {domains.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sample Queries */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Try these sample queries:</p>
          <div className="flex flex-wrap gap-2">
            {sampleQueries.map((sample, index) => (
              <button
                key={index}
                onClick={() => setQuery(sample)}
                className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm hover:bg-green-100 transition-colors"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        {/* Search Button */}
        <div>
          <button
            onClick={executeQuery}
            disabled={loading}
            className="w-full md:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Querying Knowledge Graph...
              </span>
            ) : (
              'Search Knowledge Graph'
            )}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {results != null && (
          <>
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Query Results</h3>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>

            {/* Publish to DKG */}
            <div className="mt-4">
              <button
                onClick={publishAsset}
                disabled={publishLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 transition-colors"
              >
                {publishLoading ? 'Publishing to DKG...' : 'Publish to DKG'}
              </button>
              {publishError && <div className="text-red-600 mt-2">{publishError}</div>}
              {publishData != null && (
                <div className="mt-2">
                  <h4 className="text-lg font-semibold">Publish Result</h4>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
                    {JSON.stringify(publishData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {/* Information Panel */}
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">🌐 Decentralized Knowledge Graph</h4>
          <p className="text-green-800 text-sm">
            Query scientific knowledge from the OriginTrail DKG with OxiGraph caching. 
            Results include research from 50TB+ corpus with &lt;500ms latency and FAIR data compliance.
          </p>
        </div>
      </div>
    </div>
  );
} 