import { useState } from 'preact/hooks';

interface CertResult {
  domain: string;
  daysLeft: number;
  status: 'healthy' | 'expiring' | 'expired' | 'invalid';
  notAfter: string;
  notBefore: string;
  issuer: string;
  subject: string;
  sans: string[];
  serialNote: string;
}

const DEMO_CERTS: Record<string, CertResult> = {
  'example.com': {
    domain: 'example.com',
    daysLeft: 287,
    status: 'healthy',
    notAfter: new Date(Date.now() + 287 * 86400000).toISOString().split('T')[0],
    notBefore: new Date(Date.now() - 78 * 86400000).toISOString().split('T')[0],
    issuer: "Let's Encrypt Authority X3",
    subject: 'example.com',
    sans: ['example.com', 'www.example.com'],
    serialNote: '(simulated — devplaybook.cc runs client-side only)',
  },
  'expired.example': {
    domain: 'expired.example',
    daysLeft: -14,
    status: 'expired',
    notAfter: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
    notBefore: new Date(Date.now() - 379 * 86400000).toISOString().split('T')[0],
    issuer: "DigiCert Inc",
    subject: 'expired.example',
    sans: ['expired.example'],
    serialNote: '(simulated — devplaybook.cc runs client-side only)',
  },
  'expiring.example': {
    domain: 'expiring.example',
    daysLeft: 12,
    status: 'expiring',
    notAfter: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
    notBefore: new Date(Date.now() - 353 * 86400000).toISOString().split('T')[0],
    issuer: "GlobalSign nv-sa",
    subject: 'expiring.example',
    sans: ['expiring.example', 'www.expiring.example', 'mail.expiring.example'],
    serialNote: '(simulated — devplaybook.cc runs client-side only)',
  },
};

function simulateCert(domain: string): CertResult {
  // Deterministic simulation based on domain string
  const seed = domain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const daysLeft = 30 + (seed % 300); // 30–330 days
  const validDays = 365;
  const status: CertResult['status'] = daysLeft > 30 ? 'healthy' : daysLeft > 0 ? 'expiring' : 'expired';
  const issuers = ["Let's Encrypt", "ZeroSSL", "DigiCert", "Sectigo", "GlobalSign"];
  const issuer = issuers[seed % issuers.length];
  return {
    domain,
    daysLeft,
    status,
    notAfter: new Date(Date.now() + daysLeft * 86400000).toISOString().split('T')[0],
    notBefore: new Date(Date.now() - (validDays - daysLeft) * 86400000).toISOString().split('T')[0],
    issuer,
    subject: domain,
    sans: [domain, `www.${domain}`],
    serialNote: '(simulated — devplaybook.cc runs client-side only; use curl for real checks)',
  };
}

function cleanDomain(input: string): string {
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.split('/')[0];
  d = d.split(':')[0];
  return d;
}

function validateDomain(d: string): boolean {
  return /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/.test(d);
}

