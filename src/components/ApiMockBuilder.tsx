import { useState, useCallback } from 'preact/hooks';

interface MockEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  status: number;
  contentType: string;
  body: string;
  delay: number;
  description: string;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

const STATUS_PRESETS = [
  { code: 200, label: '200 OK' },
  { code: 201, label: '201 Created' },
  { code: 204, label: '204 No Content' },
  { code: 400, label: '400 Bad Request' },
  { code: 401, label: '401 Unauthorized' },
  { code: 403, label: '403 Forbidden' },
  { code: 404, label: '404 Not Found' },
  { code: 422, label: '422 Unprocessable Entity' },
  { code: 429, label: '429 Too Many Requests' },
  { code: 500, label: '500 Internal Server Error' },
];

const BODY_TEMPLATES: Record<string, { status: number; body: string }> = {
  'User object': { status: 200, body: JSON.stringify({ id: 'usr_123', name: 'Alice Example', email: 'alice@example.com', createdAt: '2026-01-01T00:00:00Z', role: 'admin' }, null, 2) },
  'List with pagination': { status: 200, body: JSON.stringify({ data: [{ id: 1, name: 'Item A' }, { id: 2, name: 'Item B' }], total: 42, page: 1, perPage: 10 }, null, 2) },
  'Created resource': { status: 201, body: JSON.stringify({ id: 'new_456', status: 'active', createdAt: new Date().toISOString() }, null, 2) },
  'Validation error': { status: 422, body: JSON.stringify({ error: 'VALIDATION_ERROR', message: 'Request validation failed', details: [{ field: 'email', message: 'Invalid email format' }, { field: 'name', message: 'Name is required' }] }, null, 2) },
  'Auth error': { status: 401, body: JSON.stringify({ error: 'UNAUTHORIZED', message: 'Invalid or expired token', code: 'TOKEN_EXPIRED' }, null, 2) },
  'Not found': { status: 404, body: JSON.stringify({ error: 'NOT_FOUND', message: 'Resource not found', id: ':id' }, null, 2) },
  'Rate limited': { status: 429, body: JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests', retryAfter: 60, limit: 100, remaining: 0 }, null, 2) },
  'Empty (204)': { status: 204, body: '' },
};

let nextId = 1;

function makeId() { return `ep_${nextId++}`; }

function defaultEndpoint(overrides?: Partial<MockEndpoint>): MockEndpoint {
  return {
    id: makeId(),
    method: 'GET',
    path: '/api/users',
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data: [], total: 0 }, null, 2),
    delay: 0,
    description: '',
    ...overrides,
  };
}

function toFetchSnippet(ep: MockEndpoint, baseUrl: string): string {
  const hasBody = ep.body && ep.method !== 'GET' && ep.method !== 'DELETE';
  return `// Mock: ${ep.method} ${baseUrl}${ep.path}
const response = await fetch('${baseUrl}${ep.path}', {
  method: '${ep.method}',${hasBody ? `
  headers: { 'Content-Type': '${ep.contentType}' },
  body: JSON.stringify(${ep.body.slice(0, 60).replace(/\n/g, ' ')}…),` : ''}
});
// Returns ${ep.status} with:
const data = ${ep.body.slice(0, 100).replace(/\n/g, ' ')};`;
}

function toCurlSnippet(ep: MockEndpoint, baseUrl: string): string {
  const hasBody = ep.body && ep.method !== 'GET' && ep.method !== 'DELETE';
  return `curl -X ${ep.method} '${baseUrl}${ep.path}' \\
  -H 'Accept: application/json'${hasBody ? ` \\
  -H 'Content-Type: ${ep.contentType}' \\
  -d '${ep.body.slice(0, 80)}'` : ''}`;
}

function toMswSnippet(endpoints: MockEndpoint[]): string {
  const handlers = endpoints.map(ep => {
    const method = ep.method.toLowerCase();
    const hasBody = ep.body.trim();
    return `  http.${method}('/api${ep.path}', () => {
    return HttpResponse.json(${hasBody ? ep.body.slice(0, 100).trim() : 'null'}, { status: ${ep.status} });
  }),`;
  }).join('\n');
  return `import { http, HttpResponse } from 'msw';

export const handlers = [
${handlers}
];`;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-green-400 bg-green-900/20 border-green-500/30',
  POST: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
  PUT: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  PATCH: 'text-orange-400 bg-orange-900/20 border-orange-500/30',
  DELETE: 'text-red-400 bg-red-900/20 border-red-500/30',
};

