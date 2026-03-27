import { useState } from 'preact/hooks';

type Style = 'simple' | 'grid' | 'rounded' | 'markdown';

interface BorderChars {
  tl: string; tr: string; bl: string; br: string;
  h: string; v: string;
  tc: string; bc: string; lc: string; rc: string; cross: string;
}

const STYLES: Record<Style, { name: string; chars: BorderChars }> = {
  simple: {
    name: 'Simple',
    chars: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|', tc: '+', bc: '+', lc: '+', rc: '+', cross: '+' },
  },
  grid: {
    name: 'Grid',
    chars: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', tc: '┬', bc: '┴', lc: '├', rc: '┤', cross: '┼' },
  },
  rounded: {
    name: 'Rounded',
    chars: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│', tc: '┬', bc: '┴', lc: '├', rc: '┤', cross: '┼' },
  },
  markdown: {
    name: 'Markdown',
    chars: { tl: '|', tr: '|', bl: '|', br: '|', h: '-', v: '|', tc: '|', bc: '|', lc: '|', rc: '|', cross: '|' },
  },
};

function buildTable(rows: string[][], style: Style, hasHeader: boolean): string {
  if (rows.length === 0 || rows[0].length === 0) return '';

  const cols = Math.max(...rows.map(r => r.length));
  const paddedRows = rows.map(r => {
    while (r.length < cols) r = [...r, ''];
    return r;
  });

  const colWidths = Array.from({ length: cols }, (_, ci) =>
    Math.max(...paddedRows.map(r => r[ci].length), 1)
  );

  const chars = STYLES[style].chars;

  const hrule = (left: string, mid: string, right: string, cross: string) =>
    left + colWidths.map(w => mid.repeat(w + 2)).join(cross) + right;

  const row = (cells: string[]) =>
    chars.v + cells.map((c, i) => ` ${c.padEnd(colWidths[i])} `).join(chars.v) + chars.v;

  if (style === 'markdown') {
    const header = paddedRows[0];
    const separator = '|' + colWidths.map(w => ' ' + '-'.repeat(w) + ' ').join('|') + '|';
    const lines: string[] = [];
    lines.push(row(header));
    lines.push(separator);
    for (let i = 1; i < paddedRows.length; i++) {
      lines.push(row(paddedRows[i]));
    }
    return lines.join('\n');
  }

  const top = hrule(chars.tl, chars.h, chars.tr, chars.tc);
  const bottom = hrule(chars.bl, chars.h, chars.br, chars.bc);
  const divider = hrule(chars.lc, chars.h, chars.rc, chars.cross);

  const lines: string[] = [];
  lines.push(top);
  lines.push(row(paddedRows[0]));
  if (hasHeader && paddedRows.length > 1) lines.push(divider);
  for (let i = 1; i < paddedRows.length; i++) {
    lines.push(row(paddedRows[i]));
    if (i < paddedRows.length - 1 && !hasHeader) {
      // No row separators in non-header mode unless grid style
    }
  }
  lines.push(bottom);
  return lines.join('\n');
}

const INITIAL_ROWS = [
  ['Name', 'Language', 'Stars'],
  ['React', 'JavaScript', '220k'],
  ['Vue', 'JavaScript', '207k'],
  ['Svelte', 'JavaScript', '77k'],
  ['Angular', 'TypeScript', '93k'],
];

export default function AsciiTableBuilder() {
  const [rows, setRows] = useState<string[][]>(INITIAL_ROWS);
  const [style, setStyle] = useState<Style>('grid');
  const [hasHeader, setHasHeader] = useState(true);
  const [copied, setCopied] = useState(false);

  const numCols = rows[0]?.length ?? 3;
  const output = buildTable(rows.map(r => [...r]), style, hasHeader);

  const updateCell = (ri: number, ci: number, val: string) => {
    setRows(prev => prev.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r));
  };

  const addRow = () => setRows(prev => [...prev, Array(numCols).fill('')]);
  const addCol = () => setRows(prev => prev.map(r => [...r, '']));
  const removeRow = (ri: number) => setRows(prev => prev.filter((_, i) => i !== ri));
  const removeCol = (ci: number) => setRows(prev => prev.map(r => r.filter((_, j) => j !== ci)));

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-5">
      {/* Style + options */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          {(Object.keys(STYLES) as Style[]).map(s => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              class={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                style === s
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface border-border text-text-muted hover:border-brand/50'
              }`}
            >
              {STYLES[s].name}
            </button>
          ))}
        </div>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => setHasHeader((e.target as HTMLInputElement).checked)}
            class="rounded"
          />
          Header row separator
        </label>
      </div>

      {/* Grid editor */}
      <div class="overflow-x-auto">
        <table class="border-collapse text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci} class="p-0.5">
                    <input
                      type="text"
                      value={cell}
                      onInput={(e) => updateCell(ri, ci, (e.target as HTMLInputElement).value)}
                      class={`px-2 py-1.5 bg-surface border rounded text-sm font-mono w-28 focus:outline-none focus:border-brand ${
                        ri === 0 && hasHeader ? 'border-brand/50 font-semibold text-text' : 'border-border text-text-muted'
                      }`}
                    />
                  </td>
                ))}
                <td class="p-0.5 pl-2">
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(ri)}
                      class="text-red-400 hover:text-red-300 text-xs px-1"
                      title="Remove row"
                    >✕</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Col remove row */}
        <div class="flex gap-0.5 mt-0.5 pl-0.5">
          {rows[0]?.map((_, ci) => (
            <div key={ci} class="w-28 mx-0.5 flex justify-center">
              {numCols > 1 && (
                <button
                  onClick={() => removeCol(ci)}
                  class="text-red-400 hover:text-red-300 text-xs"
                  title="Remove column"
                >✕ col</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add row/col */}
      <div class="flex gap-2">
        <button
          onClick={addRow}
          class="text-xs px-3 py-1.5 bg-surface border border-border rounded-lg text-text-muted hover:border-brand hover:text-brand transition-colors"
        >
          + Add Row
        </button>
        <button
          onClick={addCol}
          class="text-xs px-3 py-1.5 bg-surface border border-border rounded-lg text-text-muted hover:border-brand hover:text-brand transition-colors"
        >
          + Add Column
        </button>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text">ASCII Table Output</span>
          <button
            onClick={copy}
            class="text-xs px-3 py-1.5 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-snug">
          {output}
        </pre>
      </div>
    </div>
  );
}
