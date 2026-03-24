import { useState } from 'preact/hooks';

type SimType = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

const MATRICES: Record<SimType, number[]> = {
  normal: [1,0,0,0,0, 0,1,0,0,0, 0,0,1,0,0, 0,0,0,1,0],
  protanopia: [0.567,0.433,0,0,0, 0.558,0.442,0,0,0, 0,0.242,0.758,0,0, 0,0,0,1,0],
  deuteranopia: [0.625,0.375,0,0,0, 0.7,0.3,0,0,0, 0,0.3,0.7,0,0, 0,0,0,1,0],
  tritanopia: [0.95,0.05,0,0,0, 0,0.433,0.567,0,0, 0,0.475,0.525,0,0, 0,0,0,1,0],
  achromatopsia: [0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0,0,0,1,0],
};

const TYPES: Array<{ key: SimType; label: string; desc: string }> = [
  { key: 'normal', label: 'Normal Vision', desc: 'Full color spectrum' },
  { key: 'protanopia', label: 'Protanopia', desc: 'Red blind (~1% of males)' },
  { key: 'deuteranopia', label: 'Deuteranopia', desc: 'Green blind (~1% of males)' },
  { key: 'tritanopia', label: 'Tritanopia', desc: 'Blue blind (rare)' },
  { key: 'achromatopsia', label: 'Achromatopsia', desc: 'Total color blindness (rare)' },
];

function applyMatrix(r: number, g: number, b: number, m: number[]): [number, number, number] {
  const nr = Math.round(Math.min(255, Math.max(0, r*m[0] + g*m[1] + b*m[2])));
  const ng = Math.round(Math.min(255, Math.max(0, r*m[5] + g*m[6] + b*m[7])));
  const nb = Math.round(Math.min(255, Math.max(0, r*m[10] + g*m[11] + b*m[12])));
  return [nr, ng, nb];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

const SAMPLE_COLORS = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6'];

export default function ColorBlindness() {
  const [hex, setHex] = useState('#3498db');

  const rgb = hexToRgb(hex);

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap gap-4 items-center">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Select Color</label>
          <div class="flex gap-3 items-center">
            <input type="color" value={hex} onInput={e => setHex((e.target as HTMLInputElement).value)} class="w-12 h-10 rounded cursor-pointer border-0 bg-transparent" />
            <input type="text" value={hex} onInput={e => setHex((e.target as HTMLInputElement).value)} maxLength={7} placeholder="#3498db" class="w-28 bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Quick colors</label>
          <div class="flex gap-2">
            {SAMPLE_COLORS.map(c => (
              <button key={c} onClick={() => setHex(c)} class="w-8 h-8 rounded-lg border-2 transition-colors" style={`background:${c}; border-color: ${hex === c ? 'white' : 'transparent'}`} title={c} />
            ))}
          </div>
        </div>
      </div>

      {rgb && (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TYPES.map(({ key, label, desc }) => {
            const [r, g, b] = applyMatrix(rgb[0], rgb[1], rgb[2], MATRICES[key]);
            const simHex = rgbToHex(r, g, b);
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const textColor = luminance > 0.5 ? '#000' : '#fff';
            return (
              <div key={key} class="rounded-lg border border-border overflow-hidden">
                <div class="h-24 w-full transition-colors" style={`background-color: ${simHex}`}>
                  <div class="h-full flex items-center justify-center" style={`color: ${textColor}`}>
                    <span class="font-mono text-sm font-bold">{simHex.toUpperCase()}</span>
                  </div>
                </div>
                <div class="p-3 bg-bg-card">
                  <p class="font-medium text-sm text-text">{label}</p>
                  <p class="text-xs text-text-muted">{desc}</p>
                  {key !== 'normal' && <p class="text-xs text-text-muted mt-1 font-mono">RGB({r},{g},{b})</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rgb && (
        <div>
          <p class="text-sm font-medium text-text-muted mb-3">How sample colors appear</p>
          <div class="space-y-2">
            {TYPES.map(({ key, label }) => (
              <div key={key} class="flex items-center gap-3">
                <span class="text-xs text-text-muted w-32 shrink-0">{label}</span>
                <div class="flex gap-2">
                  {SAMPLE_COLORS.map(c => {
                    const sRgb = hexToRgb(c)!;
                    const [r, g, b] = applyMatrix(sRgb[0], sRgb[1], sRgb[2], MATRICES[key]);
                    return <div key={c} class="w-8 h-8 rounded" style={`background-color: ${rgbToHex(r, g, b)}`} title={`Original: ${c}`} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
