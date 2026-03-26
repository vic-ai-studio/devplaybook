import { useState } from 'preact/hooks';

function parseTomlValue(s: string): unknown {
  s = s.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (s.startsWith('"') && s.endsWith('"'))
    return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(x => parseTomlValue(x.trim()));
  }
  return s;
}

function parseToml(src: string): { ok: boolean; value?: unknown; error?: string } {
  try {
    const root: Record<string, unknown> = {};
    let current: Record<string, unknown> = root;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const ci = line.indexOf('#');
      if (ci >= 0 && !line.slice(0, ci).includes('"')) line = line.slice(0, ci);
      line = line.trim();
      if (!line) continue;
      if (line.startsWith('[')) {
        const m = line.match(/^\[([^\]]+)\]$/);
        if (!m) throw new Error(`Line ${i + 1}: Invalid section header: ${line}`);
        const key = m[1].trim();
        if (!root[key]) root[key] = {};
        current = root[key] as Record<string, unknown>;
        continue;
      }
      const eq = line.indexOf('=');
      if (eq === -1) throw new Error(`Line ${i + 1}: Expected key = value, got: ${line}`);
      const key = line.slice(0, eq).trim();
      const valStr = line.slice(eq + 1).trim();
      current[key] = parseTomlValue(valStr);
    }
    return { ok: true, value: root };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function jsonValueToToml(val: unknown, indent = ''): string {
  if (val === null) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;
  if (Array.isArray(val)) {
    const items = val.map(v => jsonValueToToml(v, indent));
    return `[${items.join(', ')}]`;
  }
  return '"[object]"';
}

function jsonToToml(obj: unknown, parentKey = ''): string {
  if (typeof obj !== 'object' || obj === null) return '';
  const record = obj as Record<string, unknown>;
  const lines: string[] = [];
  const sections: string[] = [];

  for (const [k, v] of Object.entries(record)) {
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      const sectionKey = parentKey ? `${parentKey}.${k}` : k;
      sections.push(`\n[${sectionKey}]\n${jsonToToml(v, sectionKey)}`);
    } else {
      lines.push(`${k} = ${jsonValueToToml(v)}`);
    }
  }

  return [...lines, ...sections].join('\n');
}

const EXAMPLE_TOML = `[package]
name = "my-app"
version = "1.0.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = "1.0"

[server]
host = "0.0.0.0"
port = 8080
debug = false`;

const EXAMPLE_JSON = `{
  "package": {
    "name": "my-app",
    "version": "1.0.0"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 8080,
    "debug": false
  }
}`;

export default function TomlToJsonConverter() {
  const [mode, setMode] = useState<'toml-to-json' | 'json-to-toml'>('toml-to-json');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  let output = '';
  let error = '';

  if (input.trim()) {
    if (mode === 'toml-to-json') {
      const result = parseToml(input);
      if (result.ok) output = JSON.stringify(result.value, null, 2);
      else error = result.error || 'Parse error';
    } else {
      try {
        const parsed = JSON.parse(input);
        output = jsonToToml(parsed).trim();
      } catch (e: any) {
        error = `JSON parse error: ${e.message}`;
      }
    }
  }

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const loadExample = () => {
    setInput(mode === 'toml-to-json' ? EXAMPLE_TOML : EXAMPLE_JSON);
  };

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-3 flex-wrap">
        <div class="flex gap-2">
          {([['toml-to-json', 'TOML → JSON'], ['json-to-toml', 'JSON → TOML']] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => { setMode(m); setInput(''); }}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div class="flex gap-2 ml-auto">
          <button onClick={loadExample} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Load Example</button>
          <button onClick={() => setInput('')} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">
            {mode === 'toml-to-json' ? 'TOML Input' : 'JSON Input'}
          </label>
          <textarea
            class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder={mode === 'toml-to-json'
              ? '[section]\nkey = "value"\nport = 8080'
              : '{\n  "key": "value",\n  "port": 8080\n}'}
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          />
          <div class="flex justify-between mt-1">
            <span class="text-xs text-text-muted">{input.length} chars</span>
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">
              {mode === 'toml-to-json' ? 'JSON Output' : 'TOML Output'}
            </label>
            {output && (
              <button onClick={copy} class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>
          {error ? (
            <div class="w-full h-64 bg-red-500/5 border border-red-500/30 rounded-lg p-3 font-mono text-sm text-red-400 overflow-auto">
              {error}
            </div>
          ) : (
            <textarea
              readOnly
              class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
              placeholder="Output appears here..."
              value={output}
            />
          )}
        </div>
      </div>

      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">
            {mode === 'toml-to-json' ? 'TOML features supported' : 'JSON to TOML notes'}
          </p>
          {mode === 'toml-to-json' ? (
            <ul class="space-y-1 text-xs">
              <li>• <code class="font-mono">[section]</code> headers → nested objects</li>
              <li>• Strings, integers, floats, booleans</li>
              <li>• Inline arrays <code class="font-mono">[1, 2, 3]</code></li>
              <li>• Comments stripped automatically</li>
            </ul>
          ) : (
            <ul class="space-y-1 text-xs">
              <li>• Nested objects become <code class="font-mono">[sections]</code></li>
              <li>• Strings, numbers, booleans, arrays converted</li>
              <li>• Top-level keys output first, then sections</li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
