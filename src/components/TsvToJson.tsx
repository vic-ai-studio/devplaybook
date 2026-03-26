import { useState, useCallback } from 'preact/hooks';

const SAMPLE_TSV = `name\tage\tcity\temail
Alice Johnson\t28\tNew York\talice@example.com
Bob Smith\t34\tSan Francisco\tbob@example.com
Carol White\t22\tChicago\tcarol@example.com
David Brown\t45\tAustin\tdavid@example.com`;

type ParseOptions = {
  hasHeaders: boolean;
  trimValues: boolean;
  skipEmpty: boolean;
  numberCoerce: boolean;
};

function parseTsv(raw: string, opts: ParseOptions): { data: unknown[]; headers: string[]; errors: string[] } {
  const errors: string[] = [];
  const lines = raw.split(/\r?\n/);
  if (!lines.length || !raw.trim()) return { data: [], headers: [], errors: ['Input is empty'] };

  const nonEmpty = opts.skipEmpty ? lines.filter(l => l.trim()) : lines;
  if (!nonEmpty.length) return { data: [], headers: [], errors: ['No data rows found'] };

  const cells = (line: string) => line.split('\t').map(c => opts.trimValues ? c.trim() : c);

  let headers: string[];
  let dataLines: string[];

  if (opts.hasHeaders) {
    headers = cells(nonEmpty[0]);
    dataLines = nonEmpty.slice(1);
  } else {
    const firstRow = cells(nonEmpty[0]);
    headers = firstRow.map((_, i) => `column_${i + 1}`);
    dataLines = nonEmpty;
  }

  const coerce = (v: string): unknown => {
    if (!opts.numberCoerce) return v;
    if (v === '') return v;
    const n = Number(v);
    if (!isNaN(n) && v.trim() !== '') return n;
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
    return v;
  };

  const data: unknown[] = [];
  for (let i = 0; i < dataLines.length; i++) {
    if (opts.skipEmpty && !dataLines[i].trim()) continue;
    const row = cells(dataLines[i]);
    if (row.length !== headers.length) {
      errors.push(`Row ${i + (opts.hasHeaders ? 2 : 1)}: expected ${headers.length} columns, got ${row.length}`);
    }
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => { obj[h] = coerce(row[idx] ?? ''); });
    data.push(obj);
  }

  return { data, headers, errors };
}

export default function TsvToJson() {
  const [tsv, setTsv] = useState(SAMPLE_TSV);
  const [opts, setOpts] = useState<ParseOptions>({ hasHeaders: true, trimValues: true, skipEmpty: true, numberCoerce: true });
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'json' | 'preview'>('json');

  const result = tsv.trim() ? parseTsv(tsv, opts) : { data: [], headers: [], errors: [] };
  const json = result.data.length ? JSON.stringify(result.data, null, indent) : '[]';

  const copy = useCallback(() => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [json]);

  const download = useCallback(() => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'output.json'; a.click();
    URL.revokeObjectURL(url);
  }, [json]);

  const toggle = (key: keyof ParseOptions) => setOpts(o => ({ ...o, [key]: !o[key] }));

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border">
          <span class="text-xs text-text-muted font-medium">TSV Input</span>
          <div class="flex items-center gap-3">
            <button onClick={() => setTsv(SAMPLE_TSV)} class="text-xs text-accent hover:underline">Load Sample</button>
            <button onClick={() => setTsv('')} class="text-xs text-text-muted hover:underline">Clear</button>
          </div>
        </div>
        <textarea
          value={tsv}
          onInput={e => setTsv((e.target as HTMLTextAreaElement).value)}
          rows={8}
          spellcheck={false}
          class="w-full p-4 font-mono text-sm bg-bg text-text resize-y focus:outline-none"
          placeholder="Paste tab-separated values here. You can copy from Excel, Google Sheets, or any TSV file."
        />
      </div>

      {/* Options */}
      <div class="bg-surface rounded-xl border border-border p-4 flex flex-wrap gap-x-6 gap-y-2">
        {(Object.keys(opts) as (keyof ParseOptions)[]).map(key => (
          <label key={key} class="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={opts[key]} onChange={() => toggle(key)} class="accent-blue-500 w-4 h-4" />
            <span class="text-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
          </label>
        ))}
        <label class="flex items-center gap-2 text-sm">
          <span class="text-text-muted">Indent:</span>
          <select
            value={indent}
            onChange={e => setIndent(Number((e.target as HTMLSelectElement).value))}
            class="bg-bg border border-border rounded px-2 py-0.5 text-sm text-text"
          >
            <option value={0}>Minified</option>
            <option value={2}>2 spaces</option>
            <option value={4}>4 spaces</option>
          </select>
        </label>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div class="bg-yellow-400/10 border border-yellow-400/30 rounded-xl p-3 space-y-1">
          {result.errors.map((e, i) => <div key={i} class="text-xs text-yellow-400 font-mono">⚠ {e}</div>)}
        </div>
      )}

      {/* Stats */}
      {result.data.length > 0 && (
        <div class="flex items-center gap-4 text-sm text-text-muted">
          <span class="font-medium text-text">{result.data.length}</span> rows
          <span class="font-medium text-text">{result.headers.length}</span> columns
          <span class="font-medium text-text">{json.length.toLocaleString()}</span> chars
        </div>
      )}

      {/* Output Tabs */}
      {result.data.length > 0 && (
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <div class="flex">
              {(['json', 'preview'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  class={`px-3 py-1 text-xs font-medium transition-colors ${activeTab === tab ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text'}`}
                >
                  {tab === 'json' ? 'JSON Output' : 'Table Preview'}
                </button>
              ))}
            </div>
            <div class="flex gap-2">
              <button onClick={copy} class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors">
                {copied ? '✓ Copied!' : 'Copy JSON'}
              </button>
              <button onClick={download} class="text-xs px-3 py-1 bg-surface border border-border text-text rounded hover:bg-bg transition-colors">
                Download
              </button>
            </div>
          </div>

          {activeTab === 'json' ? (
            <pre class="p-4 text-xs font-mono text-text overflow-auto max-h-80">{json}</pre>
          ) : (
            <div class="overflow-auto max-h-80">
              <table class="w-full text-xs">
                <thead class="bg-surface sticky top-0">
                  <tr>
                    {result.headers.map(h => (
                      <th key={h} class="px-3 py-2 text-left font-medium text-text-muted border-b border-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.data as Record<string, unknown>[]).map((row, i) => (
                    <tr key={i} class={i % 2 === 0 ? 'bg-bg' : 'bg-surface'}>
                      {result.headers.map(h => (
                        <td key={h} class="px-3 py-1.5 font-mono text-text border-b border-border/50 whitespace-nowrap">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
