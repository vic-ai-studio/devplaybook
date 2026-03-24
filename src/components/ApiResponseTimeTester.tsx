import { useState, useRef } from 'preact/hooks';

interface TestResult {
  url: string;
  method: string;
  status: number | null;
  statusText: string;
  duration: number;
  size: number;
  error?: string;
  timestamp: Date;
  headers: Record<string, string>;
}

const PRESETS = [
  { label: 'JSONPlaceholder /posts', url: 'https://jsonplaceholder.typicode.com/posts/1', method: 'GET' },
  { label: 'JSONPlaceholder /users', url: 'https://jsonplaceholder.typicode.com/users', method: 'GET' },
  { label: 'GitHub API', url: 'https://api.github.com', method: 'GET' },
  { label: 'httpbin GET', url: 'https://httpbin.org/get', method: 'GET' },
  { label: 'httpbin POST', url: 'https://httpbin.org/post', method: 'POST' },
];

function speedLabel(ms: number): { label: string; color: string } {
  if (ms < 100) return { label: 'Excellent', color: 'text-green-400' };
  if (ms < 300) return { label: 'Good', color: 'text-green-400' };
  if (ms < 800) return { label: 'Average', color: 'text-yellow-400' };
  if (ms < 2000) return { label: 'Slow', color: 'text-orange-400' };
  return { label: 'Very Slow', color: 'text-red-400' };
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} kB`;
}

export default function ApiResponseTimeTester() {
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('Content-Type: application/json');
  const [body, setBody] = useState('');
  const [runs, setRuns] = useState(3);
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runTest = async () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    setTesting(true);
    const newResults: TestResult[] = [];

    for (let i = 0; i < runs; i++) {
      const controller = new AbortController();
      abortRef.current = controller;

      const headerMap: Record<string, string> = {};
      for (const line of headers.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
          headerMap[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
        }
      }

      const start = performance.now();
      try {
        const res = await fetch(trimmedUrl, {
          method,
          headers: headerMap,
          body: ['POST', 'PUT', 'PATCH'].includes(method) && body ? body : undefined,
          signal: controller.signal,
          mode: 'cors',
        });
        const duration = Math.round(performance.now() - start);
        const text = await res.text();
        const size = new Blob([text]).size;
        const resHeaders: Record<string, string> = {};
        res.headers.forEach((v, k) => { resHeaders[k] = v; });

        newResults.push({
          url: trimmedUrl,
          method,
          status: res.status,
          statusText: res.statusText,
          duration,
          size,
          timestamp: new Date(),
          headers: resHeaders,
        });
      } catch (e: any) {
        if (e.name === 'AbortError') break;
        const duration = Math.round(performance.now() - start);
        newResults.push({
          url: trimmedUrl,
          method,
          status: null,
          statusText: '',
          duration,
          size: 0,
          error: e.message || 'Network error (CORS or network issue)',
          timestamp: new Date(),
          headers: {},
        });
      }

      // Small delay between runs
      if (i < runs - 1) await new Promise(r => setTimeout(r, 100));
    }

    setResults(prev => [...newResults, ...prev].slice(0, 20));
    setTesting(false);
  };

  const stop = () => {
    abortRef.current?.abort();
    setTesting(false);
  };

  const avg = results.length > 0 ? Math.round(results.slice(0, runs).reduce((a, r) => a + r.duration, 0) / Math.min(results.length, runs)) : null;
  const { label: avgLabel, color: avgColor } = avg != null ? speedLabel(avg) : { label: '', color: '' };

  return (
    <div class="space-y-5">
      {/* Config */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 class="text-base font-semibold">Configure Request</h2>

        <div class="flex gap-2">
          <select
            value={method}
            onChange={(e: any) => setMethod(e.target.value)}
            class="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          >
            {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="text"
            value={url}
            onInput={(e: any) => setUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
            class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary font-mono"
          />
        </div>

        <div>
          <label class="text-xs text-text-muted mb-1 block">Headers (one per line: Key: Value)</label>
          <textarea
            value={headers}
            onInput={(e: any) => setHeaders(e.target.value)}
            rows={2}
            class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {['POST', 'PUT', 'PATCH'].includes(method) && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">Body (JSON)</label>
            <textarea
              value={body}
              onInput={(e: any) => setBody(e.target.value)}
              placeholder='{"key": "value"}'
              rows={3}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary resize-none"
            />
          </div>
        )}

        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <label class="text-sm text-text-muted">Runs:</label>
            {[1, 3, 5, 10].map(n => (
              <button
                key={n}
                onClick={() => setRuns(n)}
                class={`text-xs px-2 py-1 rounded border transition-colors ${runs === n ? 'border-primary text-primary' : 'border-border text-text-muted hover:border-primary hover:text-white'}`}
              >
                {n}×
              </button>
            ))}
          </div>
          <div class="flex gap-2">
            {testing && (
              <button onClick={stop} class="px-4 py-2 rounded-lg border border-red-500 text-red-400 text-sm hover:bg-red-900/20 transition-colors">
                Stop
              </button>
            )}
            <button
              onClick={runTest}
              disabled={testing || !url.trim()}
              class="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {testing ? 'Testing…' : 'Run Test'}
            </button>
          </div>
        </div>

        {/* Presets */}
        <div class="flex flex-wrap gap-2">
          <span class="text-xs text-text-muted self-center">Presets:</span>
          {PRESETS.map(p => (
            <button
              key={p.url}
              onClick={() => { setUrl(p.url); setMethod(p.method); }}
              class="text-xs px-2 py-0.5 rounded border border-border text-text-muted hover:text-white hover:border-primary transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {avg != null && results.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="text-base font-semibold mb-4">Results Summary</h2>
          <div class="grid grid-cols-3 gap-3">
            {[
              { label: 'Average', value: `${avg}ms`, extra: avgLabel, extraColor: avgColor },
              { label: 'Fastest', value: `${Math.min(...results.slice(0, runs).map(r => r.duration))}ms` },
              { label: 'Slowest', value: `${Math.max(...results.slice(0, runs).map(r => r.duration))}ms` },
            ].map(s => (
              <div key={s.label} class="bg-bg rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-white">{s.value}</div>
                {s.extra && <div class={`text-xs font-semibold mt-0.5 ${s.extraColor}`}>{s.extra}</div>}
                <div class="text-xs text-text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      {results.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 class="text-base font-semibold">Request History</h2>
            <button onClick={() => setResults([])} class="text-xs text-text-muted hover:text-white transition-colors">Clear</button>
          </div>
          <div class="divide-y divide-border">
            {results.map((r, i) => {
              const { label, color } = speedLabel(r.duration);
              return (
                <div key={i} class="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div class="flex items-center gap-3 min-w-0">
                    <span class={`text-xs font-mono px-1.5 py-0.5 rounded ${r.error ? 'bg-red-900/30 text-red-400' : r.status && r.status < 400 ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                      {r.error ? 'ERR' : r.status}
                    </span>
                    <span class="text-xs font-mono text-text-muted bg-bg px-1.5 py-0.5 rounded">{r.method}</span>
                    {r.error ? (
                      <span class="text-xs text-red-400 truncate">{r.error}</span>
                    ) : (
                      <span class="text-xs text-text-muted">{formatSize(r.size)}</span>
                    )}
                  </div>
                  <div class="flex items-center gap-2 flex-shrink-0">
                    <span class={`text-xs font-semibold ${color}`}>{label}</span>
                    <span class="text-white font-mono font-bold">{r.duration}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted">Note: Times measured from your browser. Cross-origin requests require CORS support from the target server.</p>
    </div>
  );
}
