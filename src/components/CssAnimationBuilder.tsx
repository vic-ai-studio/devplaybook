import { useState, useEffect } from 'preact/hooks';

type TimingFunction = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'cubic-bezier';
type IterationCount = '1' | '2' | '3' | 'infinite';
type Direction = 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
type FillMode = 'none' | 'forwards' | 'backwards' | 'both';
type AnimationProperty = 'transform-translate' | 'transform-scale' | 'transform-rotate' | 'opacity' | 'color' | 'background-color';

interface Keyframe {
  label: string;      // '0%', '50%', '100%'
  value: string;
}

const PROPERTY_DEFAULTS: Record<AnimationProperty, { from: string; mid: string; to: string; cssProperty: string }> = {
  'transform-translate': { from: 'translateX(0px)', mid: 'translateX(50px)', to: 'translateX(100px)', cssProperty: 'transform' },
  'transform-scale':    { from: 'scale(1)',          mid: 'scale(1.5)',       to: 'scale(1)',           cssProperty: 'transform' },
  'transform-rotate':   { from: 'rotate(0deg)',      mid: 'rotate(180deg)',   to: 'rotate(360deg)',     cssProperty: 'transform' },
  'opacity':            { from: '0',                 mid: '0.5',              to: '1',                  cssProperty: 'opacity' },
  'color':              { from: '#3b82f6',            mid: '#8b5cf6',          to: '#ec4899',            cssProperty: 'color' },
  'background-color':   { from: '#3b82f6',            mid: '#8b5cf6',          to: '#ec4899',            cssProperty: 'background-color' },
};

const PROPERTY_LABELS: Record<AnimationProperty, string> = {
  'transform-translate': 'Transform — Translate',
  'transform-scale':     'Transform — Scale',
  'transform-rotate':    'Transform — Rotate',
  'opacity':             'Opacity',
  'color':               'Color',
  'background-color':    'Background Color',
};

