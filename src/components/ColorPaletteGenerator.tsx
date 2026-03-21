import { useState, useMemo } from 'preact/hooks';

// Convert hex to HSL
function hexToHsl(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
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
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!result) return '';
  return `rgb(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)})`;
}

function luminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return 0;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(parseInt(result[1], 16) / 255)
       + 0.7152 * toLinear(parseInt(result[2], 16) / 255)
       + 0.0722 * toLinear(parseInt(result[3], 16) / 255);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1), l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function isLight(hex: string): boolean {
  return luminance(hex) > 0.179;
}

type PaletteMode = 'shades' | 'complementary' | 'triadic' | 'analogous' | 'split-complementary' | 'tetradic';

interface Swatch {
  label: string;
  hex: string;
}

export default function ColorPaletteGenerator() {
  const [inputHex, setInputHex] = useState('#3b82f6');
  const [mode, setMode] = useState<PaletteMode>('shades');
  const [copied, setCopied] = useState<string | null>(null);

  const validHex = useMemo(() => {
    const h = inputHex.trim().startsWith('#') ? inputHex.trim() : '#' + inputHex.trim();
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h : null;
  }, [inputHex]);

  const hsl = useMemo(() => validHex ? hexToHsl(validHex) : null, [validHex]);

  const palette = useMemo((): Swatch[] => {
    if (!hsl || !validHex) return [];
    const [h, s] = hsl;
    switch (mode) {
      case 'shades':
        return [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(shade => ({
          label: String(shade),
          hex: hslToHex(h, Math.min(s, 90), shade === 50 ? 97 : shade === 950 ? 10 : 97 - (shade / 10)),
        }));
      case 'complementary':
        return [
          { label: 'Base', hex: validHex },
          { label: 'Light', hex: hslToHex(h, s, Math.min(hsl[2] + 20, 95)) },
          { label: 'Dark', hex: hslToHex(h, s, Math.max(hsl[2] - 20, 5)) },
          { label: 'Complement', hex: hslToHex((h + 180) % 360, s, hsl[2]) },
          { label: 'Comp Light', hex: hslToHex((h + 180) % 360, s, Math.min(hsl[2] + 20, 95)) },
          { label: 'Comp Dark', hex: hslToHex((h + 180) % 360, s, Math.max(hsl[2] - 20, 5)) },
        ];
      case 'triadic':
        return [
          { label: 'Base', hex: validHex },
          { label: 'Triadic 2', hex: hslToHex((h + 120) % 360, s, hsl[2]) },
          { label: 'Triadic 3', hex: hslToHex((h + 240) % 360, s, hsl[2]) },
          { label: 'Base Tint', hex: hslToHex(h, s, Math.min(hsl[2] + 25, 95)) },
          { label: 'Tri 2 Tint', hex: hslToHex((h + 120) % 360, s, Math.min(hsl[2] + 25, 95)) },
          { label: 'Tri 3 Tint', hex: hslToHex((h + 240) % 360, s, Math.min(hsl[2] + 25, 95)) },
        ];
      case 'analogous':
        return [
          { label: '-60°', hex: hslToHex((h - 60 + 360) % 360, s, hsl[2]) },
          { label: '-30°', hex: hslToHex((h - 30 + 360) % 360, s, hsl[2]) },
          { label: 'Base', hex: validHex },
          { label: '+30°', hex: hslToHex((h + 30) % 360, s, hsl[2]) },
          { label: '+60°', hex: hslToHex((h + 60) % 360, s, hsl[2]) },
        ];
      case 'split-complementary':
        return [
          { label: 'Base', hex: validHex },
          { label: 'Split 1', hex: hslToHex((h + 150) % 360, s, hsl[2]) },
          { label: 'Split 2', hex: hslToHex((h + 210) % 360, s, hsl[2]) },
          { label: 'Base Tint', hex: hslToHex(h, s, Math.min(hsl[2] + 25, 95)) },
          { label: 'Split 1 Tint', hex: hslToHex((h + 150) % 360, s, Math.min(hsl[2] + 25, 95)) },
          { label: 'Split 2 Tint', hex: hslToHex((h + 210) % 360, s, Math.min(hsl[2] + 25, 95)) },
        ];
      case 'tetradic':
        return [
          { label: 'Base', hex: validHex },
          { label: 'Tet 2 (90°)', hex: hslToHex((h + 90) % 360, s, hsl[2]) },
          { label: 'Tet 3 (180°)', hex: hslToHex((h + 180) % 360, s, hsl[2]) },
          { label: 'Tet 4 (270°)', hex: hslToHex((h + 270) % 360, s, hsl[2]) },
        ];
      default:
        return [];
    }
  }, [hsl, validHex, mode]);

  async function copyHex(hex: string) {
    await navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 1200);
  }

  async function copyAll() {
    const text = palette.map(s => `${s.label}: ${s.hex}`).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied('all');
    setTimeout(() => setCopied(null), 1500);
  }

  async function copyCss() {
    const vars = palette.map((s, i) => {
      const key = mode === 'shades' ? `--color-${s.label}` : `--color-${s.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      return `  ${key}: ${s.hex};`;
    }).join('\n');
    await navigator.clipboard.writeText(`:root {\n${vars}\n}`);
    setCopied('css');
    setTimeout(() => setCopied(null), 1500);
  }

  const MODES: { value: PaletteMode; label: string; desc: string }[] = [
    { value: 'shades', label: 'Shades', desc: '11-step tint/shade scale (Tailwind-style)' },
    { value: 'complementary', label: 'Complementary', desc: 'Base + opposite hue on color wheel' },
    { value: 'triadic', label: 'Triadic', desc: '3 colors evenly spaced 120° apart' },
    { value: 'analogous', label: 'Analogous', desc: '5 neighboring hues ±30°/±60°' },
    { value: 'split-complementary', label: 'Split-Comp', desc: 'Base + two colors adjacent to complement' },
    { value: 'tetradic', label: 'Tetradic', desc: '4 colors evenly spaced 90° apart' },
  ];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div class="flex items-center gap-3 flex-1">
            <input
              type="color"
              value={validHex ?? '#3b82f6'}
              onInput={(e) => setInputHex((e.target as HTMLInputElement).value)}
              class="w-12 h-12 rounded-lg cursor-pointer border border-border bg-bg-card"
              title="Pick a color"
            />
            <div class="flex-1">
              <label class="block text-xs text-text-muted mb-1">Hex Color</label>
              <input
                class="bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono w-full focus:ring-2 focus:ring-primary focus:border-transparent"
                value={inputHex}
                onInput={(e) => setInputHex((e.target as HTMLInputElement).value)}
                placeholder="#3b82f6"
                spellcheck={false}
              />
            </div>
            {hsl && (
              <div class="text-xs text-text-muted">
                <div>H: {hsl[0]}°</div>
                <div>S: {hsl[1]}%</div>
                <div>L: {hsl[2]}%</div>
              </div>
            )}
          </div>
          {validHex && (
            <div class="text-xs text-text-muted space-y-0.5">
              <div>RGB: {hexToRgb(validHex)}</div>
              <div>HSL: {hsl ? `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` : '-'}</div>
              <div>vs White: {contrastRatio(validHex, '#ffffff').toFixed(2)}:1</div>
              <div>vs Black: {contrastRatio(validHex, '#000000').toFixed(2)}:1</div>
            </div>
          )}
        </div>

        {!validHex && <p class="text-red-400 text-sm mt-2">Enter a valid 6-digit hex color (e.g. #3b82f6)</p>}
      </div>

      {/* Mode selector */}
      <div class="flex flex-wrap gap-2">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            title={m.desc}
            class={`text-sm px-4 py-2 rounded-full border transition-colors ${
              mode === m.value
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-card border-border hover:border-primary text-text-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Palette swatches */}
      {validHex && palette.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-base font-semibold">
              {MODES.find(m => m.value === mode)?.label} Palette
              <span class="text-xs text-text-muted font-normal ml-2">
                {MODES.find(m => m.value === mode)?.desc}
              </span>
            </h2>
            <div class="flex gap-2">
              <button onClick={copyCss}
                class="text-xs bg-bg border border-border hover:border-primary px-3 py-1.5 rounded-lg transition-colors">
                {copied === 'css' ? '✓ Copied!' : 'Copy CSS vars'}
              </button>
              <button onClick={copyAll}
                class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded-lg transition-colors">
                {copied === 'all' ? '✓ Copied!' : 'Copy All'}
              </button>
            </div>
          </div>

          <div class={`grid gap-3 ${mode === 'shades' ? 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {palette.map(swatch => {
              const light = isLight(swatch.hex);
              const textColor = light ? '#111' : '#fff';
              const ratio = contrastRatio(swatch.hex, light ? '#111111' : '#ffffff');
              return (
                <button
                  key={swatch.hex + swatch.label}
                  onClick={() => copyHex(swatch.hex)}
                  class="rounded-xl overflow-hidden border border-border hover:scale-105 transition-transform text-left"
                  title={`Click to copy ${swatch.hex}`}
                >
                  <div style={{ background: swatch.hex, minHeight: '80px', display: 'flex', alignItems: 'flex-end', padding: '8px' }}>
                    {copied === swatch.hex && (
                      <span class="text-xs font-bold" style={{ color: textColor }}>✓ Copied!</span>
                    )}
                  </div>
                  <div class="px-2 py-1.5 bg-bg-card">
                    <div class="text-xs font-semibold">{swatch.label}</div>
                    <div class="text-xs font-mono text-text-muted">{swatch.hex}</div>
                    <div class="text-xs text-text-muted">{ratio.toFixed(1)}:1</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CSS output */}
      {validHex && palette.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="text-base font-semibold mb-3">CSS Custom Properties</h2>
          <pre class="bg-bg text-green-400 text-sm rounded-lg p-4 overflow-x-auto font-mono whitespace-pre">{
`:root {\n${palette.map(s => {
  const key = mode === 'shades' ? `--color-${s.label}` : `--color-${s.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  return `  ${key}: ${s.hex};`;
}).join('\n')}\n}`
          }</pre>
        </div>
      )}

      {/* Quick examples */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-3">Try a Brand Color</h2>
        <div class="flex flex-wrap gap-2">
          {[
            { name: 'Tailwind Blue', hex: '#3b82f6' },
            { name: 'Emerald', hex: '#10b981' },
            { name: 'Rose', hex: '#f43f5e' },
            { name: 'Amber', hex: '#f59e0b' },
            { name: 'Violet', hex: '#8b5cf6' },
            { name: 'Cyan', hex: '#06b6d4' },
          ].map(b => (
            <button
              key={b.hex}
              onClick={() => setInputHex(b.hex)}
              class="flex items-center gap-2 text-sm bg-bg border border-border hover:border-primary px-3 py-1.5 rounded-full transition-colors"
            >
              <span class="w-3 h-3 rounded-full inline-block" style={{ background: b.hex }} />
              {b.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
