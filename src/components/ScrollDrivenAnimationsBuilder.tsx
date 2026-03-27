import { useState, useEffect, useRef } from 'preact/hooks';

type AnimationType = 'fade' | 'scale' | 'slide' | 'rotate' | 'blur' | 'color';
type TimelineType = 'scroll' | 'view';
type ScrollAxis = 'block' | 'inline';
type ScrollSource = 'root' | 'nearest' | 'self';

interface Config {
  animationType: AnimationType;
  timelineType: TimelineType;
  scrollSource: ScrollSource;
  scrollAxis: ScrollAxis;
  rangeStart: string;
  rangeEnd: string;
  duration: string;
  easing: string;
}

const ANIMATION_TYPES: Record<AnimationType, { label: string; icon: string; fromStyle: string; toStyle: string }> = {
  fade: { label: 'Fade', icon: '👻', fromStyle: 'opacity: 0', toStyle: 'opacity: 1' },
  scale: { label: 'Scale', icon: '📐', fromStyle: 'transform: scale(0.5)', toStyle: 'transform: scale(1)' },
  slide: { label: 'Slide In', icon: '➡️', fromStyle: 'transform: translateX(-60px); opacity: 0', toStyle: 'transform: translateX(0); opacity: 1' },
  rotate: { label: 'Rotate', icon: '🔄', fromStyle: 'transform: rotate(-90deg); opacity: 0', toStyle: 'transform: rotate(0deg); opacity: 1' },
  blur: { label: 'Blur In', icon: '🌫️', fromStyle: 'filter: blur(12px); opacity: 0', toStyle: 'filter: blur(0); opacity: 1' },
  color: { label: 'Color Shift', icon: '🎨', fromStyle: 'background: #6366f1; color: white', toStyle: 'background: #10b981; color: white' },
};

function buildCSS(cfg: Config): string {
  const anim = ANIMATION_TYPES[cfg.animationType];
  const keyframeName = `scroll-${cfg.animationType}`;

  const timelineDecl = cfg.timelineType === 'scroll'
    ? `animation-timeline: scroll(${cfg.scrollSource} ${cfg.scrollAxis});`
    : `animation-timeline: view(${cfg.scrollAxis});`;

  const rangeDecl = cfg.timelineType === 'view'
    ? `animation-range: ${cfg.rangeStart} ${cfg.rangeEnd};`
    : '';

  return `/* 1. Define the animation keyframes */
@keyframes ${keyframeName} {
  from {
    ${anim.fromStyle.split('; ').join(';\n    ')};
  }
  to {
    ${anim.toStyle.split('; ').join(';\n    ')};
  }
}

/* 2. Apply scroll-driven animation */
.scroll-animated {
  animation: ${keyframeName} ${cfg.duration} ${cfg.easing};
  ${timelineDecl}
  animation-fill-mode: both;${rangeDecl ? '\n  ' + rangeDecl : ''}
}${cfg.timelineType === 'scroll' ? `

/* scroll() = entire page scroll progress
   scroll(nearest) = nearest scrollable ancestor
   scroll(self) = element itself (if scrollable) */` : `

/* view() = element's visibility in the viewport
   animation-range: 'entry 0% entry 100%' plays as element enters
   animation-range: 'exit 0% exit 100%' plays as element exits */`}`;
}

