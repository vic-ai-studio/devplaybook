import { useState } from 'preact/hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RequestHeader {
  id: number;
  key: string;
  value: string;
}

interface CorsHeaderAnalysis {
  name: string;
  value: string | null;
  status: 'ok' | 'warn' | 'missing' | 'error' | 'info';
  meaning: string;
  recommendation?: string;
}

interface CheckResult {
  mode: 'live' | 'simulator';
  corsStatus: 'ok' | 'blocked' | 'error' | 'partial';
  httpStatus?: number;
  httpStatusText?: string;
  rawError?: string;
  headers: Record<string, string>;
  analysis: CorsHeaderAnalysis[];
  issues: string[];
  passes: string[];
}

type ConfigTab = 'nginx' | 'express' | 'apache' | 'cloudfront' | 'fastify';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

// ─── CORS Header Analysis ─────────────────────────────────────────────────────

function analyzeCorsHeaders(
  headers: Record<string, string>,
  origin: string,
  method: string,
  requestHeaders: RequestHeader[]
): { analysis: CorsHeaderAnalysis[]; issues: string[]; passes: string[] } {
  const get = (name: string) => headers[name.toLowerCase()] ?? null;

  const allowOrigin = get('access-control-allow-origin');
  const allowMethods = get('access-control-allow-methods');
  const allowHeaders = get('access-control-allow-headers');
  const allowCredentials = get('access-control-allow-credentials');
  const maxAge = get('access-control-max-age');
  const exposeHeaders = get('access-control-expose-headers');

  const issues: string[] = [];
  const passes: string[] = [];
  const analysis: CorsHeaderAnalysis[] = [];

  // Access-Control-Allow-Origin
  {
    let status: CorsHeaderAnalysis['status'] = 'missing';
    let meaning = 'Not present — browsers will block all cross-origin reads from this endpoint.';
    let recommendation = `Set to your specific origin: Access-Control-Allow-Origin: ${origin || 'https://yourapp.com'}`;

    if (allowOrigin) {
      if (allowOrigin === '*') {
        if (allowCredentials === 'true') {
          status = 'error';
          meaning = 'Wildcard (*) cannot be combined with credentials — browsers will reject this.';
          recommendation = `Use a specific origin instead of * when sending credentials: Access-Control-Allow-Origin: ${origin || 'https://yourapp.com'}`;
          issues.push('Wildcard origin (*) + credentials=true is invalid — browsers block this combination.');
        } else {
          status = 'ok';
          meaning = 'Allows requests from any origin. Safe for public APIs without credentials.';
          passes.push('Access-Control-Allow-Origin: * — all origins allowed (no credentials).');
        }
      } else if (origin && allowOrigin === origin) {
        status = 'ok';
        meaning = `Matches your origin (${origin}). Cross-origin reads are allowed.`;
        passes.push(`Access-Control-Allow-Origin matches "${origin}".`);
      } else if (origin && allowOrigin !== origin) {
        status = 'error';
        meaning = `Value is "${allowOrigin}" but your origin is "${origin}" — browser will block the response.`;
        recommendation = `Change to: Access-Control-Allow-Origin: ${origin}`;
        issues.push(`Origin mismatch: server returns "${allowOrigin}", browser expects "${origin}".`);
      } else {
        status = 'info';
        meaning = `Set to "${allowOrigin}". Enter your origin above to verify it matches.`;
      }
    } else {
      issues.push('Missing Access-Control-Allow-Origin — cross-origin requests will be blocked.');
    }

    analysis.push({ name: 'Access-Control-Allow-Origin', value: allowOrigin, status, meaning, recommendation });
  }

  // Access-Control-Allow-Methods
  {
    let status: CorsHeaderAnalysis['status'] = 'missing';
    let meaning = 'Not present — only simple methods (GET, POST, HEAD) are implicitly allowed for simple requests.';
    let recommendation: string | undefined;

    if (allowMethods) {
      const methods = allowMethods.split(',').map(m => m.trim().toUpperCase());
      if (methods.includes(method.toUpperCase()) || methods.includes('*')) {
        status = 'ok';
        meaning = `Explicitly allows: ${allowMethods}. Your method (${method}) is permitted.`;
        passes.push(`Access-Control-Allow-Methods includes ${method}.`);
      } else {
        status = 'warn';
        meaning = `Methods allowed: ${allowMethods}. Your method (${method}) is NOT listed.`;
        recommendation = `Add ${method} to: Access-Control-Allow-Methods: ${allowMethods}, ${method}`;
        issues.push(`${method} is not in Access-Control-Allow-Methods (${allowMethods}).`);
      }
    } else {
      status = 'missing';
      recommendation = `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`;
    }

    analysis.push({ name: 'Access-Control-Allow-Methods', value: allowMethods, status, meaning, recommendation });
  }

  // Access-Control-Allow-Headers
  {
    const customKeys = requestHeaders.filter(h => h.key.trim()).map(h => h.key.trim().toLowerCase());
    const simpleHeaders = ['accept', 'accept-language', 'content-language', 'content-type'];
    const nonSimple = customKeys.filter(k => !simpleHeaders.includes(k));

    let status: CorsHeaderAnalysis['status'] = 'info';
    let meaning = 'Not present — only "simple" request headers (Accept, Content-Type, etc.) are implicitly allowed.';
    let recommendation: string | undefined;

    if (allowHeaders) {
      const allowed = allowHeaders.split(',').map(h => h.trim().toLowerCase());
      const blocked = nonSimple.filter(k => !allowed.includes(k) && !allowed.includes('*'));
      if (blocked.length === 0) {
        status = 'ok';
        meaning = `Allows: ${allowHeaders}. All your custom headers are covered.`;
        passes.push('Access-Control-Allow-Headers covers your request headers.');
      } else {
        status = 'warn';
        meaning = `Allows: ${allowHeaders}. Missing headers from your request: ${blocked.join(', ')}.`;
        recommendation = `Add missing headers: Access-Control-Allow-Headers: ${allowHeaders}, ${blocked.join(', ')}`;
        issues.push(`Headers not allowed by server: ${blocked.join(', ')}.`);
      }
    } else if (nonSimple.length > 0) {
      status = 'warn';
      meaning = `Not present, but your request sends non-simple headers: ${nonSimple.join(', ')}. These need explicit allowance.`;
      recommendation = `Access-Control-Allow-Headers: ${nonSimple.join(', ')}`;
      issues.push(`Custom headers ${nonSimple.join(', ')} require Access-Control-Allow-Headers.`);
    } else {
      status = 'ok';
      meaning = 'Not present, but you are only sending simple headers — no issue for simple requests.';
    }

    analysis.push({ name: 'Access-Control-Allow-Headers', value: allowHeaders, status, meaning, recommendation });
  }

  // Access-Control-Allow-Credentials
  {
    let status: CorsHeaderAnalysis['status'] = 'info';
    let meaning = 'Not present — cookies and Authorization headers will not be sent with cross-origin requests by default.';

    if (allowCredentials === 'true') {
      status = 'ok';
      meaning = 'Credentials (cookies, Authorization headers) are allowed in cross-origin requests.';
      passes.push('Access-Control-Allow-Credentials: true — credentials are permitted.');
    } else if (allowCredentials) {
      status = 'warn';
      meaning = `Value is "${allowCredentials}" — must be exactly "true" (lowercase) to enable credentials.`;
    }

    analysis.push({ name: 'Access-Control-Allow-Credentials', value: allowCredentials, status, meaning });
  }

  // Access-Control-Max-Age
  {
    let status: CorsHeaderAnalysis['status'] = 'info';
    let meaning = 'Not present — browser will send a preflight OPTIONS request before every non-simple cross-origin request.';

    if (maxAge) {
      const seconds = parseInt(maxAge, 10);
      status = 'ok';
      meaning = `Preflight results are cached for ${seconds} seconds (~${Math.round(seconds / 3600)} hours). Reduces OPTIONS round-trips.`;
      passes.push(`Access-Control-Max-Age: ${maxAge}s — preflight caching enabled.`);
    }

    analysis.push({ name: 'Access-Control-Max-Age', value: maxAge, status, meaning,
      recommendation: maxAge ? undefined : 'Consider setting: Access-Control-Max-Age: 86400 (24 hours)' });
  }

  // Access-Control-Expose-Headers
  {
    let status: CorsHeaderAnalysis['status'] = 'info';
    let meaning = 'Not present — only "safe" response headers (Cache-Control, Content-Type, etc.) are visible to JavaScript.';

    if (exposeHeaders) {
      status = 'ok';
      meaning = `Exposes additional headers to browser JS: ${exposeHeaders}.`;
    }

    analysis.push({ name: 'Access-Control-Expose-Headers', value: exposeHeaders, status, meaning });
  }

  return { analysis, issues, passes };
}

