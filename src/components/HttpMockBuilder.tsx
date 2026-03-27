import { useState, useCallback } from 'preact/hooks';

interface Header {
  key: string;
  value: string;
}

type BodyFormat = 'json' | 'text' | 'html' | 'xml' | 'empty';

const STATUS_PRESETS = [
  { code: 200, label: '200 OK' },
  { code: 201, label: '201 Created' },
  { code: 204, label: '204 No Content' },
  { code: 301, label: '301 Moved Permanently' },
  { code: 302, label: '302 Found' },
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 403, label: '403 Forbidden' },
  { code: 404, label: '404 Not Found' },
  { code: 409, label: '409 Conflict' },
  { code: 422, label: '422 Unprocessable Entity' },
  { code: 429, label: '429 Too Many Requests' },
  { code: 500, label: '500 Internal Server Error' },
  { code: 503, label: '503 Service Unavailable' },
];

const STATUS_TEXT: Record<number, string> = Object.fromEntries(
  STATUS_PRESETS.map(({ code, label }) => [code, label.split(' ').slice(1).join(' ')])
);

const BODY_TEMPLATES: Record<string, { status: number; body: string; format: BodyFormat }> = {
  'Success': {
    status: 200,
    format: 'json',
    body: JSON.stringify({ success: true, data: { id: 1, name: 'Example', createdAt: '2026-01-01T00:00:00Z' } }, null, 2),
  },
  'Created': {
    status: 201,
    format: 'json',
    body: JSON.stringify({ success: true, data: { id: 'abc-123', status: 'active' } }, null, 2),
  },
  'Bad Request': {
    status: 400,
    format: 'json',
    body: JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: [{ field: 'email', message: 'Invalid format' }] } }, null, 2),
  },
  'Unauthorized': {
    status: 401,
    format: 'json',
    body: JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, null, 2),
  },
  'Not Found': {
    status: 404,
    format: 'json',
    body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'Resource not found', id: '999' } }, null, 2),
  },
  'Rate Limited': {
    status: 429,
    format: 'json',
    body: JSON.stringify({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', retryAfter: 60 } }, null, 2),
  },
  'Server Error': {
    status: 500,
    format: 'json',
    body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }, null, 2),
  },
};

const CONTENT_TYPE_MAP: Record<BodyFormat, string> = {
  json: 'application/json',
  text: 'text/plain',
  html: 'text/html',
  xml: 'application/xml',
  empty: '',
};

function getStatusColor(code: number) {
  if (code < 300) return 'text-green-400';
  if (code < 400) return 'text-yellow-400';
  if (code < 500) return 'text-orange-400';
  return 'text-red-400';
}

function buildCurlCommand(status: number, headers: Header[], body: string, format: BodyFormat): string {
  const statusText = STATUS_TEXT[status] || 'Unknown';
  const allHeaders: Header[] = [
    { key: 'HTTP/1.1', value: `${status} ${statusText}` },
    ...(format !== 'empty' ? [{ key: 'Content-Type', value: CONTENT_TYPE_MAP[format] + '; charset=utf-8' }] : []),
    { key: 'X-Mock-Response', value: 'true' },
    ...headers.filter((h) => h.key.trim()),
  ];

  const headerArgs = allHeaders
    .slice(1) // skip HTTP/1.1 line
    .map((h) => `-H '${h.key}: ${h.value}'`)
    .join(' \\\n  ');

  if (format === 'empty' || !body.trim()) {
    return `curl -s -o /dev/null -w "%{http_code}" \\\n  ${headerArgs} \\\n  http://localhost:3000/mock`;
  }

  const escapedBody = body.replace(/'/g, "'\"'\"'");
  return `curl -s -X POST \\\n  ${headerArgs} \\\n  -d '${escapedBody}' \\\n  http://localhost:3000/mock`;
}

