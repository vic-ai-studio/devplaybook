import { useState, useMemo } from 'preact/hooks';

const COLORS = [
  'bg-yellow-400/30 text-yellow-200',
  'bg-blue-400/30 text-blue-200',
  'bg-green-400/30 text-green-200',
  'bg-pink-400/30 text-pink-200',
  'bg-orange-400/30 text-orange-200',
  'bg-purple-400/30 text-purple-200',
];

const PRESETS = [
  { name: 'Email', pattern: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})', flags: 'g', test: 'Send to hello@devplaybook.cc or admin@example.com' },
  { name: 'IPv4', pattern: '(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})', flags: 'g', test: 'Server at 192.168.1.1 and 10.0.0.255' },
  { name: 'Date (YYYY-MM-DD)', pattern: '(\\d{4})-(\\d{2})-(\\d{2})', flags: 'g', test: 'Dates: 2024-03-15 and 2025-01-01' },
  { name: 'URL', pattern: '(https?://)([\\w.-]+)((?:/[\\w./?%&=]*)?)', flags: 'gi', test: 'Visit https://devplaybook.cc/tools or http://example.com/path' },
  { name: 'Hex Color', pattern: '#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\\b', flags: 'gi', test: 'Colors: #fff #1a2b3c #abc' },
];

interface MatchResult {
  fullMatch: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

export default function RegexVisualizer() {
  const [pattern, setPattern] = useState('([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\\.([a-zA-Z]{2,})');
  const [flags, setFlags] = useState('g');
  const [testStr, setTestStr] = useState('Send to hello@devplaybook.cc or admin@example.com');

  const allFlags = ['g', 'i', 'm', 's', 'u'];

  const toggleFlag = (f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f);
  };

  const result = useMemo(() => {
    if (!pattern) return { matches: [], error: null };
    try {
      const safeFlags = flags.replace(/[^gimsuy]/g, '');
      const re = new RegExp(pattern, safeFlags);
      const matches: MatchResult[] = [];
      if (safeFlags.includes('g') || safeFlags.includes('y')) {
        let m: RegExpExecArray | null;
        let safety = 0;
        while ((m = re.exec(testStr)) !== null && safety++ < 200) {
          matches.push({
            fullMatch: m[0],
            index: m.index,
            groups: Array.from(m).slice(1).map(g => g ?? ''),
            namedGroups: m.groups ?? {},
          });
          if (!m[0]) re.lastIndex++;
        }
      } else {
        const m = re.exec(testStr);
        if (m) matches.push({
          fullMatch: m[0],
          index: m.index,
          groups: Array.from(m).slice(1).map(g => g ?? ''),
          namedGroups: m.groups ?? {},
        });
      }
      return { matches, error: null };
    } catch (e: any) {
      return { matches: [], error: e.message };
    }
  }, [pattern, flags, testStr]);

  const highlighted = useMemo(() => {
    if (result.error || !result.matches.length) return [{ text: testStr, match: false, idx: -1 }];
    const parts: { text: string; match: boolean; idx: number }[] = [];
    let last = 0;
    result.matches.forEach((m, idx) => {
      if (m.index > last) parts.push({ text: testStr.slice(last, m.index), match: false, idx: -1 });
      parts.push({ text: m.fullMatch, match: true, idx });
      last = m.index + m.fullMatch.length;
    });
    if (last < testStr.length) parts.push({ text: testStr.slice(last), match: false, idx: -1 });
    return parts;
  }, [testStr, result]);

