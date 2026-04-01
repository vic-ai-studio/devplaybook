import { useState } from 'preact/hooks';

type PackageType = 'frontend' | 'backend' | 'shared' | 'types' | 'cli' | 'docs';

interface PackageConfig {
  type: PackageType;
  name: string;
  enabled: boolean;
  framework: string;
}

interface WorkspaceConfig {
  workspaceName: string;
  packages: PackageConfig[];
  typescript: boolean;
  tsStrict: boolean;
  useBunLock: boolean;
  testRunner: 'bun' | 'vitest' | 'jest';
  buildTool: 'bun' | 'vite' | 'tsup';
  nodeLinker: 'bun' | 'hoisted' | 'isolated';
  addHusky: boolean;
  addLint: boolean;
}

const PACKAGE_DEFAULTS: Record<PackageType, { framework: string; frameworks: string[] }> = {
  frontend: { framework: 'react', frameworks: ['react', 'vue', 'svelte', 'solid', 'vanilla'] },
  backend: { framework: 'hono', frameworks: ['hono', 'elysia', 'express', 'fastify', 'none'] },
  shared: { framework: 'utils', frameworks: ['utils', 'config', 'hooks'] },
  types: { framework: 'types', frameworks: ['types'] },
  cli: { framework: 'none', frameworks: ['none', 'commander', 'citty'] },
  docs: { framework: 'astro', frameworks: ['astro', 'vitepress', 'nextra'] },
};

function generateRootPackageJson(cfg: WorkspaceConfig): string {
  const enabledPkgs = cfg.packages.filter(p => p.enabled);
  const workspaces = enabledPkgs.map(p => `packages/${p.name}`);

  const scripts: Record<string, string> = {
    build: 'bun run --filter \'*\' build',
    dev: 'bun run --filter \'*\' dev',
    test: cfg.testRunner === 'bun' ? 'bun test' : `bun run --filter \'*\' test`,
    lint: cfg.addLint ? 'bun run --filter \'*\' lint' : 'echo "no linter configured"',
    typecheck: cfg.typescript ? 'bun run --filter \'*\' typecheck' : 'echo "no TypeScript"',
    clean: 'bun run --filter \'*\' clean',
    'install:all': 'bun install',
  };

  const devDeps: Record<string, string> = {};
  if (cfg.typescript) devDeps['typescript'] = '^5.4.0';
  if (cfg.addLint) {
    devDeps['eslint'] = '^9.0.0';
    devDeps['@typescript-eslint/eslint-plugin'] = '^7.0.0';
    devDeps['@typescript-eslint/parser'] = '^7.0.0';
  }
  if (cfg.testRunner === 'vitest') devDeps['vitest'] = '^1.4.0';
  if (cfg.addHusky) {
    devDeps['husky'] = '^9.0.0';
    devDeps['lint-staged'] = '^15.0.0';
  }

  const obj: any = {
    name: cfg.workspaceName || 'my-workspace',
    private: true,
    workspaces,
    scripts,
    devDependencies: devDeps,
  };

  if (cfg.addHusky) {
    obj['lint-staged'] = {
      '*.{ts,tsx,js,jsx}': ['eslint --fix', 'bun run fmt'],
    };
    obj.husky = {
      hooks: {
        'pre-commit': 'lint-staged',
        'commit-msg': 'bun run validate-commit',
      },
    };
  }

  return JSON.stringify(obj, null, 2);
}

