import { useState } from 'preact/hooks';

type Framework = 'react' | 'vue' | 'node' | 'nextjs';
type TestEnvironment = 'node' | 'jsdom' | 'happy-dom';
type CoverageProvider = 'v8' | 'istanbul';

interface JestConfig {
  framework: Framework;
  typescript: boolean;
  testEnvironment: TestEnvironment;
  coverage: boolean;
  coverageProvider: CoverageProvider;
  thresholdLines: number;
  thresholdBranches: number;
  thresholdFunctions: number;
  thresholdStatements: number;
  moduleNameMapper: boolean;
  aliasFrom: string;
  aliasTo: string;
  setupFiles: boolean;
  transformIgnore: boolean;
  verbose: boolean;
  clearMocks: boolean;
  restoreMocks: boolean;
  testTimeout: number;
}

const DEFAULT: JestConfig = {
  framework: 'react',
  typescript: true,
  testEnvironment: 'jsdom',
  coverage: true,
  coverageProvider: 'v8',
  thresholdLines: 80,
  thresholdBranches: 70,
  thresholdFunctions: 80,
  thresholdStatements: 80,
  moduleNameMapper: false,
  aliasFrom: '^@/(.*)$',
  aliasTo: '<rootDir>/src/$1',
  setupFiles: false,
  transformIgnore: false,
  verbose: false,
  clearMocks: true,
  restoreMocks: false,
  testTimeout: 5000,
};

function getPreset(cfg: JestConfig): string {
  if (cfg.typescript) {
    if (cfg.framework === 'nextjs') return 'next/jest';
    return 'ts-jest';
  }
  if (cfg.framework === 'nextjs') return 'next/jest';
  return 'babel-jest';
}

function getTransformKey(cfg: JestConfig): string {
  if (cfg.framework === 'react') return '^.+\\\\.(ts|tsx)$';
  if (cfg.framework === 'vue') return '^.+\\\\.vue$';
  return '^.+\\\\.(ts|tsx|js|jsx)$';
}

function buildConfig(cfg: JestConfig): string {
  const lines: string[] = [];
  const isTS = cfg.typescript;
  const preset = getPreset(cfg);

  if (isTS) {
    lines.push(`import type { Config } from 'jest';`);
    lines.push('');
    lines.push('const config: Config = {');
  } else {
    lines.push(`/** @type {import('jest').Config} */`);
    lines.push('const config = {');
  }

  // preset
  if (preset === 'next/jest') {
    // Next.js uses createJestConfig — handled via comment
    lines.push(`  // Use: const createJestConfig = require('next/jest')()`);
    lines.push(`  // module.exports = createJestConfig(config)`);
  } else if (preset !== 'babel-jest') {
    lines.push(`  preset: '${preset}',`);
  }

  // testEnvironment
  if (cfg.testEnvironment !== 'node') {
    lines.push(`  testEnvironment: '${cfg.testEnvironment}',`);
  } else {
    lines.push(`  testEnvironment: 'node',`);
  }

  // verbose
  if (cfg.verbose) lines.push(`  verbose: true,`);

  // clearMocks / restoreMocks
  if (cfg.clearMocks) lines.push(`  clearMocks: true,`);
  if (cfg.restoreMocks) lines.push(`  restoreMocks: true,`);

  // testTimeout
  if (cfg.testTimeout !== 5000) lines.push(`  testTimeout: ${cfg.testTimeout},`);

  // setupFiles
  if (cfg.setupFiles) {
    lines.push(`  setupFilesAfterFramework: ['<rootDir>/src/setupTests.${isTS ? 'ts' : 'js'}'],`);
  }

  // transform
  if (cfg.typescript && cfg.framework !== 'nextjs') {
    lines.push(`  transform: {`);
    lines.push(`    '${getTransformKey(cfg)}': 'ts-jest',`);
    if (cfg.framework === 'vue') {
      lines.push(`    '^.+\\\\.vue$': '@vue/vue3-jest',`);
    }
    lines.push(`  },`);
  }

  // transformIgnorePatterns
  if (cfg.transformIgnore) {
    lines.push(`  transformIgnorePatterns: [`);
    lines.push(`    '/node_modules/(?!(your-esm-package)/)',`);
    lines.push(`  ],`);
  }

  // moduleNameMapper
  if (cfg.moduleNameMapper) {
    lines.push(`  moduleNameMapper: {`);
    lines.push(`    '${cfg.aliasFrom}': '${cfg.aliasTo}',`);
    if (cfg.framework === 'react' || cfg.framework === 'nextjs') {
      lines.push(`    '\\\\.(css|less|scss|sass)$': 'identity-obj-proxy',`);
      lines.push(`    '\\\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',`);
    }
    lines.push(`  },`);
  }

  // testPathPattern
  lines.push(`  testMatch: [`);
  lines.push(`    '**/__tests__/**/*.${isTS ? '{ts,tsx}' : '{js,jsx}'}',`);
  lines.push(`    '**/*.{spec,test}.${isTS ? '{ts,tsx}' : '{js,jsx}'}',`);
  lines.push(`  ],`);

  // coverage
  if (cfg.coverage) {
    lines.push(`  collectCoverageFrom: [`);
    lines.push(`    'src/**/*.${isTS ? '{ts,tsx}' : '{js,jsx}'}',`);
    lines.push(`    '!src/**/*.d.ts',`);
    lines.push(`    '!src/**/*.stories.${isTS ? '{ts,tsx}' : '{js,jsx}'}',`);
    lines.push(`    '!src/index.${isTS ? 'ts' : 'js'}',`);
    lines.push(`  ],`);
    lines.push(`  coverageProvider: '${cfg.coverageProvider}',`);
    lines.push(`  coverageReporters: ['text', 'lcov', 'html'],`);
    lines.push(`  coverageThreshold: {`);
    lines.push(`    global: {`);
    lines.push(`      lines: ${cfg.thresholdLines},`);
    lines.push(`      branches: ${cfg.thresholdBranches},`);
    lines.push(`      functions: ${cfg.thresholdFunctions},`);
    lines.push(`      statements: ${cfg.thresholdStatements},`);
    lines.push(`    },`);
    lines.push(`  },`);
  }

  lines.push('};');
  lines.push('');

  if (isTS) {
    if (preset === 'next/jest') {
      lines.push(`// For Next.js, wrap with createJestConfig:`);
      lines.push(`// const createJestConfig = require('next/jest')()`);
      lines.push(`// module.exports = createJestConfig(config)`);
      lines.push(`export default config;`);
    } else {
      lines.push(`export default config;`);
    }
  } else {
    lines.push(`module.exports = config;`);
  }

  return lines.join('\n');
}

