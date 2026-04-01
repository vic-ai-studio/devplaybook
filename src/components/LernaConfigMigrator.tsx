import { useState } from 'preact/hooks';

type Target = 'turborepo' | 'nx';

interface MigrationNote {
  field: string;
  lernaValue: string;
  status: 'migrated' | 'deprecated' | 'manual';
  note: string;
  turborepoEquiv?: string;
  nxEquiv?: string;
}

const SAMPLE_LERNA = `{
  "version": "independent",
  "npmClient": "npm",
  "useWorkspaces": true,
  "command": {
    "publish": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    },
    "bootstrap": {
      "hoist": true
    },
    "run": {
      "parallel": true
    }
  },
  "ignoreChanges": [
    "**/__tests__/**",
    "**/*.md"
  ],
  "packages": [
    "packages/*",
    "apps/*"
  ]
}`;

function analyzeLernaJson(raw: string): { parsed: Record<string, unknown> | null; notes: MigrationNote[] } {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { parsed: null, notes: [] };
  }

  const notes: MigrationNote[] = [];
  const cmd = (parsed.command as Record<string, Record<string, unknown>>) || {};

  if (parsed.version) {
    notes.push({
      field: 'version',
      lernaValue: String(parsed.version),
      status: 'migrated',
      note: 'Use Changesets for versioning. Both "fixed" and "independent" are supported.',
      turborepoEquiv: '@changesets/cli config',
      nxEquiv: '@nx/js:release config',
    });
  }

  if (parsed.npmClient) {
    notes.push({
      field: 'npmClient',
      lernaValue: String(parsed.npmClient),
      status: 'manual',
      note: `Set in root package.json or .npmrc. For pnpm: add "packageManager": "pnpm@9.x.x"`,
      turborepoEquiv: 'packageManager in package.json',
      nxEquiv: 'packageManager in package.json',
    });
  }

  if (parsed.useWorkspaces) {
    notes.push({
      field: 'useWorkspaces',
      lernaValue: 'true',
      status: 'migrated',
      note: 'Native workspaces are handled by your package manager (npm/yarn/pnpm). No special config needed.',
    });
  }

  if (cmd.bootstrap?.hoist) {
    notes.push({
      field: 'command.bootstrap.hoist',
      lernaValue: 'true',
      status: 'deprecated',
      note: 'lerna bootstrap is deprecated. Use package manager workspaces install. Hoisting is controlled by .npmrc or pnpm-workspace.yaml.',
      turborepoEquiv: 'pnpm install (handles hoisting natively)',
      nxEquiv: 'nx repair (handles workspace setup)',
    });
  }

  if (cmd.publish?.conventionalCommits) {
    notes.push({
      field: 'command.publish.conventionalCommits',
      lernaValue: 'true',
      status: 'migrated',
      note: 'Use Changesets with @changesets/changelog-github or conventional-changelog.',
      turborepoEquiv: '@changesets/changelog-github',
      nxEquiv: 'nx release with conventionalCommits: true',
    });
  }

  if (cmd.publish?.message) {
    notes.push({
      field: 'command.publish.message',
      lernaValue: String(cmd.publish.message),
      status: 'migrated',
      note: 'Set commit message in Changesets action: commit: "chore(release): publish"',
      turborepoEquiv: 'changesets/action commit field',
      nxEquiv: 'nx release git.commitMessage',
    });
  }

  if (cmd.run?.parallel) {
    notes.push({
      field: 'command.run.parallel',
      lernaValue: 'true',
      status: 'migrated',
      note: 'Turborepo and Nx both run tasks in parallel by default with smart dependency ordering.',
      turborepoEquiv: 'turbo run build (automatic)',
      nxEquiv: 'nx run-many -t build (automatic)',
    });
  }

  if (parsed.ignoreChanges) {
    const vals = Array.isArray(parsed.ignoreChanges) ? (parsed.ignoreChanges as string[]).join(', ') : String(parsed.ignoreChanges);
    notes.push({
      field: 'ignoreChanges',
      lernaValue: vals,
      status: 'migrated',
      note: 'In Turborepo, use inputs[] in turbo.json to exclude files from cache keys. In Nx, use namedInputs with exclusion patterns.',
      turborepoEquiv: 'inputs: ["!**/*.md", "!**/__tests__/**"]',
      nxEquiv: 'namedInputs production exclusions',
    });
  }

  if (parsed.packages) {
    const vals = Array.isArray(parsed.packages) ? (parsed.packages as string[]).join(', ') : String(parsed.packages);
    notes.push({
      field: 'packages',
      lernaValue: vals,
      status: 'migrated',
      note: 'Move to pnpm-workspace.yaml or package.json workspaces field.',
      turborepoEquiv: 'pnpm-workspace.yaml packages:',
      nxEquiv: 'nx.json with project discovery',
    });
  }

  return { parsed, notes };
}

function generateTurborepoConfig(parsed: Record<string, unknown> | null): string {
  const cmd = ((parsed?.command as Record<string, Record<string, unknown>>) || {});
  const ignoreChanges = (parsed?.ignoreChanges as string[]) || [];
  const excludeInputs = ignoreChanges.map((p: string) => `!${p}`);

  return JSON.stringify({
    $schema: 'https://turbo.build/schema.json',
    pipeline: {
      build: {
        dependsOn: ['^build'],
        outputs: ['dist/**', '.next/**'],
        inputs: ['src/**', 'tsconfig.json', ...excludeInputs].filter(Boolean),
      },
      test: {
        dependsOn: ['build'],
        inputs: ['src/**', '**/*.test.ts', ...excludeInputs].filter(Boolean),
        outputs: ['coverage/**'],
      },
      lint: {
        inputs: ['src/**', '.eslintrc*'],
      },
    },
    // Note: Publishing → use @changesets/cli
    // Note: Versioning strategy was: ${parsed?.version || 'independent'}
  }, null, 2);
}

