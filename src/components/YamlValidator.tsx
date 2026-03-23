import { useState, useMemo, useEffect } from 'preact/hooks';
import { isProUser, canUse, recordUsage, remainingUses, FREE_DAILY_LIMIT } from '../utils/pro';

// ── Minimal YAML parser (supports scalar, mapping, sequence, nesting) ──────────

interface YamlError { line: number; message: string; }
interface ParseResult { ok: boolean; value?: unknown; error?: YamlError; }

function parseYaml(src: string): ParseResult {
  const lines = src.split('\n');
  // Pre-validate: reject tabs used for indentation
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\t/.test(raw)) {
      return { ok: false, error: { line: i + 1, message: 'Tab character used for indentation (YAML requires spaces)' } };
    }
  }

  try {
    const result = parseValue(lines, 0, 0);
    return { ok: true, value: result.value };
  } catch (e: unknown) {
    if (e instanceof YamlParseError) {
      return { ok: false, error: { line: e.line, message: e.message } };
    }
    return { ok: false, error: { line: 0, message: String(e) } };
  }
}

class YamlParseError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

interface ParseState { value: unknown; nextLine: number; }

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function isBlankOrComment(line: string): boolean {
  return /^\s*(#.*)?$/.test(line);
}

function parseValue(lines: string[], startLine: number, baseIndent: number): ParseState {
  // Skip blanks / comments
  let i = startLine;
  while (i < lines.length && isBlankOrComment(lines[i])) i++;
  if (i >= lines.length) return { value: null, nextLine: i };

  const line = lines[i];
  const indent = getIndent(line);
  const trimmed = line.trim();

  // Sequence
  if (trimmed.startsWith('- ') || trimmed === '-') {
    return parseSequence(lines, i, indent);
  }

  // Explicit mapping or scalar continuation check: look for "key:"
  if (/^[^:]+:/.test(trimmed) || /^[^:]+:\s*$/.test(trimmed)) {
    // Could be a mapping
    if (/^"[^"]*"\s*:/.test(trimmed) || /^'[^']*'\s*:/.test(trimmed) || /^[a-zA-Z0-9_\-. ]+\s*:/.test(trimmed)) {
      return parseMapping(lines, i, indent);
    }
  }

  // Scalar (could be multi-line block scalar, but we'll handle single-line)
  return parseScalar(lines, i);
}

function parseScalar(lines: string[], lineIdx: number): ParseState {
  const raw = lines[lineIdx].trim();
  const value = coerceScalar(raw);
  return { value, nextLine: lineIdx + 1 };
}

function coerceScalar(s: string): unknown {
  if (s === '' || s === '~' || s.toLowerCase() === 'null') return null;
  if (s.toLowerCase() === 'true') return true;
  if (s.toLowerCase() === 'false') return false;
  // Quoted string
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  // Number
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
  if (/^0x[0-9a-fA-F]+$/.test(s)) return parseInt(s, 16);
  return s;
}

function parseMapping(lines: string[], startLine: number, baseIndent: number): ParseState {
  const obj: Record<string, unknown> = {};
  let i = startLine;

  while (i < lines.length) {
    if (isBlankOrComment(lines[i])) { i++; continue; }
    const indent = getIndent(lines[i]);
    if (indent < baseIndent) break;
    if (indent > baseIndent) break;

    const trimmed = lines[i].trim().replace(/#[^'"]*$/, '').trim(); // strip inline comment

    // Match key: value or key:
    const m = trimmed.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^:]+?)\s*:\s*(.*)$/);
    if (!m) break;

    let key = m[1].trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1);
    }
    const valueStr = m[2].trim();

    if (key in obj) {
      // Duplicate key — YAML allows but we warn via error thrown
      throw new YamlParseError(`Duplicate key: "${key}"`, i + 1);
    }

    if (valueStr === '' || valueStr === null) {
      // Value is on next lines — peek ahead
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
        const child = parseValue(lines, nextNonBlank, getIndent(lines[nextNonBlank]));
        obj[key] = child.value;
        i = child.nextLine;
      } else {
        obj[key] = null;
        i++;
      }
    } else if (valueStr.startsWith('|') || valueStr.startsWith('>')) {
      // Block scalar (simplified: collect indented lines)
      const blockRes = parseBlockScalar(lines, i + 1, baseIndent, valueStr.startsWith('>'));
      obj[key] = blockRes.value;
      i = blockRes.nextLine;
    } else if (valueStr.startsWith('[') || valueStr.startsWith('{')) {
      // Inline sequence or mapping
      try {
        obj[key] = parseInline(valueStr, i);
      } catch {
        obj[key] = valueStr;
      }
      i++;
    } else {
      obj[key] = coerceScalar(valueStr);
      i++;
    }
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
      // Multi-line item
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
        const child = parseValue(lines, nextNonBlank, getIndent(lines[nextNonBlank]));
        arr.push(child.value);
        i = child.nextLine;
      } else {
        arr.push(null);
        i++;
      }
    } else if (/^[a-zA-Z0-9_\-. "'].*:/.test(itemStr)) {
      // Inline mapping in a sequence item
      const fakeLines = [' '.repeat(baseIndent + 2) + itemStr];
      const nextIdx = i + 1;
      // collect continuation lines at deeper indent
      let j = nextIdx;
      while (j < lines.length && !isBlankOrComment(lines[j]) && getIndent(lines[j]) > baseIndent) {
        fakeLines.push(lines[j]);
        j++;
      }
      const child = parseMapping(fakeLines, 0, getIndent(fakeLines[0]));
      arr.push(child.value);
      i = j;
    } else {
      arr.push(coerceScalar(itemStr));
      i++;
    }
  }

  return { value: arr, nextLine: i };
}

