import { useState } from 'preact/hooks';

interface CatalogEntry { name: string; version: string; }
interface OverrideEntry { pkg: string; version: string; }

function generateYaml(
  globs: string[],
  catalog: CatalogEntry[],
  overrides: OverrideEntry[],
  shamefullyHoist: boolean,
  strictPeerDependencies: boolean,
): string {
  const lines: string[] = [];

  // packages
  lines.push('packages:');
  if (globs.length === 0) {
    lines.push("  - 'packages/*'");
  } else {
    globs.forEach(g => lines.push(`  - '${g}'`));
  }

  // catalog
  const validCatalog = catalog.filter(c => c.name.trim() !== '');
  if (validCatalog.length > 0) {
    lines.push('');
    lines.push('catalog:');
    validCatalog.forEach(c => lines.push(`  ${c.name.trim()}: ${c.version.trim() || '*'}`));
  }

  // overrides
  const validOverrides = overrides.filter(o => o.pkg.trim() !== '');
  if (validOverrides.length > 0) {
    lines.push('');
    lines.push('overrides:');
    validOverrides.forEach(o => lines.push(`  ${o.pkg.trim()}: ${o.version.trim() || '*'}`));
  }

  // flags
  if (shamefullyHoist || strictPeerDependencies) {
    lines.push('');
  }
  if (shamefullyHoist) {
    lines.push('shamefullyHoist: true');
  }
  if (strictPeerDependencies) {
    lines.push('strictPeerDependencies: true');
  }

  return lines.join('\n');
}

