import { useState } from 'preact/hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubnetReq {
  id: number;
  name: string;
  hosts: string;
}

interface VlsmSubnetResult {
  name: string;
  requiredHosts: number;
  allocatedHosts: number;
  prefix: number;
  networkAddress: string;
  firstHost: string;
  lastHost: string;
  broadcastAddress: string;
  subnetMask: string;
  cidr: string;
  blockSize: number;
  startLong: number;
}

// ─── IP helpers ──────────────────────────────────────────────────────────────

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

function prefixToMask(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

function maskToSubnetMask(prefix: number): string {
  return longToIp(prefixToMask(prefix));
}

function isValidIp(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    const n = parseInt(p, 10);
    return !isNaN(n) && n >= 0 && n <= 255 && String(n) === p;
  });
}

// ─── VLSM core algorithm ─────────────────────────────────────────────────────

/** Returns the smallest /prefix that accommodates `hosts` usable addresses. */
function requiredPrefix(hosts: number): number {
  // Need hosts + 2 (network + broadcast) total addresses
  let blockSize = 2;
  let prefix = 31;
  while (blockSize - 2 < hosts) {
    blockSize *= 2;
    prefix -= 1;
  }
  // /32 and /31 are edge cases; enforce minimum of /30 for ≥1 host
  if (prefix < 0) return -1; // impossible
  return prefix;
}

function calculateVlsm(
  networkCidr: string,
  reqs: SubnetReq[]
): { results: VlsmSubnetResult[]; error: string } {
  // Parse network
  const parts = networkCidr.trim().split('/');
  if (parts.length !== 2) return { results: [], error: 'Invalid network. Use CIDR format: 192.168.1.0/24' };
  const [ipStr, prefixStr] = parts;
  if (!isValidIp(ipStr)) return { results: [], error: 'Invalid IP address.' };
  const networkPrefix = parseInt(prefixStr, 10);
  if (isNaN(networkPrefix) || networkPrefix < 0 || networkPrefix > 30)
    return { results: [], error: 'Prefix must be between /0 and /30.' };

  // Validate subnet requests
  const parsed: { name: string; hosts: number; idx: number }[] = [];
  for (let i = 0; i < reqs.length; i++) {
    const h = parseInt(reqs[i].hosts, 10);
    if (!reqs[i].name.trim()) return { results: [], error: `Subnet ${i + 1}: name is required.` };
    if (isNaN(h) || h < 1) return { results: [], error: `"${reqs[i].name}": hosts must be ≥ 1.` };
    if (h > 4294967293) return { results: [], error: `"${reqs[i].name}": hosts value too large.` };
    parsed.push({ name: reqs[i].name.trim(), hosts: h, idx: i });
  }

  if (parsed.length === 0) return { results: [], error: 'Add at least one subnet.' };

  // Sort largest to smallest (VLSM requirement)
  const sorted = [...parsed].sort((a, b) => b.hosts - a.hosts);

  // Total available addresses in the parent network
  const totalAddresses = Math.pow(2, 32 - networkPrefix);
  const networkMask = prefixToMask(networkPrefix);
  const networkBase = (ipToLong(ipStr) & networkMask) >>> 0;

  // Check total space needed
  let totalNeeded = 0;
  for (const s of sorted) {
    const prefix = requiredPrefix(s.hosts);
    if (prefix < 0 || prefix < networkPrefix)
      return { results: [], error: `"${s.name}" requires more space than the parent network provides.` };
    totalNeeded += Math.pow(2, 32 - prefix);
  }
  if (totalNeeded > totalAddresses)
    return { results: [], error: `Not enough address space. Need ${totalNeeded.toLocaleString()} addresses but only ${totalAddresses.toLocaleString()} available in /${networkPrefix}.` };

  // Allocate
  let cursor = networkBase;
  const results: VlsmSubnetResult[] = [];

  for (const s of sorted) {
    const prefix = requiredPrefix(s.hosts);
    const blockSize = Math.pow(2, 32 - prefix);
    const mask = prefixToMask(prefix);

    // Align cursor to block boundary
    const alignedStart = (Math.ceil(cursor / blockSize) * blockSize) >>> 0;

    if (alignedStart + blockSize > networkBase + totalAddresses)
      return { results: [], error: `Not enough contiguous space for "${s.name}". Try reordering or using a larger parent network.` };

    const network = alignedStart >>> 0;
    const broadcast = (network + blockSize - 1) >>> 0;

    results.push({
      name: s.name,
      requiredHosts: s.hosts,
      allocatedHosts: blockSize - 2,
      prefix,
      networkAddress: longToIp(network),
      firstHost: longToIp((network + 1) >>> 0),
      lastHost: longToIp((broadcast - 1) >>> 0),
      broadcastAddress: longToIp(broadcast),
      subnetMask: maskToSubnetMask(prefix),
      cidr: `${longToIp(network)}/${prefix}`,
      blockSize,
      startLong: network,
    });

    cursor = (broadcast + 1) >>> 0;
  }

  return { results, error: '' };
}

