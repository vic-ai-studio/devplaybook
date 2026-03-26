import { useState, useCallback } from 'preact/hooks';

type ColorStop = { shade: number; hex: string; hsl: string; rgb: string };

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
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
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hslToRgb(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
}

function generateScale(hex: string): ColorStop[] {
  const [h, s, l] = hexToHsl(hex);
  // Tailwind shades: 50 (lightest) → 950 (darkest)
  const shades = [
    { shade: 50,  lFactor: 0.95 },
    { shade: 100, lFactor: 0.88 },
    { shade: 200, lFactor: 0.78 },
    { shade: 300, lFactor: 0.65 },
    { shade: 400, lFactor: 0.52 },
    { shade: 500, lFactor: 0.42 },
    { shade: 600, lFactor: 0.33 },
    { shade: 700, lFactor: 0.26 },
    { shade: 800, lFactor: 0.18 },
    { shade: 900, lFactor: 0.12 },
    { shade: 950, lFactor: 0.07 },
  ];
  return shades.map(({ shade, lFactor }) => {
    const newL = Math.round(lFactor * 100);
    // Slightly desaturate extreme ends
    const newS = shade <= 100 || shade >= 900 ? Math.max(s - 10, 0) : s;
    const newHex = hslToHex(h, newS, newL);
    return {
      shade,
      hex: newHex,
      hsl: `hsl(${h}, ${newS}%, ${newL}%)`,
      rgb: hslToRgb(h, newS, newL),
    };
  });
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function textColor(hex: string): string {
  const lum = luminance(hex);
  return lum > 0.35 ? '#1e293b' : '#f8fafc';
}

export default function TailwindColorGenerator() {
  const [baseColor, setBaseColor] = useState('#3b82f6');
  const [colorName, setColorName] = useState('primary');
  const [copied, setCopied] = useState<string | null>(null);
  const [format, setFormat] = useState<'hex' | 'hsl' | 'rgb'>('hex');

  const scale = generateScale(baseColor);

  const copyText = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  const tailwindConfig = `// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        '${colorName || 'primary'}': {
${scale.map(s => `          ${s.shade}: '${s.hex}',`).join('\n')}
        },
      },
    },
  },
};`;

  const cssVars = `:root {
${scale.map(s => `  --color-${colorName || 'primary'}-${s.shade}: ${s.hex};`).join('\n')}
}`;

  const getValue = (stop: ColorStop) => {
    if (format === 'hex') return stop.hex;
    if (format === 'hsl') return stop.hsl;
    return stop.rgb;
  };

  return (
    <div class="space-y-6">
      {/* Controls */}
      <div class="bg-surface rounded-xl border border-border p-4 flex flex-wrap gap-4 items-end">
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-muted font-medium">Base Color</label>
          <div class="flex items-center gap-2">
            <input
              type="color"
              value={baseColor}
              onInput={(e) => setBaseColor((e.target as HTMLInputElement).value)}
              class="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <input
              type="text"
              value={baseColor}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                if (/^#[0-9a-fA-F]{6}$/.test(v)) setBaseColor(v);
              }}
              class="font-mono text-sm bg-bg border border-border rounded px-2 py-1 w-24 text-text"
              placeholder="#3b82f6"
            />
          </div>
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-muted font-medium">Color Name</label>
          <input
            type="text"
            value={colorName}
            onInput={(e) => setColorName((e.target as HTMLInputElement).value.replace(/[^a-z0-9-]/gi, ''))}
            class="text-sm bg-bg border border-border rounded px-2 py-1 w-28 text-text"
            placeholder="primary"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="text-xs text-text-muted font-medium">Value Format</label>
          <div class="flex rounded overflow-hidden border border-border">
            {(['hex', 'hsl', 'rgb'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                class={`px-3 py-1 text-xs font-mono transition-colors ${format === f ? 'bg-accent text-white' : 'bg-surface text-text-muted hover:bg-bg'}`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Swatches */}
      <div class="rounded-xl border border-border overflow-hidden">
        {scale.map((stop) => (
          <div
            key={stop.shade}
            class="flex items-center group cursor-pointer transition-opacity hover:opacity-90"
            style={{ backgroundColor: stop.hex }}
            onClick={() => copyText(getValue(stop), `swatch-${stop.shade}`)}
          >
            <div class="w-12 px-3 py-3 text-xs font-bold font-mono" style={{ color: textColor(stop.hex) }}>
              {stop.shade}
            </div>
            <div class="flex-1 py-3 text-xs font-mono" style={{ color: textColor(stop.hex) }}>
              {getValue(stop)}
            </div>
            <div class="px-3 py-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: textColor(stop.hex) }}>
              {copied === `swatch-${stop.shade}` ? '✓ Copied' : 'Copy'}
            </div>
          </div>
        ))}
      </div>

      {/* Output Tabs */}
      <div class="space-y-3">
        <div class="flex gap-2 flex-wrap">
          <button
            onClick={() => copyText(tailwindConfig, 'config')}
            class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            {copied === 'config' ? '✓ Copied!' : 'Copy tailwind.config.js'}
          </button>
          <button
            onClick={() => copyText(cssVars, 'css')}
            class="px-4 py-2 bg-surface border border-border text-text rounded-lg text-sm font-medium hover:bg-bg transition-colors"
          >
            {copied === 'css' ? '✓ Copied!' : 'Copy CSS Variables'}
          </button>
        </div>

        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <span class="text-xs text-text-muted font-mono">tailwind.config.js</span>
          </div>
          <pre class="p-4 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap">{tailwindConfig}</pre>
        </div>

        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <span class="text-xs text-text-muted font-mono">CSS Custom Properties</span>
          </div>
          <pre class="p-4 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap">{cssVars}</pre>
        </div>
      </div>
    </div>
  );
}
