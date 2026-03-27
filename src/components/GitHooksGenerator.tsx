import { useState } from 'preact/hooks';

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun';
type HookType = 'pre-commit' | 'pre-push' | 'commit-msg';

interface LintStagedPattern {
  pattern: string;
  commands: string[];
  enabled: boolean;
}

interface HookConfig {
  enabled: boolean;
  type: HookType;
  commands: string[];
}

interface GitHooksConfig {
  packageManager: PackageManager;
  huskyVersion: '9' | '8';
  hooks: HookConfig[];
  lintStaged: LintStagedPattern[];
  commitMsgPattern: string;
  useLintStaged: boolean;
  addHuskyInstall: boolean;
  useConventionalCommits: boolean;
}

const DEFAULT: GitHooksConfig = {
  packageManager: 'npm',
  huskyVersion: '9',
  hooks: [
    {
      enabled: true,
      type: 'pre-commit',
      commands: ['npx lint-staged'],
    },
    {
      enabled: false,
      type: 'pre-push',
      commands: ['npm run typecheck', 'npm run test'],
    },
    {
      enabled: false,
      type: 'commit-msg',
      commands: ['npx --no -- commitlint --edit "$1"'],
    },
  ],
  lintStaged: [
    { pattern: '*.{ts,tsx}', commands: ['eslint --fix', 'prettier --write'], enabled: true },
    { pattern: '*.{js,jsx}', commands: ['eslint --fix'], enabled: false },
    { pattern: '*.{css,scss}', commands: ['prettier --write'], enabled: false },
    { pattern: '*.{json,md,yaml,yml}', commands: ['prettier --write'], enabled: false },
  ],
  commitMsgPattern: '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\\(.+\\))?: .{1,100}',
  useLintStaged: true,
  addHuskyInstall: true,
  useConventionalCommits: false,
};

interface OutputFile {
  name: string;
  path: string;
  content: string;
}

function buildHuskyV9Script(commands: string[]): string {
  return '#!/usr/bin/env sh\n. "$(dirname -- "$0")/_/husky.sh"\n\n' + commands.join('\n');
}

function buildHuskyV8Script(commands: string[]): string {
  return '#!/bin/sh\n. "$(dirname "$0")/_/husky.sh"\n\n' + commands.join('\n');
}

