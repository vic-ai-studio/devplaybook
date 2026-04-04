import { useState } from 'preact/hooks';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

interface Header { key: string; value: string; }

export default function ApiRequestBuilder() {
  const [method, setMethod] = useState<string>('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState<Header[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('');
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...headers];
    next[i] = { ...next[i], [field]: val };
    setHeaders(next);
  };

  const sendRequest = async () => {
    setLoading(true);
    setResponse('');
    setStatus('');
    try {
      const hdrs: Record<string, string> = {};
      headers.forEach(h => { if (h.key) hdrs[h.key] = h.value; });
      const opts: RequestInit = { method, headers: hdrs };
      if (['POST', 'PUT', 'PATCH'].includes(method) && body) opts.body = body;
      const start = performance.now();
      const res = await fetch(url, opts);
      const elapsed = Math.round(performance.now() - start);
      const text = await res.text();
      setStatus(`${res.status} ${res.statusText} — ${elapsed}ms`);
      setStatusCode(res.status);
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)); }
      catch { setResponse(text); }
    } catch (e: any) {
      setStatus('Error');
      setStatusCode(0);
      setResponse(e.message || 'Request failed');
    }
    setLoading(false);
  };

  const curlCmd = () => {
    let cmd = `curl -X ${method}`;
    headers.forEach(h => { if (h.key) cmd += ` \\\n  -H '${h.key}: ${h.value}'`; });
    if (['POST', 'PUT', 'PATCH'].includes(method) && body) cmd += ` \\\n  -d '${body}'`;
    cmd += ` \\\n  '${url}'`;
    return cmd;
  };

  const methodColor: Record<string, string> = {
    GET: 'bg-green-600', POST: 'bg-blue-600', PUT: 'bg-amber-600',
    PATCH: 'bg-orange-600', DELETE: 'bg-red-600', HEAD: 'bg-purple-600', OPTIONS: 'bg-gray-600'
  };

  return (
    <div class="space-y-6">
      {/* Method + URL */}
      <div class="flex gap-2">
        <select
          value={method}
          onChange={(e) => setMethod((e.target as HTMLSelectElement).value)}
          class={`${methodColor[method]} text-white font-bold px-4 py-2 rounded-lg`}
        >
          {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          type="text"
          value={url}
          onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
          class="flex-1 bg-bg-input border border-border rounded-lg px-4 py-2 text-text"
          placeholder="https://api.example.com/endpoint"
        />
        <button
          onClick={sendRequest}
          disabled={loading}
          class="bg-primary hover:bg-primary-dark text-white font-bold px-6 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Headers */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold">Headers</h3>
          <button onClick={addHeader} class="text-primary text-sm hover:underline">+ Add Header</button>
        </div>
        {headers.map((h, i) => (
          <div key={i} class="flex gap-2 mb-2">
            <input
              value={h.key}
              onInput={(e) => updateHeader(i, 'key', (e.target as HTMLInputElement).value)}
              class="flex-1 bg-bg-input border border-border rounded px-3 py-1 text-sm text-text"
              placeholder="Key"
            />
            <input
              value={h.value}
              onInput={(e) => updateHeader(i, 'value', (e.target as HTMLInputElement).value)}
              class="flex-1 bg-bg-input border border-border rounded px-3 py-1 text-sm text-text"
              placeholder="Value"
            />
            <button onClick={() => removeHeader(i)} class="text-red-400 hover:text-red-300 px-2">×</button>
          </div>
        ))}
      </div>

      {/* Body */}
      {['POST', 'PUT', 'PATCH'].includes(method) && (
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <h3 class="font-semibold mb-3">Request Body</h3>
          <textarea
            value={body}
            onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
            class="w-full bg-bg-input border border-border rounded-lg px-4 py-2 text-sm text-text font-mono h-32"
            placeholder='{"key": "value"}'
          />
        </div>
      )}

      {/* cURL */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">cURL Command</h3>
          <button
            onClick={() => copyText(curlCmd(), 'curl')}
            class="text-xs bg-bg-input border border-border hover:border-primary text-text-muted px-3 py-1 rounded-lg transition-colors"
          >
            {copied === 'curl' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="text-sm text-text-muted font-mono whitespace-pre-wrap break-all">{curlCmd()}</pre>
      </div>

      {/* Response */}
      {(response || status) && (
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold flex items-center gap-2">
              Response
              {status && (
                <span class={`text-sm font-mono px-2 py-0.5 rounded ${
                  statusCode && statusCode >= 200 && statusCode < 300 ? 'bg-green-500/15 text-green-400' :
                  statusCode && statusCode >= 400 && statusCode < 500 ? 'bg-yellow-500/15 text-yellow-400' :
                  statusCode && statusCode >= 500 ? 'bg-red-500/15 text-red-400' :
                  'bg-bg-input text-text-muted'
                }`}>{status}</span>
              )}
            </h3>
            {response && (
              <button
                onClick={() => copyText(response, 'response')}
                class="text-xs bg-bg-input border border-border hover:border-primary text-text-muted px-3 py-1 rounded-lg transition-colors"
              >
                {copied === 'response' ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>
          <pre class="text-sm font-mono whitespace-pre-wrap break-all max-h-96 overflow-auto text-secondary">{response}</pre>
        </div>
      )}
    </div>
  );
}
