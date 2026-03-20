import { useState } from 'preact/hooks';

const HEADER_EXPLANATIONS: Record<string, string> = {
  'content-type': 'Specifies the media type of the response body (e.g. text/html, application/json).',
  'content-length': 'Size of the response body in bytes.',
  'content-encoding': 'Encoding applied to the response body (e.g. gzip, br, deflate).',
  'cache-control': 'Directives for caching behavior (max-age, no-cache, no-store, etc.).',
  'etag': 'A unique identifier for the current version of the resource — used for cache validation.',
  'last-modified': 'The date/time when the resource was last changed.',
  'expires': 'Date after which the response is considered stale.',
  'server': 'The web server software handling the request.',
  'x-powered-by': 'Reveals the technology stack (framework, language) powering the server.',
  'strict-transport-security': 'HSTS — forces browsers to use HTTPS for this domain.',
  'x-frame-options': 'Controls whether this page can be embedded in an iframe (DENY, SAMEORIGIN).',
  'x-content-type-options': 'Prevents MIME type sniffing — always set to nosniff.',
  'x-xss-protection': 'Legacy XSS filter header (mostly superseded by CSP).',
  'content-security-policy': 'CSP — restricts which resources (scripts, styles, images) can load.',
  'access-control-allow-origin': 'CORS header — which origins can read this response.',
  'access-control-allow-methods': 'CORS — which HTTP methods are permitted.',
  'access-control-allow-headers': 'CORS — which request headers are allowed.',
  'set-cookie': 'Sets a cookie on the browser (check Secure, HttpOnly, SameSite flags).',
  'location': 'URL to redirect to (used with 3xx status codes).',
  'vary': 'Tells caches to store different versions based on request headers (e.g. Accept-Encoding).',
  'transfer-encoding': 'How the body is transferred (chunked = streaming).',
  'connection': 'Controls keep-alive / close behavior for the connection.',
  'date': 'Date and time at which the message was originated.',
  'via': 'Indicates intermediate proxies or gateways that forwarded the request.',
  'x-request-id': 'Unique ID for this request — useful for tracing in logs.',
  'x-trace-id': 'Distributed tracing identifier.',
  'cf-ray': 'Cloudflare Ray ID — identifies the request within Cloudflare.',
  'cf-cache-status': 'Cloudflare cache status: HIT, MISS, BYPASS, EXPIRED, etc.',
  'age': 'Seconds the response has been in a proxy/CDN cache.',
  'alt-svc': 'Advertises alternative network services (e.g. HTTP/3 via QUIC).',
  'permissions-policy': 'Controls browser features (camera, geolocation, microphone) allowed on the page.',
  'referrer-policy': 'Controls how much referrer information is sent with requests.',
  'cross-origin-opener-policy': 'COOP — controls sharing of browsing context across origins.',
  'cross-origin-embedder-policy': 'COEP — controls cross-origin resource embedding.',
  'cross-origin-resource-policy': 'CORP — controls which origins can read this resource.',
  'nel': 'Network Error Logging — tells browsers to report network errors.',
  'report-to': 'Specifies reporting endpoints for CSP, NEL, and other APIs.',
};

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
];

