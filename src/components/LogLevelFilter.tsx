import { useState, useMemo } from 'preact/hooks';

type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'TRACE' | 'OTHER';

interface LogLine {
  raw: string;
  level: Level;
  index: number;
}

const LEVEL_COLORS: Record<Level, string> = {
  TRACE:  'text-text-muted/60',
  DEBUG:  'text-blue-400',
  INFO:   'text-green-400',
  WARN:   'text-yellow-400',
  ERROR:  'text-red-400',
  FATAL:  'text-red-600',
  OTHER:  'text-text-muted',
};

const LEVEL_BG: Record<Level, string> = {
  TRACE:  '',
  DEBUG:  '',
  INFO:   '',
  WARN:   'bg-yellow-900/10',
  ERROR:  'bg-red-900/15',
  FATAL:  'bg-red-900/25',
  OTHER:  '',
};

const LEVEL_BADGE: Record<Level, string> = {
  TRACE:  'bg-gray-700 text-gray-300',
  DEBUG:  'bg-blue-900 text-blue-300',
  INFO:   'bg-green-900 text-green-300',
  WARN:   'bg-yellow-900 text-yellow-300',
  ERROR:  'bg-red-900 text-red-300',
  FATAL:  'bg-red-950 text-red-200',
  OTHER:  'bg-gray-800 text-gray-400',
};

const ALL_LEVELS: Level[] = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];

// Patterns ordered by specificity (FATAL before ERROR so "FATAL" lines aren't double-matched)
const LEVEL_PATTERNS: [Level, RegExp][] = [
  ['FATAL', /\b(FATAL|fatal)\b/],
  ['ERROR', /\b(ERROR|error|ERR|SEVERE|severe)\b/],
  ['WARN',  /\b(WARN|warn|WARNING|warning)\b/],
  ['INFO',  /\b(INFO|info)\b/],
  ['DEBUG', /\b(DEBUG|debug)\b/],
  ['TRACE', /\b(TRACE|trace|VERBOSE|verbose)\b/],
];

function detectLevel(line: string): Level {
  for (const [level, re] of LEVEL_PATTERNS) {
    if (re.test(line)) return level;
  }
  return 'OTHER';
}

function parseLogs(raw: string): LogLine[] {
  return raw.split('\n').map((line, i) => ({
    raw: line,
    level: detectLevel(line),
    index: i,
  }));
}