function parseBlockScalar(lines: string[], startLine: number, ownerIndent: number, fold: boolean): ParseState {
  const parts: string[] = [];
  let blockIndent = -1;
  let i = startLine;

  while (i < lines.length) {
    const raw = lines[i];
    if (isBlankOrComment(raw) && blockIndent === -1) { i++; continue; }
    const indent = getIndent(raw);
    if (blockIndent === -1) blockIndent = indent;
    if (indent < blockIndent && !isBlankOrComment(raw)) break;
    if (isBlankOrComment(raw)) { parts.push(''); }
    else { parts.push(raw.slice(blockIndent)); }
    i++;
  }

  const value = fold ? parts.join(' ').trim() : parts.join('\n').trimEnd();
  return { value, nextLine: i };
}

function parseInline(s: string, lineIdx: number): unknown {
  // Use JSON.parse for inline [] and {} (YAML inline is JSON-compatible for simple cases)
  // Replace YAML booleans to JSON
  const jsonCompatible = s
    .replace(/:\s*true\b/g, ': true')
    .replace(/:\s*false\b/g, ': false')
    .replace(/:\s*null\b/g, ': null')
    .replace(/:\s*~/g, ': null')
    // Single quotes to double
    .replace(/'([^']*)'/g, '"$1"');
  try {
    return JSON.parse(jsonCompatible);
  } catch {
    throw new YamlParseError(`Cannot parse inline value: ${s}`, lineIdx + 1);
  }
}

function findNextNonBlank(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    if (!isBlankOrComment(lines[i])) return i;
  }
  return -1;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

