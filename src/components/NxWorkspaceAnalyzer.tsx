import { useState } from 'preact/hooks';

const PRESETS: Record<string, object> = {
  'React + Node': {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    npmScope: 'myorg',
    affected: { defaultBase: 'main' },
    tasksRunnerOptions: {
      default: {
        runner: 'nx/tasks-runners/default',
        options: { cacheableOperations: ['build', 'test', 'lint', 'typecheck'] },
      },
    },
    targetDefaults: {
      build: { dependsOn: ['^build'], inputs: ['production', '^production'] },
      test: { inputs: ['default', '^production', '{workspaceRoot}/jest.preset.js'] },
      lint: { inputs: ['default', '{workspaceRoot}/.eslintrc.json'] },
    },
    namedInputs: {
      default: ['{projectRoot}/**/*', 'sharedGlobals'],
      production: ['default', '!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)', '!{projectRoot}/src/test-setup.[jt]s?(x)'],
      sharedGlobals: [],
    },
  },
  Minimal: {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    affected: { defaultBase: 'main' },
    tasksRunnerOptions: {
      default: {
        runner: 'nx/tasks-runners/default',
        options: { cacheableOperations: ['build', 'test', 'lint'] },
      },
    },
  },
  'Full-stack + Cache': {
    $schema: './node_modules/nx/schemas/nx-schema.json',
    npmScope: 'corp',
    affected: { defaultBase: 'main' },
    nxCloudId: 'YOUR_NX_CLOUD_ID',
    tasksRunnerOptions: {
      default: {
        runner: 'nx-cloud',
        options: {
          cacheableOperations: ['build', 'test', 'lint', 'typecheck', 'e2e', 'storybook:build'],
          accessToken: 'YOUR_ACCESS_TOKEN',
        },
      },
    },
    targetDefaults: {
      build: { dependsOn: ['^build'] },
      e2e: { dependsOn: ['build'] },
    },
  },
};

function analyzeNxJson(raw: string): { valid: boolean; errors: string[]; stats: Record<string, string | number> } {
  const errors: string[] = [];
  const stats: Record<string, string | number> = {};
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { valid: false, errors: ['Invalid JSON — check syntax'], stats: {} };
  }

  if (!parsed.affected) errors.push('Missing affected config — add defaultBase for branch detection');
  if (!parsed.tasksRunnerOptions) errors.push('No tasksRunnerOptions — caching will not work');

  const runner = (parsed.tasksRunnerOptions as Record<string, { runner?: string; options?: { cacheableOperations?: string[] } }> | undefined)?.default;
  if (runner) {
    stats['Runner'] = (runner.runner as string) || 'unknown';
    const ops = runner.options?.cacheableOperations || [];
    stats['Cached operations'] = ops.length ? ops.join(', ') : 'none';
  }
  const affected = parsed.affected as { defaultBase?: string } | undefined;
  stats['Default base branch'] = affected?.defaultBase || 'not set';
  stats['Nx Cloud'] = parsed.nxCloudId ? 'Enabled' : 'Not configured';
  const td = Object.keys((parsed.targetDefaults as Record<string, unknown>) || {});
  stats['Target defaults'] = td.length ? td.join(', ') : 'none';

  return { valid: errors.length === 0, errors, stats };
}

function generateRecommended(base: object): string {
  return JSON.stringify(base, null, 2);
}

export default function NxWorkspaceAnalyzer() {
  const [mode, setMode] = useState<'analyze' | 'generate'>('generate');
  const [input, setInput] = useState(JSON.stringify(PRESETS['React + Node'], null, 2));
  const [preset, setPreset] = useState('React + Node');
  const [copied, setCopied] = useState(false);

  const analysis = analyzeNxJson(input);
  const generatedOutput = generateRecommended(PRESETS[preset] || PRESETS['Minimal']);

  const applyPreset = (name: string) => {
    setPreset(name);
    setInput(JSON.stringify(PRESETS[name] || PRESETS['Minimal'], null, 2));
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-4">
      {/* Mode toggle */}
      <div class="flex gap-1 p-1 bg-surface rounded-lg w-fit border border-border">
        {(['generate', 'analyze'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            class={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
          >
            {m === 'generate' ? 'Generate Config' : 'Analyze nx.json'}
          </button>
        ))}
      </div>

      {mode === 'generate' && (
        <div class="space-y-4">
          <div>
            <p class="text-sm text-text-muted mb-2">Choose a preset template:</p>
            <div class="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map(name => (
                <button
                  key={name}
                  onClick={() => applyPreset(name)}
                  class={`px-3 py-1.5 rounded border text-sm transition-colors ${preset === name ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:border-primary/50 hover:text-text'}`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries((PRESETS[preset] as Record<string, unknown>)).map(([key, val]) => (
              <div key={key} class="bg-surface border border-border rounded-lg p-3">
                <p class="text-xs font-semibold text-primary mb-1 font-mono">{key}</p>
                <p class="text-xs text-text-muted break-all">
                  {typeof val === 'object' ? JSON.stringify(val).slice(0, 80) + (JSON.stringify(val).length > 80 ? '…' : '') : String(val)}
                </p>
              </div>
            ))}
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <p class="text-xs text-text-muted font-mono">nx.json</p>
              <button onClick={() => copyText(generatedOutput)} class="text-xs px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre">{generatedOutput}</pre>
          </div>
        </div>
      )}

      {mode === 'analyze' && (
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-text-muted mb-2">Paste your <code class="font-mono">nx.json</code> content:</label>
            <textarea
              rows={12}
              value={input}
              onInput={(e: Event) => setInput((e.target as HTMLTextAreaElement).value)}
              class="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm font-mono text-text focus:outline-none focus:border-primary resize-y"
              placeholder='{ "$schema": "./node_modules/nx/schemas/nx-schema.json", ... }'
            />
          </div>

          <div class={`border rounded-lg p-4 ${analysis.valid ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <div class="flex items-center gap-2 mb-3">
              <span class={`text-sm font-semibold ${analysis.valid ? 'text-green-400' : 'text-red-400'}`}>
                {analysis.valid ? '✓ Config looks good' : '✗ Issues found'}
              </span>
            </div>

            {analysis.errors.length > 0 && (
              <ul class="space-y-1 mb-3">
                {analysis.errors.map((err, i) => (
                  <li key={i} class="text-sm text-red-300 flex items-start gap-2">
                    <span class="mt-0.5">⚠</span>
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            )}

            {Object.keys(analysis.stats).length > 0 && (
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(analysis.stats).map(([k, v]) => (
                  <div key={k} class="bg-surface/50 rounded p-2">
                    <p class="text-xs text-text-muted">{k}</p>
                    <p class="text-sm text-text font-medium">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 space-y-1">
            <p class="font-semibold">Common nx commands:</p>
            <p>• <code class="font-mono bg-blue-500/20 px-1 rounded">nx affected --target=test</code> — run tests only for affected projects</p>
            <p>• <code class="font-mono bg-blue-500/20 px-1 rounded">nx graph</code> — visualize project dependency graph</p>
            <p>• <code class="font-mono bg-blue-500/20 px-1 rounded">nx reset</code> — clear local cache</p>
          </div>
        </div>
      )}
    </div>
  );
}
