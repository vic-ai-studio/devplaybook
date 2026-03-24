import { useState, useCallback } from 'preact/hooks';

type ShapeType = 'polygon' | 'circle' | 'ellipse' | 'inset';

interface PolygonPreset {
  name: string;
  points: [number, number][];
}

const POLYGON_PRESETS: PolygonPreset[] = [
  { name: 'Triangle Up', points: [[50, 0], [100, 100], [0, 100]] },
  { name: 'Triangle Down', points: [[0, 0], [100, 0], [50, 100]] },
  { name: 'Triangle Left', points: [[100, 0], [100, 100], [0, 50]] },
  { name: 'Triangle Right', points: [[0, 0], [100, 50], [0, 100]] },
  { name: 'Diamond', points: [[50, 0], [100, 50], [50, 100], [0, 50]] },
  { name: 'Pentagon', points: [[50, 0], [100, 38], [82, 100], [18, 100], [0, 38]] },
  { name: 'Hexagon', points: [[25, 0], [75, 0], [100, 50], [75, 100], [25, 100], [0, 50]] },
  { name: 'Arrow Right', points: [[0, 25], [60, 25], [60, 0], [100, 50], [60, 100], [60, 75], [0, 75]] },
  { name: 'Arrow Left', points: [[100, 25], [40, 25], [40, 0], [0, 50], [40, 100], [40, 75], [100, 75]] },
  { name: 'Star', points: [[50, 0], [61, 35], [98, 35], [68, 57], [79, 91], [50, 70], [21, 91], [32, 57], [2, 35], [39, 35]] },
  { name: 'Parallelogram', points: [[20, 0], [100, 0], [80, 100], [0, 100]] },
  { name: 'Trapezoid', points: [[20, 0], [80, 0], [100, 100], [0, 100]] },
  { name: 'Chevron Right', points: [[0, 0], [75, 0], [100, 50], [75, 100], [0, 100], [25, 50]] },
  { name: 'Notch', points: [[0, 0], [100, 0], [100, 100], [60, 100], [50, 80], [40, 100], [0, 100]] },
  { name: 'Message', points: [[0, 0], [100, 0], [100, 75], [60, 75], [50, 100], [40, 75], [0, 75]] },
  { name: 'Cross', points: [[35, 0], [65, 0], [65, 35], [100, 35], [100, 65], [65, 65], [65, 100], [35, 100], [35, 65], [0, 65], [0, 35], [35, 35]] },
];

interface InsetValues { top: number; right: number; bottom: number; left: number; radius: number; }
interface CircleValues { radius: number; cx: number; cy: number; }
interface EllipseValues { rx: number; ry: number; cx: number; cy: number; }

