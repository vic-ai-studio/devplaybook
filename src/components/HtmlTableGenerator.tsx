import { useState } from 'preact/hooks';

type Cell = string;

function generateHtml(headers: string[], rows: Cell[][], options: { tailwind: boolean; border: boolean; striped: boolean }): string {
  const { tailwind, border, striped } = options;

  const tableClass = tailwind ? (border ? 'class="w-full border-collapse border border-gray-300"' : 'class="w-full border-collapse"') : (border ? 'border="1" style="border-collapse:collapse;width:100%"' : 'style="width:100%"');
  const thClass = tailwind ? `class="px-4 py-2 bg-gray-100 text-left font-semibold${border ? ' border border-gray-300' : ''}"` : (border ? 'style="padding:8px 12px;background:#f3f4f6;text-align:left"' : 'style="padding:8px 12px;background:#f3f4f6;text-align:left"');
  const tdClass = (rowIdx: number) => tailwind
    ? `class="px-4 py-2${border ? ' border border-gray-300' : ''}${striped && rowIdx % 2 === 1 ? ' bg-gray-50' : ''}"`
    : `style="padding:8px 12px${striped && rowIdx % 2 === 1 ? ';background:#f9fafb' : ''}"`;

  const indent = '  ';
  const lines: string[] = [];
  lines.push(`<table ${tableClass}>`);

  if (headers.some(h => h.trim())) {
    lines.push(`${indent}<thead>`);
    lines.push(`${indent}${indent}<tr>`);
    headers.forEach(h => lines.push(`${indent}${indent}${indent}<th ${thClass}>${h}</th>`));
    lines.push(`${indent}${indent}</tr>`);
    lines.push(`${indent}</thead>`);
  }

  lines.push(`${indent}<tbody>`);
  rows.forEach((row, ri) => {
    lines.push(`${indent}${indent}<tr>`);
    row.forEach(cell => lines.push(`${indent}${indent}${indent}<td ${tdClass(ri)}>${cell}</td>`));
    lines.push(`${indent}${indent}</tr>`);
  });
  lines.push(`${indent}</tbody>`);
  lines.push('</table>');
  return lines.join('\n');
}

export default function HtmlTableGenerator() {
  const [cols, setCols] = useState(3);
  const [rowCount, setRowCount] = useState(3);
  const [headers, setHeaders] = useState<string[]>(['Name', 'Role', 'Status']);
  const [rows, setRows] = useState<Cell[][]>([
    ['Alice', 'Engineer', 'Active'],
    ['Bob', 'Designer', 'Active'],
    ['Carol', 'PM', 'Away'],
  ]);
  const [tailwind, setTailwind] = useState(true);
  const [border, setBorder] = useState(true);
  const [striped, setStriped] = useState(false);
  const [copied, setCopied] = useState(false);

  const resize = (newCols: number, newRows: number) => {
    setCols(newCols);
    setRowCount(newRows);
    setHeaders(prev => {
      const next = [...prev];
      while (next.length < newCols) next.push(`Col ${next.length + 1}`);
      return next.slice(0, newCols);
    });
    setRows(prev => {
      const next = prev.map(row => {
        const r = [...row];
        while (r.length < newCols) r.push('');
        return r.slice(0, newCols);
      });
      while (next.length < newRows) next.push(Array(newCols).fill(''));
      return next.slice(0, newRows);
    });
  };

  const setHeader = (i: number, val: string) => setHeaders(prev => { const n = [...prev]; n[i] = val; return n; });
  const setCell = (r: number, c: number, val: string) => setRows(prev => { const n = prev.map(row => [...row]); n[r][c] = val; return n; });

  const html = generateHtml(headers, rows, { tailwind, border, striped });

  const copy = () => navigator.clipboard.writeText(html).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });

  const inputClass = 'px-2 py-1 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-accent w-full';

  return (
    <div class="space-y-6">
      {/* Config row */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label class="text-xs text-text-muted block mb-1">Columns (1–8)</label>
          <input type="number" min={1} max={8} value={cols} onInput={e => resize(Math.max(1, Math.min(8, Number((e.target as HTMLInputElement).value))), rowCount)}
            class={inputClass} />
        </div>
        <div>
          <label class="text-xs text-text-muted block mb-1">Rows (1–10)</label>
          <input type="number" min={1} max={10} value={rowCount} onInput={e => resize(cols, Math.max(1, Math.min(10, Number((e.target as HTMLInputElement).value))))}
            class={inputClass} />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-muted">Options</label>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={border} onChange={e => setBorder((e.target as HTMLInputElement).checked)} class="accent-accent" />
            Borders
          </label>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="checkbox" checked={striped} onChange={e => setStriped((e.target as HTMLInputElement).checked)} class="accent-accent" />
            Striped
          </label>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-muted">Styling</label>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" name="style" checked={tailwind} onChange={() => setTailwind(true)} class="accent-accent" />
            Tailwind CSS
          </label>
          <label class="flex items-center gap-1.5 text-sm cursor-pointer">
            <input type="radio" name="style" checked={!tailwind} onChange={() => setTailwind(false)} class="accent-accent" />
            Inline styles
          </label>
        </div>
      </div>

      {/* Table editor */}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} class="p-1">
                  <input value={h} onInput={e => setHeader(i, (e.target as HTMLInputElement).value)}
                    placeholder={`Header ${i + 1}`}
                    class="px-2 py-1 rounded bg-accent/10 border border-accent/30 text-text font-semibold text-sm focus:outline-none focus:ring-1 focus:ring-accent w-full" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} class={ri % 2 === 1 && striped ? 'bg-surface' : ''}>
                {row.map((cell, ci) => (
                  <td key={ci} class="p-1">
                    <input value={cell} onInput={e => setCell(ri, ci, (e.target as HTMLInputElement).value)}
                      placeholder={`Row ${ri + 1}, Col ${ci + 1}`}
                      class={inputClass} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs text-text-muted">Generated HTML</label>
          <button onClick={copy} class="text-xs text-accent hover:underline">{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text font-mono text-xs whitespace-pre-wrap overflow-x-auto">{html}</pre>
      </div>
    </div>
  );
}
