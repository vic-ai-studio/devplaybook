import { useState } from 'preact/hooks';

// Minimal semver parser - handles X.Y.Z and X.Y.Z-pre+build
function parseSemver(raw: string): { major: number; minor: number; patch: number; pre: string; build: string } | null {
  const s = raw.trim().replace(/^[v=]/, '');
  const match = s.match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9._-]+))?(?:\+([a-zA-Z0-9._-]+))?$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    pre: match[4] || '',
    build: match[5] || '',
  };
}

function comparePreRelease(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;   // no pre-release = higher precedence
  if (!b) return -1;
  const aParts = a.split('.');
  const bParts = b.split('.');
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const ap = aParts[i] ?? '';
    const bp = bParts[i] ?? '';
    if (ap === bp) continue;
    const aNum = parseInt(ap, 10);
    const bNum = parseInt(bp, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (!isNaN(aNum)) return -1;
    if (!isNaN(bNum)) return 1;
    return ap < bp ? -1 : 1;
  }
  return 0;
}

function compareSemver(a: ReturnType<typeof parseSemver>, b: ReturnType<typeof parseSemver>): number {
  if (!a || !b) return 0;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return comparePreRelease(a.pre, b.pre);
}

function bumpVersion(v: ReturnType<typeof parseSemver>, type: 'major' | 'minor' | 'patch'): string {
  if (!v) return '';
  if (type === 'major') return `${v.major + 1}.0.0`;
  if (type === 'minor') return `${v.major}.${v.minor + 1}.0`;
  return `${v.major}.${v.minor}.${v.patch + 1}`;
}

// Simple range matching: ^, ~, >=, <=, >, <, =, exact
function matchesRange(version: string, range: string): { result: boolean; explanation: string } {
  const v = parseSemver(version);
  if (!v) return { result: false, explanation: 'Invalid version' };

  const r = range.trim();
  if (!r) return { result: false, explanation: 'Empty range' };

  // Handle ranges like ">=1.0.0 <2.0.0"
  const parts = r.split(/\s+/);
  for (const part of parts) {
    const res = matchSingleConstraint(v, part.trim());
    if (!res.result) return res;
  }
  return { result: true, explanation: `${version} satisfies ${range}` };
}

function matchSingleConstraint(v: NonNullable<ReturnType<typeof parseSemver>>, constraint: string): { result: boolean; explanation: string } {
  // Caret ^
  if (constraint.startsWith('^')) {
    const target = parseSemver(constraint.slice(1));
    if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
    const cmp = compareSemver(v, target);
    if (cmp < 0) return { result: false, explanation: `${formatV(v)} < ${formatV(target)}` };
    // ^X.Y.Z: compatible with X.*.*  (major must match if major > 0)
    if (target.major > 0) {
      if (v.major !== target.major) return { result: false, explanation: `Major ${v.major} !== ${target.major}` };
    } else if (target.minor > 0) {
      if (v.major !== 0 || v.minor !== target.minor) return { result: false, explanation: `Minor must match 0.${target.minor}.*` };
    } else {
      if (v.major !== 0 || v.minor !== 0 || v.patch !== target.patch) return { result: false, explanation: `Patch must match 0.0.${target.patch}` };
    }
    return { result: true, explanation: `^${formatV(target)}: compatible (same major)` };
  }

  // Tilde ~
  if (constraint.startsWith('~')) {
    const target = parseSemver(constraint.slice(1));
    if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
    const cmp = compareSemver(v, target);
    if (cmp < 0) return { result: false, explanation: `${formatV(v)} < ${formatV(target)}` };
    if (v.major !== target.major || v.minor !== target.minor) {
      return { result: false, explanation: `~${formatV(target)}: minor must be ${target.major}.${target.minor}.*` };
    }
    return { result: true, explanation: `~${formatV(target)}: compatible (same minor)` };
  }

  // >=
  if (constraint.startsWith('>=')) {
    const target = parseSemver(constraint.slice(2));
    if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
    const cmp = compareSemver(v, target);
    if (cmp >= 0) return { result: true, explanation: `${formatV(v)} >= ${formatV(target)}` };
    return { result: false, explanation: `${formatV(v)} < ${formatV(target)}` };
  }

  // <=
  if (constraint.startsWith('<=')) {
    const target = parseSemver(constraint.slice(2));
    if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
    const cmp = compareSemver(v, target);
    if (cmp <= 0) return { result: true, explanation: `${formatV(v)} <= ${formatV(target)}` };
    return { result: false, explanation: `${formatV(v)} > ${formatV(target)}` };
  }

  // >
  if (constraint.startsWith('>')) {
    const target = parseSemver(constraint.slice(1));
    if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
    const cmp = compareSemver(v, target);
    if (cmp > 0) return { result: true, explanation: `${formatV(v)} > ${formatV(target)}` };
    return { result: false, explanation: `${formatV(v)} not > ${formatV(target)}` };
  }

  // <
  if (constraint.startsWith('<')) {
    const target = parseSemver(constraint.slice(1));
    if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
    const cmp = compareSemver(v, target);
    if (cmp < 0) return { result: true, explanation: `${formatV(v)} < ${formatV(target)}` };
    return { result: false, explanation: `${formatV(v)} not < ${formatV(target)}` };
  }

  // = or exact
  const target = parseSemver(constraint.replace(/^=/, ''));
  if (!target) return { result: false, explanation: `Invalid constraint: ${constraint}` };
  const cmp = compareSemver(v, target);
  if (cmp === 0) return { result: true, explanation: `Exact match ${formatV(target)}` };
  return { result: false, explanation: `${formatV(v)} !== ${formatV(target)}` };
}