// ─── Allocation bar ───────────────────────────────────────────────────────────

const PALETTE = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-rose-500',
  'bg-teal-500',
  'bg-indigo-500',
];

function AllocationBar({
  results,
  networkBase,
  totalAddresses,
}: {
  results: VlsmSubnetResult[];
  networkBase: number;
  totalAddresses: number;
}) {
  const segments: { left: number; width: number; label: string; color: string; idx: number }[] = [];

  results.forEach((r, i) => {
    const left = ((r.startLong - networkBase) / totalAddresses) * 100;
    const width = (r.blockSize / totalAddresses) * 100;
    segments.push({ left, width, label: r.name, color: PALETTE[i % PALETTE.length], idx: i });
  });

  // free space
  const usedEnd = results.length > 0
    ? results[results.length - 1].startLong + results[results.length - 1].blockSize - networkBase
    : 0;
  const freePercent = ((totalAddresses - usedEnd) / totalAddresses) * 100;

  return (
    <div class="space-y-2">
      <p class="text-xs font-medium text-text-muted uppercase tracking-wider">Address Space Allocation</p>
      <div class="relative h-8 w-full rounded-lg overflow-hidden bg-bg border border-border flex">
        {segments.map((s) => (
          <div
            key={s.idx}
            class={`${s.color} h-full flex items-center justify-center overflow-hidden`}
            style={{ width: `${s.width}%`, minWidth: '2px' }}
            title={`${s.label}: ${s.width.toFixed(1)}% of space`}
          >
            {s.width > 6 && (
              <span class="text-white text-xs font-medium truncate px-1">{s.label}</span>
            )}
          </div>
        ))}
        {freePercent > 0 && (
          <div
            class="h-full bg-bg-card border-l border-dashed border-border flex items-center justify-center"
            style={{ flex: 1 }}
            title={`Free: ${freePercent.toFixed(1)}%`}
          >
            {freePercent > 8 && (
              <span class="text-text-muted text-xs">free</span>
            )}
          </div>
        )}
      </div>
      <div class="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <span key={s.idx} class="flex items-center gap-1.5 text-xs text-text-muted">
            <span class={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`} />
            {s.label} ({s.width.toFixed(1)}%)
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DEFAULT_SUBNETS: SubnetReq[] = [
  { id: 1, name: 'Engineering', hosts: '50' },
  { id: 2, name: 'Sales', hosts: '25' },
  { id: 3, name: 'Management', hosts: '10' },
];

let nextId = 4;

export default function VlsmCalculator() {
  const [network, setNetwork] = useState('192.168.1.0/24');
  const [subnets, setSubnets] = useState<SubnetReq[]>(DEFAULT_SUBNETS);
  const [result, setResult] = useState<{ results: VlsmSubnetResult[]; error: string } | null>(null);

  function addSubnet() {
    setSubnets((prev) => [...prev, { id: nextId++, name: '', hosts: '' }]);
  }

  function removeSubnet(id: number) {
    setSubnets((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSubnet(id: number, field: 'name' | 'hosts', value: string) {
    setSubnets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  function calculate() {
    const r = calculateVlsm(network, subnets);
    setResult(r);
  }

  // Derive bar props when results exist
  let networkBase = 0;
  let totalAddresses = 0;
  if (result && !result.error && result.results.length > 0) {
    const p = network.trim().split('/');
    if (p.length === 2 && isValidIp(p[0])) {
      const prefix = parseInt(p[1], 10);
      const mask = prefixToMask(prefix);
      networkBase = (ipToLong(p[0]) & mask) >>> 0;
      totalAddresses = Math.pow(2, 32 - prefix);
    }
  }

  return (
    <div class="space-y-6">
      {/* Network input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Parent Network (CIDR)</label>
        <input
          type="text"
          value={network}
          onInput={(e) => setNetwork((e.target as HTMLInputElement).value)}
          placeholder="192.168.1.0/24"
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-base font-mono text-text focus:outline-none focus:border-primary transition-colors"
          spellcheck={false}
        />
        <p class="mt-1 text-xs text-text-muted">Enter the base network to subdivide (e.g. 192.168.1.0/24, 10.0.0.0/16)</p>
      </div>

      {/* Subnet requirements */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium text-text-muted">Subnet Requirements</label>
          <button
            onClick={addSubnet}
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
          >
            <span class="text-base leading-none">+</span> Add Subnet
          </button>
        </div>

        <div class="space-y-2">
          <div class="hidden sm:grid grid-cols-[1fr_140px_36px] gap-2 px-1">
            <span class="text-xs text-text-muted">Subnet Name</span>
            <span class="text-xs text-text-muted">Required Hosts</span>
            <span />
          </div>

          {subnets.map((s, i) => (
            <div key={s.id} class="grid grid-cols-[1fr_140px_36px] gap-2 items-center">
              <input
                type="text"
                value={s.name}
                onInput={(e) => updateSubnet(s.id, 'name', (e.target as HTMLInputElement).value)}
                placeholder={`Subnet ${i + 1}`}
                class="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                spellcheck={false}
              />
              <input
                type="number"
                value={s.hosts}
                onInput={(e) => updateSubnet(s.id, 'hosts', (e.target as HTMLInputElement).value)}
                placeholder="Hosts"
                min="1"
                class="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
              />
              <button
                onClick={() => removeSubnet(s.id)}
                disabled={subnets.length <= 1}
                class="flex items-center justify-center h-9 w-9 rounded-lg border border-border text-text-muted hover:border-red-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={calculate}
        class="w-full py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition-all"
      >
        Calculate VLSM
      </button>

      {/* Error */}
      {result && result.error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-400">
          {result.error}
        </div>
      )}

      {/* Results */}
      {result && !result.error && result.results.length > 0 && (
        <div class="space-y-5">
          {/* Allocation bar */}
          <div class="border border-border rounded-xl p-4 bg-bg-card">
            <AllocationBar
              results={result.results}
              networkBase={networkBase}
              totalAddresses={totalAddresses}
            />
          </div>

          {/* Summary stats */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Subnets', value: String(result.results.length) },
              {
                label: 'Total Hosts',
                value: result.results.reduce((a, r) => a + r.allocatedHosts, 0).toLocaleString(),
              },
              {
                label: 'Space Used',
                value: (() => {
                  const used = result.results.reduce((a, r) => a + r.blockSize, 0);
                  return `${((used / totalAddresses) * 100).toFixed(1)}%`;
                })(),
              },
              {
                label: 'Free Addresses',
                value: (() => {
                  const used = result.results.reduce((a, r) => a + r.blockSize, 0);
                  return (totalAddresses - used).toLocaleString();
                })(),
              },
            ].map(({ label, value }) => (
              <div key={label} class="border border-border rounded-lg p-3 bg-bg-card text-center">
                <p class="text-lg font-bold text-primary font-mono">{value}</p>
                <p class="text-xs text-text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Results table */}
          <div class="overflow-x-auto rounded-xl border border-border">
            <table class="w-full text-sm min-w-[700px]">
              <thead>
                <tr class="bg-bg-card border-b border-border">
                  <th class="text-left px-4 py-3 text-text-muted font-medium">#</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">Subnet</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">Hosts (req → alloc)</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">CIDR</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">Network</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">First Host</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">Last Host</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">Broadcast</th>
                  <th class="text-left px-4 py-3 text-text-muted font-medium">Mask</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i} class={i % 2 === 0 ? 'bg-bg' : 'bg-bg-card'}>
                    <td class="px-4 py-3">
                      <span
                        class={`inline-block w-2.5 h-2.5 rounded-sm ${PALETTE[i % PALETTE.length]}`}
                      />
                    </td>
                    <td class="px-4 py-3 font-medium text-text">{r.name}</td>
                    <td class="px-4 py-3 font-mono text-text-muted">
                      {r.requiredHosts.toLocaleString()}
                      <span class="text-text-muted mx-1">→</span>
                      <span class="text-text">{r.allocatedHosts.toLocaleString()}</span>
                    </td>
                    <td class="px-4 py-3 font-mono font-bold text-primary">{r.cidr}</td>
                    <td class="px-4 py-3 font-mono text-text">{r.networkAddress}</td>
                    <td class="px-4 py-3 font-mono text-text">{r.firstHost}</td>
                    <td class="px-4 py-3 font-mono text-text">{r.lastHost}</td>
                    <td class="px-4 py-3 font-mono text-text">{r.broadcastAddress}</td>
                    <td class="px-4 py-3 font-mono text-text-muted">{r.subnetMask}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-subnet detail cards (mobile-friendly) */}
          <div class="space-y-3 sm:hidden">
            {result.results.map((r, i) => (
              <div key={i} class="border border-border rounded-xl bg-bg-card overflow-hidden">
                <div class={`px-4 py-2.5 flex items-center gap-2 border-b border-border ${PALETTE[i % PALETTE.length]} bg-opacity-10`}>
                  <span class={`w-2.5 h-2.5 rounded-sm ${PALETTE[i % PALETTE.length]}`} />
                  <span class="font-semibold text-text">{r.name}</span>
                  <span class="ml-auto font-mono text-primary font-bold text-sm">{r.cidr}</span>
                </div>
                <div class="px-4 divide-y divide-border">
                  {[
                    ['Required Hosts', r.requiredHosts.toLocaleString()],
                    ['Allocated Hosts', r.allocatedHosts.toLocaleString()],
                    ['Network', r.networkAddress],
                    ['First Host', r.firstHost],
                    ['Last Host', r.lastHost],
                    ['Broadcast', r.broadcastAddress],
                    ['Subnet Mask', r.subnetMask],
                  ].map(([label, value]) => (
                    <div key={label} class="flex justify-between py-2">
                      <span class="text-xs text-text-muted">{label}</span>
                      <span class="text-xs font-mono text-text">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
