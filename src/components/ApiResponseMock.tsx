import { useState, useCallback } from 'preact/hooks';

const STATUS_CODES = [
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
  { code: 502, label: '502 Bad Gateway' },
  { code: 503, label: '503 Service Unavailable' },
];

const TEMPLATES: Record<string, { body: string; contentType: string }> = {
  'Success (200)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 1, name: 'Example Item', createdAt: new Date().toISOString() }, meta: { page: 1, total: 42 } }, null, 2),
  },
  'Created (201)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data: { id: 'abc-123', name: 'New Resource', status: 'active', createdAt: new Date().toISOString() } }, null, 2),
  },
  'Error (400)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: [{ field: 'email', message: 'Invalid email format' }, { field: 'name', message: 'Name is required' }] } }, null, 2),
  },
  'Unauthorized (401)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required. Provide a valid Bearer token.' } }, null, 2),
  },
  'Not Found (404)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'NOT_FOUND', message: 'The requested resource was not found', resource: 'item', id: '999' } }, null, 2),
  },
  'Rate Limited (429)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', retryAfter: 60, limit: 100, remaining: 0, resetAt: new Date(Date.now() + 60000).toISOString() } }, null, 2),
  },
  'Server Error (500)': {
    contentType: 'application/json',
    body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', requestId: 'req_' + Math.random().toString(36).slice(2) } }, null, 2),
  },
  'Paginated List': {
    contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }, { id: 3, name: 'Item 3' }], pagination: { page: 1, perPage: 20, total: 3, totalPages: 1, hasNext: false, hasPrev: false } }, null, 2),
  },
};

const CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'text/plain',
  'text/html',
  'application/x-www-form-urlencoded',
];

function getStatusColor(code: number) {
  if (code < 300) return 'text-green-400';
  if (code < 400) return 'text-yellow-400';
  if (code < 500) return 'text-orange-400';
  return 'text-red-400';
}

function generateHeaders(status: number, contentType: string, latency: number) {
  const now = new Date();
  return {
    'HTTP/1.1': `${status} ${STATUS_CODES.find(s => s.code === status)?.label.split(' ').slice(1).join(' ') ?? ''}`,
    'Content-Type': contentType + (contentType.includes('json') || contentType.includes('text') ? '; charset=utf-8' : ''),
    'Date': now.toUTCString(),
    'X-Request-Id': 'req_' + Math.random().toString(36).slice(2, 10),
    'X-Response-Time': `${latency}ms`,
    'Cache-Control': status === 200 ? 'no-cache, private' : 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  };
}

export default function ApiResponseMock() {
  const [statusCode, setStatusCode] = useState(200);
  const [contentType, setContentType] = useState('application/json');
  const [latency, setLatency] = useState(120);
  const [body, setBody] = useState(TEMPLATES['Success (200)'].body);
  const [bodyError, setBodyError] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const headers = generateHeaders(statusCode, contentType, latency);

  const validateBody = useCallback((val: string) => {
    if (contentType === 'application/json' && val.trim()) {
      try { JSON.parse(val); setBodyError(''); } catch (e: any) { setBodyError('Invalid JSON: ' + e.message); }
    } else { setBodyError(''); }
  }, [contentType]);

  const applyTemplate = (tplName: string) => {
    const tpl = TEMPLATES[tplName];
    if (!tpl) return;
    setBody(tpl.body);
    setContentType(tpl.contentType);
    const codeMatch = tplName.match(/\((\d+)\)/);
    if (codeMatch) setStatusCode(parseInt(codeMatch[1]));
    setBodyError('');
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 1800);
    });
  };

  const fullResponse = `${Object.entries(headers).map(([k, v]) => k === 'HTTP/1.1' ? `HTTP/1.1 ${v}` : `${k}: ${v}`).join('\n')}\n\n${body}`;

  const prettyBody = contentType === 'application/json' && !bodyError && body.trim()
    ? (() => { try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; } })()
    : body;

  return (
    <div class="space-y-6">
      {/* Templates */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Quick Templates</label>
        <div class="flex flex-wrap gap-2">
          {Object.keys(TEMPLATES).map(name => (
            <button
              key={name}
              onClick={() => applyTemplate(name)}
              class="text-xs bg-bg-card border border-border hover:border-primary px-3 py-1.5 rounded-md transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Config row */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Status Code</label>
          <select
            value={statusCode}
            onChange={e => setStatusCode(parseInt((e.target as HTMLSelectElement).value))}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {STATUS_CODES.map(s => (
              <option key={s.code} value={s.code}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Content-Type</label>
          <select
            value={contentType}
            onChange={e => setContentType((e.target as HTMLSelectElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {CONTENT_TYPES.map(ct => (
              <option key={ct} value={ct}>{ct}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Simulated Latency (ms)</label>
          <input
            type="number"
            min={0}
            max={30000}
            value={latency}
            onInput={e => setLatency(Math.max(0, parseInt((e.target as HTMLInputElement).value) || 0))}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Response Body Input */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="block text-sm font-medium text-text-muted">Response Body</label>
          {bodyError && <span class="text-xs text-red-400">{bodyError}</span>}
        </div>
        <textarea
          value={body}
          onInput={e => { const v = (e.target as HTMLTextAreaElement).value; setBody(v); validateBody(v); }}
          rows={10}
          spellcheck={false}
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary resize-y"
          placeholder="Enter response body..."
        />
      </div>

      {/* Preview */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 border-b border-border">
          <div class="flex items-center gap-3">
            <span class={`text-sm font-bold font-mono ${getStatusColor(statusCode)}`}>{statusCode}</span>
            <span class="text-sm text-text-muted">{latency}ms</span>
          </div>
          <button
            onClick={() => copyText(fullResponse, 'full')}
            class="text-xs bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-md transition-colors font-medium"
          >
            {copiedSection === 'full' ? '✓ Copied!' : 'Copy Full Response'}
          </button>
        </div>

        {/* Headers */}
        <div class="px-4 py-3 border-b border-border">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Response Headers</span>
            <button
              onClick={() => copyText(Object.entries(headers).map(([k, v]) => k === 'HTTP/1.1' ? `HTTP/1.1 ${v}` : `${k}: ${v}`).join('\n'), 'headers')}
              class="text-xs text-primary hover:underline"
            >
              {copiedSection === 'headers' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div class="font-mono text-xs space-y-1">
            {Object.entries(headers).map(([key, val]) => (
              <div key={key} class="flex gap-2">
                <span class={key === 'HTTP/1.1' ? `font-bold ${getStatusColor(statusCode)}` : 'text-sky-400 shrink-0'}>{key === 'HTTP/1.1' ? `HTTP/1.1 ${val}` : `${key}:`}</span>
                {key !== 'HTTP/1.1' && <span class="text-text-muted break-all">{val}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Body Preview */}
        {body.trim() && (
          <div class="px-4 py-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Response Body</span>
              <button
                onClick={() => copyText(prettyBody, 'body')}
                class="text-xs text-primary hover:underline"
              >
                {copiedSection === 'body' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="font-mono text-xs text-text-muted overflow-x-auto max-h-64 leading-relaxed">{prettyBody}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
