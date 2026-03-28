import { useState, useEffect, useCallback } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

interface LintError {
  line: number;
  col: number;
  message: string;
  fix: string;
  severity: 'error';
}

interface LintWarning {
  line: number;
  col: number;
  message: string;
  fix: string;
  severity: 'warning';
}

type LintIssue = LintError | LintWarning;

interface LintStats {
  lineCount: number;
  keyCount: number;
  maxDepth: number;
  charCount: number;
}

interface LintResult {
  ok: boolean;
  issues: LintIssue[];
  stats?: LintStats;
}

// ── YAML boolean/null bare words that should be quoted when used as keys ──────

const BARE_WORD_KEYS = new Set(['yes', 'no', 'true', 'false', 'null', 'on', 'off', '~']);

// ── Parser helpers (borrowed & extended from YamlValidator pattern) ────────────

class YamlParseError extends Error {
  line: number;
  col: number;
  constructor(message: string, line: number, col: number = 1) {
    super(message);
    this.line = line;
    this.col = col;
  }
}

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function isBlankOrComment(line: string): boolean {
  return /^\s*(#.*)?$/.test(line);
}

interface ParseState { value: unknown; nextLine: number; }

function coerceScalar(s: string): unknown {
  if (s === '' || s === '~' || s.toLowerCase() === 'null') return null;
  if (s.toLowerCase() === 'true') return true;
  if (s.toLowerCase() === 'false') return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  return s;
}

function findNextNonBlank(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    if (!isBlankOrComment(lines[i])) return i;
  }
  return -1;
}

function parseBlockScalar(lines: string[], startLine: number, ownerIndent: number): ParseState {
  const parts: string[] = [];
  let blockIndent = -1;
  let i = startLine;
  while (i < lines.length) {
    const raw = lines[i];
    if (isBlankOrComment(raw) && blockIndent === -1) { i++; continue; }
    const indent = getIndent(raw);
    if (blockIndent === -1) blockIndent = indent;
    if (indent < blockIndent && !isBlankOrComment(raw)) break;
    parts.push(isBlankOrComment(raw) ? '' : raw.slice(blockIndent));
    i++;
  }
  return { value: parts.join('\n').trimEnd(), nextLine: i };
}

function parseInline(s: string, lineIdx: number): unknown {
  const jsonCompatible = s
    .replace(/:\s*true\b/g, ': true')
    .replace(/:\s*false\b/g, ': false')
    .replace(/:\s*null\b/g, ': null')
    .replace(/:\s*~/g, ': null')
    .replace(/'([^']*)'/g, '"$1"');
  try { return JSON.parse(jsonCompatible); } catch {
    throw new YamlParseError(`Cannot parse inline value: ${s}`, lineIdx + 1, 1);
  }
}

function parseValue(lines: string[], startLine: number, baseIndent: number): ParseState {
  let i = startLine;
  while (i < lines.length && isBlankOrComment(lines[i])) i++;
  if (i >= lines.length) return { value: null, nextLine: i };
  const line = lines[i];
  const indent = getIndent(line);
  const trimmed = line.trim();
  if (trimmed.startsWith('- ') || trimmed === '-') return parseSequence(lines, i, indent);
  if (/^"[^"]*"\s*:/.test(trimmed) || /^'[^']*'\s*:/.test(trimmed) || /^[a-zA-Z0-9_\-. ]+\s*:/.test(trimmed)) {
    return parseMapping(lines, i, indent);
  }
  return { value: coerceScalar(trimmed), nextLine: i + 1 };
}

