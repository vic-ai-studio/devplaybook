import { useState } from 'preact/hooks';

interface ParsedRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: { name: string; value: string }[];
  body: string;
  bodyJson: any;
  isJson: boolean;
  curlCommand: string;
  contentType: string;
  bodySize: number;
}

const SAMPLE_HTTP = `POST /webhook/payment HTTP/1.1
Host: api.example.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxMjN9.abc123
X-Webhook-Signature: sha256=abc123def456
User-Agent: PaymentProvider/2.1.0
Content-Length: 287

{
  "event": "payment.succeeded",
  "id": "evt_1234567890",
  "created": 1711497600,
  "data": {
    "object": {
      "id": "ch_abc123",
      "amount": 4999,
      "currency": "usd",
      "customer": "cus_xyz789",
      "metadata": {
        "order_id": "order_456"
      }
    }
  }
}`;

const SAMPLE_JSON = `{
  "event": "user.signup",
  "timestamp": "2026-03-27T02:30:00Z",
  "data": {
    "user_id": "u_abc123",
    "email": "user@example.com",
    "plan": "pro",
    "source": "organic"
  },
  "webhook_id": "wh_xyz789"
}`;

function parseRawHttp(raw: string): { result?: ParsedRequest; error?: string } {
  const text = raw.trim();
  if (!text) return { error: 'Empty input.' };

  // If it looks like plain JSON (starts with { or [), parse as JSON-only body
  if (text.startsWith('{') || text.startsWith('[')) {
    return parseJsonPayload(text);
  }

  try {
    // Split headers from body on blank line
    const blankLineMatch = text.match(/\r?\n\r?\n/);
    const headerSection = blankLineMatch ? text.slice(0, text.indexOf(blankLineMatch[0])) : text;
    const bodySection = blankLineMatch ? text.slice(text.indexOf(blankLineMatch[0]) + blankLineMatch[0].length) : '';

    const lines = headerSection.split(/\r?\n/);
    const requestLine = lines[0];

    // Parse request line: METHOD /path HTTP/1.1
    const reqMatch = requestLine.match(/^(\S+)\s+(\S+)\s*(HTTP\/\S+)?$/);
    if (!reqMatch) {
      return { error: 'Could not parse request line. Expected: METHOD /path HTTP/1.1\nIf pasting JSON only, start with { or [.' };
    }

    const method = reqMatch[1].toUpperCase();
    const url = reqMatch[2];
    const httpVersion = reqMatch[3] || 'HTTP/1.1';

    // Parse headers
    const headers: { name: string; value: string }[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      headers.push({
        name: line.slice(0, colonIdx).trim(),
        value: line.slice(colonIdx + 1).trim(),
      });
    }

    const body = bodySection.trim();
    const ctHeader = headers.find(h => h.name.toLowerCase() === 'content-type')?.value ?? '';
    const contentType = ctHeader.split(';')[0].trim();

    let bodyJson: any = null;
    let isJson = false;

    if (body && (contentType.includes('json') || body.startsWith('{') || body.startsWith('['))) {
      try {
        bodyJson = JSON.parse(body);
        isJson = true;
      } catch {}
    }

    // Build host from headers
    const host = headers.find(h => h.name.toLowerCase() === 'host')?.value || 'localhost';
    const fullUrl = url.startsWith('http') ? url : `https://${host}${url}`;

    const curlCommand = buildCurl(method, fullUrl, headers, body, isJson);

    return {
      result: {
        method,
        url: fullUrl,
        httpVersion,
        headers,
        body,
        bodyJson,
        isJson,
        curlCommand,
        contentType,
        bodySize: new TextEncoder().encode(body).length,
      },
    };
  } catch (e: any) {
    return { error: `Parse failed: ${e.message}` };
  }
}

function parseJsonPayload(text: string): { result?: ParsedRequest; error?: string } {
  let bodyJson: any;
  try {
    bodyJson = JSON.parse(text);
  } catch (e: any) {
    return { error: `Invalid JSON: ${e.message}` };
  }

  const body = JSON.stringify(bodyJson, null, 2);
  const curlCommand = buildCurl('POST', 'https://your-endpoint.example.com/webhook', [
    { name: 'Content-Type', value: 'application/json' },
  ], body, true);

  return {
    result: {
      method: 'POST',
      url: 'https://your-endpoint.example.com/webhook',
      httpVersion: 'HTTP/1.1',
      headers: [{ name: 'Content-Type', value: 'application/json' }],
      body,
      bodyJson,
      isJson: true,
      curlCommand,
      contentType: 'application/json',
      bodySize: new TextEncoder().encode(body).length,
    },
  };
}

