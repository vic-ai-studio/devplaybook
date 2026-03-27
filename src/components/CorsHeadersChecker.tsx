import { useState } from 'preact/hooks';

interface CorsAnalysis {
  allowOrigin: string | null;
  allowMethods: string[];
  allowHeaders: string[];
  exposeHeaders: string[];
  allowCredentials: boolean;
  maxAge: number | null;
  vary: string[];
  allHeaders: Record<string, string>;
  status: number;
  preflightSent: boolean;
  verdict: 'allowed' | 'restricted' | 'error';
  verdictDetail: string;
}

function analyzeHeaders(headers: Record<string, string>, origin: string, status: number, preflightSent: boolean): CorsAnalysis {
  const get = (name: string) => headers[name.toLowerCase()] || headers[name] || null;

  const allowOrigin = get('access-control-allow-origin');
  const allowMethods = (get('access-control-allow-methods') || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowHeaders = (get('access-control-allow-headers') || '').split(',').map(s => s.trim()).filter(Boolean);
  const exposeHeaders = (get('access-control-expose-headers') || '').split(',').map(s => s.trim()).filter(Boolean);
  const allowCredentials = get('access-control-allow-credentials') === 'true';
  const maxAgeRaw = get('access-control-max-age');
  const maxAge = maxAgeRaw ? parseInt(maxAgeRaw) : null;
  const vary = (get('vary') || '').split(',').map(s => s.trim()).filter(Boolean);

  let verdict: CorsAnalysis['verdict'] = 'restricted';
  let verdictDetail = '';

  if (!allowOrigin) {
    verdictDetail = 'No Access-Control-Allow-Origin header found. Cross-origin requests will be blocked.';
  } else if (allowOrigin === '*') {
    if (allowCredentials) {
      verdictDetail = 'Wildcard (*) with credentials=true is invalid per CORS spec. Browsers will block this.';
      verdict = 'error';
    } else {
      verdictDetail = 'Wildcard (*) allows all origins but disables credentials (cookies, auth headers).';
      verdict = 'allowed';
    }
  } else if (allowOrigin === origin) {
    verdictDetail = `Origin "${origin}" explicitly allowed.`;
    verdict = 'allowed';
  } else {
    verdictDetail = `Allow-Origin is "${allowOrigin}" but you requested "${origin}". Browsers will block.`;
    verdict = 'restricted';
  }

  return { allowOrigin, allowMethods, allowHeaders, exposeHeaders, allowCredentials, maxAge, vary, allHeaders: headers, status, preflightSent, verdict, verdictDetail };
}

const COMMON_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const COMMON_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'];

export default function CorsHeadersChecker() {
  const [url, setUrl] = useState('');
  const [origin, setOrigin] = useState('https://example.com');
  const [method, setMethod] = useState('GET');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorsAnalysis | null>(null);
  const [error, setError] = useState('');
  const [sendPreflight, setSendPreflight] = useState(true);

  async function check() {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Use a CORS proxy to fetch headers - but since we can't do real CORS check from browser,
      // we'll use fetch with no-cors to at least get response and parse what we can.
      // For a real implementation, this would call a backend. Here we simulate with fetch.
      const targetUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;

      const requestHeaders: Record<string, string> = {
        'Origin': origin,
      };

      if (sendPreflight && method !== 'GET' && method !== 'HEAD') {
        requestHeaders['Access-Control-Request-Method'] = method;
        requestHeaders['Access-Control-Request-Headers'] = 'content-type,authorization';
      }

      // Try fetch - it will likely fail for cross-origin, so we catch and show what we know
      let fetchResult: { status: number; headers: Record<string, string> } | null = null;

      try {
        const resp = await fetch(targetUrl, {
          method: sendPreflight ? 'OPTIONS' : method,
          headers: requestHeaders,
          mode: 'cors',
          signal: AbortSignal.timeout(8000),
        });

        const headers: Record<string, string> = {};
        resp.headers.forEach((val, key) => { headers[key.toLowerCase()] = val; });
        fetchResult = { status: resp.status, headers };
      } catch (fetchErr) {
        // CORS block or network error
        const errMsg = String(fetchErr);
        if (errMsg.includes('CORS') || errMsg.includes('cross-origin') || errMsg.includes('NetworkError')) {
          // Simulated response showing the block
          fetchResult = {
            status: 0,
            headers: {},
          };
        } else {
          throw new Error(`Network error: ${errMsg}`);
        }
      }

      const analysis = analyzeHeaders(
        fetchResult.headers,
        origin,
        fetchResult.status,
        sendPreflight
      );

      if (fetchResult.status === 0 && Object.keys(fetchResult.headers).length === 0) {
        setError('The browser blocked the request before headers could be read. This usually means CORS is NOT configured on the server, or the server is unreachable. Try checking the server\'s CORS configuration directly.');
        setResult({ ...analysis, verdict: 'restricted', verdictDetail: 'Browser blocked the request — no CORS headers received.' });
      } else {
        setResult(analysis);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const verdictColor = result?.verdict === 'allowed' ? 'text-green-400 border-green-500/30 bg-green-900/20'
    : result?.verdict === 'error' ? 'text-red-400 border-red-500/30 bg-red-900/20'
    : 'text-yellow-400 border-yellow-500/30 bg-yellow-900/20';

  const headerRow = (label: string, value: string | null, good?: boolean) => (
    <div class="flex gap-3 py-2 border-b border-border/50 last:border-0">
      <span class="text-xs font-mono text-text-muted min-w-52 shrink-0">{label}</span>
      <span class={`text-xs font-mono break-all ${value ? (good === false ? 'text-red-400' : good === true ? 'text-green-400' : 'text-white') : 'text-text-muted italic'}`}>
        {value || 'not set'}
      </span>
    </div>
  );

  return (
    <div class="space-y-4">
      <div class="grid gap-3">
        <div>
          <label class="text-sm font-medium text-text-muted block mb-1">Target URL</label>
          <input
            type="text"
            value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && check()}
            placeholder="https://api.example.com/data"
            class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium text-text-muted block mb-1">Your Origin</label>
            <input
              type="text"
              value={origin}
              onInput={e => setOrigin((e.target as HTMLInputElement).value)}
              placeholder="https://yourapp.com"
              class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label class="text-sm font-medium text-text-muted block mb-1">Method</label>
            <select
              value={method}
              onChange={e => setMethod((e.target as HTMLSelectElement).value)}
              class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {COMMON_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="preflight"
            checked={sendPreflight}
            onChange={e => setSendPreflight((e.target as HTMLInputElement).checked)}
            class="rounded"
          />
          <label for="preflight" class="text-sm text-text-muted">Send OPTIONS preflight request</label>
        </div>
        <button
          onClick={check}
          disabled={loading || !url.trim()}
          class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Checking…' : 'Check CORS Headers'}
        </button>
      </div>

      {error && (
        <div class="bg-yellow-900/20 border border-yellow-500/30 rounded p-3 text-yellow-300 text-sm">
          <p class="font-medium mb-1">⚠ Note</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div class="space-y-4">
          <div class={`rounded p-4 border ${verdictColor}`}>
            <p class="font-semibold text-sm mb-1">
              {result.verdict === 'allowed' ? '✓ CORS Allowed' : result.verdict === 'error' ? '✗ CORS Misconfiguration' : '⚠ CORS Restricted'}
            </p>
            <p class="text-xs">{result.verdictDetail}</p>
          </div>

          <div class="bg-surface rounded border border-border p-4">
            <h3 class="text-sm font-semibold mb-3">CORS Response Headers</h3>
            <div class="divide-y divide-border/50">
              {headerRow('Access-Control-Allow-Origin', result.allowOrigin, result.allowOrigin !== null)}
              {headerRow('Access-Control-Allow-Methods', result.allowMethods.length ? result.allowMethods.join(', ') : null)}
              {headerRow('Access-Control-Allow-Headers', result.allowHeaders.length ? result.allowHeaders.join(', ') : null)}
              {headerRow('Access-Control-Allow-Credentials', result.allowCredentials ? 'true' : null, !result.allowCredentials || result.allowOrigin !== '*')}
              {headerRow('Access-Control-Expose-Headers', result.exposeHeaders.length ? result.exposeHeaders.join(', ') : null)}
              {headerRow('Access-Control-Max-Age', result.maxAge !== null ? `${result.maxAge}s (${Math.round(result.maxAge / 60)} min preflight cache)` : null)}
              {headerRow('Vary', result.vary.length ? result.vary.join(', ') : null)}
            </div>
          </div>

          <div class="bg-surface rounded border border-border p-4">
            <h3 class="text-sm font-semibold mb-3">What This Means</h3>
            <ul class="space-y-2 text-xs text-text-muted">
              <li class="flex gap-2"><span class={result.allowOrigin ? 'text-green-400' : 'text-red-400'}>{result.allowOrigin ? '✓' : '✗'}</span> <span>Cross-origin reads: {result.allowOrigin ? 'possible' : 'blocked'}</span></li>
              <li class="flex gap-2"><span class={result.allowMethods.includes(method) || result.allowMethods.includes('*') ? 'text-green-400' : result.allowMethods.length === 0 ? 'text-yellow-400' : 'text-red-400'}>{result.allowMethods.includes(method) || result.allowMethods.length === 0 ? '?' : result.allowMethods.includes(method) ? '✓' : '✗'}</span> <span>Method {method}: {result.allowMethods.includes(method) ? 'explicitly allowed' : result.allowMethods.length === 0 ? 'not specified (simple methods ok)' : 'not in allowed list'}</span></li>
              <li class="flex gap-2"><span class={result.allowCredentials ? 'text-green-400' : 'text-yellow-400'}>{'?'}</span> <span>Cookies & auth headers: {result.allowCredentials ? 'allowed (credentials: include)' : 'not allowed (credentials: omit only)'}</span></li>
              <li class="flex gap-2"><span class={result.maxAge ? 'text-green-400' : 'text-yellow-400'}>{'?'}</span> <span>Preflight caching: {result.maxAge ? `${result.maxAge}s` : 'not cached (every request preflights)'}</span></li>
            </ul>
          </div>

          <div class="bg-surface rounded border border-border p-4">
            <h3 class="text-sm font-semibold mb-2">Fix: Nginx / Express Snippet</h3>
            <pre class="text-xs font-mono text-green-300 overflow-x-auto">{`# Nginx
add_header Access-Control-Allow-Origin "${origin}";
add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS";
add_header Access-Control-Allow-Headers "Authorization, Content-Type";

# Express (Node.js)
app.use(cors({ origin: '${origin}', credentials: true }));`}</pre>
          </div>
        </div>
      )}

      {!result && !error && !loading && (
        <div class="text-center py-8 text-text-muted text-sm">
          <p>Enter a URL and your origin to check CORS policy.</p>
          <p class="mt-1 text-xs">Note: browser security may limit what headers are readable from the client side.</p>
        </div>
      )}
    </div>
  );
}