function formatYaml(value: unknown, indent: number = 2, level: number = 0): string {
  const pad = ' '.repeat(indent * level);
  const pad1 = ' '.repeat(indent * (level + 1));

  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Quote if contains special chars
    if (/[:#{}\[\],&*?|<>=!%@`\n]/.test(value) || /^\s/.test(value) || /\s$/.test(value) || value === '') {
      return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    // Quote if it looks like a keyword
    if (['true', 'false', 'null', '~', 'yes', 'no', 'on', 'off'].includes(value.toLowerCase())) {
      return `"${value}"`;
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map(v => `${pad}- ${formatYaml(v, indent, level)}`).join('\n');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries
      .map(([k, v]) => {
        const key = /[:#\[\]{},"'&*?|<>=!%@`\s]/.test(k) ? `"${k}"` : k;
        if (v !== null && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length > 0) {
          return `${pad}${key}:\n${formatYaml(v, indent, level + 1)}`;
        }
        if (Array.isArray(v) && v.length > 0) {
          return `${pad}${key}:\n${formatYaml(v, indent, level + 1)}`;
        }
        return `${pad}${key}: ${formatYaml(v, indent, level)}`;
      })
      .join('\n');
  }
  return String(value);
}

// ── Default example YAML ───────────────────────────────────────────────────────

const EXAMPLE_YAML = `name: my-project
version: 1.0.0
environment: production

database:
  host: localhost
  port: 5432
  name: mydb

features:
  - authentication
  - logging
  - caching

settings:
  debug: false
  timeout: 30
  api_key: "abc123"
`;

// ── JSON → YAML converter (Pro feature) ───────────────────────────────────────

function jsonToYaml(jsonStr: string, indent: number): { ok: boolean; output?: string; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    return { ok: true, output: formatYaml(parsed, indent) };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function YamlValidator() {
  const [input, setInput] = useState(EXAMPLE_YAML);
  const [indentSize, setIndentSize] = useState(2);
  const [mode, setMode] = useState<'validate' | 'format' | 'tojson' | 'fromjson'>('validate');
  const [copied, setCopied] = useState(false);
  const [pro, setPro] = useState(false);
  const [remaining, setRemaining] = useState(FREE_DAILY_LIMIT);
  const [limitHit, setLimitHit] = useState(false);
  const [usageRecorded, setUsageRecorded] = useState(false);

  useEffect(() => {
    setPro(isProUser());
    setRemaining(remainingUses('yaml-validator'));
  }, []);

  // For fromjson mode, input is JSON
  const isFromJson = mode === 'fromjson';

  const result = useMemo<ParseResult>(() => {
    if (isFromJson) return { ok: true, value: null }; // handled separately
    if (!input.trim()) return { ok: true, value: null };
    return parseYaml(input);
  }, [input, isFromJson]);

  const fromJsonResult = useMemo(() => {
    if (!isFromJson || !input.trim()) return null;
    return jsonToYaml(input, indentSize);
  }, [input, isFromJson, indentSize]);

  const output = useMemo(() => {
    if (!input.trim()) return '';
    if (isFromJson) return fromJsonResult?.ok ? fromJsonResult.output ?? '' : '';
    if (!result.ok) return '';
    if (mode === 'tojson') return JSON.stringify(result.value, null, indentSize);
    if (mode === 'format') return formatYaml(result.value, indentSize);
    return '';
  }, [result, fromJsonResult, mode, indentSize, input, isFromJson]);

  const handleModeChange = (m: typeof mode) => {
    if (m === 'fromjson' && !pro) return; // blocked for non-pro
    setMode(m);
    // Reset input to example for fromjson mode
    if (m === 'fromjson') setInput('{\n  "name": "my-project",\n  "version": "1.0.0",\n  "features": ["auth", "logging"]\n}');
    if (m !== 'fromjson' && mode === 'fromjson') setInput(EXAMPLE_YAML);
  };

  const handleAction = () => {
    if (!input.trim()) return;
    if (!pro && !canUse('yaml-validator')) {
      setLimitHit(true);
      return;
    }
    if (!pro && !usageRecorded) {
      recordUsage('yaml-validator');
      setRemaining(remainingUses('yaml-validator'));
      setUsageRecorded(true);
      setTimeout(() => setUsageRecorded(false), 60000); // allow next usage after 1 min
    }
    setLimitHit(false);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const lineCount = input.split('\n').length;

  const inputLabel = isFromJson ? 'JSON Input' : 'YAML Input';
  const inputPlaceholder = isFromJson ? 'Paste your JSON here...' : 'Paste your YAML here...';
  const outputLabel = isFromJson ? 'YAML Output' : mode === 'format' ? 'Formatted YAML' : 'JSON Output';

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2 flex-wrap">
          {(['validate', 'format', 'tojson'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {m === 'validate' ? 'Validate' : m === 'format' ? 'Format' : 'YAML → JSON'}
            </button>
          ))}
          {/* Pro: JSON → YAML */}
          <button
            onClick={() => handleModeChange('fromjson')}
            title={!pro ? 'Pro feature — upgrade to unlock' : undefined}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              mode === 'fromjson' ? 'bg-primary text-white' :
              !pro ? 'bg-bg-card border border-border text-text-muted/50 cursor-default' :
              'bg-bg-card border border-border text-text-muted hover:border-primary'
            }`}
          >
            {!pro && <span class="text-xs">🔒</span>}
            JSON → YAML
            {!pro && <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full ml-1">Pro</span>}
          </button>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Indent:</label>
          {[2, 4].map((n) => (
            <button
              key={n}
              onClick={() => setIndentSize(n)}
              class={`px-3 py-1.5 rounded text-sm transition-colors ${indentSize === n ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => setInput(isFromJson ? '{\n  "name": "my-project",\n  "version": "1.0.0"\n}' : EXAMPLE_YAML)}
          class="ml-auto text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
        >
          Load Example
        </button>
      </div>

      {!pro && (
        <div class="flex items-center justify-between text-xs">
          <span class="text-text-muted">
            {remaining > 0 ? `${remaining} free use${remaining !== 1 ? 's' : ''} remaining today` : 'Daily limit reached'}
          </span>
          <a href="/pro" class="text-primary hover:underline">Pro: unlimited + JSON→YAML →</a>
        </div>
      )}

      {/* Status bar (YAML modes only) */}
      {!isFromJson && input.trim() && (
        <div class={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${result.ok ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          <span class="font-mono text-base">{result.ok ? '✓' : '✗'}</span>
          {result.ok
            ? `Valid YAML · ${lineCount} lines`
            : `Error on line ${result.error!.line}: ${result.error!.message}`}
        </div>
      )}

      {/* Status bar (fromjson mode) */}
      {isFromJson && input.trim() && fromJsonResult && (
        <div class={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${fromJsonResult.ok ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          <span class="font-mono text-base">{fromJsonResult.ok ? '✓' : '✗'}</span>
          {fromJsonResult.ok ? 'Valid JSON · converted to YAML' : `JSON parse error: ${fromJsonResult.error}`}
        </div>
      )}

      <div class={`grid gap-4 ${mode !== 'validate' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Input */}
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">{inputLabel}</label>
            <button onClick={() => setInput('')} class="text-xs text-text-muted hover:text-primary transition-colors">Clear</button>
          </div>
          <textarea
            class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder={inputPlaceholder}
            value={input}
            onInput={(e) => { setInput((e.target as HTMLTextAreaElement).value); handleAction(); }}
            spellcheck={false}
          />
          <div class="flex justify-between mt-1">
            <span class="text-xs text-text-muted">{lineCount} lines · {input.length} chars</span>
            {!isFromJson && result.ok && input.trim() && (
              <button onClick={() => copy(input)} class="text-xs text-text-muted hover:text-primary transition-colors">
                Copy input
              </button>
            )}
          </div>
        </div>

        {/* Output */}
        {mode !== 'validate' && (
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-text-muted">{outputLabel}</label>
              <button
                onClick={() => copy(output)}
                disabled={!output}
                class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              readOnly
              class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
              placeholder={isFromJson ? (fromJsonResult?.ok ? 'YAML output…' : 'Fix JSON errors first…') : (result.ok ? (mode === 'format' ? 'Formatted YAML…' : 'JSON output…') : 'Fix errors first…')}
              value={output}
            />
            {output && (
              <div class="flex justify-end mt-1">
                <span class="text-xs text-text-muted">{output.split('\n').length} lines · {output.length} chars</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Structure preview (validate mode) */}
      {mode === 'validate' && result.ok && input.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4">
          <p class="text-xs font-medium text-text-muted mb-2 uppercase tracking-wider">Parsed Structure</p>
          <pre class="text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
            {JSON.stringify(result.value, null, 2)}
          </pre>
        </div>
      )}

      {/* Limit hit banner */}
      {limitHit && (
        <div class="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-yellow-400">Daily limit reached ({FREE_DAILY_LIMIT}/{FREE_DAILY_LIMIT} uses today)</p>
            <p class="text-xs text-text-muted mt-0.5">Upgrade to Pro for unlimited YAML validation + JSON↔YAML conversion.</p>
          </div>
          <a href="/pro" class="shrink-0 ml-4 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Go Pro →
          </a>
        </div>
      )}

      {/* Features */}
      {!input.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-1">Features</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Validates YAML syntax and shows exact error line</li>
            <li>Detects tab indentation, duplicate keys, and structural issues</li>
            <li>Formats YAML with consistent indentation (2 or 4 spaces)</li>
            <li>Converts YAML to JSON for API/config use</li>
            <li>Supports mappings, sequences, nested structures, and scalars</li>
            <li>Runs entirely in your browser — nothing is sent to a server</li>
            <li class="text-primary/80">🔒 Pro: JSON → YAML reverse conversion</li>
          </ul>
        </div>
      )}

      {pro && <p class="text-xs text-primary text-right">✓ Pro — unlimited + JSON↔YAML</p>}
    </div>
  );
}