function parseMapping(lines: string[], startLine: number, baseIndent: number): ParseState {
  const obj: Record<string, unknown> = {};
  let i = startLine;
  while (i < lines.length) {
    if (isBlankOrComment(lines[i])) { i++; continue; }
    const indent = getIndent(lines[i]);
    if (indent < baseIndent) break;
    if (indent > baseIndent) break;
    const trimmed = lines[i].trim().replace(/#[^'"]*$/, '').trim();
    const m = trimmed.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^:]+?)\s*:\s*(.*)$/);
    if (!m) break;
    let key = m[1].trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
    const valueStr = m[2].trim();
    if (key in obj) throw new YamlParseError(`Duplicate key: "${key}"`, i + 1, indent + 1);
    if (valueStr === '') {
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
        const child = parseValue(lines, nextNonBlank, getIndent(lines[nextNonBlank]));
        obj[key] = child.value; i = child.nextLine;
      } else { obj[key] = null; i++; }
    } else if (valueStr.startsWith('|') || valueStr.startsWith('>')) {
      const blockRes = parseBlockScalar(lines, i + 1, baseIndent);
      obj[key] = blockRes.value; i = blockRes.nextLine;
    } else if (valueStr.startsWith('[') || valueStr.startsWith('{')) {
      try { obj[key] = parseInline(valueStr, i); } catch { obj[key] = valueStr; }
      i++;
    } else { obj[key] = coerceScalar(valueStr); i++; }
  }
  return { value: obj, nextLine: i };
}

function parseSequence(lines: string[], startLine: number, baseIndent: number): ParseState {
  const arr: unknown[] = [];
  let i = startLine;
  while (i < lines.length) {
    if (isBlankOrComment(lines[i])) { i++; continue; }
    const indent = getIndent(lines[i]);
    if (indent < baseIndent) break;
    if (indent > baseIndent) break;
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('- ') && trimmed !== '-') break;
    const itemStr = trimmed.startsWith('- ') ? trimmed.slice(2).trim() : '';
    if (itemStr === '') {
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
        const child = parseValue(lines, nextNonBlank, getIndent(lines[nextNonBlank]));
        arr.push(child.value); i = child.nextLine;
      } else { arr.push(null); i++; }
    } else if (/^[a-zA-Z0-9_\-. "'].*:/.test(itemStr)) {
      const fakeLines = [' '.repeat(baseIndent + 2) + itemStr];
      let j = i + 1;
      while (j < lines.length && !isBlankOrComment(lines[j]) && getIndent(lines[j]) > baseIndent) { fakeLines.push(lines[j]); j++; }
      const child = parseMapping(fakeLines, 0, getIndent(fakeLines[0]));
      arr.push(child.value); i = j;
    } else { arr.push(coerceScalar(itemStr)); i++; }
  }
  return { value: arr, nextLine: i };
}

// ── Stats counter ─────────────────────────────────────────────────────────────

function countStats(value: unknown, depth: number = 0): { keys: number; maxDepth: number } {
  if (value === null || typeof value !== 'object') return { keys: 0, maxDepth: depth };
  if (Array.isArray(value)) {
    let keys = 0; let maxDepth = depth;
    for (const item of value) {
      const s = countStats(item, depth + 1);
      keys += s.keys; maxDepth = Math.max(maxDepth, s.maxDepth);
    }
    return { keys, maxDepth };
  }
  const entries = Object.entries(value as Record<string, unknown>);
  let keys = entries.length; let maxDepth = depth;
  for (const [, v] of entries) {
    const s = countStats(v, depth + 1);
    keys += s.keys; maxDepth = Math.max(maxDepth, s.maxDepth);
  }
  return { keys, maxDepth };
}

// ── Linter ─────────────────────────────────────────────────────────────────────

