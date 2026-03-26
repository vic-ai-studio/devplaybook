import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

const SIZES = [16, 32, 48, 64, 128, 180, 192, 512];
const PREVIEW_SIZES = [16, 32, 48, 180];

type Shape = 'square' | 'rounded' | 'circle';
type TextAlign = 'center' | 'top-left' | 'bottom-right';

interface FaviconConfig {
  bgColor: string;
  textColor: string;
  text: string;
  fontSize: number;
  fontFamily: string;
  shape: Shape;
  borderRadius: number;
}

const DEFAULT_CONFIG: FaviconConfig = {
  bgColor: '#3B82F6',
  textColor: '#ffffff',
  text: 'F',
  fontSize: 60,
  fontFamily: 'Arial, sans-serif',
  shape: 'rounded',
  borderRadius: 20,
};

function renderFavicon(canvas: HTMLCanvasElement, config: FaviconConfig, size: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  canvas.width = size;
  canvas.height = size;

  ctx.clearRect(0, 0, size, size);

  // Background shape
  ctx.fillStyle = config.bgColor;
  if (config.shape === 'circle') {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (config.shape === 'rounded') {
    const r = (config.borderRadius / 100) * (size / 2);
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, size, size);
  }

  // Text
  if (config.text) {
    const fontSize = Math.round((config.fontSize / 100) * size);
    ctx.fillStyle = config.textColor;
    ctx.font = `bold ${fontSize}px ${config.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(config.text.slice(0, 2), size / 2, size / 2 + fontSize * 0.05);
  }
}

function canvasToDataUrl(config: FaviconConfig, size: number): string {
  const canvas = document.createElement('canvas');
  renderFavicon(canvas, config, size);
  return canvas.toDataURL('image/png');
}

const HTML_TAGS = (includeApple = true) => `<!-- Standard favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
${includeApple ? '<!-- Apple Touch Icon -->\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">' : ''}
<!-- PWA manifest icon -->
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">`;

export default function FaviconGenerator() {
  const [config, setConfig] = useState<FaviconConfig>(DEFAULT_CONFIG);
  const [copiedTags, setCopiedTags] = useState(false);
  const previewRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  const update = (partial: Partial<FaviconConfig>) =>
    setConfig(prev => ({ ...prev, ...partial }));

  // Render all preview canvases
  useEffect(() => {
    PREVIEW_SIZES.forEach(size => {
      const canvas = previewRefs.current[size];
      if (canvas) renderFavicon(canvas, config, size);
    });
  }, [config]);

  const downloadPng = useCallback((size: number) => {
    const dataUrl = canvasToDataUrl(config, size);
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `favicon-${size}.png`;
    a.click();
  }, [config]);

  const downloadAll = useCallback(() => {
    SIZES.forEach((size, i) => {
      setTimeout(() => downloadPng(size), i * 100);
    });
  }, [config]);

  const copyTags = useCallback(() => {
    navigator.clipboard.writeText(HTML_TAGS()).then(() => {
      setCopiedTags(true);
      setTimeout(() => setCopiedTags(false), 1500);
    });
  }, []);

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div class="space-y-4">
          {/* Text */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Icon Text (1–2 chars)</label>
            <input
              type="text"
              value={config.text}
              maxLength={2}
              onInput={(e) => update({ text: (e.target as HTMLInputElement).value })}
              placeholder="e.g. F, AB, 🚀"
              class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent font-mono"
            />
          </div>

          {/* Colors */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1">Background</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  value={config.bgColor}
                  onInput={(e) => update({ bgColor: (e.target as HTMLInputElement).value })}
                  class="w-10 h-9 rounded border border-border bg-surface cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={config.bgColor}
                  maxLength={7}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update({ bgColor: v });
                  }}
                  class="flex-1 px-2 py-1.5 bg-surface border border-border rounded text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1">Text Color</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  value={config.textColor}
                  onInput={(e) => update({ textColor: (e.target as HTMLInputElement).value })}
                  class="w-10 h-9 rounded border border-border bg-surface cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={config.textColor}
                  maxLength={7}
                  onInput={(e) => {
                    const v = (e.target as HTMLInputElement).value;
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) update({ textColor: v });
                  }}
                  class="flex-1 px-2 py-1.5 bg-surface border border-border rounded text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Shape */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">Shape</label>
            <div class="flex gap-2">
              {(['square', 'rounded', 'circle'] as Shape[]).map(s => (
                <button
                  key={s}
                  onClick={() => update({ shape: s })}
                  class={`px-3 py-1.5 rounded-lg border text-sm capitalize transition-colors ${
                    config.shape === s
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-text-muted hover:border-accent/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Border radius (only for rounded) */}
          {config.shape === 'rounded' && (
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1">
                Corner Radius: {config.borderRadius}%
              </label>
              <input
                type="range"
                min="5"
                max="45"
                value={config.borderRadius}
                onInput={(e) => update({ borderRadius: parseInt((e.target as HTMLInputElement).value) })}
                class="w-full accent-accent"
              />
            </div>
          )}

          {/* Font size */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">
              Font Size: {config.fontSize}%
            </label>
            <input
              type="range"
              min="20"
              max="90"
              value={config.fontSize}
              onInput={(e) => update({ fontSize: parseInt((e.target as HTMLInputElement).value) })}
              class="w-full accent-accent"
            />
          </div>

          {/* Quick presets */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">Quick Presets</label>
            <div class="flex flex-wrap gap-2">
              {[
                { bg: '#3B82F6', text: '#fff', label: 'Blue' },
                { bg: '#10B981', text: '#fff', label: 'Green' },
                { bg: '#F59E0B', text: '#fff', label: 'Amber' },
                { bg: '#EF4444', text: '#fff', label: 'Red' },
                { bg: '#8B5CF6', text: '#fff', label: 'Purple' },
                { bg: '#0F172A', text: '#38BDF8', label: 'Dark' },
                { bg: '#ffffff', text: '#0F172A', label: 'Light' },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => update({ bgColor: p.bg, textColor: p.text })}
                  class="flex items-center gap-1.5 px-2 py-1 rounded border border-border text-xs hover:border-accent/50 transition-colors"
                  style={`background: ${p.bg}; color: ${p.text};`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Previews */}
        <div class="space-y-4">
          <p class="text-sm font-medium text-text-muted">Preview</p>
          <div class="grid grid-cols-2 gap-4">
            {PREVIEW_SIZES.map(size => (
              <div key={size} class="flex flex-col items-center gap-2 p-3 bg-surface border border-border rounded-lg">
                <canvas
                  ref={el => { previewRefs.current[size] = el; }}
                  width={size}
                  height={size}
                  style={`width: ${Math.max(size, 64)}px; height: ${Math.max(size, 64)}px; image-rendering: pixelated;`}
                  class="rounded"
                />
                <span class="text-xs text-text-muted">{size}×{size}</span>
                <button
                  onClick={() => downloadPng(size)}
                  class="text-xs px-3 py-1 rounded bg-surface-hover hover:bg-accent/10 text-text-muted hover:text-accent border border-border transition-colors"
                >
                  Download PNG
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={downloadAll}
            class="w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            Download All Sizes (16, 32, 48, 64, 128, 180, 192, 512px)
          </button>
        </div>
      </div>

      {/* HTML meta tags */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-text-muted">HTML Meta Tags</p>
          <button
            onClick={copyTags}
            class="text-xs px-3 py-1 rounded bg-surface border border-border hover:border-accent/50 hover:text-accent text-text-muted transition-colors"
          >
            {copiedTags ? '✓ Copied!' : 'Copy Tags'}
          </button>
        </div>
        <pre class="p-3 bg-surface border border-border rounded-lg text-xs font-mono text-text-muted overflow-x-auto whitespace-pre-wrap">{HTML_TAGS()}</pre>
      </div>

      <p class="text-xs text-text-muted">All rendering is done 100% in your browser — no images are uploaded to any server.</p>
    </div>
  );
}
