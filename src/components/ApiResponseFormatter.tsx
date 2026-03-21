import { useState, useMemo } from 'preact/hooks';

interface ParsedResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodyType: 'json' | 'xml' | 'html' | 'text';
  parsedJson: unknown;
  jsonError: string | null;
}

function detectBodyType(body: string, contentType: string): 'json' | 'xml' | 'html' | 'text' {
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('xml')) return 'xml';
  if (contentType.includes('html')) return 'html';
  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<')) return trimmed.includes('html') ? 'html' : 'xml';
  return 'text';
}

function formatJson(str: string, indent: number): { formatted: string; error: string | null } {
  try {
    return { formatted: JSON.stringify(JSON.parse(str), null, indent), error: null };
  } catch (e) {
    return { formatted: str, error: (e as Error).message };
  }
}

function parseRawResponse(raw: string): ParsedResponse | null {
  if (!raw.trim()) return null;
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const statusLine = lines[0] || '';
  const statusMatch = statusLine.match(/^HTTP\/\S+\s+(\d+)\s*(.*)?$/i);
  let status = 200;
  let statusText = 'OK';
  let headerStart = 0;
  if (statusMatch) {
    status = parseInt(statusMatch[1]);
    statusText = statusMatch[2] || '';
    headerStart = 1;
  }
  const headers: Record<string, string> = {};
  let bodyStart = headerStart;
  for (let i = headerStart; i < lines.length; i++) {
    if (lines[i].trim() === '') { bodyStart = i + 1; break; }
    const colonIdx = lines[i].indexOf(':');
    if (colonIdx > 0) {
      const key = lines[i].slice(0, colonIdx).trim().toLowerCase();
      headers[key] = lines[i].slice(colonIdx + 1).trim();
    }
  }
  const body = lines.slice(bodyStart).join('\n');
  const contentType = headers['content-type'] || '';
  const bodyType = detectBodyType(body, contentType);
  let parsedJson: unknown = null;
  let jsonError: string | null = null;
  if (bodyType === 'json' && body.trim()) {
    const { formatted, error } = formatJson(body, 2);
    try { parsedJson = JSON.parse(body); } catch { /* ignore */ }
    jsonError = error;
  }
  return { status, statusText, headers, body, bodyType, parsedJson, jsonError };
}

function statusColor(code: number): string {
  if (code >= 500) return 'text-red-400';
  if (code >= 400) return 'text-orange-400';
  if (code >= 300) return 'text-yellow-400';
  if (code >= 200) return 'text-green-400';
  return 'text-text-muted';
}

function statusBg(code: number): string {
  if (code >= 500) return 'bg-red-500/10 border-red-500/30';
  if (code >= 400) return 'bg-orange-500/10 border-orange-500/30';
  if (code >= 300) return 'bg-yellow-500/10 border-yellow-500/30';
  if (code >= 200) return 'bg-green-500/10 border-green-500/30';
  return 'bg-bg-card border-border';
}

const STATUS_DESCRIPTIONS: Record<number, string> = {
  200: 'OK — Request succeeded.',
  201: 'Created — Resource was created.',
  204: 'No Content — Success but no body.',
  301: 'Moved Permanently — Resource moved.',
  302: 'Found — Temporary redirect.',
  304: 'Not Modified — Cached version is valid.',
  400: 'Bad Request — Invalid request syntax.',
  401: 'Unauthorized — Authentication required.',
  403: 'Forbidden — Insufficient permissions.',
  404: 'Not Found — Resource does not exist.',
  405: 'Method Not Allowed — HTTP method not supported.',
  409: 'Conflict — Request conflicts with current state.',
  422: 'Unprocessable Entity — Validation failed.',
  429: 'Too Many Requests — Rate limit exceeded.',
  500: 'Internal Server Error — Unexpected server failure.',
  502: 'Bad Gateway — Upstream server error.',
  503: 'Service Unavailable — Server temporarily unavailable.',
};

