import { useState, useCallback } from 'preact/hooks';

// ── Types ────────────────────────────────────────────────────────────────────

interface HarEntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    headers: { name: string; value: string }[];
    bodySize: number;
    headersSize: number;
  };
  response: {
    status: number;
    statusText: string;
    headers: { name: string; value: string }[];
    content: { size: number; mimeType: string };
    bodySize: number;
    headersSize: number;
  };
  timings: {
    blocked?: number;
    dns?: number;
    connect?: number;
    ssl?: number;
    send: number;
    wait: number;
    receive: number;
  };
}

interface HarFile {
  log: {
    version: string;
    creator: { name: string; version: string };
    entries: HarEntry[];
  };
}

interface DiffRow {
  method: string;
  url: string;
  statusA: number;
  statusB: number;
  timeA: number;
  timeB: number;
  delta: number;
  statusChanged: boolean;
}

interface DiffResult {
  newRequests: HarEntry[];
  removedRequests: HarEntry[];
  changedRows: DiffRow[];
  allRows: DiffRow[];
}

// ── Utilities ────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatDelta(ms: number): string {
  const sign = ms > 0 ? '+' : '';
  if (Math.abs(ms) < 1000) return `${sign}${Math.round(ms)} ms`;
  return `${sign}${(ms / 1000).toFixed(2)} s`;
}

function truncateUrl(url: string, max = 55): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path.length > max) return path.slice(0, max) + '…';
    return path;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

function getStatusClass(status: number): string {
  if (status >= 500) return 'text-red-400';
  if (status >= 400) return 'text-orange-400';
  if (status >= 300) return 'text-yellow-400';
  if (status >= 200) return 'text-green-400';
  return 'text-text-muted';
}

function buildKey(e: HarEntry): string {
  try {
    const u = new URL(e.request.url);
    return `${e.request.method.toUpperCase()}::${u.pathname}${u.search}`;
  } catch {
    return `${e.request.method.toUpperCase()}::${e.request.url}`;
  }
}

function parseHar(text: string): { entries?: HarEntry[]; error?: string } {
  let data: HarFile;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON. Please upload a valid .har file.' };
  }
  if (!data?.log?.entries) {
    return { error: 'Invalid HAR format — missing log.entries array.' };
  }
  return { entries: data.log.entries };
}

