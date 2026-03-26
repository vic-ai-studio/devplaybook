import { useState } from 'preact/hooks';

type ParseResult = { ok: true; result: string; sections: number; keys: number } | { ok: false; error: string };

function parseIni(text: string): ParseResult {
  try {
    const lines = text.split('\n');
    const result: Record<string, any> = {};
    let currentSection: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();

      // Skip empty lines and comments
      if (!line || line.startsWith(';') || line.startsWith('#')) continue;

      // Handle multi-line values (line ending with \)
      while (line.endsWith('\\') && i + 1 < lines.length) {
        line = line.slice(0, -1) + lines[++i].trim();
      }

      // Section header
      const sectionMatch = line.match(/^\[(.+)\]$/);
      if (sectionMatch) {
        currentSection = sectionMatch[1].trim();
        if (!(currentSection in result)) result[currentSection] = {};
        continue;
      }

      // Key=value
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let value: string | number | boolean = line.slice(eqIdx + 1).trim();

      // Remove inline comments
      const commentIdx = value.search(/\s[;#]/);
      if (commentIdx !== -1) value = value.slice(0, commentIdx).trim();

      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Type coercion
      if (value === 'true' || value === 'yes' || value === 'on') value = true as any;
      else if (value === 'false' || value === 'no' || value === 'off') value = false as any;
      else if (/^-?\d+$/.test(value)) value = parseInt(value, 10) as any;
      else if (/^-?\d+\.\d+$/.test(value)) value = parseFloat(value) as any;

      if (currentSection !== null) {
        result[currentSection][key] = value;
      } else {
        result[key] = value;
      }
    }

    const sections = Object.values(result).filter(v => typeof v === 'object' && v !== null).length;
    const keys = Object.values(result).reduce((acc: number, v) => {
      if (typeof v === 'object' && v !== null) return acc + Object.keys(v).length;
      return acc + 1;
    }, 0);

    return { ok: true, result: JSON.stringify(result, null, 2), sections, keys };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

const EXAMPLE_INI = `; Application Configuration
[database]
host = localhost
port = 5432
name = myapp
password = "secret123"
ssl = true

[server]
host = 0.0.0.0
port = 8080
debug = false
workers = 4

[cache]
enabled = true
ttl = 3600
max_size = 100
`;

export default function IniToJson() {
  const [input, setInput] = useState(EXAMPLE_INI);
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const result = input.trim() ? parseIni(input) : null;

  const outputJson = result?.ok ? JSON.stringify(JSON.parse(result.result), null, indent) : null;

  const copy = () => {
    if (!outputJson) return;
    navigator.clipboard.writeText(outputJson).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const download = () => {
    if (!outputJson) return;
    const blob = new Blob([outputJson], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'output.json'; a.click();
  };

  const loadExample = () => setInput(EXAMPLE_INI);
  const clear = () => setInput('');

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2 items-center">
          <span class="text-sm text-text-muted">Indent:</span>
          {[2, 4].map(n => (
            <button key={n} onClick={() => setIndent(n)} class={`px-3 py-1 text-xs rounded transition-colors ${indent === n ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>{n}</button>
          ))}
        </div>
        <button onClick={loadExample} class="text-xs text-accent hover:underline">Load example</button>
        <button onClick={clear} class="text-xs text-text-muted hover:text-text">Clear</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text">INI Input</label>
            <span class="text-xs text-text-muted">{input.split('\n').length} lines</span>
          </div>
          <textarea
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste INI config here..."
            rows={18}
            class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
            spellcheck={false}
          />
        </div>

        {/* Output */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text">JSON Output</label>
            {result?.ok && (
              <span class="text-xs text-green-500">{result.sections} sections · {result.keys} keys</span>
            )}
          </div>
          {result && !result.ok ? (
            <div class="w-full h-72 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm font-mono text-red-400">
              ⚠ Parse error: {result.error}
            </div>
          ) : (
            <textarea
              value={outputJson ?? ''}
              readOnly
              rows={18}
              placeholder="JSON output will appear here..."
              class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-text-muted focus:outline-none resize-y"
              spellcheck={false}
            />
          )}
        </div>
      </div>

      {result?.ok && outputJson && (
        <div class="flex gap-3">
          <button
            onClick={copy}
            class="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy JSON'}
          </button>
          <button
            onClick={download}
            class="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border text-text rounded-lg text-sm hover:border-primary transition-colors"
          >
            ⬇ Download .json
          </button>
        </div>
      )}

      <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted space-y-1">
        <p class="font-medium text-text">Supported INI features:</p>
        <ul class="list-disc list-inside space-y-0.5 ml-2">
          <li>Sections <code class="font-mono text-xs">[section]</code></li>
          <li>Comments with <code class="font-mono text-xs">;</code> or <code class="font-mono text-xs">#</code></li>
          <li>Multi-line values with trailing <code class="font-mono text-xs">\</code></li>
          <li>Boolean coercion: <code class="font-mono text-xs">true/yes/on → true</code>, <code class="font-mono text-xs">false/no/off → false</code></li>
          <li>Number coercion for integers and floats</li>
          <li>Quoted string values (single or double quotes)</li>
          <li>Inline comments after values</li>
        </ul>
      </div>
    </div>
  );
}
