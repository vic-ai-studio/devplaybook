import { useState } from 'preact/hooks';

type RecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV' | 'CAA' | 'PTR';

interface RecordField {
  key: string;
  label: string;
  placeholder: string;
  hint?: string;
}

interface RecordDef {
  fields: RecordField[];
  description: string;
  example: string;
}

const RECORD_DEFS: Record<RecordType, RecordDef> = {
  A: {
    description: 'Maps a hostname to an IPv4 address.',
    example: 'example.com. 300 IN A 93.184.216.34',
    fields: [
      { key: 'name', label: 'Name (hostname)', placeholder: 'example.com or @ or www', hint: '@ means root domain' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '300', hint: '300 = 5 min, 3600 = 1 hr' },
      { key: 'value', label: 'IPv4 Address', placeholder: '93.184.216.34' },
    ],
  },
  AAAA: {
    description: 'Maps a hostname to an IPv6 address.',
    example: 'example.com. 300 IN AAAA 2606:2800:220:1:248:1893:25c8:1946',
    fields: [
      { key: 'name', label: 'Name (hostname)', placeholder: 'example.com or @' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '300' },
      { key: 'value', label: 'IPv6 Address', placeholder: '2001:db8::1' },
    ],
  },
  CNAME: {
    description: 'Aliases one hostname to another. Cannot coexist with other records at the root.',
    example: 'www.example.com. 3600 IN CNAME example.com.',
    fields: [
      { key: 'name', label: 'Alias (source)', placeholder: 'www.example.com', hint: 'Never use @ for CNAME' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '3600' },
      { key: 'value', label: 'Target hostname', placeholder: 'example.com.', hint: 'Trailing dot = absolute domain' },
    ],
  },
  MX: {
    description: 'Specifies mail servers for the domain. Lower priority = higher preference.',
    example: 'example.com. 3600 IN MX 10 mail.example.com.',
    fields: [
      { key: 'name', label: 'Domain', placeholder: 'example.com or @' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '3600' },
      { key: 'priority', label: 'Priority', placeholder: '10', hint: 'Lower number = higher priority' },
      { key: 'value', label: 'Mail server hostname', placeholder: 'mail.example.com.' },
    ],
  },
  TXT: {
    description: 'Free-form text record. Used for SPF, DKIM, DMARC, domain verification, etc.',
    example: 'example.com. 3600 IN TXT "v=spf1 include:_spf.google.com ~all"',
    fields: [
      { key: 'name', label: 'Name', placeholder: 'example.com or @ or _dmarc' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '3600' },
      { key: 'value', label: 'Text content', placeholder: 'v=spf1 include:_spf.google.com ~all', hint: 'Will be quoted automatically' },
    ],
  },
  NS: {
    description: 'Delegates a subdomain to authoritative name servers.',
    example: 'example.com. 86400 IN NS ns1.example.com.',
    fields: [
      { key: 'name', label: 'Domain/subdomain', placeholder: 'example.com or @' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '86400', hint: '86400 = 24 hours' },
      { key: 'value', label: 'Nameserver hostname', placeholder: 'ns1.example.com.' },
    ],
  },
  SRV: {
    description: 'Locates services for a domain (e.g. SIP, XMPP, game servers).',
    example: '_sip._tcp.example.com. 3600 IN SRV 10 20 5060 sip.example.com.',
    fields: [
      { key: 'service', label: 'Service name', placeholder: '_sip', hint: 'Must start with underscore' },
      { key: 'proto', label: 'Protocol', placeholder: '_tcp', hint: '_tcp or _udp' },
      { key: 'name', label: 'Domain', placeholder: 'example.com' },
      { key: 'ttl', label: 'TTL', placeholder: '3600' },
      { key: 'priority', label: 'Priority', placeholder: '10' },
      { key: 'weight', label: 'Weight', placeholder: '20' },
      { key: 'port', label: 'Port', placeholder: '5060' },
      { key: 'value', label: 'Target hostname', placeholder: 'sip.example.com.' },
    ],
  },
  CAA: {
    description: 'Specifies which Certificate Authorities can issue SSL certs for the domain.',
    example: 'example.com. 3600 IN CAA 0 issue "letsencrypt.org"',
    fields: [
      { key: 'name', label: 'Domain', placeholder: 'example.com or @' },
      { key: 'ttl', label: 'TTL', placeholder: '3600' },
      { key: 'flag', label: 'Flag', placeholder: '0', hint: '0 = advisory, 128 = critical' },
      { key: 'tag', label: 'Tag', placeholder: 'issue', hint: 'issue, issuewild, or iodef' },
      { key: 'value', label: 'CA domain or URL', placeholder: 'letsencrypt.org' },
    ],
  },
  PTR: {
    description: 'Reverse DNS lookup — maps an IP address back to a hostname.',
    example: '34.216.184.93.in-addr.arpa. 3600 IN PTR example.com.',
    fields: [
      { key: 'name', label: 'Reverse IP (arpa format)', placeholder: '34.216.184.93.in-addr.arpa.', hint: 'Reverse the IP octets' },
      { key: 'ttl', label: 'TTL', placeholder: '3600' },
      { key: 'value', label: 'Hostname', placeholder: 'example.com.' },
    ],
  },
};

