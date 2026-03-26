import { useState } from 'preact/hooks';

const PLATFORMS = ['All Tags', 'SEO', 'Open Graph', 'Twitter Card'] as const;
type Platform = (typeof PLATFORMS)[number];

export default function MetaTagGenerator() {
  const [title, setTitle] = useState('My Awesome Page');
  const [description, setDescription] = useState('A description of my page for search engines and social media.');
  const [url, setUrl] = useState('https://example.com/page');
  const [image, setImage] = useState('https://example.com/og-image.jpg');
  const [siteName, setSiteName] = useState('Example Site');
  const [twitterHandle, setTwitterHandle] = useState('@example');
  const [twitterCardType, setTwitterCardType] = useState('summary_large_image');
  const [activeTab, setActiveTab] = useState<Platform>('All Tags');
  const [copied, setCopied] = useState(false);

  const seoTags = `<!-- Primary Meta Tags -->
<title>${title}</title>
<meta name="title" content="${title}">
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">`;

  const ogTags = `<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:site_name" content="${siteName}">`;

  const twitterTags = `<!-- Twitter -->
<meta name="twitter:card" content="${twitterCardType}">
<meta name="twitter:site" content="${twitterHandle}">
<meta name="twitter:url" content="${url}">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">`;

  const allTags = `${seoTags}

${ogTags}

${twitterTags}`;

  const activeCode =
    activeTab === 'SEO'
      ? seoTags
      : activeTab === 'Open Graph'
      ? ogTags
      : activeTab === 'Twitter Card'
      ? twitterTags
      : allTags;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass =
    'w-full bg-bg-secondary border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent font-mono';
  const labelClass = 'block text-xs text-text-muted mb-1 font-medium';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form inputs */}
      <div class="space-y-4">
        <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Page Details</h2>

        <div>
          <label class={labelClass}>Page Title</label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            class={inputClass}
            placeholder="My Awesome Page"
            maxLength={60}
          />
          <p class="text-xs text-text-muted mt-1">{title.length}/60 chars (ideal: ≤60)</p>
        </div>

        <div>
          <label class={labelClass}>Description</label>
          <textarea
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            class={`${inputClass} resize-none`}
            rows={3}
            placeholder="A description of your page..."
            maxLength={160}
          />
          <p class="text-xs text-text-muted mt-1">{description.length}/160 chars (ideal: ≤160)</p>
        </div>

        <div>
          <label class={labelClass}>Canonical URL</label>
          <input
            type="url"
            value={url}
            onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
            class={inputClass}
            placeholder="https://example.com/page"
          />
        </div>

        <div>
          <label class={labelClass}>OG Image URL (1200×630 recommended)</label>
          <input
            type="url"
            value={image}
            onInput={(e) => setImage((e.target as HTMLInputElement).value)}
            class={inputClass}
            placeholder="https://example.com/og-image.jpg"
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class={labelClass}>Site Name</label>
            <input
              type="text"
              value={siteName}
              onInput={(e) => setSiteName((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="Example Site"
            />
          </div>
          <div>
            <label class={labelClass}>Twitter Handle</label>
            <input
              type="text"
              value={twitterHandle}
              onInput={(e) => setTwitterHandle((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="@example"
            />
          </div>
        </div>

        <div>
          <label class={labelClass}>Twitter Card Type</label>
          <select
            value={twitterCardType}
            onChange={(e) => setTwitterCardType((e.target as HTMLSelectElement).value)}
            class={inputClass}
          >
            <option value="summary_large_image">summary_large_image (large image)</option>
            <option value="summary">summary (small image)</option>
            <option value="app">app</option>
            <option value="player">player</option>
          </select>
        </div>

        {/* OG Image Preview */}
        <div class="border border-border rounded-lg overflow-hidden">
          <p class="text-xs text-text-muted px-3 py-2 bg-bg-secondary border-b border-border">Social Preview</p>
          <div class="p-3">
            <div class="border border-border rounded overflow-hidden bg-bg-secondary max-w-sm">
              {image && (
                <div class="bg-gray-800 aspect-[1200/630] flex items-center justify-center text-xs text-text-muted">
                  <span>OG Image ({image.split('/').pop()})</span>
                </div>
              )}
              <div class="p-3">
                <p class="text-xs text-text-muted uppercase">{url ? new URL(url.startsWith('http') ? url : 'https://' + url).hostname : 'example.com'}</p>
                <p class="text-sm font-semibold text-text line-clamp-2 mt-0.5">{title}</p>
                <p class="text-xs text-text-muted line-clamp-2 mt-0.5">{description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Generated tags */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Generated Tags</h2>
          <button
            onClick={handleCopy}
            class="text-xs px-3 py-1.5 rounded bg-accent text-white hover:opacity-90 transition-opacity"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        {/* Tabs */}
        <div class="flex gap-1 bg-bg-secondary rounded-lg p-1">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setActiveTab(p)}
              class={`flex-1 text-xs px-2 py-1.5 rounded transition-colors ${
                activeTab === p
                  ? 'bg-accent text-white font-medium'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Code output */}
        <pre class="bg-bg-secondary border border-border rounded-lg p-4 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap leading-relaxed min-h-[300px]">
          {activeCode}
        </pre>

        {/* Character counts */}
        <div class="bg-bg-secondary border border-border rounded-lg p-4 space-y-2">
          <p class="text-xs font-semibold text-text-muted mb-3">SEO Health Check</p>
          <div class="flex items-center justify-between text-xs">
            <span class="text-text-muted">Title length</span>
            <span class={title.length > 60 ? 'text-red-400' : title.length >= 30 ? 'text-green-400' : 'text-yellow-400'}>
              {title.length} chars {title.length > 60 ? '⚠ Too long' : title.length >= 30 ? '✓ Good' : '⚠ Too short'}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-text-muted">Description length</span>
            <span class={description.length > 160 ? 'text-red-400' : description.length >= 70 ? 'text-green-400' : 'text-yellow-400'}>
              {description.length} chars {description.length > 160 ? '⚠ Too long' : description.length >= 70 ? '✓ Good' : '⚠ Too short'}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-text-muted">OG Image</span>
            <span class={image ? 'text-green-400' : 'text-red-400'}>
              {image ? '✓ Set' : '✗ Missing'}
            </span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-text-muted">Canonical URL</span>
            <span class={url ? 'text-green-400' : 'text-red-400'}>
              {url ? '✓ Set' : '✗ Missing'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
