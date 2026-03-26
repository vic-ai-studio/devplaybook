import { useState, useCallback } from 'preact/hooks';

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

interface HarLog {
  version: string;
  creator: { name: string; version: string };
  entries: HarEntry[];
}

interface HarFile {
  log: HarLog;
}

interface ParseResult {
  entries: HarEntry[];
  totalRequests: number;
  totalSize: number;
  avgLoadTime: number;
  errorCount: number;
  slowest: HarEntry[];
  largest: HarEntry[];
}

function formatBytes(bytes: number): string {
  if (bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function getStatusClass(status: number): string {
  if (status >= 500) return 'text-red-400';
  if (status >= 400) return 'text-orange-400';
  if (status >= 300) return 'text-yellow-400';
  if (status >= 200) return 'text-green-400';
  return 'text-text-muted';
}

function truncateUrl(url: string, max = 60): string {
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    if (path.length > max) return path.slice(0, max) + '…';
    return path;
  } catch {
    return url.length > max ? url.slice(0, max) + '…' : url;
  }
}

function parseHar(text: string): { result?: ParseResult; error?: string } {
  let data: HarFile;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: 'Invalid JSON. Please paste a valid HAR file.' };
  }

  if (!data?.log?.entries) {
    return { error: 'Invalid HAR format. Missing log.entries array.' };
  }

  const entries = data.log.entries;
  const totalRequests = entries.length;

  let totalSize = 0;
  let totalTime = 0;
  let errorCount = 0;

  for (const e of entries) {
    const size = (e.response?.content?.size ?? 0) + (e.response?.headersSize ?? 0);
    totalSize += Math.max(0, size);
    totalTime += e.time ?? 0;
    if (e.response?.status >= 400) errorCount++;
  }

  const avgLoadTime = totalRequests > 0 ? totalTime / totalRequests : 0;

  const slowest = [...entries]
    .sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
    .slice(0, 5);

  const largest = [...entries]
    .sort((a, b) => {
      const sizeA = Math.max(0, (a.response?.content?.size ?? 0) + (a.response?.headersSize ?? 0));
      const sizeB = Math.max(0, (b.response?.content?.size ?? 0) + (b.response?.headersSize ?? 0));
      return sizeB - sizeA;
    })
    .slice(0, 5);

  return { result: { entries, totalRequests, totalSize, avgLoadTime, errorCount, slowest, largest } };
}