const COMMON_PATTERNS = [
  { label: 'Google SPF', value: 'v=spf1 include:_spf.google.com ~all', type: 'TXT' as RecordType },
  { label: 'DMARC basic', value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com', type: 'TXT' as RecordType },
  { label: 'Domain verify (Google)', value: 'google-site-verification=YOUR_CODE_HERE', type: 'TXT' as RecordType },
  { label: 'Domain verify (GitHub)', value: '_github-challenge-YOUR_ORG_NAME', type: 'TXT' as RecordType },
  { label: "Let's Encrypt CAA", value: 'letsencrypt.org', type: 'CAA' as RecordType },
];

function buildZoneLine(type: RecordType, vals: Record<string, string>): string {
  const name = vals.name || '@';
  const ttl = vals.ttl || '3600';
  const value = vals.value || '';

  switch (type) {
    case 'A':
    case 'AAAA':
    case 'CNAME':
    case 'NS':
    case 'PTR':
      return `${name} ${ttl} IN ${type} ${value}`;
    case 'MX':
      return `${name} ${ttl} IN MX ${vals.priority || '10'} ${value}`;
    case 'TXT':
      return `${name} ${ttl} IN TXT "${value}"`;
    case 'SRV':
      return `${vals.service || '_service'}.${vals.proto || '_tcp'}.${name} ${ttl} IN SRV ${vals.priority || '10'} ${vals.weight || '20'} ${vals.port || '80'} ${value}`;
    case 'CAA':
      return `${name} ${ttl} IN CAA ${vals.flag || '0'} ${vals.tag || 'issue'} "${value}"`;
  }
}

function buildDigCommand(type: RecordType, vals: Record<string, string>): string {
  const name = vals.name && vals.name !== '@' ? vals.name : 'example.com';
  if (type === 'SRV') return `dig ${vals.service || '_service'}.${vals.proto || '_tcp'}.${name} SRV`;
  return `dig ${name} ${type}`;
}

export default function DnsRecordBuilder() {
  const [type, setType] = useState<RecordType>('A');
  const [vals, setVals] = useState<Record<string, string>>({ name: '', ttl: '3600', value: '', priority: '10', weight: '20', port: '80', flag: '0', tag: 'issue', service: '_service', proto: '_tcp' });
  const [copied, setCopied] = useState<'zone' | 'dig' | null>(null);

  const def = RECORD_DEFS[type];
  const zoneLine = buildZoneLine(type, vals);
  const digCmd = buildDigCommand(type, vals);

  function setVal(key: string, value: string) {
    setVals(v => ({ ...v, [key]: value }));
  }

  function handleCopy(text: string, which: 'zone' | 'dig') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function applyPattern(p: typeof COMMON_PATTERNS[0]) {
    setType(p.type);
    setVals(v => ({ ...v, value: p.value, tag: p.type === 'CAA' ? 'issue' : v.tag }));
  }

  const inputClass = "w-full bg-bg-card border border-border rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent font-mono";
  const labelClass = "block text-xs font-medium text-text-muted mb-1 uppercase tracking-wide";

  return (
    <div class="space-y-5">
      {/* Record Type Picker */}
      <div>
        <label class={labelClass}>Record Type</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(RECORD_DEFS) as RecordType[]).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              class={`px-3 py-1.5 rounded text-sm font-mono font-bold border transition-colors ${
                type === t
                  ? 'bg-accent text-bg-base border-accent'
                  : 'bg-bg-card text-text-muted border-border hover:border-accent hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-2">{def.description}</p>
      </div>

      {/* Common Patterns */}
      <div>
        <label class={labelClass}>Common Patterns</label>
        <div class="flex flex-wrap gap-2">
          {COMMON_PATTERNS.map(p => (
            <button
              key={p.label}
              onClick={() => applyPattern(p)}
              class="px-2.5 py-1 rounded text-xs border border-border bg-bg-card text-text-muted hover:border-accent hover:text-text-primary transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {def.fields.map(f => (
          <div key={f.key}>
            <label class={labelClass}>{f.label}</label>
            <input
              type="text"
              value={vals[f.key] || ''}
              onInput={e => setVal(f.key, (e.target as HTMLInputElement).value)}
              placeholder={f.placeholder}
              class={inputClass}
            />
            {f.hint && <p class="text-xs text-text-muted mt-0.5">{f.hint}</p>}
          </div>
        ))}
      </div>

      {/* Output */}
      <div class="space-y-3">
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class={labelClass}>Zone File Format</label>
            <button
              onClick={() => handleCopy(zoneLine, 'zone')}
              class="text-xs px-3 py-1 rounded bg-bg-card border border-border hover:border-accent text-text-muted hover:text-text-primary transition-colors"
            >
              {copied === 'zone' ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="bg-bg-card border border-border rounded p-3 text-sm font-mono text-text-primary overflow-x-auto">{zoneLine}</pre>
        </div>
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class={labelClass}>Verify with dig</label>
            <button
              onClick={() => handleCopy(digCmd, 'dig')}
              class="text-xs px-3 py-1 rounded bg-bg-card border border-border hover:border-accent text-text-muted hover:text-text-primary transition-colors"
            >
              {copied === 'dig' ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="bg-bg-card border border-border rounded p-3 text-sm font-mono text-green-400 overflow-x-auto">{digCmd}</pre>
        </div>
        <div class="bg-bg-card border border-border rounded p-3">
          <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Zone file example</p>
          <pre class="text-xs font-mono text-text-muted">{def.example}</pre>
        </div>
      </div>
    </div>
  );
}
