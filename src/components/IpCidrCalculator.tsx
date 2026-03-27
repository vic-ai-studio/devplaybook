import { useState } from 'preact/hooks';

// ─── IPv4 Helpers ───────────────────────────────────────────────────────────

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function intToIpv4(n: number): string {
  return [24, 16, 8, 0].map(shift => (n >>> shift) & 0xff).join('.');
}

function ipv4ToBinary(ip: string): string {
  return ip.split('.').map(o => parseInt(o, 10).toString(2).padStart(8, '0')).join('.');
}

interface Ipv4Result {
  type: 'ipv4';
  input: string;
  networkAddress: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  subnetMask: string;
  wildcardMask: string;
  usableHosts: number;
  totalAddresses: number;
  prefix: number;
  networkBinary: string;
  maskBinary: string;
  broadcastBinary: string;
}

function calcIpv4(ip: string, prefix: number): Ipv4Result {
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const ipInt = ipv4ToInt(ip);
  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? total : total - 2;
  const firstHostInt = prefix >= 31 ? networkInt : (networkInt + 1) >>> 0;
  const lastHostInt = prefix >= 31 ? broadcastInt : (broadcastInt - 1) >>> 0;
  const wildcard = (~mask) >>> 0;

  return {
    type: 'ipv4',
    input: `${intToIpv4(networkInt)}/${prefix}`,
    prefix,
    networkAddress: intToIpv4(networkInt),
    broadcast: intToIpv4(broadcastInt),
    firstHost: intToIpv4(firstHostInt),
    lastHost: intToIpv4(lastHostInt),
    subnetMask: intToIpv4(mask),
    wildcardMask: intToIpv4(wildcard),
    totalAddresses: total,
    usableHosts: Math.max(0, usable),
    networkBinary: ipv4ToBinary(intToIpv4(networkInt)),
    maskBinary: ipv4ToBinary(intToIpv4(mask)),
    broadcastBinary: ipv4ToBinary(intToIpv4(broadcastInt)),
  };
}

// ─── IPv6 Helpers ───────────────────────────────────────────────────────────

function expandIpv6(ip: string): string {
  let parts = ip.split('::');
  if (parts.length > 2) throw new Error('Invalid IPv6');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  const middle = Array(missing).fill('0000');
  return [...left, ...middle, ...right].map(p => p.padStart(4, '0')).join(':');
}

function ipv6ToBigInt(ip: string): bigint {
  const expanded = expandIpv6(ip);
  return expanded.split(':').reduce((acc, part) => (acc << BigInt(16)) | BigInt(parseInt(part, 16)), BigInt(0));
}

function bigIntToIpv6(n: bigint): string {
  const parts: string[] = [];
  for (let i = 0; i < 8; i++) {
    parts.unshift(((n >> BigInt(i * 16)) & BigInt(0xffff)).toString(16).padStart(4, '0'));
  }
  // Simple compression: find longest run of 0000
  const str = parts.join(':');
  return str.replace(/(^|:)(0{4}:){2,}(?=0{4}(:|$))/, '::').replace(/::0{4}::/, '::') || str;
}

function ipv6ToBinary(ip: string): string {
  const expanded = expandIpv6(ip);
  return expanded.split(':').map(p => parseInt(p, 16).toString(2).padStart(16, '0')).join(':');
}

interface Ipv6Result {
  type: 'ipv6';
  input: string;
  prefix: number;
  networkAddress: string;
  lastAddress: string;
  totalAddresses: string; // too large for number
  networkBinary: string;
  lastBinary: string;
}

function calcIpv6(ip: string, prefix: number): Ipv6Result {
  const ipInt = ipv6ToBigInt(ip);
  const bits = BigInt(128 - prefix);
  const mask = prefix === 0 ? BigInt(0) : ((BigInt(1) << BigInt(128)) - BigInt(1)) ^ ((BigInt(1) << bits) - BigInt(1));
  const networkInt = ipInt & mask;
  const lastInt = networkInt | ((BigInt(1) << bits) - BigInt(1));
  const total = BigInt(1) << bits;

  let totalStr: string;
  if (total > BigInt('1000000000000')) {
    totalStr = `2^${128 - prefix}`;
  } else {
    totalStr = total.toString();
  }

  return {
    type: 'ipv6',
    input: `${bigIntToIpv6(networkInt)}/${prefix}`,
    prefix,
    networkAddress: bigIntToIpv6(networkInt),
    lastAddress: bigIntToIpv6(lastInt),
    totalAddresses: totalStr,
    networkBinary: ipv6ToBinary(bigIntToIpv6(networkInt)),
    lastBinary: ipv6ToBinary(bigIntToIpv6(lastInt)),
  };
}

// ─── Parse ──────────────────────────────────────────────────────────────────

function detectVersion(ip: string): 4 | 6 | null {
  if (/^[\d.]+$/.test(ip)) return 4;
  if (ip.includes(':')) return 6;
  return null;
}