export default function HarFileAnalyzer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [activeTab, setActiveTab] = useState<'summary' | 'slowest' | 'largest' | 'errors' | 'all'>('summary');
  const [dragOver, setDragOver] = useState(false);

  function analyze(text: string) {
    const { result: r, error: e } = parseHar(text);
    if (e) { setError(e); setResult(null); }
    else { setResult(r!); setError(''); }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInput(text);
      analyze(text);
    };
    reader.readAsText(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  }

  const filteredEntries = result ? result.entries.filter(e => {
    const statusOk = filterStatus === 'all'
      || (filterStatus === '2xx' && e.response.status >= 200 && e.response.status < 300)
      || (filterStatus === '3xx' && e.response.status >= 300 && e.response.status < 400)
      || (filterStatus === '4xx' && e.response.status >= 400 && e.response.status < 500)
      || (filterStatus === '5xx' && e.response.status >= 500)
      || (filterStatus === 'errors' && e.response.status >= 400);
    const mime = e.response?.content?.mimeType ?? '';
    const typeOk = filterType === 'all'
      || (filterType === 'json' && mime.includes('json'))
      || (filterType === 'html' && mime.includes('html'))
      || (filterType === 'css' && mime.includes('css'))
      || (filterType === 'js' && (mime.includes('javascript') || mime.includes('script')))
      || (filterType === 'image' && mime.includes('image'))
      || (filterType === 'font' && mime.includes('font'))
      || (filterType === 'other' && !mime.includes('json') && !mime.includes('html') && !mime.includes('css') && !mime.includes('javascript') && !mime.includes('script') && !mime.includes('image') && !mime.includes('font'));
    return statusOk && typeOk;
  }) : [];

  const errorEntries = result ? result.entries.filter(e => e.response.status >= 400) : [];

  const maxTime = result ? Math.max(...result.entries.map(e => e.time ?? 0)) : 1;

  return (
    <div class="space-y-4">
      {/* Upload area */}
      <div
        class={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver ? 'border-accent bg-accent/10' : 'border-border'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div class="text-2xl mb-2">📂</div>
        <p class="text-text-muted text-sm mb-3">Drag & drop a .har file here, or upload / paste below</p>
        <label class="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg cursor-pointer text-sm font-medium hover:bg-accent/90 transition-colors">
          <span>Upload .har file</span>
          <input type="file" accept=".har,application/json" class="hidden" onChange={(e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFile(file);
          }} />
        </label>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">Or paste HAR JSON</label>
        <textarea
          class="w-full h-40 font-mono text-xs bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder='{"log":{"entries":[...]}}'
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
        <button
          class="mt-2 px-5 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
          onClick={() => analyze(input)}
        >
          Analyze HAR
        </button>
      </div>

      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Summary cards */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Requests', value: result.totalRequests.toString(), color: 'text-accent' },
              { label: 'Total Size', value: formatBytes(result.totalSize), color: 'text-blue-400' },
              { label: 'Avg Load Time', value: formatTime(result.avgLoadTime), color: 'text-yellow-400' },
              { label: 'Errors (4xx/5xx)', value: result.errorCount.toString(), color: result.errorCount > 0 ? 'text-red-400' : 'text-green-400' },
            ].map(({ label, value, color }) => (
              <div class="bg-surface border border-border rounded-lg p-4 text-center">
                <div class={`text-2xl font-bold ${color}`}>{value}</div>
                <div class="text-xs text-text-muted mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div class="flex gap-1 flex-wrap">
            {(['summary', 'slowest', 'largest', 'errors', 'all'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${activeTab === tab ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
              >
                {tab === 'errors' ? `Errors (${errorEntries.length})` : tab === 'all' ? `All (${result.totalRequests})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Filters for 'all' tab */}
          {activeTab === 'all' && (
            <div class="flex gap-3 flex-wrap">
              <div>
                <label class="text-xs text-text-muted mr-2">Status:</label>
                <select class="text-sm bg-surface border border-border rounded px-2 py-1" value={filterStatus} onChange={(e) => setFilterStatus((e.target as HTMLSelectElement).value)}>
                  <option value="all">All</option>
                  <option value="2xx">2xx</option>
                  <option value="3xx">3xx</option>
                  <option value="4xx">4xx</option>
                  <option value="5xx">5xx</option>
                  <option value="errors">Errors (4xx+5xx)</option>
                </select>
              </div>
              <div>
                <label class="text-xs text-text-muted mr-2">Type:</label>
                <select class="text-sm bg-surface border border-border rounded px-2 py-1" value={filterType} onChange={(e) => setFilterType((e.target as HTMLSelectElement).value)}>
                  <option value="all">All</option>
                  <option value="json">JSON</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="js">JavaScript</option>
                  <option value="image">Image</option>
                  <option value="font">Font</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          )}

          {/* Summary tab: timing waterfall for top 20 */}
          {activeTab === 'summary' && (
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="p-3 border-b border-border text-sm font-medium">Timing Waterfall (first 20 requests)</div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-border text-text-muted">
                      <th class="text-left p-2 pl-3">#</th>
                      <th class="text-left p-2">Method</th>
                      <th class="text-left p-2">URL</th>
                      <th class="text-right p-2">Status</th>
                      <th class="text-right p-2">Size</th>
                      <th class="text-right p-2">Time</th>
                      <th class="p-2 w-32">Waterfall</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.entries.slice(0, 20).map((e, i) => {
                      const size = Math.max(0, (e.response?.content?.size ?? 0) + (e.response?.headersSize ?? 0));
                      const pct = Math.round(((e.time ?? 0) / maxTime) * 100);
                      return (
                        <tr key={i} class="border-b border-border/50 hover:bg-accent/5">
                          <td class="p-2 pl-3 text-text-muted">{i + 1}</td>
                          <td class="p-2 font-mono text-text-muted">{e.request.method}</td>
                          <td class="p-2 max-w-xs font-mono" title={e.request.url}>{truncateUrl(e.request.url)}</td>
                          <td class={`p-2 text-right font-mono ${getStatusClass(e.response.status)}`}>{e.response.status}</td>
                          <td class="p-2 text-right text-text-muted">{formatBytes(size)}</td>
                          <td class="p-2 text-right text-text-muted">{formatTime(e.time ?? 0)}</td>
                          <td class="p-2">
                            <div class="bg-border rounded-full h-2 w-full">
                              <div class="bg-accent rounded-full h-2 transition-all" style={{ width: `${Math.max(2, pct)}%` }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Slowest tab */}
          {activeTab === 'slowest' && (
            <EntryTable title="5 Slowest Requests" entries={result.slowest} metric="time" formatMetric={(e) => formatTime(e.time ?? 0)} />
          )}

          {/* Largest tab */}
          {activeTab === 'largest' && (
            <EntryTable title="5 Largest Responses" entries={result.largest} metric="size"
              formatMetric={(e) => formatBytes(Math.max(0, (e.response?.content?.size ?? 0) + (e.response?.headersSize ?? 0)))} />
          )}

          {/* Errors tab */}
          {activeTab === 'errors' && (
            errorEntries.length === 0
              ? <div class="p-6 text-center text-green-400 text-sm">No errors found — all requests returned 2xx/3xx.</div>
              : <EntryTable title={`${errorEntries.length} Error Requests`} entries={errorEntries} metric="status"
                  formatMetric={(e) => `${e.response.status} ${e.response.statusText}`} />
          )}

          {/* All tab */}
          {activeTab === 'all' && (
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="p-3 border-b border-border text-sm font-medium">
                {filteredEntries.length} request{filteredEntries.length !== 1 ? 's' : ''}
              </div>
              <div class="overflow-x-auto max-h-96 overflow-y-auto">
                <table class="w-full text-xs">
                  <thead class="sticky top-0 bg-surface">
                    <tr class="border-b border-border text-text-muted">
                      <th class="text-left p-2 pl-3">Method</th>
                      <th class="text-left p-2">URL</th>
                      <th class="text-right p-2">Status</th>
                      <th class="text-right p-2">Type</th>
                      <th class="text-right p-2">Size</th>
                      <th class="text-right p-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e, i) => {
                      const size = Math.max(0, (e.response?.content?.size ?? 0) + (e.response?.headersSize ?? 0));
                      const mime = (e.response?.content?.mimeType ?? '').split(';')[0];
                      return (
                        <tr key={i} class="border-b border-border/50 hover:bg-accent/5">
                          <td class="p-2 pl-3 font-mono text-text-muted">{e.request.method}</td>
                          <td class="p-2 max-w-xs font-mono" title={e.request.url}>{truncateUrl(e.request.url, 50)}</td>
                          <td class={`p-2 text-right font-mono ${getStatusClass(e.response.status)}`}>{e.response.status}</td>
                          <td class="p-2 text-right text-text-muted truncate max-w-24">{mime}</td>
                          <td class="p-2 text-right text-text-muted">{formatBytes(size)}</td>
                          <td class="p-2 text-right text-text-muted">{formatTime(e.time ?? 0)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryTable({ title, entries, metric, formatMetric }: {
  title: string;
  entries: HarEntry[];
  metric: string;
  formatMetric: (e: HarEntry) => string;
}) {
  return (
    <div class="bg-surface border border-border rounded-lg overflow-hidden">
      <div class="p-3 border-b border-border text-sm font-medium">{title}</div>
      <div class="overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border text-text-muted">
              <th class="text-left p-2 pl-3">Method</th>
              <th class="text-left p-2">URL</th>
              <th class="text-right p-2">Status</th>
              <th class="text-right p-2">Type</th>
              <th class="text-right p-2">{metric === 'time' ? 'Time' : metric === 'size' ? 'Size' : 'Status'}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e, i) => {
              const mime = (e.response?.content?.mimeType ?? '').split(';')[0];
              return (
                <tr key={i} class="border-b border-border/50 hover:bg-accent/5">
                  <td class="p-2 pl-3 font-mono text-text-muted">{e.request.method}</td>
                  <td class="p-2 max-w-sm font-mono" title={e.request.url}>{truncateUrl(e.request.url, 55)}</td>
                  <td class={`p-2 text-right font-mono ${getStatusClass(e.response.status)}`}>{e.response.status}</td>
                  <td class="p-2 text-right text-text-muted">{mime || '—'}</td>
                  <td class="p-2 text-right font-semibold">{formatMetric(e)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