function diffHar(a: HarEntry[], b: HarEntry[]): DiffResult {
  const mapA = new Map<string, HarEntry>();
  const mapB = new Map<string, HarEntry>();

  for (const e of a) mapA.set(buildKey(e), e);
  for (const e of b) mapB.set(buildKey(e), e);

  const newRequests: HarEntry[] = [];
  const removedRequests: HarEntry[] = [];
  const allRows: DiffRow[] = [];

  // Requests in B but not A
  for (const [key, eB] of mapB.entries()) {
    if (!mapA.has(key)) newRequests.push(eB);
  }

  // Requests in A but not B
  for (const [key, eA] of mapA.entries()) {
    if (!mapB.has(key)) removedRequests.push(eA);
  }

  // Requests in both
  for (const [key, eA] of mapA.entries()) {
    const eB = mapB.get(key);
    if (!eB) continue;
    const timeA = eA.time ?? 0;
    const timeB = eB.time ?? 0;
    const statusA = eA.response?.status ?? 0;
    const statusB = eB.response?.status ?? 0;
    const delta = timeB - timeA;
    allRows.push({
      method: eA.request.method,
      url: eA.request.url,
      statusA,
      statusB,
      timeA,
      timeB,
      delta,
      statusChanged: statusA !== statusB,
    });
  }

  // Sort all rows by abs delta descending
  allRows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Changed rows = status changed OR delta >= 50 ms
  const changedRows = allRows.filter(r => r.statusChanged || Math.abs(r.delta) >= 50);

  return { newRequests, removedRequests, changedRows, allRows };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DeltaCell({ delta }: { delta: number }) {
  const abs = Math.abs(delta);
  let cls = 'text-text-muted';
  if (abs < 50) cls = 'text-text-muted';
  else if (delta < 0) cls = 'text-green-400 font-semibold';
  else cls = 'text-red-400 font-semibold';
  return <span class={cls}>{formatDelta(delta)}</span>;
}

function StatusPair({ a, b }: { a: number; b: number }) {
  if (a === b) return <span class={getStatusClass(a)}>{a}</span>;
  return (
    <span>
      <span class={getStatusClass(a)}>{a}</span>
      <span class="text-yellow-400 mx-1">→</span>
      <span class={getStatusClass(b)}>{b}</span>
    </span>
  );
}

function DiffTable({ rows, label }: { rows: DiffRow[]; label: string }) {
  if (rows.length === 0) {
    return (
      <div class="p-6 text-center text-text-muted text-sm">
        No {label.toLowerCase()} found.
      </div>
    );
  }
  return (
    <div class="overflow-x-auto max-h-96 overflow-y-auto">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface z-10">
          <tr class="border-b border-border text-text-muted">
            <th class="text-left p-2 pl-3">Method</th>
            <th class="text-left p-2">URL</th>
            <th class="text-right p-2 whitespace-nowrap">Status A→B</th>
            <th class="text-right p-2">Time A</th>
            <th class="text-right p-2">Time B</th>
            <th class="text-right p-2">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              class={`border-b border-border/50 hover:bg-accent/5 ${
                r.statusChanged ? 'bg-yellow-500/5' : ''
              }`}
            >
              <td class="p-2 pl-3 font-mono text-text-muted">{r.method}</td>
              <td class="p-2 font-mono max-w-xs" title={r.url}>
                {truncateUrl(r.url)}
              </td>
              <td class="p-2 text-right font-mono">
                <StatusPair a={r.statusA} b={r.statusB} />
              </td>
              <td class="p-2 text-right text-text-muted">{formatTime(r.timeA)}</td>
              <td class="p-2 text-right text-text-muted">{formatTime(r.timeB)}</td>
              <td class="p-2 text-right">
                <DeltaCell delta={r.delta} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SingleEntryTable({ entries, label }: { entries: HarEntry[]; label: string }) {
  if (entries.length === 0) {
    return (
      <div class="p-6 text-center text-text-muted text-sm">
        No {label.toLowerCase()}.
      </div>
    );
  }
  return (
    <div class="overflow-x-auto max-h-80 overflow-y-auto">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-surface z-10">
          <tr class="border-b border-border text-text-muted">
            <th class="text-left p-2 pl-3">Method</th>
            <th class="text-left p-2">URL</th>
            <th class="text-right p-2">Status</th>
            <th class="text-right p-2">Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} class="border-b border-border/50 hover:bg-accent/5">
              <td class="p-2 pl-3 font-mono text-text-muted">{e.request.method}</td>
              <td class="p-2 font-mono max-w-xs" title={e.request.url}>
                {truncateUrl(e.request.url)}
              </td>
              <td class={`p-2 text-right font-mono ${getStatusClass(e.response?.status ?? 0)}`}>
                {e.response?.status ?? '—'}
              </td>
              <td class="p-2 text-right text-text-muted">{formatTime(e.time ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Upload drop zone ─────────────────────────────────────────────────────────

function DropZone({
  label,
  fileName,
  onFile,
}: {
  label: string;
  fileName: string | null;
  onFile: (file: File) => void;
}) {
  const [drag, setDrag] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer?.files[0];
    if (file) onFile(file);
  }

  return (
    <div
      class={`border-2 border-dashed rounded-lg p-5 text-center transition-colors cursor-pointer ${
        drag ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <div class="text-2xl mb-1">📂</div>
      <p class="text-sm font-medium mb-1">{label}</p>
      {fileName ? (
        <p class="text-xs text-green-400 truncate">{fileName}</p>
      ) : (
        <p class="text-xs text-text-muted">Drag & drop or click to upload</p>
      )}
      <label class="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-accent text-white rounded-lg cursor-pointer text-xs font-medium hover:bg-accent/90 transition-colors">
        <span>{fileName ? 'Replace file' : 'Upload .har'}</span>
        <input
          type="file"
          accept=".har,application/json"
          class="hidden"
          onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

type Tab = 'regression' | 'changed' | 'new' | 'removed' | 'all';

export default function HarDiffAnalyzer() {
  const [nameA, setNameA] = useState<string | null>(null);
  const [nameB, setNameB] = useState<string | null>(null);
  const [entriesA, setEntriesA] = useState<HarEntry[] | null>(null);
  const [entriesB, setEntriesB] = useState<HarEntry[] | null>(null);
  const [errorA, setErrorA] = useState('');
  const [errorB, setErrorB] = useState('');
  const [result, setResult] = useState<DiffResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('regression');

  function loadFile(
    file: File,
    setName: (n: string) => void,
    setEntries: (e: HarEntry[]) => void,
    setError: (e: string) => void,
  ) {
    setName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { entries, error } = parseHar(text);
      if (error) { setError(error); setEntries([]); }
      else { setError(''); setEntries(entries!); }
    };
    reader.readAsText(file);
  }

  function handleFileA(file: File) {
    loadFile(file, setNameA, (e) => { setEntriesA(e); setResult(null); }, setErrorA);
  }

  function handleFileB(file: File) {
    loadFile(file, setNameB, (e) => { setEntriesB(e); setResult(null); }, setErrorB);
  }

  function runDiff() {
    if (!entriesA || !entriesB) return;
    setResult(diffHar(entriesA, entriesB));
    setActiveTab('regression');
  }

  const canDiff = entriesA && entriesA.length > 0 && entriesB && entriesB.length > 0 && !errorA && !errorB;

  const tabs: { id: Tab; label: string; count?: number }[] = result
    ? [
        { id: 'regression', label: 'Performance Regression' },
        { id: 'changed', label: 'Changed', count: result.changedRows.length },
        { id: 'new', label: 'New Requests', count: result.newRequests.length },
        { id: 'removed', label: 'Removed', count: result.removedRequests.length },
        { id: 'all', label: 'All Common', count: result.allRows.length },
      ]
    : [];

  return (
    <div class="space-y-4">
      {/* File upload row */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p class="text-xs text-text-muted mb-1">File A — Baseline</p>
          <DropZone label="Baseline HAR (File A)" fileName={nameA} onFile={handleFileA} />
          {errorA && (
            <p class="mt-2 text-xs text-red-400">{errorA}</p>
          )}
        </div>
        <div>
          <p class="text-xs text-text-muted mb-1">File B — Comparison</p>
          <DropZone label="Comparison HAR (File B)" fileName={nameB} onFile={handleFileB} />
          {errorB && (
            <p class="mt-2 text-xs text-red-400">{errorB}</p>
          )}
        </div>
      </div>

      {/* Diff button */}
      <div class="flex items-center gap-4">
        <button
          class={`px-6 py-2 rounded-lg font-medium text-sm transition-colors ${
            canDiff
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'bg-surface border border-border text-text-muted cursor-not-allowed'
          }`}
          disabled={!canDiff}
          onClick={runDiff}
        >
          Compare HAR Files
        </button>
        {entriesA && !errorA && (
          <span class="text-xs text-text-muted">{entriesA.length} requests in A</span>
        )}
        {entriesB && !errorB && (
          <span class="text-xs text-text-muted">{entriesB.length} requests in B</span>
        )}
      </div>

      {/* Results */}
      {result && (
        <div class="space-y-4">
          {/* Summary cards */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'New Requests',
                value: result.newRequests.length,
                color: result.newRequests.length > 0 ? 'text-blue-400' : 'text-text-muted',
              },
              {
                label: 'Removed Requests',
                value: result.removedRequests.length,
                color: result.removedRequests.length > 0 ? 'text-orange-400' : 'text-text-muted',
              },
              {
                label: 'Status Changes',
                value: result.changedRows.filter(r => r.statusChanged).length,
                color: result.changedRows.filter(r => r.statusChanged).length > 0 ? 'text-yellow-400' : 'text-text-muted',
              },
              {
                label: 'Regressions ≥50ms',
                value: result.allRows.filter(r => r.delta >= 50).length,
                color: result.allRows.filter(r => r.delta >= 50).length > 0 ? 'text-red-400' : 'text-green-400',
              },
            ].map(({ label, value, color }) => (
              <div class="bg-surface border border-border rounded-lg p-4 text-center">
                <div class={`text-2xl font-bold ${color}`}>{value}</div>
                <div class="text-xs text-text-muted mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div class="flex gap-4 flex-wrap text-xs text-text-muted">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-green-400/20 border border-green-400 inline-block" />Faster (green delta)</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-red-400/20 border border-red-400 inline-block" />Slower (red delta)</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500 inline-block" />Status changed (row highlight)</span>
          </div>

          {/* Tabs */}
          <div class="flex gap-1 flex-wrap">
            {tabs.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-accent text-white'
                    : 'bg-surface border border-border text-text-muted hover:text-text'
                }`}
              >
                {label}{count !== undefined ? ` (${count})` : ''}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div class="bg-surface border border-border rounded-lg overflow-hidden">
            {activeTab === 'regression' && (
              <>
                <div class="p-3 border-b border-border text-sm font-medium">
                  Performance Regression — all common requests sorted by absolute timing delta
                </div>
                <DiffTable rows={result.allRows} label="common requests" />
              </>
            )}
            {activeTab === 'changed' && (
              <>
                <div class="p-3 border-b border-border text-sm font-medium">
                  Changed Requests — status code changed or delta ≥ 50 ms
                </div>
                <DiffTable rows={result.changedRows} label="changed requests" />
              </>
            )}
            {activeTab === 'new' && (
              <>
                <div class="p-3 border-b border-border text-sm font-medium">
                  New Requests — present in File B but not in File A
                </div>
                <SingleEntryTable entries={result.newRequests} label="new requests" />
              </>
            )}
            {activeTab === 'removed' && (
              <>
                <div class="p-3 border-b border-border text-sm font-medium">
                  Removed Requests — present in File A but not in File B
                </div>
                <SingleEntryTable entries={result.removedRequests} label="removed requests" />
              </>
            )}
            {activeTab === 'all' && (
              <>
                <div class="p-3 border-b border-border text-sm font-medium">
                  All Common Requests ({result.allRows.length}) — sorted by absolute timing delta
                </div>
                <DiffTable rows={result.allRows} label="common requests" />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
