import { useState, useCallback } from 'preact/hooks';

// ── Color math helpers ──────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace('#', '').trim();
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;
  const int = parseInt(expanded, 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
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

function parseRgbInput(input: string): [number, number, number] | null {
  const cleaned = input.replace(/rgb\(|\)/gi, '').trim();
  const parts = cleaned.split(/[\s,]+/).map(Number);
  if (parts.length !== 3) return null;
  const [r, g, b] = parts;
  if ([r, g, b].some(v => isNaN(v) || v < 0 || v > 255)) return null;
  return [r, g, b];
}

function parseHslInput(input: string): [number, number, number] | null {
  const cleaned = input.replace(/hsl\(|\)|%/gi, '').trim();
  const parts = cleaned.split(/[\s,]+/).map(Number);
  if (parts.length !== 3) return null;
  const [h, s, l] = parts;
  if (isNaN(h) || h < 0 || h > 360) return null;
  if (isNaN(s) || s < 0 || s > 100) return null;
  if (isNaN(l) || l < 0 || l > 100) return null;
  return [h, s, l];
}

// ── CopyButton ──────────────────────────────────────────────────────────────

function CopyButton({ value }: { value: string }) {
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
      class={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ── Presets ─────────────────────────────────────────────────────────────────

const PRESETS = [
  { name: 'Indigo',   hex: '#6366F1' },
  { name: 'Rose',     hex: '#F43F5E' },
  { name: 'Emerald',  hex: '#10B981' },
  { name: 'Amber',    hex: '#F59E0B' },
  { name: 'Sky',      hex: '#0EA5E9' },
  { name: 'Violet',   hex: '#8B5CF6' },
  { name: 'White',    hex: '#FFFFFF' },
  { name: 'Black',    hex: '#000000' },
];

// ── Main component ──────────────────────────────────────────────────────────

type ActiveField = 'hex' | 'rgb' | 'hsl';

export default function ColorConverter() {
  const [hex, setHex] = useState('#6366F1');
  const [hexInput, setHexInput] = useState('#6366F1');
  const [rgbInput, setRgbInput] = useState('99, 102, 241');
  const [hslInput, setHslInput] = useState('239, 84%, 67%');
  const [hexError, setHexError] = useState(false);
  const [rgbError, setRgbError] = useState(false);
  const [hslError, setHslError] = useState(false);

  const applyFromHex = useCallback((raw: string) => {
    const rgb = hexToRgb(raw);
    if (!rgb) { setHexError(true); return; }
    setHexError(false);
    const [r, g, b] = rgb;
    const hsl = rgbToHsl(r, g, b);
    const full = '#' + raw.replace('#', '').padStart(6, '0').toUpperCase();
    setHex(raw.startsWith('#') ? raw : '#' + raw);
    setHexInput(full);
    setRgbInput(`${r}, ${g}, ${b}`);
    setHslInput(`${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%`);
  }, []);

  const applyFromRgb = useCallback((raw: string) => {
    const rgb = parseRgbInput(raw);
    if (!rgb) { setRgbError(true); return; }
    setRgbError(false);
    const [r, g, b] = rgb;
    const hsl = rgbToHsl(r, g, b);
    const hexVal = rgbToHex(r, g, b);
    setHex(hexVal.toLowerCase());
    setHexInput(hexVal);
    setRgbInput(`${r}, ${g}, ${b}`);
    setHslInput(`${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%`);
  }, []);

  const applyFromHsl = useCallback((raw: string) => {
    const hsl = parseHslInput(raw);
    if (!hsl) { setHslError(true); return; }
    setHslError(false);
    const [h, s, l] = hsl;
    const [r, g, b] = hslToRgb(h, s, l);
    const hexVal = rgbToHex(r, g, b);
    setHex(hexVal.toLowerCase());
    setHexInput(hexVal);
    setRgbInput(`${r}, ${g}, ${b}`);
    setHslInput(`${h}, ${s}%, ${l}%`);
  }, []);

  const applyPreset = (presetHex: string) => {
    applyFromHex(presetHex);
  };

  const rgb = hexToRgb(hex) ?? [99, 102, 241];
  const [r, g, b] = rgb;
  const hsl = rgbToHsl(r, g, b);

  return (
    <div class="space-y-6">
      {/* Color preview + picker */}
      <div class="bg-bg-card rounded-xl p-6 border border-border">
        <div class="flex flex-col sm:flex-row gap-6 items-start">
          <div class="flex flex-col items-center gap-3 shrink-0">
            <div
              class="w-28 h-28 rounded-xl border-4 border-border shadow-lg transition-colors"
              style={{ background: hex }}
            />
            <input
              type="color"
              value={hex}
              onInput={e => applyFromHex((e.target as HTMLInputElement).value)}
              class="w-28 h-10 rounded-lg cursor-pointer border border-border bg-transparent"
              title="Pick a color"
            />
          </div>

          <div class="flex-1 space-y-4 w-full">
            {/* HEX input */}
            <div>
              <label class="text-xs font-semibold text-text-muted block mb-1.5">HEX</label>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={hexInput}
                  onInput={e => { setHexInput((e.target as HTMLInputElement).value); setHexError(false); }}
                  onBlur={() => applyFromHex(hexInput)}
                  onKeyDown={e => e.key === 'Enter' && applyFromHex(hexInput)}
                  placeholder="#6366F1"
                  class={`flex-1 bg-gray-900 border rounded-lg p-3 text-sm font-mono focus:ring-2 focus:border-transparent outline-none uppercase ${hexError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                  maxLength={7}
                />
                <CopyButton value={hexInput} />
              </div>
              {hexError && <p class="text-xs text-red-400 mt-1">Invalid HEX — use #RRGGBB or #RGB</p>}
            </div>

            {/* RGB input */}
            <div>
              <label class="text-xs font-semibold text-text-muted block mb-1.5">RGB <span class="font-normal opacity-60">(R, G, B — 0–255 each)</span></label>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={rgbInput}
                  onInput={e => { setRgbInput((e.target as HTMLInputElement).value); setRgbError(false); }}
                  onBlur={() => applyFromRgb(rgbInput)}
                  onKeyDown={e => e.key === 'Enter' && applyFromRgb(rgbInput)}
                  placeholder="99, 102, 241"
                  class={`flex-1 bg-gray-900 border rounded-lg p-3 text-sm font-mono focus:ring-2 focus:border-transparent outline-none ${rgbError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                />
                <CopyButton value={`rgb(${r}, ${g}, ${b})`} />
              </div>
              {rgbError && <p class="text-xs text-red-400 mt-1">Invalid RGB — use "R, G, B" (e.g. 99, 102, 241)</p>}
            </div>

            {/* HSL input */}
            <div>
              <label class="text-xs font-semibold text-text-muted block mb-1.5">HSL <span class="font-normal opacity-60">(H 0–360, S 0–100%, L 0–100%)</span></label>
              <div class="flex gap-2">
                <input
                  type="text"
                  value={hslInput}
                  onInput={e => { setHslInput((e.target as HTMLInputElement).value); setHslError(false); }}
                  onBlur={() => applyFromHsl(hslInput)}
                  onKeyDown={e => e.key === 'Enter' && applyFromHsl(hslInput)}
                  placeholder="239, 84%, 67%"
                  class={`flex-1 bg-gray-900 border rounded-lg p-3 text-sm font-mono focus:ring-2 focus:border-transparent outline-none ${hslError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'}`}
                />
                <CopyButton value={`hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`} />
              </div>
              {hslError && <p class="text-xs text-red-400 mt-1">Invalid HSL — use "H, S%, L%" (e.g. 239, 84%, 67%)</p>}
            </div>
          </div>
        </div>
      </div>

      {/* All formats summary */}
      <div class="bg-bg-card rounded-xl p-6 border border-border space-y-3">
        <h2 class="font-semibold text-base">All Formats</h2>
        {[
          { label: 'HEX',      value: hexInput },
          { label: 'RGB',      value: `rgb(${r}, ${g}, ${b})` },
          { label: 'RGB %',    value: `rgb(${(r/255*100).toFixed(1)}%, ${(g/255*100).toFixed(1)}%, ${(b/255*100).toFixed(1)}%)` },
          { label: 'HSL',      value: `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)` },
          { label: 'CSS var',  value: `--color: ${hexInput};` },
        ].map(({ label, value }) => (
          <div key={label} class="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2.5">
            <span class="text-xs text-text-muted w-14 shrink-0 font-semibold">{label}</span>
            <code class="flex-1 text-sm font-mono text-green-300 truncate">{value}</code>
            <CopyButton value={value} />
          </div>
        ))}
      </div>

      {/* Presets */}
      <div class="bg-bg-card rounded-xl p-6 border border-border space-y-3">
        <h2 class="font-semibold text-base">Quick Presets</h2>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(({ name, hex: ph }) => (
            <button
              key={name}
              onClick={() => applyPreset(ph)}
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-primary transition-colors text-sm"
            >
              <span
                class="w-4 h-4 rounded-full border border-gray-600 shrink-0"
                style={{ background: ph }}
              />
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Format reference */}
      <div class="bg-bg-card/50 rounded-lg border border-border p-4 text-sm text-text-muted space-y-1.5">
        <p class="font-medium text-white">Format Reference</p>
        <p><strong class="text-white">HEX</strong> — 6-digit hex, e.g. <code class="font-mono">#6366F1</code>. Used in CSS and design tools. Shorthand 3-digit form also supported.</p>
        <p><strong class="text-white">RGB</strong> — Red, Green, Blue channels 0–255. Enter as <code class="font-mono">99, 102, 241</code> or <code class="font-mono">rgb(99, 102, 241)</code>.</p>
        <p><strong class="text-white">HSL</strong> — Hue (0–360°), Saturation, Lightness. More intuitive for generating palettes. Enter as <code class="font-mono">239, 84%, 67%</code> or <code class="font-mono">hsl(239, 84%, 67%)</code>.</p>
        <p class="pt-1 text-xs">Type in any field and press Enter (or click away) to convert. Use the color picker for visual selection.</p>
      </div>
    </div>
  );
}