export default function ApiMockBuilder() {
  const [endpoints, setEndpoints] = useState<MockEndpoint[]>([defaultEndpoint()]);
  const [selected, setSelected] = useState<string>(endpoints[0].id);
  const [baseUrl, setBaseUrl] = useState('https://api.example.com');
  const [exportMode, setExportMode] = useState<'fetch' | 'curl' | 'msw'>('fetch');
  const [copied, setCopied] = useState(false);

  const current = endpoints.find(e => e.id === selected) ?? endpoints[0];

  function update(id: string, changes: Partial<MockEndpoint>) {
    setEndpoints(eps => eps.map(ep => ep.id === id ? { ...ep, ...changes } : ep));
  }

  function addEndpoint() {
    const ep = defaultEndpoint({ path: '/api/endpoint', method: 'GET' });
    setEndpoints(eps => [...eps, ep]);
    setSelected(ep.id);
  }

  function removeEndpoint(id: string) {
    const remaining = endpoints.filter(ep => ep.id !== id);
    if (remaining.length === 0) return;
    setEndpoints(remaining);
    if (selected === id) setSelected(remaining[remaining.length - 1].id);
  }

  function applyTemplate(name: string) {
    const tpl = BODY_TEMPLATES[name];
    if (tpl) update(current.id, { body: tpl.body, status: tpl.status });
  }

  const exportCode = exportMode === 'msw'
    ? toMswSnippet(endpoints)
    : exportMode === 'curl'
    ? toCurlSnippet(current, baseUrl)
    : toFetchSnippet(current, baseUrl);

  function copyExport() {
    navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="flex-1">
          <label class="text-xs text-text-muted block mb-1">Base URL</label>
          <input
            type="text"
            value={baseUrl}
            onInput={e => setBaseUrl((e.target as HTMLInputElement).value)}
            class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div class="pt-5">
          <button onClick={addEndpoint} class="bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2 text-sm font-medium transition-colors">+ Add Endpoint</button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 min-h-[420px]">
        {/* Endpoint List */}
        <div class="space-y-2">
          <p class="text-xs text-text-muted font-medium uppercase tracking-wide">Endpoints ({endpoints.length})</p>
          {endpoints.map(ep => (
            <div
              key={ep.id}
              onClick={() => setSelected(ep.id)}
              class={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${selected === ep.id ? 'border-blue-500 bg-blue-900/20' : 'border-border hover:border-border/80 bg-surface'}`}
            >
              <span class={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
              <span class="text-xs font-mono text-white truncate flex-1">{ep.path}</span>
              <span class="text-xs text-text-muted">{ep.status}</span>
              {endpoints.length > 1 && (
                <button
                  onClick={e => { e.stopPropagation(); removeEndpoint(ep.id); }}
                  class="text-text-muted hover:text-red-400 text-xs"
                >✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Endpoint Editor */}
        <div class="col-span-2 space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">Method</label>
              <select
                value={current.method}
                onChange={e => update(current.id, { method: (e.target as HTMLSelectElement).value as MockEndpoint['method'] })}
                class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Status Code</label>
              <select
                value={current.status}
                onChange={e => update(current.id, { status: parseInt((e.target as HTMLSelectElement).value) })}
                class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {STATUS_PRESETS.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs text-text-muted block mb-1">Path</label>
            <input
              type="text"
              value={current.path}
              onInput={e => update(current.id, { path: (e.target as HTMLInputElement).value })}
              placeholder="/api/users/:id"
              class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-text-muted">Response Body</label>
              <div class="flex gap-1">
                {Object.keys(BODY_TEMPLATES).map(name => (
                  <button key={name} onClick={() => applyTemplate(name)} class="text-xs text-blue-400 hover:text-blue-300 px-1">
                    {name}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={current.body}
              onInput={e => update(current.id, { body: (e.target as HTMLTextAreaElement).value })}
              class="w-full h-36 bg-[#1a1a2e] border border-border rounded p-3 font-mono text-xs text-white resize-none focus:outline-none focus:border-blue-500"
              spellcheck={false}
            />
          </div>

          <div>
            <label class="text-xs text-text-muted block mb-1">Description (optional)</label>
            <input
              type="text"
              value={current.description}
              onInput={e => update(current.id, { description: (e.target as HTMLInputElement).value })}
              placeholder="What this endpoint does"
              class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Export */}
      <div class="space-y-3 pt-2 border-t border-border">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">Export</p>
          <div class="flex gap-2">
            {(['fetch', 'curl', 'msw'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setExportMode(mode)}
                class={`px-3 py-1 rounded text-xs font-medium border transition-colors ${exportMode === mode ? 'border-blue-500 bg-blue-900/20 text-blue-400' : 'border-border text-text-muted hover:text-white'}`}
              >
                {mode === 'msw' ? 'MSW handlers' : mode === 'curl' ? 'cURL' : 'fetch()'}
              </button>
            ))}
          </div>
        </div>
        <div class="relative">
          <pre class="bg-[#1a1a2e] rounded p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap">{exportCode}</pre>
          <button
            onClick={copyExport}
            class="absolute top-2 right-2 text-xs bg-surface border border-border rounded px-2 py-1 text-text-muted hover:text-white transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        {exportMode === 'msw' && (
          <p class="text-xs text-text-muted">MSW (Mock Service Worker) lets you mock APIs in tests and Storybook. All {endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''} exported as handlers.</p>
        )}
      </div>
    </div>
  );
}
