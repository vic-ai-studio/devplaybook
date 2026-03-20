import { useState } from 'preact/hooks';

interface CorsResult {
  ok: boolean;
  status?: number;
  statusText?: string;
  headers: Record<string, string>;
  error?: string;
  preflight?: {
    ok: boolean;
    headers: Record<string, string>;
    error?: string;
  };
}

interface Analysis {
  allowOrigin: string | null;
  allowMethods: string | null;
  allowHeaders: string | null;
  allowCredentials: string | null;
  exposeHeaders: string | null;
  maxAge: string | null;
  issues: string[];
  passes: string[];
}

function analyzeHeaders(headers: Record<string, string>, origin: string): Analysis {
  const allowOrigin = headers['access-control-allow-origin'] ?? null;
  const allowMethods = headers['access-control-allow-methods'] ?? null;
  const allowHeaders = headers['access-control-allow-headers'] ?? null;
  const allowCredentials = headers['access-control-allow-credentials'] ?? null;
  const exposeHeaders = headers['access-control-expose-headers'] ?? null;
  const maxAge = headers['access-control-max-age'] ?? null;

  const issues: string[] = [];
  const passes: string[] = [];

  if (!allowOrigin) {
    issues.push('Missing Access-Control-Allow-Origin header — requests from browsers will be blocked.');
  } else if (allowOrigin === '*') {
    passes.push('Access-Control-Allow-Origin: * (allows all origins)');
    if (allowCredentials === 'true') {
      issues.push('Cannot use Access-Control-Allow-Credentials: true with wildcard (*) origin — browsers will reject this.');
    }
  } else if (allowOrigin === origin) {
    passes.push(`Access-Control-Allow-Origin matches your origin (${origin})`);
  } else {
    issues.push(`Access-Control-Allow-Origin is "${allowOrigin}" but your origin is "${origin}" — this will be blocked.`);
  }

  if (allowCredentials === 'true') {
    passes.push('Credentials are allowed (cookies, auth headers)');
  }

  return { allowOrigin, allowMethods, allowHeaders, allowCredentials, exposeHeaders, maxAge, issues, passes };
}

const COMMON_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const COMMON_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'];

