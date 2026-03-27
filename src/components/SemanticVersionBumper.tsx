import { useState, useCallback } from 'preact/hooks';

interface SemVer {
  major: number;
  minor: number;
  patch: number;
  preRelease: string;
  buildMetadata: string;
}

function parseSemVer(input: string): SemVer | null {
  // Strips optional leading 'v'
  const str = input.trim().replace(/^v/i, '');
  const match = str.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    preRelease: match[4] || '',
    buildMetadata: match[5] || '',
  };
}

function formatSemVer(v: SemVer): string {
  let s = `${v.major}.${v.minor}.${v.patch}`;
  if (v.preRelease) s += `-${v.preRelease}`;
  if (v.buildMetadata) s += `+${v.buildMetadata}`;
  return s;
}

type BumpType = 'major' | 'minor' | 'patch' | 'pre-release' | 'build-metadata';

interface BumpResult {
  type: BumpType;
  before: string;
  after: string;
  explanation: string;
}

function bump(v: SemVer, type: BumpType, preTag = 'alpha', buildTag = 'build.1'): SemVer {
  const n = { ...v };
  switch (type) {
    case 'major':
      n.major += 1; n.minor = 0; n.patch = 0; n.preRelease = ''; n.buildMetadata = ''; break;
    case 'minor':
      n.minor += 1; n.patch = 0; n.preRelease = ''; n.buildMetadata = ''; break;
    case 'patch':
      n.patch += 1; n.preRelease = ''; n.buildMetadata = ''; break;
    case 'pre-release':
      if (!n.preRelease) {
        n.preRelease = `${preTag}.0`;
      } else {
        // Increment last numeric component of preRelease
        n.preRelease = n.preRelease.replace(/(\d+)(?!.*\d)/, (m) => String(parseInt(m) + 1));
        if (!/\d/.test(n.preRelease)) n.preRelease += '.0';
      }
      n.buildMetadata = ''; break;
    case 'build-metadata':
      if (!n.buildMetadata) {
        n.buildMetadata = buildTag;
      } else {
        n.buildMetadata = n.buildMetadata.replace(/(\d+)(?!.*\d)/, (m) => String(parseInt(m) + 1));
      }
      break;
  }
  return n;
}

const bumpExplanations: Record<BumpType, string> = {
  major: 'Breaking change — increment MAJOR, reset MINOR and PATCH to 0, drop pre-release.',
  minor: 'New backward-compatible feature — increment MINOR, reset PATCH to 0, drop pre-release.',
  patch: 'Backward-compatible bug fix — increment PATCH, drop pre-release.',
  'pre-release': 'Pre-release marker (alpha/beta/rc) — does not change MAJOR.MINOR.PATCH.',
  'build-metadata': 'Build metadata — ignored by semver precedence, does not affect versioning.',
};

const PRESETS = ['alpha', 'beta', 'rc', 'dev', 'next'] as const;

