import { useState } from 'preact/hooks';

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR';

interface DnsRecord {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DnsResponse {
  Status: number;
  Answer?: DnsRecord[];
  Authority?: DnsRecord[];
  Question?: { name: string; type: number }[];
}

const TYPE_MAP: Record<number, string> = {
  1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 12: 'PTR',
  15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA',
};

const STATUS_MAP: Record<number, string> = {
  0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN',
  4: 'NOTIMP', 5: 'REFUSED',
};

const RECORD_EXPLANATIONS: Record<RecordType, string> = {
  A: 'Maps a domain to an IPv4 address. This is the most common DNS record.',
  AAAA: 'Maps a domain to an IPv6 address.',
  CNAME: 'Alias pointing to another domain name. CNAME records cannot coexist with other records on the same name.',
  MX: 'Specifies mail servers for the domain. Lower priority numbers are tried first.',
  TXT: 'Stores arbitrary text data. Used for SPF, DKIM, DMARC, and domain verification.',
  NS: 'Nameserver records — which DNS servers are authoritative for this domain.',
  SOA: 'Start of Authority — primary nameserver, admin email, and zone serial number.',
  PTR: 'Reverse DNS — maps an IP address back to a hostname.',
};

const RECORD_TYPES: RecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR'];

const EXAMPLE_DOMAINS = ['github.com', 'cloudflare.com', 'google.com'];

export default function DnsLookup() {
  const [domain, setDomain] = useState('');
  const [type, setType] = useState<RecordType>('A');
  const [results, setResults] = useState<DnsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ domain: string; type: RecordType }[]>([]);

  async function lookup() {
    const q = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (!q) { setError('Please enter a domain name.'); return; }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const res = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(q)}&type=${type}`,
        { headers: { Accept: 'application/dns-json' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DnsResponse = await res.json();
      setResults(data);
      setHistory(prev => {
        const entry = { domain: q, type };
        const filtered = prev.filter(h => !(h.domain === q && h.type === type));
        return [entry, ...filtered].slice(0, 8);
      });
    } catch (e: any) {
      setError('DNS lookup failed. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  function copyResults() {
    if (!results?.Answer) return;
    const text = results.Answer.map(r => `${r.name}\t${r.TTL}\t${TYPE_MAP[r.type] ?? r.type}\t${r.data}`).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function formatMx(data: string) {
    const parts = data.split(' ');
    if (parts.length >= 2) return `Priority ${parts[0]} → ${parts[1]}`;
    return data;
  }

  function formatTtl(seconds: number) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  }

  const statusCode = results?.Status ?? -1;
  const hasAnswers = (results?.Answer?.length ?? 0) > 0;

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-6">
        <div class="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={domain}
            onInput={(e) => setDomain((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && lookup()}
            placeholder="example.com"
            class="flex-1 bg-bg-main border border-border rounded-lg px-4 py-2 text-sm font-mono focus:outline-none focus:border-primary"
          />
          <select
            value={type}
            onChange={(e) => setType((e.target as HTMLSelectElement).value as RecordType)}
            class="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={lookup}
            disabled={loading}
            class="bg-primary hover:bg-primary-dark text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Looking up…' : 'Lookup'}
          </button>
        </div>

        {/* Quick type selector */}
        <div class="flex flex-wrap gap-2 mt-3">
          {RECORD_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              class={`text-xs px-2.5 py-1 rounded border font-mono transition-colors ${type === t ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:border-primary hover:text-primary'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Example domains */}
        <div class="flex flex-wrap gap-2 mt-3">
          {EXAMPLE_DOMAINS.map(d => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              class="text-xs text-primary hover:underline font-mono bg-primary/10 rounded px-2 py-0.5"
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Record type explanation */}
      <div class="bg-bg-card/50 border border-border/50 rounded-lg px-4 py-3 text-xs text-text-muted">
        <span class="font-semibold text-text-main">{type} record:</span> {RECORD_EXPLANATIONS[type]}
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Results */}
      {results && (
        <div class="space-y-4">
          {/* Status banner */}
          <div class="flex items-center justify-between bg-bg-card border border-border rounded-xl px-4 py-3">
            <div class="flex items-center gap-3">
              <span class={`text-sm font-semibold ${statusCode === 0 ? 'text-emerald-400' : statusCode === 3 ? 'text-red-400' : 'text-yellow-400'}`}>
                {STATUS_MAP[statusCode] ?? `Status ${statusCode}`}
              </span>
              {results.Question?.[0] && (
                <span class="text-xs text-text-muted font-mono">
                  {results.Question[0].name} → {TYPE_MAP[results.Question[0].type] ?? results.Question[0].type}
                </span>
              )}
              {hasAnswers && (
                <span class="text-xs text-text-muted">{results.Answer!.length} record{results.Answer!.length !== 1 ? 's' : ''}</span>
              )}
            </div>
            {hasAnswers && (
              <button
                onClick={copyResults}
                class="text-xs text-text-muted hover:text-primary border border-border rounded px-3 py-1 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy zone format'}
              </button>
            )}
          </div>

          {statusCode === 3 && (
            <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              NXDOMAIN — this domain does not exist or has no {type} records.
            </div>
          )}

          {hasAnswers && (
            <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
              <div class="px-4 py-3 border-b border-border text-xs text-text-muted font-semibold uppercase tracking-wide">
                Answer Records
              </div>
              <div class="divide-y divide-border">
                {results.Answer!.map((r, i) => (
                  <div key={i} class="px-4 py-3 font-mono text-sm">
                    <div class="flex flex-wrap items-start gap-3">
                      <span class="text-primary font-semibold shrink-0">{r.name}</span>
                      <span class="text-text-muted text-xs border border-border rounded px-1.5 py-0.5 shrink-0">
                        TTL {formatTtl(r.TTL)}
                      </span>
                      <span class="text-yellow-400 font-semibold shrink-0">{TYPE_MAP[r.type] ?? r.type}</span>
                      <span class="text-text-main break-all">
                        {r.type === 15 ? formatMx(r.data) : r.data}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Authority section */}
          {(results.Authority?.length ?? 0) > 0 && !hasAnswers && (
            <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
              <div class="px-4 py-3 border-b border-border text-xs text-text-muted font-semibold uppercase tracking-wide">
                Authority (no direct answer — delegated to)
              </div>
              <div class="divide-y divide-border">
                {results.Authority!.map((r, i) => (
                  <div key={i} class="px-4 py-3 font-mono text-sm text-text-muted">
                    {r.name} → {r.data}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent lookups */}
      {history.length > 0 && (
        <div class="bg-bg-card/50 border border-border/50 rounded-xl p-4">
          <p class="text-xs text-text-muted font-semibold uppercase tracking-wide mb-2">Recent lookups</p>
          <div class="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setDomain(h.domain); setType(h.type); }}
                class="text-xs font-mono text-text-muted hover:text-primary border border-border/50 rounded px-2 py-1 transition-colors"
              >
                {h.domain} {h.type}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