  const groupNames = useMemo(() => {
    if (!pattern) return [];
    const names: string[] = [];
    const named = /\(\?<([^>]+)>/g;
    let m: RegExpExecArray | null;
    while ((m = named.exec(pattern)) !== null) names.push(m[1]);
    return names;
  }, [pattern]);

  const groupCount = useMemo(() => {
    if (!pattern) return 0;
    try {
      return new RegExp(pattern + '|').exec('')!.length - 1;
    } catch { return 0; }
  }, [pattern]);

  return (
    <div class="space-y-6">
      {/* Presets */}
      <div class="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.name}
            onClick={() => { setPattern(p.pattern); setTestStr(p.test); }}
            class="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm hover:border-primary text-text-muted hover:text-text transition-colors"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Pattern input */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <label class="text-sm font-medium text-text-muted">Regular Expression</label>
        <div class="flex items-center gap-2">
          <span class="text-text-muted text-lg font-mono">/</span>
          <input
            type="text"
            value={pattern}
            onInput={(e: any) => setPattern(e.target.value)}
            placeholder="Enter regex pattern..."
            class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm text-green-300 focus:outline-none focus:border-primary"
            spellcheck={false}
          />
          <span class="text-text-muted text-lg font-mono">/</span>
          <span class="font-mono text-yellow-300 text-sm w-16">{flags || '∅'}</span>
        </div>

        {/* Flags */}
        <div class="flex gap-2 flex-wrap">
          <span class="text-xs text-text-muted self-center">Flags:</span>
          {allFlags.map(f => (
            <button
              key={f}
              onClick={() => toggleFlag(f)}
              class={`text-xs px-2.5 py-1 rounded font-mono font-medium transition-colors ${
                flags.includes(f)
                  ? 'bg-primary text-white'
                  : 'bg-bg border border-border text-text-muted hover:border-primary'
              }`}
              title={{ g: 'Global', i: 'Case-insensitive', m: 'Multiline', s: 'Dot-all', u: 'Unicode' }[f]}
            >
              {f}
            </button>
          ))}
          <span class="text-xs text-text-muted self-center ml-1">
            ({['g=global','i=case-insensitive','m=multiline','s=dotall','u=unicode'].filter(s => flags.includes(s[0])).join(', ') || 'none active'})
          </span>
        </div>

        {result.error && (
          <div class="text-red-400 text-sm bg-red-900/20 rounded px-3 py-2">
            ⚠ Invalid regex: {result.error}
          </div>
        )}
      </div>

      {/* Test string */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <label class="text-sm font-medium text-text-muted">Test String</label>
        <textarea
          value={testStr}
          onInput={(e: any) => setTestStr(e.target.value)}
          rows={4}
          class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary resize-y"
          spellcheck={false}
        />
      </div>

      {/* Highlighted result */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-muted">Match Highlighting</span>
          <span class={`text-sm font-medium ${result.matches.length > 0 ? 'text-green-400' : 'text-text-muted'}`}>
            {result.matches.length} match{result.matches.length !== 1 ? 'es' : ''}
          </span>
        </div>
        <div class="font-mono text-sm bg-bg rounded-lg p-3 break-all leading-7">
          {highlighted.map((part, i) =>
            part.match ? (
              <mark
                key={i}
                class={`rounded px-0.5 ${COLORS[part.idx % COLORS.length]}`}
                title={`Match ${part.idx + 1}: "${part.text}"`}
              >
                {part.text}
              </mark>
            ) : (
              <span key={i} class="text-text-muted">{part.text}</span>
            )
          )}
          {testStr === '' && <span class="text-text-muted italic">Enter a test string above</span>}
        </div>
      </div>

      {/* Match details */}
      {result.matches.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <span class="text-sm font-medium text-text-muted">Match Details</span>
          <div class="space-y-3 max-h-72 overflow-y-auto">
            {result.matches.map((m, i) => (
              <div key={i} class={`rounded-lg p-3 border ${COLORS[i % COLORS.length].split(' ')[0].replace('/30', '/10')} border-current/20`}>
                <div class="flex items-center gap-3 mb-2">
                  <span class={`text-xs font-bold px-2 py-0.5 rounded ${COLORS[i % COLORS.length]}`}>Match {i + 1}</span>
                  <code class="text-sm font-mono text-text">&quot;{m.fullMatch}&quot;</code>
                  <span class="text-xs text-text-muted ml-auto">index: {m.index}–{m.index + m.fullMatch.length}</span>
                </div>
                {m.groups.length > 0 && (
                  <div class="space-y-1 mt-2 pt-2 border-t border-border">
                    {m.groups.map((g, gi) => (
                      <div key={gi} class="flex gap-3 text-xs">
                        <span class="text-text-muted w-20 shrink-0">
                          {groupNames[gi] ? `Group "${groupNames[gi]}"` : `Group ${gi + 1}`}
                        </span>
                        <code class="text-green-300 font-mono">{g || <em class="not-italic text-text-muted">undefined</em>}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info row */}
      <div class="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Matches', value: result.matches.length },
          { label: 'Capture Groups', value: groupCount },
          { label: 'Named Groups', value: groupNames.length },
        ].map(item => (
          <div key={item.label} class="bg-bg-card border border-border rounded-xl p-3">
            <div class="text-2xl font-bold text-primary">{item.value}</div>
            <div class="text-xs text-text-muted mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
