import { useState, useMemo } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'PTR' | 'SRV' | 'CAA';

interface DnsResult {
  type: RecordType;
  domain: string;
  ttl: number;
  records: string[];
}

// ── DNS record TTLs (realistic defaults) ──────────────────────────────────────

const TTL_MAP: Record<RecordType, number> = {
  A: 300,
  AAAA: 300,
  CNAME: 3600,
  MX: 3600,
  TXT: 3600,
  NS: 86400,
  SOA: 3600,
  PTR: 86400,
  SRV: 120,
  CAA: 86400,
};

// ── Simple deterministic hash for domain → IP generation ──────────────────────

function domainHash(domain: string): number {
  let h = 2166136261;
  for (let i = 0; i < domain.length; i++) {
    h ^= domain.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function simIp(seed: number, offset: number): string {
  const a = ((seed >> 24) & 0xff) | 0x40; // keep in 64-191 range (global unicast-ish)
  const b = (seed >> 16) & 0xff;
  const c = ((seed >> 8) & 0xff) + offset;
  const d = (seed & 0xff) + offset * 7;
  return `${a & 0xff}.${b & 0xff}.${c & 0xff}.${d & 0xff}`;
}

function simIpv6(seed: number, offset: number): string {
  const hex = (n: number) => (n & 0xffff).toString(16).padStart(4, '0');
  return [
    '2001', hex(seed >> 16), hex(seed), hex(seed ^ 0xface),
    hex(seed * 3), hex(seed ^ offset), hex(offset * 0x1337), hex(seed + offset),
  ].join(':');
}

// ── Simulate DNS records based on domain + record type ────────────────────────

function simulate(domain: string, type: RecordType): DnsResult {
  const d = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*/, '').trim();
  const apex = d.replace(/^www\./, '');
  const h = domainHash(d);
  const ttl = TTL_MAP[type];
  let records: string[] = [];

  switch (type) {
    case 'A':
      records = [
        `${d}.  ${ttl}  IN  A  ${simIp(h, 0)}`,
        `${d}.  ${ttl}  IN  A  ${simIp(h, 1)}`,
        `${d}.  ${ttl}  IN  A  ${simIp(h, 3)}`,
      ];
      break;

    case 'AAAA':
      records = [
        `${d}.  ${ttl}  IN  AAAA  ${simIpv6(h, 0)}`,
        `${d}.  ${ttl}  IN  AAAA  ${simIpv6(h, 1)}`,
      ];
      break;

    case 'CNAME':
      records = [
        `www.${apex}.  ${ttl}  IN  CNAME  ${apex}.`,
      ];
      break;

    case 'MX':
      records = [
        `${apex}.  ${ttl}  IN  MX  10  mail.${apex}.`,
        `${apex}.  ${ttl}  IN  MX  20  backup.${apex}.`,
        `${apex}.  ${ttl}  IN  MX  30  mail2.${apex}.`,
      ];
      break;

    case 'TXT':
      records = [
        `${apex}.  ${ttl}  IN  TXT  "v=spf1 include:_spf.${apex} ip4:${simIp(h, 0)} ~all"`,
        `${apex}.  ${ttl}  IN  TXT  "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."`,
        `${apex}.  ${ttl}  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:dmarc@${apex}"`,
        `${apex}.  ${ttl}  IN  TXT  "${apex}-site-verification=${h.toString(16)}${(h ^ 0xdeadbeef).toString(16)}"`,
      ];
      break;

    case 'NS':
      records = [
        `${apex}.  ${ttl}  IN  NS  ns1.${apex}.`,
        `${apex}.  ${ttl}  IN  NS  ns2.${apex}.`,
        `${apex}.  ${ttl}  IN  NS  ns3.${apex}.`,
      ];
      break;

    case 'SOA': {
      const serial = 2024030100 + (h % 99);
      records = [
        `${apex}.  ${ttl}  IN  SOA  ns1.${apex}.  hostmaster.${apex}. (`,
        `                   ${serial}   ; serial`,
        `                   3600        ; refresh`,
        `                   900         ; retry`,
        `                   604800      ; expire`,
        `                   300 )       ; minimum TTL`,
      ];
      break;
    }

    case 'PTR': {
      const ip = simIp(h, 0).split('.').reverse().join('.');
      records = [
        `${ip}.in-addr.arpa.  ${ttl}  IN  PTR  ${apex}.`,
      ];
      break;
    }

    case 'SRV':
      records = [
        `_https._tcp.${apex}.  ${ttl}  IN  SRV  10  20  443  ${apex}.`,
        `_http._tcp.${apex}.   ${ttl}  IN  SRV  10  20  80   ${apex}.`,
        `_imaps._tcp.${apex}.  ${ttl}  IN  SRV  0   1   993  mail.${apex}.`,
      ];
      break;

    case 'CAA':
      records = [
        `${apex}.  ${ttl}  IN  CAA  0  issue  "letsencrypt.org"`,
        `${apex}.  ${ttl}  IN  CAA  0  issue  "digicert.com"`,
        `${apex}.  ${ttl}  IN  CAA  0  iodef  "mailto:security@${apex}"`,
      ];
      break;
  }

  return { type, domain: d, ttl, records };
}

// ── DNS Record Types reference data ───────────────────────────────────────────

const RECORD_TYPES: {
  type: RecordType;
  purpose: string;
  example: string;
  whenToUse: string;
}[] = [
  {
    type: 'A',
    purpose: 'Maps a hostname to an IPv4 address.',
    example: 'example.com.  300  IN  A  93.184.216.34',
    whenToUse: 'Point a domain or subdomain to a specific IPv4 server address. The most common record type.',
  },
  {
    type: 'AAAA',
    purpose: 'Maps a hostname to an IPv6 address.',
    example: 'example.com.  300  IN  AAAA  2606:2800:220:1:248:1893:25c8:1946',
    whenToUse: 'Use alongside an A record to support IPv6 clients on dual-stack networks.',
  },
  {
    type: 'CNAME',
    purpose: 'Aliases one hostname to another (canonical name).',
    example: 'www.example.com.  3600  IN  CNAME  example.com.',
    whenToUse: 'Redirect subdomains (www, blog, api) to the apex domain or a CDN endpoint. Cannot coexist with other records at the same name.',
  },
  {
    type: 'MX',
    purpose: 'Specifies mail servers responsible for accepting email for the domain.',
    example: 'example.com.  3600  IN  MX  10  mail.example.com.',
    whenToUse: 'Required to receive email. Lower priority numbers are preferred. Use multiple records for redundancy.',
  },
  {
    type: 'TXT',
    purpose: 'Holds arbitrary text data — widely used for domain verification and email authentication.',
    example: 'example.com.  3600  IN  TXT  "v=spf1 include:_spf.google.com ~all"',
    whenToUse: 'SPF, DKIM, DMARC email policies; domain ownership verification for Google, GitHub, etc.; ACME DNS-01 challenge tokens.',
  },
  {
    type: 'NS',
    purpose: 'Delegates a DNS zone to the given authoritative name servers.',
    example: 'example.com.  86400  IN  NS  ns1.example.com.',
    whenToUse: 'Set automatically by your domain registrar. Change only when moving DNS hosting to a different provider.',
  },
  {
    type: 'SOA',
    purpose: 'Start of Authority — contains authoritative metadata about a DNS zone.',
    example: 'example.com.  3600  IN  SOA  ns1.example.com. hostmaster.example.com. 2024030100 3600 900 604800 300',
    whenToUse: 'Automatically created by DNS providers. The serial number must be incremented on every zone change to trigger secondary server syncs.',
  },
  {
    type: 'PTR',
    purpose: 'Reverse DNS — maps an IP address back to a hostname.',
    example: '34.216.184.93.in-addr.arpa.  86400  IN  PTR  example.com.',
    whenToUse: 'Required for mail servers to pass reverse-DNS checks and reduce spam score. Managed by your IP address provider, not your domain registrar.',
  },
  {
    type: 'SRV',
    purpose: 'Specifies the hostname and port for a specific service (e.g., SIP, XMPP, gaming).',
    example: '_https._tcp.example.com.  120  IN  SRV  10  20  443  example.com.',
    whenToUse: 'Service discovery for protocols that support it (SIP, XMPP, Matrix, some games). Format: priority, weight, port, target.',
  },
  {
    type: 'CAA',
    purpose: 'Certification Authority Authorization — restricts which CAs may issue TLS certificates.',
    example: 'example.com.  86400  IN  CAA  0  issue  "letsencrypt.org"',
    whenToUse: 'Security best practice to prevent unauthorized certificate issuance. Add before enabling HTTPS. Use iodef tag to receive mis-issuance notifications.',
  },
];

const ALL_TYPES: RecordType[] = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'SOA', 'PTR', 'SRV', 'CAA'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function DnsLookupSimulator() {
  const [domain, setDomain] = useState('example.com');
  const [selectedType, setSelectedType] = useState<RecordType>('A');
  const [result, setResult] = useState<DnsResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const outputText = useMemo(() => {
    if (!result) return '';
    return [
      `; <<>> DNS Lookup Simulator <<>> ${result.domain} ${result.type}`,
      `; (simulated — no real DNS queries performed)`,
      `;; QUESTION SECTION:`,
      `;${result.domain}.  IN  ${result.type}`,
      ``,
      `;; ANSWER SECTION:`,
      ...result.records,
      ``,
      `;; Query time: ${12 + (domainHash(result.domain) % 40)} msec`,
      `;; WHEN: ${new Date().toUTCString()}`,
      `;; MSG SIZE  rcvd: ${64 + result.records.join('').length}`,
    ].join('\n');
  }, [result]);

  function handleSimulate() {
    const raw = domain.trim();
    if (!raw) {
      setError('Please enter a domain name.');
      return;
    }
    // Basic domain validation
    const clean = raw.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*/, '');
    if (!/^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$/.test(clean) || clean.length < 3) {
      setError('Enter a valid domain name, e.g. example.com or api.mysite.dev');
      return;
    }
    setError('');
    setResult(simulate(clean, selectedType));
  }

  function handleCopy() {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleSimulate();
  }

  return (
    <div class="space-y-6">
      {/* Input row */}
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <label class="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Domain Name</label>
          <input
            type="text"
            value={domain}
            onInput={(e) => {
              setDomain((e.target as HTMLInputElement).value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="example.com"
            spellcheck={false}
            autocomplete="off"
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div class="sm:w-44">
          <label class="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Record Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType((e.target as HTMLSelectElement).value as RecordType)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div class="sm:self-end">
          <button
            onClick={handleSimulate}
            class="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/80 transition-colors"
          >
            Simulate Lookup
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p class="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Output */}
      {result && (
        <div class="rounded-lg overflow-hidden border border-border">
          {/* Terminal header */}
          <div class="bg-neutral-800 dark:bg-neutral-900 px-4 py-2.5 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full bg-red-500 inline-block" />
              <span class="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
              <span class="w-3 h-3 rounded-full bg-green-500 inline-block" />
              <span class="ml-3 text-xs font-mono text-neutral-400">
                dig {result.domain} {result.type}
              </span>
            </div>
            <button
              onClick={handleCopy}
              class="text-xs text-neutral-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
            >
              {copied ? '✓ Copied' : 'Copy output'}
            </button>
          </div>

          {/* Terminal body */}
          <div class="bg-neutral-900 dark:bg-neutral-950 px-4 py-4 overflow-x-auto">
            <pre class="font-mono text-sm leading-relaxed whitespace-pre text-neutral-300">
              {outputText}
            </pre>
          </div>

          {/* TTL badge */}
          <div class="bg-bg-card border-t border-border px-4 py-2.5 flex items-center gap-4 text-xs text-text-muted flex-wrap">
            <span>
              <span class="text-text font-medium">TTL:</span> {result.ttl}s
              {result.ttl >= 86400
                ? ' (1 day — slow propagation)'
                : result.ttl >= 3600
                ? ' (1 hour — standard)'
                : ' (5 min — fast propagation)'}
            </span>
            <span>
              <span class="text-text font-medium">Records:</span> {result.records.length}
            </span>
            <span class="text-yellow-500/80">Simulated output — not a real DNS query</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && !error && (
        <div class="bg-bg-card border border-border rounded-lg p-5 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">How it works</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Enter any domain name (no real DNS queries are made)</li>
            <li>Select a record type from the dropdown</li>
            <li>Click Simulate Lookup or press Enter to generate realistic output</li>
            <li>Output format matches the standard <code class="font-mono">dig</code> command</li>
            <li>IP addresses and values are deterministically derived from the domain name</li>
          </ul>
        </div>
      )}

      {/* DNS Record Types Reference Table */}
      <div class="mt-10">
        <h2 class="text-xl font-bold text-text mb-1">DNS Record Types Reference</h2>
        <p class="text-sm text-text-muted mb-4">All 10 record types supported by this simulator — purpose, example, and when to use each.</p>

        {/* Desktop table */}
        <div class="hidden md:block overflow-x-auto rounded-lg border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-bg-card border-b border-border text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                <th class="px-4 py-3 w-16">Type</th>
                <th class="px-4 py-3">Purpose</th>
                <th class="px-4 py-3">Example</th>
                <th class="px-4 py-3">When to Use</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {RECORD_TYPES.map((row, idx) => (
                <tr
                  key={row.type}
                  class={`transition-colors hover:bg-primary/5 ${idx % 2 === 0 ? 'bg-transparent' : 'bg-bg-card/40'}`}
                >
                  <td class="px-4 py-3 font-mono font-bold text-primary text-base align-top">{row.type}</td>
                  <td class="px-4 py-3 text-text align-top">{row.purpose}</td>
                  <td class="px-4 py-3 align-top">
                    <code class="font-mono text-xs text-text-muted break-all">{row.example}</code>
                  </td>
                  <td class="px-4 py-3 text-text-muted text-xs align-top">{row.whenToUse}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div class="md:hidden space-y-3">
          {RECORD_TYPES.map((row) => (
            <div key={row.type} class="bg-bg-card border border-border rounded-lg p-4 space-y-2">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-primary text-lg">{row.type}</span>
                <span class="text-xs text-text-muted">{row.purpose}</span>
              </div>
              <code class="block font-mono text-xs text-text-muted bg-neutral-900/30 dark:bg-neutral-800/40 rounded px-2 py-1.5 break-all">
                {row.example}
              </code>
              <p class="text-xs text-text-muted">{row.whenToUse}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