function generateBunfigToml(cfg: WorkspaceConfig): string {
  return `# bunfig.toml — Bun workspace configuration

[install]
# Package manager behavior
${cfg.useBunLock ? '# Using bun.lock (default)' : '# package-lock.json compatibility mode\nproduction = false'}
optional = true
peer = true
dev = true

# Scoped registry overrides
[install.scopes]
# "@myorg" = "https://registry.myorg.com"

[test]
# Test runner configuration
${cfg.testRunner === 'bun' ? `preload = []
timeout = 5000
coverage = false` : `# Using ${cfg.testRunner} — not bun test`}

[run]
# Runtime defaults
silent = false
bun = true  # prefer bun over node

[debug]
# macros = true  # enable Bun macros

# ─── CLI Quick Reference ──────────────────────────────────────────
# Install all deps:          bun install
# Add to root:               bun add -W <package>
# Add to specific package:   bun add --cwd packages/frontend <package>
# Run workspace script:      bun run --filter "frontend" dev
# Run all:                   bun run --filter "*" build
# Link local packages:       workspaces auto-resolved via package.json
`;
}

function generateTsConfig(cfg: WorkspaceConfig): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      lib: ['ESNext', 'DOM'],
      strict: cfg.tsStrict,
      noImplicitAny: cfg.tsStrict,
      strictNullChecks: cfg.tsStrict,
      exactOptionalPropertyTypes: cfg.tsStrict,
      noUncheckedIndexedAccess: cfg.tsStrict,
      allowImportingTsExtensions: true,
      verbatimModuleSyntax: true,
      jsx: 'react-jsx',
      baseUrl: '.',
      paths: {
        '@/*': ['./src/*'],
      },
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
    },
    exclude: ['node_modules', 'dist', 'build'],
    references: cfg.packages.filter(p => p.enabled).map(p => ({ path: `./packages/${p.name}` })),
  }, null, 2);
}

function generatePackageJson(pkg: PackageConfig, cfg: WorkspaceConfig): string {
  const name = `@${cfg.workspaceName || 'workspace'}/${pkg.name}`;
  const deps: Record<string, string> = {};
  const devDeps: Record<string, string> = {};

  // Framework dependencies
  if (pkg.type === 'frontend') {
    if (pkg.framework === 'react') {
      deps['react'] = '^18.3.0';
      deps['react-dom'] = '^18.3.0';
      devDeps['@types/react'] = '^18.3.0';
      devDeps['@types/react-dom'] = '^18.3.0';
    }
    if (cfg.buildTool === 'vite') devDeps['vite'] = '^5.2.0';
  }
  if (pkg.type === 'backend') {
    if (pkg.framework === 'hono') deps['hono'] = '^4.3.0';
    if (pkg.framework === 'elysia') deps['elysia'] = '^1.1.0';
    if (pkg.framework === 'express') { deps['express'] = '^4.19.0'; devDeps['@types/express'] = '^4.17.0'; }
  }
  if (pkg.type === 'shared' || pkg.type === 'types') {
    devDeps['typescript'] = '^5.4.0';
  }

  const scripts: Record<string, string> = {};

  if (pkg.type === 'frontend') {
    if (cfg.buildTool === 'vite') {
      scripts['dev'] = 'vite';
      scripts['build'] = 'vite build';
      scripts['preview'] = 'vite preview';
    } else {
      scripts['dev'] = 'bun run --hot src/index.ts';
      scripts['build'] = 'bun build src/index.ts --outdir dist --target browser';
    }
  } else if (pkg.type === 'backend') {
    scripts['dev'] = 'bun run --hot src/index.ts';
    scripts['build'] = cfg.buildTool === 'tsup' ? 'tsup src/index.ts' : 'bun build src/index.ts --outdir dist --target bun';
    scripts['start'] = 'bun run dist/index.js';
  } else {
    scripts['build'] = cfg.buildTool === 'tsup' ? 'tsup src/index.ts' : 'bun build src/index.ts --outdir dist';
    scripts['dev'] = 'bun run --watch src/index.ts';
  }

  if (cfg.typescript) scripts['typecheck'] = 'tsc --noEmit';
  if (cfg.testRunner === 'bun') scripts['test'] = 'bun test';
  else if (cfg.testRunner === 'vitest') scripts['test'] = 'vitest';
  scripts['clean'] = 'rm -rf dist node_modules';
  if (cfg.addLint) scripts['lint'] = 'eslint src --ext .ts,.tsx --fix';

  return JSON.stringify({
    name,
    version: '0.1.0',
    private: pkg.type !== 'shared' && pkg.type !== 'types',
    main: './dist/index.js',
    module: './dist/index.mjs',
    types: cfg.typescript ? './dist/index.d.ts' : undefined,
    scripts,
    dependencies: Object.keys(deps).length > 0 ? deps : undefined,
    devDependencies: Object.keys(devDeps).length > 0 ? devDeps : undefined,
  }, null, 2);
}

function generateInstallCommands(cfg: WorkspaceConfig): string {
  const enabledPkgs = cfg.packages.filter(p => p.enabled);
  const lines: string[] = [];

  lines.push('# ─── Setup Commands ──────────────────────────────────────────');
  lines.push('');
  lines.push('# 1. Install all workspace dependencies');
  lines.push('bun install');
  lines.push('');
  lines.push('# 2. Install with specific flags');
  lines.push('bun install --frozen-lockfile    # CI: fail if lockfile would change');
  lines.push('bun install --production          # skip devDeps');
  lines.push('bun install --no-save             # install but don\'t update package.json');
  lines.push('');
  lines.push('# 3. Add package to specific workspace');
  enabledPkgs.forEach(p => {
    lines.push(`bun add --cwd packages/${p.name} <package-name>`);
  });
  lines.push('');
  lines.push('# 4. Add to root (shared across all workspaces)');
  lines.push('bun add -W <package-name>');
  lines.push('');
  lines.push('# 5. Run scripts across all workspaces');
  lines.push('bun run --filter \'*\' build');
  lines.push('bun run --filter \'*\' test');
  lines.push('');
  lines.push('# 6. Run script in specific workspace');
  if (enabledPkgs.length > 0) {
    lines.push(`bun run --filter '${enabledPkgs[0].name}' dev`);
  }
  lines.push('');
  if (cfg.buildTool === 'tsup') {
    lines.push('# 7. tsup build flags');
    lines.push('bun add -D tsup');
    lines.push('# tsup.config.ts: { entry: ["src/index.ts"], format: ["cjs","esm"], dts: true }');
  }
  if (cfg.typescript) {
    lines.push('');
    lines.push('# TypeScript project references build');
    lines.push('bun x tsc --build tsconfig.json');
  }
  return lines.join('\n');
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-bg border border-border text-text-muted hover:border-primary hover:text-primary'}`}
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

