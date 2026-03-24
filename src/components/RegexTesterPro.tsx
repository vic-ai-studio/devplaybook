import { useState, useMemo } from 'preact/hooks';

type RegexFlavor = 'js' | 'python' | 'ruby';

const FLAVOR_NOTES: Record<RegexFlavor, string> = {
  js: 'JavaScript (browser native) — lookahead/lookbehind, named groups, unicode',
  python: 'Python mode — shows Python-equivalent flags (re module). Testing runs in JS engine.',
  ruby: 'Ruby mode — shows Ruby-equivalent syntax hints. Testing runs in JS engine.',
};

const PRESETS: { label: string; pattern: string; flags: string; sample: string }[] = [
  { label: 'Email', pattern: '^[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}$', flags: 'i', sample: 'user@example.com\nbad-email@\ntest@domain.org' },
  { label: 'URL', pattern: 'https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z]{2,}\\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)', flags: 'gi', sample: 'https://devplaybook.cc\nhttp://example.com/path?q=1\nnot-a-url' },
  { label: 'IPv4', pattern: '^((25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$', flags: '', sample: '192.168.1.1\n255.255.255.0\n999.0.0.1' },
  { label: 'Phone (US)', pattern: '^(\\+1[-\\s.]?)?(\\(\\d{3}\\)|\\d{3})[-\\s.]?\\d{3}[-\\s.]?\\d{4}$', flags: '', sample: '+1-800-555-0100\n(555) 867-5309\n12345' },
  { label: 'Hex Color', pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$', flags: 'i', sample: '#ff6600\n#FFF\n#GGHHII' },
  { label: 'Semver', pattern: '^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$', flags: '', sample: '1.0.0\n2.3.4-beta.1\nv1.2' },
];

interface MatchSpan { start: number; end: number; groups: string[] }

function getMatches(text: string, pattern: string, flags: string): MatchSpan[] {
  if (!pattern || !text) return [];
  try {
    const flagStr = flags.includes('g') ? flags : flags + 'g';
    const re = new RegExp(pattern, flagStr);
    const spans: MatchSpan[] = [];
    let m: RegExpExecArray | null;
    let guard = 0;
    while ((m = re.exec(text)) !== null && guard++ < 500) {
      spans.push({ start: m.index, end: m.index + m[0].length, groups: m.slice(1) });
      if (!flagStr.includes('g')) break;
      if (m[0].length === 0) re.lastIndex++;
    }
    return spans;
  } catch { return []; }
}

function isValidRegex(pattern: string, flags: string): boolean {
  try { new RegExp(pattern, flags); return true; } catch { return false; }
}

// Render a string with match spans highlighted
function HighlightedText({ text, spans }: { text: string; spans: MatchSpan[] }) {
  if (!spans.length) return <span class="font-mono text-sm text-text whitespace-pre-wrap break-all">{text}</span>;

  const parts: { value: string; matched: boolean }[] = [];
  let cursor = 0;
  for (const s of spans) {
    if (s.start > cursor) parts.push({ value: text.slice(cursor, s.start), matched: false });
    parts.push({ value: text.slice(s.start, s.end), matched: true });
    cursor = s.end;
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor), matched: false });

  return (
    <span class="font-mono text-sm text-text whitespace-pre-wrap break-all">
      {parts.map((p, i) =>
        p.matched
          ? <mark key={i} class="bg-yellow-300/40 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-200 rounded-sm px-0.5">{p.value}</mark>
          : <span key={i}>{p.value}</span>
      )}
    </span>
  );
}