const EXAMPLES = [
  {
    label: '200 JSON',
    value: `HTTP/1.1 200 OK
Content-Type: application/json
X-Request-Id: abc-123
Cache-Control: no-cache

{"user":{"id":42,"name":"Jane Doe","email":"jane@example.com","roles":["admin","editor"],"createdAt":"2024-01-15T10:30:00Z"},"meta":{"page":1,"total":1}}`,
  },
  {
    label: '422 Validation',
    value: `HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{"errors":[{"field":"email","message":"Invalid email format"},{"field":"password","message":"Must be at least 8 characters"}],"message":"Validation failed"}`,
  },
  {
    label: '429 Rate Limit',
    value: `HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1735000060

{"error":"rate_limit_exceeded","message":"Too many requests. Retry after 60 seconds."}`,
  },
  {
    label: '500 Error',
    value: `HTTP/1.1 500 Internal Server Error
Content-Type: application/json

{"error":"internal_error","message":"An unexpected error occurred. Please try again.","requestId":"req-xyz-789"}`,
  },
];

export default function ApiResponseFormatter() {
  const [raw, setRaw] = useState(EXAMPLES[0].value);
  const [indent, setIndent] = useState(2);
  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'analysis'>('body');
  const [copied, setCopied] = useState<string | null>(null);

  const parsed = useMemo(() => parseRawResponse(raw), [raw]);

  const formattedBody = useMemo(() => {
    if (!parsed) return '';
    if (parsed.bodyType === 'json' && parsed.body.trim()) {
      return formatJson(parsed.body, indent).formatted;
    }
    return parsed.body;
  }, [parsed, indent]);

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1300);
  }

  const analysis = useMemo(() => {
    if (!parsed) return [];
    const items: { label: string; value: string; ok: boolean }[] = [];
    // Status code
    const statusOk = parsed.status >= 200 && parsed.status < 300;
    items.push({
      label: 'Status Code',
      value: `${parsed.status} — ${STATUS_DESCRIPTIONS[parsed.status] || parsed.statusText || 'Unknown'}`,
      ok: statusOk,
    });
    // Content-Type
    const ct = parsed.headers['content-type'] || '';
    items.push({ label: 'Content-Type', value: ct || 'Not set', ok: !!ct });
    // Cache headers
    const cacheCtrl = parsed.headers['cache-control'] || '';
    items.push({ label: 'Cache-Control', value: cacheCtrl || 'Not set', ok: !!cacheCtrl });
    // Security headers
    items.push({ label: 'CORS (Access-Control-Allow-Origin)', value: parsed.headers['access-control-allow-origin'] || 'Not set', ok: !!parsed.headers['access-control-allow-origin'] });
    items.push({ label: 'X-Content-Type-Options', value: parsed.headers['x-content-type-options'] || 'Not set', ok: !!parsed.headers['x-content-type-options'] });
    // Rate limit
    if (parsed.headers['x-ratelimit-remaining'] || parsed.headers['retry-after']) {
      items.push({ label: 'Rate Limit Remaining', value: parsed.headers['x-ratelimit-remaining'] || 'N/A', ok: parseInt(parsed.headers['x-ratelimit-remaining'] || '1') > 0 });
    }
    // JSON validity
    if (parsed.bodyType === 'json') {
      items.push({ label: 'JSON Valid', value: parsed.jsonError ? `❌ ${parsed.jsonError}` : '✓ Valid JSON', ok: !parsed.jsonError });
    }
    return items;
  }, [parsed]);

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Paste API Response</h2>
          <div class="flex gap-2 flex-wrap">
            {EXAMPLES.map(ex => (
              <button key={ex.label} onClick={() => setRaw(ex.value)}
                class="text-xs bg-bg border border-border hover:border-primary px-3 py-1 rounded-full transition-colors">
                {ex.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          class="w-full bg-bg border border-border rounded-lg p-3 text-sm font-mono resize-y focus:ring-2 focus:ring-primary focus:border-transparent"
          rows={8}
          value={raw}
          onInput={(e) => setRaw((e.target as HTMLTextAreaElement).value)}
          placeholder="Paste raw HTTP response here (with or without status line and headers)..."
          spellcheck={false}
        />
        <p class="text-xs text-text-muted mt-1">Paste a raw HTTP response including status line, headers, and body — or just the JSON body.</p>
      </div>

      {/* Status badge */}
      {parsed && (
        <div class={`border rounded-xl p-4 flex items-center gap-4 flex-wrap ${statusBg(parsed.status)}`}>
          <div class={`text-3xl font-bold font-mono ${statusColor(parsed.status)}`}>
            {parsed.status}
          </div>
          <div>
            <div class={`font-semibold ${statusColor(parsed.status)}`}>{parsed.statusText || 'Status'}</div>
            <div class="text-sm text-text-muted">{STATUS_DESCRIPTIONS[parsed.status] || 'See analysis tab for details.'}</div>
          </div>
          <div class="ml-auto flex items-center gap-2">
            <span class="text-xs bg-bg-card border border-border px-2 py-1 rounded-full">{parsed.bodyType.toUpperCase()}</span>
            <span class="text-xs bg-bg-card border border-border px-2 py-1 rounded-full">{Object.keys(parsed.headers).length} headers</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      {parsed && (
        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex border-b border-border">
            {(['body', 'headers', 'analysis'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-5 py-3 text-sm font-medium transition-colors capitalize ${
                  activeTab === tab ? 'border-b-2 border-primary text-primary' : 'text-text-muted hover:text-white'
                }`}
              >
                {tab}
                {tab === 'headers' && ` (${Object.keys(parsed.headers).length})`}
              </button>
            ))}
            <div class="flex-1" />
            {activeTab === 'body' && (
              <div class="flex items-center gap-2 px-4">
                <label class="text-xs text-text-muted">Indent:</label>
                <select
                  class="bg-bg border border-border rounded px-2 py-1 text-xs"
                  value={indent}
                  onChange={(e) => setIndent(parseInt((e.target as HTMLSelectElement).value))}
                >
                  <option value={2}>2 spaces</option>
                  <option value={4}>4 spaces</option>
                  <option value={1}>1 space</option>
                </select>
                <button
                  onClick={() => copy(formattedBody, 'body')}
                  class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied === 'body' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
            )}
            {activeTab === 'headers' && (
              <button
                onClick={() => copy(Object.entries(parsed.headers).map(([k, v]) => `${k}: ${v}`).join('\n'), 'headers')}
                class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 m-2 rounded-lg transition-colors"
              >
                {copied === 'headers' ? '✓ Copied!' : 'Copy Headers'}
              </button>
            )}
          </div>

          <div class="p-4">
            {activeTab === 'body' && (
              parsed.body.trim() ? (
                <pre class={`text-sm rounded-lg overflow-x-auto font-mono whitespace-pre-wrap ${
                  parsed.jsonError ? 'text-red-400' : 'text-green-400'
                }`}>{formattedBody}</pre>
              ) : (
                <p class="text-text-muted text-sm italic">No body content.</p>
              )
            )}

            {activeTab === 'headers' && (
              <div class="space-y-1">
                {Object.entries(parsed.headers).length === 0 ? (
                  <p class="text-text-muted text-sm italic">No headers found. Make sure to include the full HTTP response.</p>
                ) : (
                  Object.entries(parsed.headers).map(([k, v]) => (
                    <div key={k} class="flex gap-3 py-1.5 border-b border-border/50 last:border-0 text-sm">
                      <span class="text-primary font-mono min-w-[200px] shrink-0">{k}</span>
                      <span class="text-text-muted font-mono break-all">{v}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'analysis' && (
              <div class="space-y-2">
                {analysis.map(item => (
                  <div key={item.label} class={`flex gap-3 items-start p-3 rounded-lg text-sm border ${
                    item.ok ? 'bg-green-500/5 border-green-500/20' : 'bg-orange-500/5 border-orange-500/20'
                  }`}>
                    <span class={item.ok ? 'text-green-400' : 'text-orange-400'}>{item.ok ? '✓' : '⚠'}</span>
                    <div>
                      <div class="font-medium">{item.label}</div>
                      <div class="text-text-muted text-xs mt-0.5 font-mono">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
