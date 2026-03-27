import { useState, useMemo } from 'preact/hooks';

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'cargo';

const PM_LABELS: Record<PackageManager, string> = {
  npm: 'npm',
  yarn: 'Yarn',
  pnpm: 'pnpm',
  cargo: 'Cargo (Rust)',
};

const DEFAULT_VERSIONS = [
  '0.0.1', '0.0.9', '0.1.0', '0.9.0',
  '1.0.0', '1.0.1', '1.0.9', '1.1.0', '1.2.0', '1.2.3', '1.9.9',
  '2.0.0', '2.0.0-alpha.1', '2.0.0-beta.1', '2.1.0',
  '3.0.0',
];

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  raw: string;
  valid: boolean;
}

function parseSemVer(v: string): SemVer {
  const trimmed = v.trim().replace(/^[v=]/, '');
  const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9._-]+))?(?:\+[a-zA-Z0-9._-]+)?$/);
  if (!match) return { major: 0, minor: 0, patch: 0, prerelease: '', raw: v, valid: false };
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] || '',
    raw: v,
    valid: true,
  };
}

function compareVersions(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  // Pre-release: no prerelease > prerelease
  if (a.prerelease === '' && b.prerelease !== '') return 1;
  if (a.prerelease !== '' && b.prerelease === '') return -1;
  if (a.prerelease < b.prerelease) return -1;
  if (a.prerelease > b.prerelease) return 1;
  return 0;
}

function versionGte(a: SemVer, b: SemVer): boolean { return compareVersions(a, b) >= 0; }
function versionGt(a: SemVer, b: SemVer): boolean { return compareVersions(a, b) > 0; }
function versionLte(a: SemVer, b: SemVer): boolean { return compareVersions(a, b) <= 0; }
function versionLt(a: SemVer, b: SemVer): boolean { return compareVersions(a, b) < 0; }
function versionEq(a: SemVer, b: SemVer): boolean { return compareVersions(a, b) === 0; }

