import { useState } from 'preact/hooks';

type RepoType = 'single' | 'monorepo';
type ChangelogType = 'github' | 'default' | 'none';
type AccessLevel = 'public' | 'restricted';

interface LinkedGroup {
  id: string;
  packages: string;
}

interface FixedGroup {
  id: string;
  packages: string;
}

function generateConfig(
  repoType: RepoType,
  changelog: ChangelogType,
  baseBranch: string,
  access: AccessLevel,
  ignorePackages: string,
  linked: LinkedGroup[],
  fixed: FixedGroup[],
  updateInternalDependencies: 'patch' | 'minor',
): string {
  const config: Record<string, unknown> = {
    $schema: 'https://unpkg.com/@changesets/config@3.0.0/schema.json',
    changelog:
      changelog === 'github'
        ? ['@changesets/changelog-github', { repo: 'your-org/your-repo' }]
        : changelog === 'default'
        ? '@changesets/cli/changelog'
        : false,
    commit: false,
    fixed: fixed.filter(f => f.packages.trim()).map(f =>
      f.packages.split(',').map(s => s.trim()).filter(Boolean)
    ),
    linked: linked.filter(l => l.packages.trim()).map(l =>
      l.packages.split(',').map(s => s.trim()).filter(Boolean)
    ),
    access,
    baseBranch,
    updateInternalDependencies,
    ignore: ignorePackages
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean),
  };

  // Clean up empty arrays
  if ((config.fixed as unknown[]).length === 0) delete config.fixed;
  if ((config.linked as unknown[]).length === 0) delete config.linked;
  if ((config.ignore as unknown[]).length === 0) delete config.ignore;

  return JSON.stringify(config, null, 2);
}

