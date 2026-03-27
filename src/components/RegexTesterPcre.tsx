import { useState, useMemo, useCallback } from 'preact/hooks';

type Language = 'javascript' | 'python' | 'go' | 'ruby';

interface RegexResult {
  text: string;
  matches: { start: number; end: number; groups: (string | undefined)[]; namedGroups: Record<string, string | undefined> }[];
  error?: string;
}

interface LanguageInfo {
  name: string;
  syntax: string;
  flags: string[];
  note: string;
}

const LANG_INFO: Record<Language, LanguageInfo> = {
  javascript: {
    name: 'JavaScript',
    syntax: '/pattern/flags',
    flags: ['g', 'i', 'm', 's', 'u', 'v', 'y', 'd'],
    note: 'Uses JS RegExp. No PCRE lookbehind on older browsers.',
  },
  python: {
    name: 'Python',
    syntax: 're.compile(r"pattern", flags)',
    flags: ['i', 'm', 's', 'x'],
    note: 'Simulates Python re module behavior. (?P<name>...) named groups supported.',
  },
  go: {
    name: 'Go',
    syntax: 'regexp.MustCompile(`pattern`)',
    flags: ['i', 'm', 's'],
    note: 'Go uses RE2 syntax. No lookahead/lookbehind. Named groups: (?P<name>...).',
  },
  ruby: {
    name: 'Ruby',
    syntax: '/pattern/flags',
    flags: ['i', 'm', 'x'],
    note: 'Ruby uses Oniguruma (PCRE-compatible). Named groups: (?<name>...).',
  },
};

const PRESETS: { name: string; pattern: string; flags: string; replacement: string; testText: string }[] = [
  {
    name: 'Email',
    pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
    flags: 'gi',
    replacement: '[REDACTED]',
    testText: 'Contact us at support@example.com or admin@devplaybook.cc.\nInvalid: not-an-email, missing@',
  },
  {
    name: 'URL',
    pattern: 'https?:\\/\\/[^\\s\\/$.?#].[^\\s]*',
    flags: 'gi',
    replacement: '[URL]',
    testText: 'Visit https://devplaybook.cc or http://example.com/path?q=1\nNot a URL: ftp://nope.com',
  },
  {
    name: 'IPv4',
    pattern: '\\b(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    flags: 'g',
    replacement: '[IP]',
    testText: 'Server IPs: 192.168.1.1, 10.0.0.255, 256.0.0.1 (invalid), ::1 (IPv6)',
  },
  {
    name: 'Named Groups',
    pattern: '(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})',
    flags: 'g',
    replacement: '$<day>/$<month>/$<year>',
    testText: 'Dates: 2024-01-15, 2025-12-31, 2026-03-28\nInvalid: 99-1-1',
  },
  {
    name: 'Capture Groups',
    pattern: '(\\w+)@(\\w+)\\.(\\w+)',
    flags: 'g',
    replacement: 'user=$1 domain=$2 tld=$3',
    testText: 'Emails: hello@example.com, world@test.org',
  },
  {
    name: 'Lookahead',
    pattern: '\\w+(?=\\.com)',
    flags: 'gi',
    replacement: 'DOMAIN',
    testText: 'example.com devplaybook.cc test.com google.org',
  },
];

