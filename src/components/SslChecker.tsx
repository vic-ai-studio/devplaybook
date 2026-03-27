import { useState } from 'preact/hooks';

interface CertInfo {
  domain: string;
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysRemaining: number;
  expired: boolean;
  expiringSoon: boolean;
  sans: string[];
  protocol: string;
  error?: string;
}

interface CheckResult {
  domain: string;
  status: 'valid' | 'expired' | 'expiring' | 'error';
  cert?: CertInfo;
  error?: string;
}

async function checkSsl(domain: string): Promise<CheckResult> {
  // Use SSL Labs API (free, no key required) or crt.sh for cert info
  // We'll use the public Cloudflare DNS + crt.sh to get certificate info
  // For a browser-based tool, we use the crt.sh JSON API
  const hostname = domain.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];

  try {
    // Query crt.sh for recent certificates
    const res = await fetch(
      `https://crt.sh/?q=${encodeURIComponent(hostname)}&output=json`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) throw new Error(`crt.sh returned ${res.status}`);

    const certs = await res.json() as Array<{
      id: number;
      issuer_ca_id: number;
      issuer_name: string;
      common_name: string;
      name_value: string;
      not_before: string;
      not_after: string;
    }>;

    if (!certs || certs.length === 0) {
      return { domain: hostname, status: 'error', error: 'No certificate records found in crt.sh for this domain.' };
    }

    // Get the most recent cert
    const latest = certs.sort((a, b) => new Date(b.not_before).getTime() - new Date(a.not_before).getTime())[0];

    const validFrom = new Date(latest.not_before);
    const validTo = new Date(latest.not_after);
    const now = new Date();
    const daysRemaining = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const expired = daysRemaining < 0;
    const expiringSoon = !expired && daysRemaining <= 30;

    // Extract SANs from name_value
    const sans = latest.name_value
      ? [...new Set(latest.name_value.split('\n').map(s => s.trim()).filter(Boolean))]
      : [latest.common_name];

    const cert: CertInfo = {
      domain: hostname,
      issuer: latest.issuer_name,
      subject: latest.common_name || hostname,
      validFrom: validFrom.toISOString().split('T')[0],
      validTo: validTo.toISOString().split('T')[0],
      daysRemaining,
      expired,
      expiringSoon,
      sans: sans.slice(0, 20),
      protocol: 'TLS (via crt.sh)',
    };

    const status = expired ? 'expired' : expiringSoon ? 'expiring' : 'valid';
    return { domain: hostname, status, cert };
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { domain: hostname, status: 'error', error: 'Request timed out after 10s. The domain may not be reachable.' };
    }
    return { domain: hostname, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

const STATUS_COLORS = {
  valid: 'text-green-500',
  expiring: 'text-yellow-500',
  expired: 'text-red-500',
  error: 'text-red-500',
};

const STATUS_LABELS = {
  valid: 'Valid',
  expiring: 'Expiring Soon',
  expired: 'Expired',
  error: 'Error',
};

const STATUS_BG = {
  valid: 'bg-green-500/10 border-green-500/20',
  expiring: 'bg-yellow-500/10 border-yellow-500/20',
  expired: 'bg-red-500/10 border-red-500/20',
  error: 'bg-red-500/10 border-red-500/20',
};

export default function SslChecker() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCheck() {
    const trimmed = domain.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    const res = await checkSsl(trimmed);
    setResult(res);
    setLoading(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleCheck();
  }

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="flex gap-2">
        <input
          type="text"
          class="flex-1 font-mono text-sm bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent"
          placeholder="example.com or https://example.com"
          value={domain}
          onInput={(e) => setDomain((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
        <button
          class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          onClick={handleCheck}
          disabled={loading || !domain.trim()}
        >
          {loading ? 'Checking…' : 'Check SSL'}
        </button>
      </div>

      <p class="text-xs text-text-muted">
        Queries <a href="https://crt.sh" class="underline" target="_blank" rel="noopener">crt.sh</a> (Certificate Transparency logs) for SSL/TLS certificate records.
        Shows the most recently issued certificate for the domain.
      </p>

      {/* Result */}
      {result && (
        <div class={`rounded-lg border p-4 ${STATUS_BG[result.status]}`}>
          <div class="flex items-center gap-2 mb-3">
            <span class={`font-semibold ${STATUS_COLORS[result.status]}`}>
              {result.status === 'valid' ? '✓' : result.status === 'expiring' ? '⚠' : '✗'}{' '}
              {STATUS_LABELS[result.status]}
            </span>
            <span class="text-text-muted text-sm">— {result.domain}</span>
          </div>

          {result.error && (
            <p class="text-sm text-red-400">{result.error}</p>
          )}

          {result.cert && (
            <div class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span class="text-text-muted">Subject</span>
                  <p class="font-mono text-xs mt-0.5 break-all">{result.cert.subject}</p>
                </div>
                <div>
                  <span class="text-text-muted">Valid From</span>
                  <p class="font-mono text-xs mt-0.5">{result.cert.validFrom}</p>
                </div>
                <div>
                  <span class="text-text-muted">Expires</span>
                  <p class={`font-mono text-xs mt-0.5 ${result.cert.expired ? 'text-red-400' : result.cert.expiringSoon ? 'text-yellow-400' : ''}`}>
                    {result.cert.validTo}
                    {!result.cert.expired && (
                      <span class="ml-2 text-text-muted">({result.cert.daysRemaining} days left)</span>
                    )}
                    {result.cert.expired && (
                      <span class="ml-2 text-red-400">({Math.abs(result.cert.daysRemaining)} days ago)</span>
                    )}
                  </p>
                </div>
                <div>
                  <span class="text-text-muted">Source</span>
                  <p class="font-mono text-xs mt-0.5">{result.cert.protocol}</p>
                </div>
              </div>

              <div>
                <span class="text-text-muted text-sm">Issuer</span>
                <p class="font-mono text-xs mt-0.5 break-all">{result.cert.issuer}</p>
              </div>

              {result.cert.sans.length > 0 && (
                <div>
                  <span class="text-text-muted text-sm">
                    Subject Alternative Names ({result.cert.sans.length})
                  </span>
                  <div class="mt-1 flex flex-wrap gap-1">
                    {result.cert.sans.map((san) => (
                      <span key={san} class="font-mono text-xs bg-surface px-2 py-0.5 rounded border border-border">
                        {san}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.cert.expiringSoon && !result.cert.expired && (
                <div class="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-300">
                  Certificate expires in {result.cert.daysRemaining} days. Plan your renewal soon.
                </div>
              )}
              {result.cert.expired && (
                <div class="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-300">
                  This certificate has expired. Visitors will see browser security warnings.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Examples */}
      <div class="text-xs text-text-muted">
        Try:{' '}
        {['github.com', 'google.com', 'cloudflare.com'].map((ex, i) => (
          <>
            <button
              key={ex}
              class="underline hover:text-text"
              onClick={() => { setDomain(ex); }}
            >
              {ex}
            </button>
            {i < 2 ? ', ' : ''}
          </>
        ))}
      </div>
    </div>
  );
}
