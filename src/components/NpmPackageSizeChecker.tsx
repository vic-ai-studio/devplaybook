import { useState } from 'preact/hooks';

interface BundleResult {
  name: string;
  version: string;
  size: number;
  gzip: number;
  dependencyCount: number;
  description?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function sizeLabel(gzip: number): { label: string; color: string } {
  if (gzip < 5 * 1024) return { label: 'Tiny', color: 'text-green-400' };
  if (gzip < 25 * 1024) return { label: 'Small', color: 'text-green-400' };
  if (gzip < 100 * 1024) return { label: 'Medium', color: 'text-yellow-400' };
  if (gzip < 300 * 1024) return { label: 'Large', color: 'text-orange-400' };
  return { label: 'Very Large', color: 'text-red-400' };
}

const POPULAR = ['lodash', 'axios', 'react', 'moment', 'dayjs', 'uuid', 'zod', 'date-fns', 'ramda', 'rxjs'];

export default function NpmPackageSizeChecker() {
  const [pkg, setPkg] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BundleResult | null>(null);
  const [error, setError] = useState('');

  const check = async (name = pkg.trim()) => {
    if (!name) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(name)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error?.message || `Package "${name}" not found`);
      }
      const data = await res.json();
      setResult({
        name: data.name,
        version: data.version,
        size: data.size,
        gzip: data.gzip,
        dependencyCount: data.dependencyCount,
        description: data.description,
      });
      setPkg(name);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch package info');
    } finally {
      setLoading(false);
    }
  };

  const { label, color } = result ? sizeLabel(result.gzip) : { label: '', color: '' };
  const pct = result ? Math.min(100, (result.gzip / (300 * 1024)) * 100) : 0;
  const barColor = result ? (pct < 20 ? 'bg-green-500' : pct < 50 ? 'bg-yellow-500' : pct < 80 ? 'bg-orange-500' : 'bg-red-500') : '';

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Check npm Package Size</h2>
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="e.g. lodash, axios@0.21.0, react"
            value={pkg}
            onInput={(e: any) => setPkg(e.target.value)}
            onKeyDown={(e: any) => e.key === 'Enter' && check()}
            class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => check()}
            disabled={loading || !pkg.trim()}
            class="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
          >
            {loading ? 'Checking…' : 'Check Size'}
          </button>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span class="text-xs text-text-muted">Popular:</span>
          {POPULAR.map(p => (
            <button
              key={p}
              onClick={() => { setPkg(p); check(p); }}
              class="text-xs px-2 py-0.5 rounded border border-border text-text-muted hover:text-white hover:border-primary transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-900/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Result */}
      {result && (
        <div class="bg-bg-card border border-border rounded-xl p-5 space-y-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-bold">{result.name} <span class="text-text-muted text-sm font-normal">v{result.version}</span></h2>
              {result.description && <p class="text-text-muted text-sm mt-1">{result.description}</p>}
            </div>
            <span class={`text-sm font-semibold px-3 py-1 rounded-full bg-bg border border-border ${color}`}>{label}</span>
          </div>

          {/* Size bar */}
          <div>
            <div class="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Bundle size (gzipped)</span>
              <span class={`font-semibold ${color}`}>{formatBytes(result.gzip)}</span>
            </div>
            <div class="bg-bg rounded-full h-2 overflow-hidden">
              <div class={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
            <div class="flex justify-between text-xs text-text-muted mt-1">
              <span>0</span><span>300 kB</span>
            </div>
          </div>

          {/* Stats grid */}
          <div class="grid grid-cols-3 gap-3">
            {[
              { label: 'Minified', value: formatBytes(result.size) },
              { label: 'Gzipped', value: formatBytes(result.gzip) },
              { label: 'Dependencies', value: String(result.dependencyCount) },
            ].map(s => (
              <div key={s.label} class="bg-bg rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-white">{s.value}</div>
                <div class="text-xs text-text-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Download time estimates */}
          <div>
            <h3 class="text-xs text-text-muted uppercase tracking-wider mb-2">Download time estimates</h3>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { net: '2G (50 kbps)', time: (result.gzip * 8) / (50 * 1024) },
                { net: '3G (1.5 Mbps)', time: (result.gzip * 8) / (1.5 * 1024 * 1024) },
                { net: '4G (20 Mbps)', time: (result.gzip * 8) / (20 * 1024 * 1024) },
                { net: 'WiFi (50 Mbps)', time: (result.gzip * 8) / (50 * 1024 * 1024) },
              ].map(({ net, time }) => (
                <div key={net} class="bg-bg rounded-lg p-3 text-center">
                  <div class="text-sm font-semibold text-white">
                    {time < 0.01 ? '<0.01s' : time < 1 ? `${time.toFixed(2)}s` : `${time.toFixed(1)}s`}
                  </div>
                  <div class="text-xs text-text-muted mt-0.5">{net}</div>
                </div>
              ))}
            </div>
          </div>

          <p class="text-xs text-text-muted">Data via <a href="https://bundlephobia.com" target="_blank" rel="noopener" class="underline">Bundlephobia</a>. Sizes shown for the minified + gzipped bundle.</p>
        </div>
      )}
    </div>
  );
}
