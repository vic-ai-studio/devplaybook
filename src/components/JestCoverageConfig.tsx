import { useState } from 'preact/hooks';

type Reporter = 'text' | 'text-summary' | 'lcov' | 'html' | 'json' | 'json-summary' | 'clover' | 'cobertura';

const REPORTER_LABELS: Record<Reporter, string> = {
  text: 'text (terminal table)',
  'text-summary': 'text-summary (brief)',
  lcov: 'lcov (HTML + data)',
  html: 'html (interactive)',
  json: 'json (full data)',
  'json-summary': 'json-summary (compact)',
  clover: 'clover (XML)',
  cobertura: 'cobertura (CI/CD)',
};

interface Thresholds {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

function generateConfig(
  thresholds: Thresholds,
  reporters: Reporter[],
  collectFrom: string[],
  outputDir: string,
  useTs: boolean,
  rootDir: string
): string {
  const reporterArr = JSON.stringify(reporters.length > 0 ? reporters : ['text']);
  const collectArr = JSON.stringify(collectFrom.filter(Boolean));
  const base = {
    ...(useTs ? { preset: 'ts-jest' } : {}),
    testEnvironment: 'node',
    rootDir: rootDir || '.',
    collectCoverage: true,
    coverageDirectory: outputDir || 'coverage',
    coverageReporters: reporters.length > 0 ? reporters : ['text'],
    coverageThreshold: {
      global: {
        lines: thresholds.lines,
        functions: thresholds.functions,
        branches: thresholds.branches,
        statements: thresholds.statements,
      },
    },
    ...(collectFrom.filter(Boolean).length > 0 ? { collectCoverageFrom: collectFrom.filter(Boolean) } : {}),
  };

  return `// jest.config.${useTs ? 'ts' : 'js'}
${useTs ? 'import type { Config } from "jest";\n\nconst config: Config = ' : 'module.exports = '}${JSON.stringify(base, null, 2).replace(/"([^"]+)":/g, '$1:')}${useTs ? ';\n\nexport default config;' : ';'}`;
}

export default function JestCoverageConfig() {
  const [thresholds, setThresholds] = useState<Thresholds>({ lines: 80, functions: 80, branches: 70, statements: 80 });
  const [reporters, setReporters] = useState<Reporter[]>(['text', 'lcov']);
  const [collectFrom, setCollectFrom] = useState(['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts', '!src/**/*.stories.{ts,tsx}']);
  const [outputDir, setOutputDir] = useState('coverage');
  const [useTs, setUseTs] = useState(true);
  const [rootDir, setRootDir] = useState('.');
  const [newPattern, setNewPattern] = useState('');
  const [copied, setCopied] = useState(false);

  function toggleReporter(r: Reporter) {
    setReporters(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);
  }

  function addPattern() {
    if (newPattern.trim()) {
      setCollectFrom(p => [...p, newPattern.trim()]);
      setNewPattern('');
    }
  }

  function removePattern(i: number) {
    setCollectFrom(p => p.filter((_, idx) => idx !== i));
  }

  const code = generateConfig(thresholds, reporters, collectFrom, outputDir, useTs, rootDir);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* Options row */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Coverage Output Dir</label>
          <input
            value={outputDir}
            onInput={e => setOutputDir((e.target as HTMLInputElement).value)}
            placeholder="coverage"
            class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Root Dir</label>
          <input
            value={rootDir}
            onInput={e => setRootDir((e.target as HTMLInputElement).value)}
            placeholder="."
            class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
          />
        </div>
        <div class="flex items-end">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useTs}
              onChange={e => setUseTs((e.target as HTMLInputElement).checked)}
              class="w-4 h-4 accent-primary"
            />
            <span class="text-sm font-medium">TypeScript (ts-jest)</span>
          </label>
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <label class="block text-sm font-medium mb-3">Coverage Thresholds</label>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['lines', 'functions', 'branches', 'statements'] as const).map(metric => (
            <div key={metric}>
              <div class="flex justify-between mb-1">
                <label class="text-sm capitalize">{metric}</label>
                <span class="text-sm text-primary font-mono">{thresholds[metric]}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="5"
                value={thresholds[metric]}
                onInput={e => setThresholds(t => ({ ...t, [metric]: parseInt((e.target as HTMLInputElement).value) }))}
                class="w-full accent-primary"
              />
            </div>
          ))}
        </div>
        <div class="mt-3 p-3 rounded-lg bg-bg border border-border flex gap-4 flex-wrap text-sm">
          {(['lines', 'functions', 'branches', 'statements'] as const).map(m => (
            <div key={m} class="flex items-center gap-2">
              <div class={`w-2 h-2 rounded-full ${thresholds[m] >= 90 ? 'bg-green-500' : thresholds[m] >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`} />
              <span class="capitalize text-text-muted">{m}: {thresholds[m]}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reporters */}
      <div>
        <label class="block text-sm font-medium mb-2">Coverage Reporters</label>
        <div class="flex flex-wrap gap-2">
          {(Object.entries(REPORTER_LABELS) as [Reporter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => toggleReporter(val)}
              class={`px-3 py-1.5 rounded-lg text-sm transition-colors ${reporters.includes(val) ? 'bg-primary text-white' : 'bg-bg border border-border text-text hover:border-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Collect from patterns */}
      <div>
        <label class="block text-sm font-medium mb-2">collectCoverageFrom Patterns</label>
        <div class="space-y-1.5 mb-2">
          {collectFrom.map((p, i) => (
            <div key={i} class="flex items-center gap-2">
              <code class="flex-1 px-3 py-1.5 rounded bg-bg border border-border text-text text-sm font-mono">{p}</code>
              <button onClick={() => removePattern(i)} class="text-red-400 hover:text-red-300 text-sm px-2">✕</button>
            </div>
          ))}
        </div>
        <div class="flex gap-2">
          <input
            value={newPattern}
            onInput={e => setNewPattern((e.target as HTMLInputElement).value)}
            onKeyDown={e => { if (e.key === 'Enter') addPattern(); }}
            placeholder="src/**/*.ts  or  !src/**/*.spec.ts"
            class="flex-1 px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
          />
          <button
            onClick={addPattern}
            class="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm"
          >
            Add
          </button>
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Generated jest.config.{useTs ? 'ts' : 'js'}</label>
          <button
            onClick={copy}
            class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-bg border border-border text-sm font-mono overflow-x-auto whitespace-pre">{code}</pre>
      </div>

      {/* Usage */}
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p class="font-medium mb-2">Run coverage</p>
        <div class="font-mono text-xs space-y-1 text-text-muted">
          <div>npx jest --coverage</div>
          <div>npx jest --coverage --coverageReporters=html</div>
          <div>open coverage/index.html  <span class="font-sans"># view HTML report</span></div>
        </div>
      </div>
    </div>
  );
}
