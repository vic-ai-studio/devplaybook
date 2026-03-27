import { useState } from 'preact/hooks';

type Environment = 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime';
type CoverageProvider = 'v8' | 'istanbul' | 'none';
type Reporter = 'default' | 'verbose' | 'dot' | 'json' | 'html' | 'junit';

interface VitestConfig {
  environment: Environment;
  globals: boolean;
  coverage: boolean;
  coverageProvider: CoverageProvider;
  coverageReporter: ('text' | 'json' | 'html' | 'lcov')[];
  coverageThreshold: boolean;
  thresholdLines: number;
  thresholdBranches: number;
  reporters: Reporter[];
  setupFiles: boolean;
  testMatch: string;
  excludePatterns: string;
  useAlias: boolean;
  aliasFrom: string;
  aliasTo: string;
  watchExclude: string;
  pool: 'forks' | 'threads' | 'vmForks' | 'vmThreads';
  singleThread: boolean;
  testTimeout: number;
  hookTimeout: number;
  clearMocks: boolean;
  restoreMocks: boolean;
  snapshotFormat: 'default' | 'pretty-format';
  typecheck: boolean;
}

const DEFAULT: VitestConfig = {
  environment: 'node',
  globals: false,
  coverage: true,
  coverageProvider: 'v8',
  coverageReporter: ['text', 'json', 'html'],
  coverageThreshold: false,
  thresholdLines: 80,
  thresholdBranches: 80,
  reporters: ['default'],
  setupFiles: false,
  testMatch: '**/*.{test,spec}.{ts,tsx,js,jsx}',
  excludePatterns: 'node_modules, dist, .git',
  useAlias: false,
  aliasFrom: '@',
  aliasTo: './src',
  watchExclude: 'node_modules/**, dist/**',
  pool: 'forks',
  singleThread: false,
  testTimeout: 5000,
  hookTimeout: 10000,
  clearMocks: false,
  restoreMocks: false,
  snapshotFormat: 'default',
  typecheck: false,
};

function buildConfig(cfg: VitestConfig): string {
  const lines: string[] = [];
  lines.push(`import { defineConfig } from 'vitest/config'`);
  if (cfg.useAlias) lines.push(`import path from 'path'`);
  lines.push('');
  lines.push('export default defineConfig({');
  lines.push('  test: {');

  // environment
  if (cfg.environment !== 'node') lines.push(`    environment: '${cfg.environment}',`);

  // globals
  if (cfg.globals) lines.push(`    globals: true,`);

  // reporters
  if (cfg.reporters.length === 1 && cfg.reporters[0] !== 'default') {
    lines.push(`    reporter: '${cfg.reporters[0]}',`);
  } else if (cfg.reporters.length > 1) {
    lines.push(`    reporters: [${cfg.reporters.map(r => `'${r}'`).join(', ')}],`);
  }

  // setupFiles
  if (cfg.setupFiles) lines.push(`    setupFiles: ['./src/test/setup.ts'],`);

  // include/exclude
  lines.push(`    include: ['${cfg.testMatch}'],`);
  const excluded = cfg.excludePatterns.split(',').map(s => s.trim()).filter(Boolean);
  if (excluded.length) {
    lines.push(`    exclude: [${excluded.map(e => `'${e}/**'`).join(', ')}],`);
  }

  // pool
  if (cfg.pool !== 'forks') lines.push(`    pool: '${cfg.pool}',`);
  if (cfg.singleThread) lines.push(`    singleThread: true,`);

  // timeouts
  if (cfg.testTimeout !== 5000) lines.push(`    testTimeout: ${cfg.testTimeout},`);
  if (cfg.hookTimeout !== 10000) lines.push(`    hookTimeout: ${cfg.hookTimeout},`);

  // mock cleanup
  if (cfg.clearMocks) lines.push(`    clearMocks: true,`);
  if (cfg.restoreMocks) lines.push(`    restoreMocks: true,`);

  // typecheck
  if (cfg.typecheck) {
    lines.push(`    typecheck: {`);
    lines.push(`      tsconfig: './tsconfig.json',`);
    lines.push(`    },`);
  }

  // coverage
  if (cfg.coverage) {
    lines.push(`    coverage: {`);
    lines.push(`      provider: '${cfg.coverageProvider}',`);
    lines.push(`      reporter: [${cfg.coverageReporter.map(r => `'${r}'`).join(', ')}],`);
    if (cfg.coverageThreshold) {
      lines.push(`      thresholds: {`);
      lines.push(`        lines: ${cfg.thresholdLines},`);
      lines.push(`        branches: ${cfg.thresholdBranches},`);
      lines.push(`      },`);
    }
    lines.push(`    },`);
  }

  lines.push('  },');

  // resolve alias
  if (cfg.useAlias) {
    lines.push('  resolve: {');
    lines.push('    alias: {');
    lines.push(`      '${cfg.aliasFrom}': path.resolve(__dirname, '${cfg.aliasTo}'),`);
    lines.push('    },');
    lines.push('  },');
  }

  lines.push('})');
  return lines.join('\n');
}

