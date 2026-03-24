import { useState, useRef, useEffect } from 'preact/hooks';
import { isProUser, canUse, recordUsage, remainingUses, FREE_DAILY_LIMIT } from '../utils/pro';

// ── CSV parse/serialize ───────────────────────────────────────────────────────

function parseCsvLine(line: string, delim: string): string[] {
  const result: string[] = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === delim && !inQuote) { result.push(cur); cur = ''; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCsv(text: string, delim: string): string[][] {
  if (!text.trim()) return [];
  return text.trim().split('\n').map(line => parseCsvLine(line, delim));
}

function escapeCell(val: string, delim: string): string {
  if (val.includes('"') || val.includes('\n') || val.includes(delim)) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
}

function serializeCsv(rows: string[][], delim: string): string {
  return rows.map(row => row.map(c => escapeCell(c, delim)).join(delim)).join('\n');
}

// ── Stats helpers ─────────────────────────────────────────────────────────────

function colStats(values: string[]): { numeric: boolean; min?: number; max?: number; mean?: number; empty: number; unique: number } {
  const empty = values.filter(v => v.trim() === '').length;
  const unique = new Set(values).size;
  const nums = values.filter(v => v.trim() !== '' && !isNaN(Number(v))).map(Number);
  if (nums.length === 0) return { numeric: false, empty, unique };
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { numeric: true, min, max, mean, empty, unique };
}

// ── Types ─────────────────────────────────────────────────────────────────────

type SortDir = 'asc' | 'desc' | null;

const DELIMITERS = [
  { label: 'Comma (,)', value: ',' },
  { label: 'Tab', value: '\t' },
  { label: 'Semicolon (;)', value: ';' },
  { label: 'Pipe (|)', value: '|' },
];

const SAMPLE_CSV = `name,age,city,score
Alice,30,New York,92.5
Bob,25,Los Angeles,88.0
Carol,35,Chicago,95.1
Dave,28,Houston,76.3
Eve,32,Phoenix,84.7`;

// ── Main component ────────────────────────────────────────────────────────────

export default function CsvEditor() {
  const [input, setInput] = useState('');
  const [delimiter, setDelimiter] = useState(',');
  const [hasHeader, setHasHeader] = useState(true);
  const [rows, setRows] = useState<string[][]>([]);
  const [editMode, setEditMode] = useState(false);
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [filterText, setFilterText] = useState('');
  const [editingCell, setEditingCell] = useState<{ r: number; c: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pro, setPro] = useState(false);
  const [remaining, setRemaining] = useState(FREE_DAILY_LIMIT);
  const [usageBlocked, setUsageBlocked] = useState(false);
  const [statsCol, setStatsCol] = useState<number | null>(null);
  const [copied, setCopied] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPro(isProUser());
    setRemaining(remainingUses('csv-editor'));
  }, []);

  // ── Parse ──────────────────────────────────────────────────────────────────

  const parseAndLoad = (text: string) => {
    if (!text.trim()) { setRows([]); return; }
    if (!pro && !canUse('csv-editor')) { setUsageBlocked(true); return; }
    if (!pro) {
      recordUsage('csv-editor');
      setRemaining(remainingUses('csv-editor'));
    }
    const parsed = parseCsv(text, delimiter === '\t' ? '\t' : delimiter);
    setRows(parsed);
    setEditMode(true);
    setSortCol(null); setSortDir(null); setFilterText('');
    setStatsCol(null);
  };

  const handleLoad = () => parseAndLoad(input);

  const handleFile = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setInput(text);
      parseAndLoad(text);
    };
    reader.readAsText(file);
  };

  // ── Derive display rows ────────────────────────────────────────────────────

  const headerRow = hasHeader && rows.length > 0 ? rows[0] : null;
  const dataRows = hasHeader && rows.length > 0 ? rows.slice(1) : rows;
  const colCount = rows.length > 0 ? Math.max(...rows.map(r => r.length)) : 0;

  // Sort
  let displayRows = [...dataRows];
  if (sortCol !== null && sortDir !== null) {
    displayRows.sort((a, b) => {
      const av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
      const an = Number(av), bn = Number(bv);
      const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }

  // Filter
  const filterLow = filterText.toLowerCase();
  const filteredRows = filterText
    ? displayRows.filter(row => row.some(c => c.toLowerCase().includes(filterLow)))
    : displayRows;

  // ── Cell edit ─────────────────────────────────────────────────────────────

  const startEdit = (r: number, c: number) => {
    // r is the index in filteredRows; find actual index in rows
    const actualDataIdx = dataRows.indexOf(filteredRows[r]);
    const actualRowIdx = hasHeader ? actualDataIdx + 1 : actualDataIdx;
    setEditingCell({ r: actualRowIdx, c });
    setEditValue(rows[actualRowIdx]?.[c] ?? '');
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { r, c } = editingCell;
    setRows(prev => {
      const next = prev.map(row => [...row]);
      while (next[r].length <= c) next[r].push('');
      next[r][c] = editValue;
      return next;
    });
    setEditingCell(null);
  };

  // ── Sort ──────────────────────────────────────────────────────────────────

  const handleSort = (ci: number) => {
    if (sortCol === ci) {
      setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc');
      if (sortDir === 'desc') setSortCol(null);
    } else {
      setSortCol(ci);
      setSortDir('asc');
    }
  };

  // ── Add / delete ──────────────────────────────────────────────────────────

  const addRow = () => {
    setRows(prev => [...prev, Array(colCount).fill('')]);
  };

  const deleteRow = (r: number) => {
    // r is filteredRows index → find actual in rows
    const actualDataIdx = dataRows.indexOf(filteredRows[r]);
    const actualRowIdx = hasHeader ? actualDataIdx + 1 : actualDataIdx;
    setRows(prev => prev.filter((_, i) => i !== actualRowIdx));
  };

  const addColumn = () => {
    const newHeader = `col${colCount + 1}`;
    setRows(prev => prev.map((row, i) => {
      if (i === 0 && hasHeader) return [...row, newHeader];
      return [...row, ''];
    }));
  };

  const deleteColumn = (ci: number) => {
    setRows(prev => prev.map(row => row.filter((_, i) => i !== ci)));
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const exportCsv = (delim = delimiter) => {
    const csv = serializeCsv(rows, delim === '\t' ? '\t' : delim);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const exportTsv = () => exportCsv('\t');

  const exportJson = () => {
    if (!pro) return;
    const headers = headerRow ?? Array.from({ length: colCount }, (_, i) => `col${i + 1}`);
    const json = JSON.stringify(dataRows.map(row => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      return obj;
    }), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const copyCsv = () => {
    const csv = serializeCsv(rows, delimiter === '\t' ? '\t' : delimiter);
    navigator.clipboard.writeText(csv).then(() => {
      setCopied('csv');
      setTimeout(() => setCopied(''), 1500);
    });
  };

  // ── Stats ─────────────────────────────────────────────────────────────────

  const statsData = (statsCol !== null && pro) ? (() => {
    const vals = dataRows.map(r => r[statsCol] ?? '');
    return colStats(vals);
  })() : null;

  // ── Sort icon ─────────────────────────────────────────────────────────────

  const sortIcon = (ci: number) => {
    if (sortCol !== ci || sortDir === null) return <span class="text-text-muted/40 ml-1">↕</span>;
    return <span class="text-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div class="space-y-4">
      {/* Controls */}
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
        <button
          onClick={() => fileRef.current?.click()}
          class="text-sm bg-bg-card border border-border px-3 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
        >
          Upload CSV
        </button>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} class="hidden" />
        <button
          onClick={() => { setInput(SAMPLE_CSV); parseAndLoad(SAMPLE_CSV); }}
          class="text-sm bg-bg-card border border-border px-3 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
        >
          Load Sample
        </button>
      </div>

      {/* Input area (when not in edit mode) */}
      {!editMode && (
        <>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">Paste CSV Data</label>
            <textarea
              class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
              placeholder={`name,age,city\nAlice,30,NYC\nBob,25,LA`}
              value={input}
              onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            />
          </div>
          {usageBlocked ? (
            <div class="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
              <div>
                <p class="text-sm font-semibold text-amber-400">Daily limit reached ({FREE_DAILY_LIMIT} free uses/day)</p>
                <p class="text-xs text-text-muted mt-0.5">Upgrade to Pro for unlimited CSV editing + JSON export + column stats.</p>
              </div>
              <a href="/pro" class="shrink-0 ml-4 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">Go Pro →</a>
            </div>
          ) : (
            <button
              onClick={handleLoad}
              disabled={!input.trim()}
              class="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Load & Edit
            </button>
          )}
          {!pro && !usageBlocked && (
            <p class="text-xs text-text-muted">
              {remaining} free use{remaining !== 1 ? 's' : ''} today ·{' '}
              <a href="/pro" class="text-primary hover:underline">Pro: unlimited + JSON export + column stats →</a>
            </p>
          )}
        </>
      )}

      {/* Editor */}
      {editMode && rows.length > 0 && (
        <>
          {/* Toolbar */}
          <div class="flex flex-wrap gap-2 items-center justify-between">
            <div class="flex gap-2 items-center">
              <input
                type="text"
                value={filterText}
                onInput={e => setFilterText((e.target as HTMLInputElement).value)}
                placeholder="Filter rows…"
                class="bg-bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary w-48 transition-colors"
              />
              <span class="text-xs text-text-muted">{filteredRows.length} / {dataRows.length} rows · {colCount} cols</span>
            </div>
            <div class="flex gap-2 flex-wrap">
              <button onClick={addRow} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">+ Row</button>
              <button onClick={addColumn} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">+ Col</button>
              <button onClick={copyCsv} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
                {copied === 'csv' ? '✓ Copied' : 'Copy CSV'}
              </button>
              <button onClick={() => exportCsv()} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Export CSV</button>
              <button onClick={exportTsv} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Export TSV</button>
              <button
                onClick={exportJson}
                disabled={!pro}
                title={!pro ? 'Pro feature — upgrade to unlock JSON export' : 'Export as JSON'}
                class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${pro ? 'bg-bg-card border-border hover:border-primary hover:text-primary' : 'bg-bg-card border-border text-text-muted/50 cursor-default'}`}
              >
                {!pro && <span class="mr-1">🔒</span>}
                Export JSON
                {!pro && <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full ml-1">Pro</span>}
              </button>
              <button onClick={() => { setEditMode(false); setRows([]); setSortCol(null); setSortDir(null); setFilterText(''); }} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-red-400 hover:text-red-400 transition-colors">Clear</button>
            </div>
          </div>

          {/* Table */}
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="w-full text-sm text-text border-collapse">
              {headerRow && (
                <thead>
                  <tr class="bg-bg-card border-b border-border">
                    <th class="px-2 py-2 text-left font-mono text-xs text-text-muted w-8">#</th>
                    {headerRow.map((h, ci) => (
                      <th key={ci} class="px-2 py-2 text-left font-medium text-xs group">
                        <div class="flex items-center gap-1">
                          <button
                            onClick={() => handleSort(ci)}
                            class="text-text-muted hover:text-text transition-colors flex items-center gap-0.5"
                          >
                            <span>{h || <span class="italic opacity-50">col {ci + 1}</span>}</span>
                            {sortIcon(ci)}
                          </button>
                          {pro && (
                            <button
                              onClick={() => setStatsCol(statsCol === ci ? null : ci)}
                              title="Column stats"
                              class={`text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity ${statsCol === ci ? 'text-primary' : 'text-text-muted'}`}
                            >
                              📊
                            </button>
                          )}
                          <button
                            onClick={() => deleteColumn(ci)}
                            title="Delete column"
                            class="text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-red-400"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    ))}
                    <th class="w-8" />
                  </tr>
                </thead>
              )}
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={colCount + 2} class="text-center py-8 text-text-muted text-sm">No rows match the filter.</td></tr>
                ) : filteredRows.map((row, ri) => {
                  const actualDataIdx = dataRows.indexOf(row);
                  const actualRowIdx = hasHeader ? actualDataIdx + 1 : actualDataIdx;
                  return (
                    <tr key={ri} class={ri % 2 === 0 ? 'bg-bg' : 'bg-bg-card'}>
                      <td class="px-2 py-1.5 font-mono text-xs text-text-muted">{actualDataIdx + 1}</td>
                      {Array.from({ length: colCount }, (_, ci) => {
                        const isEditing = editingCell?.r === actualRowIdx && editingCell?.c === ci;
                        return (
                          <td key={ci} class="px-2 py-1.5 font-mono text-xs max-w-xs">
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editValue}
                                onInput={e => setEditValue((e.target as HTMLInputElement).value)}
                                onBlur={commitEdit}
                                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                                class="w-full bg-bg border border-primary rounded px-1 py-0.5 text-xs text-text focus:outline-none"
                              />
                            ) : (
                              <span
                                onClick={() => startEdit(ri, ci)}
                                class="cursor-pointer hover:bg-primary/10 hover:text-primary px-1 py-0.5 rounded transition-colors block truncate"
                                title={row[ci] ?? ''}
                              >
                                {row[ci] ?? <span class="text-text-muted/40 italic">empty</span>}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td class="px-2 py-1.5">
                        <button onClick={() => deleteRow(ri)} title="Delete row" class="text-text-muted/40 hover:text-red-400 text-xs transition-colors">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Column stats panel (Pro) */}
          {pro && statsCol !== null && statsData && headerRow && (
            <div class="bg-bg-card border border-border rounded-xl p-4 text-sm">
              <div class="flex items-center justify-between mb-3">
                <span class="font-semibold text-text">Column Stats: <span class="text-primary">{headerRow[statsCol] || `col ${statsCol + 1}`}</span></span>
                <button onClick={() => setStatsCol(null)} class="text-text-muted hover:text-text text-xs">✕</button>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="bg-bg rounded-lg p-3 text-center"><div class="text-xs text-text-muted mb-1">Rows</div><div class="font-mono font-semibold">{dataRows.length}</div></div>
                <div class="bg-bg rounded-lg p-3 text-center"><div class="text-xs text-text-muted mb-1">Unique</div><div class="font-mono font-semibold">{statsData.unique}</div></div>
                <div class="bg-bg rounded-lg p-3 text-center"><div class="text-xs text-text-muted mb-1">Empty</div><div class="font-mono font-semibold">{statsData.empty}</div></div>
                <div class="bg-bg rounded-lg p-3 text-center"><div class="text-xs text-text-muted mb-1">Type</div><div class="font-mono font-semibold">{statsData.numeric ? 'Numeric' : 'Text'}</div></div>
                {statsData.numeric && (
                  <>
                    <div class="bg-bg rounded-lg p-3 text-center"><div class="text-xs text-text-muted mb-1">Min</div><div class="font-mono font-semibold">{statsData.min}</div></div>
                    <div class="bg-bg rounded-lg p-3 text-center"><div class="text-xs text-text-muted mb-1">Max</div><div class="font-mono font-semibold">{statsData.max}</div></div>
                    <div class="bg-bg rounded-lg p-3 text-center col-span-2"><div class="text-xs text-text-muted mb-1">Mean</div><div class="font-mono font-semibold">{statsData.mean?.toFixed(2)}</div></div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pro upsell for stats */}
          {!pro && editMode && (
            <div class="flex items-center justify-between bg-bg-card border border-border rounded-xl p-3">
              <p class="text-xs text-text-muted">Pro: JSON export + column statistics (min, max, mean, unique count).</p>
              <a href="/pro" class="shrink-0 ml-4 text-primary text-xs font-semibold hover:underline">Upgrade →</a>
            </div>
          )}
        </>
      )}

      {!editMode && !input && (
        <p class="text-sm text-text-muted text-center py-8">Paste CSV data above or upload a .csv file to start editing.</p>
      )}
    </div>
  );
}