// ─── Config Generators ────────────────────────────────────────────────────────

function generateNginx(origin: string, methods: string, headers: string, credentials: boolean): string {
  const originVal = origin || '$http_origin';
  return `# Nginx CORS configuration
# Place inside your server {} or location {} block

location / {
    # Handle preflight OPTIONS requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '${originVal}' always;
        add_header 'Access-Control-Allow-Methods' '${methods || 'GET, POST, PUT, PATCH, DELETE, OPTIONS'}' always;
        add_header 'Access-Control-Allow-Headers' '${headers || 'Authorization, Content-Type, Accept'}' always;${credentials ? "\n        add_header 'Access-Control-Allow-Credentials' 'true' always;" : ''}
        add_header 'Access-Control-Max-Age' '86400' always;
        add_header 'Content-Length' '0';
        add_header 'Content-Type' 'text/plain';
        return 204;
    }

    # Add CORS headers to all responses
    add_header 'Access-Control-Allow-Origin' '${originVal}' always;
    add_header 'Access-Control-Allow-Methods' '${methods || 'GET, POST, PUT, PATCH, DELETE, OPTIONS'}' always;
    add_header 'Access-Control-Allow-Headers' '${headers || 'Authorization, Content-Type, Accept'}' always;${credentials ? "\n    add_header 'Access-Control-Allow-Credentials' 'true' always;" : ''}

    # ... your proxy_pass or root config
}`;
}

