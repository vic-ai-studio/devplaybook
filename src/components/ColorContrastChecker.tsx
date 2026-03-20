import { useState, useCallback } from 'preact/hooks';

// Relative luminance calculation (WCAG 2.x)
function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6 && cleaned.length !== 3) return null;
  const full = cleaned.length === 3
    ? cleaned.split('').map(c => c + c).join('')
    : cleaned;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return [r, g, b];
}

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface WcagResult {
  ratio: number;
  aa_normal: boolean;
  aa_large: boolean;
  aaa_normal: boolean;
  aaa_large: boolean;
}

function checkWcag(fg: string, bg: string): WcagResult | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;

  const fgL = relativeLuminance(...fgRgb);
  const bgL = relativeLuminance(...bgRgb);
  const ratio = contrastRatio(fgL, bgL);

  return {
    ratio,
    aa_normal: ratio >= 4.5,
    aa_large: ratio >= 3.0,
    aaa_normal: ratio >= 7.0,
    aaa_large: ratio >= 4.5,
  };
}

// Suggest a darker/lighter alternative to pass AA normal
function suggestAlternative(fg: string, bg: string): { suggested: string; label: string } | null {
  const bgRgb = hexToRgb(bg);
  if (!bgRgb) return null;
  const bgL = relativeLuminance(...bgRgb);

  // Try darkening the foreground until ratio >= 4.5
  const fgRgb = hexToRgb(fg);
  if (!fgRgb) return null;

  // Simple approach: shift toward black or white until passing
  const targetRatio = 4.5;

  // Try darkening (multiply toward 0)
  for (let factor = 0.9; factor >= 0; factor -= 0.05) {
    const r = Math.round(fgRgb[0] * factor);
    const g = Math.round(fgRgb[1] * factor);
    const b = Math.round(fgRgb[2] * factor);
    const l = relativeLuminance(r, g, b);
    if (contrastRatio(l, bgL) >= targetRatio) {
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      return { suggested: hex, label: 'Darker foreground' };
    }
  }

  // Try lightening (blend toward white)
  for (let factor = 0.1; factor <= 1; factor += 0.05) {
    const r = Math.round(fgRgb[0] + (255 - fgRgb[0]) * factor);
    const g = Math.round(fgRgb[1] + (255 - fgRgb[1]) * factor);
    const b = Math.round(fgRgb[2] + (255 - fgRgb[2]) * factor);
    const l = relativeLuminance(r, g, b);
    if (contrastRatio(l, bgL) >= targetRatio) {
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
      return { suggested: hex, label: 'Lighter foreground' };
    }
  }

  return null;
}

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div class={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
      pass ? 'bg-green-900/40 border border-green-700 text-green-300' : 'bg-red-900/40 border border-red-700 text-red-300'
    }`}>
      <span>{pass ? '✓' : '✗'}</span>
      <span>{label}</span>
    </div>
  );
}

export default function ColorContrastChecker() {
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1a1a2e');
  const [copiedSuggestion, setCopiedSuggestion] = useState(false);

  const result = checkWcag(fg, bg);
  const suggestion = result && !result.aa_normal ? suggestAlternative(fg, bg) : null;

  const swapColors = useCallback(() => {
    setFg(bg);
    setBg(fg);
  }, [fg, bg]);

  const copySuggestion = useCallback((hex: string) => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopiedSuggestion(true);
      setTimeout(() => setCopiedSuggestion(false), 2000);
    });
  }, []);

  const isValidHex = (h: string) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(h);
  const fgValid = isValidHex(fg);
  const bgValid = isValidHex(bg);

  return (
    <div class="space-y-5">
      {/* Preview */}
      <div
        class="rounded-xl border border-gray-700 p-8 text-center transition-colors"
        style={{ backgroundColor: bgValid ? bg : '#1a1a2e', color: fgValid ? fg : '#ffffff' }}
      >
        <p class="text-2xl font-bold mb-1">The quick brown fox</p>
        <p class="text-sm opacity-80">Preview text at normal size (16px)</p>
        <p class="text-xs opacity-60 mt-1">Small text (12px) — harder to read at low contrast</p>
        <p class="text-3xl font-bold mt-3">Large Heading (24px Bold)</p>
      </div>

      {/* Color inputs */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <div class="flex flex-wrap gap-5 items-center">
          {/* Foreground */}
          <div class="flex-1 min-w-[160px]">
            <label class="block text-sm font-medium text-gray-300 mb-2">Foreground (Text)</label>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                value={fgValid ? fg : '#ffffff'}
                onInput={e => setFg((e.target as HTMLInputElement).value)}
                class="w-10 h-10 rounded-md cursor-pointer border border-gray-600 bg-transparent"
              />
              <input
                type="text"
                value={fg}
                onInput={e => setFg((e.target as HTMLInputElement).value)}
                maxLength={7}
                placeholder="#ffffff"
                class={`flex-1 bg-gray-800 text-gray-100 border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 ${
                  fgValid ? 'border-gray-700' : 'border-red-500'
                }`}
              />
            </div>
          </div>

          {/* Swap button */}
          <button
            onClick={swapColors}
            class="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg p-2 transition-colors"
            title="Swap colors"
          >
            ⇄
          </button>

          {/* Background */}
          <div class="flex-1 min-w-[160px]">
            <label class="block text-sm font-medium text-gray-300 mb-2">Background</label>
            <div class="flex gap-2 items-center">
              <input
                type="color"
                value={bgValid ? bg : '#000000'}
                onInput={e => setBg((e.target as HTMLInputElement).value)}
                class="w-10 h-10 rounded-md cursor-pointer border border-gray-600 bg-transparent"
              />
              <input
                type="text"
                value={bg}
                onInput={e => setBg((e.target as HTMLInputElement).value)}
                maxLength={7}
                placeholder="#000000"
                class={`flex-1 bg-gray-800 text-gray-100 border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 ${
                  bgValid ? 'border-gray-700' : 'border-red-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
          {/* Contrast ratio */}
          <div class="flex items-center justify-between">
            <div>
              <p class="text-3xl font-bold text-white">{result.ratio.toFixed(2)}:1</p>
              <p class="text-sm text-gray-400 mt-0.5">Contrast Ratio</p>
            </div>
            <div class={`text-right px-4 py-2 rounded-xl border ${
              result.aaa_normal ? 'bg-green-900/30 border-green-700 text-green-300'
              : result.aa_normal ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
              : 'bg-red-900/30 border-red-700 text-red-300'
            }`}>
              <p class="text-lg font-bold">
                {result.aaa_normal ? 'AAA ✓' : result.aa_normal ? 'AA ✓' : 'FAIL ✗'}
              </p>
              <p class="text-xs opacity-75">WCAG 2.1 Normal Text</p>
            </div>
          </div>

          {/* WCAG breakdown */}
          <div>
            <p class="text-sm font-medium text-gray-300 mb-2">WCAG 2.1 Compliance</p>
            <div class="grid grid-cols-2 gap-2">
              <Badge pass={result.aa_normal} label="AA Normal (≥ 4.5:1)" />
              <Badge pass={result.aa_large} label="AA Large (≥ 3:1)" />
              <Badge pass={result.aaa_normal} label="AAA Normal (≥ 7:1)" />
              <Badge pass={result.aaa_large} label="AAA Large (≥ 4.5:1)" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Large text = 18px+ normal or 14px+ bold</p>
          </div>
        </div>
      ) : (
        <div class="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-300 text-sm">
          Invalid hex color. Use format: #RRGGBB or #RGB
        </div>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div class="bg-amber-900/20 border border-amber-700 rounded-xl p-4 space-y-3">
          <p class="text-sm font-medium text-amber-300">Suggested Fix — Pass AA Normal</p>
          <div class="flex items-center gap-3">
            <div
              class="w-8 h-8 rounded-md border border-gray-600 flex-shrink-0"
              style={{ backgroundColor: suggestion.suggested }}
            />
            <code class="text-sm font-mono text-white bg-gray-800 px-3 py-1.5 rounded-md flex-1">
              {suggestion.suggested}
            </code>
            <span class="text-xs text-gray-400">{suggestion.label}</span>
            <button
              onClick={() => copySuggestion(suggestion.suggested)}
              class="text-xs bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-md transition-colors font-medium whitespace-nowrap"
            >
              {copiedSuggestion ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={() => setFg(suggestion.suggested)}
            class="text-xs text-amber-400 hover:text-amber-300 underline"
          >
            Apply suggestion →
          </button>
        </div>
      )}

      {/* Common presets */}
      <div class="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <p class="text-sm font-medium text-gray-300 mb-3">Common Presets</p>
        <div class="flex flex-wrap gap-2">
          {[
            { label: 'White on Black', fg: '#ffffff', bg: '#000000' },
            { label: 'Black on White', fg: '#000000', bg: '#ffffff' },
            { label: 'White on Navy', fg: '#ffffff', bg: '#1e3a5f' },
            { label: 'Dark on Yellow', fg: '#1a1a1a', bg: '#ffd700' },
            { label: 'Gray on Dark', fg: '#9ca3af', bg: '#111827' },
            { label: 'Red on White', fg: '#dc2626', bg: '#ffffff' },
          ].map(p => (
            <button
              key={p.label}
              onClick={() => { setFg(p.fg); setBg(p.bg); }}
              class="text-xs px-3 py-1.5 rounded-md border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
              style={{ borderLeftColor: p.fg, borderLeftWidth: '3px' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-1">
        <p class="font-medium text-gray-300">About WCAG Contrast</p>
        <p>WCAG 2.1 defines minimum contrast ratios for text legibility. <strong class="text-gray-200">AA</strong> is the legal standard for most accessibility requirements. <strong class="text-gray-200">AAA</strong> is the enhanced level for maximum accessibility.</p>
        <p class="text-xs mt-1">All calculations run locally — no data is sent to any server.</p>
      </div>
    </div>
  );
}
