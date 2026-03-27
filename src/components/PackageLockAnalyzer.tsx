import { useState } from 'preact/hooks';

interface DepInfo {
  name: string;
  version: string;
  isDirect: boolean;
  isDevOnly: boolean;
  license?: string;
  size?: string;
}

interface DuplicateGroup {
  name: string;
  versions: string[];
  count: number;
}

interface AnalysisResult {
  totalDeps: number;
  directDeps: number;
  transitiveDeps: number;
  devOnlyDeps: number;
  duplicates: DuplicateGroup[];
  deps: DepInfo[];
  topDeps: DepInfo[];
  lockfileVersion: number;
  estimatedSize: string;
  licenseGroups: Record<string, number>;
}

const KNOWN_LICENSES: Record<string, string> = {
  react: 'MIT', lodash: 'MIT', express: 'MIT', typescript: 'Apache-2.0',
  webpack: 'MIT', babel: 'MIT', eslint: 'MIT', jest: 'MIT',
  axios: 'MIT', chalk: 'MIT', commander: 'MIT', debug: 'MIT',
  dotenv: 'BSD-2-Clause', uuid: 'MIT', moment: 'MIT', 'date-fns': 'MIT',
  zod: 'MIT', 'vite': 'MIT', 'astro': 'MIT', 'next': 'MIT',
  'tailwindcss': 'MIT', 'prettier': 'MIT', 'rollup': 'MIT',
  'esbuild': 'MIT', 'postcss': 'MIT', 'autoprefixer': 'MIT',
};

const KNOWN_SIZES: Record<string, string> = {
  react: '6.9 kB', lodash: '72 kB', express: '57 kB', typescript: '20 MB',
  webpack: '5.3 MB', 'next': '30 MB', 'tailwindcss': '2.8 MB',
  axios: '13 kB', moment: '2.1 MB', 'date-fns': '8.3 MB',
};

function estimateBundleSize(deps: string[]): string {
  let kb = 0;
  for (const d of deps) {
    if (KNOWN_SIZES[d]) {
      const s = KNOWN_SIZES[d];
      if (s.includes('MB')) kb += parseFloat(s) * 1024;
      else kb += parseFloat(s);
    } else {
      kb += 15; // avg estimate per unknown package
    }
  }
  return kb > 1024 ? `~${(kb / 1024).toFixed(1)} MB` : `~${Math.round(kb)} kB`;
}