export default function CssAnimationBuilder() {
  const [animationName, setAnimationName] = useState('myAnimation');
  const [property, setProperty] = useState<AnimationProperty>('transform-translate');
  const [fromValue, setFromValue] = useState(PROPERTY_DEFAULTS['transform-translate'].from);
  const [midValue, setMidValue] = useState(PROPERTY_DEFAULTS['transform-translate'].mid);
  const [toValue, setToValue] = useState(PROPERTY_DEFAULTS['transform-translate'].to);
  const [useMidpoint, setUseMidpoint] = useState(false);
  const [duration, setDuration] = useState(1.0);
  const [timingFunction, setTimingFunction] = useState<TimingFunction>('ease-in-out');
  const [cubicBezier, setCubicBezier] = useState('0.25, 0.1, 0.25, 1');
  const [delay, setDelay] = useState(0);
  const [iterationCount, setIterationCount] = useState<IterationCount>('infinite');
  const [direction, setDirection] = useState<Direction>('normal');
  const [fillMode, setFillMode] = useState<FillMode>('none');
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  function handlePropertyChange(p: AnimationProperty) {
    setProperty(p);
    const d = PROPERTY_DEFAULTS[p];
    setFromValue(d.from);
    setMidValue(d.mid);
    setToValue(d.to);
  }

  const cssProperty = PROPERTY_DEFAULTS[property].cssProperty;
  const safeAnimName = animationName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'myAnimation';
  const timingValue = timingFunction === 'cubic-bezier' ? `cubic-bezier(${cubicBezier})` : timingFunction;

  const generatedKeyframes = useMidpoint
    ? `@keyframes ${safeAnimName} {\n  0% { ${cssProperty}: ${fromValue}; }\n  50% { ${cssProperty}: ${midValue}; }\n  100% { ${cssProperty}: ${toValue}; }\n}`
    : `@keyframes ${safeAnimName} {\n  from { ${cssProperty}: ${fromValue}; }\n  to { ${cssProperty}: ${toValue}; }\n}`;

  const animationShorthand = `${safeAnimName} ${duration}s ${timingValue} ${delay}s ${iterationCount} ${direction} ${fillMode}`;

  const animationCSS = `.element {\n  animation: ${animationShorthand};\n}`;

  const fullCSS = `${generatedKeyframes}\n\n${animationCSS}`;

  // Inline style for preview box
  const previewStyle: Record<string, string> = {
    animation: `${safeAnimName} ${duration}s ${timingValue} ${delay}s ${iterationCount} ${direction} ${fillMode}`,
  };

  // For color/background-color we need a base style
  if (property === 'color') {
    previewStyle['color'] = fromValue;
  } else if (property === 'background-color') {
    previewStyle['backgroundColor'] = fromValue;
  }

  function handleCopy() {
    navigator.clipboard.writeText(fullCSS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function restartPreview() {
    setPreviewKey(k => k + 1);
  }

  const isColorProperty = property === 'color' || property === 'background-color';

  return (
    <div class="space-y-6">
      {/* Animation Name */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-3">Animation Name</h2>
        <input
          type="text"
          value={animationName}
          onInput={(e) => setAnimationName((e.target as HTMLInputElement).value)}
          placeholder="myAnimation"
          class="w-full sm:w-64 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
        />
        <p class="text-xs text-text-muted mt-1">Used as the <code class="font-mono">@keyframes</code> name and in the <code class="font-mono">animation</code> shorthand.</p>
      </div>

      {/* Property */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-3">Animation Property</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(PROPERTY_LABELS) as AnimationProperty[]).map(p => (
            <button
              key={p}
              onClick={() => handlePropertyChange(p)}
              class={`py-2 px-3 rounded text-sm border transition-colors text-left ${
                property === p
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              {PROPERTY_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Keyframe Values */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-text">Keyframe Values</h2>
          <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={useMidpoint}
              onChange={(e) => setUseMidpoint((e.target as HTMLInputElement).checked)}
              class="accent-primary"
            />
            Add 50% midpoint
          </label>
        </div>
        <div class={`grid gap-3 ${useMidpoint ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <div>
            <label class="block text-xs text-text-muted mb-1 font-mono">from (0%)</label>
            {isColorProperty ? (
              <div class="flex gap-2 items-center">
                <input type="color" value={fromValue} onInput={(e) => setFromValue((e.target as HTMLInputElement).value)}
                  class="h-9 w-12 rounded border border-border bg-bg cursor-pointer" />
                <input type="text" value={fromValue} onInput={(e) => setFromValue((e.target as HTMLInputElement).value)}
                  class="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary" />
              </div>
            ) : (
              <input type="text" value={fromValue} onInput={(e) => setFromValue((e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary" />
            )}
          </div>
          {useMidpoint && (
            <div>
              <label class="block text-xs text-text-muted mb-1 font-mono">50%</label>
              {isColorProperty ? (
                <div class="flex gap-2 items-center">
                  <input type="color" value={midValue} onInput={(e) => setMidValue((e.target as HTMLInputElement).value)}
                    class="h-9 w-12 rounded border border-border bg-bg cursor-pointer" />
                  <input type="text" value={midValue} onInput={(e) => setMidValue((e.target as HTMLInputElement).value)}
                    class="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary" />
                </div>
              ) : (
                <input type="text" value={midValue} onInput={(e) => setMidValue((e.target as HTMLInputElement).value)}
                  class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary" />
              )}
            </div>
          )}
          <div>
            <label class="block text-xs text-text-muted mb-1 font-mono">to (100%)</label>
            {isColorProperty ? (
              <div class="flex gap-2 items-center">
                <input type="color" value={toValue} onInput={(e) => setToValue((e.target as HTMLInputElement).value)}
                  class="h-9 w-12 rounded border border-border bg-bg cursor-pointer" />
                <input type="text" value={toValue} onInput={(e) => setToValue((e.target as HTMLInputElement).value)}
                  class="flex-1 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary" />
              </div>
            ) : (
              <input type="text" value={toValue} onInput={(e) => setToValue((e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary" />
            )}
          </div>
        </div>
      </div>

      {/* Timing */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-4">Timing</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-text-muted mb-1">
              Duration: <span class="text-text font-medium">{duration.toFixed(1)}s</span>
            </label>
            <input
              type="range" min="0.1" max="5" step="0.1" value={duration}
              onInput={(e) => setDuration(Number((e.target as HTMLInputElement).value))}
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-text-muted mt-1"><span>0.1s</span><span>5s</span></div>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">
              Delay: <span class="text-text font-medium">{delay.toFixed(1)}s</span>
            </label>
            <input
              type="range" min="0" max="2" step="0.1" value={delay}
              onInput={(e) => setDelay(Number((e.target as HTMLInputElement).value))}
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-text-muted mt-1"><span>0s</span><span>2s</span></div>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Timing Function</label>
            <select
              value={timingFunction}
              onChange={(e) => setTimingFunction((e.target as HTMLSelectElement).value as TimingFunction)}
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="ease">ease</option>
              <option value="ease-in">ease-in</option>
              <option value="ease-out">ease-out</option>
              <option value="ease-in-out">ease-in-out</option>
              <option value="linear">linear</option>
              <option value="cubic-bezier">cubic-bezier (custom)</option>
            </select>
            {timingFunction === 'cubic-bezier' && (
              <input
                type="text"
                value={cubicBezier}
                onInput={(e) => setCubicBezier((e.target as HTMLInputElement).value)}
                placeholder="x1, y1, x2, y2"
                class="w-full mt-2 bg-bg border border-border rounded px-3 py-2 text-sm text-text font-mono focus:outline-none focus:border-primary"
              />
            )}
          </div>
        </div>
      </div>

      {/* Playback */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <h2 class="font-semibold text-text mb-4">Playback</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm text-text-muted mb-1">Iteration Count</label>
            <select
              value={iterationCount}
              onChange={(e) => setIterationCount((e.target as HTMLSelectElement).value as IterationCount)}
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="infinite">infinite</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Direction</label>
            <select
              value={direction}
              onChange={(e) => setDirection((e.target as HTMLSelectElement).value as Direction)}
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="normal">normal</option>
              <option value="reverse">reverse</option>
              <option value="alternate">alternate</option>
              <option value="alternate-reverse">alternate-reverse</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Fill Mode</label>
            <select
              value={fillMode}
              onChange={(e) => setFillMode((e.target as HTMLSelectElement).value as FillMode)}
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="none">none</option>
              <option value="forwards">forwards</option>
              <option value="backwards">backwards</option>
              <option value="both">both</option>
            </select>
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-text">Live Preview</h2>
          <button
            onClick={restartPreview}
            class="text-sm px-3 py-1.5 rounded border border-border text-text-muted hover:border-primary hover:text-text transition-colors"
          >
            ↺ Restart
          </button>
        </div>
        <div class="bg-bg border border-border rounded-lg flex items-center justify-center" style={{ minHeight: '160px' }}>
          <style dangerouslySetInnerHTML={{ __html: generatedKeyframes + '\n' + animationCSS }} />
          <div
            key={previewKey}
            class="element w-16 h-16 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{
              backgroundColor: property === 'background-color' ? fromValue : '#3b82f6',
              color: property === 'color' ? fromValue : 'white',
              animation: `${safeAnimName} ${duration}s ${timingValue} ${delay}s ${iterationCount} ${direction} ${fillMode}`,
            }}
          >
            Box
          </div>
        </div>
        <p class="text-xs text-text-muted mt-2">The box above animates using your configuration in real time. Click ↺ Restart to replay.</p>
      </div>

      {/* Generated CSS */}
      <div class="bg-surface border border-border rounded-lg p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Generated CSS</h2>
          <button
            onClick={handleCopy}
            class={`text-sm px-4 py-1.5 rounded border transition-colors ${
              copied
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-bg border-border text-text-muted hover:bg-primary hover:text-white hover:border-primary'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-relaxed">
          {fullCSS}
        </pre>
        <p class="text-xs text-text-muted mt-3">
          Add the <code class="font-mono">element</code> class to any HTML element to apply the animation. Paste the CSS into your stylesheet.
        </p>
      </div>
    </div>
  );
}
