import { useState } from 'preact/hooks';

type OutputFormat = 'express' | 'nginx' | 'vercel' | 'cloudflare';

interface CorsConfig {
  origins: string[];
  allowAll: boolean;
  methods: string[];
  allowedHeaders: string[];
  exposeHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

const ALL_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const COMMON_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token'];

function generateExpress(cfg: CorsConfig): string {
  const origin = cfg.allowAll ? "'*'" : cfg.origins.length === 1
    ? `'${cfg.origins[0]}'`
    : `[\n    ${cfg.origins.map(o => `'${o}'`).join(',\n    ')}\n  ]`;

  const lines: string[] = [`const corsOptions = {`];
  lines.push(`  origin: ${origin},`);
  lines.push(`  methods: [${cfg.methods.map(m => `'${m}'`).join(', ')}],`);
  if (cfg.allowedHeaders.length > 0) {
    lines.push(`  allowedHeaders: [${cfg.allowedHeaders.map(h => `'${h}'`).join(', ')}],`);
  }
  if (cfg.exposeHeaders.length > 0) {
    lines.push(`  exposedHeaders: [${cfg.exposeHeaders.map(h => `'${h}'`).join(', ')}],`);
  }
  lines.push(`  credentials: ${cfg.credentials},`);
  lines.push(`  maxAge: ${cfg.maxAge},`);
  lines.push(`  optionsSuccessStatus: 200,`);
  lines.push(`};`);
  lines.push(``);
  lines.push(`// Usage:`);
  lines.push(`// npm install cors`);
  lines.push(`// import cors from 'cors';`);
  lines.push(`app.use(cors(corsOptions));`);
  lines.push(``);
  lines.push(`// Or for a specific route:`);
  lines.push(`// app.get('/api/data', cors(corsOptions), (req, res) => { ... });`);
  return lines.join('\n');
}

function generateNginx(cfg: CorsConfig): string {
  const origin = cfg.allowAll ? '$http_origin' : cfg.origins[0] || 'https://example.com';
  const lines: string[] = [];
  lines.push(`# Add to your nginx server {} or location {} block`);
  lines.push(``);

  if (!cfg.allowAll && cfg.origins.length > 1) {
    lines.push(`# Multiple origins — use a map block in the http {} context:`);
    lines.push(`map $http_origin $cors_origin {`);
    lines.push(`    default "";`);
    cfg.origins.forEach(o => lines.push(`    "${o}" "${o}";`));
    lines.push(`}`);
    lines.push(``);
    lines.push(`# Then in your location block:`);
    lines.push(`add_header 'Access-Control-Allow-Origin' $cors_origin always;`);
  } else {
    lines.push(`add_header 'Access-Control-Allow-Origin' '${cfg.allowAll ? '*' : origin}' always;`);
  }

  lines.push(`add_header 'Access-Control-Allow-Methods' '${cfg.methods.join(', ')}' always;`);
  if (cfg.allowedHeaders.length > 0) {
    lines.push(`add_header 'Access-Control-Allow-Headers' '${cfg.allowedHeaders.join(', ')}' always;`);
  }
  if (cfg.exposeHeaders.length > 0) {
    lines.push(`add_header 'Access-Control-Expose-Headers' '${cfg.exposeHeaders.join(', ')}' always;`);
  }
  if (cfg.credentials) {
    lines.push(`add_header 'Access-Control-Allow-Credentials' 'true' always;`);
  }
  lines.push(`add_header 'Access-Control-Max-Age' '${cfg.maxAge}' always;`);
  lines.push(``);
  lines.push(`# Handle preflight OPTIONS requests:`);
  lines.push(`if ($request_method = 'OPTIONS') {`);
  lines.push(`    add_header 'Access-Control-Allow-Origin' '${cfg.allowAll ? '*' : origin}' always;`);
  lines.push(`    add_header 'Access-Control-Allow-Methods' '${cfg.methods.join(', ')}' always;`);
  lines.push(`    add_header 'Access-Control-Max-Age' '${cfg.maxAge}';`);
  lines.push(`    add_header 'Content-Type' 'text/plain; charset=utf-8';`);
  lines.push(`    add_header 'Content-Length' 0;`);
  lines.push(`    return 204;`);
  lines.push(`}`);
  return lines.join('\n');
}

function generateVercel(cfg: CorsConfig): string {
  const originValue = cfg.allowAll ? '*' : cfg.origins[0] || 'https://example.com';
  const headers: { key: string; value: string }[] = [
    { key: 'Access-Control-Allow-Origin', value: originValue },
    { key: 'Access-Control-Allow-Methods', value: cfg.methods.join(', ') },
  ];
  if (cfg.allowedHeaders.length > 0) {
    headers.push({ key: 'Access-Control-Allow-Headers', value: cfg.allowedHeaders.join(', ') });
  }
  if (cfg.exposeHeaders.length > 0) {
    headers.push({ key: 'Access-Control-Expose-Headers', value: cfg.exposeHeaders.join(', ') });
  }
  if (cfg.credentials) {
    headers.push({ key: 'Access-Control-Allow-Credentials', value: 'true' });
  }
  headers.push({ key: 'Access-Control-Max-Age', value: String(cfg.maxAge) });

  const config = {
    headers: [
      {
        source: '/api/(.*)',
        headers,
      },
    ],
  };

  const note = cfg.origins.length > 1 && !cfg.allowAll
    ? `// Note: Vercel headers config doesn't support dynamic origins natively.\n// For multiple origins, use a middleware.ts file instead.\n// Only the first origin is used here: ${cfg.origins[0]}\n\n`
    : '';

  return note + JSON.stringify(config, null, 2);
}

function generateCloudflare(cfg: CorsConfig): string {
  const lines: string[] = [];
  lines.push(`// Cloudflare Worker — CORS headers`);
  lines.push(`// Paste this into your worker's fetch handler`);
  lines.push(``);

  if (!cfg.allowAll && cfg.origins.length > 1) {
    lines.push(`const ALLOWED_ORIGINS = new Set([`);
    cfg.origins.forEach(o => lines.push(`  '${o}',`));
    lines.push(`]);`);
    lines.push(``);
    lines.push(`function getCorsOrigin(request: Request): string {`);
    lines.push(`  const origin = request.headers.get('Origin') ?? '';`);
    lines.push(`  return ALLOWED_ORIGINS.has(origin) ? origin : '';`);
    lines.push(`}`);
    lines.push(``);
  }

  lines.push(`function corsHeaders(request: Request): HeadersInit {`);
  lines.push(`  return {`);
  if (cfg.allowAll) {
    lines.push(`    'Access-Control-Allow-Origin': '*',`);
  } else if (cfg.origins.length === 1) {
    lines.push(`    'Access-Control-Allow-Origin': '${cfg.origins[0]}',`);
  } else {
    lines.push(`    'Access-Control-Allow-Origin': getCorsOrigin(request),`);
  }
  lines.push(`    'Access-Control-Allow-Methods': '${cfg.methods.join(', ')}',`);
  if (cfg.allowedHeaders.length > 0) {
    lines.push(`    'Access-Control-Allow-Headers': '${cfg.allowedHeaders.join(', ')}',`);
  }
  if (cfg.exposeHeaders.length > 0) {
    lines.push(`    'Access-Control-Expose-Headers': '${cfg.exposeHeaders.join(', ')}',`);
  }
  if (cfg.credentials) {
    lines.push(`    'Access-Control-Allow-Credentials': 'true',`);
  }
  lines.push(`    'Access-Control-Max-Age': '${cfg.maxAge}',`);
  lines.push(`  };`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export default {`);
  lines.push(`  async fetch(request: Request): Promise<Response> {`);
  lines.push(`    // Handle preflight`);
  lines.push(`    if (request.method === 'OPTIONS') {`);
  lines.push(`      return new Response(null, { status: 204, headers: corsHeaders(request) });`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    // Your actual response`);
  lines.push(`    const response = await fetch(request);`);
  lines.push(`    const newResponse = new Response(response.body, response);`);
  lines.push(`    Object.entries(corsHeaders(request)).forEach(([k, v]) => {`);
  lines.push(`      newResponse.headers.set(k, v);`);
  lines.push(`    });`);
  lines.push(`    return newResponse;`);
  lines.push(`  },`);
  lines.push(`};`);
  return lines.join('\n');
}

const FORMAT_LABELS: Record<OutputFormat, string> = {
  express: 'Express.js',
  nginx: 'Nginx',
  vercel: 'Vercel',
  cloudflare: 'Cloudflare Workers',
};

export default function CorsPolicyGenerator() {
  const [origins, setOrigins] = useState<string[]>(['https://example.com']);
  const [allowAll, setAllowAll] = useState(false);
  const [methods, setMethods] = useState<string[]>(['GET', 'POST', 'OPTIONS']);
  const [allowedHeaders, setAllowedHeaders] = useState<string[]>(['Content-Type', 'Authorization']);
  const [customAllowedHeader, setCustomAllowedHeader] = useState('');
  const [exposeHeaders, setExposeHeaders] = useState<string[]>([]);
  const [customExposeHeader, setCustomExposeHeader] = useState('');
  const [credentials, setCredentials] = useState(false);
  const [maxAge, setMaxAge] = useState(86400);
  const [activeTab, setActiveTab] = useState<OutputFormat>('express');
  const [copied, setCopied] = useState(false);

  const cfg: CorsConfig = { origins, allowAll, methods, allowedHeaders, exposeHeaders, credentials, maxAge };

  const output = (() => {
    switch (activeTab) {
      case 'express': return generateExpress(cfg);
      case 'nginx': return generateNginx(cfg);
      case 'vercel': return generateVercel(cfg);
      case 'cloudflare': return generateCloudflare(cfg);
    }
  })();

  const toggleMethod = (m: string) => {
    setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleAllowedHeader = (h: string) => {
    setAllowedHeaders(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  };

  const addCustomAllowedHeader = () => {
    const h = customAllowedHeader.trim();
    if (h && !allowedHeaders.includes(h)) {
      setAllowedHeaders(prev => [...prev, h]);
    }
    setCustomAllowedHeader('');
  };

  const addExposeHeader = () => {
    const h = customExposeHeader.trim();
    if (h && !exposeHeaders.includes(h)) {
      setExposeHeaders(prev => [...prev, h]);
    }
    setCustomExposeHeader('');
  };

  const updateOrigin = (idx: number, val: string) => {
    setOrigins(prev => prev.map((o, i) => i === idx ? val : o));
  };

  const addOrigin = () => setOrigins(prev => [...prev, '']);
  const removeOrigin = (idx: number) => setOrigins(prev => prev.filter((_, i) => i !== idx));

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div class="space-y-6">
      {/* Origins */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Allowed Origins</h2>
          <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
            <span class="text-text-muted">Allow all origins (*)</span>
            <div
              onClick={() => setAllowAll(p => !p)}
              class={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${allowAll ? 'bg-primary' : 'bg-border'}`}
            >
              <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowAll ? 'translate-x-5' : ''}`} />
            </div>
          </label>
        </div>
        {!allowAll && (
          <div class="space-y-2">
            {origins.map((origin, i) => (
              <div key={i} class="flex gap-2">
                <input
                  type="text"
                  value={origin}
                  onInput={e => updateOrigin(i, (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com"
                  class="flex-1 text-sm bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                {origins.length > 1 && (
                  <button
                    onClick={() => removeOrigin(i)}
                    class="px-3 py-2 text-text-muted hover:text-red-400 border border-border rounded-lg text-sm transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOrigin}
              class="text-sm text-primary hover:underline"
            >
              + Add origin
            </button>
          </div>
        )}
        {allowAll && (
          <div class="text-sm text-text-muted bg-bg border border-border rounded-lg px-3 py-2 font-mono">
            * (all origins)
          </div>
        )}
        {allowAll && credentials && (
          <p class="mt-2 text-xs text-red-400">Warning: <code>Access-Control-Allow-Origin: *</code> cannot be used with <code>credentials: true</code>. Disable "Allow Credentials" or specify explicit origins.</p>
        )}
      </div>

      {/* Methods */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-3">Allowed Methods</h2>
        <div class="flex flex-wrap gap-2">
          {ALL_METHODS.map(m => (
            <button
              key={m}
              onClick={() => toggleMethod(m)}
              class={`px-3 py-1.5 rounded-lg border text-sm font-mono font-medium transition-colors ${
                methods.includes(m)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-bg text-text-muted hover:border-primary/50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Allowed Headers */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-3">Allowed Headers</h2>
        <div class="flex flex-wrap gap-2 mb-3">
          {COMMON_HEADERS.map(h => (
            <button
              key={h}
              onClick={() => toggleAllowedHeader(h)}
              class={`px-3 py-1.5 rounded-lg border text-sm font-mono transition-colors ${
                allowedHeaders.includes(h)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-bg text-text-muted hover:border-primary/50'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        {/* Custom allowed headers */}
        {allowedHeaders.filter(h => !COMMON_HEADERS.includes(h)).map(h => (
          <div key={h} class="inline-flex items-center gap-1 mr-2 mb-2 px-3 py-1.5 border border-primary/60 bg-primary/10 rounded-lg text-sm font-mono text-primary">
            {h}
            <button onClick={() => setAllowedHeaders(prev => prev.filter(x => x !== h))} class="ml-1 hover:text-red-400">✕</button>
          </div>
        ))}
        <div class="flex gap-2 mt-2">
          <input
            type="text"
            value={customAllowedHeader}
            onInput={e => setCustomAllowedHeader((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && addCustomAllowedHeader()}
            placeholder="X-Custom-Header"
            class="flex-1 text-sm bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <button
            onClick={addCustomAllowedHeader}
            class="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:border-primary transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Expose Headers */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-1">Expose Headers <span class="text-xs text-text-muted font-normal ml-1">(optional — headers accessible to JS in the browser)</span></h2>
        <div class="flex flex-wrap gap-2 mb-2">
          {exposeHeaders.map(h => (
            <div key={h} class="inline-flex items-center gap-1 px-3 py-1.5 border border-primary/60 bg-primary/10 rounded-lg text-sm font-mono text-primary">
              {h}
              <button onClick={() => setExposeHeaders(prev => prev.filter(x => x !== h))} class="ml-1 hover:text-red-400">✕</button>
            </div>
          ))}
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            value={customExposeHeader}
            onInput={e => setCustomExposeHeader((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && addExposeHeader()}
            placeholder="X-RateLimit-Limit, Content-Range, ..."
            class="flex-1 text-sm bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <button
            onClick={addExposeHeader}
            class="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:border-primary transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Credentials & Max Age */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-surface border border-border rounded-xl p-5">
          <h2 class="font-semibold text-text mb-3">Allow Credentials</h2>
          <div class="flex items-center gap-3">
            <div
              onClick={() => setCredentials(p => !p)}
              class={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${credentials ? 'bg-primary' : 'bg-border'}`}
            >
              <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${credentials ? 'translate-x-5' : ''}`} />
            </div>
            <span class="text-sm text-text-muted">{credentials ? 'Enabled (cookies, auth headers)' : 'Disabled'}</span>
          </div>
          <p class="text-xs text-text-muted mt-2">Required for cross-origin requests that include cookies or HTTP authentication.</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-5">
          <h2 class="font-semibold text-text mb-3">Max Age (preflight cache)</h2>
          <div class="flex items-center gap-3">
            <input
              type="number"
              value={maxAge}
              min={0}
              max={86400}
              onInput={e => setMaxAge(parseInt((e.target as HTMLInputElement).value) || 0)}
              class="w-32 text-sm bg-bg border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span class="text-sm text-text-muted">seconds</span>
          </div>
          <p class="text-xs text-text-muted mt-2">
            {maxAge >= 3600 ? `${(maxAge / 3600).toFixed(1)}h` : `${maxAge}s`} — how long browsers cache the preflight response. Default: 86400 (24h).
          </p>
        </div>
      </div>

      {/* Output */}
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="flex items-center gap-1 border-b border-border px-2 pt-2 flex-wrap">
          {(Object.keys(FORMAT_LABELS) as OutputFormat[]).map(fmt => (
            <button
              key={fmt}
              onClick={() => setActiveTab(fmt)}
              class={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === fmt
                  ? 'bg-bg text-primary border border-b-0 border-border'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {FORMAT_LABELS[fmt]}
            </button>
          ))}
        </div>
        <div class="relative">
          <pre class="p-4 text-xs font-mono text-text overflow-x-auto bg-bg leading-relaxed">{output}</pre>
          <button
            onClick={copy}
            class={`absolute top-3 right-3 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              copied
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-border bg-surface text-text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Info note */}
      <div class="bg-surface border border-border rounded-xl p-4 text-xs text-text-muted space-y-1">
        <p class="font-medium text-text mb-1">How CORS works</p>
        <p>Browsers send a preflight <code class="font-mono bg-bg px-1 rounded">OPTIONS</code> request before cross-origin requests that use non-simple methods or custom headers. The server must respond with the appropriate <code class="font-mono bg-bg px-1 rounded">Access-Control-*</code> headers to allow the actual request to proceed. Always set CORS on your server — never expose secrets to untrusted origins.</p>
      </div>
    </div>
  );
}
