import { useState } from 'preact/hooks';

type Framework = 'nextjs' | 'astro' | 'vite' | 'sveltekit' | 'remix' | 'static';

interface RewriteRule {
  id: number;
  source: string;
  destination: string;
}

interface HeaderRule {
  id: number;
  source: string;
  key: string;
  value: string;
}

const REGIONS = ['iad1', 'sfo1', 'lhr1', 'cdg1', 'sin1', 'hnd1'];

const FRAMEWORK_DEFAULTS: Record<Framework, { buildCommand: string; outputDirectory: string; installCommand: string }> = {
  nextjs: { buildCommand: 'next build', outputDirectory: '.next', installCommand: 'npm install' },
  astro: { buildCommand: 'astro build', outputDirectory: 'dist', installCommand: 'npm install' },
  vite: { buildCommand: 'vite build', outputDirectory: 'dist', installCommand: 'npm install' },
  sveltekit: { buildCommand: 'vite build', outputDirectory: '.svelte-kit/output', installCommand: 'npm install' },
  remix: { buildCommand: 'remix build', outputDirectory: 'build', installCommand: 'npm install' },
  static: { buildCommand: '', outputDirectory: 'public', installCommand: '' },
};

let nextId = 1;

export default function VercelConfigGenerator() {
  const [framework, setFramework] = useState<Framework>('nextjs');
  const [buildCommand, setBuildCommand] = useState(FRAMEWORK_DEFAULTS.nextjs.buildCommand);
  const [outputDirectory, setOutputDirectory] = useState(FRAMEWORK_DEFAULTS.nextjs.outputDirectory);
  const [installCommand, setInstallCommand] = useState(FRAMEWORK_DEFAULTS.nextjs.installCommand);
  const [rewrites, setRewrites] = useState<RewriteRule[]>([]);
  const [headers, setHeaders] = useState<HeaderRule[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['iad1']);
  const [maxDuration, setMaxDuration] = useState(10);
  const [memory, setMemory] = useState(1024);
  const [copied, setCopied] = useState(false);

  function handleFrameworkChange(fw: Framework) {
    setFramework(fw);
    const d = FRAMEWORK_DEFAULTS[fw];
    setBuildCommand(d.buildCommand);
    setOutputDirectory(d.outputDirectory);
    setInstallCommand(d.installCommand);
  }

  function addRewrite() {
    setRewrites(r => [...r, { id: nextId++, source: '/api/:path*', destination: 'https://api.example.com/:path*' }]);
  }

  function removeRewrite(id: number) {
    setRewrites(r => r.filter(x => x.id !== id));
  }

  function updateRewrite(id: number, field: 'source' | 'destination', value: string) {
    setRewrites(r => r.map(x => x.id === id ? { ...x, [field]: value } : x));
  }

  function addHeader() {
    setHeaders(h => [...h, { id: nextId++, source: '/(.*)', key: 'X-Content-Type-Options', value: 'nosniff' }]);
  }

  function removeHeader(id: number) {
    setHeaders(h => h.filter(x => x.id !== id));
  }

  function updateHeader(id: number, field: 'source' | 'key' | 'value', value: string) {
    setHeaders(h => h.map(x => x.id === id ? { ...x, [field]: value } : x));
  }

  function toggleRegion(r: string) {
    setSelectedRegions(prev =>
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  }

  function generateConfig(): object {
    const config: Record<string, unknown> = {};

    // Build settings
    const build: Record<string, string> = {};
    if (buildCommand) build.command = buildCommand;
    if (outputDirectory) build.output = outputDirectory;
    if (installCommand) build.env = {};
    if (Object.keys(build).length > 0 || installCommand) {
      config.buildCommand = buildCommand || undefined;
      config.outputDirectory = outputDirectory || undefined;
      if (installCommand) config.installCommand = installCommand;
    }

    // Rewrites
    if (rewrites.length > 0) {
      config.rewrites = rewrites.map(r => ({ source: r.source, destination: r.destination }));
    }

    // Headers
    if (headers.length > 0) {
      // Group headers by source
      const grouped: Record<string, { key: string; value: string }[]> = {};
      for (const h of headers) {
        if (!grouped[h.source]) grouped[h.source] = [];
        grouped[h.source].push({ key: h.key, value: h.value });
      }
      config.headers = Object.entries(grouped).map(([source, hdrs]) => ({
        source,
        headers: hdrs,
      }));
    }

    // Functions
    config.functions = {
      'api/**': {
        maxDuration,
        memory,
        regions: selectedRegions,
      },
    };

    return config;
  }

  function generateJson(): string {
    return JSON.stringify(generateConfig(), null, 2);
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateJson()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const output = generateJson();

  return (
    <div class="space-y-6">
      {/* Framework */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-4">Framework</h2>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(['nextjs', 'astro', 'vite', 'sveltekit', 'remix', 'static'] as Framework[]).map(fw => (
            <button
              key={fw}
              onClick={() => handleFrameworkChange(fw)}
              class={`py-2 px-3 rounded text-sm font-medium border transition-colors ${
                framework === fw
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              {fw === 'nextjs' ? 'Next.js' : fw === 'sveltekit' ? 'SvelteKit' : fw.charAt(0).toUpperCase() + fw.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Build Settings */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-4">Build Settings</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm text-text-muted mb-1">Build Command</label>
            <input
              type="text"
              value={buildCommand}
              onInput={(e) => setBuildCommand((e.target as HTMLInputElement).value)}
              placeholder="e.g. npm run build"
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Output Directory</label>
            <input
              type="text"
              value={outputDirectory}
              onInput={(e) => setOutputDirectory((e.target as HTMLInputElement).value)}
              placeholder="e.g. dist"
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Install Command</label>
            <input
              type="text"
              value={installCommand}
              onInput={(e) => setInstallCommand((e.target as HTMLInputElement).value)}
              placeholder="e.g. npm install"
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Rewrites */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-text">URL Rewrites</h2>
          <button
            onClick={addRewrite}
            class="text-sm bg-primary text-white px-3 py-1.5 rounded hover:bg-primary-dark transition-colors"
          >
            + Add Rewrite
          </button>
        </div>
        {rewrites.length === 0 && (
          <p class="text-sm text-text-muted">No rewrites configured. Rewrites forward requests transparently to a destination.</p>
        )}
        <div class="space-y-3">
          {rewrites.map(r => (
            <div key={r.id} class="flex gap-2 items-center">
              <input
                type="text"
                value={r.source}
                onInput={(e) => updateRewrite(r.id, 'source', (e.target as HTMLInputElement).value)}
                placeholder="Source pattern"
                class="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
              />
              <span class="text-text-muted text-sm">→</span>
              <input
                type="text"
                value={r.destination}
                onInput={(e) => updateRewrite(r.id, 'destination', (e.target as HTMLInputElement).value)}
                placeholder="Destination URL"
                class="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => removeRewrite(r.id)}
                class="text-text-muted hover:text-red-500 transition-colors px-2 py-1 text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Headers */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-text">Response Headers</h2>
          <button
            onClick={addHeader}
            class="text-sm bg-primary text-white px-3 py-1.5 rounded hover:bg-primary-dark transition-colors"
          >
            + Add Header
          </button>
        </div>
        {headers.length === 0 && (
          <p class="text-sm text-text-muted">No headers configured. Use headers to add security or caching headers to responses.</p>
        )}
        <div class="space-y-3">
          {headers.map(h => (
            <div key={h.id} class="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <input
                type="text"
                value={h.source}
                onInput={(e) => updateHeader(h.id, 'source', (e.target as HTMLInputElement).value)}
                placeholder="Source pattern"
                class="bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
              />
              <input
                type="text"
                value={h.key}
                onInput={(e) => updateHeader(h.id, 'key', (e.target as HTMLInputElement).value)}
                placeholder="Header key"
                class="bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
              />
              <div class="flex gap-2">
                <input
                  type="text"
                  value={h.value}
                  onInput={(e) => updateHeader(h.id, 'value', (e.target as HTMLInputElement).value)}
                  placeholder="Header value"
                  class="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => removeHeader(h.id)}
                  class="text-text-muted hover:text-red-500 transition-colors px-2 py-1 text-lg leading-none"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regions */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-1">Deployment Regions</h2>
        <p class="text-sm text-text-muted mb-3">Select which Vercel edge regions to deploy functions to.</p>
        <div class="flex flex-wrap gap-2">
          {REGIONS.map(r => (
            <button
              key={r}
              onClick={() => toggleRegion(r)}
              class={`px-3 py-1.5 rounded text-sm font-mono border transition-colors ${
                selectedRegions.includes(r)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-2">
          iad1=US East · sfo1=US West · lhr1=London · cdg1=Paris · sin1=Singapore · hnd1=Tokyo
        </p>
      </div>

      {/* Functions Config */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-4">Functions Config (api/**)</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-text-muted mb-1">
              Max Duration: <span class="text-text font-medium">{maxDuration}s</span>
            </label>
            <input
              type="range"
              min={1}
              max={300}
              value={maxDuration}
              onInput={(e) => setMaxDuration(Number((e.target as HTMLInputElement).value))}
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-text-muted mt-1">
              <span>1s</span><span>300s</span>
            </div>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">
              Memory: <span class="text-text font-medium">{memory} MB</span>
            </label>
            <select
              value={memory}
              onChange={(e) => setMemory(Number((e.target as HTMLSelectElement).value))}
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              {[128, 256, 512, 1024, 2048, 3008].map(m => (
                <option key={m} value={m}>{m} MB</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Output */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Generated <code class="font-mono text-primary text-sm">vercel.json</code></h2>
          <button
            onClick={handleCopy}
            class={`text-sm px-4 py-1.5 rounded border transition-colors ${
              copied
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-bg border-border text-text-muted hover:bg-primary hover:text-white hover:border-primary'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-relaxed">
          {output}
        </pre>
        <p class="text-xs text-text-muted mt-3">
          Place this file as <code class="font-mono">vercel.json</code> in your project root. Commit it to version control.
        </p>
      </div>
    </div>
  );
}