function runMatch(pattern: string, flags: string, text: string, lang: Language): RegexResult[] {
  const lines = text.split('\n');
  return lines.map(line => {
    try {
      // Normalize Python named groups (?P<name>...) → (?<name>...) for JS engine
      let jsPattern = pattern;
      if (lang === 'python' || lang === 'go') {
        jsPattern = pattern.replace(/\(\?P</g, '(?<');
      }

      // Ensure global flag for finding all matches
      const jsFlags = flags.includes('g') ? flags : flags + 'g';
      const re = new RegExp(jsPattern, jsFlags.replace(/[^gimsuy]/g, ''));

      const matches: RegexResult['matches'] = [];
      let m: RegExpExecArray | null;
      re.lastIndex = 0;

      while ((m = re.exec(line)) !== null) {
        const groups = m.slice(1);
        const namedGroups: Record<string, string | undefined> = {};
        if (m.groups) Object.assign(namedGroups, m.groups);
        matches.push({ start: m.index, end: m.index + m[0].length, groups, namedGroups });
        if (!jsFlags.includes('g')) break;
        if (m[0].length === 0) re.lastIndex++;
      }

      return { text: line, matches };
    } catch (e: any) {
      return { text: line, matches: [], error: e.message };
    }
  });
}

function applyReplacement(pattern: string, flags: string, text: string, replacement: string, lang: Language): string {
  try {
    let jsPattern = pattern;
    if (lang === 'python' || lang === 'go') {
      jsPattern = pattern.replace(/\(\?P</g, '(?<');
    }
    const jsFlags = flags.replace(/[^gimsuy]/g, '');
    const re = new RegExp(jsPattern, jsFlags.includes('g') ? jsFlags : jsFlags + 'g');

    // Handle Python $1 → \1 style and named groups
    let jsReplacement = replacement
      .replace(/\$<(\w+)>/g, (_, name) => `$<${name}>`)
      .replace(/\$(\d+)/g, `$$$1`);

    return text.replace(re, jsReplacement);
  } catch {
    return text;
  }
}

function generateSnippet(pattern: string, flags: string, lang: Language): string {
  const jsFlags = flags || 'g';
  switch (lang) {
    case 'javascript':
      return `const re = /${pattern}/${jsFlags};\nconst text = "your string here";\n\n// Test\nconsole.log(re.test(text));\n\n// Find all matches\nconst matches = [...text.matchAll(re)];\nmatches.forEach(m => {\n  console.log('Match:', m[0], 'at', m.index);\n  if (m.groups) console.log('Named groups:', m.groups);\n});`;
    case 'python':
      return `import re\n\npattern = re.compile(\n    r"${pattern.replace(/\(\?</g, '(?P<')}",\n    ${flags.includes('i') ? 're.IGNORECASE | ' : ''}${flags.includes('m') ? 're.MULTILINE | ' : ''}${flags.includes('s') ? 're.DOTALL | ' : ''}re.UNICODE\n)\ntext = "your string here"\n\nfor m in pattern.finditer(text):\n    print(f"Match: {m.group()!r} at {m.start()}")\n    if m.groupdict():\n        print(f"Groups: {m.groupdict()}")`;
    case 'go':
      return `package main\n\nimport (\n\t"fmt"\n\t"regexp"\n)\n\nfunc main() {\n\tre := regexp.MustCompile(\`(?${flags.replace('g', '')}i)${pattern.replace(/\(\?</g, '(?P<')}\`)\n\ttext := "your string here"\n\n\tmatches := re.FindAllStringSubmatch(text, -1)\n\tfor _, m := range matches {\n\t\tfmt.Printf("Match: %q\\n", m[0])\n\t}\n\n\t// Named groups\n\tnames := re.SubexpNames()\n\tfor i, name := range names {\n\t\tif i != 0 && name != "" {\n\t\t\tfmt.Printf("Group %q = %q\\n", name, m[i])\n\t\t}\n\t}\n}`;
    case 'ruby':
      return `require 'strscan'\n\npattern = /${pattern}/${flags.replace('g', '')}\ntext = "your string here"\n\ntext.scan(pattern) do |match|\n  puts "Match: #{match.inspect}"\nend\n\n# With named groups\ntext.match(pattern) do |m|\n  puts m.named_captures\nend`;
  }
}

function HighlightedText({ text, matches }: { text: string; matches: RegexResult['matches'] }) {
  if (matches.length === 0) return <span class="text-text-muted">{text || '\u00a0'}</span>;

  const parts: { text: string; highlight: boolean }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) parts.push({ text: text.slice(cursor, m.start), highlight: false });
    parts.push({ text: text.slice(m.start, m.end), highlight: true });
    cursor = m.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false });

  return (
    <>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark key={i} class="bg-yellow-400/25 text-yellow-200 rounded px-0.5">{p.text}</mark>
        ) : (
          <span key={i} class="text-text-muted">{p.text}</span>
        )
      )}
    </>
  );
}

