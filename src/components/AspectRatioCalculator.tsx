import { useState, useMemo } from 'preact/hooks';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function simplifyRatio(w: number, h: number): [number, number] {
  const g = gcd(Math.round(w), Math.round(h));
  return [Math.round(w) / g, Math.round(h) / g];
}

const PRESETS = [
  { label: '16:9 HD', w: 1920, h: 1080 },
  { label: '4:3', w: 1024, h: 768 },
  { label: '1:1 Square', w: 1080, h: 1080 },
  { label: '9:16 Vertical', w: 1080, h: 1920 },
  { label: '21:9 Ultrawide', w: 2560, h: 1080 },
  { label: '3:2', w: 1500, h: 1000 },
  { label: 'A4 Portrait', w: 595, h: 842 },
  { label: 'Twitter Card', w: 1200, h: 628 },
];

export default function AspectRatioCalculator() {
  const [width, setWidth] = useState('1920');
  const [height, setHeight] = useState('1080');
  const [lockMode, setLockMode] = useState<'width' | 'height' | null>(null);
  const [newVal, setNewVal] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const w = parseFloat(width);
  const h = parseFloat(height);
  const valid = !isNaN(w) && !isNaN(h) && w > 0 && h > 0;

  const [rw, rh] = useMemo(() => valid ? simplifyRatio(w, h) : [0, 0], [w, h, valid]);
  const ratio = valid ? (w / h).toFixed(4) : '—';

  const calculate = () => {
    const val = parseFloat(newVal);
    if (!valid || isNaN(val) || val <= 0) return;
    if (lockMode === 'width') {
      // Given new width, compute height
      const newH = (val / w) * h;
      setWidth(String(val));
      setHeight(String(Math.round(newH)));
    } else if (lockMode === 'height') {
      // Given new height, compute width
      const newW = (val / h) * w;
      setHeight(String(val));
      setWidth(String(Math.round(newW)));
    }
    setNewVal('');
  };

  const applyPreset = (pw: number, ph: number) => {
    setWidth(String(pw));
    setHeight(String(ph));
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Common sizes at this ratio
  const commonSizes = valid ? [
    { label: 'Mobile (360px w)', w: 360, h: Math.round(360 * h / w) },
    { label: '720p', w: 1280, h: Math.round(1280 * h / w) },
    { label: '1080p', w: 1920, h: Math.round(1920 * h / w) },
    { label: '4K', w: 3840, h: Math.round(3840 * h / w) },
  ] : [];

  return (
    <div class="space-y-5">
      {/* Presets */}
      <div class="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p.w, p.h)}
            class="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:border-indigo-500 hover:text-indigo-300 rounded-md transition-colors">
            {p.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div class="flex flex-wrap gap-4 items-end">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Width (px)</label>
            <input type="number" value={width} min={1}
              onInput={e => setWidth((e.target as HTMLInputElement).value)}
              class="w-32 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <span class="text-gray-500 text-xl pb-2">×</span>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Height (px)</label>
            <input type="number" value={height} min={1}
              onInput={e => setHeight((e.target as HTMLInputElement).value)}
              class="w-32 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        {/* Results */}
        {valid && (
          <div class="flex flex-wrap gap-4">
            {[
              { label: 'Simplified Ratio', value: `${rw}:${rh}`, key: 'ratio' },
              { label: 'Decimal Ratio', value: ratio, key: 'decimal' },
              { label: 'CSS padding-top', value: `${((h / w) * 100).toFixed(4)}%`, key: 'pt' },
            ].map(item => (
              <div key={item.key} class="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
                <div>
                  <div class="text-xs text-gray-500 mb-0.5">{item.label}</div>
                  <div class="font-mono text-indigo-300 font-semibold">{item.value}</div>
                </div>
                <button onClick={() => copy(item.value, item.key)}
                  class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded transition-colors">
                  {copied === item.key ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scale calculator */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
        <p class="text-sm font-medium text-gray-300">Scale to New Size</p>
        <div class="flex flex-wrap gap-3 items-end">
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Fix</label>
            <div class="flex gap-2">
              <button onClick={() => setLockMode('width')}
                class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${lockMode === 'width' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                Width
              </button>
              <button onClick={() => setLockMode('height')}
                class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${lockMode === 'height' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                Height
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">New {lockMode === 'height' ? 'Height' : 'Width'} (px)</label>
            <input type="number" value={newVal} min={1}
              onInput={e => setNewVal((e.target as HTMLInputElement).value)}
              onKeyDown={e => e.key === 'Enter' && calculate()}
              disabled={!lockMode}
              placeholder="e.g. 800"
              class="w-32 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>
          <button onClick={calculate} disabled={!lockMode || !newVal}
            class="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm">
            Calculate
          </button>
        </div>
      </div>

      {/* Common sizes */}
      {valid && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="px-4 py-2 border-b border-gray-700">
            <span class="text-sm font-medium text-gray-300">Common Sizes at {rw}:{rh} ratio</span>
          </div>
          <div class="divide-y divide-gray-800">
            {commonSizes.map(s => (
              <div key={s.label} class="flex items-center justify-between px-4 py-2.5">
                <span class="text-sm text-gray-400">{s.label}</span>
                <span class="font-mono text-sm text-gray-200">{s.w} × {s.h}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