export default function RegexTesterPro() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [testText, setTestText] = useState('');
  const [flavor, setFlavor] = useState<RegexFlavor>('js');

  const valid = !pattern || isValidRegex(pattern, flags.replace(/[^gimsuy]/g, ''));
  const safeFlags = flags.replace(/[^gimsuy]/g, '');
  const spans = useMemo(() => getMatches(testText, pattern, safeFlags), [testText, pattern, safeFlags]);

  const matchCount = spans.length;
  const groupCount = spans[0]?.groups?.filter(g => g !== undefined).length ?? 0;

  const regexError = (() => {
    if (!pattern) return '';
    try { new RegExp(pattern, safeFlags); return ''; }
    catch (e: unknown) { return (e as Error).message; }
  })();

  const toggleFlag = (f: string) => {
    setFlags(prev => prev.includes(f) ? prev.replace(f, '') : prev + f);
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setPattern(preset.pattern);
    setFlags(preset.flags || 'g');
    setTestText(preset.sample);
  };

  const clear = () => { setPattern(''); setTestText(''); setFlags('g'); };

  return (
    <div class="space-y-4">
      {/* Flavor selector */}
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-sm text-text-muted">Flavor:</span>
        {(['js', 'python', 'ruby'] as RegexFlavor[]).map(f => (
          <button
            key={f}
            onClick={() => setFlavor(f)}
            class={`px-3 py-1 text-xs rounded border transition-colors ${flavor === f ? 'bg-primary text-bg border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'}`}
          >
            {f === 'js' ? 'JavaScript' : f === 'python' ? 'Python' : 'Ruby'}
          </button>
        ))}
        <span class="text-xs text-text-muted ml-2 hidden sm:inline">{FLAVOR_NOTES[flavor]}</span>
      </div>

      {/* Pattern input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Regex Pattern</label>
        <div class="flex items-center gap-2 bg-bg-card border border-border rounded-lg px-3 py-2 focus-within:border-primary transition-colors">
          <span class="text-text-muted font-mono text-sm select-none">/</span>
          <input
            type="text"
            class="flex-1 bg-transparent font-mono text-sm text-text focus:outline-none"
            placeholder="[a-z]+"
            value={pattern}
            onInput={(e) => setPattern((e.target as HTMLInputElement).value)}
            spellcheck={false}
          />
          <span class="text-text-muted font-mono text-sm select-none">/</span>
          <input
            type="text"
            class="w-16 bg-transparent font-mono text-sm text-text focus:outline-none border-l border-border pl-2"
            placeholder="gi"
            value={flags}
            onInput={(e) => setFlags((e.target as HTMLInputElement).value.replace(/[^gimsuy]/g, ''))}
            spellcheck={false}
            maxLength={6}
          />
        </div>
        {regexError && <p class="text-xs text-red-400 mt-1">⚠ {regexError}</p>}
      </div>

      {/* Flags */}
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-text-muted">Flags:</span>
        {[
          { f: 'g', label: 'g — global', title: 'Find all matches, not just the first' },
          { f: 'i', label: 'i — ignore case', title: 'Case-insensitive matching' },
          { f: 'm', label: 'm — multiline', title: '^ and $ match line boundaries' },
          { f: 's', label: 's — dot-all', title: '. matches newline characters' },
          { f: 'u', label: 'u — unicode', title: 'Enable full Unicode support' },
        ].map(({ f, label, title }) => (
          <button
            key={f}
            onClick={() => toggleFlag(f)}
            title={title}
            class={`px-2 py-0.5 text-xs rounded border transition-colors font-mono ${flags.includes(f) ? 'bg-primary/10 text-primary border-primary/40' : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Presets */}
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-xs text-text-muted">Presets:</span>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => loadPreset(p)}
            class="px-2 py-0.5 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors"
          >
            {p.label}
          </button>
        ))}
        <button onClick={clear} class="px-2 py-0.5 text-xs rounded border border-border text-text-muted hover:border-red-400 hover:text-red-400 transition-colors ml-auto">Clear</button>
      </div>

      {/* Test text with live highlight */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-text-muted">Test Text</label>
          {matchCount > 0 && (
            <span class="text-xs text-green-500 font-medium">{matchCount} match{matchCount !== 1 ? 'es' : ''}{groupCount > 0 ? ` · ${groupCount} group${groupCount !== 1 ? 's' : ''}` : ''}</span>
          )}
          {pattern && valid && matchCount === 0 && testText && (
            <span class="text-xs text-text-muted">No matches</span>
          )}
        </div>
        <textarea
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors"
          placeholder="Type or paste your test text here..."
          value={testText}
          onInput={(e) => setTestText((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
      </div>

      {/* Live preview with highlighted matches */}
      {testText && pattern && valid && (
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Match Preview</label>
          <div class="w-full min-h-20 bg-bg-card border border-border rounded-lg p-3 leading-relaxed">
            <HighlightedText text={testText} spans={spans} />
          </div>
        </div>
      )}

      {/* Match details */}
      {spans.length > 0 && (
        <div class="border border-border rounded-xl p-4 space-y-2">
          <h3 class="text-sm font-semibold text-text">Match Details</h3>
          <div class="space-y-1 max-h-48 overflow-y-auto">
            {spans.slice(0, 50).map((s, i) => (
              <div key={i} class="flex items-start gap-3 text-xs font-mono">
                <span class="text-text-muted w-6 shrink-0">#{i + 1}</span>
                <span class="text-primary bg-primary/10 px-1 rounded">{JSON.stringify(testText.slice(s.start, s.end))}</span>
                <span class="text-text-muted">pos {s.start}–{s.end}</span>
                {s.groups.filter(g => g !== undefined).map((g, j) => (
                  <span key={j} class="text-accent bg-accent/10 px-1 rounded">g{j + 1}: {JSON.stringify(g)}</span>
                ))}
              </div>
            ))}
            {spans.length > 50 && <p class="text-xs text-text-muted">… and {spans.length - 50} more matches</p>}
          </div>
        </div>
      )}

      {!pattern && !testText && (
        <div class="text-center py-8 text-text-muted text-sm">
          Enter a regex pattern and test text — matches are highlighted in real time.
          <br /><span class="text-xs">All processing happens in your browser — nothing is sent to any server.</span>
        </div>
      )}
    </div>
  );
}
