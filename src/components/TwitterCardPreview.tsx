import { useState } from 'preact/hooks';

type CardType = 'summary' | 'summary_large_image';

export default function TwitterCardPreview() {
  const [cardType, setCardType] = useState<CardType>('summary_large_image');
  const [title, setTitle] = useState('My Awesome Article Title');
  const [description, setDescription] = useState('A short description of this page for Twitter/X card previews. Keep it under 200 characters for best results.');
  const [imageUrl, setImageUrl] = useState('');
  const [siteName, setSiteName] = useState('@mysite');
  const [copied, setCopied] = useState(false);

  const metaTags = `<meta name="twitter:card" content="${cardType}" />
<meta name="twitter:site" content="${siteName}" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
${imageUrl ? `<meta name="twitter:image" content="${imageUrl}" />` : '<!-- twitter:image not set -->'}`;

  async function copy() {
    await navigator.clipboard.writeText(metaTags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const truncTitle = title.length > 70 ? title.slice(0, 70) + '…' : title;
  const truncDesc = description.length > 200 ? description.slice(0, 200) + '…' : description;

  return (
    <div class="space-y-5">
      {/* Fields */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-text-muted mb-1">Card Type</label>
          <select
            value={cardType}
            onChange={(e) => setCardType((e.target as HTMLSelectElement).value as CardType)}
            class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent"
          >
            <option value="summary_large_image">summary_large_image (large image)</option>
            <option value="summary">summary (small thumbnail)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-text-muted mb-1">Site / Creator Handle</label>
          <input
            type="text"
            value={siteName}
            onInput={(e) => setSiteName((e.target as HTMLInputElement).value)}
            placeholder="@yourhandle"
            class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm text-text-muted mb-1">
            Title <span class={`ml-1 ${title.length > 70 ? 'text-red-400' : 'text-text-muted'}`}>({title.length}/70)</span>
          </label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            placeholder="Page title for Twitter card"
            class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm text-text-muted mb-1">
            Description <span class={`ml-1 ${description.length > 200 ? 'text-red-400' : 'text-text-muted'}`}>({description.length}/200)</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
            placeholder="Short description for your Twitter card..."
            class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent resize-none"
          />
        </div>
        <div class="md:col-span-2">
          <label class="block text-sm text-text-muted mb-1">Image URL (optional)</label>
          <input
            type="url"
            value={imageUrl}
            onInput={(e) => setImageUrl((e.target as HTMLInputElement).value)}
            placeholder="https://example.com/image.png (min 600x314px for large card)"
            class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Preview Card */}
      <div>
        <p class="text-sm font-medium mb-3">Live Preview</p>
        <div class="max-w-lg mx-auto border border-border rounded-2xl overflow-hidden bg-bg-card shadow-lg">
          {/* Image area */}
          {cardType === 'summary_large_image' ? (
            <div class="w-full aspect-[1.91/1] bg-surface flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Card preview"
                  class="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div class="text-text-muted text-sm flex flex-col items-center gap-2">
                  <span class="text-3xl">🖼</span>
                  <span>Image preview (1200×628 recommended)</span>
                </div>
              )}
            </div>
          ) : null}
          <div class="p-4 flex gap-3">
            {/* Thumbnail for summary card */}
            {cardType === 'summary' && (
              <div class="w-16 h-16 shrink-0 rounded-xl bg-surface flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt="" class="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <span class="text-2xl">🖼</span>
                )}
              </div>
            )}
            <div class="min-w-0">
              <p class="text-xs text-text-muted mb-1">{siteName || 'example.com'}</p>
              <h3 class="font-bold text-sm leading-tight line-clamp-2 mb-1">{truncTitle || 'Title'}</h3>
              <p class="text-xs text-text-muted line-clamp-2">{truncDesc || 'Description'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Meta tags output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Meta Tags (copy into &lt;head&gt;)</label>
          <button
            onClick={copy}
            class="text-sm px-3 py-1 border border-border rounded hover:border-accent hover:text-accent transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy tags'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 font-mono text-xs overflow-x-auto text-text whitespace-pre-wrap">{metaTags}</pre>
      </div>

      <p class="text-xs text-text-muted">
        Validate with the <strong>X (Twitter) Card Validator</strong> at cards-dev.twitter.com/validator after publishing. Image must be publicly accessible.
      </p>
    </div>
  );
}
