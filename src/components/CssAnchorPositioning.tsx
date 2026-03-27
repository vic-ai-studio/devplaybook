import { useState } from 'preact/hooks';

type InsetArea =
  | 'top' | 'bottom' | 'left' | 'right'
  | 'top left' | 'top right' | 'bottom left' | 'bottom right'
  | 'center';

const INSET_AREAS: InsetArea[] = [
  'top left', 'top', 'top right',
  'left', 'center', 'right',
  'bottom left', 'bottom', 'bottom right',
];

interface Config {
  anchorName: string;
  insetArea: InsetArea;
  marginOffset: number;
  width: string;
  background: string;
  borderRadius: number;
}

function buildCSS(cfg: Config): string {
  const marginProp =
    cfg.insetArea === 'top' || cfg.insetArea === 'top left' || cfg.insetArea === 'top right'
      ? 'margin-bottom'
      : cfg.insetArea === 'bottom' || cfg.insetArea === 'bottom left' || cfg.insetArea === 'bottom right'
      ? 'margin-top'
      : cfg.insetArea === 'left'
      ? 'margin-right'
      : cfg.insetArea === 'right'
      ? 'margin-left'
      : 'margin';

  return `/* 1. Name the anchor element */
.anchor-element {
  anchor-name: --${cfg.anchorName};
}

/* 2. Position the popover relative to the anchor */
.popover {
  position: absolute;
  position-anchor: --${cfg.anchorName};
  inset-area: ${cfg.insetArea};
  width: ${cfg.width || 'max-content'};
  ${marginProp}: ${cfg.marginOffset}px;
  background: ${cfg.background};
  border-radius: ${cfg.borderRadius}px;
  padding: 8px 12px;

  /* Optional: keep in viewport */
  position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
}

/* Usage with <button popovertarget="my-popover"> */
/* and <div popover id="my-popover" class="popover"> ... </div> */`;
}

const POSITION_GRID = [
  ['top left', 'top', 'top right'],
  ['left', 'center', 'right'],
  ['bottom left', 'bottom', 'bottom right'],
];

