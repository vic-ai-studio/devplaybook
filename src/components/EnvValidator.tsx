import { useState } from 'preact/hooks';

type Severity = 'ok' | 'warn' | 'error' | 'info';

interface LineResult {
  line: number;
  raw: string;
  severity: Severity;
  message: string;
  suggestion?: string;
}

const SAMPLE_ENV = `# Application config
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/mydb

# Auth
JWT_SECRET=my-super-secret-key
API_KEY=abc123

# Issues for demo
DUPLICATE_KEY=first
DUPLICATE_KEY=second
1INVALID_KEY=bad
KEY WITH SPACES=no quotes
export SHELL_SYNTAX=value
EMPTY_VALUE=
MISSING_EQUALS
GREETING=Hello $USER world
`;

function validateEnv(content: string): LineResult[] {
  const lines = content.split('\n');
  const results: LineResult[] = [];
  const seenKeys = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];
    const trimmed = raw.trim();

    // Blank lines — skip silently
    if (trimmed === '') continue;

    // Comment lines — skip silently
    if (trimmed.startsWith('#')) continue;

    // Export prefix
    const exportMatch = trimmed.match(/^export\s+(.+)$/);
    const effectiveLine = exportMatch ? exportMatch[1] : trimmed;
    if (exportMatch) {
      results.push({
        line: lineNum,
        raw,
        severity: 'info',
        message: 'Line uses "export" prefix, which is shell syntax and not standard .env format.',
        suggestion: `Remove "export ": ${effectiveLine}`,
      });
    }

    // Check for = sign
    if (!effectiveLine.includes('=')) {
      results.push({
        line: lineNum,
        raw,
        severity: 'error',
        message: 'No "=" found. Lines must be in KEY=value format.',
        suggestion: `Did you mean: ${effectiveLine}=<value>`,
      });
      continue;
    }

    const eqIndex = effectiveLine.indexOf('=');
    const key = effectiveLine.slice(0, eqIndex);
    const value = effectiveLine.slice(eqIndex + 1);

    // Invalid characters in key
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      // Key starts with digit
      if (/^\d/.test(key)) {
        results.push({
          line: lineNum,
          raw,
          severity: 'error',
          message: `Key "${key}" starts with a digit. Keys must start with a letter or underscore.`,
          suggestion: `Rename to e.g. _${key}=...`,
        });
      } else {
        const badChars = key.replace(/[A-Za-z0-9_]/g, '').split('').join(', ');
        results.push({
          line: lineNum,
          raw,
          severity: 'error',
          message: `Key "${key}" contains invalid characters: ${badChars}. Only A-Z, a-z, 0-9, and _ are allowed.`,
          suggestion: `Rename key to use only letters, digits, and underscores.`,
        });
      }
      continue;
    }

    // Duplicate key
    if (seenKeys.has(key)) {
      const firstLine = seenKeys.get(key)!;
      results.push({
        line: lineNum,
        raw,
        severity: 'warn',
        message: `Duplicate key "${key}" — first defined on line ${firstLine}. Most parsers use the last value; some use the first.`,
        suggestion: `Remove the duplicate or rename one of the keys.`,
      });
    } else {
      seenKeys.set(key, lineNum);
    }

    // Unquoted value with spaces
    const unquoted = !value.startsWith('"') && !value.startsWith("'");
    if (unquoted && value.includes(' ') && !value.startsWith('#')) {
      results.push({
        line: lineNum,
        raw,
        severity: 'error',
        message: `Value for "${key}" contains spaces but is not quoted.`,
        suggestion: `${key}="${value}"`,
      });
      continue;
    }

    // Interpolation inside value
    const checkValue = value.replace(/^["']|["']$/g, '');
    const interpMatch = checkValue.match(/\$[A-Za-z_{]/);
    if (interpMatch) {
      results.push({
        line: lineNum,
        raw,
        severity: 'info',
        message: `Value for "${key}" appears to use variable interpolation ($VAR). Note: most .env parsers do not expand variables — behavior depends on your library.`,
      });
    }

    // Empty value (after removing quotes)
    const stripped = value.replace(/^["']|["']$/g, '').trim();
    if (stripped === '' && value.replace(/^["']|["']$/g, '') === '') {
      // truly empty (not just whitespace in quotes)
      results.push({
        line: lineNum,
        raw,
        severity: 'warn',
        message: `Value for "${key}" is empty. This may be intentional, but verify it's not a missing value.`,
      });
      continue;
    }

    // All good
    // Only push OK if no issues were already added for this line
    const alreadyFlagged = results.some(r => r.line === lineNum);
    if (!alreadyFlagged) {
      results.push({
        line: lineNum,
        raw,
        severity: 'ok',
        message: `Valid: ${key}=${value.length > 40 ? value.slice(0, 40) + '…' : value}`,
      });
    }
  }

  return results;
}

const SEVERITY_CONFIG: Record<Severity, { icon: string; bg: string; border: string; text: string; badge: string }> = {
  ok:    { icon: '✓', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  warn:  { icon: '⚠', bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   badge: 'bg-amber-500/20 text-amber-300' },
  error: { icon: '✕', bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-300' },
  info:  { icon: 'ℹ', bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    badge: 'bg-blue-500/20 text-blue-300' },
};

export default function EnvValidator() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<LineResult[] | null>(null);

  const handleValidate = () => {
    if (!input.trim()) return;
    setResults(validateEnv(input));
  };

  const handleSample = () => {
    setInput(SAMPLE_ENV);
    setResults(null);
  };

  const errors = results?.filter(r => r.severity === 'error').length ?? 0;
  const warnings = results?.filter(r => r.severity === 'warn').length ?? 0;
  const infos = results?.filter(r => r.severity === 'info').length ?? 0;
  const oks = results?.filter(r => r.severity === 'ok').length ?? 0;

  return (
    <div class="space-y-5">
      {/* Input area */}
      <div class="bg-surface rounded-xl border border-border p-5 space-y-4">
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-text-muted">.env File Content</label>
          <button
            onClick={handleSample}
            class="text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 hover:border-primary/60 px-2.5 py-1 rounded-md"
          >
            Load Sample
          </button>
        </div>
        <textarea
          value={input}
          onInput={(e) => { setInput((e.target as HTMLTextAreaElement).value); setResults(null); }}
          placeholder={"# Paste your .env file content here\nNODE_ENV=production\nAPI_KEY=your-key-here"}
          rows={10}
          class="w-full font-mono bg-bg border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary text-text placeholder-text-muted resize-y"
        />
        <button
          onClick={handleValidate}
          disabled={!input.trim()}
          class="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          Validate
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div class="space-y-4">
          {/* Summary bar */}
          <div class="bg-surface rounded-xl border border-border p-4 flex flex-wrap gap-3 items-center">
            <span class="text-sm font-semibold text-text mr-1">Summary:</span>
            {errors > 0 && (
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300">
                {errors} error{errors !== 1 ? 's' : ''}
              </span>
            )}
            {warnings > 0 && (
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300">
                {warnings} warning{warnings !== 1 ? 's' : ''}
              </span>
            )}
            {infos > 0 && (
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
                {infos} info
              </span>
            )}
            {oks > 0 && (
              <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                {oks} valid
              </span>
            )}
            {errors === 0 && warnings === 0 && (
              <span class="text-sm text-emerald-400 font-medium">All checks passed.</span>
            )}
          </div>

          {/* Line-by-line results */}
          <div class="space-y-2">
            {results.map((r, idx) => {
              const cfg = SEVERITY_CONFIG[r.severity];
              return (
                <div
                  key={idx}
                  class={`rounded-lg border p-3 ${cfg.bg} ${cfg.border}`}
                >
                  <div class="flex items-start gap-3">
                    <span class={`font-bold text-base leading-none mt-0.5 flex-shrink-0 ${cfg.text}`}>
                      {cfg.icon}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span class={`text-xs font-semibold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                          Line {r.line}
                        </span>
                        <code class="text-xs font-mono text-text-muted truncate max-w-[300px]">
                          {r.raw.trim().slice(0, 60)}{r.raw.trim().length > 60 ? '…' : ''}
                        </code>
                      </div>
                      <p class="text-sm text-text">{r.message}</p>
                      {r.suggestion && (
                        <p class="text-xs text-text-muted mt-1">
                          <span class="text-primary font-medium">Suggestion: </span>
                          <code class="font-mono">{r.suggestion}</code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {results.length === 0 && (
              <div class="bg-surface rounded-xl border border-border p-5 text-sm text-text-muted text-center">
                No issues found. Your .env file looks clean.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
