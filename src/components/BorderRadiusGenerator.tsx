import { useState } from 'preact/hooks';

type CornerMode = 'uniform' | 'individual' | 'elliptical';

export default function BorderRadiusGenerator() {
  const [mode, setMode] = useState<CornerMode>('uniform');
  const [uniform, setUniform] = useState(16);
  const [tl, setTl] = useState(16);
  const [tr, setTr] = useState(16);
  const [br, setBr] = useState(16);
  const [bl, setBl] = useState(16);
  const [tlX, setTlX] = useState(16); const [tlY, setTlY] = useState(16);
  const [trX, setTrX] = useState(16); const [trY, setTrY] = useState(16);
  const [brX, setBrX] = useState(16); const [brY, setBrY] = useState(16);
  const [blX, setBlX] = useState(16); const [blY, setBlY] = useState(16);
  const [unit, setUnit] = useState<'px' | '%'>('px');
  const [copied, setCopied] = useState(false);
  const [previewColor, setPreviewColor] = useState('#6366f1');

  const u = (v: number) => `${v}${unit}`;

  const getBorderRadius = (): string => {
    if (mode === 'uniform') return u(uniform);
    if (mode === 'individual') {
      if (tl === tr && tr === br && br === bl) return u(tl);
      if (tl === br && tr === bl) return `${u(tl)} ${u(tr)}`;
      if (tr === bl) return `${u(tl)} ${u(tr)} ${u(br)}`;
      return `${u(tl)} ${u(tr)} ${u(br)} ${u(bl)}`;
    }
    // elliptical
    return `${u(tlX)} ${u(trX)} ${u(brX)} ${u(blX)} / ${u(tlY)} ${u(trY)} ${u(brY)} ${u(blY)}`;
  };

  const cssValue = getBorderRadius();
  const fullCss = `border-radius: ${cssValue};`;

  const copy = () => {
    navigator.clipboard.writeText(fullCss).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const presets = [
    { name: 'None', tl: 0, tr: 0, br: 0, bl: 0 },
    { name: 'Small', tl: 4, tr: 4, br: 4, bl: 4 },
    { name: 'Medium', tl: 8, tr: 8, br: 8, bl: 8 },
    { name: 'Large', tl: 16, tr: 16, br: 16, bl: 16 },
    { name: 'XL', tl: 24, tr: 24, br: 24, bl: 24 },
    { name: 'Full', tl: 9999, tr: 9999, br: 9999, bl: 9999 },
    { name: 'Top Only', tl: 16, tr: 16, br: 0, bl: 0 },
    { name: 'Bottom Only', tl: 0, tr: 0, br: 16, bl: 16 },
    { name: 'Left Only', tl: 16, tr: 0, br: 0, bl: 16 },
    { name: 'Right Only', tl: 0, tr: 16, br: 16, bl: 0 },
    { name: 'Squircle', tl: 40, tr: 40, br: 40, bl: 40 },
    { name: 'Asymmetric', tl: 30, tr: 8, br: 30, bl: 8 },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setMode('individual');
    setTl(p.tl); setTr(p.tr); setBr(p.br); setBl(p.bl);
  };

  const SliderRow = ({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) => (
    <div class="flex items-center gap-3">
      <span class="text-sm text-gray-400 w-24 shrink-0">{label}</span>
      <input type="range" min={0} max={unit === '%' ? 50 : 100} value={Math.min(value, unit === '%' ? 50 : 100)}
        onInput={e => setValue(Number((e.target as HTMLInputElement).value))}
        class="flex-1 accent-indigo-500" />
      <input type="number" min={0} max={unit === '%' ? 50 : 9999} value={value}
        onInput={e => setValue(Number((e.target as HTMLInputElement).value))}
        class="w-16 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-sm text-white text-right" />
      <span class="text-xs text-gray-500 w-4">{unit}</span>
    </div>
  );

  return (
    <div class="space-y-5">
      {/* Preview */}
      <div class="flex items-center justify-center bg-gray-900 rounded-xl border border-gray-700 p-8 min-h-48 gap-8">
        <div
          class="w-40 h-40 transition-all duration-200 flex items-center justify-center text-white text-xs font-mono"
          style={{ borderRadius: cssValue, background: previewColor }}
        >
          {cssValue}
        </div>
        <div class="space-y-2">
          <label class="block text-xs text-gray-400">Preview Color</label>
          <input type="color" value={previewColor}
            onInput={e => setPreviewColor((e.target as HTMLInputElement).value)}
            class="w-10 h-10 rounded-md cursor-pointer bg-gray-800 border border-gray-700 p-0.5" />
        </div>
      </div>

      {/* Mode & Unit */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div class="flex flex-wrap gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Mode</label>
            <div class="flex gap-2">
              {(['uniform', 'individual', 'elliptical'] as CornerMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  class={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${mode === m ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Unit</label>
            <div class="flex gap-2">
              {(['px', '%'] as const).map(u => (
                <button key={u} onClick={() => setUnit(u)}
                  class={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${unit === u ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div class="space-y-3">
          {mode === 'uniform' && (
            <SliderRow label="All Corners" value={uniform} setValue={setUniform} />
          )}

          {mode === 'individual' && (
            <>
              <SliderRow label="Top-Left" value={tl} setValue={setTl} />
              <SliderRow label="Top-Right" value={tr} setValue={setTr} />
              <SliderRow label="Bottom-Right" value={br} setValue={setBr} />
              <SliderRow label="Bottom-Left" value={bl} setValue={setBl} />
            </>
          )}

          {mode === 'elliptical' && (
            <>
              <p class="text-xs text-gray-500">Horizontal (X) radii per corner:</p>
              <SliderRow label="Top-Left X" value={tlX} setValue={setTlX} />
              <SliderRow label="Top-Right X" value={trX} setValue={setTrX} />
              <SliderRow label="Bottom-Right X" value={brX} setValue={setBrX} />
              <SliderRow label="Bottom-Left X" value={blX} setValue={setBlX} />
              <p class="text-xs text-gray-500 mt-1">Vertical (Y) radii per corner:</p>
              <SliderRow label="Top-Left Y" value={tlY} setValue={setTlY} />
              <SliderRow label="Top-Right Y" value={trY} setValue={setTrY} />
              <SliderRow label="Bottom-Right Y" value={brY} setValue={setBrY} />
              <SliderRow label="Bottom-Left Y" value={blY} setValue={setBlY} />
            </>
          )}
        </div>
      </div>

      {/* Presets */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <label class="block text-sm font-medium text-gray-300 mb-3">Presets</label>
        <div class="flex flex-wrap gap-2">
          {presets.map(p => (
            <button key={p.name} onClick={() => applyPreset(p)}
              class="px-3 py-1.5 rounded-md text-sm border bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
              {p.name}
            </button>
          ))}
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
        <p class="font-medium text-gray-300 mb-1">About CSS Border Radius</p>
        <p>The <code class="text-green-400">border-radius</code> property rounds the corners of an element. You can set all corners equally, or control each corner individually. The elliptical mode lets you set different horizontal and vertical radii for organic, pill, or blob shapes.</p>
      </div>
    </div>
  );
}
