import { useState, useCallback } from 'preact/hooks';

interface PackageSize {
  name: string;
  gzip: number;
  loading: boolean;
  error: string;
}

interface BundlePackage {
  id: string;
  name: string;
  treeshakeable: boolean;
  partial: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function loadTimeSec(gzip: number, speedMbps: number): string {
  const bytes = gzip;
  const seconds = (bytes * 8) / (speedMbps * 1_000_000);
  return seconds < 0.1 ? '<0.1s' : `${seconds.toFixed(1)}s`;
}

function sizeColor(gzip: number): string {
  if (gzip < 50 * 1024) return 'text-green-400';
  if (gzip < 150 * 1024) return 'text-yellow-400';
  if (gzip < 300 * 1024) return 'text-orange-400';
  return 'text-red-400';
}

const PRESETS: { label: string; packages: string[] }[] = [
  { label: 'React App', packages: ['react', 'react-dom', 'react-router-dom'] },
  { label: 'Vue App', packages: ['vue', 'vue-router', 'pinia'] },
  { label: 'Data Layer', packages: ['axios', 'react-query', 'zod'] },
  { label: 'UI Kit', packages: ['@mui/material', '@emotion/react', '@emotion/styled'] },
  { label: 'Date Utils', packages: ['dayjs', 'date-fns'] },
];

const TIPS: { threshold: number; tip: string }[] = [
  { threshold: 50 * 1024, tip: 'Great bundle size! Consider tree-shaking and dynamic imports to maintain this as you scale.' },
  { threshold: 150 * 1024, tip: 'Moderate size. Consider replacing moment.js with dayjs, lodash with lodash-es, or MUI with a lighter component library.' },
  { threshold: 300 * 1024, tip: 'Large bundle. Use dynamic import() for routes, switch to lighter alternatives, and enable bundle analysis (webpack-bundle-analyzer).' },
  { threshold: Infinity, tip: 'Very large bundle — likely impacting Core Web Vitals (LCP). Aggressively code-split, lazy-load below-the-fold content, and audit for duplicate packages.' },
];

let nextId = 1;
function makeId() { return `pkg_${nextId++}`; }

const TREE_SHAKE_FACTOR = 0.6; // approximate savings from tree-shaking

export default function WebpackBundleEstimator() {
  const [packages, setPackages] = useState<BundlePackage[]>([
    { id: makeId(), name: 'react', treeshakeable: false, partial: false },
    { id: makeId(), name: 'react-dom', treeshakeable: false, partial: false },
  ]);
  const [newPkg, setNewPkg] = useState('');
  const [sizes, setSizes] = useState<Record<string, PackageSize>>({});
  const [loading, setLoading] = useState(false);

  async function fetchSize(name: string): Promise<{ gzip: number } | null> {
    try {
      const res = await fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(name)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return { gzip: data.gzip };
    } catch {
      return null;
    }
  }

  async function estimateAll(pkgs: BundlePackage[]) {
    setLoading(true);
    const results: Record<string, PackageSize> = {};
    await Promise.all(
      pkgs.map(async pkg => {
        if (pkg.name.trim()) {
          const data = await fetchSize(pkg.name.trim());
          results[pkg.id] = {
            name: pkg.name,
            gzip: data?.gzip ?? 0,
            loading: false,
            error: data ? '' : `"${pkg.name}" not found`,
          };
        }
      })
    );
    setSizes(results);
    setLoading(false);
  }

  function addPackage() {
    const name = newPkg.trim();
    if (!name) return;
    const newEntry: BundlePackage = { id: makeId(), name, treeshakeable: false, partial: false };
    const updated = [...packages, newEntry];
    setPackages(updated);
    setNewPkg('');
  }

  function removePackage(id: string) {
    setPackages(prev => prev.filter(p => p.id !== id));
    setSizes(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function toggleProp(id: string, prop: 'treeshakeable' | 'partial') {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [prop]: !p[prop] } : p));
  }

  function loadPreset(preset: { packages: string[] }) {
    const pkgs = preset.packages.map(name => ({ id: makeId(), name, treeshakeable: false, partial: false }));
    setPackages(pkgs);
    setSizes({});
  }

  const totalGzip = packages.reduce((sum, pkg) => {
    const s = sizes[pkg.id];
    if (!s || s.error) return sum;
    let size = s.gzip;
    if (pkg.treeshakeable) size = Math.round(size * TREE_SHAKE_FACTOR);
    if (pkg.partial) size = Math.round(size * 0.3);
    return sum + size;
  }, 0);

  const tip = TIPS.find(t => totalGzip < t.threshold);
  const hasResults = Object.keys(sizes).length > 0;

