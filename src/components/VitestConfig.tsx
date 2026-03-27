import { useState } from 'preact/hooks';

type Environment = 'node' | 'jsdom' | 'happy-dom';
type CoverageProvider = 'v8' | 'istanbul';

interface Config {
  environment: Environment;
  globals: boolean;
  coverage: boolean;
  coverageProvider: CoverageProvider;
  setupFiles: boolean;
}

const DEFAULT: Config = {
  environment: 'node',
  globals: false,
  coverage: true,
  coverageProvider: 'v8',
  setupFiles: false,
};

function buildConfig(cfg: Config): string {
  const lines: string[] = [];
  lines.push(`import { defineConfig } from 'vitest/config'`);
  lines.push('');
  lines.push('export default defineConfig({');
  lines.push('  test: {');

  if (cfg.environment !== 'node') {
    lines.push(`    environment: '${cfg.environment}',`);
  }

  if (cfg.globals) {
    lines.push(`    globals: true,`);
  }

  if (cfg.setupFiles) {
    lines.push(`    setupFiles: ['./src/test/setup.ts'],`);
  }

  if (cfg.coverage) {
    lines.push(`    coverage: {`);
    lines.push(`      provider: '${cfg.coverageProvider}',`);
    lines.push(`      reporter: ['text', 'json', 'html'],`);
    lines.push(`    },`);
  }

  lines.push('  },');
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

const ENVIRONMENTS: { value: Environment; label: string; desc: string }[] = [
  { value: 'node', label: 'node', desc: 'Backend / utilities' },
  { value: 'jsdom', label: 'jsdom', desc: 'React / DOM' },
  { value: 'happy-dom', label: 'happy-dom', desc: 'Faster DOM' },
];

export default function VitestConfig() {
  const [cfg, setCfg] = useState<Config>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof Config, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
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
      {/* Left: Options */}
      <div class="bg-surface border border-border rounded-lg p-5 space-y-5">
        {/* Environment */}
        <div>
          <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Test Environment</h3>
          <div class="grid grid-cols-3 gap-2">
            {ENVIRONMENTS.map(env => (
              <button
                key={env.value}
                onClick={() => set('environment', env.value)}
                class={`px-3 py-2.5 rounded border text-sm transition-colors ${cfg.environment === env.value ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
              >
                <div class="font-medium">{env.label}</div>
                <div class="text-xs text-text-muted mt-0.5">{env.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Options</h3>
          <Toggle
            checked={cfg.globals}
            onChange={v => set('globals', v)}
            label="globals"
            doc="Inject describe/it/expect globally — no need to import from vitest."
          />
          <Toggle
            checked={cfg.setupFiles}
            onChange={v => set('setupFiles', v)}
            label="setupFiles"
            doc="Add ./src/test/setup.ts for custom matchers and global test setup."
          />
        </div>

        {/* Coverage */}
        <div class="space-y-3">
          <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Coverage</h3>
          <Toggle
            checked={cfg.coverage}
            onChange={v => set('coverage', v)}
            label="Enable coverage"
          />
          {cfg.coverage && (
            <div>
              <label class="text-xs text-text-muted block mb-1.5">provider</label>
              <div class="flex gap-2">
                {(['v8', 'istanbul'] as CoverageProvider[]).map(p => (
                  <button
                    key={p}
                    onClick={() => set('coverageProvider', p)}
                    class={`flex-1 px-3 py-1.5 rounded border text-sm transition-colors ${cfg.coverageProvider === p ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
                  >
                    {p === 'v8' ? 'v8 (fast)' : 'istanbul (accurate)'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Live Preview */}
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
        <pre class="bg-bg border border-border rounded-lg p-4 text-sm font-mono text-green-400 whitespace-pre leading-relaxed min-h-[200px]">{output}</pre>
        <div class="text-xs text-text-muted space-y-1">
          <p>Install Vitest: <code class="bg-surface px-1 rounded">npm install -D vitest</code></p>
          {cfg.coverage && (
            <p>Coverage: <code class="bg-surface px-1 rounded">npm install -D @vitest/coverage-{cfg.coverageProvider}</code></p>
          )}
          {cfg.environment === 'jsdom' && (
            <p>jsdom: <code class="bg-surface px-1 rounded">npm install -D jsdom</code></p>
          )}
          {cfg.environment === 'happy-dom' && (
            <p>happy-dom: <code class="bg-surface px-1 rounded">npm install -D happy-dom</code></p>
          )}
          <p class="pt-1">Run tests: <code class="bg-surface px-1 rounded">npx vitest</code> &nbsp;|&nbsp; once: <code class="bg-surface px-1 rounded">npx vitest run</code></p>
        </div>
      </div>
    </div>
  );
}
