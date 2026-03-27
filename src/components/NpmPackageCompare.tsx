import { useState } from 'preact/hooks';

interface PkgData {
  name: string;
  version: string;
  size: number;
  gzip: number;
  dependencyCount: number;
  description?: string;
  repository?: string;
  downloads?: number;
  stars?: number;
  lastPublish?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function sizeScore(gzip: number): { label: string; color: string } {
  if (gzip < 5 * 1024) return { label: 'Tiny', color: 'text-green-400' };
  if (gzip < 25 * 1024) return { label: 'Small', color: 'text-green-400' };
  if (gzip < 100 * 1024) return { label: 'Medium', color: 'text-yellow-400' };
  if (gzip < 300 * 1024) return { label: 'Large', color: 'text-orange-400' };
  return { label: 'Very Large', color: 'text-red-400' };
}

async function fetchBundle(name: string): Promise<PkgData> {
  const [bundleRes, npmRes] = await Promise.all([
    fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(name)}`),
    fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`),
  ]);
  if (!bundleRes.ok) throw new Error(`Package "${name}" not found on bundlephobia`);
  const bundle = await bundleRes.json();
  let description = '';
  let lastPublish = '';
  if (npmRes.ok) {
    const npm = await npmRes.json();
    description = npm.description || '';
    lastPublish = npm._time || npm.time?.modified || '';
  }
  return {
    name: bundle.name,
    version: bundle.version,
    size: bundle.size,
    gzip: bundle.gzip,
    dependencyCount: bundle.dependencyCount,
    description,
    lastPublish,
  };
}

const POPULAR_PAIRS = [
  ['moment', 'dayjs'],
  ['lodash', 'ramda'],
  ['axios', 'ky'],
  ['react-query', 'swr'],
  ['styled-components', 'emotion'],
];

const StatRow = ({ label, a, b, aWins }: { label: string; a: string; b: string; aWins?: boolean | null }) => (
  <div class="grid grid-cols-3 gap-2 py-2 border-b border-border/50 last:border-0 items-center text-sm">
    <span class="text-center font-mono text-xs {aWins === true ? 'text-green-400 font-semibold' : aWins === false ? 'text-text-muted' : 'text-white'}">{a}</span>
    <span class="text-center text-xs text-text-muted">{label}</span>
    <span class={`text-center font-mono text-xs ${aWins === false ? 'text-green-400 font-semibold' : aWins === true ? 'text-text-muted' : 'text-white'}`}>{b}</span>
  </div>
);

