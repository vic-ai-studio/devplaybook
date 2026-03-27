import { useState } from 'preact/hooks';

function gcd(a: number, b: number): number {
  a = Math.round(a);
  b = Math.round(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

const COMMON_RATIOS: Record<string, string> = {
  '16:9': 'Widescreen HD',
  '4:3': 'Standard / Legacy TV',
  '1:1': 'Square',
  '3:2': 'DSLR / 35mm Film',
  '2:1': 'Univisium / Panoramic',
  '21:9': 'Ultrawide Cinema',
  '9:16': 'Portrait / Mobile',
  '3:4': 'Portrait Standard',
  '5:4': 'Large Format',
  '16:10': 'Widescreen Monitor',
  '2:3': 'Portrait Film',
  '1:2': 'Tall Portrait',
};

const SRCSET_WIDTHS = [480, 640, 768, 1024, 1280, 1920];

type Mode = 'dimensions' | 'ratio' | 'srcset';
type LockMode = 'width' | 'height';

export default function ImageAspectRatio() {
  const [mode, setMode] = useState<Mode>('dimensions');

  // Mode A state
  const [dimW, setDimW] = useState('1920');
  const [dimH, setDimH] = useState('1080');

  // Mode B state
  const [ratioInput, setRatioInput] = useState('16:9');
  const [lockMode, setLockMode] = useState<LockMode>('width');
  const [lockValue, setLockValue] = useState('1280');

  // Srcset state
  const [srcW, setSrcW] = useState('1920');
  const [srcH, setSrcH] = useState('1080');
  const [copiedSrcset, setCopiedSrcset] = useState(false);

  // Copy state per result
  const [copiedRatio, setCopiedRatio] = useState(false);

  // ─── Mode A calculations ───────────────────────────────────────────────────
  const calcDimensions = () => {
    const w = parseFloat(dimW);
    const h = parseFloat(dimH);
    if (!w || !h || w <= 0 || h <= 0) return null;
    const d = gcd(Math.round(w), Math.round(h));
    const rw = Math.round(w) / d;
    const rh = Math.round(h) / d;
    const ratioStr = `${rw}:${rh}`;
    const decimal = (w / h).toFixed(3);
    const pctHeight = ((h / w) * 100).toFixed(2);
    const name = COMMON_RATIOS[ratioStr] || null;
    return { ratioStr, decimal, pctHeight, name, rw, rh };
  };

  // ─── Mode B calculations ───────────────────────────────────────────────────
  const calcFromRatio = () => {
    const match = ratioInput.trim().match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/);
    if (!match) return null;
    const rw = parseFloat(match[1]);
    const rh = parseFloat(match[2]);
    if (!rw || !rh) return null;
    const val = parseFloat(lockValue);
    if (!val || val <= 0) return null;
    if (lockMode === 'width') {
      const h = Math.round((val * rh) / rw);
      return { computed: h, label: 'Height', unit: 'px' };
    } else {
      const w = Math.round((val * rw) / rh);
      return { computed: w, label: 'Width', unit: 'px' };
    }
  };

  // ─── Srcset calculations ───────────────────────────────────────────────────
  const calcSrcset = () => {
    const w = parseFloat(srcW);
    const h = parseFloat(srcH);
    if (!w || !h || w <= 0 || h <= 0) return null;
    const ratio = h / w;
    return SRCSET_WIDTHS.map((sw) => ({
      w: sw,
      h: Math.round(sw * ratio),
    }));
  };

  const buildSrcsetHtml = () => {
    const rows = calcSrcset();
    if (!rows) return '';
    const sizes = rows.map((r) => `image-${r.w}w.jpg ${r.w}w`).join(',\n     ');
    return `<img\n  src="image-1920w.jpg"\n  srcset="${sizes}"\n  sizes="(max-width: 480px) 480px,\n         (max-width: 768px) 768px,\n         (max-width: 1280px) 1280px,\n         1920px"\n  width="${rows[rows.length - 1].w}"\n  height="${rows[rows.length - 1].h}"\n  alt=""\n  loading="lazy"\n>`;
  };

  const dimResult = calcDimensions();
  const ratioResult = calcFromRatio();
  const srcsetRows = calcSrcset();
  const srcsetHtml = buildSrcsetHtml();

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  const tabClass = (t: Mode) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      mode === t
        ? 'bg-primary text-white'
        : 'text-text-muted hover:text-text hover:bg-surface'
    }`;

  return (
    <div class="space-y-6">
      {/* Tab bar */}
      <div class="flex gap-2 p-1 bg-surface rounded-lg w-fit">
        <button class={tabClass('dimensions')} onClick={() => setMode('dimensions')}>
          Dimensions → Ratio
        </button>
        <button class={tabClass('ratio')} onClick={() => setMode('ratio')}>
          Ratio → Dimension
        </button>
        <button class={tabClass('srcset')} onClick={() => setMode('srcset')}>
          srcset Helper
        </button>
      </div>

      {/* ── Mode A ── */}
      {mode === 'dimensions' && (
        <div class="space-y-4">
          <div class="bg-bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 class="font-semibold text-text">Enter Image Dimensions</h2>
            <div class="flex flex-wrap gap-4 items-end">
              <div>
                <label class="block text-sm font-medium text-text-muted mb-1">Width (px)</label>
                <input
                  type="number"
                  min="1"
                  value={dimW}
                  onInput={(e) => setDimW((e.target as HTMLInputElement).value)}
                  class="w-32 px-3 py-2 bg-surface border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1920"
                />
              </div>
              <div class="text-text-muted font-bold text-xl mb-2">×</div>
              <div>
                <label class="block text-sm font-medium text-text-muted mb-1">Height (px)</label>
                <input
                  type="number"
                  min="1"
                  value={dimH}
                  onInput={(e) => setDimH((e.target as HTMLInputElement).value)}
                  class="w-32 px-3 py-2 bg-surface border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1080"
                />
              </div>
            </div>
          </div>

          {dimResult ? (
            <div class="bg-bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 class="font-semibold text-text">Result</h2>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div class="bg-surface rounded-md p-4 text-center">
                  <div class="text-2xl font-mono font-bold text-text">{dimResult.ratioStr}</div>
                  <div class="text-xs text-text-muted mt-1">Aspect Ratio</div>
                </div>
                <div class="bg-surface rounded-md p-4 text-center">
                  <div class="text-2xl font-mono font-bold text-text">{dimResult.decimal}</div>
                  <div class="text-xs text-text-muted mt-1">Decimal</div>
                </div>
                <div class="bg-surface rounded-md p-4 text-center">
                  <div class="text-2xl font-mono font-bold text-text">{dimResult.pctHeight}%</div>
                  <div class="text-xs text-text-muted mt-1">Height %</div>
                </div>
                <div class="bg-surface rounded-md p-4 text-center">
                  <div class="text-sm font-mono font-bold text-text leading-snug">
                    {dimResult.name || '—'}
                  </div>
                  <div class="text-xs text-text-muted mt-1">Common Name</div>
                </div>
              </div>

              {dimResult.name && (
                <div class="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-md">
                  <span class="text-green-500 mt-0.5">✓</span>
                  <p class="text-sm text-text">
                    <span class="font-semibold">{dimResult.ratioStr}</span> — {dimResult.name}
                  </p>
                </div>
              )}

              <div class="bg-surface rounded-md p-4">
                <div class="text-xs text-text-muted mb-2 font-medium">CSS aspect-ratio</div>
                <code class="font-mono text-sm text-text">aspect-ratio: {dimResult.rw} / {dimResult.rh};</code>
                <div class="text-xs text-text-muted mt-2">
                  Legacy padding-top trick: <code class="font-mono">padding-top: {dimResult.pctHeight}%</code>
                </div>
              </div>

              <button
                onClick={() => copy(dimResult.ratioStr, setCopiedRatio)}
                class="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm rounded-md font-medium transition-colors"
              >
                {copiedRatio ? 'Copied!' : `Copy ${dimResult.ratioStr}`}
              </button>
            </div>
          ) : (
            <div class="bg-bg-card border border-border rounded-lg p-5 text-center text-text-muted text-sm">
              Enter valid width and height values above.
            </div>
          )}

          {/* Common ratios reference */}
          <div class="bg-bg-card border border-border rounded-lg p-5">
            <h3 class="font-semibold text-text mb-3">Common Aspect Ratios</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(COMMON_RATIOS).map(([ratio, name]) => {
                const [rw, rh] = ratio.split(':').map(Number);
                return (
                  <button
                    key={ratio}
                    onClick={() => {
                      setDimW(String(rw * 120));
                      setDimH(String(rh * 120));
                    }}
                    class="flex items-center justify-between p-2 bg-surface hover:bg-surface/80 border border-border rounded-md text-sm transition-colors text-left"
                  >
                    <span class="font-mono font-bold text-text">{ratio}</span>
                    <span class="text-text-muted text-xs">{name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Mode B ── */}
      {mode === 'ratio' && (
        <div class="space-y-4">
          <div class="bg-bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 class="font-semibold text-text">Enter Ratio + Known Dimension</h2>

            <div>
              <label class="block text-sm font-medium text-text-muted mb-1">
                Aspect Ratio (e.g. 16:9)
              </label>
              <input
                type="text"
                value={ratioInput}
                onInput={(e) => setRatioInput((e.target as HTMLInputElement).value)}
                class="w-40 px-3 py-2 bg-surface border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="16:9"
              />
              <div class="flex flex-wrap gap-2 mt-2">
                {['16:9', '4:3', '1:1', '3:2', '21:9', '9:16'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRatioInput(r)}
                    class={`px-2 py-1 text-xs rounded border transition-colors ${
                      ratioInput === r
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-text-muted hover:text-text hover:border-text-muted bg-surface'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div class="flex flex-wrap items-end gap-3">
              <div>
                <label class="block text-sm font-medium text-text-muted mb-1">
                  Known {lockMode === 'width' ? 'Width' : 'Height'} (px)
                </label>
                <input
                  type="number"
                  min="1"
                  value={lockValue}
                  onInput={(e) => setLockValue((e.target as HTMLInputElement).value)}
                  class="w-32 px-3 py-2 bg-surface border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1280"
                />
              </div>
              <button
                onClick={() => setLockMode(lockMode === 'width' ? 'height' : 'width')}
                class="px-3 py-2 bg-surface border border-border rounded-md text-sm text-text-muted hover:text-text transition-colors"
                title="Swap locked dimension"
              >
                ⇄ Lock {lockMode === 'width' ? 'Height' : 'Width'} instead
              </button>
            </div>
          </div>

          {ratioResult ? (
            <div class="bg-bg-card border border-border rounded-lg p-5 space-y-3">
              <h2 class="font-semibold text-text">Calculated {ratioResult.label}</h2>
              <div class="flex items-center gap-3">
                <div class="text-5xl font-mono font-bold text-text">
                  {ratioResult.computed}
                </div>
                <div class="text-text-muted">{ratioResult.unit}</div>
              </div>
              <div class="text-sm text-text-muted">
                {lockMode === 'width'
                  ? `${lockValue}px wide → ${ratioResult.computed}px tall`
                  : `${ratioResult.computed}px wide → ${lockValue}px tall`}{' '}
                at {ratioInput}
              </div>
              <div class="bg-surface rounded-md p-3 font-mono text-sm text-text">
                {lockMode === 'width'
                  ? `width: ${lockValue}px; height: ${ratioResult.computed}px;`
                  : `width: ${ratioResult.computed}px; height: ${lockValue}px;`}
              </div>
            </div>
          ) : (
            <div class="bg-bg-card border border-border rounded-lg p-5 text-center text-text-muted text-sm">
              Enter a valid ratio (e.g. 16:9) and a dimension value above.
            </div>
          )}
        </div>
      )}

      {/* ── Mode C: srcset ── */}
      {mode === 'srcset' && (
        <div class="space-y-4">
          <div class="bg-bg-card border border-border rounded-lg p-5 space-y-4">
            <h2 class="font-semibold text-text">Original Image Dimensions</h2>
            <div class="flex flex-wrap gap-4 items-end">
              <div>
                <label class="block text-sm font-medium text-text-muted mb-1">Width (px)</label>
                <input
                  type="number"
                  min="1"
                  value={srcW}
                  onInput={(e) => setSrcW((e.target as HTMLInputElement).value)}
                  class="w-32 px-3 py-2 bg-surface border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1920"
                />
              </div>
              <div class="text-text-muted font-bold text-xl mb-2">×</div>
              <div>
                <label class="block text-sm font-medium text-text-muted mb-1">Height (px)</label>
                <input
                  type="number"
                  min="1"
                  value={srcH}
                  onInput={(e) => setSrcH((e.target as HTMLInputElement).value)}
                  class="w-32 px-3 py-2 bg-surface border border-border rounded-md text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="1080"
                />
              </div>
            </div>
          </div>

          {srcsetRows ? (
            <div class="bg-bg-card border border-border rounded-lg p-5 space-y-4">
              <h2 class="font-semibold text-text">Responsive Sizes</h2>
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-text-muted border-b border-border">
                      <th class="text-left pb-2 font-medium">Breakpoint</th>
                      <th class="text-right pb-2 font-medium">Width</th>
                      <th class="text-right pb-2 font-medium">Height</th>
                      <th class="text-right pb-2 font-medium">Descriptor</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-border">
                    {srcsetRows.map((row) => (
                      <tr key={row.w} class="text-text">
                        <td class="py-2 text-text-muted">
                          {row.w <= 480
                            ? 'Mobile S'
                            : row.w <= 640
                            ? 'Mobile'
                            : row.w <= 768
                            ? 'Tablet portrait'
                            : row.w <= 1024
                            ? 'Tablet landscape'
                            : row.w <= 1280
                            ? 'Laptop'
                            : 'Desktop HD'}
                        </td>
                        <td class="py-2 text-right font-mono">{row.w}px</td>
                        <td class="py-2 text-right font-mono">{row.h}px</td>
                        <td class="py-2 text-right font-mono text-text-muted">{row.w}w</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium text-text-muted">HTML srcset snippet</span>
                  <button
                    onClick={() => copy(srcsetHtml, setCopiedSrcset)}
                    class="px-3 py-1 bg-primary hover:bg-primary-dark text-white text-xs rounded-md font-medium transition-colors"
                  >
                    {copiedSrcset ? 'Copied!' : 'Copy HTML'}
                  </button>
                </div>
                <pre class="bg-surface border border-border rounded-md p-4 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap break-all">
                  {srcsetHtml}
                </pre>
              </div>
            </div>
          ) : (
            <div class="bg-bg-card border border-border rounded-lg p-5 text-center text-text-muted text-sm">
              Enter valid width and height values above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