function getInstallCommand(cfg: JestConfig): string[] {
  const pkgs = ['jest'];
  if (cfg.typescript) {
    pkgs.push('ts-jest', '@types/jest');
  } else {
    pkgs.push('babel-jest', '@babel/core', '@babel/preset-env');
  }
  if (cfg.framework === 'react') {
    if (cfg.typescript) pkgs.push('@types/react');
    pkgs.push('@testing-library/react', '@testing-library/jest-dom', '@testing-library/user-event');
  }
  if (cfg.framework === 'vue') {
    pkgs.push('@vue/vue3-jest', '@testing-library/vue');
  }
  if (cfg.testEnvironment === 'jsdom') pkgs.push('jest-environment-jsdom');
  if (cfg.testEnvironment === 'happy-dom') pkgs.push('jest-environment-happy-dom');
  if (cfg.moduleNameMapper && (cfg.framework === 'react' || cfg.framework === 'nextjs')) {
    pkgs.push('identity-obj-proxy');
  }
  if (cfg.coverage && cfg.coverageProvider === 'istanbul') pkgs.push('@jest/coverage-provider-istanbul');
  return pkgs;
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

function Slider({ label, value, onChange, min = 0, max = 100 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <div class="flex justify-between mb-1">
        <label class="text-xs text-text-muted">{label}</label>
        <span class="text-xs font-mono text-accent">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onInput={e => onChange(Number((e.target as HTMLInputElement).value))}
        class="w-full accent-accent"
      />
    </div>
  );
}

const FRAMEWORKS: { value: Framework; label: string; desc: string }[] = [
  { value: 'react', label: 'React', desc: 'CRA / Vite' },
  { value: 'vue', label: 'Vue', desc: 'Vue 3' },
  { value: 'node', label: 'Node.js', desc: 'Backend' },
  { value: 'nextjs', label: 'Next.js', desc: 'App router' },
];

const ENVIRONMENTS: { value: TestEnvironment; label: string; desc: string }[] = [
  { value: 'node', label: 'node', desc: 'Backend / APIs' },
  { value: 'jsdom', label: 'jsdom', desc: 'Browser DOM' },
  { value: 'happy-dom', label: 'happy-dom', desc: 'Faster DOM' },
];

export default function JestConfigGenerator() {
  const [cfg, setCfg] = useState<JestConfig>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof JestConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  const output = buildConfig(cfg);
  const installPkgs = getInstallCommand(cfg);
  const filename = cfg.typescript ? 'jest.config.ts' : 'jest.config.js';

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

        {/* Framework */}
        <Section title="Framework">
          <div class="grid grid-cols-2 gap-2">
            {FRAMEWORKS.map(f => (
              <button
                key={f.value}
                onClick={() => set('framework', f.value)}
                class={`px-3 py-2 rounded border text-sm transition-colors text-left ${cfg.framework === f.value ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
              >
                <div class="font-medium">{f.label}</div>
                <div class="text-xs text-text-muted">{f.desc}</div>
              </button>
            ))}
          </div>
          <Toggle
            checked={cfg.typescript}
            onChange={v => set('typescript', v)}
            label="TypeScript"
            doc={cfg.typescript ? "Uses ts-jest preset with jest.config.ts" : "Uses babel-jest preset with jest.config.js"}
          />
        </Section>

        {/* Test Environment */}
        <Section title="Test Environment">
          <div class="grid grid-cols-3 gap-2">
            {ENVIRONMENTS.map(env => (
              <button
                key={env.value}
                onClick={() => set('testEnvironment', env.value)}
                class={`px-3 py-2 rounded border text-sm transition-colors ${cfg.testEnvironment === env.value ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
              >
                <div class="font-medium">{env.label}</div>
                <div class="text-xs text-text-muted">{env.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        {/* Mocks & Timing */}
        <Section title="Mocks & Timing">
          <Toggle checked={cfg.verbose} onChange={v => set('verbose', v)} label="verbose" doc="Print individual test results with test names." />
          <Toggle checked={cfg.clearMocks} onChange={v => set('clearMocks', v)} label="clearMocks" doc="Automatically clear mock calls and instances between tests." />
          <Toggle checked={cfg.restoreMocks} onChange={v => set('restoreMocks', v)} label="restoreMocks" doc="Automatically restore mock state after every test." />
          <div>
            <label class="text-xs text-text-muted block mb-1">testTimeout (ms)</label>
            <input
              type="number"
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
              value={cfg.testTimeout}
              onInput={e => set('testTimeout', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </Section>

        {/* Module Resolution */}
        <Section title="Module Resolution">
          <Toggle
            checked={cfg.setupFiles}
            onChange={v => set('setupFiles', v)}
            label="setupFilesAfterFramework"
            doc="Add a src/setupTests.ts for custom matchers (e.g. @testing-library/jest-dom)."
          />
          <Toggle
            checked={cfg.moduleNameMapper}
            onChange={v => set('moduleNameMapper', v)}
            label="moduleNameMapper"
            doc="Map path aliases (e.g. @/) and static assets to mocks."
          />
          {cfg.moduleNameMapper && (
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-muted block mb-1">alias pattern (regex)</label>
                <input
                  class="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono"
                  value={cfg.aliasFrom}
                  onInput={e => set('aliasFrom', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">maps to</label>
                <input
                  class="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono"
                  value={cfg.aliasTo}
                  onInput={e => set('aliasTo', (e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
          )}
          <Toggle
            checked={cfg.transformIgnore}
            onChange={v => set('transformIgnore', v)}
            label="transformIgnorePatterns"
            doc="Override transform ignore for ESM-only packages in node_modules."
          />
        </Section>

        {/* Coverage */}
        <Section title="Coverage">
          <Toggle checked={cfg.coverage} onChange={v => set('coverage', v)} label="Enable coverage" />
          {cfg.coverage && (
            <div class="space-y-3">
              <div>
                <label class="text-xs text-text-muted block mb-1">provider</label>
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
              <div class="space-y-2">
                <p class="text-xs text-text-muted">Coverage thresholds (fail build below %)</p>
                <Slider label="Lines" value={cfg.thresholdLines} onChange={v => set('thresholdLines', v)} />
                <Slider label="Branches" value={cfg.thresholdBranches} onChange={v => set('thresholdBranches', v)} />
                <Slider label="Functions" value={cfg.thresholdFunctions} onChange={v => set('thresholdFunctions', v)} />
                <Slider label="Statements" value={cfg.thresholdStatements} onChange={v => set('thresholdStatements', v)} />
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">{filename}</span>
          <button
            onClick={handleCopy}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-accent text-white hover:bg-accent/90'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] text-green-400 whitespace-pre leading-relaxed">{output}</pre>
        <div class="text-xs text-text-muted space-y-1">
          <p class="font-medium text-text">Install dependencies:</p>
          <code class="block bg-surface px-2 py-1.5 rounded text-xs font-mono break-all">
            npm install -D {installPkgs.join(' ')}
          </code>
          {cfg.coverage && (
            <p class="mt-1">Run coverage: <code class="bg-surface px-1 rounded">jest --coverage</code></p>
          )}
          {cfg.typescript && cfg.framework !== 'nextjs' && (
            <p>ts-jest docs: <a href="https://kulshekhar.github.io/ts-jest" target="_blank" rel="noopener" class="text-accent hover:underline">kulshekhar.github.io/ts-jest</a></p>
          )}
        </div>
      </div>
    </div>
  );
}