function generateNxConfig(parsed: Record<string, unknown> | null): string {
  const version = String(parsed?.version || 'independent');
  return JSON.stringify({
    $schema: './node_modules/nx/schemas/nx-schema.json',
    affected: { defaultBase: 'main' },
    tasksRunnerOptions: {
      default: {
        runner: 'nx/tasks-runners/default',
        options: { cacheableOperations: ['build', 'test', 'lint', 'typecheck'] },
      },
    },
    targetDefaults: {
      build: { dependsOn: ['^build'], inputs: ['production', '^production'] },
      test: { inputs: ['default', '^production'] },
    },
    release: {
      versioning: {
        generatorOptions: { currentVersionResolver: 'git-tag' },
      },
      changelog: { workspaceChangelog: true },
      git: {
        commitMessage: 'chore(release): publish',
        tagPattern: '{projectName}@{version}',
      },
      // Migrated from lerna "version": "${version}"
    },
  }, null, 2);
}

export default function LernaConfigMigrator() {
  const [input, setInput] = useState(SAMPLE_LERNA);
  const [target, setTarget] = useState<Target>('turborepo');
  const [copied, setCopied] = useState('');

  const { parsed, notes } = analyzeLernaJson(input);
  const turboOutput = generateTurborepoConfig(parsed);
  const nxOutput = generateNxConfig(parsed);
  const output = target === 'turborepo' ? turboOutput : nxOutput;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const STATUS_STYLES: Record<string, string> = {
    migrated: 'bg-green-500/10 border-green-500/20 text-green-400',
    deprecated: 'bg-red-500/10 border-red-500/20 text-red-400',
    manual: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  };
  const STATUS_LABELS: Record<string, string> = {
    migrated: 'Auto-migrated',
    deprecated: 'Deprecated',
    manual: 'Manual action needed',
  };

  return (
    <div class="space-y-4">
      {/* Target toggle */}
      <div class="flex items-center gap-4 flex-wrap">
        <span class="text-sm text-text-muted">Migrate to:</span>
        <div class="flex gap-1 p-1 bg-surface rounded-lg border border-border">
          {(['turborepo', 'nx'] as Target[]).map(t => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              class={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${target === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
            >
              {t === 'turborepo' ? 'Turborepo' : 'Nx'}
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input */}
        <div class="space-y-2">
          <label class="block text-sm text-text-muted font-medium">Paste your <code class="font-mono">lerna.json</code>:</label>
          <textarea
            rows={16}
            value={input}
            onInput={(e: Event) => setInput((e.target as HTMLTextAreaElement).value)}
            class="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm font-mono text-text focus:outline-none focus:border-primary resize-none"
            spellcheck={false}
          />
          {parsed === null && input.trim() && (
            <p class="text-xs text-red-400">Invalid JSON — check syntax</p>
          )}
        </div>

        {/* Output */}
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <label class="text-sm text-text-muted font-medium">
              Generated <code class="font-mono">{target === 'turborepo' ? 'turbo.json' : 'nx.json'}</code>:
            </label>
            <button onClick={() => copy(output, 'output')} class="text-xs px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90">
              {copied === 'output' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-relaxed h-[340px] overflow-y-auto">{output}</pre>
        </div>
      </div>

      {/* Migration notes */}
      {notes.length > 0 && (
        <div class="space-y-3">
          <p class="text-sm font-semibold text-text">Migration field map ({notes.length} fields)</p>
          <div class="space-y-2">
            {notes.map((note, i) => (
              <div key={i} class={`border rounded-lg p-3 ${STATUS_STYLES[note.status]}`}>
                <div class="flex items-start gap-3 flex-wrap">
                  <code class="font-mono text-sm font-semibold">{note.field}</code>
                  <span class="text-xs border rounded px-1.5 py-0.5">{STATUS_LABELS[note.status]}</span>
                </div>
                <p class="text-xs mt-1 text-text-muted leading-relaxed">{note.note}</p>
                {target === 'turborepo' && note.turborepoEquiv && (
                  <p class="text-xs mt-1"><span class="opacity-70">Turborepo: </span><code class="font-mono bg-black/20 px-1 rounded">{note.turborepoEquiv}</code></p>
                )}
                {target === 'nx' && note.nxEquiv && (
                  <p class="text-xs mt-1"><span class="opacity-70">Nx: </span><code class="font-mono bg-black/20 px-1 rounded">{note.nxEquiv}</code></p>
                )}
              </div>
            ))}
          </div>

          <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 space-y-1">
            <p class="font-semibold">Next steps:</p>
            {target === 'turborepo' ? (
              <>
                <p>1. <code class="font-mono">npx create-turbo@latest</code> or add <code class="font-mono">pnpm add -D turbo</code></p>
                <p>2. Add <code class="font-mono">turbo.json</code> to repo root</p>
                <p>3. Add <code class="font-mono">pnpm add -D @changesets/cli</code> for versioning</p>
                <p>4. Run <code class="font-mono">turbo run build</code> to test</p>
              </>
            ) : (
              <>
                <p>1. <code class="font-mono">npx nx@latest init</code> — auto-detects your repo</p>
                <p>2. Review generated <code class="font-mono">nx.json</code> and <code class="font-mono">project.json</code> files</p>
                <p>3. Run <code class="font-mono">nx graph</code> to verify project detection</p>
                <p>4. Run <code class="font-mono">nx affected --target=build</code></p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
