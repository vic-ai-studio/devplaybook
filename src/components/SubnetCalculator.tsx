import { useState } from 'preact/hooks';

function intToIp(n: number) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function ipToInt(ip: string) {
  const p = ip.split('.').map(Number);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}
function intToBin(n: number) {
  return (n >>> 0).toString(2).padStart(32, '0').replace(/(.{8})/g, '$1.').slice(0, -1);
}

function calcSubnet(cidr: string) {
  const m = cidr.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
  if (!m) return null;
  const ip = m[1];
  const prefix = parseInt(m[2]);
  if (prefix < 0 || prefix > 32) return null;
  const parts = ip.split('.').map(Number);
  if (parts.some(p => p < 0 || p > 255)) return null;

  const ipInt = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const totalHosts = prefix >= 31 ? Math.pow(2, 32 - prefix) : Math.pow(2, 32 - prefix) - 2;
  const firstHost = prefix >= 31 ? network : (network + 1) >>> 0;
  const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;

  return {
    ip, prefix,
    network: intToIp(network),
    mask: intToIp(mask),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    totalHosts: totalHosts.toLocaleString(),
    ipBin: intToBin(ipInt),
    maskBin: intToBin(mask),
    networkBin: intToBin(network),
    broadcastBin: intToBin(broadcast),
  };
}

export default function SubnetCalculator() {
  const [input, setInput] = useState('192.168.1.0/24');
  const result = calcSubnet(input);

  const rows = result ? [
    ['IP Address', result.ip, result.ipBin],
    ['Subnet Mask', result.mask, result.maskBin],
    ['Network Address', result.network, result.networkBin],
    ['Broadcast Address', result.broadcast, result.broadcastBin],
    ['First Host', result.firstHost, ''],
    ['Last Host', result.lastHost, ''],
    ['Total Usable Hosts', result.totalHosts, ''],
    ['CIDR Prefix', `/${result.prefix}`, ''],
  ] : [];

  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">IP Address / CIDR</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={input}
            onInput={e => setInput((e.target as HTMLInputElement).value)}
            placeholder="192.168.1.0/24"
            class="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <p class="text-xs text-text-muted mt-1">Format: 192.168.1.0/24</p>
      </div>

      {result ? (
        <div class="space-y-3">
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-bg-card border-b border-border">
                  <th class="text-left px-4 py-2 text-text-muted font-medium">Field</th>
                  <th class="text-left px-4 py-2 text-text-muted font-medium">Value</th>
                  <th class="text-left px-4 py-2 text-text-muted font-medium hidden md:table-cell">Binary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([field, val, bin], i) => (
                  <tr key={i} class={i % 2 === 0 ? 'bg-bg' : 'bg-bg-card'}>
                    <td class="px-4 py-2 text-text-muted">{field}</td>
                    <td class="px-4 py-2 font-mono font-bold text-primary">{val}</td>
                    <td class="px-4 py-2 font-mono text-xs text-text-muted hidden md:table-cell">{bin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap gap-2">
            {[['10.0.0.0/8', 'Class A'], ['172.16.0.0/12', 'Class B'], ['192.168.1.0/24', 'Class C'], ['10.10.0.0/16', '/16'], ['192.168.0.0/28', '/28']].map(([cidr, label]) => (
              <button key={cidr} onClick={() => setInput(cidr)}
                class="px-3 py-1 text-xs bg-bg-card border border-border rounded-lg hover:border-primary hover:text-primary transition-colors">
                {label} <span class="font-mono text-text-muted ml-1">{cidr}</span>
              </button>
            ))}
          </div>
        </div>
      ) : input.trim() && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">Invalid CIDR notation. Use format: 192.168.1.0/24</div>
      )}
    </div>
  );
}
