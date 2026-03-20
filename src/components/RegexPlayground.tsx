import { useState, useMemo } from 'preact/hooks';

const PRESETS = [
  { name: 'Email', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'g' },
  { name: 'URL', pattern: 'https?://[^\\s/$.?#].[^\\s]*', flags: 'gi' },
  { name: 'IPv4', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
  { name: 'Phone (US)', pattern: '\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}', flags: 'g' },
  { name: 'Hex Color', pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b', flags: 'gi' },
];

export default function RegexPlayground() {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState('g');
  const [testStr, setTestStr] = useState('Contact us at hello@devplaybook.cc or support@example.com for help.');
  const [replace, setReplace] = useState('');

  const result = useMemo(() => {
    try {
      const re = new RegExp(pattern, flags);
      const matches: { text: string; index: number; groups?: Record<string, string> }[] = [];
      let m;
      if (flags.includes('g')) {
        while ((m = re.exec(testStr)) !== null) {
          matches.push({ text: m[0], index: m.index, groups: m.groups });
          if (!m[0]) re.lastIndex++;
        }
      } else {
        m = re.exec(testStr);
        if (m) matches.push({ text: m[0], index: m.index, groups: m.groups });
      }
      const replaced = replace ? testStr.replace(re, replace) : null;
      return { matches, error: null, replaced };
    } catch (e: any) {
      return { matches: [], error: e.message, replaced: null };
    }
  }, [pattern, flags, testStr, replace]);

  const highlightedText = useMemo(() => {
    if (result.error || !result.matches.length) return testStr;
    const parts: (string | { match: string })[] = [];
    let last = 0;
    for (const m of result.matches) {
      if (m.index > last) parts.push(testStr.slice(last, m.index));
      parts.push({ match: m.text });
      last = m.index + m.text.length;
    }
    if (last < testStr.length) parts.push(testStr.slice(last));
    return parts;
  }, [testStr, result]);

  return (
    <div class="space-y-6">
      {/* Presets */}
      <div class="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.name}
            onClick={() => { setPattern(p.pattern); setFlags(p.flags); }}
            class="bg-bg-card border border-border rounded-lg px-3 py-1 text-sm hover:border-primary text-text-muted hover:text-text"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Pattern + Flags */}
      <div class="flex gap-2">
        <div class="flex-1 flex items-center bg-bg-input border border-border rounded-lg px-3">
          <span class="text-text-muted mr-1">/</span>
          <input
            value={pattern}
            onInput={(e) => setPattern((e.target as HTMLInputElement).value)}
            class="flex-1 bg-transparent py-2 text-text font-mono outline-none"
            placeholder="Enter regex pattern"
          />
          <span class="text-text-muted ml-1">/</span>
        </div>
        <input
          value={flags}
          onInput={(e) => setFlags((e.target as HTMLInputElement).value)}
          class="w-20 bg-bg-input border border-border rounded-lg px-3 py-2 text-text font-mono text-center"
          placeholder="flags"
        />
      </div>

      {result.error && <div class="text-red-400 text-sm bg-red-400/10 rounded-lg p-3">{result.error}</div>}

      {/* Test String */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-2">Test String</h3>
        <textarea
          value={testStr}
          onInput={(e) => setTestStr((e.target as HTMLTextAreaElement).value)}
          class="w-full bg-bg-input border border-border rounded-lg px-4 py-2 text-sm text-text font-mono h-24"
        />
      </div>

      {/* Highlighted Matches */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-2">
          Matches <span class="text-text-muted text-sm">({result.matches.length} found)</span>
        </h3>
        <div class="font-mono text-sm whitespace-pre-wrap break-all">
          {Array.isArray(highlightedText) ? highlightedText.map((part, i) =>
            typeof part === 'string'
              ? <span key={i}>{part}</span>
              : <mark key={i} class="bg-primary/30 text-primary rounded px-0.5">{part.match}</mark>
          ) : <span>{highlightedText}</span>}
        </div>
      </div>

      {/* Match Details */}
      {result.matches.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <h3 class="font-semibold mb-2">Match Details</h3>
          <div class="space-y-1 text-sm font-mono">
            {result.matches.map((m, i) => (
              <div key={i} class="flex gap-4">
                <span class="text-text-muted">#{i + 1}</span>
                <span class="text-secondary">"{m.text}"</span>
                <span class="text-text-muted">index: {m.index}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Replace */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-2">Replace (optional)</h3>
        <input
          value={replace}
          onInput={(e) => setReplace((e.target as HTMLInputElement).value)}
          class="w-full bg-bg-input border border-border rounded-lg px-4 py-2 text-sm text-text font-mono"
          placeholder="Replacement string (supports $1, $2, etc.)"
        />
        {result.replaced !== null && (
          <pre class="mt-3 text-sm font-mono text-accent whitespace-pre-wrap break-all">{result.replaced}</pre>
        )}
      </div>
    </div>
  );
}