function generateExpress(origin: string, methods: string, headers: string, credentials: boolean): string {
  return `// Express.js CORS middleware
// npm install cors

import cors from 'cors';

const corsOptions = {
  origin: ${origin ? `'${origin}'` : `(origin, callback) => {
    const allowed = ['https://yourapp.com', 'https://staging.yourapp.com'];
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error('Not allowed by CORS'));
  }`},
  methods: ['${(methods || 'GET, POST, PUT, PATCH, DELETE, OPTIONS').split(',').map(m => m.trim()).join("', '")}'],
  allowedHeaders: ['${(headers || 'Authorization, Content-Type, Accept').split(',').map(h => h.trim()).join("', '")}'],${credentials ? "\n  credentials: true," : ''}
  maxAge: 86400, // 24 hours preflight cache
};

app.use(cors(corsOptions));

// Handle preflight for all routes
app.options('*', cors(corsOptions));`;
}

function generateApache(origin: string, methods: string, headers: string, credentials: boolean): string {
  const originVal = origin || '%{HTTP:Origin}e';
  return `# Apache .htaccess or VirtualHost CORS configuration
# Requires mod_headers enabled: a2enmod headers

<IfModule mod_headers.c>
    # Set CORS headers
    Header always set Access-Control-Allow-Origin "${originVal}"
    Header always set Access-Control-Allow-Methods "${methods || 'GET, POST, PUT, PATCH, DELETE, OPTIONS'}"
    Header always set Access-Control-Allow-Headers "${headers || 'Authorization, Content-Type, Accept'}"${credentials ? '\n    Header always set Access-Control-Allow-Credentials "true"' : ''}
    Header always set Access-Control-Max-Age "86400"

    # Handle preflight OPTIONS requests
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=204,L]
</IfModule>`;
}

function generateCloudFront(origin: string, methods: string, headers: string): string {
  return `// CloudFront Response Headers Policy (CDK / CloudFormation)
// Or configure via AWS Console: CloudFront > Policies > Response Headers

const corsHeadersPolicy = new aws_cloudfront.ResponseHeadersPolicy(this, 'CorsPolicy', {
  responseHeadersPolicyName: 'MyCorsPolicy',
  corsBehavior: {
    accessControlAllowCredentials: false,
    accessControlAllowHeaders: {
      items: ['${(headers || 'Authorization, Content-Type, Accept').split(',').map(h => h.trim()).join("', '")}'],
    },
    accessControlAllowMethods: {
      items: ['${(methods || 'GET, POST, PUT, PATCH, DELETE, OPTIONS').split(',').map(m => m.trim()).join("', '")}'],
    },
    accessControlAllowOrigins: {
      items: ['${origin || 'https://yourapp.com'}'],
    },
    accessControlMaxAge: Duration.seconds(86400),
    originOverride: true,
  },
});

// Attach to your CloudFront distribution behavior
distribution.addBehavior('/api/*', origin, {
  responseHeadersPolicy: corsHeadersPolicy,
});`;
}