function Toggle({ checked, onChange, label, doc }: { checked: boolean; onChange: (v: boolean) => void; label: string; doc?: string }) {
  return (
    <div class="flex items-start gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <span class="text-sm font-mono">{label}</span>
        {doc && <p class="text-xs text-text-muted mt-0.5">{doc}</p>}
      </div>
    </div>
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

const REPORTERS: Reporter[] = ['default', 'verbose', 'dot', 'json', 'html', 'junit'];
const COV_REPORTERS: ('text' | 'json' | 'html' | 'lcov')[] = ['text', 'json', 'html', 'lcov'];

export default function VitestConfigGenerator() {
  const [cfg, setCfg] = useState<VitestConfig>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof VitestConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  const toggleReporter = (r: Reporter) => {
    setCfg(prev => ({
      ...prev,
      reporters: prev.reporters.includes(r)
        ? prev.reporters.filter(x => x !== r)
        : [...prev.reporters, r],
    }));
  };

  const toggleCovReporter = (r: 'text' | 'json' | 'html' | 'lcov') => {
    setCfg(prev => ({
      ...prev,
      coverageReporter: prev.coverageReporter.includes(r)
        ? prev.coverageReporter.filter(x => x !== r)
        : [...prev.coverageReporter, r],
    }));
  };

  const output = buildConfig(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-4">
        {/* Test Environment */}
        <Section title="Test Environment">
          <div>
            <label class="text-xs text-text-muted block mb-1">environment</label>
            <div class="grid grid-cols-2 gap-2">
              {(['node','jsdom','happy-dom','edge-runtime'] as Environment[]).map(env => (
                <button
                  key={env}
                  onClick={() => set('environment', env)}
                  class={`px-3 py-2 rounded border text-sm transition-colors ${cfg.environment === env ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
                >
                  <div class="font-medium">{env}</div>
                  <div class="text-xs text-text-muted">
                    {env === 'node' && 'Backend tests'}
                    {env === 'jsdom' && 'DOM/React tests'}
                    {env === 'happy-dom' && 'Faster DOM'}
                    {env === 'edge-runtime' && 'Cloudflare/Vercel edge'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <Toggle checked={cfg.globals} onChange={v => set('globals', v)} label="globals" doc="Inject describe/it/expect globally — no need to import from vitest." />
          <Toggle checked={cfg.setupFiles} onChange={v => set('setupFiles', v)} label="setupFiles" doc="Add a ./src/test/setup.ts for global test setup (e.g. custom matchers)." />
          <Toggle checked={cfg.typecheck} onChange={v => set('typecheck', v)} label="typecheck" doc="Run TypeScript type checking as part of the test suite." />
        </Section>

        {/* Test Discovery */}
        <Section title="Test Discovery">
          <div>
            <label class="text-xs text-text-muted block mb-1">include pattern</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.testMatch}
              onInput={e => set('testMatch', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">exclude (comma-separated)</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.excludePatterns}
              onInput={e => set('excludePatterns', (e.target as HTMLInputElement).value)}
            />
          </div>
        </Section>

        {/* Reporters */}
        <Section title="Reporters">
          <div class="flex flex-wrap gap-2">
            {REPORTERS.map(r => (
              <button
                key={r}
                onClick={() => toggleReporter(r)}
                class={`px-2 py-1 rounded border text-xs transition-colors ${cfg.reporters.includes(r) ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </Section>

        {/* Coverage */}
        <Section title="Coverage">
          <Toggle checked={cfg.coverage} onChange={v => set('coverage', v)} label="Enable coverage" />
          {cfg.coverage && (
            <div class="space-y-3">
              <div>
                <label class="text-xs text-text-muted block mb-1">provider</label>
                <div class="flex gap-2">
                  {(['v8','istanbul'] as CoverageProvider[]).map(p => (
                    <button
                      key={p}
                      onClick={() => set('coverageProvider', p)}
                      class={`flex-1 px-3 py-1.5 rounded border text-sm transition-colors ${cfg.coverageProvider === p ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
                    >
                      {p === 'v8' ? 'v8 (fast, built-in)' : 'istanbul (accurate)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">coverage reporters</label>
                <div class="flex flex-wrap gap-2">
                  {COV_REPORTERS.map(r => (
                    <button
                      key={r}
                      onClick={() => toggleCovReporter(r)}
                      class={`px-2 py-1 rounded border text-xs transition-colors ${cfg.coverageReporter.includes(r) ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <Toggle checked={cfg.coverageThreshold} onChange={v => set('coverageThreshold', v)} label="Enforce thresholds" doc="Fail tests if coverage drops below these percentages." />
              {cfg.coverageThreshold && (
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-xs text-text-muted block mb-1">Lines % minimum</label>
                    <input type="number" min="0" max="100" class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.thresholdLines} onInput={e => set('thresholdLines', Number((e.target as HTMLInputElement).value))} />
                  </div>
                  <div>
                    <label class="text-xs text-text-muted block mb-1">Branches % minimum</label>
                    <input type="number" min="0" max="100" class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.thresholdBranches} onInput={e => set('thresholdBranches', Number((e.target as HTMLInputElement).value))} />
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Mock & Timing */}
        <Section title="Mocks & Timing">
          <Toggle checked={cfg.clearMocks} onChange={v => set('clearMocks', v)} label="clearMocks" doc="Clear mock calls/instances/results between every test." />
          <Toggle checked={cfg.restoreMocks} onChange={v => set('restoreMocks', v)} label="restoreMocks" doc="Restore all mocks to original implementation after each test." />
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">testTimeout (ms)</label>
              <input type="number" class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.testTimeout} onInput={e => set('testTimeout', Number((e.target as HTMLInputElement).value))} />
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">hookTimeout (ms)</label>
              <input type="number" class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.hookTimeout} onInput={e => set('hookTimeout', Number((e.target as HTMLInputElement).value))} />
            </div>
          </div>
        </Section>

        {/* Path Alias */}
        <Section title="Path Alias">
          <Toggle checked={cfg.useAlias} onChange={v => set('useAlias', v)} label="Add resolve.alias" doc="Map an import alias (e.g. @) to a source directory." />
          {cfg.useAlias && (
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-muted block mb-1">alias key</label>
                <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={cfg.aliasFrom} onInput={e => set('aliasFrom', (e.target as HTMLInputElement).value)} />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">alias path</label>
                <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={cfg.aliasTo} onInput={e => set('aliasTo', (e.target as HTMLInputElement).value)} />
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">vitest.config.ts</span>
          <button
            onClick={handleCopy}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-accent text-white hover:bg-accent/90'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] text-green-400 whitespace-pre leading-relaxed">{output}</pre>
        <div class="text-xs text-text-muted space-y-1">
          <p>Install: <code class="bg-surface px-1 rounded">npm install -D vitest</code></p>
          {cfg.coverage && <p>Coverage: <code class="bg-surface px-1 rounded">npm install -D @vitest/coverage-{cfg.coverageProvider}</code></p>}
          {cfg.environment === 'jsdom' && <p>jsdom: <code class="bg-surface px-1 rounded">npm install -D jsdom</code></p>}
          {cfg.environment === 'happy-dom' && <p>happy-dom: <code class="bg-surface px-1 rounded">npm install -D happy-dom</code></p>}
        </div>
      </div>
    </div>
  );
}