function parseInput(raw: string): { ip: string; prefix: number; version: 4 | 6 } | { error: string } {
  const trimmed = raw.trim();
  const slashIdx = trimmed.lastIndexOf('/');
  if (slashIdx === -1) return { error: 'Missing prefix length (e.g. 192.168.1.0/24 or 2001:db8::/32)' };

  const ip = trimmed.slice(0, slashIdx).trim();
  const prefixStr = trimmed.slice(slashIdx + 1).trim();
  const prefix = parseInt(prefixStr, 10);

  const version = detectVersion(ip);
  if (!version) return { error: 'Cannot determine IP version' };

  const maxPrefix = version === 4 ? 32 : 128;
  if (isNaN(prefix) || prefix < 0 || prefix > maxPrefix) {
    return { error: `Prefix must be 0–${maxPrefix} for IPv${version}` };
  }

  if (version === 4) {
    const parts = ip.split('.');
    if (parts.length !== 4 || parts.some(p => isNaN(Number(p)) || Number(p) < 0 || Number(p) > 255)) {
      return { error: 'Invalid IPv4 address' };
    }
  }

  if (version === 6) {
    try { expandIpv6(ip); } catch { return { error: 'Invalid IPv6 address' }; }
  }

  return { ip, prefix, version };
}

// ─── Component ──────────────────────────────────────────────────────────────

const EXAMPLES = [
  '192.168.1.0/24',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.1.100/30',
  '2001:db8::/32',
  'fe80::/10',
  '2001:db8:85a3::8a2e:370:7334/64',
];

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div class="flex justify-between items-center py-2 border-b border-border last:border-0 gap-4">
      <span class="text-sm text-text-muted shrink-0">{label}</span>
      <span class={`text-sm text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function BinaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div class="py-2 border-b border-border last:border-0">
      <div class="text-xs text-text-muted mb-1">{label}</div>
      <div class="font-mono text-xs break-all text-accent leading-relaxed">{value}</div>
    </div>
  );
}

export default function IpCidrCalculator() {
  const [input, setInput] = useState('192.168.1.0/24');
  const [result, setResult] = useState<Ipv4Result | Ipv6Result | null>(() => {
    const parsed = parseInput('192.168.1.0/24');
    if ('error' in parsed) return null;
    return parsed.version === 4 ? calcIpv4(parsed.ip, parsed.prefix) : calcIpv6(parsed.ip, parsed.prefix);
  });
  const [error, setError] = useState<string | null>(null);

  function calculate(value?: string) {
    const raw = value ?? input;
    const parsed = parseInput(raw);
    if ('error' in parsed) {
      setError(parsed.error);
      setResult(null);
      return;
    }
    setError(null);
    try {
      setResult(parsed.version === 4 ? calcIpv4(parsed.ip, parsed.prefix) : calcIpv6(parsed.ip, parsed.prefix));
    } catch (e: any) {
      setError(e?.message ?? 'Calculation failed');
      setResult(null);
    }
  }

  function loadExample(ex: string) {
    setInput(ex);
    calculate(ex);
  }

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="flex gap-2">
        <input
          type="text"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && calculate()}
          placeholder="192.168.1.0/24 or 2001:db8::/32"
          class="flex-1 font-mono text-sm bg-surface border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
        />
        <button
          onClick={() => calculate()}
          class="px-4 py-2 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          Calculate
        </button>
      </div>

      {/* Examples */}
      <div class="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            onClick={() => loadExample(ex)}
            class="text-xs font-mono bg-surface border border-border rounded px-2 py-1 hover:border-accent hover:text-accent transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">{error}</div>
      )}

      {/* Results */}
      {result && result.type === 'ipv4' && (
        <div class="space-y-4">
          <div class="p-4 bg-surface border border-border rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-mono">IPv4</span>
              <span class="text-sm font-mono text-text-muted">{result.input}</span>
            </div>
            <Row label="Network Address" value={result.networkAddress} />
            <Row label="Broadcast Address" value={result.broadcast} />
            <Row label="First Host" value={result.firstHost} />
            <Row label="Last Host" value={result.lastHost} />
            <Row label="Subnet Mask" value={result.subnetMask} />
            <Row label="Wildcard Mask" value={result.wildcardMask} />
            <Row label="Usable Hosts" value={result.usableHosts.toLocaleString()} mono={false} />
            <Row label="Total Addresses" value={result.totalAddresses.toLocaleString()} mono={false} />
          </div>

          <div class="p-4 bg-surface border border-border rounded-lg">
            <h3 class="text-sm font-semibold mb-3">Binary Representation</h3>
            <BinaryRow label="Network Address" value={result.networkBinary} />
            <BinaryRow label="Subnet Mask" value={result.maskBinary} />
            <BinaryRow label="Broadcast Address" value={result.broadcastBinary} />
          </div>
        </div>
      )}

      {result && result.type === 'ipv6' && (
        <div class="space-y-4">
          <div class="p-4 bg-surface border border-border rounded-lg">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-mono">IPv6</span>
              <span class="text-sm font-mono text-text-muted break-all">{result.input}</span>
            </div>
            <Row label="Network Address" value={result.networkAddress} />
            <Row label="Last Address" value={result.lastAddress} />
            <Row label="Prefix Length" value={`/${result.prefix}`} />
            <Row label="Total Addresses" value={result.totalAddresses} mono={false} />
          </div>

          <div class="p-4 bg-surface border border-border rounded-lg">
            <h3 class="text-sm font-semibold mb-3">Binary Representation</h3>
            <BinaryRow label="Network Address" value={result.networkBinary} />
            <BinaryRow label="Last Address" value={result.lastBinary} />
          </div>
        </div>
      )}
    </div>
  );
}