export default function CorsTester() {
  const [url, setUrl] = useState('');
  const [origin, setOrigin] = useState(typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
  const [method, setMethod] = useState('GET');
  const [requestHeaders, setRequestHeaders] = useState('Content-Type: application/json\nAuthorization: Bearer token');
  const [includePreflight, setIncludePreflight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CorsResult | null>(null);

  const test = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Parse custom headers
      const parsedHeaders: Record<string, string> = {};
      for (const line of requestHeaders.split('\n')) {
        const idx = line.indexOf(':');
        if (idx > 0) {
          const k = line.slice(0, idx).trim();
          const v = line.slice(idx + 1).trim();
          if (k) parsedHeaders[k] = v;
        }
      }

      // We use a CORS proxy approach — since we can't actually make cross-origin requests
      // from this tool's origin to an arbitrary URL, we use fetch with mode:no-cors to check
      // reachability, then fetch the response headers via our own /api/cors-test endpoint if available.
      // For now, we simulate by doing a no-cors fetch and reporting what we can.
      const res = await fetch(url.trim(), {
        method: method === 'OPTIONS' ? 'OPTIONS' : method,
        mode: 'cors',
        headers: parsedHeaders,
      });

      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

      const corsResult: CorsResult = {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        headers,
      };

      if (includePreflight && method !== 'GET' && method !== 'HEAD') {
        try {
          const preflightRes = await fetch(url.trim(), {
            method: 'OPTIONS',
            mode: 'cors',
            headers: {
              'Origin': origin,
              'Access-Control-Request-Method': method,
              'Access-Control-Request-Headers': Object.keys(parsedHeaders).join(', '),
            },
          });
          const pHeaders: Record<string, string> = {};
          preflightRes.headers.forEach((v, k) => { pHeaders[k.toLowerCase()] = v; });
          corsResult.preflight = { ok: preflightRes.ok, headers: pHeaders };
        } catch (e: unknown) {
          corsResult.preflight = {
            ok: false,
            headers: {},
            error: e instanceof Error ? e.message : 'Preflight request failed',
          };
        }
      }

      setResult(corsResult);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Request failed';
      // If it's a CORS error, we know the headers were missing/wrong
      const isCors = msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch');
      setResult({
        ok: false,
        headers: {},
        error: isCors
          ? `CORS error: The browser blocked this request. The target server is not sending the required CORS headers for your origin (${origin}). Original error: ${msg}`
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const analysis = result && !result.error
    ? analyzeHeaders(result.headers, origin)
    : null;

  const preflightAnalysis = result?.preflight && !result.preflight.error
    ? analyzeHeaders(result.preflight.headers, origin)
    : null;

  return (
    <div class="space-y-5">
      {/* Note */}
      <div class="bg-blue-950/30 border border-blue-800 rounded-lg px-4 py-3 text-xs text-blue-300">
        <strong>Note:</strong> This tester makes real requests from your browser. You'll see actual CORS errors if the target server doesn't allow your origin. For server-side CORS header inspection without browser restrictions, use <code class="bg-blue-900/50 px-1 rounded">curl -I -X OPTIONS &lt;url&gt;</code>.
      </div>

      {/* Config */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Target URL</label>
          <input
            type="url"
            value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)}
            placeholder="https://api.example.com/endpoint"
            class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Your Origin (requesting from)</label>
            <input
              type="text"
              value={origin}
              onInput={e => setOrigin((e.target as HTMLInputElement).value)}
              placeholder="https://yourapp.com"
              class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">HTTP Method</label>
            <div class="flex flex-wrap gap-1.5">
              {COMMON_METHODS.map(m => (
                <button key={m} onClick={() => setMethod(m)}
                  class={`text-xs px-2.5 py-1.5 rounded-md border transition-colors ${
                    method === m
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Request Headers (one per line, key: value)</label>
          <textarea
            value={requestHeaders}
            onInput={e => setRequestHeaders((e.target as HTMLTextAreaElement).value)}
            rows={3}
            class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includePreflight}
              onChange={e => setIncludePreflight((e.target as HTMLInputElement).checked)}
              class="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600"
            />
            <span class="text-sm text-gray-300">Also test preflight OPTIONS request (for non-simple requests)</span>
          </label>
        </div>

        <button
          onClick={test}
          disabled={!url.trim() || loading}
          class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-lg transition-colors">
          {loading ? 'Testing…' : 'Test CORS'}
        </button>
      </div>

      {/* Error (CORS blocked) */}
      {result?.error && (
        <div class="bg-red-950/30 border border-red-800 rounded-xl p-5 space-y-2">
          <p class="text-red-400 font-semibold text-sm">Request Failed</p>
          <p class="text-red-300 text-sm leading-relaxed">{result.error}</p>
          <div class="pt-2 border-t border-red-900 text-xs text-gray-500 space-y-1">
            <p class="font-medium text-gray-400">To fix this on your server, add these headers:</p>
            <code class="block bg-gray-900 rounded-lg p-3 text-green-300 font-mono whitespace-pre">
{`Access-Control-Allow-Origin: ${origin}
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400`}
            </code>
          </div>
        </div>
      )}

      {/* Success result */}
      {result && !result.error && analysis && (
        <div class="space-y-4">
          {/* Status */}
          <div class={`rounded-xl border px-5 py-3 flex items-center gap-3 ${result.ok ? 'bg-green-950/30 border-green-800' : 'bg-red-950/30 border-red-800'}`}>
            <span class={`text-2xl font-mono font-bold ${result.ok ? 'text-green-300' : 'text-red-300'}`}>{result.status}</span>
            <span class="text-gray-300 text-sm">{result.statusText}</span>
            <span class={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${result.ok ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
              {result.ok ? 'Success' : 'Error'}
            </span>
          </div>

          {/* Analysis */}
          {(analysis.passes.length > 0 || analysis.issues.length > 0) && (
            <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
              <p class="text-sm font-semibold text-gray-300">CORS Analysis</p>
              {analysis.passes.map((p, i) => (
                <div key={i} class="flex items-start gap-2 text-sm text-green-300">
                  <span class="mt-0.5">✓</span><span>{p}</span>
                </div>
              ))}
              {analysis.issues.map((iss, i) => (
                <div key={i} class="flex items-start gap-2 text-sm text-red-300">
                  <span class="mt-0.5">✗</span><span>{iss}</span>
                </div>
              ))}
            </div>
          )}

          {/* CORS Headers */}
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-2">
            <p class="text-sm font-semibold text-gray-300 mb-3">Response Headers</p>
            <div class="space-y-1.5 font-mono text-xs">
              {Object.entries(result.headers).map(([k, v]) => {
                const isCors = k.startsWith('access-control-');
                return (
                  <div key={k} class={`flex gap-2 ${isCors ? 'text-indigo-300' : 'text-gray-500'}`}>
                    <span class="font-medium">{k}:</span>
                    <span class="break-all">{v}</span>
                  </div>
                );
              })}
              {Object.keys(result.headers).length === 0 && (
                <p class="text-gray-600">No headers received.</p>
              )}
            </div>
          </div>

          {/* Preflight result */}
          {result.preflight && (
            <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
              <p class="text-sm font-semibold text-gray-300">Preflight (OPTIONS) Result</p>
              {result.preflight.error ? (
                <p class="text-red-300 text-sm">{result.preflight.error}</p>
              ) : (
                <>
                  {preflightAnalysis && [...preflightAnalysis.passes.map((p, i) => (
                    <div key={`p-${i}`} class="flex items-start gap-2 text-sm text-green-300"><span>✓</span><span>{p}</span></div>
                  )), ...preflightAnalysis.issues.map((iss, i) => (
                    <div key={`i-${i}`} class="flex items-start gap-2 text-sm text-red-300"><span>✗</span><span>{iss}</span></div>
                  ))]}
                  <div class="space-y-1.5 font-mono text-xs mt-2">
                    {Object.entries(result.preflight.headers)
                      .filter(([k]) => k.startsWith('access-control-'))
                      .map(([k, v]) => (
                        <div key={k} class="flex gap-2 text-indigo-300">
                          <span class="font-medium">{k}:</span>
                          <span>{v}</span>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-2">
        <p class="font-medium text-gray-300">How CORS Works</p>
        <p>CORS (Cross-Origin Resource Sharing) controls which origins can read responses from your server. Browsers enforce this; curl/Postman don't.</p>
        <ul class="list-disc list-inside space-y-1 text-xs text-gray-500">
          <li><strong class="text-gray-400">Simple requests</strong> (GET/HEAD/POST with basic headers): just need <code>Access-Control-Allow-Origin</code></li>
          <li><strong class="text-gray-400">Preflight</strong>: browser sends OPTIONS first for non-simple methods/headers — server must respond with allow headers</li>
          <li><strong class="text-gray-400">Credentials</strong>: requires explicit <code>Access-Control-Allow-Credentials: true</code> + specific origin (no wildcard)</li>
        </ul>
      </div>
    </div>
  );
}
