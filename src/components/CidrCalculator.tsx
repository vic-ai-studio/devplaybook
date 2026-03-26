import { useState, useCallback } from 'preact/hooks';

interface CidrResult {
  networkAddress: string;
  broadcastAddress: string;
  firstHost: string;
  lastHost: string;
  wildcardMask: string;
  subnetMask: string;
  totalHosts: number;
  usableHosts: number;
  cidrNotation: string;
  binaryMask: string;
  ipClass: string;
}

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) | parseInt(octet, 10), 0) >>> 0;
}

function longToIp(n: number): string {
  return [
    (n >>> 24) & 255,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ].join('.');
}

function isValidIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

function binaryMaskStr(prefix: number): string {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return [
    ((mask >>> 24) & 255).toString(2).padStart(8, '0'),
    ((mask >>> 16) & 255).toString(2).padStart(8, '0'),
    ((mask >>> 8) & 255).toString(2).padStart(8, '0'),
    (mask & 255).toString(2).padStart(8, '0'),
  ].join('.');
}

function getIpClass(firstOctet: number): string {
  if (firstOctet < 128) return 'A';
  if (firstOctet < 192) return 'B';
  if (firstOctet < 224) return 'C';
  if (firstOctet < 240) return 'D (Multicast)';
  return 'E (Reserved)';
}

function calculateCidr(input: string): CidrResult | null {
  const parts = input.trim().split('/');
  if (parts.length !== 2) return null;
  const [ipStr, prefixStr] = parts;
  if (!isValidIp(ipStr)) return null;
  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

  const ipLong = ipToLong(ipStr);
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = (ipLong & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const totalHosts = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.pow(2, 32 - prefix);
  const usableHosts = prefix >= 31 ? totalHosts : totalHosts - 2;
  const firstHost = prefix >= 31 ? network : network + 1;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;

  return {
    networkAddress: longToIp(network),
    broadcastAddress: prefix >= 31 ? 'N/A' : longToIp(broadcast),
    firstHost: longToIp(firstHost),
    lastHost: longToIp(lastHost),
    wildcardMask: longToIp(wildcard),
    subnetMask: longToIp(mask),
    totalHosts,
    usableHosts,
    cidrNotation: `${longToIp(network)}/${prefix}`,
    binaryMask: binaryMaskStr(prefix),
    ipClass: getIpClass(ipLong >>> 24),
  };
}

const EXAMPLES = [
  '192.168.1.0/24',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.100.0/22',
  '10.10.10.0/30',
  '203.0.113.0/26',
];

function Row({ label, value, mono = true }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div class="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span class="text-sm text-text-muted">{label}</span>
      <span class={`text-sm font-medium text-text ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

export default function CidrCalculator() {
  const [input, setInput] = useState('192.168.1.0/24');
  const [error, setError] = useState('');

  const result = useCallback(() => {
    const r = calculateCidr(input);
    if (!r) {
      setError('Invalid CIDR notation. Example: 192.168.1.0/24');
      return null;
    }
    setError('');
    return r;
  }, [input])();

  return (
    <div class="space-y-5">
      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">CIDR notation</label>
        <input
          type="text"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          placeholder="192.168.1.0/24"
          class={`w-full bg-bg-card border rounded-lg px-4 py-3 text-lg font-mono text-text focus:outline-none transition-colors ${
            error ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
          spellcheck={false}
        />
        {error && <p class="mt-1.5 text-sm text-red-400">{error}</p>}
      </div>

      {/* Quick examples */}
      <div>
        <p class="text-xs text-text-muted mb-2">Quick examples</p>
        <div class="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setInput(ex)}
              class="px-3 py-1 text-xs font-mono rounded-lg bg-bg-card border border-border hover:border-primary hover:text-primary text-text-muted transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div class="space-y-4">
          <div class="border border-border rounded-xl p-4 bg-bg-card">
            <h3 class="text-sm font-semibold text-text mb-1">Network: <span class="font-mono text-primary">{result.cidrNotation}</span></h3>
            <p class="text-xs text-text-muted">Class {result.ipClass} address</p>
          </div>

          <div class="border border-border rounded-xl bg-bg-card divide-y divide-border overflow-hidden">
            <div class="px-4">
              <Row label="Network Address" value={result.networkAddress} />
              <Row label="Broadcast Address" value={result.broadcastAddress} />
              <Row label="First Usable Host" value={result.firstHost} />
              <Row label="Last Usable Host" value={result.lastHost} />
            </div>
          </div>

          <div class="border border-border rounded-xl bg-bg-card divide-y divide-border overflow-hidden">
            <div class="px-4">
              <Row label="Subnet Mask" value={result.subnetMask} />
              <Row label="Wildcard Mask" value={result.wildcardMask} />
              <Row label="Binary Mask" value={result.binaryMask} />
            </div>
          </div>

          <div class="border border-border rounded-xl bg-bg-card divide-y divide-border overflow-hidden">
            <div class="px-4">
              <Row label="Total Addresses" value={result.totalHosts.toLocaleString()} mono={false} />
              <Row label="Usable Hosts" value={result.usableHosts.toLocaleString()} mono={false} />
              <Row label="Prefix Length" value={`/${input.split('/')[1] || ''}`} />
              <Row label="IP Class" value={result.ipClass} mono={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
