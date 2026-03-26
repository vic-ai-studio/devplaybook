import { useState } from 'preact/hooks';

interface SitemapUrl {
  id: string;
  loc: string;
  priority: string;
  changefreq: string;
  lastmod: string;
}

const CHANGEFREQS = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function escapeXml(str: string) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSitemap(urls: SitemapUrl[]): string {
  const entries = urls
    .filter((u) => u.loc.trim())
    .map((u) => {
      const lines = [`  <url>`, `    <loc>${escapeXml(u.loc.trim())}</loc>`];
      if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`);
      if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`);
      if (u.priority) lines.push(`    <priority>${u.priority}</priority>`);
      lines.push(`  </url>`);
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

export default function SitemapGenerator() {
  const [urls, setUrls] = useState<SitemapUrl[]>([
    { id: makeId(), loc: 'https://example.com/', priority: '1.0', changefreq: 'weekly', lastmod: today() },
    { id: makeId(), loc: 'https://example.com/blog/', priority: '0.8', changefreq: 'daily', lastmod: today() },
    { id: makeId(), loc: 'https://example.com/about/', priority: '0.6', changefreq: 'monthly', lastmod: today() },
  ]);
  const [copied, setCopied] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  const output = buildSitemap(urls);
  const validCount = urls.filter((u) => u.loc.trim()).length;

  function addUrl() {
    setUrls((u) => [...u, { id: makeId(), loc: '', priority: '0.5', changefreq: 'monthly', lastmod: today() }]);
  }

  function removeUrl(id: string) {
    setUrls((u) => u.filter((x) => x.id !== id));
  }

  function updateUrl(id: string, field: keyof SitemapUrl, value: string) {
    setUrls((u) => u.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  function applyBulk() {
    const lines = bulkInput.split('\n').map((l) => l.trim()).filter(Boolean);
    const newUrls = lines.map((loc) => ({
      id: makeId(),
      loc,
      priority: '0.5',
      changefreq: 'monthly',
      lastmod: today(),
    }));
    setUrls(newUrls);
    setBulkMode(false);
    setBulkInput('');
  }

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function download() {
    const blob = new Blob([output], { type: 'application/xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sitemap.xml';
    a.click();
  }

  return (
    <div class="space-y-5">
      {/* Bulk import */}
      <div class="flex justify-between items-center">
        <p class="text-sm text-text-muted">{validCount} URL{validCount !== 1 ? 's' : ''} in sitemap</p>
        <button
          onClick={() => setBulkMode((b) => !b)}
          class="text-xs border border-border rounded-lg px-3 py-1.5 text-text-muted hover:border-primary hover:text-primary transition-colors"
        >
          {bulkMode ? 'Cancel bulk import' : 'Bulk import URLs'}
        </button>
      </div>

      {bulkMode && (
        <div class="space-y-3 border border-border rounded-xl p-4 bg-bg-card">
          <label class="block text-sm font-medium text-text-muted">Paste URLs — one per line</label>
          <textarea
            value={bulkInput}
            onInput={(e) => setBulkInput((e.target as HTMLTextAreaElement).value)}
            placeholder="https://example.com/&#10;https://example.com/blog/&#10;https://example.com/about/"
            rows={6}
            class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text resize-none focus:outline-none focus:border-primary transition-colors"
          />
          <button
            onClick={applyBulk}
            disabled={!bulkInput.trim()}
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            Import {bulkInput.split('\n').filter((l) => l.trim()).length} URLs
          </button>
        </div>
      )}

      {/* URL table */}
      <div class="space-y-3">
        {urls.map((u, idx) => (
          <div key={u.id} class="border border-border rounded-xl p-4 space-y-3 bg-bg-card">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">URL {idx + 1}</span>
              {urls.length > 1 && (
                <button
                  onClick={() => removeUrl(u.id)}
                  class="text-xs text-red-400 hover:text-red-500 border border-red-400/30 px-2 py-0.5 rounded transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              type="url"
              value={u.loc}
              onInput={(e) => updateUrl(u.id, 'loc', (e.target as HTMLInputElement).value)}
              placeholder="https://example.com/page/"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
            />
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">Priority</label>
                <select
                  value={u.priority}
                  onChange={(e) => updateUrl(u.id, 'priority', (e.target as HTMLSelectElement).value)}
                  class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                >
                  {['1.0', '0.9', '0.8', '0.7', '0.6', '0.5', '0.4', '0.3', '0.2', '0.1'].map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Change freq</label>
                <select
                  value={u.changefreq}
                  onChange={(e) => updateUrl(u.id, 'changefreq', (e.target as HTMLSelectElement).value)}
                  class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                >
                  {CHANGEFREQS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Last modified</label>
                <input
                  type="date"
                  value={u.lastmod}
                  onChange={(e) => updateUrl(u.id, 'lastmod', (e.target as HTMLInputElement).value)}
                  class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addUrl}
        class="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
      >
        + Add URL
      </button>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-semibold text-text">sitemap.xml output</label>
          <div class="flex gap-2">
            <button
              onClick={copy}
              class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy XML'}
            </button>
            <button
              onClick={download}
              class="text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity"
            >
              Download
            </button>
          </div>
        </div>
        <pre class="w-full bg-bg-card border border-border rounded-xl p-4 font-mono text-sm text-text overflow-x-auto whitespace-pre-wrap max-h-64">{output}</pre>
      </div>

      <p class="text-xs text-text-muted">Submit your sitemap URL in <a href="https://search.google.com/search-console" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Search Console</a> to speed up indexing.</p>
    </div>
  );
}
