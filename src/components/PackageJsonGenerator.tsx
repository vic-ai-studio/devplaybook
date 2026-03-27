import { useState } from 'preact/hooks';

type License = 'MIT' | 'Apache-2.0' | 'GPL-3.0' | 'ISC' | 'BSD-3-Clause' | 'UNLICENSED';
type PackageType = 'commonjs' | 'module';

interface Script {
  name: string;
  command: string;
  enabled: boolean;
}

interface Dependency {
  name: string;
  version: string;
  dev: boolean;
  enabled: boolean;
  category: string;
}

interface PkgConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  license: License;
  pkgType: PackageType;
  private: boolean;
  scripts: Script[];
  deps: Dependency[];
  keywords: string;
  repository: string;
  engines: boolean;
  nodeVersion: string;
}

const DEFAULT_SCRIPTS: Script[] = [
  { name: 'dev', command: 'node src/index.js', enabled: true },
  { name: 'build', command: 'tsc', enabled: true },
  { name: 'start', command: 'node dist/index.js', enabled: false },
  { name: 'test', command: 'vitest', enabled: true },
  { name: 'test:coverage', command: 'vitest run --coverage', enabled: false },
  { name: 'lint', command: 'eslint . --ext .ts,.tsx,.js,.jsx', enabled: true },
  { name: 'lint:fix', command: 'eslint . --ext .ts,.tsx,.js,.jsx --fix', enabled: false },
  { name: 'format', command: 'prettier --write .', enabled: false },
  { name: 'typecheck', command: 'tsc --noEmit', enabled: false },
  { name: 'clean', command: 'rm -rf dist', enabled: false },
];

const PRESET_DEPS: Dependency[] = [
  // Frameworks
  { name: 'react', version: '^18.3.0', dev: false, enabled: false, category: 'Frontend' },
  { name: 'react-dom', version: '^18.3.0', dev: false, enabled: false, category: 'Frontend' },
  { name: 'next', version: '^15.0.0', dev: false, enabled: false, category: 'Frontend' },
  { name: 'vue', version: '^3.5.0', dev: false, enabled: false, category: 'Frontend' },
  { name: 'express', version: '^4.21.0', dev: false, enabled: false, category: 'Backend' },
  { name: 'fastify', version: '^5.0.0', dev: false, enabled: false, category: 'Backend' },
  { name: 'hono', version: '^4.0.0', dev: false, enabled: false, category: 'Backend' },
  // TypeScript
  { name: 'typescript', version: '^5.5.0', dev: true, enabled: false, category: 'TypeScript' },
  { name: '@types/node', version: '^22.0.0', dev: true, enabled: false, category: 'TypeScript' },
  { name: '@types/react', version: '^18.3.0', dev: true, enabled: false, category: 'TypeScript' },
  // Build
  { name: 'vite', version: '^6.0.0', dev: true, enabled: false, category: 'Build' },
  { name: 'esbuild', version: '^0.24.0', dev: true, enabled: false, category: 'Build' },
  { name: 'tsup', version: '^8.0.0', dev: true, enabled: false, category: 'Build' },
  // Testing
  { name: 'vitest', version: '^2.1.0', dev: true, enabled: false, category: 'Testing' },
  { name: '@testing-library/react', version: '^16.0.0', dev: true, enabled: false, category: 'Testing' },
  { name: 'jest', version: '^29.7.0', dev: true, enabled: false, category: 'Testing' },
  // Linting
  { name: 'eslint', version: '^9.0.0', dev: true, enabled: false, category: 'Linting' },
  { name: 'prettier', version: '^3.3.0', dev: true, enabled: false, category: 'Linting' },
  { name: '@biomejs/biome', version: '^1.9.0', dev: true, enabled: false, category: 'Linting' },
  // Database
  { name: 'prisma', version: '^5.0.0', dev: true, enabled: false, category: 'Database' },
  { name: '@prisma/client', version: '^5.0.0', dev: false, enabled: false, category: 'Database' },
  { name: 'drizzle-orm', version: '^0.36.0', dev: false, enabled: false, category: 'Database' },
  // Utilities
  { name: 'zod', version: '^3.23.0', dev: false, enabled: false, category: 'Utilities' },
  { name: 'dotenv', version: '^16.4.0', dev: false, enabled: false, category: 'Utilities' },
  { name: 'axios', version: '^1.7.0', dev: false, enabled: false, category: 'Utilities' },
  { name: 'lodash-es', version: '^4.17.0', dev: false, enabled: false, category: 'Utilities' },
];

const DEFAULT: PkgConfig = {
  name: 'my-project',
  version: '1.0.0',
  description: '',
  author: '',
  license: 'MIT',
  pkgType: 'module',
  private: false,
  scripts: DEFAULT_SCRIPTS,
  deps: PRESET_DEPS,
  keywords: '',
  repository: '',
  engines: false,
  nodeVersion: '>=20.0.0',
};