function lintYaml(src: string): LintResult {
  if (!src.trim()) return { ok: true, issues: [], stats: { lineCount: 0, keyCount: 0, maxDepth: 0, charCount: 0 } };

  const lines = src.split('\n');
  const issues: LintIssue[] = [];

  // Pass 1: structural checks (pre-parse)
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNum = i + 1;

    // Tab indentation error
    if (/^\t/.test(raw)) {
      issues.push({
        severity: 'error',
        line: lineNum,
        col: 1,
        message: 'Tab character used for indentation',
        fix: 'Replace all tab characters with spaces. YAML requires spaces for indentation.',
      });
    }

    // Very long lines (warning)
    if (raw.length > 120) {
      issues.push({
        severity: 'warning',
        line: lineNum,
        col: 121,
        message: `Line is ${raw.length} characters long (exceeds 120-char limit)`,
        fix: 'Break long values into multi-line block scalars using "|" or ">" notation.',
      });
    }

    // Trailing whitespace (warning)
    if (/\s+$/.test(raw) && raw.trim() !== '') {
      const col = raw.trimEnd().length + 1;
      issues.push({
        severity: 'warning',
        line: lineNum,
        col,
        message: 'Trailing whitespace detected',
        fix: 'Remove trailing spaces or tabs at the end of the line.',
      });
    }

    // Unquoted bare-word boolean/null keys (warning)
    const keyMatch = raw.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
    if (keyMatch) {
      const keyName = keyMatch[2].toLowerCase();
      if (BARE_WORD_KEYS.has(keyName)) {
        const col = (keyMatch[1]?.length ?? 0) + 1;
        issues.push({
          severity: 'warning',
          line: lineNum,
          col,
          message: `Unquoted key "${keyMatch[2]}" is a YAML boolean/null literal`,
          fix: `Quote the key: '"${keyMatch[2]}": ...' to prevent it being interpreted as ${keyName === 'true' || keyName === 'false' || keyName === 'yes' || keyName === 'no' || keyName === 'on' || keyName === 'off' ? 'a boolean' : 'null'}.`,
        });
      }
    }

    // Unquoted boolean/null values that are ambiguous (warning)
    const valMatch = raw.match(/^(\s*[^:]+:\s*)(yes|no|on|off)(\s*(#.*)?)?$/i);
    if (valMatch) {
      const colOffset = (valMatch[1]?.length ?? 0) + 1;
      issues.push({
        severity: 'warning',
        line: lineNum,
        col: colOffset,
        message: `Unquoted value "${valMatch[2]}" may be interpreted as a boolean in some YAML parsers`,
        fix: `Quote the value: '"${valMatch[2]}"' to ensure it is treated as a string.`,
      });
    }

    // Missing space after colon (error)
    if (!isBlankOrComment(raw)) {
      const colonNoSpace = raw.match(/^(\s*[^'"#\s][^'"]*[^'"\s]):([^\s/\n])/);
      if (colonNoSpace && !raw.trim().startsWith('-')) {
        const col = (colonNoSpace[1]?.length ?? 0) + 2;
        issues.push({
          severity: 'error',
          line: lineNum,
          col,
          message: 'Missing space after colon in key-value pair',
          fix: 'Add a space after the colon: "key: value" (not "key:value").',
        });
      }
    }

    // Duplicate document start markers
    if (raw.trim() === '---' && i > 0) {
      const prevDocStart = lines.slice(0, i).some(l => l.trim() === '---');
      if (prevDocStart) {
        issues.push({
          severity: 'warning',
          line: lineNum,
          col: 1,
          message: 'Multiple "---" document start markers found',
          fix: 'Use a single "---" at the top of the file unless you intentionally have multiple YAML documents.',
        });
      }
    }
  }

  // Pass 2: parse for structural errors + deep nesting detection
  // Tab errors would already have been caught; still attempt parse
  const hasTabError = issues.some(i => i.severity === 'error' && i.message.includes('Tab'));
  if (hasTabError) {
    return { ok: false, issues };
  }

  let parsedValue: unknown = null;
  let parseError: { line: number; col: number; message: string } | null = null;

  try {
    const result = parseValue(lines, 0, 0);
    parsedValue = result.value;
  } catch (e: unknown) {
    if (e instanceof YamlParseError) {
      parseError = { line: e.line, col: e.col, message: e.message };
    } else {
      parseError = { line: 0, col: 0, message: String(e) };
    }
  }

  if (parseError) {
    issues.unshift({
      severity: 'error',
      line: parseError.line,
      col: parseError.col,
      message: parseError.message,
      fix: getSyntaxFix(parseError.message),
    });
    return { ok: false, issues };
  }

  // Pass 3: deep nesting warning (walk indentation levels)
  const indentLevels: number[] = [];
  let prevIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (isBlankOrComment(raw)) continue;
    const indent = getIndent(raw);
    if (indent > prevIndent) indentLevels.push(indent);
    else if (indent < prevIndent) {
      while (indentLevels.length > 0 && indentLevels[indentLevels.length - 1] > indent) indentLevels.pop();
    }
    if (indentLevels.length > 5) {
      issues.push({
        severity: 'warning',
        line: i + 1,
        col: indent + 1,
        message: `Nesting depth ${indentLevels.length} exceeds recommended maximum of 5`,
        fix: 'Consider flattening deeply nested structures, or splitting into separate YAML anchors/aliases (&anchor / *alias).',
      });
      // Only warn once per deep block
      while (i < lines.length - 1 && !isBlankOrComment(lines[i + 1]) && getIndent(lines[i + 1]) >= indent) i++;
    }
    prevIndent = indent;
  }

  // Deduplicate warnings on same line (keep first per line+message combo)
  const seen = new Set<string>();
  const dedupedIssues = issues.filter(issue => {
    const key = `${issue.line}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  const stats = countStats(parsedValue);
  return {
    ok: dedupedIssues.filter(i => i.severity === 'error').length === 0,
    issues: dedupedIssues,
    stats: {
      lineCount: lines.length,
      keyCount: stats.keys,
      maxDepth: stats.maxDepth,
      charCount: src.length,
    },
  };
}

function getSyntaxFix(message: string): string {
  if (message.includes('Tab')) return 'Replace all tab characters with spaces.';
  if (message.includes('Duplicate key')) return 'Remove or rename the duplicate key. YAML does not allow the same key twice in a mapping.';
  if (message.includes('inline')) return 'Check that inline {} or [] sequences use valid JSON-compatible syntax with double quotes.';
  if (message.includes('indentation') || message.includes('indent')) return 'Ensure all indentation uses consistent spaces (2 or 4 per level). Never mix tabs and spaces.';
  return 'Check the YAML syntax at this line. Common issues: inconsistent indentation, missing colon after key, or unclosed quotes.';
}

// ── Formatter ─────────────────────────────────────────────────────────────────

function normalizeIndentation(src: string, spaces: number = 2): string {
  // Detect current indent size
  const lines = src.split('\n');
  const nonBlank = lines.filter(l => !isBlankOrComment(l) && l.trim() !== '');
  let minIndent = Infinity;
  for (const l of nonBlank) {
    const ind = getIndent(l);
    if (ind > 0) minIndent = Math.min(minIndent, ind);
  }
  if (!isFinite(minIndent) || minIndent === spaces) return src; // already correct or no indentation

  return lines.map(line => {
    if (isBlankOrComment(line)) return line;
    const ind = getIndent(line);
    const level = Math.round(ind / minIndent);
    return ' '.repeat(level * spaces) + line.trimStart();
  }).join('\n');
}

// ── Sample YAML with intentional errors ───────────────────────────────────────

const SAMPLE_YAML = `# CI/CD pipeline configuration
name: deploy-pipeline
version: 2.1

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: 18
  yes: true
  no: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          CI:true

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying..."
          ./scripts/deploy.sh
        env:
          API_KEY: \${{ secrets.DEPLOY_API_KEY }}
          REGION: us-east-1
          DEBUG: yes
`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function YamlLinter() {
  const [input, setInput] = useState(SAMPLE_YAML);
  const [result, setResult] = useState<LintResult>({ ok: true, issues: [] });
  const [copied, setCopied] = useState(false);
  const [formatted, setFormatted] = useState('');
  const [showFormatted, setShowFormatted] = useState(false);

  // Debounced lint
  useEffect(() => {
    const timer = setTimeout(() => {
      setResult(lintYaml(input));
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const handleFormat = useCallback(() => {
    const normalized = normalizeIndentation(input, 2);
    setFormatted(normalized);
    setShowFormatted(true);
    setInput(normalized);
  }, [input]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [input]);

  const handleLoadSample = useCallback(() => {
    setInput(SAMPLE_YAML);
    setShowFormatted(false);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setShowFormatted(false);
  }, []);

  const errors = result.issues.filter(i => i.severity === 'error');
  const warnings = result.issues.filter(i => i.severity === 'warning');

  const statusBg = !input.trim()
    ? 'bg-bg-card border border-border'
    : result.ok && errors.length === 0
    ? 'bg-green-500/10 border border-green-500/30'
    : 'bg-red-500/10 border border-red-500/30';

  const statusText = !input.trim()
    ? 'text-text-muted'
    : result.ok && errors.length === 0
    ? 'text-green-400'
    : 'text-red-400';

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap gap-2 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          <button
            onClick={handleFormat}
            disabled={!input.trim()}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            Format / Indent
          </button>
          <button
            onClick={handleCopy}
            disabled={!input.trim()}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div class="flex gap-2">
          <button
            onClick={handleLoadSample}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={handleClear}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-red-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status bar */}
      {input.trim() && (
        <div class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${statusBg} ${statusText}`}>
          <span class="font-mono text-base font-bold">{errors.length === 0 ? '✓' : '✗'}</span>
          {errors.length === 0 ? (
            <span>
              Valid YAML
              {warnings.length > 0 && (
                <span class="ml-2 text-yellow-400">· {warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
              )}
            </span>
          ) : (
            <span>
              {errors.length} error{errors.length !== 1 ? 's' : ''}
              {warnings.length > 0 && (
                <span class="ml-2 text-yellow-400">· {warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-text-muted">YAML Input</label>
          <span class="text-xs text-text-muted">{input.split('\n').length} lines · {input.length} chars</span>
        </div>
        <textarea
          class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder="Paste your YAML here to lint and validate..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
      </div>

      {/* Issues panel */}
      {input.trim() && result.issues.length > 0 && (
        <div class="rounded-lg border border-border overflow-hidden">
          <div class="bg-bg-card px-4 py-2 border-b border-border flex items-center gap-3 text-sm font-medium">
            {errors.length > 0 && (
              <span class="flex items-center gap-1.5 text-red-400">
                <span class="w-2 h-2 rounded-full bg-red-400 inline-block" />
                {errors.length} Error{errors.length !== 1 ? 's' : ''}
              </span>
            )}
            {warnings.length > 0 && (
              <span class="flex items-center gap-1.5 text-yellow-400">
                <span class="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div class="divide-y divide-border max-h-72 overflow-y-auto">
            {result.issues.map((issue, idx) => (
              <div
                key={idx}
                class={`px-4 py-3 text-sm ${issue.severity === 'error' ? 'bg-red-500/5' : 'bg-yellow-500/5'}`}
              >
                <div class="flex items-start gap-3">
                  <span
                    class={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                      issue.severity === 'error'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-mono text-xs text-text-muted shrink-0">
                        Line {issue.line}{issue.col > 1 ? `, Col ${issue.col}` : ''}
                      </span>
                      <span class="text-text">{issue.message}</span>
                    </div>
                    <p class="text-xs text-text-muted mt-1">
                      <span class="font-medium text-primary">Fix: </span>
                      {issue.fix}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success stats */}
      {input.trim() && result.ok && errors.length === 0 && result.stats && (
        <div class="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <p class="text-xs font-medium text-green-400 uppercase tracking-wider mb-3">YAML is valid</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p class="text-xl font-bold text-text tabular-nums">{result.stats.lineCount}</p>
              <p class="text-xs text-text-muted mt-0.5">Lines</p>
            </div>
            <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p class="text-xl font-bold text-text tabular-nums">{result.stats.keyCount}</p>
              <p class="text-xs text-text-muted mt-0.5">Total Keys</p>
            </div>
            <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p class={`text-xl font-bold tabular-nums ${result.stats.maxDepth > 5 ? 'text-yellow-400' : 'text-text'}`}>
                {result.stats.maxDepth}
              </p>
              <p class="text-xs text-text-muted mt-0.5">Max Depth</p>
            </div>
            <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
              <p class="text-xl font-bold text-text tabular-nums">{result.stats.charCount}</p>
              <p class="text-xs text-text-muted mt-0.5">Characters</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state features */}
      {!input.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">What this linter checks</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Syntax errors with exact line and column number</li>
            <li>Tab indentation (YAML requires spaces)</li>
            <li>Duplicate keys in mappings</li>
            <li>Unquoted boolean/null keys (<code class="font-mono">yes</code>, <code class="font-mono">no</code>, <code class="font-mono">true</code>, <code class="font-mono">false</code>)</li>
            <li>Ambiguous bare-word values (<code class="font-mono">yes</code>, <code class="font-mono">no</code>, <code class="font-mono">on</code>, <code class="font-mono">off</code>)</li>
            <li>Lines exceeding 120 characters</li>
            <li>Deeply nested structures (more than 5 levels)</li>
            <li>Trailing whitespace</li>
            <li>Missing space after colon in key-value pairs</li>
          </ul>
        </div>
      )}
    </div>
  );
}
