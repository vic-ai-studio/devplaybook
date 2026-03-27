import { useState } from 'preact/hooks';

type Tool = 'json-server' | 'msw' | 'wiremock';

interface Route {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  body: string;
  delay: number;
}

let uid = 0;
function newId() { return String(++uid); }

const DEFAULT_ROUTES: Route[] = [
  { id: newId(), method: 'GET', path: '/api/users', statusCode: 200, body: JSON.stringify([{ id: 1, name: 'Alice', email: 'alice@example.com' }, { id: 2, name: 'Bob', email: 'bob@example.com' }], null, 2), delay: 0 },
  { id: newId(), method: 'POST', path: '/api/users', statusCode: 201, body: JSON.stringify({ id: 3, name: 'New User', email: 'new@example.com' }, null, 2), delay: 0 },
  { id: newId(), method: 'GET', path: '/api/users/:id', statusCode: 200, body: JSON.stringify({ id: 1, name: 'Alice', email: 'alice@example.com' }, null, 2), delay: 0 },
];

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

function generateJsonServer(routes: Route[]): string {
  const db: Record<string, unknown> = {};
  const lines: string[] = ['// json-server configuration', '// Install: npm install -g json-server', '// Run: json-server --watch db.json --port 3001', '', '// db.json:'];

  // Simple resource extraction
  for (const r of routes) {
    const parts = r.path.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'api') {
      const resource = parts[1];
      if (!db[resource] && r.method === 'GET' && !r.path.includes(':')) {
        try { db[resource] = JSON.parse(r.body); } catch { db[resource] = []; }
      }
    }
  }

  if (Object.keys(db).length === 0) {
    db['items'] = [{ id: 1, name: 'Example' }];
  }

  lines.push(JSON.stringify(db, null, 2));
  lines.push('');
  lines.push('// Custom routes (routes.json):');
  const routesMap: Record<string, string> = {};
  for (const r of routes) {
    if (r.path.includes(':id')) {
      routesMap[r.path.replace(':id', ':id')] = r.path.replace(':id', ':id');
    }
  }
  if (Object.keys(routesMap).length) lines.push(JSON.stringify(routesMap, null, 2));

  return lines.join('\n');
}

function generateMsw(routes: Route[]): string {
  const imports = `import { http, HttpResponse, delay } from 'msw';\nimport { setupWorker } from 'msw/browser'; // or setupServer for Node\n\n`;

  const handlers = routes.map((r) => {
    const hasDelay = r.delay > 0;
    const bodyStr = r.body.trim();
    let bodyParsed: unknown;
    try { bodyParsed = JSON.parse(bodyStr); } catch { bodyParsed = bodyStr; }

    const delayLine = hasDelay ? `\n    await delay(${r.delay});` : '';
    const method = r.method.toLowerCase();

    return `  http.${method}('${r.path.replace(':id', ':id')}', async () => {${delayLine}
    return HttpResponse.json(${JSON.stringify(bodyParsed, null, 6).replace(/^/gm, '    ').trim()}, { status: ${r.statusCode} });
  }),`;
  }).join('\n\n');

  return `${imports}export const handlers = [\n${handlers}\n];\n\n// Setup:\n// const worker = setupWorker(...handlers);\n// worker.start();`;
}

function generateWireMock(routes: Route[]): string {
  const stubs = routes.map((r) => {
    let bodyObj: unknown;
    try { bodyObj = JSON.parse(r.body); } catch { bodyObj = r.body; }
    const stub: Record<string, unknown> = {
      request: { method: r.method, url: r.path.replace(':id', '\\d+') },
      response: {
        status: r.statusCode,
        headers: { 'Content-Type': 'application/json' },
        jsonBody: bodyObj,
      },
    };
    if (r.delay > 0) {
      (stub.response as Record<string, unknown>).fixedDelayMilliseconds = r.delay;
    }
    return stub;
  });

  return [
    '// WireMock standalone config',
    '// Place in __files/ or use Admin API:',
    '// POST http://localhost:8080/__admin/mappings',
    '',
    ...stubs.map((s) => JSON.stringify(s, null, 2)),
  ].join('\n\n');
}

export default function HttpMockServerConfig() {
  const [tool, setTool] = useState<Tool>('msw');
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES);
  const [copied, setCopied] = useState(false);
  const [editingBody, setEditingBody] = useState<string | null>(null);

  function addRoute() {
    setRoutes((prev) => [
      ...prev,
      { id: newId(), method: 'GET', path: '/api/resource', statusCode: 200, body: '{}', delay: 0 },
    ]);
  }

  function removeRoute(id: string) {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRoute(id: string, patch: Partial<Route>) {
    setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const config =
    tool === 'json-server' ? generateJsonServer(routes)
    : tool === 'msw' ? generateMsw(routes)
    : generateWireMock(routes);

  async function copy() {
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-5">
      {/* Tool selector */}
      <div>
        <p class="text-xs text-text-muted mb-2">Mock server tool</p>
        <div class="flex gap-2">
          {(['msw', 'json-server', 'wiremock'] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              class={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                tool === t
                  ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                  : 'bg-bg-card border-border text-text-muted hover:border-primary/40 hover:text-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Routes editor */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-text">Routes ({routes.length})</p>
          <button
            onClick={addRoute}
            class="text-xs text-primary hover:underline"
          >
            + Add Route
          </button>
        </div>

        {routes.map((route) => (
          <div key={route.id} class="border border-border rounded-xl overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-bg-card border-b border-border flex-wrap">
              <select
                value={route.method}
                onChange={(e) => updateRoute(route.id, { method: (e.target as HTMLSelectElement).value })}
                class="bg-bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono font-semibold text-primary focus:outline-none"
              >
                {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                value={route.path}
                onInput={(e) => updateRoute(route.id, { path: (e.target as HTMLInputElement).value })}
                class="flex-1 min-w-0 bg-bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-primary"
              />
              <input
                type="number"
                value={route.statusCode}
                onInput={(e) => updateRoute(route.id, { statusCode: parseInt((e.target as HTMLInputElement).value) || 200 })}
                class="w-16 bg-bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-primary"
                placeholder="200"
              />
              <input
                type="number"
                value={route.delay}
                onInput={(e) => updateRoute(route.id, { delay: parseInt((e.target as HTMLInputElement).value) || 0 })}
                class="w-20 bg-bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-primary"
                placeholder="delay ms"
              />
              <button
                onClick={() => setEditingBody(editingBody === route.id ? null : route.id)}
                class="text-xs text-text-muted hover:text-text transition-colors"
              >
                {editingBody === route.id ? 'Hide body' : 'Edit body'}
              </button>
              {routes.length > 1 && (
                <button
                  onClick={() => removeRoute(route.id)}
                  class="text-xs text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              )}
            </div>
            {editingBody === route.id && (
              <textarea
                value={route.body}
                onInput={(e) => updateRoute(route.id, { body: (e.target as HTMLTextAreaElement).value })}
                rows={6}
                class="w-full bg-bg-card px-3 py-2 text-xs font-mono text-text focus:outline-none resize-y border-t border-border"
                spellcheck={false}
              />
            )}
          </div>
        ))}
      </div>

      {/* Output */}
      <div class="border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border">
          <span class="text-sm font-semibold text-text">
            {tool === 'json-server' ? 'db.json + routes.json' : tool === 'msw' ? 'MSW handlers.ts' : 'WireMock stub'}
          </span>
          <button
            onClick={copy}
            class="px-3 py-1 text-xs rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 text-xs font-mono text-text bg-bg-card overflow-x-auto whitespace-pre max-h-96">{config}</pre>
      </div>
    </div>
  );
}
