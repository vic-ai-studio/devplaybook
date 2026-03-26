import { useState } from 'preact/hooks';

interface Shadow {
  id: number;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

let nextId = 2;

function shadowToString(s: Shadow): string {
  const hex = s.color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const a = Math.round(s.opacity * 255).toString(16).padStart(2, '0');
  const color = `rgba(${r},${g},${b},${s.opacity.toFixed(2)})`;
  const inset = s.inset ? 'inset ' : '';
  return `${inset}${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${color}`;
}

const PRESETS: { label: string; shadows: Omit<Shadow, 'id'>[] }[] = [
  { label: 'Soft lift', shadows: [{ offsetX: 0, offsetY: 4, blur: 16, spread: 0, color: '#000000', opacity: 0.12, inset: false }] },
  { label: 'Hard drop', shadows: [{ offsetX: 4, offsetY: 4, blur: 0, spread: 0, color: '#000000', opacity: 0.25, inset: false }] },
  { label: 'Glow', shadows: [{ offsetX: 0, offsetY: 0, blur: 20, spread: 4, color: '#6366f1', opacity: 0.6, inset: false }] },
  { label: 'Neumorphism', shadows: [{ offsetX: 6, offsetY: 6, blur: 12, spread: 0, color: '#000000', opacity: 0.15, inset: false }, { offsetX: -6, offsetY: -6, blur: 12, spread: 0, color: '#ffffff', opacity: 0.7, inset: false }] },
  { label: 'Inset sunken', shadows: [{ offsetX: 0, offsetY: 2, blur: 6, spread: 0, color: '#000000', opacity: 0.2, inset: true }] },
  { label: 'Layered', shadows: [{ offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: '#000000', opacity: 0.1, inset: false }, { offsetX: 0, offsetY: 4, blur: 8, spread: -2, color: '#000000', opacity: 0.15, inset: false }, { offsetX: 0, offsetY: 12, blur: 24, spread: -4, color: '#000000', opacity: 0.2, inset: false }] },
];

export default function CssBoxShadowGenerator() {
  const [shadows, setShadows] = useState<Shadow[]>([
    { id: 1, offsetX: 0, offsetY: 4, blur: 16, spread: 0, color: '#000000', opacity: 0.15, inset: false },
  ]);
  const [previewBg, setPreviewBg] = useState('#f8f8f8');
  const [boxColor, setBoxColor] = useState('#ffffff');
  const [copied, setCopied] = useState(false);
  const [activeId, setActiveId] = useState(1);

  const cssValue = shadows.map(shadowToString).join(',\n       ');
  const fullCss = `box-shadow: ${shadows.map(shadowToString).join(',\n            ')};`;

  const addShadow = () => {
    const id = nextId++;
    setShadows(prev => [...prev, { id, offsetX: 0, offsetY: 4, blur: 8, spread: 0, color: '#000000', opacity: 0.15, inset: false }]);
    setActiveId(id);
  };

  const removeShadow = (id: number) => {
    setShadows(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeId === id && next.length > 0) setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const updateShadow = (id: number, patch: Partial<Shadow>) => {
    setShadows(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    nextId = p.shadows.length + 1;
    const ns = p.shadows.map((s, i) => ({ ...s, id: i + 1 }));
    setShadows(ns);
    setActiveId(ns[0].id);
  };

  const copy = () => {
    navigator.clipboard.writeText(fullCss).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const active = shadows.find(s => s.id === activeId);

  const slider = (label: string, value: number, min: number, max: number, key: keyof Shadow, step = 1) => (
    <div>
      <div class="flex justify-between text-xs text-text-muted mb-1">
        <span>{label}</span>
        <span class="font-mono">{value}px</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onInput={e => active && updateShadow(active.id, { [key]: Number((e.target as HTMLInputElement).value) } as Partial<Shadow>)}
        class="w-full accent-accent" />
    </div>
  );

  return (
    <div class="space-y-6">
      {/* Preview */}
      <div class="rounded-xl overflow-hidden border border-border" style={{ background: previewBg }}>
        <div class="h-48 flex items-center justify-center">
          <div class="w-32 h-32 rounded-xl transition-all duration-200"
            style={{ background: boxColor, boxShadow: shadows.map(shadowToString).join(', ') }} />
        </div>
        <div class="flex gap-3 p-3 border-t border-border bg-surface/50">
          <div>
            <label class="text-xs text-text-muted block mb-1">Background</label>
            <input type="color" value={previewBg} onInput={e => setPreviewBg((e.target as HTMLInputElement).value)}
              class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">Box color</label>
            <input type="color" value={boxColor} onInput={e => setBoxColor((e.target as HTMLInputElement).value)}
              class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
          </div>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p class="text-xs text-text-muted mb-2">Presets</p>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p)}
              class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:border-accent hover:text-accent transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shadow layers */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <p class="text-xs text-text-muted">Shadow Layers</p>
          <button onClick={addShadow} class="text-xs text-accent hover:underline">+ Add layer</button>
        </div>
        <div class="flex gap-2 flex-wrap">
          {shadows.map((s, i) => (
            <button key={s.id} onClick={() => setActiveId(s.id)}
              class={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-colors ${activeId === s.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-text-muted bg-surface hover:border-accent/50'}`}>
              <span class="w-3 h-3 rounded-full border border-border/50" style={{ background: s.color }} />
              Layer {i + 1}{s.inset ? ' (inset)' : ''}
              {shadows.length > 1 && (
                <span onClick={e => { e.stopPropagation(); removeShadow(s.id); }} class="ml-1 hover:text-red-400">×</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Controls for active shadow */}
      {active && (
        <div class="rounded-xl bg-surface border border-border p-4 space-y-4">
          {slider('Offset X', active.offsetX, -50, 50, 'offsetX')}
          {slider('Offset Y', active.offsetY, -50, 50, 'offsetY')}
          {slider('Blur radius', active.blur, 0, 100, 'blur')}
          {slider('Spread radius', active.spread, -50, 50, 'spread')}
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-text-muted block mb-1">Color</label>
              <input type="color" value={active.color} onInput={e => updateShadow(active.id, { color: (e.target as HTMLInputElement).value })}
                class="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
            </div>
            <div>
              <div class="flex justify-between text-xs text-text-muted mb-1">
                <span>Opacity</span>
                <span class="font-mono">{Math.round(active.opacity * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.01} value={active.opacity}
                onInput={e => updateShadow(active.id, { opacity: Number((e.target as HTMLInputElement).value) })}
                class="w-full accent-accent" />
            </div>
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active.inset} onChange={e => updateShadow(active.id, { inset: (e.target as HTMLInputElement).checked })}
              class="accent-accent w-4 h-4" />
            <span class="text-sm text-text">Inset shadow</span>
          </label>
        </div>
      )}

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs text-text-muted">CSS Output</label>
          <button onClick={copy} class="text-xs text-accent hover:underline">{copied ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text font-mono text-xs whitespace-pre-wrap break-all">{fullCss}</pre>
      </div>
    </div>
  );
}