function parseLockV3(data: Record<string, unknown>): AnalysisResult {
  const packages = (data.packages || {}) as Record<string, Record<string, unknown>>;
  const rootPkg = (packages[''] || {}) as Record<string, unknown>;
  const directDeps = new Set<string>([
    ...Object.keys((rootPkg.dependencies || {}) as Record<string, unknown>),
    ...Object.keys((rootPkg.optionalDependencies || {}) as Record<string, unknown>),
  ]);
  const directDevDeps = new Set<string>(
    Object.keys((rootPkg.devDependencies || {}) as Record<string, unknown>)
  );

  const allEntries = Object.entries(packages).filter(([k]) => k !== '');
  const depMap: Record<string, string[]> = {};
  const depInfos: DepInfo[] = [];

  for (const [rawKey, pkg] of allEntries) {
    // node_modules/foo or node_modules/@scope/foo
    const nameMatch = rawKey.match(/node_modules\/(.+)$/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const version = (pkg.version as string) || '?';
    const isDev = !!(pkg.dev as boolean);
    const isDirect = directDeps.has(name) || directDevDeps.has(name);

    if (!depMap[name]) depMap[name] = [];
    if (!depMap[name].includes(version)) depMap[name].push(version);

    depInfos.push({
      name,
      version,
      isDirect,
      isDevOnly: isDev,
      license: KNOWN_LICENSES[name.replace('@types/', '')] || (pkg.license as string) || undefined,
      size: KNOWN_SIZES[name],
    });
  }

  const duplicates: DuplicateGroup[] = Object.entries(depMap)
    .filter(([, versions]) => versions.length > 1)
    .map(([name, versions]) => ({ name, versions, count: versions.length }))
    .sort((a, b) => b.count - a.count);

  const licenseGroups: Record<string, number> = {};
  for (const d of depInfos) {
    const lic = d.license || 'Unknown';
    licenseGroups[lic] = (licenseGroups[lic] || 0) + 1;
  }

  const directCount = depInfos.filter(d => d.isDirect).length;
  const topDeps = depInfos.filter(d => d.isDirect).slice(0, 20);

  return {
    totalDeps: allEntries.length,
    directDeps: directCount,
    transitiveDeps: allEntries.length - directCount,
    devOnlyDeps: depInfos.filter(d => d.isDevOnly).length,
    duplicates,
    deps: depInfos.slice(0, 100),
    topDeps,
    lockfileVersion: (data.lockfileVersion as number) || 3,
    estimatedSize: estimateBundleSize(depInfos.filter(d => !d.isDevOnly).map(d => d.name)),
    licenseGroups,
  };
}

function analyzePackageLock(raw: string): AnalysisResult {
  const data = JSON.parse(raw) as Record<string, unknown>;
  const version = (data.lockfileVersion as number) || 1;
  if (version >= 2) return parseLockV3(data);

  // v1 fallback
  const deps = (data.dependencies || {}) as Record<string, Record<string, unknown>>;
  const depInfos: DepInfo[] = Object.entries(deps).map(([name, pkg]) => ({
    name,
    version: (pkg.version as string) || '?',
    isDirect: !(pkg.extraneous as boolean),
    isDevOnly: !!(pkg.dev as boolean),
    license: KNOWN_LICENSES[name],
    size: KNOWN_SIZES[name],
  }));

  const licenseGroups: Record<string, number> = {};
  for (const d of depInfos) {
    const lic = d.license || 'Unknown';
    licenseGroups[lic] = (licenseGroups[lic] || 0) + 1;
  }

  return {
    totalDeps: depInfos.length,
    directDeps: depInfos.filter(d => d.isDirect).length,
    transitiveDeps: depInfos.filter(d => !d.isDirect).length,
    devOnlyDeps: depInfos.filter(d => d.isDevOnly).length,
    duplicates: [],
    deps: depInfos.slice(0, 100),
    topDeps: depInfos.filter(d => d.isDirect).slice(0, 20),
    lockfileVersion: 1,
    estimatedSize: estimateBundleSize(depInfos.filter(d => !d.isDevOnly).map(d => d.name)),
    licenseGroups,
  };
}

const EXAMPLE_LOCK = JSON.stringify({
  name: 'my-app',
  version: '1.0.0',
  lockfileVersion: 3,
  requires: true,
  packages: {
    '': {
      name: 'my-app',
      version: '1.0.0',
      dependencies: { react: '^18.0.0', axios: '^1.0.0', lodash: '^4.17.0' },
      devDependencies: { typescript: '^5.0.0', jest: '^29.0.0' },
    },
    'node_modules/react': { version: '18.2.0', resolved: 'https://registry.npmjs.org/react/-/react-18.2.0.tgz' },
    'node_modules/react-dom': { version: '18.2.0', dev: false },
    'node_modules/axios': { version: '1.6.0' },
    'node_modules/lodash': { version: '4.17.21' },
    'node_modules/typescript': { version: '5.3.3', dev: true },
    'node_modules/jest': { version: '29.7.0', dev: true },
    'node_modules/scheduler': { version: '0.23.0' },
    'node_modules/js-tokens': { version: '4.0.0' },
    'node_modules/loose-envify': { version: '1.4.0' },
    'node_modules/follow-redirects': { version: '1.15.4' },
    'node_modules/form-data': { version: '4.0.0' },
    'node_modules/proxy-from-env': { version: '1.1.0' },
  },
}, null, 2);

export default function PackageLockAnalyzer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'deps' | 'duplicates' | 'licenses'>('overview');

  const handleAnalyze = () => {
    setError('');
    try {
      const res = analyzePackageLock(input);
      setResult(res);
      setActiveTab('overview');
    } catch (e) {
      setError(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
      setResult(null);
    }
  };

  const handleExample = () => {
    setInput(EXAMPLE_LOCK);
    setResult(null);
    setError('');
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'deps', label: `Direct Deps (${result?.directDeps ?? 0})` },
    { id: 'duplicates', label: `Duplicates (${result?.duplicates.length ?? 0})` },
    { id: 'licenses', label: 'Licenses' },
  ] as const;

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Paste package-lock.json</label>
          <button onClick={handleExample} class="text-xs text-accent hover:underline">Load example</button>
        </div>
        <textarea
          class="w-full h-48 bg-surface border border-border rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:border-accent"
          placeholder='{"lockfileVersion": 3, "packages": {...}}'
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setResult(null); setError(''); }}
          spellcheck={false}
        />
      </div>

      <button
        onClick={handleAnalyze}
        disabled={!input.trim()}
        class="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Analyze
      </button>

      {error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm font-mono">{error}</div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Stat cards */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total packages', value: result.totalDeps, color: 'text-accent' },
              { label: 'Direct deps', value: result.directDeps, color: 'text-green-400' },
              { label: 'Transitive', value: result.transitiveDeps, color: 'text-text-muted' },
              { label: 'Dev only', value: result.devOnlyDeps, color: 'text-yellow-400' },
            ].map(stat => (
              <div key={stat.label} class="bg-surface border border-border rounded-lg p-3 text-center">
                <div class={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                <div class="text-xs text-text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div class="flex items-center gap-4 flex-wrap text-sm text-text-muted bg-surface border border-border rounded-lg p-3">
            <span>Lockfile v{result.lockfileVersion}</span>
            <span>·</span>
            <span>Estimated production bundle: <strong class="text-text">{result.estimatedSize}</strong></span>
            {result.duplicates.length > 0 && (
              <>
                <span>·</span>
                <span class="text-yellow-400">{result.duplicates.length} duplicate packages</span>
              </>
            )}
          </div>

          {/* Tabs */}
          <div class="flex gap-1 border-b border-border">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                class={`px-3 py-2 text-sm transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'overview' && (
            <div class="space-y-3">
              <h3 class="text-sm font-semibold">Top Direct Dependencies</h3>
              <div class="space-y-1.5">
                {result.topDeps.length === 0 && <p class="text-sm text-text-muted">No direct dependencies detected.</p>}
                {result.topDeps.map(dep => (
                  <div key={dep.name} class="flex items-center justify-between bg-surface border border-border rounded px-3 py-2 text-sm">
                    <div class="flex items-center gap-2 min-w-0">
                      <span class="font-mono text-accent truncate">{dep.name}</span>
                      {dep.isDevOnly && <span class="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded shrink-0">dev</span>}
                    </div>
                    <div class="flex items-center gap-3 shrink-0 ml-3">
                      <span class="text-text-muted font-mono text-xs">{dep.version}</span>
                      {dep.size && <span class="text-text-muted text-xs">{dep.size}</span>}
                      {dep.license && <span class="text-xs text-blue-400">{dep.license}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'deps' && (
            <div class="space-y-1.5 max-h-80 overflow-y-auto">
              {result.deps.filter(d => d.isDirect).map(dep => (
                <div key={`${dep.name}@${dep.version}`} class="flex items-center justify-between bg-surface border border-border rounded px-3 py-2 text-sm">
                  <span class="font-mono text-accent">{dep.name}</span>
                  <div class="flex items-center gap-3">
                    <span class="text-text-muted font-mono text-xs">{dep.version}</span>
                    {dep.isDevOnly && <span class="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded">dev</span>}
                    {dep.license && <span class="text-xs text-blue-400">{dep.license}</span>}
                  </div>
                </div>
              ))}
              {result.deps.filter(d => d.isDirect).length === 0 && (
                <p class="text-sm text-text-muted">Could not detect direct deps from this lockfile format.</p>
              )}
            </div>
          )}

          {activeTab === 'duplicates' && (
            <div class="space-y-2">
              {result.duplicates.length === 0 && (
                <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
                  ✓ No duplicate packages found!
                </div>
              )}
              {result.duplicates.map(dup => (
                <div key={dup.name} class="bg-surface border border-yellow-500/30 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-mono text-accent text-sm">{dup.name}</span>
                    <span class="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">{dup.count} versions</span>
                  </div>
                  <div class="flex gap-2 flex-wrap">
                    {dup.versions.map(v => (
                      <span key={v} class="text-xs font-mono bg-bg px-2 py-0.5 rounded border border-border text-text-muted">{v}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'licenses' && (
            <div class="space-y-2">
              {Object.entries(result.licenseGroups)
                .sort((a, b) => b[1] - a[1])
                .map(([license, count]) => (
                  <div key={license} class="flex items-center gap-3 bg-surface border border-border rounded px-3 py-2">
                    <span class="text-sm text-blue-400 flex-1">{license}</span>
                    <div class="flex-1 bg-bg rounded-full h-2 overflow-hidden">
                      <div
                        class="h-full bg-accent rounded-full"
                        style={{ width: `${Math.round((count / result.totalDeps) * 100)}%` }}
                      />
                    </div>
                    <span class="text-sm text-text-muted w-8 text-right">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
