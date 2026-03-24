import { useState } from 'preact/hooks';

function parseTomlValue(s: string): unknown {
  s = s.trim();
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (!inner) return [];
    // Simple array split (doesn't handle nested arrays or quoted commas)
    return inner.split(',').map(x => parseTomlValue(x.trim()));
  }
  return s; // bare value
}

function parseToml(src: string): { ok: boolean; value?: unknown; error?: string } {
  try {
    const root: Record<string, unknown> = {};
    let current: Record<string, unknown> = root;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // strip comment
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
      if (!/^[a-zA-Z0-9_.-]+$/.test(key)) throw new Error(`Line ${i + 1}: Invalid key: "${key}"`);
      const valStr = line.slice(eq + 1).trim();
      current[key] = parseTomlValue(valStr);
    }
    return { ok: true, value: root };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export default function TomlValidator() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const result = input.trim() ? parseToml(input) : null;
  const jsonOutput = result?.ok ? JSON.stringify(result.value, null, 2) : '';

  const copy = () => {
    if (!jsonOutput) return;
    navigator.clipboard.writeText(jsonOutput).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const EXAMPLE = `[database]\nhost = "localhost"\nport = 5432\nname = "mydb"\nenabled = true\n\n[server]\nhost = "0.0.0.0"\nport = 8080\ndebug = false`;

  return (
    <div class="space-y-4">
      <div class="flex justify-end gap-2">
        <button onClick={() => setInput(EXAMPLE)} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Load Example</button>
        <button onClick={() => setInput('')} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Clear</button>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">TOML Input</label>
        <textarea
          class="w-full h-52 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={`[section]\nkey = "value"\nport = 8080\nenabled = true`}
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {result && (
        <div>
          {result.ok ? (
            <div class="flex items-center gap-2 mb-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <span class="text-green-400 font-medium text-sm">✓ Valid TOML</span>
            </div>
          ) : (
            <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400 font-mono">{result.error}</div>
          )}

          {result.ok && (
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-text-muted">Parsed as JSON</label>
                <button onClick={copy} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">{copied ? '✓ Copied!' : 'Copy JSON'}</button>
              </div>
              <textarea readOnly class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none" value={jsonOutput} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