function buildFetchMock(status: number, headers: Header[], body: string, format: BodyFormat): string {
  const statusText = STATUS_TEXT[status] || 'Unknown';
  const allHeaders: Record<string, string> = {};
  if (format !== 'empty') allHeaders['Content-Type'] = CONTENT_TYPE_MAP[format];
  headers.filter((h) => h.key.trim()).forEach((h) => { allHeaders[h.key] = h.value; });

  return `// Jest / Vitest fetch mock
global.fetch = jest.fn(() =>
  Promise.resolve(
    new Response(${body.trim() ? `\`${body.replace(/`/g, '\\`')}\`` : 'null'}, {
      status: ${status},
      statusText: '${statusText}',
      headers: new Headers(${JSON.stringify(allHeaders, null, 2)}),
    })
  )
);`;
}

function buildMswHandler(status: number, headers: Header[], body: string, format: BodyFormat): string {
  const allHeaders: Record<string, string> = {};
  if (format !== 'empty') allHeaders['Content-Type'] = CONTENT_TYPE_MAP[format];
  headers.filter((h) => h.key.trim()).forEach((h) => { allHeaders[h.key] = h.value; });

  let returnExpr = '';
  if (format === 'json' && body.trim()) {
    returnExpr = `      return HttpResponse.json(${body}, { status: ${status} });`;
  } else if (body.trim()) {
    returnExpr = `      return new HttpResponse(\`${body.replace(/`/g, '\\`')}\`, {\n        status: ${status},\n        headers: ${JSON.stringify(allHeaders)},\n      });`;
  } else {
    returnExpr = `      return new HttpResponse(null, { status: ${status} });`;
  }

  return `// MSW v2 handler
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/resource', () => {
${returnExpr}
  }),
];`;
}

