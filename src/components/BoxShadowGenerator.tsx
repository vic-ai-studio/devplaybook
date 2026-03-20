import { useState } from 'preact/hooks';

interface Shadow {
  id: number;
  inset: boolean;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
}

let nextId = 1;

function shadowToCss(s: Shadow): string {
  const hex = s.color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const rgba = `rgba(${r},${g},${b},${s.opacity.toFixed(2)})`;
  return `${s.inset ? 'inset ' : ''}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${rgba}`;
}

function newShadow(): Shadow {
  return { id: nextId++, inset: false, x: 4, y: 4, blur: 10, spread: 0, color: '#000000', opacity: 0.25 };
}

export default function BoxShadowGenerator() {
  const [shadows, setShadows] = useState<Shadow[]>([newShadow()]);
  const [bgColor, setBgColor] = useState('#1e293b');
  const [boxColor, setBoxColor] = useState('#f1f5f9');
  const [copied, setCopied] = useState(false);

  const cssValue = shadows.map(shadowToCss).join(', ');
  const cssOutput = `box-shadow: ${cssValue};`;

  const update = (id: number, field: keyof Shadow, value: unknown) => {
    setShadows(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const addShadow = () => setShadows(prev => [...prev, newShadow()]);
  const removeShadow = (id: number) => setShadows(prev => prev.filter(s => s.id !== id));

  const copy = () => {
    navigator.clipboard.writeText(cssOutput).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const PRESETS = [
    { name: 'Soft', shadows: [{ ...newShadow(), x: 0, y: 4, blur: 20, spread: 0, color: '#000000', opacity: 0.1 }] },
    { name: 'Hard', shadows: [{ ...newShadow(), x: 6, y: 6, blur: 0, spread: 0, color: '#000000', opacity: 1 }] },
    { name: 'Layered', shadows: [
      { ...newShadow(), x: 0, y: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.07 },
      { ...newShadow(), x: 0, y: 4, blur: 8, spread: 0, color: '#000000', opacity: 0.07 },
      { ...newShadow(), x: 0, y: 16, blur: 32, spread: 0, color: '#000000', opacity: 0.07 },
    ]},
    { name: 'Inset', shadows: [{ ...newShadow(), inset: true, x: 0, y: 2, blur: 8, spread: 0, color: '#000000', opacity: 0.2 }] },
    { name: 'Glow', shadows: [{ ...newShadow(), x: 0, y: 0, blur: 20, spread: 4, color: '#6366f1', opacity: 0.6 }] },
  ];

  return (
    <div class="space-y-6">
      {/* Preview */}
      <div
        class="rounded-xl flex items-center justify-center"
        style={{ background: bgColor, minHeight: '200px' }}
      >
        <div
          class="rounded-xl w-40 h-40 transition-shadow"
          style={{ background: boxColor, boxShadow: cssValue || 'none' }}
        />
      </div>

      {/* Controls row */}
      <div class="flex flex-wrap gap-4 items-center">
        <label class="flex items-center gap-2 text-sm text-text-muted">
          Background
          <input type="color" value={bgColor} onInput={(e) => setBgColor((e.target as HTMLInputElement).value)}
            class="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
        </label>
        <label class="flex items-center gap-2 text-sm text-text-muted">
          Box color
          <input type="color" value={boxColor} onInput={(e) => setBoxColor((e.target as HTMLInputElement).value)}
            class="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
        </label>
        <div class="flex gap-2 ml-auto">
          {PRESETS.map(p => (
            <button
              key={p.name}
              onClick={() => setShadows(p.shadows.map(s => ({ ...s, id: nextId++ })))}
              class="text-xs border border-border hover:border-primary text-text-muted hover:text-primary px-2.5 py-1 rounded-lg transition-colors"
            >{p.name}</button>
          ))}
        </div>
      </div>

      {/* CSS output */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-semibold text-primary uppercase tracking-wide">CSS Output</span>
          <button
            onClick={copy}
            class="text-xs bg-bg border border-border hover:border-primary hover:text-primary px-3 py-1 rounded transition-colors"
          >{copied ? '✓ Copied!' : 'Copy'}</button>
        </div>
        <code class="text-sm font-mono text-text break-all">{cssOutput}</code>
      </div>

      {/* Shadow layers */}
      <div class="space-y-4">
        {shadows.map((s, idx) => (
          <div key={s.id} class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-semibold text-text">Layer {idx + 1}</span>
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                  <input type="checkbox" checked={s.inset} onChange={(e) => update(s.id, 'inset', (e.target as HTMLInputElement).checked)} class="accent-primary" />
                  Inset
                </label>
                {shadows.length > 1 && (
                  <button onClick={() => removeShadow(s.id)} class="text-xs text-text-muted hover:text-red-400 transition-colors">Remove</button>
                )}
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {([
                ['x', 'X Offset', -100, 100],
                ['y', 'Y Offset', -100, 100],
                ['blur', 'Blur', 0, 100],
                ['spread', 'Spread', -50, 50],
              ] as [keyof Shadow, string, number, number][]).map(([field, label, min, max]) => (
                <div key={field}>
                  <div class="flex justify-between text-xs text-text-muted mb-1">
                    <span>{label}</span>
                    <span class="font-mono text-primary">{s[field]}px</span>
                  </div>
                  <input
                    type="range" min={min} max={max} value={s[field] as number}
                    onInput={(e) => update(s.id, field, Number((e.target as HTMLInputElement).value))}
                    class="w-full accent-primary"
                  />
                </div>
              ))}
            </div>

            <div class="flex items-center gap-4">
              <label class="flex items-center gap-2 text-xs text-text-muted">
                Color
                <input type="color" value={s.color} onInput={(e) => update(s.id, 'color', (e.target as HTMLInputElement).value)}
                  class="w-8 h-8 rounded cursor-pointer border border-border bg-transparent" />
              </label>
              <div class="flex-1">
                <div class="flex justify-between text-xs text-text-muted mb-1">
                  <span>Opacity</span>
                  <span class="font-mono text-primary">{Math.round(s.opacity * 100)}%</span>
                </div>
                <input
                  type="range" min={0} max={1} step={0.01} value={s.opacity}
                  onInput={(e) => update(s.id, 'opacity', Number((e.target as HTMLInputElement).value))}
                  class="w-full accent-primary"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addShadow}
          class="w-full border border-dashed border-border hover:border-primary text-text-muted hover:text-primary text-sm py-3 rounded-xl transition-colors"
        >
          + Add Layer
        </button>
      </div>
    </div>
  );
}