// Matches a single comparator set (no ||)
function matchesComparatorSet(version: SemVer, comparatorSet: string): boolean {
  const trimmed = comparatorSet.trim();

  // Caret range: ^1.2.3
  const caretMatch = trimmed.match(/^\^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9._-]+))?$/);
  if (caretMatch) {
    const base = parseSemVer(`${caretMatch[1]}.${caretMatch[2]}.${caretMatch[3]}${caretMatch[4] ? '-' + caretMatch[4] : ''}`);
    if (!versionGte(version, base)) return false;
    // Caret: allow changes that do not modify the leftmost non-zero element
    if (base.major !== 0) {
      return version.major === base.major;
    } else if (base.minor !== 0) {
      return version.major === 0 && version.minor === base.minor;
    } else {
      return version.major === 0 && version.minor === 0 && version.patch === base.patch;
    }
  }

  // Tilde range: ~1.2.3
  const tildeMatch = trimmed.match(/^~(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9._-]+))?$/);
  if (tildeMatch) {
    const base = parseSemVer(`${tildeMatch[1]}.${tildeMatch[2]}.${tildeMatch[3]}${tildeMatch[4] ? '-' + tildeMatch[4] : ''}`);
    if (!versionGte(version, base)) return false;
    return version.major === base.major && version.minor === base.minor;
  }

  // Tilde with only major.minor: ~1.2
  const tildeMajorMinor = trimmed.match(/^~(\d+)\.(\d+)$/);
  if (tildeMajorMinor) {
    const ma = parseInt(tildeMajorMinor[1], 10);
    const mi = parseInt(tildeMajorMinor[2], 10);
    const base = parseSemVer(`${ma}.${mi}.0`);
    if (!versionGte(version, base)) return false;
    return version.major === ma && version.minor === mi;
  }

  // Tilde with only major: ~1
  const tildeMajor = trimmed.match(/^~(\d+)$/);
  if (tildeMajor) {
    const ma = parseInt(tildeMajor[1], 10);
    const base = parseSemVer(`${ma}.0.0`);
    const upper = parseSemVer(`${ma + 1}.0.0`);
    return versionGte(version, base) && versionLt(version, upper);
  }

  // Hyphen range: 1.0.0 - 2.0.0
  const hyphenMatch = trimmed.match(/^(\d+\.\d+\.\d+)\s+-\s+(\d+\.\d+\.\d+)$/);
  if (hyphenMatch) {
    const lo = parseSemVer(hyphenMatch[1]);
    const hi = parseSemVer(hyphenMatch[2]);
    return versionGte(version, lo) && versionLte(version, hi);
  }

  // Wildcard: * or x
  if (trimmed === '*' || trimmed === 'x' || trimmed === '') {
    // Pre-release versions are NOT included by * unless they share a major.minor.patch
    return version.prerelease === '';
  }

  // Wildcard major.minor: 1.x or 1.*
  const wildcardMinor = trimmed.match(/^(\d+)\.[x*]$/);
  if (wildcardMinor) {
    const ma = parseInt(wildcardMinor[1], 10);
    return version.major === ma && version.prerelease === '';
  }

  // Wildcard major.minor.patch: 1.2.x or 1.2.*
  const wildcardPatch = trimmed.match(/^(\d+)\.(\d+)\.[x*]$/);
  if (wildcardPatch) {
    const ma = parseInt(wildcardPatch[1], 10);
    const mi = parseInt(wildcardPatch[2], 10);
    return version.major === ma && version.minor === mi && version.prerelease === '';
  }

  // Exact: 1.2.3 or =1.2.3
  const exactMatch = trimmed.match(/^[=]?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9._-]+)?)$/);
  if (exactMatch) {
    const target = parseSemVer(exactMatch[1]);
    return versionEq(version, target);
  }

  // Space-separated compound: ">=1.0.0 <2.0.0"
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    return parts.every(part => matchesComparatorSet(version, part));
  }

  // Comparison operators: >=, >, <=, <
  const compMatch = trimmed.match(/^(>=|<=|>|<)(\d+\.\d+\.\d+(?:-[a-zA-Z0-9._-]+)?)$/);
  if (compMatch) {
    const op = compMatch[1];
    const target = parseSemVer(compMatch[2]);
    if (op === '>=') return versionGte(version, target);
    if (op === '>') return versionGt(version, target);
    if (op === '<=') return versionLte(version, target);
    if (op === '<') return versionLt(version, target);
  }

  return false;
}

function matchesRange(version: SemVer, range: string): boolean {
  if (!version.valid) return false;
  const trimmed = range.trim();
  if (!trimmed || trimmed === '*') return version.prerelease === '';

  // Split on || for OR logic
  const orParts = trimmed.split(/\s*\|\|\s*/);
  return orParts.some(part => matchesComparatorSet(version, part.trim()));
}

