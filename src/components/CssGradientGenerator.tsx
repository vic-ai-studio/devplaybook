import { useState, useCallback } from 'preact/hooks';

type GradientType = 'linear' | 'radial' | 'conic';
type StopColor = { id: number; color: string; position: number };

let nextId = 3;

export default function CssGradientGenerator() {
  const [type, setType] = useState<GradientType>('linear');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<StopColor[]>([
    { id: 1, color: '#6366f1', position: 0 },
    { id: 2, color: '#ec4899', position: 100 },
  ]);
  const [copied, setCopied] = useState(false);

  const addStop = () => {
    const midPos = Math.round((stops[0].position + stops[stops.length - 1].position) / 2);
    setStops(prev => [...prev, { id: nextId++, color: '#f59e0b', position: midPos }].sort((a, b) => a.position - b.position));
  };

  const removeStop = (id: number) => {
    if (stops.length <= 2) return;
    setStops(prev => prev.filter(s => s.id !== id));
  };

  const updateStop = (id: number, field: 'color' | 'position', value: string | number) => {
    setStops(prev =>
      prev.map(s => s.id === id ? { ...s, [field]: field === 'position' ? Number(value) : value } : s)
        .sort((a, b) => a.position - b.position)
    );
  };

  const stopsStr = stops.map(s => `${s.color} ${s.position}%`).join(', ');

  const getCss = useCallback(() => {
    if (type === 'linear') return `linear-gradient(${angle}deg, ${stopsStr})`;
    if (type === 'radial') return `radial-gradient(circle, ${stopsStr})`;
    return `conic-gradient(from ${angle}deg, ${stopsStr})`;
  }, [type, angle, stops, stopsStr]);

  const cssValue = getCss();
  const fullCss = `background: ${cssValue};`;

  const copy = () => {
    navigator.clipboard.writeText(fullCss).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const directions: { label: string; value: number }[] = [
    { label: '→', value: 90 }, { label: '↗', value: 45 }, { label: '↑', value: 0 },
    { label: '↖', value: 315 }, { label: '←', value: 270 }, { label: '↙', value: 225 },
    { label: '↓', value: 180 }, { label: '↘', value: 135 },
  ];

  return (
    <div class="space-y-5">
      {/* Preview */}
      <div
        class="w-full h-48 rounded-xl border border-gray-700 transition-all duration-300"
        style={{ background: cssValue }}
      />

      {/* Type */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Gradient Type</label>
          <div class="flex gap-2">
            {(['linear', 'radial', 'conic'] as GradientType[]).map(t => (
              <button key={t} onClick={() => setType(t)}
                class={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${type === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Angle (for linear and conic) */}
        {(type === 'linear' || type === 'conic') && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Direction / Angle: {angle}°</label>
            <div class="flex flex-wrap gap-2 mb-3">
              {directions.map(d => (
                <button key={d.value} onClick={() => setAngle(d.value)}
                  class={`w-9 h-9 rounded-md border text-sm transition-colors ${angle === d.value ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            <input type="range" min={0} max={360} value={angle}
              onInput={e => setAngle(Number((e.target as HTMLInputElement).value))}
              class="w-full accent-indigo-500" />
          </div>
        )}

        {/* Color stops */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-gray-300">Color Stops</label>
            <button onClick={addStop}
              class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors">
              + Add Stop
            </button>
          </div>
          <div class="space-y-2">
            {stops.map(stop => (
              <div key={stop.id} class="flex items-center gap-3">
                <input type="color" value={stop.color}
                  onInput={e => updateStop(stop.id, 'color', (e.target as HTMLInputElement).value)}
                  class="w-10 h-10 rounded-md cursor-pointer bg-gray-800 border border-gray-700 p-0.5" />
                <span class="text-sm font-mono text-gray-400 w-20">{stop.color}</span>
                <input type="range" min={0} max={100} value={stop.position}
                  onInput={e => updateStop(stop.id, 'position', (e.target as HTMLInputElement).value)}
                  class="flex-1 accent-indigo-500" />
                <span class="text-sm text-gray-400 w-8">{stop.position}%</span>
                <button onClick={() => removeStop(stop.id)}
                  class="text-gray-600 hover:text-red-400 transition-colors text-lg leading-none"
                  title="Remove stop">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-300">CSS Output</span>
          <button onClick={copy}
            class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md transition-colors font-medium">
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <code class="block font-mono text-sm text-green-300 break-all">{fullCss}</code>
      </div>

      {/* Info */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">About CSS Gradients</p>
        <p>CSS gradients let you create smooth transitions between colors without images. Linear gradients go in a direction; radial gradients emanate from a center; conic gradients sweep around a point.</p>
      </div>
    </div>
  );
}