function formatV(v: NonNullable<ReturnType<typeof parseSemver>>): string {
  return `${v.major}.${v.minor}.${v.patch}${v.pre ? '-' + v.pre : ''}${v.build ? '+' + v.build : ''}`;
}

export default function SemverChecker() {
  const [v1, setV1] = useState('1.2.3');
  const [v2, setV2] = useState('2.0.0-beta.1');
  const [rangeVersion, setRangeVersion] = useState('1.5.3');
  const [range, setRange] = useState('^1.0.0');
  const [tab, setTab] = useState<'compare' | 'range' | 'bump'>('compare');
  const [bumpSrc, setBumpSrc] = useState('1.2.3');

  const parsed1 = parseSemver(v1);
  const parsed2 = parseSemver(v2);
  const cmp = parsed1 && parsed2 ? compareSemver(parsed1, parsed2) : null;

  const rangeResult = rangeVersion && range ? matchesRange(rangeVersion, range) : null;
  const parsedBump = parseSemver(bumpSrc);

  const tabs = [
    { id: 'compare', label: 'Compare' },
    { id: 'range', label: 'Range Check' },
    { id: 'bump', label: 'Bump' },
  ] as const;

  return (
    <div class="space-y-5">
      {/* Tabs */}
      <div class="flex gap-1 bg-gray-900 border border-gray-700 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            class={`flex-1 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Compare tab */}
      {tab === 'compare' && (
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            {[{ label: 'Version A', val: v1, set: setV1, parsed: parsed1 }, { label: 'Version B', val: v2, set: setV2, parsed: parsed2 }].map(({ label, val, set, parsed }) => (
              <div key={label} class="bg-gray-900 rounded-xl border border-gray-700 p-4">
                <label class="text-xs text-gray-400 block mb-2">{label}</label>
                <input
                  type="text"
                  value={val}
                  onInput={e => set((e.target as HTMLInputElement).value)}
                  placeholder="e.g. 1.2.3"
                  class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
                {parsed ? (
                  <div class="mt-3 grid grid-cols-3 gap-2">
                    {(['major', 'minor', 'patch'] as const).map(k => (
                      <div key={k} class="text-center">
                        <div class="text-lg font-bold text-indigo-400">{parsed[k]}</div>
                        <div class="text-xs text-gray-500 capitalize">{k}</div>
                      </div>
                    ))}
                    {parsed.pre && <div class="col-span-3 text-xs text-gray-400">Pre-release: <span class="text-yellow-400">{parsed.pre}</span></div>}
                    {parsed.build && <div class="col-span-3 text-xs text-gray-400">Build: <span class="text-gray-300">{parsed.build}</span></div>}
                  </div>
                ) : val && (
                  <div class="mt-2 text-xs text-red-400">Invalid semver</div>
                )}
              </div>
            ))}
          </div>

          {cmp !== null && parsed1 && parsed2 && (
            <div class={`rounded-xl border p-5 text-center ${cmp === 0 ? 'bg-blue-950/30 border-blue-700' : cmp > 0 ? 'bg-green-950/30 border-green-700' : 'bg-orange-950/30 border-orange-700'}`}>
              <div class="text-3xl font-bold mb-1">
                {cmp === 0 ? '=' : cmp > 0 ? 'A > B' : 'A < B'}
              </div>
              <div class="text-sm text-gray-400">
                {cmp === 0 ? 'Both versions are equal' : cmp > 0 ? `${formatV(parsed1)} is newer than ${formatV(parsed2)}` : `${formatV(parsed1)} is older than ${formatV(parsed2)}`}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Range check tab */}
      {tab === 'range' && (
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <label class="text-xs text-gray-400 block mb-2">Version to check</label>
              <input
                type="text"
                value={rangeVersion}
                onInput={e => setRangeVersion((e.target as HTMLInputElement).value)}
                placeholder="e.g. 1.5.3"
                class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
              <label class="text-xs text-gray-400 block mb-2">Range constraint</label>
              <input
                type="text"
                value={range}
                onInput={e => setRange((e.target as HTMLInputElement).value)}
                placeholder="e.g. ^1.0.0 or >=1.0.0 <2.0.0"
                class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {rangeResult && (
            <div class={`rounded-xl border p-5 ${rangeResult.result ? 'bg-green-950/30 border-green-700' : 'bg-red-950/30 border-red-700'}`}>
              <div class="flex items-center gap-3 mb-2">
                <span class="text-2xl">{rangeResult.result ? '✅' : '❌'}</span>
                <span class="text-lg font-bold">{rangeResult.result ? 'Satisfied' : 'Not satisfied'}</span>
              </div>
              <div class="text-sm text-gray-400">{rangeResult.explanation}</div>
            </div>
          )}

          <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <p class="text-xs text-gray-400 font-medium mb-3">Range syntax reference</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ['^1.2.3', 'Compatible with 1.x.x (same major)'],
                ['~1.2.3', 'Approximately 1.2.x (same minor)'],
                ['>=1.0.0 <2.0.0', 'Intersection of two constraints'],
                ['>1.0.0', 'Greater than 1.0.0'],
                ['<=2.0.0', 'Less than or equal to 2.0.0'],
                ['1.2.3', 'Exact version match'],
              ].map(([ex, desc]) => (
                <button
                  key={ex}
                  onClick={() => setRange(ex)}
                  class="text-left flex gap-2 hover:bg-gray-800 rounded-lg p-2 transition-colors"
                >
                  <code class="text-indigo-400 font-mono shrink-0">{ex}</code>
                  <span class="text-gray-500">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bump tab */}
      {tab === 'bump' && (
        <div class="space-y-4">
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
            <label class="text-xs text-gray-400 block mb-2">Current version</label>
            <input
              type="text"
              value={bumpSrc}
              onInput={e => setBumpSrc((e.target as HTMLInputElement).value)}
              placeholder="e.g. 1.2.3"
              class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {parsedBump && (
            <div class="grid grid-cols-3 gap-4">
              {(['major', 'minor', 'patch'] as const).map(type => {
                const next = bumpVersion(parsedBump, type);
                return (
                  <div key={type} class="bg-gray-900 rounded-xl border border-gray-700 p-4 text-center">
                    <div class="text-xs text-gray-400 capitalize mb-2">{type} bump</div>
                    <div class="text-xl font-bold font-mono text-indigo-400 mb-3">{next}</div>
                    <button
                      onClick={() => navigator.clipboard?.writeText(next)}
                      class="text-xs text-gray-500 hover:text-indigo-400 border border-gray-700 hover:border-indigo-500 px-3 py-1 rounded-full transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {!parsedBump && bumpSrc && (
            <div class="text-sm text-red-400 bg-gray-900 rounded-xl border border-red-900 p-4">
              Invalid semver: must be X.Y.Z format
            </div>
          )}

          <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 text-xs text-gray-400 space-y-1">
            <p><span class="text-indigo-400 font-semibold">Major:</span> Breaking changes (API incompatible)</p>
            <p><span class="text-indigo-400 font-semibold">Minor:</span> New features (backwards compatible)</p>
            <p><span class="text-indigo-400 font-semibold">Patch:</span> Bug fixes (backwards compatible)</p>
          </div>
        </div>
      )}
    </div>
  );
}
