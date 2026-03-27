import { useState, useRef } from 'preact/hooks';

type TransitionProperty = 'all' | 'opacity' | 'transform' | 'background-color' | 'color' | 'border-color' | 'box-shadow' | 'width' | 'height' | 'margin' | 'padding';
type TimingFunction = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'step-start' | 'step-end';

const PROPERTIES: TransitionProperty[] = ['all', 'opacity', 'transform', 'background-color', 'color', 'border-color', 'box-shadow', 'width', 'height', 'margin', 'padding'];
const TIMING_FUNCTIONS: TimingFunction[] = ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end'];

const SELECT_CLASS = 'bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';
const RANGE_CLASS = 'w-full accent-primary';

function generateCss(property: string, duration: number, delay: number, timing: string, customCubic: string, useCustom: boolean) {
  const timingValue = useCustom ? customCubic : timing;
  return `transition: ${property} ${duration}ms ${timingValue} ${delay}ms;`;
}

export default function CssTransitionGenerator() {
  const [property, setProperty] = useState<TransitionProperty>('all');
  const [duration, setDuration] = useState(300);
  const [delay, setDelay] = useState(0);
  const [timing, setTiming] = useState<TimingFunction>('ease');
  const [useCustomCubic, setUseCustomCubic] = useState(false);
  const [customCubic, setCustomCubic] = useState('cubic-bezier(0.25, 0.1, 0.25, 1)');
  const [copied, setCopied] = useState(false);
  const [hovering, setHovering] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const css = generateCss(property, duration, delay, timing, customCubic, useCustomCubic);

  function handleCopy() {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const timingValue = useCustomCubic ? customCubic : timing;
  const previewStyle = {
    transition: `${property} ${duration}ms ${timingValue} ${delay}ms`,
    background: hovering ? '#6366f1' : '#3b82f6',
    transform: hovering ? 'scale(1.15) rotate(6deg)' : 'scale(1) rotate(0deg)',
    opacity: hovering ? '1' : property === 'opacity' ? '0.4' : '1',
    boxShadow: hovering ? '0 8px 32px rgba(99,102,241,0.4)' : '0 2px 8px rgba(59,130,246,0.2)',
    width: property === 'width' ? (hovering ? '200px' : '80px') : '80px',
    height: property === 'height' ? (hovering ? '120px' : '80px') : '80px',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: '600',
    fontSize: '13px',
    userSelect: 'none' as const,
    margin: '0 auto',
  };

  return (
    <div class="space-y-6">
      {/* Controls */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-bg-card border border-border rounded-xl p-5">
        {/* Property */}
        <div>
          <label class="block text-sm font-medium mb-1.5">Property</label>
          <select class={SELECT_CLASS} value={property} onChange={e => setProperty((e.target as HTMLSelectElement).value as TransitionProperty)}>
            {PROPERTIES.map(p => <option value={p}>{p}</option>)}
          </select>
        </div>

        {/* Timing Function */}
        <div>
          <label class="block text-sm font-medium mb-1.5">Timing Function</label>
          <select class={SELECT_CLASS} value={timing} onChange={e => setTiming((e.target as HTMLSelectElement).value as TimingFunction)} disabled={useCustomCubic}>
            {TIMING_FUNCTIONS.map(t => <option value={t}>{t}</option>)}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label class="block text-sm font-medium mb-1.5">
            Duration: <span class="font-mono text-primary">{duration}ms</span>
          </label>
          <input type="range" min={50} max={2000} step={50} value={duration} onInput={e => setDuration(Number((e.target as HTMLInputElement).value))} class={RANGE_CLASS} />
          <div class="flex justify-between text-xs text-text-muted mt-1"><span>50ms</span><span>2000ms</span></div>
        </div>

        {/* Delay */}
        <div>
          <label class="block text-sm font-medium mb-1.5">
            Delay: <span class="font-mono text-primary">{delay}ms</span>
          </label>
          <input type="range" min={0} max={1000} step={50} value={delay} onInput={e => setDelay(Number((e.target as HTMLInputElement).value))} class={RANGE_CLASS} />
          <div class="flex justify-between text-xs text-text-muted mt-1"><span>0ms</span><span>1000ms</span></div>
        </div>

        {/* Custom cubic-bezier */}
        <div class="md:col-span-2">
          <label class="flex items-center gap-2 text-sm font-medium mb-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={useCustomCubic} onChange={e => setUseCustomCubic((e.target as HTMLInputElement).checked)} class="rounded" />
            Use custom cubic-bezier
          </label>
          {useCustomCubic && (
            <input
              type="text"
              value={customCubic}
              onInput={e => setCustomCubic((e.target as HTMLInputElement).value)}
              placeholder="cubic-bezier(0.25, 0.1, 0.25, 1)"
              class="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono w-full focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          )}
        </div>
      </div>

      {/* Live Preview */}
      <div class="bg-bg-card border border-border rounded-xl p-6">
        <p class="text-sm font-medium mb-4 text-text-muted">Live Preview — hover the box to trigger the transition</p>
        <div class="min-h-[140px] bg-bg-base rounded-lg flex items-center justify-center border border-dashed border-border">
          <div
            style={previewStyle}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            ref={previewRef}
          >
            {hovering ? 'Release' : 'Hover me'}
          </div>
        </div>
      </div>

      {/* Generated CSS */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium">Generated CSS</p>
          <button
            onClick={handleCopy}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {copied ? '✓ Copied!' : '⎘ Copy'}
          </button>
        </div>
        <pre class="bg-bg-base rounded-lg p-4 text-sm font-mono overflow-x-auto border border-border text-green-400">{css}</pre>
      </div>
    </div>
  );
}