  return (
    <div class="space-y-4">
      {/* Presets */}
      <div class="flex gap-2 flex-wrap items-center">
        <span class="text-xs text-text-muted">Quick preset:</span>
        {PRESETS.map(preset => (
          <button
            key={preset.label}
            onClick={() => loadPreset(preset)}
            class="text-xs bg-surface border border-border rounded px-2 py-1 text-text-muted hover:text-white hover:border-blue-500 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Package List */}
      <div class="space-y-2">
        {packages.map(pkg => (
          <div key={pkg.id} class="flex items-center gap-2 bg-surface rounded border border-border p-2">
            <input
              type="text"
              value={pkg.name}
              onInput={e => {
                const name = (e.target as HTMLInputElement).value;
                setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, name } : p));
              }}
              class="flex-1 bg-transparent font-mono text-sm text-white focus:outline-none min-w-0"
              placeholder="package-name"
            />
            <label class="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={pkg.treeshakeable} onChange={() => toggleProp(pkg.id, 'treeshakeable')} />
              Tree-shake (~40% off)
            </label>
            <label class="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap cursor-pointer">
              <input type="checkbox" checked={pkg.partial} onChange={() => toggleProp(pkg.id, 'partial')} />
              Partial import (~70% off)
            </label>
            {sizes[pkg.id] && !sizes[pkg.id].error && (
              <span class={`text-xs font-mono ${sizeColor(sizes[pkg.id].gzip)} whitespace-nowrap`}>
                {formatBytes(sizes[pkg.id].gzip)}
              </span>
            )}
            {sizes[pkg.id]?.error && (
              <span class="text-xs text-red-400 whitespace-nowrap">not found</span>
            )}
            <button onClick={() => removePackage(pkg.id)} class="text-text-muted hover:text-red-400 text-xs shrink-0">✕</button>
          </div>
        ))}
      </div>

      {/* Add Package */}
      <div class="flex gap-2">
        <input
          type="text"
          value={newPkg}
          onInput={e => setNewPkg((e.target as HTMLInputElement).value)}
          onKeyDown={e => e.key === 'Enter' && addPackage()}
          placeholder="Add package (e.g. lodash)"
          class="flex-1 bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
        />
        <button onClick={addPackage} class="bg-surface border border-border hover:border-blue-500 text-white rounded px-3 py-2 text-sm transition-colors">+</button>
        <button
          onClick={() => estimateAll(packages)}
          disabled={loading || packages.length === 0}
          class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? 'Loading…' : 'Estimate Bundle'}
        </button>
      </div>

      {/* Results */}
      {hasResults && (
        <div class="space-y-4">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-surface rounded border border-border p-4 text-center">
              <p class={`text-2xl font-bold ${sizeColor(totalGzip)}`}>{formatBytes(totalGzip)}</p>
              <p class="text-xs text-text-muted mt-1">Total gzipped</p>
            </div>
            <div class="bg-surface rounded border border-border p-4 text-center">
              <p class="text-2xl font-bold text-white">{loadTimeSec(totalGzip, 1)}</p>
              <p class="text-xs text-text-muted mt-1">3G (1 Mbps)</p>
            </div>
            <div class="bg-surface rounded border border-border p-4 text-center">
              <p class="text-2xl font-bold text-white">{loadTimeSec(totalGzip, 10)}</p>
              <p class="text-xs text-text-muted mt-1">4G (10 Mbps)</p>
            </div>
            <div class="bg-surface rounded border border-border p-4 text-center">
              <p class="text-2xl font-bold text-white">{loadTimeSec(totalGzip, 100)}</p>
              <p class="text-xs text-text-muted mt-1">WiFi (100 Mbps)</p>
            </div>
          </div>

          {tip && (
            <div class={`rounded p-3 border text-sm ${totalGzip < 50 * 1024 ? 'bg-green-900/20 border-green-500/30 text-green-300' : totalGzip < 150 * 1024 ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>
              <p class="font-semibold mb-0.5">Tip</p>
              <p class="text-xs">{tip.tip}</p>
            </div>
          )}

          <div class="bg-surface rounded border border-border p-4">
            <h3 class="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">Package Breakdown</h3>
            <div class="space-y-1">
              {packages.map(pkg => {
                const s = sizes[pkg.id];
                if (!s || s.error) return null;
                let adjusted = s.gzip;
                if (pkg.treeshakeable) adjusted = Math.round(adjusted * TREE_SHAKE_FACTOR);
                if (pkg.partial) adjusted = Math.round(adjusted * 0.3);
                const pct = totalGzip > 0 ? Math.round((adjusted / totalGzip) * 100) : 0;
                return (
                  <div key={pkg.id} class="flex items-center gap-2">
                    <span class="font-mono text-xs text-white min-w-32 truncate">{pkg.name}</span>
                    <div class="flex-1 h-2 bg-[#1a1a2e] rounded overflow-hidden">
                      <div class="h-full bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span class={`text-xs font-mono min-w-16 text-right ${sizeColor(adjusted)}`}>{formatBytes(adjusted)}</span>
                    <span class="text-xs text-text-muted min-w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p class="text-xs text-text-muted">
            Sizes from <a href="https://bundlephobia.com" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">bundlephobia.com</a>.
            Tree-shaking and partial import savings are estimates — actual savings depend on your build config.
          </p>
        </div>
      )}
    </div>
  );
}
