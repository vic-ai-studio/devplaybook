import { useState } from 'preact/hooks';

type Unit = 'px' | 'rem' | 'em' | 'vw' | 'vh' | 'pt' | '%';

interface ConversionResult {
  unit: Unit;
  value: string;
}

function convert(value: number, from: Unit, baseFontSize: number, viewportW: number, viewportH: number, parentSize: number): ConversionResult[] {
  // Convert from input unit to px first
  let px: number;
  switch (from) {
    case 'px':  px = value; break;
    case 'rem': px = value * baseFontSize; break;
    case 'em':  px = value * parentSize; break;
    case 'vw':  px = (value / 100) * viewportW; break;
    case 'vh':  px = (value / 100) * viewportH; break;
    case 'pt':  px = value * (96 / 72); break;
    case '%':   px = (value / 100) * parentSize; break;
    default:    px = value;
  }

  const fmt = (n: number) => {
    const s = n.toFixed(4);
    return parseFloat(s).toString();
  };

  return [
    { unit: 'px',  value: fmt(px) },
    { unit: 'rem', value: fmt(px / baseFontSize) },
    { unit: 'em',  value: fmt(px / parentSize) },
    { unit: 'vw',  value: fmt((px / viewportW) * 100) },
    { unit: 'vh',  value: fmt((px / viewportH) * 100) },
    { unit: 'pt',  value: fmt(px * (72 / 96)) },
    { unit: '%',   value: fmt((px / parentSize) * 100) },
  ];
}

const UNITS: Unit[] = ['px', 'rem', 'em', 'vw', 'vh', 'pt', '%'];

export default function CssUnitConverter() {
  const [value, setValue] = useState('16');
  const [fromUnit, setFromUnit] = useState<Unit>('px');
  const [baseFontSize, setBaseFontSize] = useState(16);
  const [parentSize, setParentSize] = useState(16);
  const [viewportW, setViewportW] = useState(1440);
  const [viewportH, setViewportH] = useState(900);
  const [copied, setCopied] = useState<Unit | null>(null);

  const num = parseFloat(value);
  const isValid = !isNaN(num);
  const results = isValid ? convert(num, fromUnit, baseFontSize, viewportW, viewportH, parentSize) : [];

  const copy = (unit: Unit, val: string) => {
    navigator.clipboard.writeText(`${val}${unit}`).then(() => {
      setCopied(unit);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Value</label>
            <input type="number" value={value}
              onInput={e => setValue((e.target as HTMLInputElement).value)}
              class="w-32 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">From Unit</label>
            <div class="flex flex-wrap gap-2">
              {UNITS.map(u => (
                <button key={u} onClick={() => setFromUnit(u)}
                  class={`px-3 py-1.5 rounded-md text-sm font-mono border transition-colors ${fromUnit === u ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Context settings */}
      <details class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <summary class="px-5 py-3 cursor-pointer text-sm font-medium text-gray-300 hover:text-gray-100 select-none">
          ⚙ Context Settings (base font, viewport, parent size)
        </summary>
        <div class="px-5 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Base Font Size (px)', val: baseFontSize, set: setBaseFontSize, min: 8, max: 32 },
            { label: 'Parent Size (px)', val: parentSize, set: setParentSize, min: 1, max: 2000 },
            { label: 'Viewport Width (px)', val: viewportW, set: setViewportW, min: 320, max: 3840 },
            { label: 'Viewport Height (px)', val: viewportH, set: setViewportH, min: 200, max: 2160 },
          ].map(s => (
            <div key={s.label}>
              <label class="block text-xs text-gray-400 mb-1">{s.label}</label>
              <input type="number" value={s.val} min={s.min} max={s.max}
                onInput={e => s.set(Number((e.target as HTMLInputElement).value))}
                class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          ))}
        </div>
      </details>

      {/* Results */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 divide-y divide-gray-800 overflow-hidden">
        {UNITS.map(unit => {
          const res = results.find(r => r.unit === unit);
          const display = res ? res.value : '—';
          return (
            <div key={unit} class={`flex items-center px-5 py-3 hover:bg-gray-800/30 ${unit === fromUnit ? 'bg-indigo-900/20' : ''}`}>
              <span class="font-mono text-indigo-400 text-sm w-10">{unit}</span>
              <span class={`flex-1 font-mono text-lg ${isValid ? 'text-gray-100' : 'text-gray-600'}`}>
                {isValid ? `${display}${unit}` : `—`}
              </span>
              {isValid && (
                <button onClick={() => copy(unit, display)}
                  class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors">
                  {copied === unit ? '✓' : 'Copy'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">Tips</p>
        <ul class="list-disc list-inside space-y-1 text-xs">
          <li><strong class="text-gray-300">rem</strong> is relative to the root element font size (usually 16px)</li>
          <li><strong class="text-gray-300">em</strong> is relative to the parent element font size</li>
          <li><strong class="text-gray-300">vw/vh</strong> are percentages of the viewport dimensions</li>
          <li><strong class="text-gray-300">pt</strong> is a print unit: 1pt = 1.333px at 96dpi</li>
        </ul>
      </div>
    </div>
  );
}