export default function HttpMockBuilder() {
  const [status, setStatus] = useState(200);
  const [customStatus, setCustomStatus] = useState('');
  const [bodyFormat, setBodyFormat] = useState<BodyFormat>('json');
  const [body, setBody] = useState(BODY_TEMPLATES['Success'].body);
  const [headers, setHeaders] = useState<Header[]>([{ key: '', value: '' }]);
  const [activeTab, setActiveTab] = useState<'preview' | 'curl' | 'fetch' | 'msw'>('preview');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const effectiveStatus = customStatus ? parseInt(customStatus) || status : status;

  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const updateHeader = useCallback((idx: number, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  }, []);

  const removeHeader = useCallback((idx: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const applyTemplate = useCallback((templateName: string) => {
    const t = BODY_TEMPLATES[templateName];
    setStatus(t.status);
    setCustomStatus('');
    setBody(t.body);
    setBodyFormat(t.format);
  }, []);

  const getTabContent = () => {
    switch (activeTab) {
      case 'curl': return buildCurlCommand(effectiveStatus, headers, body, bodyFormat);
      case 'fetch': return buildFetchMock(effectiveStatus, headers, body, bodyFormat);
      case 'msw': return buildMswHandler(effectiveStatus, headers, body, bodyFormat);
      default: return null;
    }
  };

  const copyTab = (tab: typeof activeTab) => {
    const content = tab === 'preview' ? body : getTabContent();
    if (content) {
      navigator.clipboard.writeText(content).then(() => {
        setCopiedTab(tab);
        setTimeout(() => setCopiedTab(null), 2000);
      });
    }
  };

  const statusText = STATUS_TEXT[effectiveStatus] || 'Custom';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Builder */}
      <div class="space-y-5">
        {/* Quick templates */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Quick Templates</label>
          <div class="flex flex-wrap gap-2">
            {Object.keys(BODY_TEMPLATES).map((name) => (
              <button
                key={name}
                onClick={() => applyTemplate(name)}
                class={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  STATUS_TEXT[BODY_TEMPLATES[name].status] === statusText && body === BODY_TEMPLATES[name].body
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface border-border text-text-muted hover:border-primary/50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Status code */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Status Code</label>
          <div class="flex gap-2 mb-2">
            <input
              type="text"
              value={customStatus || status}
              onInput={(e) => {
                const val = (e.target as HTMLInputElement).value;
                if (/^\d{0,3}$/.test(val)) {
                  setCustomStatus(val);
                  setStatus(parseInt(val) || 200);
                }
              }}
              class={`w-24 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold focus:outline-none focus:border-primary ${getStatusColor(effectiveStatus)}`}
            />
            <span class="flex items-center text-sm text-text-muted">{statusText}</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            {STATUS_PRESETS.map(({ code }) => (
              <button
                key={code}
                onClick={() => { setStatus(code); setCustomStatus(''); }}
                class={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                  effectiveStatus === code
                    ? 'bg-primary/20 border-primary text-primary'
                    : `bg-surface border-border ${getStatusColor(code)} hover:border-primary/40`
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* Body format */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Body Format</label>
          <div class="flex gap-2 flex-wrap">
            {(['json', 'text', 'html', 'xml', 'empty'] as BodyFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setBodyFormat(fmt)}
                class={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  bodyFormat === fmt
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface border-border text-text-muted hover:border-primary/50'
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        {bodyFormat !== 'empty' && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Response Body</label>
            <textarea
              value={body}
              onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
              rows={8}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary resize-y"
              placeholder={bodyFormat === 'json' ? '{ "key": "value" }' : 'Response body...'}
            />
          </div>
        )}

        {/* Custom headers */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Custom Headers</label>
            <button
              onClick={addHeader}
              class="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              + Add header
            </button>
          </div>
          <div class="space-y-2">
            {headers.map((h, i) => (
              <div key={i} class="flex gap-2">
                <input
                  type="text"
                  value={h.key}
                  onInput={(e) => updateHeader(i, 'key', (e.target as HTMLInputElement).value)}
                  class="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
                  placeholder="Header-Name"
                />
                <input
                  type="text"
                  value={h.value}
                  onInput={(e) => updateHeader(i, 'value', (e.target as HTMLInputElement).value)}
                  class="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
                  placeholder="value"
                />
                <button
                  onClick={() => removeHeader(i)}
                  class="text-text-muted hover:text-red-400 transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Output */}
      <div class="flex flex-col gap-3">
        {/* Tabs */}
        <div class="flex items-center gap-1 bg-surface rounded-xl p-1 border border-border">
          {(['preview', 'curl', 'fetch', 'msw'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'preview' ? 'Preview' : tab === 'curl' ? 'curl' : tab === 'fetch' ? 'fetch mock' : 'MSW handler'}
            </button>
          ))}
        </div>

        <div class="flex justify-end">
          <button
            onClick={() => copyTab(activeTab)}
            class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors"
          >
            {copiedTab === activeTab ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {activeTab === 'preview' && (
          <div class="flex-1 bg-surface rounded-xl border border-border overflow-hidden">
            {/* Status line */}
            <div class={`px-4 py-2 border-b border-border font-mono text-sm ${getStatusColor(effectiveStatus)}`}>
              HTTP/1.1 {effectiveStatus} {statusText}
            </div>
            {/* Headers */}
            <div class="px-4 py-2 border-b border-border text-xs font-mono text-text-muted space-y-0.5">
              {bodyFormat !== 'empty' && (
                <div><span class="text-text">Content-Type:</span> {CONTENT_TYPE_MAP[bodyFormat]}; charset=utf-8</div>
              )}
              <div><span class="text-text">X-Mock-Response:</span> true</div>
              {headers.filter((h) => h.key.trim()).map((h, i) => (
                <div key={i}><span class="text-text">{h.key}:</span> {h.value}</div>
              ))}
            </div>
            {/* Body */}
            {bodyFormat !== 'empty' && body.trim() && (
              <pre class="p-4 text-xs font-mono text-text overflow-auto max-h-80 whitespace-pre">{body}</pre>
            )}
            {(bodyFormat === 'empty' || !body.trim()) && (
              <div class="p-4 text-xs text-text-muted italic">(empty body)</div>
            )}
          </div>
        )}

        {activeTab !== 'preview' && (
          <pre class="flex-1 bg-surface rounded-xl border border-border p-4 text-xs font-mono text-text overflow-auto leading-relaxed whitespace-pre min-h-64">
            {getTabContent()}
          </pre>
        )}
      </div>
    </div>
  );
}