export default function NpmPackageCompare() {
  const [pkgA, setPkgA] = useState('');
  const [pkgB, setPkgB] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultA, setResultA] = useState<PkgData | null>(null);
  const [resultB, setResultB] = useState<PkgData | null>(null);
  const [error, setError] = useState('');

  async function compare(a = pkgA.trim(), b = pkgB.trim()) {
    if (!a || !b) return;
    setLoading(true);
    setError('');
    setResultA(null);
    setResultB(null);
    try {
      const [da, db] = await Promise.all([fetchBundle(a), fetchBundle(b)]);
      setResultA(da);
      setResultB(db);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function loadPair(pair: string[]) {
    setPkgA(pair[0]);
    setPkgB(pair[1]);
    compare(pair[0], pair[1]);
  }

  const sizeAWins = resultA && resultB ? resultA.gzip < resultB.gzip : null;
  const depAWins = resultA && resultB ? resultA.dependencyCount < resultB.dependencyCount : null;

  return (
    <div class="space-y-4">
      <div class="flex gap-3 flex-wrap">
        <div class="flex-1 min-w-32">
          <label class="text-xs text-text-muted block mb-1">Package A</label>
          <input
            type="text"
            value={pkgA}
            onInput={e => setPkgA((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && compare()}
            placeholder="e.g. moment"
            class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
          />
        </div>
        <div class="flex-1 min-w-32">
          <label class="text-xs text-text-muted block mb-1">Package B</label>
          <input
            type="text"
            value={pkgB}
            onInput={e => setPkgB((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && compare()}
            placeholder="e.g. dayjs"
            class="w-full bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
          />
        </div>
        <div class="pt-5">
          <button
            onClick={() => compare()}
            disabled={loading || !pkgA.trim() || !pkgB.trim()}
            class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded px-4 py-2 text-sm font-medium transition-colors"
          >
            {loading ? 'Loading…' : 'Compare'}
          </button>
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <span class="text-xs text-text-muted">Popular comparisons:</span>
        {POPULAR_PAIRS.map(pair => (
          <button
            key={pair.join('+')}
            onClick={() => loadPair(pair)}
            class="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            {pair[0]} vs {pair[1]}
          </button>
        ))}
      </div>

      {error && (
        <div class="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-400 text-sm">{error}</div>
      )}

      {resultA && resultB && (
        <div class="space-y-4">
          {/* Header */}
          <div class="grid grid-cols-3 gap-2 bg-surface rounded p-3 border border-border">
            <div class="text-center">
              <p class="font-bold text-white">{resultA.name}</p>
              <p class="text-xs text-text-muted">v{resultA.version}</p>
              {resultA.description && <p class="text-xs text-text-muted mt-1 line-clamp-2">{resultA.description}</p>}
            </div>
            <div class="text-center flex items-center justify-center">
              <span class="text-text-muted text-sm">vs</span>
            </div>
            <div class="text-center">
              <p class="font-bold text-white">{resultB.name}</p>
              <p class="text-xs text-text-muted">v{resultB.version}</p>
              {resultB.description && <p class="text-xs text-text-muted mt-1 line-clamp-2">{resultB.description}</p>}
            </div>
          </div>

          {/* Comparison Table */}
          <div class="bg-surface rounded border border-border p-4">
            <div class="grid grid-cols-3 gap-2 pb-2 mb-2 border-b border-border">
              <span class="text-center text-xs font-semibold text-blue-400">{resultA.name}</span>
              <span class="text-center text-xs text-text-muted">Metric</span>
              <span class="text-center text-xs font-semibold text-purple-400">{resultB.name}</span>
            </div>
            <StatRow label="Min size" a={formatBytes(resultA.size)} b={formatBytes(resultB.size)} aWins={resultA.size < resultB.size} />
            <StatRow label="Gzipped size" a={formatBytes(resultA.gzip)} b={formatBytes(resultB.gzip)} aWins={resultA.gzip < resultB.gzip} />
            <StatRow label="Size rating" a={sizeScore(resultA.gzip).label} b={sizeScore(resultB.gzip).label} aWins={sizeAWins} />
            <StatRow label="Dependencies" a={String(resultA.dependencyCount)} b={String(resultB.dependencyCount)} aWins={depAWins} />
          </div>

          {/* Winner */}
          {sizeAWins !== null && (
            <div class="bg-green-900/20 border border-green-500/30 rounded p-4">
              <p class="text-green-400 font-semibold text-sm">
                {sizeAWins ? resultA.name : resultB.name} is smaller by {formatBytes(Math.abs(resultA.gzip - resultB.gzip))} gzipped
                {' '}({Math.round(Math.abs(1 - (sizeAWins ? resultA.gzip / resultB.gzip : resultB.gzip / resultA.gzip)) * 100)}% smaller)
              </p>
              <p class="text-xs text-text-muted mt-1">
                Smaller bundle = faster load time. For reference, every 1 kB of JS takes ~1ms extra parse time on mid-range mobile.
              </p>
            </div>
          )}

          <div class="text-xs text-text-muted">
            Bundle sizes from <a href="https://bundlephobia.com" target="_blank" rel="noopener noreferrer" class="text-blue-400 underline">bundlephobia.com</a>. Reflects minified (not tree-shaken) size for the entire package.
          </div>
        </div>
      )}

      {!resultA && !error && !loading && (
        <div class="text-center py-8 text-text-muted text-sm">
          Enter two npm package names to compare their bundle size, dependencies, and download stats.
        </div>
      )}
    </div>
  );
}
