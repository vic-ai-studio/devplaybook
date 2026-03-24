import { useState } from 'preact/hooks';

function parseCsv(text: string, delimiter: string): string[][] {
  if (!text.trim()) return [];
  return text.trim().split('\n').map(line => {
    const result: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
        else inQuote = !inQuote;
      } else if (ch === delimiter && !inQuote) {
        result.push(cur); cur = '';
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  });
}

export default function CsvViewer() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);

  const rows = parseCsv(input, delimiter === 'tab' ? '\t' : delimiter);
  const headers = hasHeader && rows.length > 0 ? rows[0] : null;
  const dataRows = hasHeader && rows.length > 0 ? rows.slice(1) : rows;
  const colCount = rows.length > 0 ? Math.max(...rows.map(r => r.length)) : 0;

  const DELIMITERS = [
    { label: 'Comma (,)', value: ',' },
    { label: 'Tab', value: 'tab' },
    { label: 'Semicolon (;)', value: ';' },
    { label: 'Pipe (|)', value: '|' },
  ];

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2 items-center">
          <label class="text-sm text-text-muted">Delimiter:</label>
          <select
            value={delimiter}
            onChange={e => setDelimiter((e.target as HTMLSelectElement).value)}
            class="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
          >
            {DELIMITERS.map(d => <option value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={hasHeader} onChange={e => setHasHeader((e.target as HTMLInputElement).checked)} class="accent-primary" />
          First row is header
        </label>
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

      {rows.length > 0 && (
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-text-muted">{dataRows.length} rows · {colCount} columns</span>
            <button onClick={() => setInput('')} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Clear</button>
          </div>
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="w-full text-sm text-text border-collapse">
              {headers && (
                <thead>
                  <tr class="bg-bg-card border-b border-border">
                    <th class="px-3 py-2 text-left font-mono text-xs text-text-muted w-8">#</th>
                    {headers.map((h, i) => (
                      <th key={i} class="px-3 py-2 text-left font-medium text-text-muted text-xs">{h || <span class="italic opacity-50">col {i+1}</span>}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {dataRows.map((row, ri) => (
                  <tr key={ri} class={ri % 2 === 0 ? 'bg-bg' : 'bg-bg-card'}>
                    <td class="px-3 py-2 font-mono text-xs text-text-muted">{ri + 1}</td>
                    {Array.from({ length: colCount }, (_, ci) => (
                      <td key={ci} class="px-3 py-2 font-mono text-xs">{row[ci] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!input && (
        <p class="text-sm text-text-muted text-center py-8">Paste CSV data above to preview it as a table.</p>
      )}
    </div>
  );
}
