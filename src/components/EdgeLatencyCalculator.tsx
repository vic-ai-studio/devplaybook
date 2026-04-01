import { useState } from 'preact/hooks';

type Provider = 'cloudflare' | 'vercel' | 'deno' | 'fastly';
type Complexity = 'simple' | 'medium' | 'complex';

interface ProviderData {
  name: string;
  coldStart: { min: number; max: number };
  warm: { simple: number; medium: number; complex: number };
  pops: number;
  runtime: string;
  notes: string;
}

const PROVIDERS: Record<Provider, ProviderData> = {
  cloudflare: {
    name: 'Cloudflare Workers',
    coldStart: { min: 0, max: 5 },
    warm: { simple: 1, medium: 4, complex: 12 },
    pops: 300,
    runtime: 'V8 isolates',
    notes: 'No cold starts in practice — isolates are pre-warmed globally',
  },
  vercel: {
    name: 'Vercel Edge Functions',
    coldStart: { min: 5, max: 50 },
    warm: { simple: 2, medium: 6, complex: 20 },
    pops: 90,
    runtime: 'V8 (Next.js Edge Runtime)',
    notes: 'Cold starts occur on first request per PoP; warm is very fast',
  },
  deno: {
    name: 'Deno Deploy',
    coldStart: { min: 10, max: 100 },
    warm: { simple: 3, medium: 8, complex: 25 },
    pops: 35,
    runtime: 'Deno (V8)',
    notes: 'Fewer PoPs than Cloudflare; cold starts vary by region load',
  },
  fastly: {
    name: 'Fastly Compute',
    coldStart: { min: 50, max: 200 },
    warm: { simple: 1, medium: 5, complex: 15 },
    pops: 90,
    runtime: 'Wasm (Rust/Go/JS)',
    notes: 'WASM-based; cold starts higher but warm execution is extremely fast',
  },
};

interface Region {
  code: string;
  name: string;
  baseLatencyMs: number;
}

const REGIONS: Region[] = [
  { code: 'us-east', name: 'US East (Virginia)', baseLatencyMs: 5 },
  { code: 'us-west', name: 'US West (Oregon)', baseLatencyMs: 8 },
  { code: 'eu-west', name: 'EU West (Ireland)', baseLatencyMs: 12 },
  { code: 'eu-central', name: 'EU Central (Frankfurt)', baseLatencyMs: 10 },
  { code: 'ap-east', name: 'Asia Pacific (Tokyo)', baseLatencyMs: 20 },
  { code: 'ap-southeast', name: 'Asia Pacific (Singapore)', baseLatencyMs: 18 },
  { code: 'ap-south', name: 'Asia Pacific (Mumbai)', baseLatencyMs: 22 },
  { code: 'sa-east', name: 'South America (São Paulo)', baseLatencyMs: 35 },
  { code: 'af-south', name: 'Africa (Cape Town)', baseLatencyMs: 40 },
  { code: 'me-south', name: 'Middle East (Bahrain)', baseLatencyMs: 30 },
];

function calcP50(base: number): number { return Math.round(base * 1.0); }
function calcP95(base: number): number { return Math.round(base * 2.2); }
function calcP99(base: number): number { return Math.round(base * 4.5); }

function bar(value: number, max: number, color: string): string {
  const pct = Math.min(100, (value / max) * 100);
  return `${Math.round(pct)}%`;
}

function LatencyBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div class="flex items-center gap-2">
      <div class="flex-1 bg-bg rounded-full h-2 overflow-hidden">
        <div
          class={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span class="text-xs font-mono w-14 text-right text-text">{value} ms</span>
    </div>
  );
}