function buildCurl(method: string, url: string, headers: { name: string; value: string }[], body: string, isJson: boolean): string {
  const parts = [`curl -X ${method}`];
  for (const h of headers) {
    if (h.name.toLowerCase() === 'content-length') continue;
    parts.push(`  -H "${h.name}: ${h.value.replace(/"/g, '\\"')}"`);
  }
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    const escaped = body.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
    parts.push(`  -d "${escaped}"`);
  }
  parts.push(`  "${url}"`);
  return parts.join(' \\\n');
}

function JsonTree({ data, depth = 0 }: { data: any; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (data === null) return <span class="text-text-muted">null</span>;
  if (typeof data === 'boolean') return <span class="text-purple-400">{String(data)}</span>;
  if (typeof data === 'number') return <span class="text-blue-400">{data}</span>;
  if (typeof data === 'string') return <span class="text-green-400">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span class="text-text-muted">[]</span>;
    return (
      <span>
        <button class="text-yellow-400 hover:underline text-xs" onClick={() => setCollapsed(!collapsed)}>
          [{collapsed ? `…${data.length} items` : ''}]
        </button>
        {!collapsed && (
          <div class="ml-4 border-l border-border/40 pl-3">
            {data.map((item, i) => (
              <div key={i} class="my-0.5">
                <span class="text-text-muted text-xs">{i}: </span>
                <JsonTree data={item} depth={depth + 1} />
                {i < data.length - 1 && <span class="text-text-muted">,</span>}
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span class="text-text-muted">{'{}'}</span>;
    return (
      <span>
        <button class="text-yellow-400 hover:underline text-xs" onClick={() => setCollapsed(!collapsed)}>
          {'{'}
          {collapsed ? `…${keys.length} keys` : ''}
          {collapsed ? '}' : ''}
        </button>
        {!collapsed && (
          <div class="ml-4 border-l border-border/40 pl-3">
            {keys.map((k, i) => (
              <div key={k} class="my-0.5">
                <span class="text-red-300">"{k}"</span>
                <span class="text-text-muted">: </span>
                <JsonTree data={data[k]} depth={depth + 1} />
                {i < keys.length - 1 && <span class="text-text-muted">,</span>}
              </div>
            ))}
            <span class="text-yellow-400">{'}'}</span>
          </div>
        )}
      </span>
    );
  }

  return <span>{String(data)}</span>;
}

export default function WebhookRequestInspector() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ParsedRequest | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'headers' | 'body' | 'curl'>('overview');
  const [copied, setCopied] = useState(false);
  const [bodyView, setBodyView] = useState<'tree' | 'raw'>('tree');

  function inspect(text: string) {
    const { result: r, error: e } = parseRawHttp(text);
    if (e) { setError(e); setResult(null); }
    else { setResult(r!); setError(''); setActiveTab('overview'); }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const methodColor: Record<string, string> = {
    GET: 'text-green-400', POST: 'text-blue-400', PUT: 'text-yellow-400',
    PATCH: 'text-orange-400', DELETE: 'text-red-400', HEAD: 'text-purple-400',
    OPTIONS: 'text-cyan-400',
  };

  return (
    <div class="space-y-4">
      <div class="flex gap-2 flex-wrap">
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={() => { setInput(SAMPLE_HTTP); setResult(null); setError(''); }}
        >
          Load Sample (HTTP Request)
        </button>
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={() => { setInput(SAMPLE_JSON); setResult(null); setError(''); }}
        >
          Load Sample (JSON Payload)
        </button>
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={() => { setInput(''); setResult(null); setError(''); }}
        >
          Clear
        </button>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">
          Paste raw HTTP request or JSON payload
        </label>
        <p class="text-xs text-text-muted mb-2">
          Supports: raw HTTP request (with headers + body), or just a JSON payload body.
        </p>
        <textarea
          class="w-full h-52 font-mono text-xs bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder={'POST /webhook HTTP/1.1\nHost: api.example.com\nContent-Type: application/json\n\n{"event": "payment.succeeded", "amount": 4999}'}
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <button
          class="mt-2 px-5 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
          onClick={() => inspect(input)}
        >
          Inspect Request
        </button>
      </div>

      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm whitespace-pre-wrap">{error}</div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Request line badge */}
          <div class="flex items-center gap-3 p-4 bg-surface border border-border rounded-lg flex-wrap">
            <span class={`font-mono font-bold text-lg ${methodColor[result.method] ?? 'text-accent'}`}>{result.method}</span>
            <span class="font-mono text-sm text-text break-all">{result.url}</span>
            <span class="text-xs text-text-muted">{result.httpVersion}</span>
            {result.isJson && <span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">JSON body</span>}
          </div>

          {/* Tabs */}
          <div class="flex gap-1 flex-wrap">
            {(['overview', 'headers', 'body', 'curl'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
              >
                {tab === 'headers' ? `Headers (${result.headers.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview tab */}
          {activeTab === 'overview' && (
            <div class="space-y-3">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Method', value: result.method, color: methodColor[result.method] ?? 'text-accent' },
                  { label: 'Headers', value: result.headers.length.toString(), color: 'text-text' },
                  { label: 'Body Size', value: result.bodySize > 0 ? `${result.bodySize} bytes` : 'none', color: 'text-text' },
                  { label: 'Content-Type', value: result.contentType || 'none', color: 'text-blue-400' },
                  { label: 'HTTP Version', value: result.httpVersion, color: 'text-text-muted' },
                  { label: 'Body Format', value: result.isJson ? 'JSON' : result.body ? 'text/binary' : 'empty', color: result.isJson ? 'text-green-400' : 'text-text-muted' },
                ].map(({ label, value, color }) => (
                  <div class="bg-surface border border-border rounded-lg p-3">
                    <div class="text-xs text-text-muted mb-1">{label}</div>
                    <div class={`text-sm font-semibold truncate ${color}`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Notable headers */}
              {result.headers.filter(h => ['authorization', 'x-api-key', 'x-signature', 'x-webhook-signature', 'x-hub-signature'].includes(h.name.toLowerCase())).length > 0 && (
                <div class="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div class="text-xs font-medium text-yellow-400 mb-2">Auth / Signature Headers</div>
                  {result.headers
                    .filter(h => ['authorization', 'x-api-key', 'x-signature', 'x-webhook-signature', 'x-hub-signature'].includes(h.name.toLowerCase()))
                    .map(h => (
                      <div class="font-mono text-xs text-text-muted">
                        <span class="text-yellow-300">{h.name}:</span> {h.value.length > 50 ? h.value.slice(0, 50) + '…' : h.value}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Headers tab */}
          {activeTab === 'headers' && (
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border text-text-muted text-xs">
                    <th class="text-left p-3">Header Name</th>
                    <th class="text-left p-3">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {result.headers.map((h, i) => (
                    <tr key={i} class="border-b border-border/50 hover:bg-accent/5">
                      <td class="p-3 font-mono text-xs text-accent font-medium">{h.name}</td>
                      <td class="p-3 font-mono text-xs text-text break-all">{h.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Body tab */}
          {activeTab === 'body' && (
            <div class="space-y-3">
              {!result.body ? (
                <div class="p-6 text-center text-text-muted text-sm">No body in this request.</div>
              ) : (
                <>
                  {result.isJson && (
                    <div class="flex gap-2">
                      <button onClick={() => setBodyView('tree')} class={`px-3 py-1 text-xs rounded ${bodyView === 'tree' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted'}`}>Tree View</button>
                      <button onClick={() => setBodyView('raw')} class={`px-3 py-1 text-xs rounded ${bodyView === 'raw' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted'}`}>Raw JSON</button>
                    </div>
                  )}
                  <div class="bg-surface border border-border rounded-lg p-4 relative">
                    <button
                      class="absolute top-3 right-3 px-2 py-1 text-xs bg-accent/10 border border-accent/30 rounded text-accent hover:bg-accent/20 transition-colors"
                      onClick={() => copyText(result.isJson ? JSON.stringify(result.bodyJson, null, 2) : result.body)}
                    >
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    {result.isJson && bodyView === 'tree' ? (
                      <div class="font-mono text-xs leading-relaxed overflow-x-auto">
                        <JsonTree data={result.bodyJson} depth={0} />
                      </div>
                    ) : (
                      <pre class="font-mono text-xs overflow-x-auto whitespace-pre-wrap text-text">
                        {result.isJson ? JSON.stringify(result.bodyJson, null, 2) : result.body}
                      </pre>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Curl tab */}
          {activeTab === 'curl' && (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <p class="text-sm text-text-muted">Equivalent curl command:</p>
                <button
                  class="px-3 py-1 text-xs bg-accent/10 border border-accent/30 rounded text-accent hover:bg-accent/20 transition-colors"
                  onClick={() => copyText(result.curlCommand)}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre class="bg-surface border border-border rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre-wrap text-text">
                {result.curlCommand}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