function explainRange(range: string): string {
  const trimmed = range.trim();
  if (!trimmed || trimmed === '*' || trimmed === 'x') return 'Matches any stable version (no pre-release).';

  const orParts = trimmed.split(/\s*\|\|\s*/);
  if (orParts.length > 1) {
    return `OR range: matches versions satisfying ANY of: ${orParts.map(p => `"${p.trim()}"`).join(' or ')}.`;
  }

  const part = orParts[0].trim();

  const caretMatch = part.match(/^\^(\d+)\.(\d+)\.(\d+)/);
  if (caretMatch) {
    const [, ma, mi, pa] = caretMatch;
    if (ma !== '0') return `Caret range: compatible with ${ma}.${mi}.${pa}. Allows patch and minor updates within major version ${ma} (≥${ma}.${mi}.${pa} <${parseInt(ma)+1}.0.0).`;
    if (mi !== '0') return `Caret range: compatible with 0.${mi}.${pa}. Allows patch updates within minor version 0.${mi} (≥0.${mi}.${pa} <0.${parseInt(mi)+1}.0). Treats 0.x as major-like.`;
    return `Caret range: exact patch only (≥0.0.${pa} <0.0.${parseInt(pa)+1}). Treats 0.0.x as exact.`;
  }

  const tildeMatch = part.match(/^~(\d+)\.(\d+)\.(\d+)/);
  if (tildeMatch) {
    const [, ma, mi, pa] = tildeMatch;
    return `Tilde range: allows patch updates only within ${ma}.${mi}.x (≥${ma}.${mi}.${pa} <${ma}.${parseInt(mi)+1}.0). Minor and major are locked.`;
  }

  const tildeMM = part.match(/^~(\d+)\.(\d+)$/);
  if (tildeMM) {
    return `Tilde range: allows any patch in ${tildeMM[1]}.${tildeMM[2]}.x (≥${tildeMM[1]}.${tildeMM[2]}.0 <${tildeMM[1]}.${parseInt(tildeMM[2])+1}.0).`;
  }

  const hyphen = part.match(/^(\d+\.\d+\.\d+)\s+-\s+(\d+\.\d+\.\d+)$/);
  if (hyphen) return `Hyphen range: inclusive range from ${hyphen[1]} up to and including ${hyphen[2]}.`;

  const gte = part.match(/^>=(\d+\.\d+\.\d+)$/);
  if (gte) return `Greater than or equal to ${gte[1]}, any version from that point forward.`;

  const compound = part.match(/^>=(\d+\.\d+\.\d+)\s+<(\d+\.\d+\.\d+)$/);
  if (compound) return `Range: ≥${compound[1]} and <${compound[2]}. A common way to specify a major version range like ">=1.0.0 <2.0.0".`;

  if (part === '*' || part === 'x') return 'Wildcard: matches any stable version.';

  const wildcardMinor = part.match(/^(\d+)\.[x*]$/);
  if (wildcardMinor) return `Wildcard: any version with major ${wildcardMinor[1]} (${wildcardMinor[1]}.x.x — all minors and patches).`;

  const wildcardPatch = part.match(/^(\d+)\.(\d+)\.[x*]$/);
  if (wildcardPatch) return `Wildcard: any patch version of ${wildcardPatch[1]}.${wildcardPatch[2]} (${wildcardPatch[1]}.${wildcardPatch[2]}.x).`;

  const exact = part.match(/^[=]?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9._-]+)?)$/);
  if (exact) return `Exact version: only ${exact[1]} matches, no other versions.`;

  return `Custom range: "${part}". Combining comparators with spaces means AND; use || for OR.`;
}

function getPackageSnippet(pkg: string, range: string, pm: PackageManager): string {
  const cleanRange = range.trim() || '*';

  if (pm === 'cargo') {
    return `# Cargo.toml
[dependencies]
${pkg || 'my-package'} = "${cleanRange}"

# Cargo uses SemVer with slightly different semantics:
# "^1.2.3" is the default (omitting ^ is also valid for >= 1.0.0)
# "=1.2.3" for exact versions
# "~1.2.3" for tilde (patch-only) ranges`;
  }

  const installCmds: Record<PackageManager, string> = {
    npm: `npm install ${pkg || 'package-name'}@"${cleanRange}"`,
    yarn: `yarn add ${pkg || 'package-name'}@"${cleanRange}"`,
    pnpm: `pnpm add ${pkg || 'package-name'}@"${cleanRange}"`,
    cargo: '',
  };

  return `# package.json
{
  "dependencies": {
    "${pkg || 'package-name'}": "${cleanRange}"
  }
}

# Install command
${installCmds[pm]}

# Check what would be installed
${pm === 'npm' ? `npm view ${pkg || 'package-name'} versions --json` : pm === 'yarn' ? `yarn info ${pkg || 'package-name'} versions` : `pnpm view ${pkg || 'package-name'} versions`}`;
}

const QUICK_RANGES = ['^1.0.0', '~1.0.0', '>=1.0.0 <2.0.0', '*', '1.x', '>=1.2.3', '1.0.0 - 2.0.0', '>=1.0.0 || >=2.0.0'];