export default function SslExpiryChecker() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<CertResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleCheck() {
    setError('');
    const lines = input.split('\n').map(l => cleanDomain(l)).filter(Boolean);
    const unique = [...new Set(lines)].slice(0, 10);

    if (!unique.length) { setError('Enter at least one domain name.'); return; }

    const invalid = unique.filter(d => !validateDomain(d));
    if (invalid.length) {
      setError(`Invalid domain(s): ${invalid.join(', ')}. Use format like example.com`);
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = unique.map(d => DEMO_CERTS[d] ?? simulateCert(d));
      setResults(res);
      setLoading(false);
    }, 600);
  }

  function handleClear() {
    setInput('');
    setResults([]);
    setError('');
  }

  function loadExamples() {
    setInput('example.com\nexpired.example\nexpiring.example');
  }

  const statusBadge = (r: CertResult) => {
    if (r.status === 'expired') return { text: 'EXPIRED', cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
    if (r.status === 'expiring') return { text: 'EXPIRING SOON', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/30' };
    return { text: 'VALID', cls: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  const daysColor = (r: CertResult) =>
    r.daysLeft < 0 ? 'text-red-400' : r.daysLeft <= 30 ? 'text-orange-400' : 'text-green-400';

  return (
    <div class="space-y-5">
      {/* Notice */}
      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300">
        <strong>Note:</strong> Browser tools cannot make direct TLS connections to external hosts.
        This tool provides a realistic simulation based on domain input.
        For live checks, use <code class="font-mono text-xs bg-bg-card px-1 rounded">echo | openssl s_client -connect domain:443 2&gt;/dev/null | openssl x509 -noout -dates</code> or <a href="https://www.ssllabs.com/ssltest/" target="_blank" rel="noopener" class="underline">SSL Labs</a>.
      </div>

      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-2">
          <label class="font-semibold text-sm">Domain Names</label>
          <button onClick={loadExamples} class="text-xs text-primary hover:underline">Load examples</button>
        </div>
        <p class="text-xs text-text-muted mb-3">One domain per line (up to 10). Paste URLs — they'll be cleaned automatically.</p>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          rows={5}
          placeholder={"example.com\napi.yourdomain.com\nhttps://staging.example.org"}
          class="w-full bg-bg border border-border rounded-lg px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
        />
        {error && <p class="text-red-400 text-sm mt-2">{error}</p>}
        <div class="flex gap-3 mt-4">
          <button
            onClick={handleCheck}
            disabled={loading}
            class="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check SSL Expiry'}
          </button>
          <button onClick={handleClear} class="text-sm text-text-muted hover:text-red-400 transition-colors">Clear</button>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div class="space-y-3">
          <h2 class="font-bold text-lg">Results <span class="text-text-muted text-sm font-normal">({results.length} domain{results.length > 1 ? 's' : ''})</span></h2>
          {results.map(r => {
            const badge = statusBadge(r);
            return (
              <div key={r.domain} class={`bg-bg-card border rounded-xl p-5 ${r.status === 'expired' ? 'border-red-500/30' : r.status === 'expiring' ? 'border-orange-500/30' : 'border-border'}`}>
                <div class="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div>
                    <div class="font-mono font-bold text-base">{r.domain}</div>
                    <div class="text-xs text-text-muted mt-0.5">{r.serialNote}</div>
                  </div>
                  <span class={`text-xs font-bold px-3 py-1 rounded-full border ${badge.cls}`}>{badge.text}</span>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div class="bg-bg rounded-lg p-3">
                    <div class="text-xs text-text-muted mb-1">Days Left</div>
                    <div class={`text-xl font-bold ${daysColor(r)}`}>
                      {r.daysLeft < 0 ? Math.abs(r.daysLeft) + ' ago' : r.daysLeft}
                    </div>
                  </div>
                  <div class="bg-bg rounded-lg p-3">
                    <div class="text-xs text-text-muted mb-1">Expires</div>
                    <div class="font-semibold">{r.notAfter}</div>
                  </div>
                  <div class="bg-bg rounded-lg p-3">
                    <div class="text-xs text-text-muted mb-1">Issued</div>
                    <div class="font-semibold">{r.notBefore}</div>
                  </div>
                  <div class="bg-bg rounded-lg p-3">
                    <div class="text-xs text-text-muted mb-1">Issuer</div>
                    <div class="font-semibold text-xs">{r.issuer}</div>
                  </div>
                </div>
                {r.sans.length > 0 && (
                  <div class="mt-3">
                    <span class="text-xs text-text-muted">SANs: </span>
                    {r.sans.map(s => (
                      <span key={s} class="inline-block text-xs font-mono bg-bg px-2 py-0.5 rounded border border-border mr-1 mt-1">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reference commands */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-bold text-sm uppercase tracking-wide text-text-muted mb-4">CLI Commands for Real Checks</h2>
        <div class="space-y-3 text-sm">
          {[
            { label: 'Check expiry date (openssl)', cmd: 'echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -noout -enddate' },
            { label: 'Days until expiry (bash)', cmd: "echo $(( ($(date -d \"$(openssl s_client -connect example.com:443 < /dev/null 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)\" +%s) - $(date +%s)) / 86400 )) days" },
            { label: 'Check with curl', cmd: 'curl -vI https://example.com 2>&1 | grep -E "expire|issuer|subject"' },
            { label: 'Full cert info (openssl)', cmd: 'openssl s_client -showcerts -connect example.com:443 < /dev/null 2>/dev/null | openssl x509 -noout -text' },
          ].map(item => (
            <div key={item.label}>
              <div class="text-xs text-text-muted mb-1">{item.label}</div>
              <code class="block text-xs font-mono bg-bg border border-border rounded-lg px-3 py-2 text-text break-all">{item.cmd}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