export default function CssClipPathGenerator() {
  const [shape, setShape] = useState<ShapeType>('polygon');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [inset, setInset] = useState<InsetValues>({ top: 10, right: 10, bottom: 10, left: 10, radius: 0 });
  const [circle, setCircle] = useState<CircleValues>({ radius: 50, cx: 50, cy: 50 });
  const [ellipse, setEllipse] = useState<EllipseValues>({ rx: 50, ry: 35, cx: 50, cy: 50 });
  const [bgColor, setBgColor] = useState('#6366f1');
  const [copied, setCopied] = useState(false);

  const getClipPath = useCallback(() => {
    if (shape === 'polygon') {
      const pts = POLYGON_PRESETS[selectedPreset].points;
      return `polygon(${pts.map(([x, y]) => `${x}% ${y}%`).join(', ')})`;
    }
    if (shape === 'circle') {
      return `circle(${circle.radius}% at ${circle.cx}% ${circle.cy}%)`;
    }
    if (shape === 'ellipse') {
      return `ellipse(${ellipse.rx}% ${ellipse.ry}% at ${ellipse.cx}% ${ellipse.cy}%)`;
    }
    // inset
    const r = inset.radius > 0 ? ` round ${inset.radius}px` : '';
    return `inset(${inset.top}% ${inset.right}% ${inset.bottom}% ${inset.left}%${r})`;
  }, [shape, selectedPreset, inset, circle, ellipse]);

  const clipValue = getClipPath();
  const fullCss = `clip-path: ${clipValue};`;
  const webkitCss = `-webkit-clip-path: ${clipValue};`;

  const copy = () => {
    navigator.clipboard.writeText(`${webkitCss}\n${fullCss}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const updateInset = (key: keyof InsetValues, val: number) =>
    setInset(prev => ({ ...prev, [key]: val }));
  const updateCircle = (key: keyof CircleValues, val: number) =>
    setCircle(prev => ({ ...prev, [key]: val }));
  const updateEllipse = (key: keyof EllipseValues, val: number) =>
    setEllipse(prev => ({ ...prev, [key]: val }));

  // Build SVG polygon path string for preview overlay
  const getPolygonPoints = () => {
    const pts = POLYGON_PRESETS[selectedPreset].points;
    return pts.map(([x, y]) => `${x * 2.4},${y * 2.4}`).join(' ');
  };

  return (
    <div class="space-y-5">
      {/* Preview */}
      <div class="flex flex-col sm:flex-row gap-5 items-start">
        <div class="flex-1 min-w-0">
          <div class="w-full h-52 rounded-xl border border-gray-700 bg-gray-950 flex items-center justify-center overflow-hidden">
            <div
              class="w-48 h-48 transition-all duration-300"
              style={{ backgroundColor: bgColor, clipPath: clipValue, WebkitClipPath: clipValue }}
            />
          </div>
          <p class="text-xs text-center text-gray-500 mt-1.5">Live Preview</p>
        </div>

        {/* Controls right side */}
        <div class="flex flex-col gap-3 w-full sm:w-56">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Background Color</label>
            <div class="flex gap-2 items-center">
              <input type="color" value={bgColor} onInput={(e) => setBgColor((e.target as HTMLInputElement).value)}
                class="w-9 h-9 rounded border border-gray-600 cursor-pointer bg-transparent" />
              <input type="text" value={bgColor}
                onInput={(e) => setBgColor((e.target as HTMLInputElement).value)}
                class="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 font-mono" />
            </div>
          </div>

          {/* Quick color swatches */}
          <div class="flex flex-wrap gap-1.5">
            {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'].map(c => (
              <button key={c} onClick={() => setBgColor(c)}
                class={`w-7 h-7 rounded-full border-2 transition-colors ${bgColor === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        </div>
      </div>

      {/* Shape Type Selector */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Shape Type</label>
          <div class="flex flex-wrap gap-2">
            {(['polygon', 'circle', 'ellipse', 'inset'] as ShapeType[]).map(s => (
              <button key={s} onClick={() => setShape(s)}
                class={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${shape === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Polygon Presets */}
        {shape === 'polygon' && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Preset Shapes</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {POLYGON_PRESETS.map((preset, i) => {
                const pts = preset.points.map(([x, y]) => `${x * 2.4},${y * 2.4}`).join(' ');
                return (
                  <button key={i} onClick={() => setSelectedPreset(i)}
                    class={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors ${selectedPreset === i ? 'border-indigo-500 bg-indigo-950' : 'border-gray-700 bg-gray-800 hover:bg-gray-700'}`}>
                    <svg viewBox="0 0 240 240" class="w-12 h-12">
                      <polygon points={pts} fill={selectedPreset === i ? '#6366f1' : '#4b5563'} />
                    </svg>
                    <span class="text-xs text-gray-400 text-center leading-tight">{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Circle Controls */}
        {shape === 'circle' && (
          <div class="space-y-3">
            {[
              { label: 'Radius', key: 'radius' as keyof CircleValues, min: 5, max: 100, unit: '%' },
              { label: 'Center X', key: 'cx' as keyof CircleValues, min: 0, max: 100, unit: '%' },
              { label: 'Center Y', key: 'cy' as keyof CircleValues, min: 0, max: 100, unit: '%' },
            ].map(({ label, key, min, max, unit }) => (
              <div key={key}>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-300">{label}</span>
                  <span class="text-gray-400 font-mono">{circle[key]}{unit}</span>
                </div>
                <input type="range" min={min} max={max} value={circle[key]}
                  onInput={(e) => updateCircle(key, Number((e.target as HTMLInputElement).value))}
                  class="w-full accent-indigo-500" />
              </div>
            ))}
          </div>
        )}

        {/* Ellipse Controls */}
        {shape === 'ellipse' && (
          <div class="space-y-3">
            {[
              { label: 'Radius X', key: 'rx' as keyof EllipseValues, min: 5, max: 100, unit: '%' },
              { label: 'Radius Y', key: 'ry' as keyof EllipseValues, min: 5, max: 100, unit: '%' },
              { label: 'Center X', key: 'cx' as keyof EllipseValues, min: 0, max: 100, unit: '%' },
              { label: 'Center Y', key: 'cy' as keyof EllipseValues, min: 0, max: 100, unit: '%' },
            ].map(({ label, key, min, max, unit }) => (
              <div key={key}>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-300">{label}</span>
                  <span class="text-gray-400 font-mono">{ellipse[key]}{unit}</span>
                </div>
                <input type="range" min={min} max={max} value={ellipse[key]}
                  onInput={(e) => updateEllipse(key, Number((e.target as HTMLInputElement).value))}
                  class="w-full accent-indigo-500" />
              </div>
            ))}
          </div>
        )}

        {/* Inset Controls */}
        {shape === 'inset' && (
          <div class="space-y-3">
            {[
              { label: 'Top', key: 'top' as keyof InsetValues, unit: '%' },
              { label: 'Right', key: 'right' as keyof InsetValues, unit: '%' },
              { label: 'Bottom', key: 'bottom' as keyof InsetValues, unit: '%' },
              { label: 'Left', key: 'left' as keyof InsetValues, unit: '%' },
              { label: 'Border Radius', key: 'radius' as keyof InsetValues, unit: 'px', max: 100 },
            ].map(({ label, key, unit, max }) => (
              <div key={key}>
                <div class="flex justify-between text-sm mb-1">
                  <span class="text-gray-300">{label}</span>
                  <span class="text-gray-400 font-mono">{inset[key]}{unit}</span>
                </div>
                <input type="range" min={0} max={max ?? 45} value={inset[key]}
                  onInput={(e) => updateInset(key, Number((e.target as HTMLInputElement).value))}
                  class="w-full accent-indigo-500" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Output */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-gray-300">Generated CSS</label>
          <button onClick={copy}
            class={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="bg-gray-950 rounded-lg border border-gray-700 p-4 text-sm font-mono text-gray-200 overflow-x-auto whitespace-pre-wrap break-all">
{`${webkitCss}
${fullCss}`}
        </pre>
        <p class="text-xs text-gray-500">Both <code class="text-gray-400">-webkit-clip-path</code> and <code class="text-gray-400">clip-path</code> are included for maximum browser compatibility.</p>
      </div>

      {/* Usage Tips */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <h3 class="text-sm font-semibold text-gray-300 mb-3">Usage Tips</h3>
        <ul class="space-y-1.5 text-sm text-gray-400">
          <li>• <strong class="text-gray-300">polygon()</strong> — define any shape using percentage-based coordinates. Great for custom cutouts and decorative dividers.</li>
          <li>• <strong class="text-gray-300">circle()</strong> — circular crop. Use <code class="text-gray-300">50% at 50% 50%</code> to crop a perfect circle from the center.</li>
          <li>• <strong class="text-gray-300">ellipse()</strong> — oval crop with independent X/Y radii. Useful for hero section cutouts.</li>
          <li>• <strong class="text-gray-300">inset()</strong> — rectangular clip from inside, with optional rounded corners. Combine with <code class="text-gray-300">round</code> for soft masks.</li>
          <li>• Animate <code class="text-gray-300">clip-path</code> with CSS transitions for reveal effects — it's GPU-accelerated.</li>
        </ul>
      </div>
    </div>
  );
}