function generateFastify(origin: string, methods: string, headers: string, credentials: boolean): string {
  return `// Fastify CORS configuration
// npm install @fastify/cors

import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify();

await fastify.register(cors, {
  origin: ${origin ? `'${origin}'` : `['https://yourapp.com', 'https://staging.yourapp.com']`},
  methods: ['${(methods || 'GET, POST, PUT, PATCH, DELETE, OPTIONS').split(',').map(m => m.trim()).join("', '")}'],
  allowedHeaders: ['${(headers || 'Authorization, Content-Type, Accept').split(',').map(h => h.trim()).join("', '")}'],${credentials ? "\n  credentials: true," : ''}
  maxAge: 86400,
  preflight: true,
  strictPreflight: true,
});

await fastify.listen({ port: 3000 });`;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: CorsHeaderAnalysis['status'] }) {
  const map = {
    ok: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warn: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    missing: 'bg-red-500/15 text-red-400 border-red-500/30',
    error: 'bg-red-500/15 text-red-400 border-red-500/30',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  };
  const labels = { ok: 'OK', warn: 'Warning', missing: 'Missing', error: 'Error', info: 'Info' };
  return (
    <span class={`text-xs border rounded-full px-2 py-0.5 font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CorsPolicyChecker() {
  // Live checker state
  const [targetUrl, setTargetUrl] = useState('https://httpbin.org/get');
  const [originUrl, setOriginUrl] = useState(
    typeof window !== 'undefined' ? window.location.origin : 'https://devplaybook.cc'
  );
  const [method, setMethod] = useState('GET');
  const [requestHeaders, setRequestHeaders] = useState<RequestHeader[]>([
    { id: 1, key: 'Content-Type', value: 'application/json' },
    { id: 2, key: 'Authorization', value: 'Bearer token' },
  ]);
  const [nextId, setNextId] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);

  // Simulator state
  const [simRawHeaders, setSimRawHeaders] = useState(
    `access-control-allow-origin: https://example.com\naccess-control-allow-methods: GET, POST, OPTIONS\naccess-control-allow-headers: Content-Type, Authorization\naccess-control-max-age: 86400`
  );
  const [simResult, setSimResult] = useState<CheckResult | null>(null);

  // Config tabs
  const [configTab, setConfigTab] = useState<ConfigTab>('nginx');
  const [copied, setCopied] = useState<string | null>(null);

  // ── Header management ──

  const addHeader = () => {
    setRequestHeaders(h => [...h, { id: nextId, key: '', value: '' }]);
    setNextId(n => n + 1);
  };

  const removeHeader = (id: number) => setRequestHeaders(h => h.filter(x => x.id !== id));

  const updateHeader = (id: number, field: 'key' | 'value', val: string) => {
    setRequestHeaders(h => h.map(x => x.id === id ? { ...x, [field]: val } : x));
  };

  // ── Live CORS check ──

  const runCheck = async () => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setResult(null);

    const parsedHeaders: Record<string, string> = {};
    for (const h of requestHeaders) {
      if (h.key.trim()) parsedHeaders[h.key.trim()] = h.value;
    }

    try {
      const res = await fetch(targetUrl.trim(), {
        method,
        mode: 'cors',
        headers: parsedHeaders,
      });

      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

      const { analysis, issues, passes } = analyzeCorsHeaders(headers, originUrl, method, requestHeaders);

      const corsOk = !issues.some(i => i.toLowerCase().includes('block') || i.toLowerCase().includes('mismatch') || i.toLowerCase().includes('invalid'));

      setResult({
        mode: 'live',
        corsStatus: issues.length === 0 ? 'ok' : corsOk ? 'partial' : 'blocked',
        httpStatus: res.status,
        httpStatusText: res.statusText,
        headers,
        analysis,
        issues,
        passes,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      setResult({
        mode: 'live',
        corsStatus: 'error',
        rawError: msg,
        headers: {},
        analysis: [],
        issues: [`Request failed: ${msg}`],
        passes: [],
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Simulator ──

  const runSimulator = () => {
    const headers: Record<string, string> = {};
    for (const line of simRawHeaders.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) {
        const k = line.slice(0, idx).trim().toLowerCase();
        const v = line.slice(idx + 1).trim();
        if (k) headers[k] = v;
      }
    }

    const { analysis, issues, passes } = analyzeCorsHeaders(headers, originUrl, method, requestHeaders);
    const corsStatus = issues.length === 0 ? 'ok' : issues.some(i => i.toLowerCase().includes('block') || i.toLowerCase().includes('mismatch')) ? 'blocked' : 'partial';

    setSimResult({ mode: 'simulator', corsStatus, headers, analysis, issues, passes });
  };

  // ── Config generation ──

  const activeResult = result ?? simResult;
  const detectedOrigin = activeResult?.headers['access-control-allow-origin'] !== '*'
    ? (originUrl || 'https://yourapp.com')
    : '*';
  const detectedMethods = activeResult?.headers['access-control-allow-methods'] || 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
  const detectedHeaders = activeResult?.headers['access-control-allow-headers'] || 'Authorization, Content-Type, Accept';
  const detectedCredentials = activeResult?.headers['access-control-allow-credentials'] === 'true';

  const configCode: Record<ConfigTab, string> = {
    nginx: generateNginx(detectedOrigin === '*' ? '' : detectedOrigin, detectedMethods, detectedHeaders, detectedCredentials),
    express: generateExpress(detectedOrigin === '*' ? '' : detectedOrigin, detectedMethods, detectedHeaders, detectedCredentials),
    apache: generateApache(detectedOrigin === '*' ? '' : detectedOrigin, detectedMethods, detectedHeaders, detectedCredentials),
    cloudfront: generateCloudFront(detectedOrigin === '*' ? '' : detectedOrigin, detectedMethods, detectedHeaders),
    fastify: generateFastify(detectedOrigin === '*' ? '' : detectedOrigin, detectedMethods, detectedHeaders, detectedCredentials),
  };

  const copyCode = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1600);
  };

  // ── Status badge helpers ──

  const overallBadge = (status: CheckResult['corsStatus']) => {
    if (status === 'ok') return { label: 'CORS OK', cls: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' };
    if (status === 'partial') return { label: 'Partial', cls: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400' };
    if (status === 'blocked') return { label: 'CORS Blocked', cls: 'bg-red-500/15 border-red-500/30 text-red-400' };
    return { label: 'Error', cls: 'bg-red-500/15 border-red-500/30 text-red-400' };
  };

  const renderResults = (res: CheckResult) => {
    const badge = overallBadge(res.corsStatus);
    return (
      <div class="space-y-4">
        {/* Overall status */}
        <div class={`flex items-center gap-3 rounded-xl border px-5 py-4 ${badge.cls}`}>
          <span class="text-2xl">{res.corsStatus === 'ok' ? '✓' : res.corsStatus === 'partial' ? '⚠' : '✗'}</span>
          <div>
            <div class={`font-bold text-lg ${badge.cls.split(' ').find(c => c.startsWith('text-'))}`}>{badge.label}</div>
            {res.httpStatus && (
              <div class="text-sm opacity-75">HTTP {res.httpStatus} {res.httpStatusText}</div>
            )}
          </div>
        </div>

        {/* Raw error */}
        {res.rawError && (
          <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400 leading-relaxed">
            <p class="font-semibold mb-1">Request Error</p>
            <p>{res.rawError}</p>
            <p class="mt-2 text-xs text-text-muted">
              If you see a network/CORS error here, it means the server is not sending proper CORS headers for your origin.
              Use the Response Headers Simulator below to paste headers from <code class="bg-surface-alt px-1 rounded">curl -I -H "Origin: {originUrl}" {targetUrl}</code> and analyze them without browser restrictions.
            </p>
          </div>
        )}

        {/* Passes & issues */}
        {(res.passes.length > 0 || res.issues.length > 0) && (
          <div class="bg-surface-alt border border-border rounded-xl p-4 space-y-2">
            <p class="text-sm font-semibold text-text mb-3">CORS Analysis Summary</p>
            {res.passes.map((p, i) => (
              <div key={i} class="flex items-start gap-2 text-sm text-emerald-400">
                <span class="shrink-0 mt-0.5">✓</span><span>{p}</span>
              </div>
            ))}
            {res.issues.map((iss, i) => (
              <div key={i} class="flex items-start gap-2 text-sm text-red-400">
                <span class="shrink-0 mt-0.5">✗</span><span>{iss}</span>
              </div>
            ))}
          </div>
        )}

        {/* Header analysis table */}
        {res.analysis.length > 0 && (
          <div class="bg-surface border border-border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-border text-xs font-semibold text-text-muted uppercase tracking-wide">
              CORS Response Headers — Detailed Analysis
            </div>
            <div class="divide-y divide-border">
              {res.analysis.map((item) => (
                <div key={item.name} class="px-4 py-3">
                  <div class="flex items-start gap-3 flex-wrap">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class="font-mono text-sm font-semibold text-text">{item.name}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      {item.value !== null ? (
                        <div class="font-mono text-xs text-text-muted bg-surface-alt rounded px-2 py-1 mb-1.5 break-all">{item.value}</div>
                      ) : (
                        <div class="text-xs text-text-muted italic mb-1.5">Not present in response</div>
                      )}
                      <p class="text-xs text-text-muted leading-relaxed">{item.meaning}</p>
                      {item.recommendation && (
                        <div class="mt-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
                          Fix: <span class="font-mono">{item.recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const CONFIG_TABS: { id: ConfigTab; label: string }[] = [
    { id: 'nginx', label: 'Nginx' },
    { id: 'express', label: 'Express' },
    { id: 'apache', label: 'Apache' },
    { id: 'cloudfront', label: 'CloudFront' },
    { id: 'fastify', label: 'Fastify' },
  ];

  return (
    <div class="space-y-8">

      {/* ── Section 1: Live CORS Checker ── */}
      <section class="space-y-4">
        <div class="bg-blue-500/10 border border-blue-500/25 rounded-lg px-4 py-3 text-xs text-blue-300 leading-relaxed">
          <strong>Note:</strong> This tool makes real requests from your browser. CORS errors will appear if the server doesn't allow your origin.
          For servers you control, use curl: <code class="bg-blue-900/40 px-1 py-0.5 rounded font-mono">curl -I -H "Origin: {originUrl}" {targetUrl}</code>
          and paste the headers into the simulator below.
        </div>

        {/* Inputs */}
        <div class="bg-surface-alt border border-border rounded-xl p-5 space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">Target URL</label>
              <input
                type="url"
                value={targetUrl}
                onInput={e => setTargetUrl((e.target as HTMLInputElement).value)}
                placeholder="https://api.example.com/endpoint"
                class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder-text-muted/50 transition-colors"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">Your Origin (requesting from)</label>
              <input
                type="text"
                value={originUrl}
                onInput={e => setOriginUrl((e.target as HTMLInputElement).value)}
                placeholder="https://yourapp.com"
                class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder-text-muted/50 transition-colors"
              />
            </div>
          </div>

          {/* Method selector */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5">HTTP Method</label>
            <div class="flex flex-wrap gap-1.5">
              {HTTP_METHODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  class={`text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${
                    method === m
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-text-muted hover:border-accent/50 hover:text-text'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Custom request headers */}
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-sm font-medium text-text-muted">Request Headers to Send</label>
              <button
                onClick={addHeader}
                class="text-xs text-accent hover:underline font-medium"
              >
                + Add header
              </button>
            </div>
            <div class="space-y-2">
              {requestHeaders.map(h => (
                <div key={h.id} class="flex gap-2 items-center">
                  <input
                    type="text"
                    value={h.key}
                    onInput={e => updateHeader(h.id, 'key', (e.target as HTMLInputElement).value)}
                    placeholder="Header-Name"
                    class="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent transition-colors"
                  />
                  <span class="text-text-muted text-xs">:</span>
                  <input
                    type="text"
                    value={h.value}
                    onInput={e => updateHeader(h.id, 'value', (e.target as HTMLInputElement).value)}
                    placeholder="value"
                    class="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-accent transition-colors"
                  />
                  <button
                    onClick={() => removeHeader(h.id)}
                    class="text-text-muted hover:text-red-400 transition-colors text-sm px-1"
                    aria-label="Remove header"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={runCheck}
            disabled={!targetUrl.trim() || loading}
            class="bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Checking…' : 'Check CORS Policy'}
          </button>
        </div>

        {/* Live results */}
        {result && renderResults(result)}
      </section>

      {/* ── Section 2: Response Headers Simulator ── */}
      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Response Headers Simulator</h2>
          <p class="text-sm text-text-muted">
            Paste raw HTTP response headers (e.g. from <code class="bg-surface-alt px-1 rounded font-mono">curl -I</code>) to analyze CORS policy without making a real browser request.
          </p>
        </div>

        <div class="bg-surface-alt border border-border rounded-xl p-5 space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5">
              Raw Response Headers (one per line)
            </label>
            <textarea
              value={simRawHeaders}
              onInput={e => setSimRawHeaders((e.target as HTMLTextAreaElement).value)}
              rows={7}
              placeholder={`access-control-allow-origin: https://yourapp.com\naccess-control-allow-methods: GET, POST, OPTIONS\naccess-control-allow-headers: Authorization, Content-Type\naccess-control-allow-credentials: true\naccess-control-max-age: 86400`}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent resize-none placeholder-text-muted/40 transition-colors"
            />
          </div>
          <button
            onClick={runSimulator}
            class="bg-accent hover:bg-accent/90 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Analyze Headers
          </button>
        </div>

        {simResult && renderResults(simResult)}
      </section>

      {/* ── Section 3: Generate CORS Config ── */}
      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-bold text-text mb-1">Generate CORS Configuration</h2>
          <p class="text-sm text-text-muted">
            Ready-to-use CORS configuration snippets for your server.
            {activeResult ? ' Values auto-filled from your check results above.' : ' Run a check above to auto-populate values from detected headers.'}
          </p>
        </div>

        {/* Tab bar */}
        <div class="flex gap-1 bg-surface-alt border border-border rounded-lg p-1 w-fit flex-wrap">
          {CONFIG_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setConfigTab(tab.id)}
              class={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                configTab === tab.id
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Config block */}
        <div class="bg-surface-alt border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <span class="text-xs font-medium text-text-muted">
              {configTab === 'nginx' && 'nginx.conf / sites-available'}
              {configTab === 'express' && 'server.ts / app.js'}
              {configTab === 'apache' && '.htaccess / VirtualHost'}
              {configTab === 'cloudfront' && 'AWS CDK / CloudFormation'}
              {configTab === 'fastify' && 'server.ts / app.js'}
            </span>
            <button
              onClick={() => copyCode(configTab, configCode[configTab])}
              class="text-xs bg-surface border border-border px-3 py-1 rounded hover:border-accent/50 hover:text-accent transition-colors text-text-muted"
            >
              {copied === configTab ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="p-4 font-mono text-xs text-text overflow-x-auto whitespace-pre leading-relaxed">{configCode[configTab]}</pre>
        </div>
      </section>

      {/* ── Section 4: CORS Quick Reference ── */}
      <section class="bg-surface-alt border border-border rounded-xl p-5 space-y-3">
        <h2 class="text-base font-bold text-text">CORS Quick Reference</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-text-muted">
          <div class="space-y-1.5">
            <p class="font-semibold text-text">Simple Requests (no preflight)</p>
            <ul class="space-y-1 list-disc list-inside">
              <li>Methods: GET, HEAD, POST</li>
              <li>Headers: Accept, Accept-Language, Content-Type (form types only)</li>
              <li>Only need <code class="bg-surface px-1 rounded">Access-Control-Allow-Origin</code></li>
            </ul>
          </div>
          <div class="space-y-1.5">
            <p class="font-semibold text-text">Preflight Required</p>
            <ul class="space-y-1 list-disc list-inside">
              <li>Methods: PUT, PATCH, DELETE, any non-simple method</li>
              <li>Custom headers: Authorization, X-*, etc.</li>
              <li>Browser sends OPTIONS first — server must respond with allow headers</li>
            </ul>
          </div>
          <div class="space-y-1.5">
            <p class="font-semibold text-text">Credentials Mode</p>
            <ul class="space-y-1 list-disc list-inside">
              <li>Requires <code class="bg-surface px-1 rounded">credentials: 'include'</code> in fetch</li>
              <li>Server must set <code class="bg-surface px-1 rounded">Access-Control-Allow-Credentials: true</code></li>
              <li>Origin cannot be <code class="bg-surface px-1 rounded">*</code> — must be explicit</li>
            </ul>
          </div>
          <div class="space-y-1.5">
            <p class="font-semibold text-text">Common Mistakes</p>
            <ul class="space-y-1 list-disc list-inside">
              <li>Wildcard + credentials = always invalid</li>
              <li>Missing OPTIONS handler blocks preflight</li>
              <li>Trailing slash mismatch in origin</li>
              <li>Missing <code class="bg-surface px-1 rounded">always</code> flag in nginx</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
