import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

type SqlResult = { columns: string[]; rows: unknown[][] };
type SqlError = { message: string };

declare global {
  interface Window {
    initSqlJs: (cfg: { locateFile: (f: string) => string }) => Promise<{
      Database: new (data?: ArrayBuffer | Uint8Array) => {
        run: (sql: string) => void;
        exec: (sql: string) => { columns: string[]; values: unknown[][] }[];
        close: () => void;
      };
    }>;
  }
}

const SAMPLE_CSV = `id,name,role,salary,joined
1,Alice Johnson,Engineer,120000,2021-03-15
2,Bob Smith,Designer,95000,2020-07-22
3,Carol White,Manager,140000,2019-01-10
4,David Brown,Engineer,115000,2022-11-01
5,Eve Davis,Analyst,88000,2021-08-30`;

const SAMPLE_QUERIES = [
  { label: 'All rows', sql: 'SELECT * FROM data;' },
  { label: 'Count', sql: 'SELECT COUNT(*) as total FROM data;' },
  { label: 'Filter', sql: "SELECT name, salary FROM data WHERE role = 'Engineer' ORDER BY salary DESC;" },
  { label: 'Aggregate', sql: 'SELECT role, COUNT(*) as count, AVG(salary) as avg_salary FROM data GROUP BY role ORDER BY avg_salary DESC;' },
];

function csvToInserts(csv: string): { tableName: string; sql: string; columns: string[] } | null {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map(h => h.trim().replace(/[^a-zA-Z0-9_]/g, '_'));
  const tableName = 'data';
  const cols = headers.map(h => `"${h}" TEXT`).join(', ');
  const creates = `DROP TABLE IF EXISTS "${tableName}"; CREATE TABLE "${tableName}" (${cols});`;
  const inserts = lines.slice(1).map(line => {
    const vals = line.split(',').map(v => `'${v.trim().replace(/'/g, "''")}'`).join(', ');
    return `INSERT INTO "${tableName}" VALUES (${vals});`;
  });
  return { tableName, sql: creates + '\n' + inserts.join('\n'), columns: headers };
}

