import { useState, useEffect, useCallback } from 'preact/hooks';

// ── Color math helpers ───────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const int = parseInt(clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
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

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** WCAG relative luminance */
function relativeLuminance(r: number, g: number, b: number): number {
  return [r, g, b].reduce((acc, c, i) => {
    const cn = c / 255;
    const linear = cn <= 0.03928 ? cn / 12.92 : Math.pow((cn + 0.055) / 1.055, 2.4);
    return acc + linear * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker  = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const LUM_WHITE = 1;
const LUM_BLACK = 0;

function wcagBadge(ratio: number): { aa: boolean; aaa: boolean } {
  return { aa: ratio >= 4.5, aaa: ratio >= 7 };
}

// ── Shade generation ─────────────────────────────────────────────────────────

function generateShades(hex: string): { hex: string; label: string }[] {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const steps = [-30, -15, 0, 15, 30];
  return steps.map((delta, i) => {
    const newL = Math.min(95, Math.max(5, l + delta));
    const [nr, ng, nb] = hslToRgb(h, s, newL);
    const labels = ['Darkest', 'Dark', 'Base', 'Light', 'Lightest'];
    return { hex: rgbToHex(nr, ng, nb), label: labels[i] };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      class={`text-xs px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : (label ?? 'Copy')}
    </button>
  );
}

function WcagBadge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <span class={`text-xs font-bold px-2 py-0.5 rounded ${pass ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-300'}`}>
      {label} {pass ? 'Pass' : 'Fail'}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ColorPicker() {
  const [hex, setHex] = useState('#6366f1');
  const [hexInput, setHexInput] = useState('#6366f1');

  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(...rgb);
  const hexStr = hex.toUpperCase();
  const rgbStr = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const hslStr = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`;

  const lumColor = relativeLuminance(...rgb);
  const ratioWhite = contrastRatio(lumColor, LUM_WHITE);
  const ratioBlack = contrastRatio(lumColor, LUM_BLACK);
  const badgeWhite = wcagBadge(ratioWhite);
  const badgeBlack = wcagBadge(ratioBlack);

  const shades = generateShades(hex);

  // Keep hex input in sync when picker changes
  useEffect(() => {
    setHexInput(hex.toUpperCase());
  }, [hex]);

  const applyHexInput = useCallback(() => {
    const clean = hexInput.trim();
    const full = /^#?[0-9a-fA-F]{3}$/.test(clean)
      ? '#' + clean.replace('#', '').split('').map(c => c + c).join('')
      : /^#?[0-9a-fA-F]{6}$/.test(clean)
      ? clean.startsWith('#') ? clean : '#' + clean
      : null;
    if (full) setHex(full.toLowerCase());
  }, [hexInput]);

  return (
    <div class="space-y-6">
      {/* Picker row */}
      <div class="bg-bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row gap-6 items-start">
        {/* Native color input */}
        <div class="flex flex-col items-center gap-3">
          <div
            class="w-24 h-24 rounded-xl border-4 border-border shadow-lg transition-colors"
            style={{ background: hex }}
          />
          <input
            type="color"
            value={hex}
            onInput={e => setHex((e.target as HTMLInputElement).value)}
            class="w-24 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
            title="Pick a color"
          />
        </div>

        {/* Hex text input */}
        <div class="flex-1 space-y-3">
          <div>
            <label class="text-xs text-text-muted font-medium block mb-1">Enter Hex Value</label>
            <div class="flex gap-2">
              <input
                type="text"
                value={hexInput}
                onInput={e => setHexInput((e.target as HTMLInputElement).value)}
                onBlur={applyHexInput}
                onKeyDown={e => e.key === 'Enter' && applyHexInput()}
                placeholder="#6366f1"
                class="flex-1 bg-bg-card border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono uppercase"
                maxLength={7}
              />
              <button
                onClick={applyHexInput}
                class="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Color values */}
          <div class="space-y-2">
            {[
              { label: 'HEX', value: hexStr },
              { label: 'RGB', value: rgbStr },
              { label: 'HSL', value: hslStr },
            ].map(({ label, value }) => (
              <div key={label} class="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2">
                <span class="text-xs text-text-muted w-8 shrink-0 font-semibold">{label}</span>
                <code class="flex-1 text-sm font-mono text-green-300">{value}</code>
                <CopyButton value={value} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contrast checker */}
      <div class="bg-bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 class="font-semibold text-base">Contrast Checker (WCAG)</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* vs White */}
          <div class="rounded-xl border border-border overflow-hidden">
            <div class="p-4 flex items-center justify-center text-lg font-bold" style={{ background: hex, color: '#ffffff' }}>
              Text on White bg
            </div>
            <div class="bg-white p-4 flex items-center justify-center text-lg font-bold" style={{ color: hex }}>
              Text on White bg
            </div>
            <div class="bg-bg-card px-4 py-3 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-sm text-text-muted">vs White</span>
                <span class="font-mono text-sm font-bold">{ratioWhite.toFixed(2)}:1</span>
              </div>
              <div class="flex gap-2 flex-wrap">
                <WcagBadge pass={badgeWhite.aa} label="AA" />
                <WcagBadge pass={badgeWhite.aaa} label="AAA" />
              </div>
            </div>
          </div>

          {/* vs Black */}
          <div class="rounded-xl border border-border overflow-hidden">
            <div class="p-4 flex items-center justify-center text-lg font-bold" style={{ background: hex, color: '#000000' }}>
              Text on Black bg
            </div>
            <div class="bg-black p-4 flex items-center justify-center text-lg font-bold" style={{ color: hex }}>
              Text on Black bg
            </div>
            <div class="bg-bg-card px-4 py-3 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="text-sm text-text-muted">vs Black</span>
                <span class="font-mono text-sm font-bold">{ratioBlack.toFixed(2)}:1</span>
              </div>
              <div class="flex gap-2 flex-wrap">
                <WcagBadge pass={badgeBlack.aa} label="AA" />
                <WcagBadge pass={badgeBlack.aaa} label="AAA" />
              </div>
            </div>
          </div>
        </div>
        <p class="text-xs text-text-muted">WCAG AA requires ≥ 4.5:1 for normal text, AAA requires ≥ 7:1.</p>
      </div>

      {/* Shade palette */}
      <div class="bg-bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 class="font-semibold text-base">5-Shade Palette</h2>
        <div class="grid grid-cols-5 gap-2">
          {shades.map(({ hex: shadeHex, label }) => (
            <div key={label} class="flex flex-col items-center gap-2">
              <div
                class="w-full aspect-square rounded-lg border border-border cursor-pointer hover:scale-105 transition-transform"
                style={{ background: shadeHex }}
                onClick={() => setHex(shadeHex)}
                title={`Use ${shadeHex}`}
              />
              <span class="text-xs text-text-muted text-center leading-tight hidden sm:block">{label}</span>
              <code class="text-xs font-mono text-gray-400 text-center">{shadeHex.toUpperCase()}</code>
              <CopyButton value={shadeHex.toUpperCase()} label="Copy" />
            </div>
          ))}
        </div>
        <p class="text-xs text-text-muted">Click a shade to use it as the selected color.</p>
      </div>

      {/* Info */}
      <div class="bg-bg-card/50 rounded-lg border border-border p-4 text-sm text-text-muted space-y-1">
        <p class="font-medium text-white">Color Formats</p>
        <p><strong class="text-white">HEX</strong> — 6-digit hexadecimal, e.g. <code class="font-mono">#6366f1</code>. Used in CSS and design tools.</p>
        <p><strong class="text-white">RGB</strong> — Red, Green, Blue channels 0–255. Used in CSS and digital displays.</p>
        <p><strong class="text-white">HSL</strong> — Hue (0–360°), Saturation (0–100%), Lightness (0–100%). More intuitive for generating palettes.</p>
      </div>
    </div>
  );
}
