import { useState, useCallback } from 'preact/hooks';

// ── YAML → JSON parser (supports multi-document, nested, arrays) ──────────────
type YamlValue = string | number | boolean | null | YamlValue[] | Record<string, YamlValue>;

function parseYamlValue(raw: string): YamlValue {
  const s = raw.trim();
  if (s === 'null' || s === '~' || s === '') return null;
  if (s === 'true' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === 'no' || s === 'off') return false;
  if (/^-?\d+$/.test(s) && !s.startsWith('0')) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
  }
  // Strip inline comments
  return s.replace(/ #.*$/, '').trim();
}

interface YamlLine { indent: number; key?: string; value?: string; listItem: boolean }

function tokenizeLine(raw: string): YamlLine | null {
  if (/^\s*#/.test(raw) || raw.trim() === '') return null;
  const indent = raw.length - raw.trimStart().length;
  const content = raw.trimStart();

  // Strip inline comment (not inside quotes)
  let stripped = content;
  const commentMatch = content.match(/^([^'"#]*)#/);
  if (commentMatch) stripped = commentMatch[1].trimEnd();
  else stripped = content.trim();

  // List item
  if (stripped.startsWith('- ') || stripped === '-') {
    const val = stripped.slice(2).trim();
    return { indent, value: val || undefined, listItem: true };
  }
  // Key-value
  const colonIdx = stripped.indexOf(':');
  if (colonIdx === -1) return { indent, value: stripped, listItem: false };
  const key = stripped.slice(0, colonIdx).trim();
  const val = stripped.slice(colonIdx + 1).trim();
  return { indent, key, value: val || undefined, listItem: false };
}

function parseYamlDocument(text: string): YamlValue {
  const lines = text.split('\n');
  const tokens: (YamlLine & { raw: string })[] = [];
  for (const raw of lines) {
    const t = tokenizeLine(raw);
    if (t) tokens.push({ ...t, raw });
  }

  function parseBlock(start: number, baseIndent: number): { value: YamlValue; next: number } {
    if (start >= tokens.length) return { value: null, next: start };

    const t = tokens[start];
    // Determine if this block is an array or object
    if (t.listItem) {
      // Array block
      const arr: YamlValue[] = [];
      let i = start;
      while (i < tokens.length && tokens[i].indent === baseIndent && tokens[i].listItem) {
        const curr = tokens[i];
        if (curr.value && curr.value !== '') {
          // Inline value
          arr.push(parseYamlValue(curr.value));
          i++;
        } else {
          // Next lines are nested
          i++;
          if (i < tokens.length && tokens[i].indent > baseIndent) {
            const child = parseBlock(i, tokens[i].indent);
            arr.push(child.value);
            i = child.next;
          } else {
            arr.push(null);
          }
        }
      }
      return { value: arr, next: i };
    } else {
      // Object block
      const obj: Record<string, YamlValue> = {};
      let i = start;
      while (i < tokens.length && tokens[i].indent === baseIndent && !tokens[i].listItem) {
        const curr = tokens[i];
        const key = curr.key ?? curr.value ?? '';
        if (!curr.key && curr.value) {
          // bare scalar (shouldn't happen in well-formed YAML)
          i++;
          continue;
        }
        if (curr.value && curr.value !== '' && curr.value !== '|' && curr.value !== '>') {
          // Inline scalar
          // Check if it looks like an inline array/object
          const v = curr.value;
          if (v.startsWith('[')) {
            try {
              obj[key] = JSON.parse(v.replace(/'/g, '"'));
            } catch {
              obj[key] = v;
            }
          } else if (v.startsWith('{')) {
            try {
              obj[key] = JSON.parse(v.replace(/'/g, '"'));
            } catch {
              obj[key] = v;
            }
          } else {
            obj[key] = parseYamlValue(v);
          }
          i++;
        } else if (curr.value === '|' || curr.value === '>') {
          // Block scalar
          const blockStyle = curr.value;
          i++;
          const blockLines: string[] = [];
          const childIndent = i < tokens.length ? tokens[i].indent : baseIndent + 2;
          while (i < tokens.length && tokens[i].indent >= childIndent) {
            blockLines.push(tokens[i].raw.slice(childIndent));
            i++;
          }
          obj[key] = blockStyle === '|' ? blockLines.join('\n') : blockLines.join(' ').trim();
        } else {
          // Children
          i++;
          if (i < tokens.length && tokens[i].indent > baseIndent) {
            const child = parseBlock(i, tokens[i].indent);
            obj[key] = child.value;
            i = child.next;
          } else {
            obj[key] = null;
          }
        }
      }
      return { value: obj, next: i };
    }
  }

  if (tokens.length === 0) return null;
  return parseBlock(0, tokens[0].indent).value;
}

function yamlToJson(yaml: string, pretty: boolean): { documents: string[]; errors: string[] } {
  // Split on document separators
  const docTexts = yaml.split(/^---\s*$/m).filter(d => d.trim() !== '' && d.trim() !== '...');
  const documents: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < docTexts.length; i++) {
    try {
      const parsed = parseYamlDocument(docTexts[i]);
      documents.push(JSON.stringify(parsed, null, pretty ? 2 : undefined));
    } catch (e) {
      errors.push(`Document ${i + 1}: ${(e as Error).message}`);
    }
  }
  return { documents, errors };
}

// ── JSON → YAML converter ─────────────────────────────────────────────────────
function jsonToYaml(value: YamlValue, depth = 0): string {
  const pad = '  '.repeat(depth);
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value === '' || /[\n:#{}\[\],&*?|<>=!%@`]/.test(value) ||
        /^(true|false|null|yes|no|on|off)$/i.test(value) || /^-?\d/.test(value)) {
      return JSON.stringify(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value.map(item => {
      const v = jsonToYaml(item, depth + 1);
      return `\n${pad}- ${v.startsWith('\n') ? v.trimStart() : v}`;
    }).join('');
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, YamlValue>);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const safeKey = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
      if (typeof v === 'object' && v !== null) {
        const child = jsonToYaml(v, depth + 1);
        return `\n${pad}${safeKey}:${child.startsWith('\n') ? child : ' ' + child}`;
      }
      return `\n${pad}${safeKey}: ${jsonToYaml(v, depth + 1)}`;
    }).join('');
  }
  return String(value);
}

function jsonToYamlStr(json: string): { result: string; error?: string } {
  try {
    const parsed = JSON.parse(json);
    const yaml = jsonToYaml(parsed).trimStart();
    return { result: yaml };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
type Mode = 'y2j' | 'j2y';

export default function YamlToJsonConverter() {
  const [mode, setMode] = useState<Mode>('y2j');
  const [input, setInput] = useState('');
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useCallback(() => {
    if (!input.trim()) return { output: '', errors: [] };
    if (mode === 'y2j') {
      const { documents, errors } = yamlToJson(input, pretty);
      const output = documents.length > 1
        ? documents.map((d, i) => `// Document ${i + 1}\n${d}`).join('\n\n')
        : documents[0] ?? '';
      return { output, errors };
    } else {
      const { result: r, error } = jsonToYamlStr(input);
      return { output: r ?? '', errors: error ? [error] : [] };
    }
  }, [input, mode, pretty]);

  const { output, errors } = result();

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleSwap = () => {
    setInput(output);
    setMode(m => (m === 'y2j' ? 'j2y' : 'y2j'));
  };

  const EXAMPLES: Record<Mode, string> = {
    y2j: `---
name: Alice
age: 30
active: true
roles:
  - admin
  - editor
address:
  city: Taipei
  zip: "100"
---
name: Bob
age: 25`,
    j2y: `{
  "name": "Alice",
  "age": 30,
  "active": true,
  "roles": ["admin", "editor"],
  "address": {
    "city": "Taipei",
    "zip": "100"
  }
}`,
  };

  return (
    <div class="space-y-4 font-mono text-sm">
      {/* Mode switcher */}
      <div class="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setMode('y2j')}
          class={`px-4 py-2 rounded-lg font-sans text-sm font-medium border transition-colors ${mode === 'y2j' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}
        >YAML → JSON</button>
        <button
          onClick={() => setMode('j2y')}
          class={`px-4 py-2 rounded-lg font-sans text-sm font-medium border transition-colors ${mode === 'j2y' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}
        >JSON → YAML</button>
        {mode === 'y2j' && (
          <label class="flex items-center gap-2 ml-auto text-text-muted font-sans cursor-pointer select-none">
            <input type="checkbox" checked={pretty} onChange={e => setPretty((e.target as HTMLInputElement).checked)} class="accent-accent" />
            Pretty print
          </label>
        )}
        <button
          onClick={() => setInput(EXAMPLES[mode])}
          class="ml-auto font-sans text-xs text-accent underline"
        >Load example</button>
      </div>

      {/* Input */}
      <div>
        <label class="block text-xs text-text-muted mb-1 font-sans">{mode === 'y2j' ? 'YAML Input (use --- to separate documents)' : 'JSON Input'}</label>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder={mode === 'y2j' ? 'Paste YAML here...' : 'Paste JSON here...'}
          rows={12}
          class="w-full p-3 bg-bg-secondary border border-border rounded-lg resize-y focus:outline-none focus:border-accent text-sm font-mono"
        />
      </div>

      {/* Action buttons */}
      <div class="flex gap-2 flex-wrap">
        <button
          onClick={handleSwap}
          disabled={!output}
          class="px-3 py-1.5 rounded border border-border text-text-muted hover:border-accent hover:text-accent disabled:opacity-40 font-sans text-xs transition-colors"
        >⇄ Swap input/output</button>
        <button
          onClick={() => setInput('')}
          class="px-3 py-1.5 rounded border border-border text-text-muted hover:border-accent font-sans text-xs transition-colors"
        >Clear</button>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          {errors.map((e, i) => (
            <p key={i} class="text-red-400 text-xs font-sans">⚠ {e}</p>
          ))}
        </div>
      )}

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-xs text-text-muted font-sans">{mode === 'y2j' ? 'JSON Output' : 'YAML Output'}</label>
          {output && (
            <button
              onClick={handleCopy}
              class="text-xs font-sans text-accent hover:underline"
            >{copied ? '✓ Copied!' : 'Copy'}</button>
          )}
        </div>
        <pre class="w-full p-3 bg-bg-secondary border border-border rounded-lg overflow-auto max-h-80 text-sm whitespace-pre-wrap break-words">
          {output || <span class="text-text-muted italic">Output appears here...</span>}
        </pre>
      </div>

      {/* Multi-doc note */}
      {mode === 'y2j' && (
        <p class="text-xs text-text-muted font-sans">
          💡 Separate multiple YAML documents with <code class="bg-bg-secondary px-1 rounded">---</code> — each will be converted independently.
        </p>
      )}
    </div>
  );
}
