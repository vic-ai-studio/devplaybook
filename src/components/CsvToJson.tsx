import { useState } from 'preact/hooks';

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuote && line[i+1] === '"') { cur += '"'; i++; } else inQuote = !inQuote; }
    else if (ch === delimiter && !inQuote) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function csvToJson(csv: string, delimiter: string, hasHeader: boolean, indent: number): { ok: boolean; result?: string; error?: string; count?: number } {
  try {
    const lines = csv.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return { ok: false, error: 'No data found' };
    if (hasHeader) {
      const headers = parseCsvLine(lines[0], delimiter);
      const rows = lines.slice(1).map(line => {
        const vals = parseCsvLine(line, delimiter);
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h.trim()] = vals[i] ?? ''; });
        return obj;
      });
      return { ok: true, result: JSON.stringify(rows, null, indent), count: rows.length };
    } else {
      const rows = lines.map(line => parseCsvLine(line, delimiter));
      return { ok: true, result: JSON.stringify(rows, null, indent), count: rows.length };
    }
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export default function CsvToJson() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const result = input.trim() ? csvToJson(input, delimiter === 'tab' ? '\t' : delimiter, hasHeader, indent) : null;

  const copy = () => {
    if (!result?.result) return;
    navigator.clipboard.writeText(result.result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const download = () => {
    if (!result?.result) return;
    const blob = new Blob([result.result], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'output.json'; a.click();
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2 items-center">
          <label class="text-sm text-text-muted">Delimiter:</label>
          <select value={delimiter} onChange={e => setDelimiter((e.target as HTMLSelectElement).value)} class="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary">
            <option value=",">Comma (,)</option>
            <option value="tab">Tab</option>
            <option value=";">Semicolon (;)</option>
            <option value="|">Pipe (|)</option>
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader((e.target as HTMLInputElement).checked)} class="accent-primary" />
          First row is header
        </label>
        <div class="flex gap-2 items-center">
          <label class="text-sm text-text-muted">Indent:</label>
          {[2, 4].map(n => (
            <button key={n} onClick={() => setIndent(n)} class={`px-3 py-1 text-xs rounded transition-colors ${indent === n ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>{n}</button>
          ))}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">CSV Input</label>
        <textarea
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={`name,age,city\nAlice,30,NYC\nBob,25,LA`}
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {result && (
        <div>
          {result.ok ? (
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-text-muted">JSON Output ({result.count} rows)</label>
                <div class="flex gap-2">
                  <button onClick={copy} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">{copied ? '✓ Copied!' : 'Copy'}</button>
                  <button onClick={download} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Download .json</button>
                </div>
              </div>
              <textarea readOnly class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none" value={result.result} />
            </div>
          ) : (
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
