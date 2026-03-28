import { useState } from 'preact/hooks';

interface ColorInfo {
  hex: string;
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  name: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function approxColorName(h: number, s: number, l: number): string {
  if (l < 10) return 'Black';
  if (l > 90) return 'White';
  if (s < 15) return l < 50 ? 'Dark Gray' : 'Light Gray';
  if (h >= 0 && h < 15) return l < 40 ? 'Dark Red' : 'Red';
  if (h >= 15 && h < 40) return s > 60 ? 'Orange' : 'Brown';
  if (h >= 40 && h < 65) return l > 70 ? 'Light Yellow' : 'Yellow';
  if (h >= 65 && h < 160) return l < 40 ? 'Dark Green' : s < 40 ? 'Sage' : 'Green';
  if (h >= 160 && h < 200) return 'Cyan / Teal';
  if (h >= 200 && h < 260) return l < 35 ? 'Dark Blue' : 'Blue';
  if (h >= 260 && h < 290) return 'Purple / Violet';
  if (h >= 290 && h < 330) return 'Pink / Magenta';
  return 'Red';
}

function parseHexList(raw: string): string[] {
  return [...raw.matchAll(/#?[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g)]
    .map(m => {
      const v = m[0].startsWith('#') ? m[0] : '#' + m[0];
      return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v;
    });
}

function buildColorInfo(hex: string): ColorInfo | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return { hex: hex.toLowerCase(), ...rgb, ...hsl, name: approxColorName(hsl.h, hsl.s, hsl.l) };
}

function complementary(c: ColorInfo): ColorInfo {
  const h2 = (c.h + 180) % 360;
  const rgb = hslToRgb(h2, c.s, c.l);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  return buildColorInfo(hex)!;
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r = l, g = l, b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function generateShades(c: ColorInfo): ColorInfo[] {
  return [10, 20, 35, 50, 65, 75, 85, 92].map(l => {
    const rgb = hslToRgb(c.h, c.s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return buildColorInfo(hex)!;
  });
}

function generateCss(colors: ColorInfo[]): string {
  const vars = colors.map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.name} — hsl(${c.h}, ${c.s}%, ${c.l}%) */`).join('\n');
  return `:root {\n${vars}\n}`;
}

const SAMPLE_PALETTES = [
  { label: 'Twilight UI', value: '#1e1b4b, #312e81, #4f46e5, #818cf8, #c7d2fe' },
  { label: 'Forest', value: '#14532d, #166534, #16a34a, #4ade80, #bbf7d0' },
  { label: 'Sunset', value: '#7c2d12, #c2410c, #f97316, #fb923c, #fed7aa' },
  { label: 'Ocean', value: '#0c4a6e, #0369a1, #0ea5e9, #7dd3fc, #e0f2fe' },
];

export default function ColorPaletteExtractor() {
  const [input, setInput] = useState('#1e1b4b, #312e81, #4f46e5, #818cf8, #c7d2fe');
  const [activeTab, setActiveTab] = useState<'palette' | 'shades' | 'harmony'>('palette');
  const [copiedIdx, setCopiedIdx] = useState<string | null>(null);

  const hexList = parseHexList(input);
  const colors = hexList.map(buildColorInfo).filter(Boolean) as ColorInfo[];

  const copyHex = (hex: string, key: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(key);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const Swatch = ({ c, keyId }: { c: ColorInfo; keyId: string }) => (
    <div
      class="relative group cursor-pointer rounded-lg overflow-hidden border border-gray-700"
      onClick={() => copyHex(c.hex, keyId)}
      title={`Click to copy ${c.hex}`}
    >
      <div class="h-16 w-full" style={{ backgroundColor: c.hex }} />
      <div class="p-2 bg-gray-800">
        <p class="text-xs font-mono text-white">{c.hex}</p>
        <p class="text-xs text-gray-400">{c.name}</p>
        <p class="text-xs text-gray-500">hsl({c.h},{c.s}%,{c.l}%)</p>
      </div>
      {copiedIdx === keyId && (
        <div class="absolute inset-0 bg-green-900/80 flex items-center justify-center rounded-lg">
          <span class="text-green-300 font-bold text-sm">✓ Copied</span>
        </div>
      )}
    </div>
  );

  return (
    <div class="space-y-5">
      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-gray-300 mb-2">Enter hex codes (comma-separated, with or without #)</label>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={3}
          placeholder="#ff6b6b, #feca57, #48dbfb, #ff9ff3"
          class="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono resize-none focus:outline-none focus:border-accent"
        />
        <div class="flex gap-2 mt-2 flex-wrap">
          {SAMPLE_PALETTES.map(p => (
            <button key={p.label} onClick={() => setInput(p.value)}
              class="text-xs px-3 py-1 bg-gray-800 border border-gray-700 rounded hover:bg-gray-700 text-gray-300 transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {colors.length === 0 && (
        <p class="text-yellow-400 text-sm">No valid hex codes found. Try #rrggbb format.</p>
      )}

      {colors.length > 0 && (
        <>
          {/* Tabs */}
          <div class="flex gap-1 border-b border-gray-700">
            {(['palette', 'shades', 'harmony'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                class={`px-4 py-2 text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-gray-200'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'palette' && (
            <div class="space-y-4">
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {colors.map((c, i) => <Swatch key={i} c={c} keyId={`p${i}`} />)}
              </div>

              {/* Color strip */}
              <div class="rounded-lg overflow-hidden h-12 flex">
                {colors.map((c, i) => (
                  <div key={i} class="flex-1" style={{ backgroundColor: c.hex }} title={c.hex} />
                ))}
              </div>

              {/* CSS output */}
              <div>
                <div class="flex items-center justify-between mb-2">
                  <p class="text-xs text-gray-400">CSS Custom Properties</p>
                  <button onClick={() => { navigator.clipboard.writeText(generateCss(colors)); setCopiedIdx('css'); setTimeout(() => setCopiedIdx(null), 1500); }}
                    class={`text-xs px-3 py-1 rounded font-medium ${copiedIdx === 'css' ? 'bg-green-700 text-white' : 'bg-gray-700 text-gray-300'}`}>
                    {copiedIdx === 'css' ? '✓ Copied' : 'Copy CSS'}
                  </button>
                </div>
                <pre class="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-green-300 font-mono overflow-auto">
                  {generateCss(colors)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'shades' && (
            <div class="space-y-6">
              {colors.slice(0, 3).map((c, ci) => {
                const shades = generateShades(c);
                return (
                  <div key={ci}>
                    <p class="text-sm font-medium text-gray-300 mb-2">{c.hex} — {c.name} shades</p>
                    <div class="grid grid-cols-4 md:grid-cols-8 gap-2">
                      {shades.map((s, si) => <Swatch key={si} c={s} keyId={`sh${ci}-${si}`} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'harmony' && (
            <div class="space-y-4">
              {colors.slice(0, 2).map((c, ci) => {
                const comp = complementary(c);
                const triadic1 = buildColorInfo(rgbToHex(...Object.values(hslToRgb((c.h + 120) % 360, c.s, c.l)) as [number, number, number]))!;
                const triadic2 = buildColorInfo(rgbToHex(...Object.values(hslToRgb((c.h + 240) % 360, c.s, c.l)) as [number, number, number]))!;
                return (
                  <div key={ci} class="bg-gray-900 border border-gray-700 rounded-lg p-4">
                    <p class="text-sm font-semibold text-gray-300 mb-3">Base: {c.hex}</p>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <p class="text-xs text-gray-400 mb-2">Complementary (180°)</p>
                        <Swatch c={comp} keyId={`comp${ci}`} />
                      </div>
                      <div>
                        <p class="text-xs text-gray-400 mb-2">Triadic (+120° / +240°)</p>
                        <div class="grid grid-cols-2 gap-2">
                          <Swatch c={triadic1} keyId={`tri1-${ci}`} />
                          <Swatch c={triadic2} keyId={`tri2-${ci}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
