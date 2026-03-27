import { useState } from 'preact/hooks';

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
];

const COMMON_HEADERS_INFO: Record<string, string> = {
  'content-type': 'Indicates the media type (MIME type) and encoding of the response.',
  'content-security-policy': 'Security policy controlling resources the browser can load. Prevents XSS attacks.',
  'strict-transport-security': 'Forces browsers to use HTTPS for future requests. Prevents downgrade attacks.',
  'x-frame-options': 'Controls whether the page can be embedded in iframes. Prevents clickjacking.',
  'x-content-type-options': 'Prevents MIME-type sniffing. Should be set to "nosniff".',
  'referrer-policy': 'Controls how much referrer information is sent with requests.',
  'cache-control': 'Directives for caching mechanisms in requests and responses.',
  'access-control-allow-origin': 'CORS header — which origins can make cross-origin requests.',
  'server': 'Software information about the origin server. Consider hiding for security.',
  'x-powered-by': 'Reveals server technology. Consider removing for security.',
};

const EXAMPLE_URLS = [
  'https://example.com',
  'https://github.com',
  'https://cloudflare.com',
];

interface HeaderResult {
  name: string;
  value: string;
  isSecurity: boolean;
  info?: string;
}

export default function HttpHeaderInspector() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState<HeaderResult[] | null>(null);
  const [error, setError] = useState('');
  const [responseCode, setResponseCode] = useState<number | null>(null);
  const [note, setNote] = useState('');

  async function fetchHeaders() {
    const target = url.trim();
    if (!target) return;

    // Validate URL
    let parsed: URL;
    try {
      parsed = new URL(target.startsWith('http') ? target : 'https://' + target);
    } catch {
      setError('Invalid URL. Example: https://example.com');
      return;
    }

    setLoading(true);
    setError('');
    setHeaders(null);
    setNote('');

    try {
      // Use a CORS proxy to fetch headers
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(parsed.href)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();

      if (data.status) {
        setResponseCode(data.status.http_code);
      }

      // Parse headers from response
      const raw: Record<string, string> = data.status?.response_headers || {};
      const parsed2: HeaderResult[] = Object.entries(raw).map(([name, value]) => ({
        name: name.toLowerCase(),
        value: Array.isArray(value) ? value.join(', ') : String(value),
        isSecurity: SECURITY_HEADERS.includes(name.toLowerCase()),
        info: COMMON_HEADERS_INFO[name.toLowerCase()],
      }));

      if (parsed2.length === 0) {
        setNote('Headers could not be fetched directly due to CORS restrictions. Showing simulated headers for demonstration.');
        // Show simulated headers
        setHeaders(getSimulatedHeaders(parsed.hostname));
      } else {
        setHeaders(parsed2.sort((a, b) => (b.isSecurity ? 1 : 0) - (a.isSecurity ? 1 : 0)));
      }
    } catch (e: any) {
      // Fallback: show simulated headers
      setNote('Could not fetch live headers (CORS/network). Showing example headers for ' + parsed.hostname);
      setHeaders(getSimulatedHeaders(parsed.hostname));
      setResponseCode(200);
    } finally {
      setLoading(false);
    }
  }

  function getSimulatedHeaders(host: string): HeaderResult[] {
    const simulated = [
      { name: 'content-type', value: 'text/html; charset=utf-8' },
      { name: 'content-security-policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" },
      { name: 'strict-transport-security', value: 'max-age=31536000; includeSubDomains; preload' },
      { name: 'x-frame-options', value: 'SAMEORIGIN' },
      { name: 'x-content-type-options', value: 'nosniff' },
      { name: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
      { name: 'cache-control', value: 'public, max-age=3600' },
      { name: 'server', value: 'nginx/1.24.0' },
      { name: 'vary', value: 'Accept-Encoding' },
      { name: 'content-encoding', value: 'gzip' },
    ];
    return simulated.map((h) => ({
      ...h,
      isSecurity: SECURITY_HEADERS.includes(h.name),
      info: COMMON_HEADERS_INFO[h.name],
    }));
  }

  const securityHeaders = headers?.filter((h) => h.isSecurity) ?? [];
  const missingSecurityHeaders = SECURITY_HEADERS.filter(
    (sh) => !headers?.some((h) => h.name === sh)
  );

  return (
    <div class="space-y-5">
      {/* URL Input */}
      <div class="flex gap-2">
        <input
          type="url"
          value={url}
          onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchHeaders()}
          placeholder="https://example.com"
          class="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={fetchHeaders}
          disabled={loading}
          class="px-4 py-3 bg-primary text-bg-card font-semibold text-sm rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shrink-0"
        >
          {loading ? '…' : 'Inspect'}
        </button>
      </div>

      {/* Examples */}
      <div class="flex flex-wrap gap-2">
        {EXAMPLE_URLS.map((ex) => (
          <button
            key={ex}
            onClick={() => { setUrl(ex); }}
            class="px-2.5 py-1 text-xs font-mono rounded-lg bg-bg-card border border-border hover:border-primary hover:text-primary text-text-muted transition-colors"
          >
            {ex.replace('https://', '')}
          </button>
        ))}
      </div>

      {error && (
        <div class="px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {note && (
        <div class="px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-xs text-yellow-400">
          ⚠️ {note}
        </div>
      )}

      {headers && (
        <div class="space-y-4">
          {responseCode && (
            <div class="flex items-center gap-3">
              <span class={`text-2xl font-mono font-bold ${responseCode < 400 ? 'text-green-400' : 'text-red-400'}`}>
                {responseCode}
              </span>
              <span class="text-sm text-text-muted">
                {responseCode < 300 ? 'OK' : responseCode < 400 ? 'Redirect' : responseCode < 500 ? 'Client Error' : 'Server Error'}
              </span>
            </div>
          )}

          {/* Security score */}
          <div class="border border-border rounded-xl p-4 bg-bg-card">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-text">Security Headers</h3>
              <span class={`text-sm font-bold ${securityHeaders.length >= 5 ? 'text-green-400' : securityHeaders.length >= 3 ? 'text-yellow-400' : 'text-red-400'}`}>
                {securityHeaders.length}/{SECURITY_HEADERS.length}
              </span>
            </div>
            {missingSecurityHeaders.length > 0 && (
              <div>
                <p class="text-xs text-text-muted mb-2">Missing:</p>
                <div class="flex flex-wrap gap-1.5">
                  {missingSecurityHeaders.map((h) => (
                    <span key={h} class="px-2 py-0.5 text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All headers */}
          <div class="border border-border rounded-xl overflow-hidden">
            <div class="px-4 py-3 bg-bg-card border-b border-border">
              <h3 class="text-sm font-semibold text-text">All Headers ({headers.length})</h3>
            </div>
            <div class="divide-y divide-border">
              {headers.map((h) => (
                <div key={h.name} class="px-4 py-3">
                  <div class="flex items-start gap-3">
                    <div class="shrink-0 flex items-center gap-2">
                      {h.isSecurity && <span class="text-xs text-green-400">🔒</span>}
                      <span class="text-xs font-mono text-primary">{h.name}</span>
                    </div>
                    <span class="text-xs font-mono text-text break-all">{h.value}</span>
                  </div>
                  {h.info && (
                    <p class="mt-1 text-xs text-text-muted ml-6">{h.info}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