function buildOutputFiles(cfg: GitHooksConfig): OutputFile[] {
  const files: OutputFile[] = [];
  const pm = cfg.packageManager;
  const runCmd = pm === 'npm' ? 'npm run' : pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm run' : 'bun run';
  const exec = pm === 'npm' ? 'npx' : pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm exec' : 'bunx';

  // Husky hook files
  for (const hook of cfg.hooks) {
    if (!hook.enabled) continue;
    const cmds = hook.commands.map(c =>
      c.replace(/npx /g, exec + ' ')
        .replace(/npm run /g, runCmd + ' ')
    );
    const content = cfg.huskyVersion === '9'
      ? buildHuskyV9Script(cmds)
      : buildHuskyV8Script(cmds);

    files.push({
      name: `.husky/${hook.type}`,
      path: `.husky/${hook.type}`,
      content,
    });
  }

  // lint-staged config
  if (cfg.useLintStaged) {
    const patterns = cfg.lintStaged.filter(p => p.enabled);
    if (patterns.length) {
      const lsConfig: Record<string, string[]> = {};
      for (const p of patterns) {
        lsConfig[p.pattern] = p.commands;
      }
      files.push({
        name: '.lintstagedrc.json',
        path: '.lintstagedrc.json',
        content: JSON.stringify(lsConfig, null, 2),
      });
    }
  }

  // commit-msg regex hint
  if (cfg.useConventionalCommits) {
    const commitMsgHook = cfg.hooks.find(h => h.type === 'commit-msg' && h.enabled);
    if (!commitMsgHook) {
      // If commit-msg hook not enabled but conventional commits is on, show a note
      files.push({
        name: 'commit-msg (pattern reference)',
        path: '.commitlintrc.json',
        content: JSON.stringify({
          extends: ['@commitlint/config-conventional'],
        }, null, 2),
      });
    }
  }

  // package.json prepare script
  const prepareScript = cfg.huskyVersion === '9' ? 'husky' : 'husky install';
  const installCmds = [
    `# 1. Install dependencies`,
    `${pm === 'npm' ? 'npm install -D' : pm === 'yarn' ? 'yarn add -D' : pm === 'pnpm' ? 'pnpm add -D' : 'bun add -D'} husky${cfg.useLintStaged ? ' lint-staged' : ''}`,
    ``,
    `# 2. Initialize husky`,
    cfg.huskyVersion === '9' ? `${exec} husky init` : `${exec} husky install`,
    ``,
    `# 3. Add to package.json (if not using husky init)`,
    `# "prepare": "${prepareScript}"`,
  ];

  files.push({
    name: 'setup-commands.sh',
    path: 'setup-commands.sh (run these once)',
    content: installCmds.join('\n'),
  });

  return files;
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
        <span class="text-sm">{label}</span>
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

export default function GitHooksGenerator() {
  const [cfg, setCfg] = useState<GitHooksConfig>(DEFAULT);
  const [activeFile, setActiveFile] = useState(0);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const set = (key: keyof GitHooksConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  const toggleHook = (type: HookType) => {
    setCfg(prev => ({
      ...prev,
      hooks: prev.hooks.map(h => h.type === type ? { ...h, enabled: !h.enabled } : h),
    }));
  };

  const setHookCommands = (type: HookType, raw: string) => {
    setCfg(prev => ({
      ...prev,
      hooks: prev.hooks.map(h => h.type === type ? { ...h, commands: raw.split('\n').filter(Boolean) } : h),
    }));
  };

  const toggleLsPattern = (pattern: string) => {
    setCfg(prev => ({
      ...prev,
      lintStaged: prev.lintStaged.map(p => p.pattern === pattern ? { ...p, enabled: !p.enabled } : p),
    }));
  };

  const setLsCommands = (pattern: string, raw: string) => {
    setCfg(prev => ({
      ...prev,
      lintStaged: prev.lintStaged.map(p => p.pattern === pattern ? { ...p, commands: raw.split(',').map(s => s.trim()).filter(Boolean) } : p),
    }));
  };

  const files = buildOutputFiles(cfg);
  const currentFile = files[activeFile] || files[0];

  const handleCopy = (idx: number) => {
    const file = files[idx];
    if (!file) return;
    navigator.clipboard.writeText(file.content).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-4">
        {/* Setup */}
        <Section title="Setup">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">Package manager</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.packageManager} onChange={e => set('packageManager', (e.target as HTMLSelectElement).value)}>
                {(['npm','yarn','pnpm','bun'] as PackageManager[]).map(pm => <option key={pm} value={pm}>{pm}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Husky version</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={cfg.huskyVersion} onChange={e => set('huskyVersion', (e.target as HTMLSelectElement).value)}>
                <option value="9">v9 (latest)</option>
                <option value="8">v8 (legacy)</option>
              </select>
            </div>
          </div>
          <Toggle checked={cfg.useLintStaged} onChange={v => set('useLintStaged', v)} label="Use lint-staged" doc="Run linters only on staged files — much faster than linting the whole project." />
          <Toggle checked={cfg.useConventionalCommits} onChange={v => set('useConventionalCommits', v)} label="Conventional Commits" doc="Enforce feat/fix/docs/chore commit message format using commitlint." />
        </Section>

        {/* Git Hooks */}
        <Section title="Git Hooks">
          {cfg.hooks.map(hook => (
            <div key={hook.type} class="space-y-2">
              <Toggle
                checked={hook.enabled}
                onChange={() => toggleHook(hook.type)}
                label={hook.type}
                doc={
                  hook.type === 'pre-commit' ? 'Runs before git commit is created. Ideal for linting and formatting.' :
                  hook.type === 'pre-push' ? 'Runs before git push. Use for tests and type checks.' :
                  'Validates the commit message format.'
                }
              />
              {hook.enabled && (
                <div>
                  <label class="text-xs text-text-muted block mb-1">Commands (one per line)</label>
                  <textarea
                    class="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono resize-none"
                    rows={hook.commands.length + 1}
                    value={hook.commands.join('\n')}
                    onInput={e => setHookCommands(hook.type, (e.target as HTMLTextAreaElement).value)}
                  />
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* lint-staged Patterns */}
        {cfg.useLintStaged && (
          <Section title="lint-staged Patterns">
            {cfg.lintStaged.map(p => (
              <div key={p.pattern} class="space-y-1">
                <Toggle
                  checked={p.enabled}
                  onChange={() => toggleLsPattern(p.pattern)}
                  label={p.pattern}
                />
                {p.enabled && (
                  <div>
                    <label class="text-xs text-text-muted block mb-1">Commands (comma-separated)</label>
                    <input
                      class="w-full bg-bg border border-border rounded px-2 py-1 text-xs font-mono"
                      value={p.commands.join(', ')}
                      onInput={e => setLsCommands(p.pattern, (e.target as HTMLInputElement).value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex flex-wrap gap-1">
          {files.map((f, i) => (
            <button
              key={f.path}
              onClick={() => setActiveFile(i)}
              class={`px-2 py-1 rounded text-xs font-mono transition-colors ${i === activeFile ? 'bg-accent text-white' : 'bg-surface border border-border hover:border-accent/50'}`}
            >
              {f.name}
            </button>
          ))}
        </div>
        {currentFile && (
          <>
            <div class="flex items-center justify-between">
              <span class="text-xs text-text-muted font-mono">{currentFile.path}</span>
              <button
                onClick={() => handleCopy(activeFile)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copiedIdx === activeFile ? 'bg-green-600 text-white' : 'bg-accent text-white hover:bg-accent/90'}`}
              >
                {copiedIdx === activeFile ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[500px] text-green-400 whitespace-pre leading-relaxed">{currentFile.content}</pre>
          </>
        )}
        <div class="bg-surface border border-border rounded p-3 text-xs text-text-muted space-y-1">
          <p class="font-semibold text-sm">Quick Start</p>
          <p>1. Install husky + lint-staged (see setup-commands.sh)</p>
          <p>2. Copy each .husky/ file to your project root</p>
          <p>3. Run <code class="bg-bg px-1 rounded">chmod +x .husky/*</code> on macOS/Linux</p>
          <p>4. Copy .lintstagedrc.json to project root</p>
          <p>5. Commit something to test the hooks fire</p>
        </div>
      </div>
    </div>
  );
}
