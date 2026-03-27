import { useState, useCallback } from 'preact/hooks';

function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return [r, g, b];
  }
  return null;
}

function linearize(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

interface Result {
  ratio: number;
  aaSmall: boolean;
  aaLarge: boolean;
  aaaSmall: boolean;
  aaaLarge: boolean;
}

function evaluate(fg: string, bg: string): Result | null {
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);
  if (!fgRgb || !bgRgb) return null;
  const l1 = luminance(...fgRgb);
  const l2 = luminance(...bgRgb);
  const ratio = contrastRatio(l1, l2);
  return {
    ratio,
    aaSmall: ratio >= 4.5,
    aaLarge: ratio >= 3.0,
    aaaSmall: ratio >= 7.0,
    aaaLarge: ratio >= 4.5,
  };
}

function Badge({ pass, label }: { pass: boolean; label: string }) {
  return (
    <div class={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
      pass ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-red-500/30 bg-red-500/10 text-red-400'
    }`}>
      <span class="text-base">{pass ? '✓' : '✗'}</span>
      <span class="font-medium">{label}</span>
      <span class="text-xs opacity-70">{pass ? 'Pass' : 'Fail'}</span>
    </div>
  );
}

export default function WcagContrastChecker() {
  const [fg, setFg] = useState('#1a1a2e');
  const [bg, setBg] = useState('#ffffff');

  const result = evaluate(fg, bg);
  const fgRgb = hexToRgb(fg);
  const bgRgb = hexToRgb(bg);

  const normalizeHex = (v: string) => {
    const cleaned = v.startsWith('#') ? v : '#' + v;
    return cleaned;
  };

  return (
    <div class="space-y-6">
      {/* Color inputs */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text mb-2">Foreground Color (Text)</label>
          <div class="flex gap-2">
            <input
              type="color"
              value={fg}
              onInput={(e) => setFg((e.target as HTMLInputElement).value)}
              class="h-10 w-12 rounded border border-border cursor-pointer bg-surface p-0.5"
            />
            <input
              type="text"
              value={fg}
              onInput={(e) => setFg(normalizeHex((e.target as HTMLInputElement).value))}
              placeholder="#1a1a2e"
              class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand"
            />
          </div>
          {fgRgb && (
            <p class="text-xs text-text-muted mt-1">rgb({fgRgb.join(', ')})</p>
          )}
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-2">Background Color</label>
          <div class="flex gap-2">
            <input
              type="color"
              value={bg}
              onInput={(e) => setBg((e.target as HTMLInputElement).value)}
              class="h-10 w-12 rounded border border-border cursor-pointer bg-surface p-0.5"
            />
            <input
              type="text"
              value={bg}
              onInput={(e) => setBg(normalizeHex((e.target as HTMLInputElement).value))}
              placeholder="#ffffff"
              class="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand"
            />
          </div>
          {bgRgb && (
            <p class="text-xs text-text-muted mt-1">rgb({bgRgb.join(', ')})</p>
          )}
        </div>
      </div>

      {/* Preview */}
      {fgRgb && bgRgb && (
        <div
          class="rounded-xl border border-border p-6 flex flex-col items-center gap-3"
          style={{ backgroundColor: bg, color: fg }}
        >
          <p class="text-xl font-bold">The quick brown fox jumps over the lazy dog</p>
          <p class="text-sm">Normal text (14px regular)</p>
          <p class="text-lg font-semibold">Large text (18px bold)</p>
        </div>
      )}

      {/* Ratio */}
      {result && (
        <>
          <div class="text-center">
            <div class="text-5xl font-bold text-text">{result.ratio.toFixed(2)}<span class="text-2xl text-text-muted">:1</span></div>
            <p class="text-sm text-text-muted mt-1">Contrast Ratio</p>
          </div>

          {/* WCAG results */}
          <div>
            <h3 class="text-sm font-semibold text-text mb-3">WCAG 2.1 Results</h3>
            <div class="grid grid-cols-2 sm:grid-cols-2 gap-2">
              <Badge pass={result.aaSmall} label="AA — Normal text (≥4.5:1)" />
              <Badge pass={result.aaLarge} label="AA — Large text (≥3.0:1)" />
              <Badge pass={result.aaaSmall} label="AAA — Normal text (≥7.0:1)" />
              <Badge pass={result.aaaLarge} label="AAA — Large text (≥4.5:1)" />
            </div>
          </div>

          {/* Thresholds guide */}
          <div class="bg-surface rounded-lg border border-border p-4 text-xs text-text-muted space-y-1">
            <p class="font-medium text-text text-sm mb-2">WCAG 2.1 Thresholds</p>
            <p><strong>AA Normal text:</strong> ≥4.5:1 — required for compliance with most regulations</p>
            <p><strong>AA Large text:</strong> ≥3.0:1 — 18pt+ regular or 14pt+ bold</p>
            <p><strong>AAA Normal text:</strong> ≥7.0:1 — enhanced accessibility standard</p>
            <p><strong>AAA Large text:</strong> ≥4.5:1 — same as AA normal, highest bar</p>
          </div>
        </>
      )}

      {!result && (
        <div class="text-center text-text-muted py-4 text-sm">Enter valid hex colors to calculate contrast ratio.</div>
      )}
    </div>
  );
}
