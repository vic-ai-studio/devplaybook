import { useState, useRef } from 'preact/hooks';

type EasingKey = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'cubic-bezier(0.34,1.56,0.64,1)' | 'cubic-bezier(0.68,-0.55,0.27,1.55)';

interface AnimConfig {
  name: string;
  duration: number;
  easing: EasingKey;
  delay: number;
  iterations: string;
  direction: string;
  fillMode: string;
  preset: string;
}

const PRESETS: Record<string, { keyframes: string; label: string; icon: string }> = {
  fadeIn: {
    label: 'Fade In',
    icon: '👻',
    keyframes: `from { opacity: 0; }
to { opacity: 1; }`,
  },
  slideInLeft: {
    label: 'Slide In Left',
    icon: '⬅️',
    keyframes: `from { opacity: 0; transform: translateX(-40px); }
to { opacity: 1; transform: translateX(0); }`,
  },
  slideInUp: {
    label: 'Slide In Up',
    icon: '⬆️',
    keyframes: `from { opacity: 0; transform: translateY(30px); }
to { opacity: 1; transform: translateY(0); }`,
  },
  bounceIn: {
    label: 'Bounce In',
    icon: '🏀',
    keyframes: `0% { opacity: 0; transform: scale(0.3); }
50% { opacity: 1; transform: scale(1.05); }
70% { transform: scale(0.9); }
100% { transform: scale(1); }`,
  },
  pulse: {
    label: 'Pulse',
    icon: '💓',
    keyframes: `0%, 100% { transform: scale(1); }
50% { transform: scale(1.08); }`,
  },
  shake: {
    label: 'Shake',
    icon: '📳',
    keyframes: `0%, 100% { transform: translateX(0); }
20% { transform: translateX(-8px); }
40% { transform: translateX(8px); }
60% { transform: translateX(-6px); }
80% { transform: translateX(6px); }`,
  },
  spin: {
    label: 'Spin',
    icon: '🔄',
    keyframes: `from { transform: rotate(0deg); }
to { transform: rotate(360deg); }`,
  },
  flipX: {
    label: 'Flip X',
    icon: '🔀',
    keyframes: `from { transform: perspective(400px) rotateY(90deg); opacity: 0; }
to { transform: perspective(400px) rotateY(0deg); opacity: 1; }`,
  },
  zoomIn: {
    label: 'Zoom In',
    icon: '🔍',
    keyframes: `from { opacity: 0; transform: scale(0.5); }
to { opacity: 1; transform: scale(1); }`,
  },
  wiggle: {
    label: 'Wiggle',
    icon: '〰️',
    keyframes: `0%, 100% { transform: rotate(0deg); }
25% { transform: rotate(-6deg); }
75% { transform: rotate(6deg); }`,
  },
};

const EASINGS: { value: EasingKey; label: string }[] = [
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'linear', label: 'Linear' },
  { value: 'cubic-bezier(0.34,1.56,0.64,1)', label: 'Spring (subtle)' },
  { value: 'cubic-bezier(0.68,-0.55,0.27,1.55)', label: 'Spring (bouncy)' },
];

function buildCSS(config: AnimConfig, keyframes: string): string {
  const kfLines = keyframes.split('\n').map(l => '  ' + l).join('\n');
  return `@keyframes ${config.name} {\n${kfLines}\n}\n\n.${config.name} {\n  animation: ${config.name} ${config.duration}ms ${config.easing} ${config.delay}ms ${config.iterations} ${config.direction} ${config.fillMode};\n}`;
}

