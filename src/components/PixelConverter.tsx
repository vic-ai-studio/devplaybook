import { useState } from 'preact/hooks';

type Unit = 'px' | 'rem' | 'em' | 'vh' | 'vw' | '%';

const UNITS: Unit[] = ['px', 'rem', 'em', 'vh', 'vw', '%'];

const UNIT_DESCRIPTIONS: Record<Unit, string> = {
  px: 'Absolute pixels — fixed size regardless of viewport or font',
  rem: 'Root em — relative to root element font size (usually 16px)',
  em: 'Em — relative to parent element font size',
  vh: 'Viewport height — 1vh = 1% of the viewport height',
  vw: 'Viewport width — 1vw = 1% of the viewport width',
  '%': 'Percent — relative to parent element dimension',
};

interface Conversions {
  px: number;
  rem: number;
  em: number;
  vh: number;
  vw: number;
  '%': number;
}

function convert(value: number, from: Unit, rootFontSize: number, parentFontSize: number, viewportH: number, viewportW: number, parentSize: number): Conversions {
  // First convert to px
  let px: number;
  switch (from) {
    case 'px': px = value; break;
    case 'rem': px = value * rootFontSize; break;
    case 'em': px = value * parentFontSize; break;
    case 'vh': px = (value / 100) * viewportH; break;
    case 'vw': px = (value / 100) * viewportW; break;
    case '%': px = (value / 100) * parentSize; break;
  }
  // Convert px to all units
  return {
    px: Math.round(px * 10000) / 10000,
    rem: Math.round((px / rootFontSize) * 10000) / 10000,
    em: Math.round((px / parentFontSize) * 10000) / 10000,
    vh: Math.round((px / viewportH) * 100 * 10000) / 10000,
    vw: Math.round((px / viewportW) * 100 * 10000) / 10000,
    '%': Math.round((px / parentSize) * 100 * 10000) / 10000,
  };
}

const COMMON_SIZES = [
  { label: '4px / 0.25rem', px: 4 },
  { label: '8px / 0.5rem', px: 8 },
  { label: '12px / 0.75rem', px: 12 },
  { label: '16px / 1rem', px: 16 },
  { label: '20px / 1.25rem', px: 20 },
  { label: '24px / 1.5rem', px: 24 },
  { label: '32px / 2rem', px: 32 },
  { label: '48px / 3rem', px: 48 },
  { label: '64px / 4rem', px: 64 },
  { label: '96px / 6rem', px: 96 },
];

export default function PixelConverter() {
  const [value, setValue] = useState(16);
  const [fromUnit, setFromUnit] = useState<Unit>('px');
  const [rootFontSize, setRootFontSize] = useState(16);
  const [parentFontSize, setParentFontSize] = useState(16);
  const [viewportH, setViewportH] = useState(800);
  const [viewportW, setViewportW] = useState(1440);
  const [parentSize, setParentSize] = useState(1440);
  const [copied, setCopied] = useState<string | null>(null);

  const results = convert(value, fromUnit, rootFontSize, parentFontSize, viewportH, viewportW, parentSize);

  const copyVal = (unit: Unit) => {
    navigator.clipboard.writeText(`${results[unit]}${unit}`).then(() => {
      setCopied(unit);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const inputNum = (label: string, val: number, setter: (v: number) => void, min = 1, max = 9999) => (
    <div>
      <label class="text-xs text-text-muted block mb-1">{label}</label>
      <input type="number" min={min} max={max} value={val}
        onInput={e => setter(Number((e.target as HTMLInputElement).value))}
        class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
    </div>
  );

  return (
    <div class="space-y-6">
      {/* Main input */}
      <div class="flex gap-3">
        <div class="flex-1">
          <label class="text-xs text-text-muted block mb-1">Value</label>
          <input type="number" value={value} step={0.01}
            onInput={e => setValue(Number((e.target as HTMLInputElement).value))}
            class="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text text-lg font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div>
          <label class="text-xs text-text-muted block mb-1">From unit</label>
          <select value={fromUnit} onChange={e => setFromUnit((e.target as HTMLSelectElement).value as Unit)}
            class="px-4 py-3 rounded-xl bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent h-full">
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Results grid */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {UNITS.map(unit => {
          const val = results[unit];
          const isSource = unit === fromUnit;
          return (
            <button key={unit} onClick={() => copyVal(unit)}
              class={`p-4 rounded-xl border text-left transition-colors group ${isSource ? 'border-accent bg-accent/10' : 'border-border bg-surface hover:border-accent/50'}`}>
              <div class="flex justify-between items-start mb-1">
                <span class={`text-xs font-semibold ${isSource ? 'text-accent' : 'text-text-muted'}`}>{unit}</span>
                <span class="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied === unit ? '✓' : 'copy'}
                </span>
              </div>
              <div class="font-mono text-lg font-bold text-text">{val}</div>
              <div class="text-xs text-text-muted mt-1 leading-tight">{UNIT_DESCRIPTIONS[unit]}</div>
            </button>
          );
        })}
      </div>

      {/* Context settings */}
      <details class="rounded-xl border border-border overflow-hidden">
        <summary class="px-4 py-3 bg-surface cursor-pointer text-sm text-text-muted select-none hover:text-text transition-colors">
          ⚙ Context settings (root font size, viewport, parent size)
        </summary>
        <div class="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {inputNum('Root font size (px)', rootFontSize, setRootFontSize)}
          {inputNum('Parent font size (px)', parentFontSize, setParentFontSize)}
          {inputNum('Viewport height (px)', viewportH, setViewportH)}
          {inputNum('Viewport width (px)', viewportW, setViewportW)}
          {inputNum('Parent element size (px)', parentSize, setParentSize)}
        </div>
      </details>

      {/* Common sizes reference */}
      <div class="rounded-xl bg-surface border border-border p-4">
        <p class="text-xs font-semibold text-text-muted mb-3">Common sizes (click to load)</p>
        <div class="flex flex-wrap gap-2">
          {COMMON_SIZES.map(s => (
            <button key={s.px} onClick={() => { setValue(s.px); setFromUnit('px'); }}
              class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:border-accent hover:text-accent transition-colors">
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