function CodeFile({ title, code }: { title: string; code: string }) {
  return (
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
        <span class="text-xs font-mono text-text-muted">{title}</span>
        <CopyButton value={code} />
      </div>
      <pre class="px-4 py-3 text-xs font-mono text-green-300 bg-gray-950 overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

export default function BunWorkspaceGenerator() {
  const [cfg, setCfg] = useState<WorkspaceConfig>({
    workspaceName: 'my-monorepo',
    packages: [
      { type: 'frontend', name: 'web', enabled: true, framework: 'react' },
      { type: 'backend', name: 'api', enabled: true, framework: 'hono' },
      { type: 'shared', name: 'shared', enabled: true, framework: 'utils' },
      { type: 'types', name: 'types', enabled: false, framework: 'types' },
      { type: 'cli', name: 'cli', enabled: false, framework: 'none' },
      { type: 'docs', name: 'docs', enabled: false, framework: 'astro' },
    ],
    typescript: true,
    tsStrict: true,
    useBunLock: true,
    testRunner: 'bun',
    buildTool: 'bun',
    nodeLinker: 'bun',
    addHusky: false,
    addLint: false,
  });

  const [activeTab, setActiveTab] = useState<'root' | 'bunfig' | 'tsconfig' | 'packages' | 'commands'>('root');

  const set = (field: keyof WorkspaceConfig, value: any) => setCfg(prev => ({ ...prev, [field]: value }));

  const togglePkg = (type: PackageType) => setCfg(prev => ({
    ...prev,
    packages: prev.packages.map(p => p.type === type ? { ...p, enabled: !p.enabled } : p),
  }));

  const updatePkgName = (type: PackageType, name: string) => setCfg(prev => ({
    ...prev,
    packages: prev.packages.map(p => p.type === type ? { ...p, name: name.toLowerCase().replace(/[^a-z0-9-]/g, '-') } : p),
  }));

  const enabledPkgs = cfg.packages.filter(p => p.enabled);

  const TABS = [
    { key: 'root', label: 'package.json' },
    { key: 'bunfig', label: 'bunfig.toml' },
    ...(cfg.typescript ? [{ key: 'tsconfig', label: 'tsconfig.json' }] : []),
    { key: 'packages', label: 'Packages' },
    { key: 'commands', label: 'Commands' },
  ] as const;

  return (
    <div class="space-y-4">
      {/* Config */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-semibold">Workspace Configuration</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Workspace Name (scope)</label>
            <input
              type="text"
              value={cfg.workspaceName}
              onInput={(e: any) => set('workspaceName', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="my-monorepo"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
            <p class="text-xs text-text-muted mt-1">Package scope: @{cfg.workspaceName || 'workspace'}/...</p>
          </div>
          <div class="space-y-2">
            <label class="block text-xs text-text-muted mb-1">Options</label>
            <div class="grid grid-cols-2 gap-2">
              {([
                { key: 'typescript', label: 'TypeScript' },
                { key: 'tsStrict', label: 'TS Strict Mode' },
                { key: 'useBunLock', label: 'bun.lock' },
                { key: 'addHusky', label: 'Husky Hooks' },
                { key: 'addLint', label: 'ESLint' },
              ] as { key: keyof WorkspaceConfig; label: string }[]).map(({ key, label }) => (
                <label key={key} class="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg[key] as boolean}
                    onChange={(e: any) => set(key, e.target.checked)}
                    class="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Tooling selects */}
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Test Runner</label>
            <select
              value={cfg.testRunner}
              onChange={(e: any) => set('testRunner', e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="bun">bun test</option>
              <option value="vitest">vitest</option>
              <option value="jest">jest</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Build Tool</label>
            <select
              value={cfg.buildTool}
              onChange={(e: any) => set('buildTool', e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="bun">bun build</option>
              <option value="vite">vite</option>
              <option value="tsup">tsup</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Node Linker</label>
            <select
              value={cfg.nodeLinker}
              onChange={(e: any) => set('nodeLinker', e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary"
            >
              <option value="bun">bun (default)</option>
              <option value="hoisted">hoisted</option>
              <option value="isolated">isolated</option>
            </select>
          </div>
        </div>

        {/* Package toggles */}
        <div>
          <label class="block text-xs text-text-muted mb-2">Packages</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cfg.packages.map(p => (
              <div key={p.type} class={`border rounded-lg p-3 transition-colors ${p.enabled ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <div class="flex items-center justify-between mb-2">
                  <label class="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={p.enabled}
                      onChange={() => togglePkg(p.type)}
                      class="rounded"
                    />
                    <span class="capitalize">{p.type}</span>
                  </label>
                </div>
                {p.enabled && (
                  <input
                    type="text"
                    value={p.name}
                    onInput={(e: any) => updatePkgName(p.type, e.target.value)}
                    class="w-full bg-bg border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary"
                    placeholder={`packages/${p.type}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Directory tree */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h2 class="text-xs font-semibold text-text-muted mb-2">Workspace Structure</h2>
        <pre class="text-xs font-mono text-text leading-relaxed">
{`${cfg.workspaceName || 'my-monorepo'}/
├── package.json         (root, workspaces config)
├── bunfig.toml          (bun config)
${cfg.typescript ? '├── tsconfig.json        (project references)\n' : ''}└── packages/
${enabledPkgs.map((p, i) => `    ${i === enabledPkgs.length - 1 ? '└' : '├'}── ${p.name}/
    ${i === enabledPkgs.length - 1 ? ' ' : '│'}   ├── package.json
    ${i === enabledPkgs.length - 1 ? ' ' : '│'}   ${cfg.typescript ? '├── tsconfig.json\n    ' + (i === enabledPkgs.length - 1 ? ' ' : '│') + '   ' : ''}└── src/
    ${i === enabledPkgs.length - 1 ? ' ' : '│'}   ${cfg.typescript ? '    ' : ''}└── index.${cfg.typescript ? 'ts' : 'js'}`).join('\n')}`}
        </pre>
      </div>

      {/* Tabs */}
      <div class="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            class={`px-3 py-1.5 rounded-lg border text-xs whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? 'bg-primary/20 border-primary text-primary'
                : 'border-border text-text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'root' && <CodeFile title="package.json (root)" code={generateRootPackageJson(cfg)} />}
      {activeTab === 'bunfig' && <CodeFile title="bunfig.toml" code={generateBunfigToml(cfg)} />}
      {activeTab === 'tsconfig' && cfg.typescript && <CodeFile title="tsconfig.json (root)" code={generateTsConfig(cfg)} />}
      {activeTab === 'packages' && (
        <div class="space-y-3">
          {enabledPkgs.length === 0 ? (
            <p class="text-xs text-text-muted text-center py-4">Enable packages above to see their configs</p>
          ) : (
            enabledPkgs.map(p => (
              <CodeFile key={p.type} title={`packages/${p.name}/package.json`} code={generatePackageJson(p, cfg)} />
            ))
          )}
        </div>
      )}
      {activeTab === 'commands' && <CodeFile title="CLI Commands" code={generateInstallCommands(cfg)} />}
    </div>
  );
}