function highlight(text: string, search: string): string {
  if (!search) return text;
  try {
    const re = new RegExp(`(${search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(re, '<mark class="bg-yellow-400/30 text-yellow-200 rounded-sm px-0.5">$1</mark>');
  } catch {
    return text;
  }
}

const SAMPLE_LOG = `2024-01-15 08:00:01.123 INFO  [main] Application starting up
2024-01-15 08:00:01.456 DEBUG [config] Loading configuration from /etc/app/config.yml
2024-01-15 08:00:01.789 INFO  [db] Connecting to database at localhost:5432
2024-01-15 08:00:02.012 DEBUG [db] Connection pool initialized with 10 connections
2024-01-15 08:00:02.345 INFO  [server] HTTP server listening on port 3000
2024-01-15 08:00:15.678 WARN  [auth] Rate limit approaching for IP 192.168.1.100 (80/100 req/min)
2024-01-15 08:00:22.901 ERROR [db] Query timeout after 5000ms: SELECT * FROM users WHERE id=42
2024-01-15 08:00:22.902 INFO  [db] Retrying query (attempt 1/3)
2024-01-15 08:00:27.234 INFO  [cache] Cache miss for key user:42, fetching from DB
2024-01-15 08:00:27.567 ERROR [db] Query timeout after 5000ms: SELECT * FROM users WHERE id=42
2024-01-15 08:00:27.568 ERROR [db] Max retries exceeded for query
2024-01-15 08:00:27.890 WARN  [api] Returning 503 to client — upstream unavailable
2024-01-15 08:01:00.000 DEBUG [metrics] Memory usage: 256MB / 512MB (50%)
2024-01-15 08:01:00.001 INFO  [metrics] Throughput: 342 req/s, p99 latency: 48ms
2024-01-15 08:01:30.500 FATAL [app] Unhandled exception: NullPointerException at UserService.java:157
2024-01-15 08:01:30.501 FATAL [app] Shutting down due to unrecoverable error`;

export default function LogLevelFilter() {
  const [rawLog, setRawLog] = useState(SAMPLE_LOG);
  const [enabledLevels, setEnabledLevels] = useState<Set<Level>>(new Set(ALL_LEVELS));
  const [search, setSearch] = useState('');
  const [showOther, setShowOther] = useState(true);

  const lines = useMemo(() => parseLogs(rawLog), [rawLog]);

  const counts = useMemo(() => {
    const c: Record<Level, number> = { TRACE: 0, DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0, OTHER: 0 };
    for (const l of lines) c[l.level]++;
    return c;
  }, [lines]);

  const filtered = useMemo(() => {
    return lines.filter(l => {
      if (!l.raw.trim()) return false;
      if (l.level === 'OTHER' && !showOther) return false;
      if (l.level !== 'OTHER' && !enabledLevels.has(l.level)) return false;
      if (search && !l.raw.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [lines, enabledLevels, search, showOther]);

  function toggleLevel(level: Level) {
    setEnabledLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level); else next.add(level);
      return next;
    });
  }

  function selectAll() { setEnabledLevels(new Set(ALL_LEVELS)); setShowOther(true); }
  function selectNone() { setEnabledLevels(new Set()); setShowOther(false); }

  const copyFiltered = () => {
    navigator.clipboard?.writeText(filtered.map(l => l.raw).join('\n'));
  };

  return (
    <div class="space-y-4">
      {/* Log input */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium">Log Output</label>
          <button
            onClick={() => setRawLog(SAMPLE_LOG)}
            class="text-xs text-text-muted hover:text-accent transition-colors"
          >
            Load sample
          </button>
        </div>
        <textarea
          value={rawLog}
          onInput={e => setRawLog((e.target as HTMLTextAreaElement).value)}
          placeholder="Paste your log output here..."
          class="w-full h-36 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-y focus:outline-none focus:border-accent text-text"
          spellcheck={false}
        />
      </div>

      {/* Filters */}
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-text-muted shrink-0">Filter:</span>
        {ALL_LEVELS.map(level => (
          <button
            key={level}
            onClick={() => toggleLevel(level)}
            class={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-medium border transition-all ${
              enabledLevels.has(level)
                ? `${LEVEL_BADGE[level]} border-transparent`
                : 'bg-surface text-text-muted/40 border-border opacity-50'
            }`}
          >
            {level}
            <span class="opacity-70">({counts[level]})</span>
          </button>
        ))}
        <button
          onClick={() => setShowOther(v => !v)}
          class={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono font-medium border transition-all ${
            showOther ? `${LEVEL_BADGE['OTHER']} border-transparent` : 'bg-surface text-text-muted/40 border-border opacity-50'
          }`}
        >
          OTHER ({counts['OTHER']})
        </button>
        <button onClick={selectAll}  class="text-xs text-accent hover:underline ml-1">All</button>
        <button onClick={selectNone} class="text-xs text-text-muted hover:underline">None</button>
      </div>

      {/* Search */}
      <div class="flex gap-2">
        <input
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search / grep within logs..."
          class="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent text-text"
        />
        {search && (
          <button onClick={() => setSearch('')} class="px-3 py-2 text-sm text-text-muted hover:text-text border border-border rounded">
            ✕
          </button>
        )}
      </div>

      {/* Results header */}
      <div class="flex items-center justify-between text-xs text-text-muted">
        <span>Showing <strong class="text-text">{filtered.length}</strong> of <strong class="text-text">{lines.filter(l => l.raw.trim()).length}</strong> lines</span>
        <button onClick={copyFiltered} class="hover:text-accent transition-colors">Copy filtered</button>
      </div>

      {/* Log viewer */}
      <div class="bg-[#0d1117] border border-border rounded-lg overflow-y-auto max-h-96 font-mono text-xs">
        {filtered.length === 0 ? (
          <div class="flex items-center justify-center h-24 text-text-muted">No lines match the current filters</div>
        ) : (
          <div>
            {filtered.map(line => (
              <div
                key={line.index}
                class={`flex gap-2 px-3 py-0.5 hover:bg-white/5 ${LEVEL_BG[line.level]}`}
              >
                <span class="shrink-0 text-text-muted/30 select-none w-8 text-right">{line.index + 1}</span>
                <span
                  class={`break-all whitespace-pre-wrap ${LEVEL_COLORS[line.level]}`}
                  dangerouslySetInnerHTML={{ __html: highlight(line.raw, search) }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <p class="text-xs text-text-muted">
        Levels are auto-detected from log line content. Supports common formats: Log4j, Winston, Pino, Python logging, and plain text.
      </p>
    </div>
  );
}