function buildPackageJson(cfg: PkgConfig): string {
  const obj: Record<string, unknown> = {};

  obj.name = cfg.name || 'my-project';
  obj.version = cfg.version || '1.0.0';
  if (cfg.description) obj.description = cfg.description;
  obj.type = cfg.pkgType;
  if (cfg.private) obj.private = true;
  obj.license = cfg.license;
  if (cfg.author) obj.author = cfg.author;
  if (cfg.keywords) obj.keywords = cfg.keywords.split(',').map(s => s.trim()).filter(Boolean);
  if (cfg.repository) obj.repository = { type: 'git', url: cfg.repository };
  if (cfg.engines) obj.engines = { node: cfg.nodeVersion };

  const scripts: Record<string, string> = {};
  cfg.scripts.filter(s => s.enabled).forEach(s => { scripts[s.name] = s.command; });
  if (Object.keys(scripts).length) obj.scripts = scripts;

  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  cfg.deps.filter(d => d.enabled).forEach(d => {
    if (d.dev) devDependencies[d.name] = d.version;
    else dependencies[d.name] = d.version;
  });
  if (Object.keys(dependencies).length) obj.dependencies = dependencies;
  if (Object.keys(devDependencies).length) obj.devDependencies = devDependencies;

  return JSON.stringify(obj, null, 2);
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span class="text-sm">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export default function PackageJsonGenerator() {
  const [cfg, setCfg] = useState<PkgConfig>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof PkgConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  const toggleScript = (name: string) => {
    setCfg(prev => ({
      ...prev,
      scripts: prev.scripts.map(s => s.name === name ? { ...s, enabled: !s.enabled } : s),
    }));
  };

  const setScriptCmd = (name: string, command: string) => {
    setCfg(prev => ({
      ...prev,
      scripts: prev.scripts.map(s => s.name === name ? { ...s, command } : s),
    }));
  };

  const toggleDep = (depName: string) => {
    setCfg(prev => ({
      ...prev,
      deps: prev.deps.map(d => d.name === depName ? { ...d, enabled: !d.enabled } : d),
    }));
  };

  const output = buildPackageJson(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const categories = [...new Set(cfg.deps.map(d => d.category))];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-4">
        {/* Basic Info */}
        <Section title="Basic Info">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">name</label>
              <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={cfg.name} onInput={e => set('name', (e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">version</label>
              <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={cfg.version} onInput={e => set('version', (e.target as HTMLInputElement).value)} />
            </div>
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">description</label>
            <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.description} onInput={e => set('description', (e.target as HTMLInputElement).value)} />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">author</label>
            <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.author} onInput={e => set('author', (e.target as HTMLInputElement).value)} placeholder="Name <email>" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">license</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.license} onChange={e => set('license', (e.target as HTMLSelectElement).value)}>
                {(['MIT','Apache-2.0','GPL-3.0','ISC','BSD-3-Clause','UNLICENSED'] as License[]).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">type</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.pkgType} onChange={e => set('pkgType', (e.target as HTMLSelectElement).value)}>
                <option value="module">ESM (module)</option>
                <option value="commonjs">CommonJS</option>
              </select>
            </div>
          </div>
          <div class="space-y-2">
            <Toggle checked={cfg.private} onChange={v => set('private', v)} label="private (not publishable to npm)" />
            <Toggle checked={cfg.engines} onChange={v => set('engines', v)} label="engines" />
            {cfg.engines && (
              <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={cfg.nodeVersion} onInput={e => set('nodeVersion', (e.target as HTMLInputElement).value)} placeholder=">=20.0.0" />
            )}
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">keywords (comma-separated)</label>
            <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.keywords} onInput={e => set('keywords', (e.target as HTMLInputElement).value)} placeholder="typescript, library, utility" />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">repository URL (optional)</label>
            <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={cfg.repository} onInput={e => set('repository', (e.target as HTMLInputElement).value)} placeholder="https://github.com/user/repo" />
          </div>
        </Section>

        {/* Scripts */}
        <Section title="Scripts">
          <div class="space-y-2">
            {cfg.scripts.map(s => (
              <div key={s.name} class="flex items-center gap-2">
                <button
                  onClick={() => toggleScript(s.name)}
                  class={`flex-shrink-0 w-8 h-5 rounded-full transition-colors relative ${s.enabled ? 'bg-accent' : 'bg-border'}`}
                >
                  <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.enabled ? 'translate-x-3' : 'translate-x-0'}`} />
                </button>
                <span class="text-xs font-mono text-text-muted w-28 flex-shrink-0">{s.name}</span>
                {s.enabled && (
                  <input
                    class="flex-1 bg-bg border border-border rounded px-2 py-1 text-xs font-mono"
                    value={s.command}
                    onInput={e => setScriptCmd(s.name, (e.target as HTMLInputElement).value)}
                  />
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Dependencies */}
        <Section title="Dependencies">
          {categories.map(cat => (
            <div key={cat} class="space-y-1">
              <p class="text-xs text-text-muted font-semibold">{cat}</p>
              <div class="grid grid-cols-2 gap-1">
                {cfg.deps.filter(d => d.category === cat).map(d => (
                  <button
                    key={d.name}
                    onClick={() => toggleDep(d.name)}
                    class={`flex items-center justify-between px-2 py-1 rounded border text-xs transition-colors text-left ${d.enabled ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
                  >
                    <span class="font-mono truncate">{d.name}</span>
                    <span class="text-text-muted ml-1 flex-shrink-0">{d.dev ? 'dev' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">package.json</span>
          <button
            onClick={handleCopy}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-accent text-white hover:bg-accent/90'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] text-green-400 whitespace-pre leading-relaxed">{output}</pre>
        <div class="text-xs text-text-muted">
          <p>Save as <code class="bg-surface px-1 rounded">package.json</code> in your project root, then run <code class="bg-surface px-1 rounded">npm install</code> to install selected dependencies.</p>
        </div>
      </div>
    </div>
  );
}