export default function SemanticVersionBumper() {
  const [input, setInput] = useState('1.2.3');
  const [preTag, setPreTag] = useState('alpha');
  const [buildTag, setBuildTag] = useState('build.1');
  const [history, setHistory] = useState<BumpResult[]>([]);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const parsed = parseSemVer(input);

  const doBump = useCallback((type: BumpType) => {
    setError('');
    const v = parseSemVer(input);
    if (!v) { setError('Invalid semver — expected format: MAJOR.MINOR.PATCH (e.g. 1.2.3 or 2.0.0-beta.1)'); return; }
    const result = bump(v, type, preTag, buildTag);
    const after = formatSemVer(result);
    setHistory(prev => [{ type, before: input, after, explanation: bumpExplanations[type] }, ...prev.slice(0, 9)]);
    setInput(after);
  }, [input, preTag, buildTag]);

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const bumpButtons: { type: BumpType; label: string; color: string }[] = [
    { type: 'major', label: 'Major', color: 'bg-red-500 hover:bg-red-600' },
    { type: 'minor', label: 'Minor', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { type: 'patch', label: 'Patch', color: 'bg-green-500 hover:bg-green-600' },
    { type: 'pre-release', label: 'Pre-release', color: 'bg-purple-500 hover:bg-purple-600' },
    { type: 'build-metadata', label: 'Build Meta', color: 'bg-blue-500 hover:bg-blue-600' },
  ];

  return (
    <div class="space-y-6">
      {/* Current version input */}
      <div>
        <label class="block text-sm font-medium mb-1">Current Version</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={input}
            onInput={(e) => { setInput((e.target as HTMLInputElement).value); setError(''); }}
            placeholder="1.2.3"
            class="flex-1 font-mono text-lg bg-surface-2 border border-border rounded px-3 py-2 text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => copy(input, -1)}
            class="px-3 py-2 text-sm bg-surface-2 hover:bg-surface-3 border border-border rounded transition-colors"
          >
            {copiedIdx === -1 ? 'Copied!' : 'Copy'}
          </button>
        </div>
        {error && <p class="text-red-400 text-xs mt-1">{error}</p>}
        {parsed && (
          <div class="flex gap-4 mt-2 text-xs text-text-muted font-mono">
            <span><span class="text-red-400">MAJOR</span>: {parsed.major}</span>
            <span><span class="text-yellow-400">MINOR</span>: {parsed.minor}</span>
            <span><span class="text-green-400">PATCH</span>: {parsed.patch}</span>
            {parsed.preRelease && <span><span class="text-purple-400">pre</span>: {parsed.preRelease}</span>}
            {parsed.buildMetadata && <span><span class="text-blue-400">build</span>: {parsed.buildMetadata}</span>}
          </div>
        )}
      </div>

      {/* Pre-release tag config */}
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Pre-release tag</label>
          <div class="flex gap-1 flex-wrap mb-1">
            {PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setPreTag(p)}
                class={`px-2 py-0.5 rounded text-xs transition-colors ${preTag === p ? 'bg-accent text-white' : 'bg-surface-2 hover:bg-surface-3 text-text'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={preTag}
            onInput={(e) => setPreTag((e.target as HTMLInputElement).value)}
            placeholder="alpha"
            class="w-full font-mono text-sm bg-surface-2 border border-border rounded px-2 py-1 text-text focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Build metadata tag</label>
          <input
            type="text"
            value={buildTag}
            onInput={(e) => setBuildTag((e.target as HTMLInputElement).value)}
            placeholder="build.1"
            class="w-full font-mono text-sm bg-surface-2 border border-border rounded px-2 py-1 mt-6 text-text focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Bump buttons */}
      <div>
        <p class="text-sm font-medium mb-2">Bump Version</p>
        <div class="flex gap-2 flex-wrap">
          {bumpButtons.map(({ type, label, color }) => (
            <button
              key={type}
              onClick={() => doBump(type)}
              class={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview of what each bump would produce */}
      {parsed && (
        <div class="bg-surface-2 rounded-lg divide-y divide-border text-sm overflow-hidden">
          {bumpButtons.map(({ type, label, color }) => {
            const preview = formatSemVer(bump(parsed, type, preTag, buildTag));
            return (
              <div key={type} class="flex items-center gap-3 px-3 py-2">
                <span class={`w-2 h-2 rounded-full ${color.replace('hover:bg-', 'bg-').split(' ')[0]}`} />
                <span class="w-24 shrink-0 text-text-muted text-xs">{label}</span>
                <span class="font-mono text-text flex-1">{preview}</span>
                <button
                  onClick={() => copy(preview, bumpButtons.findIndex(b => b.type === type))}
                  class="px-2 py-0.5 text-xs bg-surface-3 hover:bg-accent hover:text-white rounded transition-colors"
                >
                  {copiedIdx === bumpButtons.findIndex(b => b.type === type) ? 'Copied!' : 'Copy'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p class="text-sm font-medium mb-2">History</p>
          <div class="space-y-1.5">
            {history.map((h, i) => (
              <div key={i} class="flex items-start gap-3 p-2.5 bg-surface-2 rounded text-xs">
                <div class="flex-1">
                  <div class="flex items-center gap-2 font-mono">
                    <span class="text-text-muted">{h.before}</span>
                    <span class="text-text-muted">→</span>
                    <span class="text-accent font-semibold">{h.after}</span>
                    <span class="bg-surface-3 px-1.5 py-0.5 rounded text-text-muted capitalize">{h.type}</span>
                  </div>
                  <p class="text-text-muted mt-0.5">{h.explanation}</p>
                </div>
                <button
                  onClick={() => copy(h.after, 100 + i)}
                  class="shrink-0 px-2 py-0.5 bg-surface-3 hover:bg-accent hover:text-white rounded transition-colors"
                >
                  {copiedIdx === 100 + i ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semver rules reference */}
      <div class="p-4 bg-surface-2 rounded-lg text-xs text-text-muted space-y-1.5">
        <p class="font-medium text-text text-sm">Semantic Versioning Rules</p>
        <p>• <strong>MAJOR</strong>: Incompatible API changes. Resets MINOR and PATCH to 0.</p>
        <p>• <strong>MINOR</strong>: New backward-compatible functionality. Resets PATCH to 0.</p>
        <p>• <strong>PATCH</strong>: Backward-compatible bug fixes only.</p>
        <p>• <strong>Pre-release</strong>: Appended with a hyphen — e.g. <code>1.0.0-alpha.1</code>. Lower precedence than release.</p>
        <p>• <strong>Build metadata</strong>: Appended with a plus — e.g. <code>1.0.0+build.123</code>. Ignored in version precedence.</p>
        <p>• Precedence: <code>1.0.0-alpha &lt; 1.0.0-alpha.1 &lt; 1.0.0-beta &lt; 1.0.0-rc.1 &lt; 1.0.0</code></p>
      </div>
    </div>
  );
}