export default function EdgeLatencyCalculator() {
  const [provider, setProvider] = useState<Provider>('cloudflare');
  const [complexity, setComplexity] = useState<Complexity>('simple');
  const [coldStartEnabled, setColdStartEnabled] = useState(false);
  const [userRegion, setUserRegion] = useState('us-east');
  const [edgeRegion, setEdgeRegion] = useState('us-east');
  const [showComparison, setShowComparison] = useState(false);

  const prov = PROVIDERS[provider];
  const userReg = REGIONS.find(r => r.code === userRegion)!;
  const edgeReg = REGIONS.find(r => r.code === edgeRegion)!;

  // Network RTT between user and edge
  const networkRtt = Math.abs(userReg.baseLatencyMs - edgeReg.baseLatencyMs) + 3;
  const warmExec = prov.warm[complexity];
  const coldStartMs = coldStartEnabled
    ? Math.round((prov.coldStart.min + prov.coldStart.max) / 2)
    : 0;

  const totalP50 = calcP50(networkRtt + warmExec + coldStartMs);
  const totalP95 = calcP95(networkRtt + warmExec) + coldStartMs;
  const totalP99 = calcP99(networkRtt + warmExec) + coldStartMs;
  const maxForBar = Math.max(totalP99, 200);

  return (
    <div class="space-y-4">
      {/* Provider select */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-3">Select Edge Provider</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(PROVIDERS) as Provider[]).map(p => (
            <button
              key={p}
              onClick={() => setProvider(p)}
              class={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors text-left ${
                provider === p
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              <div class="font-semibold">{PROVIDERS[p].name}</div>
              <div class="mt-0.5 opacity-70">{PROVIDERS[p].runtime}</div>
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-3 italic">{prov.notes}</p>
      </div>

      {/* Parameters */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-semibold">Parameters</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-2">Function Complexity</label>
            <div class="flex gap-2">
              {(['simple', 'medium', 'complex'] as Complexity[]).map(c => (
                <button
                  key={c}
                  onClick={() => setComplexity(c)}
                  class={`flex-1 py-1.5 rounded-lg border text-xs capitalize transition-colors ${
                    complexity === c
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'border-border text-text-muted hover:border-primary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">
              {complexity === 'simple' && 'Response, header read, KV get — no heavy compute'}
              {complexity === 'medium' && 'JSON parse, fetch upstream, light transform'}
              {complexity === 'complex' && 'Multiple fetches, DB query, crypto, large payload'}
            </p>
          </div>
          <div>
            <label class="flex items-center gap-2 text-sm mb-2 cursor-pointer">
              <input
                type="checkbox"
                checked={coldStartEnabled}
                onChange={(e: any) => setColdStartEnabled(e.target.checked)}
                class="rounded"
              />
              <span class="font-medium">Include Cold Start</span>
            </label>
            {coldStartEnabled && (
              <div class="text-xs text-text-muted bg-bg rounded-lg p-2 border border-border">
                <span class="text-yellow-400">~{prov.coldStart.min}–{prov.coldStart.max} ms</span> cold start for {prov.name}
              </div>
            )}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">User Region</label>
            <select
              value={userRegion}
              onChange={(e: any) => setUserRegion(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Edge PoP Region</label>
            <select
              value={edgeRegion}
              onChange={(e: any) => setEdgeRegion(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            >
              {REGIONS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-4">Latency Estimates — {prov.name}</h2>

        {/* Breakdown */}
        <div class="grid grid-cols-3 gap-3 mb-5 text-xs">
          <div class="bg-bg border border-border rounded-lg p-3 text-center">
            <div class="text-text-muted mb-1">Network RTT</div>
            <div class="text-lg font-bold font-mono text-blue-400">{networkRtt} ms</div>
            <div class="text-text-muted mt-1">{userReg.name.split(' ')[0]} → {edgeReg.name.split(' ')[0]}</div>
          </div>
          <div class="bg-bg border border-border rounded-lg p-3 text-center">
            <div class="text-text-muted mb-1">Execution</div>
            <div class="text-lg font-bold font-mono text-green-400">{warmExec} ms</div>
            <div class="text-text-muted mt-1">{complexity} ({coldStartEnabled ? `+${coldStartMs}ms cold` : 'warm'})</div>
          </div>
          <div class="bg-bg border border-border rounded-lg p-3 text-center">
            <div class="text-text-muted mb-1">Total P50</div>
            <div class="text-lg font-bold font-mono text-primary">{totalP50} ms</div>
            <div class="text-text-muted mt-1">median</div>
          </div>
        </div>

        {/* Percentile bars */}
        <div class="space-y-3">
          <div>
            <div class="flex justify-between text-xs text-text-muted mb-1">
              <span>P50 (median)</span>
            </div>
            <LatencyBar value={totalP50} max={maxForBar} color="bg-green-500" />
          </div>
          <div>
            <div class="flex justify-between text-xs text-text-muted mb-1">
              <span>P95 (95th percentile)</span>
            </div>
            <LatencyBar value={totalP95} max={maxForBar} color="bg-yellow-500" />
          </div>
          <div>
            <div class="flex justify-between text-xs text-text-muted mb-1">
              <span>P99 (tail latency)</span>
            </div>
            <LatencyBar value={totalP99} max={maxForBar} color="bg-red-500" />
          </div>
        </div>

        <div class="mt-4 text-xs text-text-muted">
          {prov.pops} PoPs globally · estimates based on typical measurements · actual latency varies
        </div>
      </div>

      {/* Provider comparison */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowComparison(v => !v)}
          class="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold hover:bg-bg/50 transition-colors"
        >
          <span>Provider Comparison Table</span>
          <span class="text-text-muted">{showComparison ? '▲' : '▼'}</span>
        </button>
        {showComparison && (
          <div class="overflow-x-auto border-t border-border">
            <table class="w-full text-xs">
              <thead>
                <tr class="text-text-muted bg-bg border-b border-border">
                  <th class="text-left px-4 py-2">Provider</th>
                  <th class="text-left px-4 py-2">Runtime</th>
                  <th class="text-right px-4 py-2">Cold Start</th>
                  <th class="text-right px-4 py-2">Warm (simple)</th>
                  <th class="text-right px-4 py-2">PoPs</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(PROVIDERS) as [Provider, ProviderData][]).map(([key, p], i) => {
                  const regionRtt = Math.abs(userReg.baseLatencyMs - edgeReg.baseLatencyMs) + 3;
                  const warmTotal = regionRtt + p.warm[complexity];
                  return (
                    <tr key={key} class={`border-b border-border/50 ${key === provider ? 'bg-primary/5' : i % 2 === 0 ? '' : 'bg-bg/40'}`}>
                      <td class="px-4 py-2 font-medium text-text">
                        {key === provider && <span class="text-primary mr-1">→</span>}
                        {p.name}
                      </td>
                      <td class="px-4 py-2 text-text-muted font-mono">{p.runtime}</td>
                      <td class="px-4 py-2 text-right font-mono text-yellow-400">
                        {p.coldStart.min === 0 ? '~0 ms' : `${p.coldStart.min}–${p.coldStart.max} ms`}
                      </td>
                      <td class="px-4 py-2 text-right font-mono text-green-400">{warmTotal} ms</td>
                      <td class="px-4 py-2 text-right font-mono text-text">{p.pops}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note */}
      <div class="bg-yellow-950/20 border border-yellow-800/30 rounded-xl p-4 text-xs text-yellow-300/80">
        <span class="font-medium text-yellow-300">Note: </span>
        These estimates are based on published benchmarks and community measurements. Actual latency depends on network conditions, PoP availability, payload size, upstream calls, and platform load. Always measure in production with real traffic.
      </div>
    </div>
  );
}
