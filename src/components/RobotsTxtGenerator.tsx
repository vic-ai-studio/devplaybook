import { useState } from 'preact/hooks';

interface Rule {
  id: string;
  userAgent: string;
  disallow: string[];
  allow: string[];
  crawlDelay: string;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const PRESETS = [
  {
    label: 'Allow all',
    rules: [{ id: makeId(), userAgent: '*', disallow: [], allow: [], crawlDelay: '' }],
    sitemap: '',
  },
  {
    label: 'Block all',
    rules: [{ id: makeId(), userAgent: '*', disallow: ['/'], allow: [], crawlDelay: '' }],
    sitemap: '',
  },
  {
    label: 'Block AI crawlers',
    rules: [
      { id: makeId(), userAgent: '*', disallow: [], allow: [], crawlDelay: '' },
      { id: makeId(), userAgent: 'GPTBot', disallow: ['/'], allow: [], crawlDelay: '' },
      { id: makeId(), userAgent: 'CCBot', disallow: ['/'], allow: [], crawlDelay: '' },
      { id: makeId(), userAgent: 'anthropic-ai', disallow: ['/'], allow: [], crawlDelay: '' },
    ],
    sitemap: '',
  },
  {
    label: 'Block /admin only',
    rules: [{ id: makeId(), userAgent: '*', disallow: ['/admin/', '/private/'], allow: [], crawlDelay: '' }],
    sitemap: 'https://example.com/sitemap.xml',
  },
];

function buildRobotsTxt(rules: Rule[], sitemapUrl: string): string {
  const blocks = rules.map((r) => {
    const lines: string[] = [];
    lines.push(`User-agent: ${r.userAgent || '*'}`);
    r.disallow.forEach((d) => { if (d) lines.push(`Disallow: ${d}`); });
    r.allow.forEach((a) => { if (a) lines.push(`Allow: ${a}`); });
    if (r.crawlDelay) lines.push(`Crawl-delay: ${r.crawlDelay}`);
    return lines.join('\n');
  });
  if (sitemapUrl) blocks.push(`Sitemap: ${sitemapUrl}`);
  return blocks.join('\n\n');
}

export default function RobotsTxtGenerator() {
  const [rules, setRules] = useState<Rule[]>([
    { id: makeId(), userAgent: '*', disallow: ['/admin/', '/private/'], allow: [], crawlDelay: '' },
  ]);
  const [sitemapUrl, setSitemapUrl] = useState('https://example.com/sitemap.xml');
  const [copied, setCopied] = useState(false);

  const output = buildRobotsTxt(rules, sitemapUrl);

  function addRule() {
    setRules((r) => [...r, { id: makeId(), userAgent: '', disallow: [''], allow: [], crawlDelay: '' }]);
  }

  function removeRule(id: string) {
    setRules((r) => r.filter((x) => x.id !== id));
  }

  function updateRule(id: string, field: keyof Rule, value: string | string[]) {
    setRules((r) => r.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  function updatePaths(id: string, field: 'disallow' | 'allow', raw: string) {
    const paths = raw.split('\n');
    updateRule(id, field, paths);
  }

  function applyPreset(idx: number) {
    const p = PRESETS[idx];
    setRules(p.rules.map((r) => ({ ...r, id: makeId() })));
    setSitemapUrl(p.sitemap);
  }

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div class="space-y-5">
      {/* Presets */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Quick presets</label>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => applyPreset(i)}
              class="px-3 py-1.5 text-sm rounded-lg bg-bg-card border border-border hover:border-primary hover:text-primary text-text-muted transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div class="space-y-4">
        {rules.map((rule, idx) => (
          <div key={rule.id} class="border border-border rounded-xl p-4 space-y-3 bg-bg-card">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-text">Rule {idx + 1}</span>
              {rules.length > 1 && (
                <button
                  onClick={() => removeRule(rule.id)}
                  class="text-xs text-red-400 hover:text-red-500 border border-red-400/30 px-2 py-0.5 rounded transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">User-agent</label>
                <input
                  type="text"
                  value={rule.userAgent}
                  onInput={(e) => updateRule(rule.id, 'userAgent', (e.target as HTMLInputElement).value)}
                  placeholder="* (all bots)"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Crawl-delay (seconds, optional)</label>
                <input
                  type="number"
                  value={rule.crawlDelay}
                  onInput={(e) => updateRule(rule.id, 'crawlDelay', (e.target as HTMLInputElement).value)}
                  placeholder="10"
                  min="0"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">Disallow paths (one per line)</label>
                <textarea
                  value={rule.disallow.join('\n')}
                  onInput={(e) => updatePaths(rule.id, 'disallow', (e.target as HTMLTextAreaElement).value)}
                  placeholder="/admin/&#10;/private/&#10;/tmp/"
                  rows={3}
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text resize-none focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Allow paths (one per line, optional)</label>
                <textarea
                  value={rule.allow.join('\n')}
                  onInput={(e) => updatePaths(rule.id, 'allow', (e.target as HTMLTextAreaElement).value)}
                  placeholder="/admin/public/&#10;/public-api/"
                  rows={3}
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text resize-none focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addRule}
        class="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
      >
        + Add rule block
      </button>

      {/* Sitemap URL */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">Sitemap URL (optional)</label>
        <input
          type="url"
          value={sitemapUrl}
          onInput={(e) => setSitemapUrl((e.target as HTMLInputElement).value)}
          placeholder="https://example.com/sitemap.xml"
          class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-semibold text-text">robots.txt output</label>
          <button
            onClick={copy}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="w-full bg-bg-card border border-border rounded-xl p-4 font-mono text-sm text-text overflow-x-auto whitespace-pre-wrap">{output}</pre>
      </div>

      <p class="text-xs text-text-muted">Place this file at the root of your domain: <code class="font-mono">https://yourdomain.com/robots.txt</code></p>
    </div>
  );
}