export default function ChangesetConfigBuilder() {
  const [repoType, setRepoType] = useState<RepoType>('monorepo');
  const [changelog, setChangelog] = useState<ChangelogType>('github');
  const [baseBranch, setBaseBranch] = useState('main');
  const [access, setAccess] = useState<AccessLevel>('public');
  const [ignorePackages, setIgnorePackages] = useState('');
  const [linked, setLinked] = useState<LinkedGroup[]>([]);
  const [fixed, setFixed] = useState<FixedGroup[]>([]);
  const [updateInternalDeps, setUpdateInternalDeps] = useState<'patch' | 'minor'>('patch');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'workflow'>('config');

  const output = generateConfig(repoType, changelog, baseBranch, access, ignorePackages, linked, fixed, updateInternalDeps);

  const addLinked = () => setLinked(prev => [...prev, { id: Date.now().toString(), packages: '' }]);
  const removeLinked = (id: string) => setLinked(prev => prev.filter(l => l.id !== id));
  const updateLinked = (id: string, val: string) => setLinked(prev => prev.map(l => l.id === id ? { ...l, packages: val } : l));

  const addFixed = () => setFixed(prev => [...prev, { id: Date.now().toString(), packages: '' }]);
  const removeFixed = (id: string) => setFixed(prev => prev.filter(f => f.id !== id));
  const updateFixed = (id: string, val: string) => setFixed(prev => prev.map(f => f.id === id ? { ...f, packages: val } : f));

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const githubWorkflow = `name: Release

on:
  push:
    branches:
      - ${baseBranch}

concurrency: \${{ github.workflow }}-\${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version-packages
          commit: "chore: version packages"
          title: "chore: version packages"
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: \${{ secrets.NPM_TOKEN }}`;

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Config */}
        <div class="space-y-4">
          {/* Repo type */}
          <div class="flex gap-1 p-1 bg-surface rounded-lg w-fit border border-border">
            {(['single', 'monorepo'] as RepoType[]).map(t => (
              <button
                key={t}
                onClick={() => setRepoType(t)}
                class={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${repoType === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
              >
                {t === 'single' ? 'Single Package' : 'Monorepo'}
              </button>
            ))}
          </div>

          {/* Changelog */}
          <div>
            <label class="block text-sm text-text-muted mb-1.5">Changelog format</label>
            <select
              value={changelog}
              onChange={(e: Event) => setChangelog((e.target as HTMLSelectElement).value as ChangelogType)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="github">@changesets/changelog-github (links to PRs)</option>
              <option value="default">@changesets/cli/changelog (basic)</option>
              <option value="none">Disabled</option>
            </select>
            {changelog === 'github' && (
              <p class="text-xs text-text-muted mt-1">Requires: <code class="font-mono">pnpm add -D @changesets/changelog-github</code></p>
            )}
          </div>

          {/* Base branch */}
          <div>
            <label class="block text-sm text-text-muted mb-1.5">Base branch</label>
            <input
              type="text"
              value={baseBranch}
              onInput={(e: Event) => setBaseBranch((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
              placeholder="main"
            />
          </div>

          {/* Access */}
          <div>
            <label class="block text-sm text-text-muted mb-1.5">NPM publish access</label>
            <div class="flex gap-3">
              {(['public', 'restricted'] as AccessLevel[]).map(a => (
                <label key={a} class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={access === a} onChange={() => setAccess(a)} />
                  <span class="text-text">{a}</span>
                </label>
              ))}
            </div>
          </div>

          {/* updateInternalDependencies */}
          <div>
            <label class="block text-sm text-text-muted mb-1.5">Update internal dependencies</label>
            <div class="flex gap-3">
              {(['patch', 'minor'] as const).map(v => (
                <label key={v} class="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" checked={updateInternalDeps === v} onChange={() => setUpdateInternalDeps(v)} />
                  <span class="text-text">{v}</span>
                </label>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">How internal deps are bumped when a package changes</p>
          </div>

          {/* Ignore packages */}
          <div>
            <label class="block text-sm text-text-muted mb-1.5">Ignore packages <span class="font-normal">(one per line)</span></label>
            <textarea
              rows={3}
              value={ignorePackages}
              onInput={(e: Event) => setIgnorePackages((e.target as HTMLTextAreaElement).value)}
              placeholder="@myorg/internal-tool&#10;@myorg/storybook"
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {repoType === 'monorepo' && (
            <>
              {/* Linked */}
              <div>
                <div class="flex justify-between items-center mb-2">
                  <div>
                    <p class="text-sm text-text-muted">Linked packages</p>
                    <p class="text-xs text-text-muted">Packages that always version together</p>
                  </div>
                  <button onClick={addLinked} class="text-xs px-2 py-1 bg-surface border border-border rounded text-text hover:border-primary">+ Add Group</button>
                </div>
                {linked.map(l => (
                  <div key={l.id} class="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={l.packages}
                      onInput={(e: Event) => updateLinked(l.id, (e.target as HTMLInputElement).value)}
                      placeholder="@myorg/ui, @myorg/tokens"
                      class="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-primary"
                    />
                    <button onClick={() => removeLinked(l.id)} class="text-red-400 hover:text-red-300 text-sm px-2">×</button>
                  </div>
                ))}
              </div>

              {/* Fixed */}
              <div>
                <div class="flex justify-between items-center mb-2">
                  <div>
                    <p class="text-sm text-text-muted">Fixed packages</p>
                    <p class="text-xs text-text-muted">Packages locked to the same version number</p>
                  </div>
                  <button onClick={addFixed} class="text-xs px-2 py-1 bg-surface border border-border rounded text-text hover:border-primary">+ Add Group</button>
                </div>
                {fixed.map(f => (
                  <div key={f.id} class="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={f.packages}
                      onInput={(e: Event) => updateFixed(f.id, (e.target as HTMLInputElement).value)}
                      placeholder="@myorg/core, @myorg/react"
                      class="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-primary"
                    />
                    <button onClick={() => removeFixed(f.id)} class="text-red-400 hover:text-red-300 text-sm px-2">×</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: Output */}
        <div class="space-y-3">
          <div class="flex gap-1 border-b border-border">
            {(['config', 'workflow'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${activeTab === tab ? 'bg-surface border border-b-surface border-border text-text' : 'text-text-muted hover:text-text'}`}
              >
                {tab === 'config' ? '.changeset/config.json' : 'GitHub Action'}
              </button>
            ))}
          </div>

          {activeTab === 'config' && (
            <div class="space-y-2">
              <div class="flex justify-end">
                <button onClick={copy} class="text-xs px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90">
                  {copied ? 'Copied!' : 'Copy JSON'}
                </button>
              </div>
              <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-relaxed">{output}</pre>
              <div class="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-xs text-blue-300 space-y-1">
                <p class="font-semibold">Setup:</p>
                <p><code class="font-mono">pnpm add -D @changesets/cli</code></p>
                <p><code class="font-mono">pnpm changeset init</code> — creates .changeset/</p>
                <p><code class="font-mono">pnpm changeset</code> — create a changeset</p>
                <p><code class="font-mono">pnpm changeset version</code> — bump versions</p>
                <p><code class="font-mono">pnpm changeset publish</code> — publish to npm</p>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div class="space-y-2">
              <div class="flex justify-end">
                <button onClick={() => { navigator.clipboard.writeText(githubWorkflow); setCopied(true); setTimeout(() => setCopied(false), 2000); }} class="text-xs px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90">
                  {copied ? 'Copied!' : 'Copy Workflow'}
                </button>
              </div>
              <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-relaxed text-xs">{githubWorkflow}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
