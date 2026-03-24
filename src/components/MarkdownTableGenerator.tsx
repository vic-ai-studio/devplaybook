import { useState, useCallback } from 'preact/hooks';

type Alignment = 'left' | 'center' | 'right' | 'none';

export default function MarkdownTableGenerator() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [headers, setHeaders] = useState<string[]>(['Column 1', 'Column 2', 'Column 3']);
  const [data, setData] = useState<string[][]>([
    ['Cell 1', 'Cell 2', 'Cell 3'],
    ['Cell 4', 'Cell 5', 'Cell 6'],
    ['Cell 7', 'Cell 8', 'Cell 9'],
  ]);
  const [alignments, setAlignments] = useState<Alignment[]>(['none', 'none', 'none']);
  const [copied, setCopied] = useState(false);

  const updateSize = useCallback((newRows: number, newCols: number) => {
    setRows(newRows);
    setCols(newCols);
    setHeaders(prev => {
      const next = [...prev];
      while (next.length < newCols) next.push(`Column ${next.length + 1}`);
      return next.slice(0, newCols);
    });
    setData(prev => {
      const next = Array.from({ length: newRows }, (_, r) =>
        Array.from({ length: newCols }, (_, c) => prev[r]?.[c] ?? '')
      );
      return next;
    });
    setAlignments(prev => {
      const next = [...prev];
      while (next.length < newCols) next.push('none');
      return next.slice(0, newCols);
    });
  }, []);

  const setHeader = (i: number, val: string) => {
    setHeaders(prev => { const n = [...prev]; n[i] = val; return n; });
  };

  const setCell = (r: number, c: number, val: string) => {
    setData(prev => {
      const n = prev.map(row => [...row]);
      n[r][c] = val;
      return n;
    });
  };

  const setAlignment = (i: number, val: Alignment) => {
    setAlignments(prev => { const n = [...prev]; n[i] = val; return n; });
  };

  const colWidth = useCallback((colIdx: number): number => {
    const header = headers[colIdx] ?? '';
    const cells = data.map(row => row[colIdx] ?? '');
    return Math.max(3, header.length, ...cells.map(c => c.length));
  }, [headers, data]);

  const pad = (str: string, width: number) => str.padEnd(width, ' ');

  const sepCell = (idx: number): string => {
    const w = colWidth(idx);
    const a = alignments[idx];
    if (a === 'left') return ':' + '-'.repeat(w - 1);
    if (a === 'right') return '-'.repeat(w - 1) + ':';
    if (a === 'center') return ':' + '-'.repeat(w - 2) + ':';
    return '-'.repeat(w);
  };

  const generateMarkdown = useCallback((): string => {
    const headerRow = '| ' + headers.map((h, i) => pad(h, colWidth(i))).join(' | ') + ' |';
    const sepRow = '| ' + Array.from({ length: cols }, (_, i) => sepCell(i)).join(' | ') + ' |';
    const dataRows = data.map(row =>
      '| ' + row.map((cell, i) => pad(cell, colWidth(i))).join(' | ') + ' |'
    );
    return [headerRow, sepRow, ...dataRows].join('\n');
  }, [headers, data, alignments, cols]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generateMarkdown()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const parseFromMarkdown = (input: string) => {
    const lines = input.trim().split('\n').filter(l => l.trim().startsWith('|'));
    if (lines.length < 2) return;
    const parseCells = (line: string) =>
      line.split('|').slice(1, -1).map(c => c.trim());

    const newHeaders = parseCells(lines[0]);
    const newData = lines.slice(2).map(parseCells);
    const newCols = newHeaders.length;
    const newRows = newData.length;

    setHeaders(newHeaders);
    setData(newData.map(row => {
      while (row.length < newCols) row.push('');
      return row.slice(0, newCols);
    }));
    setAlignments(new Array(newCols).fill('none'));
    setRows(newRows);
    setCols(newCols);
  };

  const alignIcon = (a: Alignment) => {
    if (a === 'left') return '⬅';
    if (a === 'right') return '➡';
    if (a === 'center') return '↔';
    return '⬛';
  };

  const nextAlignment = (a: Alignment): Alignment => {
    if (a === 'none') return 'left';
    if (a === 'left') return 'center';
    if (a === 'center') return 'right';
    return 'none';
  };

  return (
    <div class="space-y-6">
      {/* Controls */}
      <div class="flex flex-wrap gap-4 items-center bg-surface border border-border rounded-lg p-4">
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Rows:</label>
          <input
            type="number"
            min="1"
            max="20"
            value={rows}
            onInput={(e) => updateSize(Math.max(1, Math.min(20, parseInt((e.target as HTMLInputElement).value) || 1)), cols)}
            class="w-16 bg-bg border border-border rounded px-2 py-1 text-sm text-center"
          />
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Cols:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={cols}
            onInput={(e) => updateSize(rows, Math.max(1, Math.min(10, parseInt((e.target as HTMLInputElement).value) || 1)))}
            class="w-16 bg-bg border border-border rounded px-2 py-1 text-sm text-center"
          />
        </div>
        <span class="text-text-muted text-xs">Click alignment button in header row to cycle: Default → Left → Center → Right</span>
      </div>

      {/* Table editor */}
      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-sm">
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} class="border border-border p-1">
                  <div class="flex gap-1">
                    <input
                      value={h}
                      onInput={(e) => setHeader(i, (e.target as HTMLInputElement).value)}
                      placeholder={`Col ${i + 1}`}
                      class="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs font-normal min-w-0"
                    />
                    <button
                      onClick={() => setAlignment(i, nextAlignment(alignments[i]))}
                      title={`Alignment: ${alignments[i]}`}
                      class="px-1.5 py-1 bg-surface border border-border rounded text-xs hover:bg-primary/10 transition-colors"
                    >
                      {alignIcon(alignments[i])}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} class="border border-border p-1">
                    <input
                      value={cell}
                      onInput={(e) => setCell(r, c, (e.target as HTMLInputElement).value)}
                      placeholder={`r${r+1}c${c+1}`}
                      class="w-full bg-surface border border-border rounded px-2 py-1 text-xs min-w-0"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-semibold">Markdown Output</h3>
          <button
            onClick={handleCopy}
            class="px-4 py-1.5 bg-primary text-white rounded text-sm hover:bg-primary-dark transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-xs overflow-x-auto whitespace-pre font-mono select-all">
          {generateMarkdown()}
        </pre>
      </div>

      {/* Import */}
      <div>
        <h3 class="text-sm font-semibold mb-2">Import Existing Markdown Table</h3>
        <textarea
          rows={6}
          placeholder="Paste an existing Markdown table here to edit it..."
          class="w-full bg-surface border border-border rounded-lg p-3 text-xs font-mono resize-none"
          onBlur={(e) => {
            const val = (e.target as HTMLTextAreaElement).value.trim();
            if (val) parseFromMarkdown(val);
          }}
        />
        <p class="text-xs text-text-muted mt-1">Paste your table and click outside the box to import.</p>
      </div>
    </div>
  );
}