export default function CssAnchorPositioning() {
  const [config, setConfig] = useState<Config>({
    anchorName: 'my-button',
    insetArea: 'top',
    marginOffset: 8,
    width: 'max-content',
    background: '#1e293b',
    borderRadius: 8,
  });
  const [copied, setCopied] = useState(false);
  const [showPopover, setShowPopover] = useState(true);

  const css = buildCSS(config);

  const copy = () => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Compute popover position for preview
  const getPreviewStyle = () => {
    const ia = config.insetArea;
    const offset = config.marginOffset;
    const base: Record<string, string | number> = {
      position: 'absolute',
      background: config.background,
      color: '#fff',
      padding: '6px 10px',
      borderRadius: config.borderRadius,
      fontSize: '13px',
      whiteSpace: 'nowrap',
      zIndex: 10,
      pointerEvents: 'none',
    };

    const center: Record<string, string | number> = { left: '50%', transform: 'translateX(-50%)' };
    const vcenter: Record<string, string | number> = { top: '50%', transform: 'translateY(-50%)' };

    switch (ia) {
      case 'top': return { ...base, bottom: `calc(100% + ${offset}px)`, ...center };
      case 'bottom': return { ...base, top: `calc(100% + ${offset}px)`, ...center };
      case 'left': return { ...base, right: `calc(100% + ${offset}px)`, ...vcenter };
      case 'right': return { ...base, left: `calc(100% + ${offset}px)`, ...vcenter };
      case 'top left': return { ...base, bottom: `calc(100% + ${offset}px)`, right: `calc(100% + ${offset}px)` };
      case 'top right': return { ...base, bottom: `calc(100% + ${offset}px)`, left: `calc(100% + ${offset}px)` };
      case 'bottom left': return { ...base, top: `calc(100% + ${offset}px)`, right: `calc(100% + ${offset}px)` };
      case 'bottom right': return { ...base, top: `calc(100% + ${offset}px)`, left: `calc(100% + ${offset}px)` };
      default: return { ...base, ...center, top: '50%', transform: 'translate(-50%,-50%)' };
    }
  };

  return (
    <div class="space-y-6">
      {/* Live Preview */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Live Preview</h2>
          <button
            onClick={() => setShowPopover(v => !v)}
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            {showPopover ? 'Hide Popover' : 'Show Popover'}
          </button>
        </div>
        <div class="h-48 bg-bg rounded-lg border border-border flex items-center justify-center relative overflow-visible">
          {/* Anchor */}
          <div class="relative">
            <button
              class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium"
              style={{ zIndex: 1 }}
            >
              Anchor Element
            </button>
            {showPopover && (
              <div style={getPreviewStyle()}>
                Popover ({config.insetArea})
              </div>
            )}
          </div>
        </div>
        <p class="text-xs text-text-muted mt-2">
          This preview simulates the anchor position. The real CSS Anchor Positioning API works with <code>anchor-name</code>, <code>position-anchor</code>, and <code>inset-area</code>.
        </p>
      </div>

      {/* Settings */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-surface rounded-xl p-5 border border-border space-y-4">
          <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Settings</h2>

          <div>
            <label class="text-sm font-medium block mb-1">anchor-name</label>
            <div class="flex items-center gap-2">
              <span class="text-text-muted text-sm font-mono">--</span>
              <input
                type="text"
                value={config.anchorName}
                onInput={(e) => setConfig(c => ({ ...c, anchorName: (e.target as HTMLInputElement).value || 'my-button' }))}
                class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <div class="flex justify-between mb-1">
              <label class="text-sm font-medium">Margin Offset</label>
              <span class="font-mono text-sm text-text-muted">{config.marginOffset}px</span>
            </div>
            <input
              type="range" min="0" max="32" step="1" value={config.marginOffset}
              onInput={(e) => setConfig(c => ({ ...c, marginOffset: parseInt((e.target as HTMLInputElement).value) }))}
              class="w-full accent-accent"
            />
          </div>

          <div>
            <label class="text-sm font-medium block mb-1">Popover Width</label>
            <input
              type="text"
              value={config.width}
              onInput={(e) => setConfig(c => ({ ...c, width: (e.target as HTMLInputElement).value }))}
              placeholder="max-content"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          <div class="flex gap-3">
            <div class="flex-1">
              <label class="text-sm font-medium block mb-1">Background</label>
              <div class="flex items-center gap-2">
                <input
                  type="color"
                  value={config.background}
                  onInput={(e) => setConfig(c => ({ ...c, background: (e.target as HTMLInputElement).value }))}
                  class="w-10 h-9 rounded border border-border bg-bg cursor-pointer"
                />
                <input
                  type="text"
                  value={config.background}
                  onInput={(e) => setConfig(c => ({ ...c, background: (e.target as HTMLInputElement).value }))}
                  class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Radius</label>
              <input
                type="number" min="0" max="24" value={config.borderRadius}
                onInput={(e) => setConfig(c => ({ ...c, borderRadius: parseInt((e.target as HTMLInputElement).value) || 0 }))}
                class="w-20 bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* inset-area picker */}
        <div class="bg-surface rounded-xl p-5 border border-border">
          <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">inset-area</h2>
          <div class="flex flex-col items-center gap-1 mb-4">
            {POSITION_GRID.map((row, ri) => (
              <div key={ri} class="flex gap-1">
                {row.map(pos => (
                  <button
                    key={pos}
                    onClick={() => setConfig(c => ({ ...c, insetArea: pos as InsetArea }))}
                    class={`w-20 py-2 rounded-lg text-xs border transition-all ${config.insetArea === pos ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent/50'}`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <p class="text-xs text-text-muted">
            <code>inset-area</code> replaces complex <code>top/left/inset</code> calculations with semantic placement values.
          </p>
        </div>
      </div>

      {/* Code Output */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <span class="text-sm font-semibold">Generated CSS</span>
          <button
            onClick={copy}
            class="px-3 py-1.5 rounded-lg border border-border hover:border-accent text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="p-4 text-sm font-mono overflow-x-auto text-text-muted leading-relaxed">
          <code>{css}</code>
        </pre>
      </div>

      {/* Browser Support */}
      <div class="bg-surface rounded-xl p-5 border border-border text-sm text-text-muted">
        <p class="font-medium text-text mb-2">Browser Support (2026)</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            { name: 'Chrome', since: '125+', ok: true },
            { name: 'Edge', since: '125+', ok: true },
            { name: 'Safari', since: '18.4+', ok: true },
            { name: 'Firefox', since: 'Planned', ok: false },
          ].map(({ name, since, ok }) => (
            <div key={name} class="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 border border-border">
              <span class={ok ? 'text-green-500' : 'text-amber-500'}>{ok ? '✓' : '~'}</span>
              <div>
                <p class="font-medium text-text">{name}</p>
                <p class="text-xs">{since}</p>
              </div>
            </div>
          ))}
        </div>
        <p>Use <code class="bg-bg px-1 rounded">@supports (anchor-name: --x) {'{ /* anchor CSS */ }'}</code> for progressive enhancement.</p>
      </div>
    </div>
  );
}
