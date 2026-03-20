import { useState, useEffect } from 'preact/hooks';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Method = typeof METHODS[number];

interface Header { key: string; value: string; enabled: boolean; }

interface HistoryEntry {
  method: Method;
  url: string;
  status: number;
  statusText: string;
  elapsed: number;
  ts: number;
}

const METHOD_COLOR: Record<Method, string> = {
  GET: 'text-green-400',
  POST: 'text-blue-400',
  PUT: 'text-amber-400',
  PATCH: 'text-orange-400',
  DELETE: 'text-red-400',
};

const STATUS_COLOR = (s: number) => {
  if (s < 300) return 'text-green-400';
  if (s < 400) return 'text-yellow-400';
  if (s < 500) return 'text-orange-400';
  return 'text-red-400';
};

const DEFAULT_HEADERS: Header[] = [
  { key: 'Content-Type', value: 'application/json', enabled: true },
  { key: 'Accept', value: 'application/json', enabled: true },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function HttpApiTester() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState<Header[]>(DEFAULT_HEADERS);
  const [body, setBody] = useState('');
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'raw'>('body');

  const [loading, setLoading] = useState(false);
  const [respBody, setRespBody] = useState('');
  const [respHeaders, setRespHeaders] = useState<[string, string][]>([]);
  const [respStatus, setRespStatus] = useState(0);
  const [respStatusText, setRespStatusText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [respSize, setRespSize] = useState(0);
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [copied, setCopied] = useState('');

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('api-tester-history');
      if (saved) setHistory(JSON.parse(saved).slice(0, 20));
    } catch {}
  }, []);

  const addHeader = () => setHeaders(h => [...h, { key: '', value: '', enabled: true }]);
  const removeHeader = (i: number) => setHeaders(h => h.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: keyof Header, val: string | boolean) => {
    setHeaders(h => { const n = [...h]; n[i] = { ...n[i], [field]: val }; return n; });
  };

  const sendRequest = async () => {
    if (!url) return;
    setLoading(true);
    setRespBody(''); setRespHeaders([]); setRespStatus(0); setRespStatusText(''); setElapsed(0); setRespSize(0);
    try {
      const hdrs: Record<string, string> = {};
      headers.filter(h => h.enabled && h.key).forEach(h => { hdrs[h.key] = h.value; });
      const opts: RequestInit = { method, headers: hdrs };
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) opts.body = body;
      const start = performance.now();
      const res = await fetch(url, opts);
      const ms = Math.round(performance.now() - start);
      const text = await res.text();
      const size = new TextEncoder().encode(text).length;

      const respHdrs: [string, string][] = [];
      res.headers.forEach((v, k) => respHdrs.push([k, v]));

      let formatted = text;
      try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch {}

      setRespBody(formatted);
      setRespHeaders(respHdrs);
      setRespStatus(res.status);
      setRespStatusText(res.statusText);
      setElapsed(ms);
      setRespSize(size);

      const entry: HistoryEntry = { method, url, status: res.status, statusText: res.statusText, elapsed: ms, ts: Date.now() };
      const newHistory = [entry, ...history].slice(0, 20);
      setHistory(newHistory);
      try { localStorage.setItem('api-tester-history', JSON.stringify(newHistory)); } catch {}
    } catch (e: any) {
      setRespBody(e.message || 'Request failed');
      setRespStatus(0);
      setRespStatusText('Error');
    }
    setLoading(false);
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const curlCmd = () => {
    let cmd = `curl -X ${method}`;
    headers.filter(h => h.enabled && h.key).forEach(h => { cmd += ` \\\n  -H '${h.key}: ${h.value}'`; });
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) cmd += ` \\\n  -d '${body}'`;
    cmd += ` \\\n  '${url}'`;
    return cmd;
  };

  const loadHistory = (entry: HistoryEntry) => {
    setMethod(entry.method);
    setUrl(entry.url);
  };

  return (
    <div class="space-y-4">
      {/* URL bar */}
      <div class="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod((e.target as HTMLSelectElement).value as Method)}
          class="bg-surface border border-border rounded-lg px-3 py-2 font-mono text-sm font-semibold focus:outline-none focus:border-accent"
          style={{ color: method === 'GET' ? '#4ade80' : method === 'POST' ? '#60a5fa' : method === 'DELETE' ? '#f87171' : method === 'PUT' ? '#fbbf24' : '#fb923c' }}
        >
          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          value={url}
          onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendRequest(); }}
          placeholder="https://api.example.com/endpoint"
          class="flex-1 bg-surface border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent"
        />
        <button
          onClick={sendRequest}
          disabled={loading}
          class="bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          {loading ? 'Sending…' : 'Send'}
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Request panel */}
        <div class="lg:col-span-3 space-y-3">
          {/* Tabs */}
          <div class="flex gap-1 border-b border-border">
            {(['body', 'headers', 'raw'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-4 py-2 text-sm capitalize transition-colors ${activeTab === tab ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'}`}
              >
                {tab === 'raw' ? 'cURL' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'headers' && <span class="ml-1 text-xs text-text-muted">({headers.filter(h => h.enabled && h.key).length})</span>}
              </button>
            ))}
          </div>

          {activeTab === 'body' && (
            <div class="space-y-2">
              {['POST', 'PUT', 'PATCH'].includes(method) ? (
                <textarea
                  value={body}
                  onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
                  placeholder='{\n  "key": "value"\n}'
                  class="w-full h-48 bg-surface border border-border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:border-accent"
                  spellcheck={false}
                />
              ) : (
                <div class="h-48 flex items-center justify-center text-text-muted text-sm border border-dashed border-border rounded-lg">
                  Body not applicable for {method} requests
                </div>
              )}
            </div>
          )}

          {activeTab === 'headers' && (
            <div class="space-y-2">
              {headers.map((h, i) => (
                <div key={i} class="flex gap-2 items-center">
                  <input
                    type="checkbox"
                    checked={h.enabled}
                    onChange={(e) => updateHeader(i, 'enabled', (e.target as HTMLInputElement).checked)}
                    class="accent-accent"
                  />
                  <input
                    value={h.key}
                    onInput={(e) => updateHeader(i, 'key', (e.target as HTMLInputElement).value)}
                    placeholder="Header-Name"
                    class="flex-1 bg-surface border border-border rounded px-2 py-1 font-mono text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    value={h.value}
                    onInput={(e) => updateHeader(i, 'value', (e.target as HTMLInputElement).value)}
                    placeholder="value"
                    class="flex-1 bg-surface border border-border rounded px-2 py-1 font-mono text-sm focus:outline-none focus:border-accent"
                  />
                  <button onClick={() => removeHeader(i)} class="text-text-muted hover:text-red-400 px-1 text-lg">×</button>
                </div>
              ))}
              <button onClick={addHeader} class="text-sm text-accent hover:underline">+ Add header</button>
            </div>
          )}

          {activeTab === 'raw' && (
            <div class="relative">
              <pre class="h-48 overflow-auto bg-surface border border-border rounded-lg p-3 font-mono text-xs text-text-muted">{curlCmd()}</pre>
              <button
                onClick={() => copyText(curlCmd(), 'curl')}
                class="absolute top-2 right-2 text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors"
              >
                {copied === 'curl' ? '✓' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* History panel */}
        <div class="lg:col-span-2 space-y-2">
          <div class="text-sm font-medium text-text-muted flex items-center justify-between">
            <span>History</span>
            {history.length > 0 && (
              <button onClick={() => { setHistory([]); try { localStorage.removeItem('api-tester-history'); } catch {} }} class="text-xs text-text-muted hover:text-red-400">Clear</button>
            )}
          </div>
          <div class="h-48 overflow-y-auto space-y-1">
            {history.length === 0 ? (
              <div class="flex items-center justify-center h-full text-text-muted text-xs">No requests yet</div>
            ) : history.map((e, i) => (
              <button
                key={i}
                onClick={() => loadHistory(e)}
                class="w-full text-left px-2 py-1.5 rounded bg-surface hover:border-accent border border-border transition-colors text-xs"
              >
                <div class="flex items-center gap-2">
                  <span class={`font-mono font-semibold ${METHOD_COLOR[e.method] || 'text-text'}`}>{e.method}</span>
                  <span class={`font-mono ${STATUS_COLOR(e.status)}`}>{e.status}</span>
                  <span class="text-text-muted">{e.elapsed}ms</span>
                </div>
                <div class="text-text-muted truncate mt-0.5">{e.url}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Response */}
      {(respStatus > 0 || respStatusText === 'Error') && (
        <div class="space-y-3 border border-border rounded-lg p-4">
          <div class="flex items-center gap-4 text-sm">
            <span class={`font-mono font-semibold text-lg ${STATUS_COLOR(respStatus)}`}>
              {respStatus} {respStatusText}
            </span>
            <span class="text-text-muted">{elapsed}ms</span>
            <span class="text-text-muted">{formatSize(respSize)}</span>
            <div class="ml-auto flex gap-1">
              {(['body', 'headers'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setResponseTab(tab)}
                  class={`px-3 py-1 text-xs rounded capitalize transition-colors ${responseTab === tab ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {responseTab === 'body' && (
            <div class="relative">
              <pre class="overflow-auto max-h-96 bg-surface border border-border rounded-lg p-3 font-mono text-xs text-text-muted">{respBody}</pre>
              <button
                onClick={() => copyText(respBody, 'resp')}
                class="absolute top-2 right-2 text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors"
              >
                {copied === 'resp' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}

          {responseTab === 'headers' && (
            <div class="overflow-auto max-h-96 space-y-1">
              {respHeaders.map(([k, v], i) => (
                <div key={i} class="flex gap-2 text-xs font-mono py-1 border-b border-border/50">
                  <span class="text-accent min-w-40">{k}</span>
                  <span class="text-text-muted break-all">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