function getHeaderTag(name: string): { label: string; color: string } | null {
  if (SECURITY_HEADERS.includes(name)) return { label: 'Security', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' };
  if (name.startsWith('access-control-')) return { label: 'CORS', color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
  if (['cache-control', 'etag', 'last-modified', 'expires', 'age', 'vary'].includes(name)) return { label: 'Cache', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (name.startsWith('cf-') || name === 'via' || name === 'alt-svc') return { label: 'CDN', color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' };
  if (['content-type', 'content-length', 'content-encoding', 'transfer-encoding'].includes(name)) return { label: 'Content', color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' };
  return null;
}

export default function HttpHeadersInspector() {
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  const [status, setStatus] = useState<{ code: number; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const EXAMPLE_URLS = ['https://httpbin.org/get', 'https://example.com', 'https://api.github.com'];

  async function inspect() {
    if (!url.trim()) { setError('Please enter a URL.'); return; }
    let fetchUrl = url.trim();
    if (!/^https?:\/\//i.test(fetchUrl)) fetchUrl = 'https://' + fetchUrl;

    setLoading(true);
    setError('');
    setHeaders(null);
    setStatus(null);

    try {
      // mode: 'no-cors' would hide headers; use cors mode and accept possible CORS errors
      const res = await fetch(fetchUrl, { method: 'GET', mode: 'cors' });
      const map: Record<string, string> = {};
      res.headers.forEach((v, k) => { map[k.toLowerCase()] = v; });
      setHeaders(map);
      setStatus({ code: res.status, text: res.statusText || statusLabel(res.status) });
    } catch (e: any) {
      // Likely a CORS error — try HEAD, then fallback message
      try {
        const res2 = await fetch(fetchUrl, { method: 'HEAD', mode: 'cors' });
        const map: Record<string, string> = {};
        res2.headers.forEach((v, k) => { map[k.toLowerCase()] = v; });
        setHeaders(map);
        setStatus({ code: res2.status, text: res2.statusText || statusLabel(res2.status) });
      } catch {
        setError(
          `Cannot reach ${fetchUrl} from your browser. This usually means:\n` +
          `• The server does not allow cross-origin requests (CORS)\n` +
          `• The server is unreachable or down\n` +
          `• The URL uses HTTP (try HTTPS)\n\n` +
          `Try a CORS-friendly URL like https://httpbin.org/get`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function statusLabel(code: number) {
    if (code < 200) return 'Informational';
    if (code < 300) return 'OK';
    if (code < 400) return 'Redirect';
    if (code < 500) return 'Client Error';
    return 'Server Error';
  }

  function statusColor(code: number) {
    if (code < 300) return 'text-emerald-400';
    if (code < 400) return 'text-yellow-400';
    return 'text-red-400';
  }

  function copyValue(key: string, val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  function copyAll() {
    if (!headers) return;
    const text = Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied('__all__');
    setTimeout(() => setCopied(null), 1500);
  }

  const securityScore = headers
    ? SECURITY_HEADERS.filter(h => h in headers).length
    : null;

  const filtered = headers
    ? Object.entries(headers).filter(
        ([k, v]) => !filter || k.includes(filter.toLowerCase()) || v.toLowerCase().includes(filter.toLowerCase())
      )
    : [];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-6">
        <label class="block text-sm font-medium text-text-muted mb-2">URL to inspect</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={url}
            onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && inspect()}
            placeholder="https://example.com"
            class="flex-1 bg-bg-main border border-border rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          />
          <button
            onClick={inspect}
            disabled={loading}
            class="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Fetching…' : 'Inspect'}
          </button>
        </div>
        <div class="flex flex-wrap gap-2 mt-3">
          {EXAMPLE_URLS.map(u => (
            <button
              key={u}
              onClick={() => { setUrl(u); }}
              class="text-xs text-primary hover:underline font-mono bg-primary/10 rounded px-2 py-0.5"
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm whitespace-pre-wrap">{error}</div>
      )}

      {/* Results */}
      {headers && status && (
        <div class="space-y-4">
          {/* Status + summary bar */}
          <div class="flex flex-wrap items-center gap-4 bg-bg-card border border-border rounded-xl p-4">
            <div>
              <span class="text-text-muted text-xs uppercase tracking-wide">Status</span>
              <div class={`text-2xl font-bold ${statusColor(status.code)}`}>{status.code} <span class="text-base">{status.text}</span></div>
            </div>
            {securityScore !== null && (
              <div class="ml-auto text-right">
                <span class="text-text-muted text-xs uppercase tracking-wide">Security headers</span>
                <div class={`text-lg font-bold ${securityScore >= 4 ? 'text-emerald-400' : securityScore >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {securityScore}/{SECURITY_HEADERS.length}
                </div>
              </div>
            )}
            <button
              onClick={copyAll}
              class="ml-auto text-xs text-text-muted hover:text-primary border border-border rounded px-3 py-1.5 transition-colors"
            >
              {copied === '__all__' ? '✓ Copied' : 'Copy all headers'}
            </button>
          </div>

          {/* Missing security headers */}
          {SECURITY_HEADERS.some(h => !(h in headers)) && (
            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <p class="text-yellow-400 text-sm font-semibold mb-2">Missing security headers:</p>
              <ul class="space-y-1">
                {SECURITY_HEADERS.filter(h => !(h in headers)).map(h => (
                  <li key={h} class="text-xs text-text-muted font-mono">
                    ✗ <span class="text-yellow-300">{h}</span>
                    {HEADER_EXPLANATIONS[h] && <span class="ml-2 text-text-muted">{HEADER_EXPLANATIONS[h]}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Filter */}
          <div class="relative">
            <input
              type="text"
              value={filter}
              onInput={(e) => setFilter((e.target as HTMLInputElement).value)}
              placeholder="Filter headers…"
              class="w-full bg-bg-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary pl-9"
            />
            <span class="absolute left-3 top-2.5 text-text-muted text-sm">🔍</span>
          </div>

          {/* Header list */}
          <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-border text-xs text-text-muted font-semibold uppercase tracking-wide">
              {filtered.length} header{filtered.length !== 1 ? 's' : ''} returned
            </div>
            <div class="divide-y divide-border">
              {filtered.map(([k, v]) => {
                const tag = getHeaderTag(k);
                const explanation = HEADER_EXPLANATIONS[k];
                return (
                  <div key={k} class="px-4 py-3 hover:bg-bg-main/50 transition-colors group">
                    <div class="flex items-start gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-mono text-sm text-primary font-semibold">{k}</span>
                          {tag && (
                            <span class={`text-xs border rounded px-1.5 py-0.5 ${tag.color}`}>{tag.label}</span>
                          )}
                        </div>
                        <div class="font-mono text-sm text-text-muted break-all mt-0.5">{v}</div>
                        {explanation && (
                          <div class="text-xs text-text-muted/70 mt-1 italic">{explanation}</div>
                        )}
                      </div>
                      <button
                        onClick={() => copyValue(k, v)}
                        class="opacity-0 group-hover:opacity-100 text-xs text-text-muted hover:text-primary transition-all border border-border rounded px-2 py-1 shrink-0"
                      >
                        {copied === k ? '✓' : 'Copy'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div class="px-4 py-6 text-center text-text-muted text-sm">No headers match your filter.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
