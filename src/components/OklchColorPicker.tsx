import { useState, useCallback } from 'preact/hooks';

function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  // Convert OKLCH -> OKLAB
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);

  // OKLAB -> Linear sRGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;

  const lc = l_ * l_ * l_;
  const mc = m_ * m_ * m_;
  const sc = s_ * s_ * s_;

  let r = +4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc;
  let g = -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc;
  let bv = -0.0041960863 * lc - 0.7034186147 * mc + 1.7076147010 * sc;

  // Linear sRGB -> sRGB (gamma)
  const toSRGB = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };

  return [
    Math.round(toSRGB(r) * 255),
    Math.round(toSRGB(g) * 255),
    Math.round(toSRGB(bv) * 255),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function isInSrgbGamut(l: number, c: number, h: number): boolean {
  const [r, g, b] = oklchToRgb(l, c, h);
  return r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255;
}

const PRESETS = [
  { name: 'Indigo', l: 0.558, c: 0.228, h: 264 },
  { name: 'Emerald', l: 0.696, c: 0.196, h: 155 },
  { name: 'Rose', l: 0.641, c: 0.226, h: 13 },
  { name: 'Amber', l: 0.768, c: 0.188, h: 70 },
  { name: 'Sky', l: 0.694, c: 0.176, h: 223 },
  { name: 'Violet', l: 0.541, c: 0.255, h: 290 },
];

export default function OklchColorPicker() {
  const [l, setL] = useState(0.558);
  const [c, setC] = useState(0.228);
  const [h, setH] = useState(264);
  const [copied, setCopied] = useState('');

  const [r, g, b] = oklchToRgb(l, c, h);
  const hex = rgbToHex(r, g, b);
  const [hslH, hslS, hslL] = rgbToHsl(r, g, b);
  const inSrgb = isInSrgbGamut(l, c, h);

  const oklchCss = `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
  const hexVal = hex;
  const rgbVal = `rgb(${r}, ${g}, ${b})`;
  const hslVal = `hsl(${hslH}, ${hslS}%, ${hslL}%)`;
  const cssVar = `--color-primary: ${oklchCss};`;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const previewStyle = { background: inSrgb ? hex : `oklch(${l} ${c} ${h})` };

  // Generate shades
  const shades = [0.95, 0.85, 0.70, 0.55, 0.40, 0.28].map(lightness => {
    const [sr, sg, sb] = oklchToRgb(lightness, c * 0.85, h);
    const shadeHex = rgbToHex(sr, sg, sb);
    return { lightness, hex: shadeHex };
  });

  return (
    <div class="space-y-6">
      {/* Preview */}
      <div class="rounded-xl overflow-hidden border border-border">
        <div class="h-28 w-full transition-colors duration-200" style={previewStyle} />
        <div class="p-4 bg-surface flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="font-mono text-sm font-semibold">{oklchCss}</p>
            {!inSrgb && (
              <p class="text-xs text-amber-500 mt-1">⚠ Outside sRGB gamut — clipped for display</p>
            )}
            {inSrgb && (
              <p class="text-xs text-green-500 mt-1">✓ Within sRGB gamut</p>
            )}
          </div>
          <button
            onClick={() => copy(cssVar, 'cssvar')}
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            {copied === 'cssvar' ? '✓ Copied!' : 'Copy CSS Variable'}
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div class="bg-surface rounded-xl p-5 border border-border space-y-5">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Adjust Color</h2>

        <div>
          <div class="flex justify-between mb-1">
            <label class="text-sm font-medium">Lightness (L)</label>
            <span class="font-mono text-sm text-text-muted">{(l * 100).toFixed(1)}%</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.005" value={l}
            onInput={(e) => setL(parseFloat((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted mt-0.5">
            <span>0% (black)</span><span>100% (white)</span>
          </div>
        </div>

        <div>
          <div class="flex justify-between mb-1">
            <label class="text-sm font-medium">Chroma (C)</label>
            <span class="font-mono text-sm text-text-muted">{c.toFixed(3)}</span>
          </div>
          <input
            type="range" min="0" max="0.4" step="0.002" value={c}
            onInput={(e) => setC(parseFloat((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted mt-0.5">
            <span>0 (gray)</span><span>0.4 (vivid)</span>
          </div>
        </div>

        <div>
          <div class="flex justify-between mb-1">
            <label class="text-sm font-medium">Hue (H)</label>
            <span class="font-mono text-sm text-text-muted">{h.toFixed(1)}°</span>
          </div>
          <input
            type="range" min="0" max="360" step="1" value={h}
            onInput={(e) => setH(parseInt((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted mt-0.5">
            <span>0° (red)</span><span>180° (cyan)</span><span>360° (red)</span>
          </div>
        </div>
      </div>

      {/* Presets */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Presets</h2>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => {
            const [pr, pg, pb] = oklchToRgb(p.l, p.c, p.h);
            return (
              <button
                key={p.name}
                onClick={() => { setL(p.l); setC(p.c); setH(p.h); }}
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-accent transition-colors text-sm"
              >
                <span class="w-4 h-4 rounded-full" style={{ background: rgbToHex(pr, pg, pb) }} />
                {p.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Values */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Color Values</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'OKLCH', value: oklchCss, key: 'oklch' },
            { label: 'HEX', value: hexVal, key: 'hex' },
            { label: 'RGB', value: rgbVal, key: 'rgb' },
            { label: 'HSL', value: hslVal, key: 'hsl' },
          ].map(({ label, value, key }) => (
            <div key={key} class="flex items-center justify-between gap-2 bg-bg rounded-lg px-3 py-2 border border-border">
              <div>
                <p class="text-xs text-text-muted">{label}</p>
                <p class="font-mono text-sm">{value}</p>
              </div>
              <button
                onClick={() => copy(value, key)}
                class="shrink-0 text-xs px-2 py-1 rounded bg-surface border border-border hover:border-accent transition-colors"
              >
                {copied === key ? '✓' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Shade Scale */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Shade Scale</h2>
        <div class="flex gap-1 rounded-lg overflow-hidden h-12">
          {shades.map(({ lightness, hex: shadeHex }) => (
            <div
              key={lightness}
              class="flex-1 cursor-pointer transition-transform hover:scale-y-110"
              style={{ background: shadeHex }}
              title={shadeHex}
              onClick={() => copy(shadeHex, `shade-${lightness}`)}
            />
          ))}
        </div>
        <p class="text-xs text-text-muted mt-2">Click any swatch to copy its hex value</p>
      </div>

      {/* P3 Info */}
      <div class="bg-surface rounded-xl p-5 border border-border text-sm text-text-muted space-y-2">
        <p class="font-medium text-text">About OKLCH & P3</p>
        <p>OKLCH is a perceptually uniform color space — equal numeric changes produce equal perceived differences. It's ideal for generating accessible palettes and smooth gradients.</p>
        <p>Colors with high chroma may exceed the sRGB gamut. On P3-capable displays (most modern Macs and iPhones), the browser can render these vivid colors directly with <code class="bg-bg px-1 rounded">color(display-p3 ...)</code>.</p>
        <pre class="bg-bg rounded-lg p-3 text-xs font-mono overflow-x-auto mt-2">{`/* Modern CSS: use OKLCH directly */\n.button {\n  background: ${oklchCss};\n  /* Fallback for older browsers */\n  background: ${hexVal};\n}`}</pre>
      </div>
    </div>
  );
}
