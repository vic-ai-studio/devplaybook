import { useState } from 'preact/hooks';

interface OGData {
  title: string;
  description: string;
  image: string;
  siteName: string;
  url: string;
  type: string;
}

const DEFAULT_OG: OGData = {
  title: 'My Awesome Page',
  description: 'This is a preview of how your page appears when shared on social media platforms.',
  image: 'https://via.placeholder.com/1200x630/4F46E5/ffffff?text=Open+Graph+Preview',
  siteName: 'example.com',
  url: 'https://example.com/my-page',
  type: 'website',
};

function TwitterCard({ og }: { og: OGData }) {
  return (
    <div class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden max-w-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {og.image && (
        <img
          src={og.image}
          alt="OG Preview"
          class="w-full h-48 object-cover bg-gray-100 dark:bg-gray-800"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div class="p-3">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{og.siteName || 'example.com'}</p>
        <p class="font-semibold text-sm leading-tight line-clamp-2">{og.title || 'No title'}</p>
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">{og.description}</p>
      </div>
    </div>
  );
}

function FacebookCard({ og }: { og: OGData }) {
  return (
    <div class="border border-gray-200 dark:border-gray-700 overflow-hidden max-w-md bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      {og.image && (
        <img
          src={og.image}
          alt="OG Preview"
          class="w-full h-52 object-cover bg-gray-100 dark:bg-gray-800"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <div class="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <p class="text-xs text-gray-500 uppercase tracking-wide mb-1">{og.siteName || 'example.com'}</p>
        <p class="font-semibold text-sm">{og.title || 'No title'}</p>
        <p class="text-xs text-gray-500 mt-1 line-clamp-3">{og.description}</p>
      </div>
    </div>
  );
}

function SlackCard({ og }: { og: OGData }) {
  return (
    <div class="border-l-4 border-[#4A154B] pl-3 py-1 max-w-md bg-white dark:bg-gray-900">
      <p class="font-semibold text-sm text-[#1264A3] dark:text-blue-400">{og.title || 'No title'}</p>
      {og.description && <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{og.description}</p>}
      {og.image && (
        <img
          src={og.image}
          alt="OG Preview"
          class="mt-2 rounded max-w-xs h-32 object-cover bg-gray-100"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <p class="text-xs text-gray-400 mt-1">{og.url}</p>
    </div>
  );
}

export default function OpenGraphPreview() {
  const [og, setOg] = useState<OGData>(DEFAULT_OG);
  const [copied, setCopied] = useState<string | null>(null);
  const [activePreview, setActivePreview] = useState<'twitter' | 'facebook' | 'slack'>('twitter');

  const update = (field: keyof OGData) => (e: Event) => {
    setOg({ ...og, [field]: (e.currentTarget as HTMLInputElement).value });
  };

  const copyTag = (tag: string, value: string) => {
    navigator.clipboard.writeText(`<meta property="og:${tag}" content="${value}" />`);
    setCopied(tag);
    setTimeout(() => setCopied(null), 1500);
  };

  const copyAll = () => {
    const tags = [
      `<meta property="og:title" content="${og.title}" />`,
      `<meta property="og:description" content="${og.description}" />`,
      `<meta property="og:image" content="${og.image}" />`,
      `<meta property="og:url" content="${og.url}" />`,
      `<meta property="og:site_name" content="${og.siteName}" />`,
      `<meta property="og:type" content="${og.type}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${og.title}" />`,
      `<meta name="twitter:description" content="${og.description}" />`,
      `<meta name="twitter:image" content="${og.image}" />`,
    ].join('\n');
    navigator.clipboard.writeText(tags);
    setCopied('all');
    setTimeout(() => setCopied(null), 1500);
  };

  const fields: Array<{ key: keyof OGData; label: string; placeholder: string; multiline?: boolean }> = [
    { key: 'title', label: 'og:title', placeholder: 'Page title (60 chars recommended)', },
    { key: 'description', label: 'og:description', placeholder: 'Description (155 chars recommended)', multiline: true },
    { key: 'image', label: 'og:image', placeholder: 'https://example.com/og-image.png (1200×630px)' },
    { key: 'url', label: 'og:url', placeholder: 'https://example.com/page' },
    { key: 'siteName', label: 'og:site_name', placeholder: 'Your Site Name' },
    { key: 'type', label: 'og:type', placeholder: 'website' },
  ];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Input */}
      <div class="space-y-3">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">OG Tag Editor</h2>
        {fields.map(({ key, label, placeholder, multiline }) => (
          <div key={key} class="space-y-1">
            <div class="flex items-center justify-between">
              <label class="text-xs font-mono text-text-muted">{label}</label>
              <button
                onClick={() => copyTag(key, og[key])}
                class="text-xs text-primary hover:underline"
              >
                {copied === key ? '✓ copied' : 'copy tag'}
              </button>
            </div>
            {multiline ? (
              <textarea
                value={og[key]}
                onInput={update(key)}
                placeholder={placeholder}
                rows={2}
                class="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-mono resize-none focus:outline-none focus:border-primary"
              />
            ) : (
              <input
                type="text"
                value={og[key]}
                onInput={update(key)}
                placeholder={placeholder}
                class="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
              />
            )}
          </div>
        ))}
        <button
          onClick={copyAll}
          class="w-full py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          {copied === 'all' ? '✓ Copied All Tags!' : 'Copy All Meta Tags'}
        </button>
      </div>

      {/* Right: Previews */}
      <div class="space-y-4">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Social Preview</h2>
        <div class="flex gap-2">
          {(['twitter', 'facebook', 'slack'] as const).map(p => (
            <button
              key={p}
              onClick={() => setActivePreview(p)}
              class={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors ${
                activePreview === p
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary text-text-muted hover:text-text border border-border'
              }`}
            >
              {p === 'twitter' ? 'X / Twitter' : p === 'facebook' ? 'Facebook' : 'Slack'}
            </button>
          ))}
        </div>
        <div class="bg-bg-secondary rounded-xl p-4">
          {activePreview === 'twitter' && <TwitterCard og={og} />}
          {activePreview === 'facebook' && <FacebookCard og={og} />}
          {activePreview === 'slack' && <SlackCard og={og} />}
        </div>

        {/* Character counts */}
        <div class="text-xs text-text-muted space-y-1">
          <p>Title: <span class={og.title.length > 60 ? 'text-red-500' : 'text-green-500'}>{og.title.length}/60</span></p>
          <p>Description: <span class={og.description.length > 155 ? 'text-red-500' : 'text-green-500'}>{og.description.length}/155</span></p>
        </div>
      </div>
    </div>
  );
}