export default function SqlPlayground() {
  const [sqlJs, setSqlJs] = useState<Awaited<ReturnType<typeof window.initSqlJs>> | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const dbRef = useRef<ReturnType<InstanceType<Awaited<ReturnType<typeof window.initSqlJs>>['Database']>['exec']>[0] | null>(null);
  // We track the actual DB instance
  const dbInstanceRef = useRef<{ run: (sql: string) => void; exec: (sql: string) => { columns: string[]; values: unknown[][] }[]; close: () => void } | null>(null);

  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [query, setQuery] = useState('SELECT * FROM data;');
  const [results, setResults] = useState<SqlResult[]>([]);
  const [queryError, setQueryError] = useState('');
  const [imported, setImported] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [activeResultTab, setActiveResultTab] = useState(0);

  useEffect(() => {
    // Load sql.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.min.js';
    script.onload = () => {
      window.initSqlJs({ locateFile: f => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}` })
        .then(SQL => { setSqlJs(SQL); setLoading(false); })
        .catch(e => { setLoadError('Failed to load SQLite WASM: ' + e.message); setLoading(false); });
    };
    script.onerror = () => { setLoadError('Failed to load sql.js from CDN'); setLoading(false); };
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  const importCsv = useCallback(() => {
    if (!sqlJs) return;
    const parsed = csvToInserts(csv);
    if (!parsed) { setImportMsg('Invalid CSV format'); return; }
    try {
      if (dbInstanceRef.current) dbInstanceRef.current.close();
      const db = new sqlJs.Database();
      db.run(parsed.sql);
      dbInstanceRef.current = db;
      setImported(true);
      setImportMsg(`✓ Table "${parsed.tableName}" created with ${csv.trim().split('\n').length - 1} rows and ${parsed.columns.length} columns`);
      setResults([]);
      setQueryError('');
    } catch (e: unknown) {
      setImportMsg('Import error: ' + (e as SqlError).message);
    }
  }, [sqlJs, csv]);

  const runQuery = useCallback(() => {
    if (!dbInstanceRef.current) { setQueryError('Import CSV first'); return; }
    if (!query.trim()) return;
    setQueryError('');
    try {
      const out = dbInstanceRef.current.exec(query);
      const mapped: SqlResult[] = out.map(r => ({ columns: r.columns, rows: r.values }));
      setResults(mapped);
      setActiveResultTab(0);
      if (mapped.length === 0) setQueryError('Query executed successfully (no results)');
    } catch (e: unknown) {
      setQueryError((e as SqlError).message);
      setResults([]);
    }
  }, [query]);

  const exportCsv = useCallback((result: SqlResult) => {
    const header = result.columns.join(',');
    const rows = result.rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'result.csv'; a.click();
    URL.revokeObjectURL(url);
  }, []);

  if (loading) {
    return (
      <div class="bg-surface border border-border rounded-xl p-8 text-center text-text-muted">
        <div class="text-2xl mb-2">⏳</div>
        <div class="text-sm">Loading SQLite WASM engine…</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <div class="text-red-400 font-medium mb-1">Failed to load SQL engine</div>
        <div class="text-xs text-text-muted">{loadError}</div>
        <div class="text-xs text-text-muted mt-2">Check your internet connection and refresh the page.</div>
      </div>
    );
  }

  return (
    <div class="space-y-4">
      {/* CSV Import */}
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border">
          <span class="text-xs font-medium text-text-muted">CSV Data Import</span>
          <button onClick={() => setCsv(SAMPLE_CSV)} class="text-xs text-accent hover:underline">Load Sample</button>
        </div>
        <textarea
          value={csv}
          onInput={e => { setCsv((e.target as HTMLTextAreaElement).value); setImported(false); setImportMsg(''); }}
          rows={6}
          spellcheck={false}
          class="w-full p-4 font-mono text-xs bg-bg text-text resize-y focus:outline-none"
          placeholder="Paste CSV data here (first row = column headers)"
        />
        <div class="px-4 py-2 border-t border-border flex items-center gap-3">
          <button
            onClick={importCsv}
            class="px-4 py-1.5 bg-accent text-white rounded text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Import CSV →
          </button>
          {importMsg && (
            <span class={`text-xs font-mono ${importMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{importMsg}</span>
          )}
        </div>
      </div>

      {/* Query Editor */}
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border">
          <span class="text-xs font-medium text-text-muted">SQL Query</span>
          <div class="flex gap-2">
            {SAMPLE_QUERIES.map(q => (
              <button
                key={q.label}
                onClick={() => setQuery(q.sql)}
                class="text-xs px-2 py-0.5 bg-bg border border-border rounded text-text-muted hover:text-text hover:border-accent/50 transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={query}
          onInput={e => setQuery((e.target as HTMLTextAreaElement).value)}
          rows={4}
          spellcheck={false}
          class="w-full p-4 font-mono text-sm bg-bg text-text resize-y focus:outline-none"
          placeholder="SELECT * FROM data;"
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runQuery(); } }}
        />
        <div class="px-4 py-2 border-t border-border flex items-center gap-3">
          <button
            onClick={runQuery}
            disabled={!imported}
            class="px-4 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40"
          >
            ▶ Run Query
          </button>
          <span class="text-xs text-text-muted">Ctrl+Enter</span>
          {!imported && <span class="text-xs text-yellow-400">Import CSV first</span>}
        </div>
      </div>

      {/* Error */}
      {queryError && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400 font-mono">
          {queryError}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <div class="flex">
              {results.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveResultTab(i)}
                  class={`px-3 py-1 text-xs font-medium transition-colors ${activeResultTab === i ? 'text-accent border-b-2 border-accent' : 'text-text-muted hover:text-text'}`}
                >
                  Result {i + 1} ({results[i].rows.length} rows)
                </button>
              ))}
            </div>
            <button
              onClick={() => exportCsv(results[activeResultTab])}
              class="text-xs px-3 py-1 bg-surface border border-border text-text-muted rounded hover:bg-bg transition-colors"
            >
              Export CSV
            </button>
          </div>
          <div class="overflow-auto max-h-72">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-surface">
                <tr>
                  {results[activeResultTab].columns.map(c => (
                    <th key={c} class="px-3 py-2 text-left font-medium text-text-muted border-b border-border whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results[activeResultTab].rows.map((row, i) => (
                  <tr key={i} class={i % 2 === 0 ? 'bg-bg' : 'bg-surface'}>
                    {row.map((cell, j) => (
                      <td key={j} class="px-3 py-1.5 font-mono text-text border-b border-border/50 whitespace-nowrap">
                        {cell === null ? <span class="text-text-muted italic">NULL</span> : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