export default function CssAnimationGenerator() {
  const [config, setConfig] = useState<AnimConfig>({
    name: 'fadeIn',
    duration: 600,
    easing: 'ease',
    delay: 0,
    iterations: '1',
    direction: 'normal',
    fillMode: 'both',
    preset: 'fadeIn',
  });
  const [keyframes, setKeyframes] = useState(PRESETS.fadeIn.keyframes);
  const [customKeyframes, setCustomKeyframes] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [copied, setCopied] = useState(false);

  function applyPreset(key: string) {
    const p = PRESETS[key];
    if (!p) return;
    setConfig(c => ({ ...c, preset: key, name: key }));
    setKeyframes(p.keyframes);
    setCustomKeyframes(false);
    setAnimKey(k => k + 1);
  }

  function set(field: keyof AnimConfig) {
    return (e: Event) => {
      const val = (e.target as HTMLInputElement).value;
      setConfig(c => ({ ...c, [field]: field === 'duration' || field === 'delay' ? Number(val) : val }));
    };
  }

  const css = buildCSS(config, keyframes);

  function copy() {
    navigator.clipboard?.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const previewStyle = {
    animation: `${config.name} ${config.duration}ms ${config.easing} ${config.delay}ms ${config.iterations} ${config.direction} ${config.fillMode}`,
  };

  return (
    <div class="space-y-5">
      {/* Preset picker */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <p class="text-sm font-medium text-gray-300 mb-3">Animation presets</p>
        <div class="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              class={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${config.preset === key ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-indigo-500'}`}
            >
              {p.icon} {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config grid */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <label class="text-xs text-gray-400 block mb-1">Duration (ms)</label>
          <input
            type="number" min="50" max="5000" step="50"
            value={config.duration}
            onInput={set('duration')}
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <label class="text-xs text-gray-400 block mb-1">Delay (ms)</label>
          <input
            type="number" min="0" max="3000" step="50"
            value={config.delay}
            onInput={set('delay')}
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <label class="text-xs text-gray-400 block mb-1">Easing</label>
          <select
            value={config.easing}
            onChange={set('easing')}
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          >
            {EASINGS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
        </div>
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <label class="text-xs text-gray-400 block mb-1">Iterations</label>
          <select
            value={config.iterations}
            onChange={set('iterations')}
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          >
            {['1', '2', '3', 'infinite'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <label class="text-xs text-gray-400 block mb-1">Direction</label>
          <select
            value={config.direction}
            onChange={set('direction')}
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          >
            {['normal', 'reverse', 'alternate', 'alternate-reverse'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-3">
          <label class="text-xs text-gray-400 block mb-1">Fill Mode</label>
          <select
            value={config.fillMode}
            onChange={set('fillMode')}
            class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
          >
            {['none', 'forwards', 'backwards', 'both'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Preview */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div class="flex items-center justify-between mb-4">
          <p class="text-sm font-medium text-gray-300">Preview</p>
          <button
            onClick={() => setAnimKey(k => k + 1)}
            class="text-xs text-gray-400 hover:text-indigo-400 border border-gray-700 hover:border-indigo-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            ▶ Replay
          </button>
        </div>
        <div class="h-32 flex items-center justify-center">
          <style>{`@keyframes ${config.name} { ${keyframes} }`}</style>
          <div
            key={animKey}
            style={previewStyle}
            class="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center text-2xl"
          >
            ✦
          </div>
        </div>
      </div>

      {/* Keyframes editor */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm text-gray-300">@keyframes {config.name}</span>
          <button
            onClick={() => setCustomKeyframes(v => !v)}
            class="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
          >
            {customKeyframes ? 'Lock' : 'Edit'}
          </button>
        </div>
        <textarea
          value={keyframes}
          onInput={e => { setKeyframes((e.target as HTMLTextAreaElement).value); setAnimKey(k => k + 1); }}
          readOnly={!customKeyframes}
          rows={5}
          class={`w-full bg-transparent text-gray-300 px-4 py-3 text-sm font-mono resize-none focus:outline-none ${customKeyframes ? 'text-gray-100' : 'text-gray-500'}`}
          spellcheck={false}
        />
      </div>

      {/* Output CSS */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm text-gray-300">CSS Output</span>
          <button
            onClick={copy}
            class="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy CSS'}
          </button>
        </div>
        <pre class="text-xs text-gray-300 px-4 py-3 overflow-x-auto font-mono whitespace-pre">{css}</pre>
      </div>
    </div>
  );
}