export default function PnpmWorkspaceGenerator() {
  const [globs, setGlobs] = useState<string[]>(['packages/*', 'apps/*']);
  const [newGlob, setNewGlob] = useState('');
  const [catalog, setCatalog] = useState<CatalogEntry[]>([
    { name: 'react', version: '^18.3.0' },
    { name: 'typescript', version: '^5.4.0' },
  ]);
  const [overrides, setOverrides] = useState<OverrideEntry[]>([]);
  const [shamefullyHoist, setShamefullyHoist] = useState(false);
  const [strictPeerDependencies, setStrictPeerDependencies] = useState(false);
  const [copied, setCopied] = useState(false);

  const yaml = generateYaml(globs, catalog, overrides, shamefullyHoist, strictPeerDependencies);

  const addGlob = () => {
    const trimmed = newGlob.trim();
    if (trimmed && !globs.includes(trimmed)) {
      setGlobs([...globs, trimmed]);
    }
    setNewGlob('');
  };

  const removeGlob = (i: number) => setGlobs(globs.filter((_, idx) => idx !== i));

  const addCatalogEntry = () => setCatalog([...catalog, { name: '', version: '' }]);
  const updateCatalog = (i: number, field: keyof CatalogEntry, val: string) => {
    const next = [...catalog];
    next[i] = { ...next[i], [field]: val };
    setCatalog(next);
  };
  const removeCatalogEntry = (i: number) => setCatalog(catalog.filter((_, idx) => idx !== i));

  const addOverrideEntry = () => setOverrides([...overrides, { pkg: '', version: '' }]);
  const updateOverride = (i: number, field: keyof OverrideEntry, val: string) => {
    const next = [...overrides];
    next[i] = { ...next[i], [field]: val };
    setOverrides(next);
  };
  const removeOverrideEntry = (i: number) => setOverrides(overrides.filter((_, idx) => idx !== i));

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select textarea
    }
  };

  return (
    <div class="space-y-6">
      {/* Workspace Globs */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-1">Workspace Package Globs</h2>
        <p class="text-text-muted text-sm mb-4">
          Glob patterns that match directories containing packages in your monorepo.
        </p>

        <div class="space-y-2 mb-4">
          {globs.map((g, i) => (
            <div key={i} class="flex items-center gap-2">
              <code class="flex-1 bg-bg-input border border-border rounded px-3 py-1.5 text-sm font-mono text-text">
                {g}
              </code>
              <button
                onClick={() => removeGlob(i)}
                class="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded"
                aria-label={`Remove ${g}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div class="flex gap-2">
          <input
            type="text"
            value={newGlob}
            onInput={(e) => setNewGlob((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addGlob(); }}
            placeholder="e.g. libs/* or plugins/**"
            class="flex-1 bg-bg-input border border-border rounded px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          <button
            onClick={addGlob}
            class="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded text-sm"
          >
            + Add Glob
          </button>
        </div>
      </div>

      {/* Catalog */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex justify-between items-start mb-1">
          <div>
            <h2 class="font-semibold text-text">Catalog</h2>
            <p class="text-text-muted text-sm mt-0.5">
              Define shared dependency versions usable across all workspace packages via <code class="font-mono text-xs bg-bg-input px-1 rounded">catalog:</code>.
            </p>
          </div>
          <button
            onClick={addCatalogEntry}
            class="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded text-sm shrink-0 ml-4"
          >
            + Add Entry
          </button>
        </div>

        {catalog.length === 0 && (
          <p class="text-text-muted text-sm mt-4 italic">No catalog entries. Click "Add Entry" to define shared versions.</p>
        )}

        <div class="space-y-2 mt-4">
          {catalog.map((entry, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="text"
                value={entry.name}
                onInput={(e) => updateCatalog(i, 'name', (e.target as HTMLInputElement).value)}
                placeholder="package-name"
                class="flex-1 bg-bg-input border border-border rounded px-3 py-1.5 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <span class="text-text-muted text-sm">:</span>
              <input
                type="text"
                value={entry.version}
                onInput={(e) => updateCatalog(i, 'version', (e.target as HTMLInputElement).value)}
                placeholder="^1.0.0"
                class="w-36 bg-bg-input border border-border rounded px-3 py-1.5 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => removeCatalogEntry(i)}
                class="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded"
                aria-label="Remove catalog entry"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Overrides */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex justify-between items-start mb-1">
          <div>
            <h2 class="font-semibold text-text">Package Overrides</h2>
            <p class="text-text-muted text-sm mt-0.5">
              Force a specific version of a dependency across the entire workspace, regardless of what individual packages request.
            </p>
          </div>
          <button
            onClick={addOverrideEntry}
            class="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded text-sm shrink-0 ml-4"
          >
            + Add Override
          </button>
        </div>

        {overrides.length === 0 && (
          <p class="text-text-muted text-sm mt-4 italic">No overrides. Click "Add Override" to pin a dependency version.</p>
        )}

        <div class="space-y-2 mt-4">
          {overrides.map((entry, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="text"
                value={entry.pkg}
                onInput={(e) => updateOverride(i, 'pkg', (e.target as HTMLInputElement).value)}
                placeholder="package-name"
                class="flex-1 bg-bg-input border border-border rounded px-3 py-1.5 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <span class="text-text-muted text-sm">:</span>
              <input
                type="text"
                value={entry.version}
                onInput={(e) => updateOverride(i, 'version', (e.target as HTMLInputElement).value)}
                placeholder="4.17.21"
                class="w-36 bg-bg-input border border-border rounded px-3 py-1.5 text-sm font-mono text-text placeholder:text-text-muted focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => removeOverrideEntry(i)}
                class="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded"
                aria-label="Remove override"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Options */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-4">Options</h2>
        <div class="space-y-3">
          <label class="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={shamefullyHoist}
              onChange={() => setShamefullyHoist(!shamefullyHoist)}
              class="mt-0.5 accent-primary w-4 h-4 cursor-pointer"
            />
            <div>
              <span class="text-text text-sm font-medium group-hover:text-primary">shamefullyHoist</span>
              <p class="text-text-muted text-xs mt-0.5">
                Hoist all dependencies to the root <code class="font-mono bg-bg-input px-1 rounded">node_modules</code>. Useful for compatibility with tools that don't support strict node resolution, but breaks isolation guarantees.
              </p>
            </div>
          </label>
          <label class="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={strictPeerDependencies}
              onChange={() => setStrictPeerDependencies(!strictPeerDependencies)}
              class="mt-0.5 accent-primary w-4 h-4 cursor-pointer"
            />
            <div>
              <span class="text-text text-sm font-medium group-hover:text-primary">strictPeerDependencies</span>
              <p class="text-text-muted text-xs mt-0.5">
                Causes install to fail if peer dependency conflicts are detected. Recommended for library authors and strict CI environments.
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* YAML Output */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex justify-between items-center mb-3">
          <div>
            <h2 class="font-semibold text-text">pnpm-workspace.yaml</h2>
            <p class="text-text-muted text-xs mt-0.5">Place this file in your monorepo root alongside <code class="font-mono bg-bg-input px-1 rounded">package.json</code>.</p>
          </div>
          <button
            onClick={copyToClipboard}
            class={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-primary hover:bg-primary-dark text-white'
            }`}
          >
            {copied ? 'Copied!' : 'Copy YAML'}
          </button>
        </div>
        <textarea
          readOnly
          value={yaml}
          rows={Math.max(6, yaml.split('\n').length + 1)}
          class="w-full bg-bg-input border border-border rounded-lg px-4 py-3 text-sm font-mono text-secondary resize-none focus:outline-none whitespace-pre"
          spellcheck={false}
        />
      </div>
    </div>
  );
}