export default function ScrollDrivenAnimationsBuilder() {
  const [config, setConfig] = useState<Config>({
    animationType: 'fade',
    timelineType: 'view',
    scrollSource: 'root',
    scrollAxis: 'block',
    rangeStart: 'entry 0%',
    rangeEnd: 'entry 100%',
    duration: 'auto',
    easing: 'linear',
  });
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<HTMLDivElement>(null);

  const css = buildCSS(config);
  const anim = ANIMATION_TYPES[config.animationType];

  const copy = () => {
    navigator.clipboard.writeText(css).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // CSS for preview keyframe
  const previewAnimName = `preview-scroll-anim-${previewKey}`;
  const previewCSS = `
    @keyframes ${previewAnimName} {
      from { ${anim.fromStyle}; }
      to { ${anim.toStyle}; }
    }
  `;

  const runPreview = () => {
    setPreviewKey(k => k + 1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      setTimeout(() => {
        scrollContainerRef.current?.scrollTo({ top: 200, behavior: 'smooth' });
      }, 100);
    }
  };

  const previewItemStyle = {
    animation: `${previewAnimName} 0.6s ${config.easing} both`,
  };

  const VIEW_RANGE_PRESETS = [
    { label: 'Enter viewport', start: 'entry 0%', end: 'entry 100%' },
    { label: 'Exit viewport', start: 'exit 0%', end: 'exit 100%' },
    { label: 'Full scroll', start: 'entry 0%', end: 'exit 100%' },
    { label: 'Center reveal', start: 'entry 25%', end: 'entry 75%' },
  ];

  return (
    <div class="space-y-6">
      <style>{previewCSS}</style>

      {/* Animation Type */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Animation Type</h2>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(Object.keys(ANIMATION_TYPES) as AnimationType[]).map(type => (
            <button
              key={type}
              onClick={() => setConfig(c => ({ ...c, animationType: type }))}
              class={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-sm ${config.animationType === type ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
            >
              <span class="text-xl">{ANIMATION_TYPES[type].icon}</span>
              <span class="text-xs">{ANIMATION_TYPES[type].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div class="bg-surface rounded-xl p-5 border border-border space-y-4">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Timeline Settings</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium block mb-1">Timeline Type</label>
            <div class="flex gap-2">
              {(['scroll', 'view'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setConfig(c => ({ ...c, timelineType: t }))}
                  class={`flex-1 py-2 rounded-lg border text-sm transition-colors ${config.timelineType === t ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent/50'}`}
                >
                  {t === 'scroll' ? 'scroll()' : 'view()'}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">
              {config.timelineType === 'scroll' ? 'Tied to scroll position of a container' : 'Tied to element visibility in viewport'}
            </p>
          </div>

          <div>
            <label class="text-sm font-medium block mb-1">Scroll Axis</label>
            <div class="flex gap-2">
              {(['block', 'inline'] as const).map(axis => (
                <button
                  key={axis}
                  onClick={() => setConfig(c => ({ ...c, scrollAxis: axis }))}
                  class={`flex-1 py-2 rounded-lg border text-sm transition-colors ${config.scrollAxis === axis ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent/50'}`}
                >
                  {axis}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">block = vertical, inline = horizontal</p>
          </div>
        </div>

        {config.timelineType === 'scroll' && (
          <div>
            <label class="text-sm font-medium block mb-1">Scroll Source</label>
            <div class="flex gap-2">
              {(['root', 'nearest', 'self'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setConfig(c => ({ ...c, scrollSource: src }))}
                  class={`flex-1 py-2 rounded-lg border text-sm transition-colors ${config.scrollSource === src ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent/50'}`}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>
        )}

        {config.timelineType === 'view' && (
          <>
            <div>
              <label class="text-sm font-medium block mb-2">animation-range Presets</label>
              <div class="flex flex-wrap gap-2">
                {VIEW_RANGE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setConfig(c => ({ ...c, rangeStart: p.start, rangeEnd: p.end }))}
                    class={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${config.rangeStart === p.start && config.rangeEnd === p.end ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent/50'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-text-muted block mb-1">Range Start</label>
                <input
                  type="text"
                  value={config.rangeStart}
                  onInput={(e) => setConfig(c => ({ ...c, rangeStart: (e.target as HTMLInputElement).value }))}
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">Range End</label>
                <input
                  type="text"
                  value={config.rangeEnd}
                  onInput={(e) => setConfig(c => ({ ...c, rangeEnd: (e.target as HTMLInputElement).value }))}
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
                />
              </div>
            </div>
          </>
        )}

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-sm font-medium block mb-1">Duration</label>
            <input
              type="text"
              value={config.duration}
              onInput={(e) => setConfig(c => ({ ...c, duration: (e.target as HTMLInputElement).value }))}
              placeholder="auto"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
            <p class="text-xs text-text-muted mt-1">"auto" = fill entire scroll range</p>
          </div>
          <div>
            <label class="text-sm font-medium block mb-1">Easing</label>
            <select
              value={config.easing}
              onChange={(e) => setConfig(c => ({ ...c, easing: (e.target as HTMLSelectElement).value }))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            >
              {['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scroll Preview */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Scroll Preview</h2>
          <button
            onClick={runPreview}
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            Play Animation
          </button>
        </div>
        <div ref={scrollContainerRef} class="h-40 bg-bg rounded-lg border border-border overflow-y-auto">
          <div class="h-20 flex items-center justify-center text-text-muted text-sm">↓ Scroll down</div>
          <div class="flex items-center justify-center py-8">
            <div
              key={previewKey}
              ref={animRef}
              style={previewItemStyle}
              class="bg-accent/20 border border-accent/40 rounded-lg px-6 py-3 text-sm font-medium text-accent"
            >
              {anim.label} animation preview
            </div>
          </div>
          <div class="h-20 flex items-center justify-center text-text-muted text-sm">↑ Scroll up</div>
        </div>
        <p class="text-xs text-text-muted mt-2">Click "Play Animation" to trigger or scroll the container above.</p>
      </div>

      {/* Code Output */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <span class="text-sm font-semibold">Generated CSS</span>
          <button
            onClick={copy}
            class="px-3 py-1.5 rounded-lg border border-border hover:border-accent text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="p-4 text-sm font-mono overflow-x-auto text-text-muted leading-relaxed max-h-80">
          <code>{css}</code>
        </pre>
      </div>

      {/* Browser Support */}
      <div class="bg-surface rounded-xl p-5 border border-border text-sm text-text-muted">
        <p class="font-medium text-text mb-2">Browser Support</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { name: 'Chrome', since: '115+', ok: true },
            { name: 'Edge', since: '115+', ok: true },
            { name: 'Safari', since: '18+', ok: true },
            { name: 'Firefox', since: '110+ (flag)', ok: false },
          ].map(({ name, since, ok }) => (
            <div key={name} class="flex items-center gap-2 bg-bg rounded-lg px-3 py-2 border border-border">
              <span class={ok ? 'text-green-500' : 'text-amber-500'}>{ok ? '✓' : '~'}</span>
              <div>
                <p class="font-medium text-text">{name}</p>
                <p class="text-xs">{since}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