export default function SemverRangeCalculator() {
  const [range, setRange] = useState('^1.2.3');
  const [versions, setVersions] = useState<string[]>(DEFAULT_VERSIONS);
  const [newVersion, setNewVersion] = useState('');
  const [packageManager, setPackageManager] = useState<PackageManager>('npm');
  const [packageName, setPackageName] = useState('my-package');
  const [activeTab, setActiveTab] = useState<'results' | 'pkg-snippet'>('results');
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => versions.map(v => parseSemVer(v)), [versions]);

  const results = useMemo(() => {
    return parsed.map(sv => ({
      version: sv.raw,
      valid: sv.valid,
      matches: sv.valid ? matchesRange(sv, range) : false,
    }));
  }, [parsed, range]);

  const matchCount = results.filter(r => r.matches).length;
  const totalValid = results.filter(r => r.valid).length;
  const explanation = useMemo(() => explainRange(range), [range]);
  const pkgSnippet = useMemo(() => getPackageSnippet(packageName, range, packageManager), [packageName, range, packageManager]);

  function addVersion() {
    const v = newVersion.trim();
    if (!v) return;
    if (!versions.includes(v)) {
      setVersions([...versions, v]);
    }
    setNewVersion('');
  }

  function removeVersion(v: string) {
    setVersions(versions.filter(x => x !== v));
  }

  const outputText = activeTab === 'results'
    ? results.map(r => `${r.matches ? 'MATCHES   ' : r.valid ? 'NO MATCH  ' : 'INVALID   '} ${r.version}`).join('\n')
    : pkgSnippet;

  function copy() {
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left panel */}
      <div class="space-y-5">
        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3 text-text">Version Range</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Range Expression</label>
              <input
                type="text"
                value={range}
                onInput={e => setRange((e.target as HTMLInputElement).value)}
                placeholder="e.g. ^1.2.3, ~1.0.0, >=1.0.0 <2.0.0"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <p class="text-xs font-medium text-text-muted mb-2">Quick Ranges</p>
              <div class="flex flex-wrap gap-2">
                {QUICK_RANGES.map(r => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    class={`px-2 py-1 rounded text-xs font-mono border transition-colors ${range === r ? 'bg-accent text-white border-accent' : 'bg-surface-alt border-border text-text-muted hover:border-accent hover:text-text'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div class="p-3 rounded-lg bg-accent/5 border border-accent/20 text-xs text-text-muted">
              <p class="font-medium text-text mb-1">Range Explanation</p>
              <p>{explanation}</p>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3 text-text">Package Manager</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Manager</label>
              <select
                value={packageManager}
                onChange={e => setPackageManager((e.target as HTMLSelectElement).value as PackageManager)}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                {(Object.keys(PM_LABELS) as PackageManager[]).map(pm => (
                  <option key={pm} value={pm}>{PM_LABELS[pm]}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Package Name</label>
              <input
                type="text"
                value={packageName}
                onInput={e => setPackageName((e.target as HTMLInputElement).value)}
                placeholder="my-package"
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl border border-border bg-surface">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Test Versions ({versions.length})</h3>
            <button
              onClick={() => setVersions(DEFAULT_VERSIONS)}
              class="text-xs text-text-muted hover:text-text transition-colors"
            >
              Reset to defaults
            </button>
          </div>
          <div class="flex gap-2 mb-3">
            <input
              type="text"
              value={newVersion}
              onInput={e => setNewVersion((e.target as HTMLInputElement).value)}
              onKeyDown={e => e.key === 'Enter' && addVersion()}
              placeholder="Add version (e.g. 1.4.2)"
              class="flex-1 px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              onClick={addVersion}
              class="px-3 py-2 rounded-lg bg-accent text-white text-sm hover:bg-accent/90 transition-colors"
            >
              Add
            </button>
          </div>
          <div class="flex flex-wrap gap-2">
            {versions.map(v => {
              const result = results.find(r => r.version === v);
              const isMatch = result?.matches;
              const isInvalid = result && !result.valid;
              return (
                <div
                  key={v}
                  class={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono border transition-colors ${
                    isInvalid
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-600 dark:text-yellow-400'
                      : isMatch
                      ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  <span>{isInvalid ? '?' : isMatch ? '✓' : '✕'}</span>
                  <span>{v}</span>
                  <button
                    onClick={() => removeVersion(v)}
                    class="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                    aria-label={`Remove ${v}`}
                  >×</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex gap-1 bg-surface-alt border border-border rounded-lg p-1">
            <button
              onClick={() => setActiveTab('results')}
              class={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'results' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
            >
              Match Results
            </button>
            <button
              onClick={() => setActiveTab('pkg-snippet')}
              class={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === 'pkg-snippet' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
            >
              Package Snippet
            </button>
          </div>
          <button
            onClick={copy}
            class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent transition-colors text-text"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        {activeTab === 'results' ? (
          <div class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto">
            <div class="mb-3 pb-3 border-b border-border">
              <p class="text-xs text-text-muted">Range: <span class="text-accent font-medium">{range || '*'}</span></p>
              <p class="text-xs text-text-muted mt-0.5">
                <span class="text-green-500 font-medium">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>
                <span class="mx-1 text-border">·</span>
                <span class="text-red-500 font-medium">{totalValid - matchCount} no match</span>
                <span class="mx-1 text-border">·</span>
                <span>{versions.length - totalValid} invalid</span>
              </p>
            </div>
            <div class="space-y-1">
              {results.map(r => (
                <div
                  key={r.version}
                  class={`flex items-center gap-3 px-2 py-1.5 rounded-md text-xs ${
                    !r.valid
                      ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/5'
                      : r.matches
                      ? 'text-green-700 dark:text-green-400 bg-green-500/5'
                      : 'text-red-700 dark:text-red-400 bg-red-500/5'
                  }`}
                >
                  <span class="w-20 font-semibold shrink-0">
                    {!r.valid ? 'INVALID' : r.matches ? 'MATCHES' : 'NO MATCH'}
                  </span>
                  <span class="font-mono">{r.version}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre-wrap">{pkgSnippet}</pre>
        )}

        <div class="grid grid-cols-3 gap-2 text-xs">
          <div class="p-3 rounded-lg bg-surface border border-border text-center">
            <p class="text-2xl font-bold text-green-500">{matchCount}</p>
            <p class="text-text-muted mt-0.5">Matching</p>
          </div>
          <div class="p-3 rounded-lg bg-surface border border-border text-center">
            <p class="text-2xl font-bold text-red-500">{totalValid - matchCount}</p>
            <p class="text-text-muted mt-0.5">No Match</p>
          </div>
          <div class="p-3 rounded-lg bg-surface border border-border text-center">
            <p class="text-2xl font-bold text-text">{versions.length}</p>
            <p class="text-text-muted mt-0.5">Total</p>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-surface border border-border text-xs space-y-1 text-text-muted">
          <p class="font-medium text-text">Syntax Reference</p>
          <div class="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
            <span><span class="text-accent">^1.2.3</span> — compatible (≥1.2.3 &lt;2.0.0)</span>
            <span><span class="text-accent">~1.2.3</span> — patch only (≥1.2.3 &lt;1.3.0)</span>
            <span><span class="text-accent">*</span> or <span class="text-accent">x</span> — any stable version</span>
            <span><span class="text-accent">1.x</span> — all 1.x.x versions</span>
            <span><span class="text-accent">{'>=1.0.0 <2.0.0'}</span> — compound (AND)</span>
            <span><span class="text-accent">1.0.0 - 2.0.0</span> — hyphen range</span>
            <span><span class="text-accent">1.2.3 || >=2.0.0</span> — OR range</span>
            <span><span class="text-accent">=1.2.3</span> — exact version</span>
          </div>
        </div>
      </div>
    </div>
  );
}