export default function RegexTesterPcre() {
  const [pattern, setPattern] = useState('(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState('Dates: 2024-01-15, 2025-12-31, 2026-03-28\nInvalid: 99-1-1');
  const [replacement, setReplacement] = useState('$<day>/$<month>/$<year>');
  const [lang, setLang] = useState<Language>('javascript');
  const [mode, setMode] = useState<'match' | 'replace' | 'code'>('match');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const langInfo = LANG_INFO[lang];
  const availableFlags = langInfo.flags;

  const toggleFlag = (f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f);
  };

  const results = useMemo(() => runMatch(pattern, flags, testText, lang), [pattern, flags, testText, lang]);

  const replaced = useMemo(() => {
    if (mode !== 'replace') return '';
    return applyReplacement(pattern, flags, testText, replacement, lang);
  }, [pattern, flags, testText, replacement, lang, mode]);

  const snippet = useMemo(() => generateSnippet(pattern, flags, lang), [pattern, flags, lang]);

  const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
  const hasError = results.some(r => r.error);
  const errorMsg = results.find(r => r.error)?.error;

  const applyPreset = (p: typeof PRESETS[number]) => {
    setPattern(p.pattern);
    setFlags(p.flags);
    setTestText(p.testText);
    setReplacement(p.replacement);
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    });
  };

  return (
    <div class="space-y-4">
      {/* Language selector */}
      <div class="flex gap-2 flex-wrap">
        {(Object.keys(LANG_INFO) as Language[]).map(l => (
          <button
            key={l}
            onClick={() => setLang(l)}
            class={`px-3 py-1.5 text-sm rounded font-medium ${lang === l ? 'bg-accent text-bg' : 'bg-surface border border-border hover:border-accent text-text-muted'}`}
          >
            {LANG_INFO[l].name}
          </button>
        ))}
        <span class="text-xs text-text-muted self-center ml-1">— {langInfo.note}</span>
      </div>

      {/* Presets */}
      <div class="flex gap-1.5 flex-wrap">
        <span class="text-xs text-text-muted self-center">Presets:</span>
        {PRESETS.map(p => (
          <button
            key={p.name}
            onClick={() => applyPreset(p)}
            class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Pattern + flags */}
      <div class="bg-surface rounded-lg p-4 border border-border space-y-3">
        <div>
          <label class="text-xs text-text-muted mb-1 block">Pattern ({langInfo.syntax})</label>
          <div class="flex items-center gap-2">
            <span class="text-text-muted font-mono">/</span>
            <input
              type="text"
              class={`flex-1 bg-bg border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-accent'}`}
              value={pattern}
              onInput={e => setPattern((e.target as HTMLInputElement).value)}
              spellcheck={false}
            />
            <span class="text-text-muted font-mono">/</span>
            <span class="font-mono text-accent text-sm">{flags || '\u200b'}</span>
          </div>
          {hasError && <div class="text-xs text-red-400 mt-1">✗ {errorMsg}</div>}
        </div>

        {/* Flags */}
        <div class="flex gap-2 flex-wrap">
          <span class="text-xs text-text-muted self-center">Flags:</span>
          {availableFlags.map(f => (
            <button
              key={f}
              onClick={() => toggleFlag(f)}
              title={{ g: 'Global', i: 'Case insensitive', m: 'Multiline', s: 'Dot-all', u: 'Unicode', v: 'Unicode sets', y: 'Sticky', d: 'Indices', x: 'Extended (whitespace ignored)' }[f]}
              class={`w-7 h-7 text-xs font-mono rounded border ${flags.includes(f) ? 'bg-accent text-bg border-accent' : 'bg-bg border-border text-text-muted hover:border-accent'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Mode tabs */}
      <div class="flex gap-2">
        {(['match', 'replace', 'code'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            class={`text-sm px-3 py-1.5 rounded font-medium capitalize ${mode === m ? 'bg-accent text-bg' : 'bg-surface border border-border hover:border-accent text-text-muted'}`}
          >
            {m === 'code' ? 'Code Snippet' : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
        {totalMatches > 0 && (
          <span class="ml-auto text-xs text-green-400 self-center font-semibold">
            {totalMatches} match{totalMatches !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Test input */}
        <div class="space-y-2">
          <label class="text-sm font-medium">Test Text</label>
          <textarea
            class="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            rows={10}
            value={testText}
            onInput={e => setTestText((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />

          {mode === 'replace' && (
            <div>
              <label class="text-xs text-text-muted mb-1 block">
                Replacement string ($1, $2 or $&lt;name&gt; for groups)
              </label>
              <input
                type="text"
                class="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                value={replacement}
                onInput={e => setReplacement((e.target as HTMLInputElement).value)}
              />
            </div>
          )}
        </div>

        {/* Output */}
        <div>
          {mode === 'match' && (
            <div class="space-y-2">
              <label class="text-sm font-medium">Highlighted Matches</label>
              <div class="bg-bg border border-border rounded p-3 font-mono text-sm space-y-1 min-h-[140px]">
                {results.map((r, i) => (
                  <div key={i} class="leading-relaxed">
                    <HighlightedText text={r.text} matches={r.matches} />
                  </div>
                ))}
              </div>

              {/* Groups panel */}
              {results.some(r => r.matches.length > 0) && (
                <div class="bg-surface border border-border rounded p-3 space-y-2 max-h-52 overflow-y-auto">
                  <div class="text-xs font-medium text-text-muted">Capture Groups</div>
                  {results.map((r, li) =>
                    r.matches.map((m, mi) => (
                      <div key={`${li}-${mi}`} class="text-xs space-y-0.5">
                        <span class="text-accent font-mono">Match {mi + 1}</span>
                        {m.groups.length > 0 && (
                          <div class="pl-2 space-y-0.5">
                            {m.groups.map((g, gi) => (
                              <div key={gi} class="text-text-muted font-mono">
                                ${gi + 1} = <span class="text-yellow-300">{g ?? 'undefined'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {Object.keys(m.namedGroups).length > 0 && (
                          <div class="pl-2 space-y-0.5">
                            {Object.entries(m.namedGroups).map(([name, val]) => (
                              <div key={name} class="text-text-muted font-mono">
                                $&lt;{name}&gt; = <span class="text-yellow-300">{val ?? 'undefined'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'replace' && (
            <div class="space-y-2">
              <label class="text-sm font-medium">Replaced Output</label>
              <div class="bg-bg border border-border rounded p-3 font-mono text-sm whitespace-pre-wrap min-h-[140px] text-text">
                {replaced || <span class="text-text-muted">No output</span>}
              </div>
            </div>
          )}

          {mode === 'code' && (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label class="text-sm font-medium">{langInfo.name} Code</label>
                <button
                  onClick={copySnippet}
                  class="text-xs px-2 py-1 bg-accent text-bg rounded font-semibold"
                >
                  {copiedSnippet ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre class="bg-bg border border-border rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted">
                {snippet}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
