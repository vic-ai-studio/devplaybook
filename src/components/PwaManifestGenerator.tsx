import { useState, useCallback } from 'preact/hooks';

type DisplayMode = 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
type Orientation = 'any' | 'portrait' | 'landscape' | 'portrait-primary' | 'landscape-primary';
type IconSize = '72x72' | '96x96' | '128x128' | '144x144' | '152x152' | '192x192' | '384x384' | '512x512';

interface ManifestConfig {
  name: string;
  shortName: string;
  description: string;
  startUrl: string;
  display: DisplayMode;
  orientation: Orientation;
  themeColor: string;
  backgroundColor: string;
  iconSizes: IconSize[];
  iconPath: string;
  lang: string;
  scope: string;
}

const DEFAULT_CONFIG: ManifestConfig = {
  name: 'My App',
  shortName: 'MyApp',
  description: 'A progressive web application',
  startUrl: '/',
  display: 'standalone',
  orientation: 'any',
  themeColor: '#3b82f6',
  backgroundColor: '#ffffff',
  iconSizes: ['192x192', '512x512'],
  iconPath: '/icons/icon',
  lang: 'en',
  scope: '/',
};

const ALL_ICON_SIZES: IconSize[] = ['72x72', '96x96', '128x128', '144x144', '152x152', '192x192', '384x384', '512x512'];

function generateManifest(cfg: ManifestConfig) {
  const icons = cfg.iconSizes.map((size) => ({
    src: `${cfg.iconPath}-${size}.png`,
    sizes: size,
    type: 'image/png',
    purpose: size === '192x192' || size === '512x512' ? 'any maskable' : 'any',
  }));

  const manifest: Record<string, unknown> = {
    name: cfg.name,
    short_name: cfg.shortName,
    description: cfg.description,
    start_url: cfg.startUrl,
    scope: cfg.scope,
    display: cfg.display,
    orientation: cfg.orientation !== 'any' ? cfg.orientation : undefined,
    theme_color: cfg.themeColor,
    background_color: cfg.backgroundColor,
    lang: cfg.lang,
    icons,
  };

  // Remove undefined values
  Object.keys(manifest).forEach((k) => manifest[k] === undefined && delete manifest[k]);

  return JSON.stringify(manifest, null, 2);
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PwaManifestGenerator() {
  const [cfg, setCfg] = useState<ManifestConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);

  const update = useCallback(<K extends keyof ManifestConfig>(key: K, val: ManifestConfig[K]) => {
    setCfg((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleSize = useCallback((size: IconSize) => {
    setCfg((prev) => ({
      ...prev,
      iconSizes: prev.iconSizes.includes(size)
        ? prev.iconSizes.filter((s) => s !== size)
        : [...prev.iconSizes, size],
    }));
  }, []);

  const manifest = generateManifest(cfg);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(manifest).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const download = () => downloadFile(manifest, 'manifest.json', 'application/json');

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">App Name</label>
            <input
              type="text"
              value={cfg.name}
              onInput={(e) => update('name', (e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              placeholder="My Awesome App"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Short Name <span class="text-xs opacity-60">(≤12 chars)</span></label>
            <input
              type="text"
              value={cfg.shortName}
              onInput={(e) => update('shortName', (e.target as HTMLInputElement).value)}
              maxLength={12}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              placeholder="MyApp"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Description</label>
          <input
            type="text"
            value={cfg.description}
            onInput={(e) => update('description', (e.target as HTMLInputElement).value)}
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            placeholder="A progressive web application"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Start URL</label>
            <input
              type="text"
              value={cfg.startUrl}
              onInput={(e) => update('startUrl', (e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              placeholder="/"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Scope</label>
            <input
              type="text"
              value={cfg.scope}
              onInput={(e) => update('scope', (e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
              placeholder="/"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Display Mode</label>
            <select
              value={cfg.display}
              onChange={(e) => update('display', (e.target as HTMLSelectElement).value as DisplayMode)}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="standalone">standalone — app-like, no browser UI</option>
              <option value="fullscreen">fullscreen — no status bar</option>
              <option value="minimal-ui">minimal-ui — minimal browser UI</option>
              <option value="browser">browser — regular browser tab</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Orientation</label>
            <select
              value={cfg.orientation}
              onChange={(e) => update('orientation', (e.target as HTMLSelectElement).value as Orientation)}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="any">any</option>
              <option value="portrait">portrait</option>
              <option value="landscape">landscape</option>
              <option value="portrait-primary">portrait-primary</option>
              <option value="landscape-primary">landscape-primary</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Theme Color</label>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                value={cfg.themeColor}
                onInput={(e) => update('themeColor', (e.target as HTMLInputElement).value)}
                class="w-10 h-10 rounded cursor-pointer border border-border bg-surface"
              />
              <input
                type="text"
                value={cfg.themeColor}
                onInput={(e) => update('themeColor', (e.target as HTMLInputElement).value)}
                class="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
                placeholder="#3b82f6"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Background Color</label>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                value={cfg.backgroundColor}
                onInput={(e) => update('backgroundColor', (e.target as HTMLInputElement).value)}
                class="w-10 h-10 rounded cursor-pointer border border-border bg-surface"
              />
              <input
                type="text"
                value={cfg.backgroundColor}
                onInput={(e) => update('backgroundColor', (e.target as HTMLInputElement).value)}
                class="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
                placeholder="#ffffff"
              />
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Icon Base Path</label>
          <input
            type="text"
            value={cfg.iconPath}
            onInput={(e) => update('iconPath', (e.target as HTMLInputElement).value)}
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
            placeholder="/icons/icon"
          />
          <p class="text-xs text-text-muted mt-1">Icons will be named <code class="font-mono bg-surface-hover px-1 rounded">{cfg.iconPath}-192x192.png</code> etc.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Icon Sizes</label>
          <div class="flex flex-wrap gap-2">
            {ALL_ICON_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => toggleSize(size)}
                class={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-colors ${
                  cfg.iconSizes.includes(size)
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-surface border-border text-text-muted hover:border-primary/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Language</label>
          <input
            type="text"
            value={cfg.lang}
            onInput={(e) => update('lang', (e.target as HTMLInputElement).value)}
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            placeholder="en"
          />
        </div>
      </div>

      {/* Right: Preview */}
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-muted">manifest.json</span>
          <div class="flex gap-2">
            <button
              onClick={copyToClipboard}
              class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button
              onClick={download}
              class="px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              Download manifest.json
            </button>
          </div>
        </div>
        <pre class="flex-1 bg-surface rounded-xl border border-border p-4 text-xs font-mono text-text overflow-auto leading-relaxed whitespace-pre min-h-64">
          {manifest}
        </pre>

        {/* Link tag helper */}
        <div>
          <p class="text-xs text-text-muted mb-2">Add to your <code class="font-mono bg-surface-hover px-1 rounded">&lt;head&gt;</code>:</p>
          <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto">
{`<link rel="manifest" href="/manifest.json">\n<meta name="theme-color" content="${cfg.themeColor}">`}
          </pre>
        </div>
      </div>
    </div>
  );
}
