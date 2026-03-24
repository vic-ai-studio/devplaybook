import { useState } from 'preact/hooks';

function jsonToYaml(value: unknown, depth = 0): string {
  const pad = '  '.repeat(depth);
  if (value === null) return 'null';
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    if (value === '' || /[\n:#{}\[\],&*?|<>=!%@`]/.test(value) || /^(true|false|null|yes|no|on|off)$/i.test(value)) {
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
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const safe = /^[a-zA-Z0-9_-]+$/.test(k) ? k : JSON.stringify(k);
      if (typeof v === 'object' && v !== null) {
        const child = jsonToYaml(v, depth + 1);
        return `\n${pad}${safe}:${child.startsWith('\n') ? child : ' ' + child}`;
      }
      return `\n${pad}${safe}: ${jsonToYaml(v, depth + 1)}`;
    }).join('');
  }
  return String(value);
}

function convert(src: string, mode: 'j2y' | 'y2j'): { ok: boolean; result?: string; error?: string } {
  try {
    if (mode === 'j2y') {
      const parsed = JSON.parse(src);
      const yaml = jsonToYaml(parsed).trimStart();
      return { ok: true, result: yaml };
    } else {
      // Simple YAML→JSON: key: value line parser
      const lines = src.split('\n');
      const obj: Record<string, unknown> = {};
      for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('#')) continue;
        const m = line.match(/^([^:]+):\s*(.*)$/);
        if (!m) continue;
        const k = m[1].trim();
        const v = m[2].trim();
        if (v === '') continue;
        if (v === 'null') obj[k] = null;
        else if (v === 'true') obj[k] = true;
        else if (v === 'false') obj[k] = false;
        else if (/^-?\d+(\.\d+)?$/.test(v)) obj[k] = Number(v);
        else if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) obj[k] = v.slice(1, -1);
        else obj[k] = v;
      }
      return { ok: true, result: JSON.stringify(obj, null, 2) };
    }
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export default function JsonYamlConverter() {
  const [mode, setMode] = useState<'j2y' | 'y2j'>('j2y');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const result = input.trim() ? convert(input, mode) : null;

  const copy = () => {
    if (!result?.result) return;
    navigator.clipboard.writeText(result.result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const placeholder = mode === 'j2y'
    ? `{\n  "name": "Alice",\n  "age": 30,\n  "tags": ["dev", "ops"]\n}`
    : `name: Alice\nage: 30\ncity: New York`;

  return (
    <div class="space-y-4">
      <div class="flex gap-2">
        <button onClick={() => setMode('j2y')} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === 'j2y' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
          JSON → YAML
        </button>
        <button onClick={() => setMode('y2j')} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === 'y2j' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
          YAML → JSON
        </button>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">{mode === 'j2y' ? 'JSON Input' : 'YAML Input'}</label>
        <textarea
          class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={placeholder}
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {result && (
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">{result.ok ? (mode === 'j2y' ? 'YAML Output' : 'JSON Output') : 'Error'}</label>
            {result.ok && <button onClick={copy} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">{copied ? '✓ Copied!' : 'Copy'}</button>}
          </div>
          {result.ok
            ? <textarea readOnly class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none" value={result.result} />
            : <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 font-mono">{result.error}</div>
          }
        </div>
      )}
    </div>
  );
}
