import { useState } from 'preact/hooks';

type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'morph';
type FillMode = 'both' | 'forwards' | 'backwards' | 'none';
type TimingFn = 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

interface Config {
  type: TransitionType;
  duration: number;
  easing: TimingFn;
  fill: FillMode;
  name: string;
}

const TRANSITIONS: Record<TransitionType, { label: string; icon: string; oldKeyframes: string; newKeyframes: string }> = {
  fade: {
    label: 'Fade',
    icon: '👻',
    oldKeyframes: `@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
    newKeyframes: `@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  },
  'slide-left': {
    label: 'Slide Left',
    icon: '⬅️',
    oldKeyframes: `@keyframes slide-out-left {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(-100%); opacity: 0; }
}`,
    newKeyframes: `@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
  },
  'slide-right': {
    label: 'Slide Right',
    icon: '➡️',
    oldKeyframes: `@keyframes slide-out-right {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}`,
    newKeyframes: `@keyframes slide-in-left {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
  },
  'slide-up': {
    label: 'Slide Up',
    icon: '⬆️',
    oldKeyframes: `@keyframes slide-out-down {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(30px); opacity: 0; }
}`,
    newKeyframes: `@keyframes slide-in-up {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  },
  'slide-down': {
    label: 'Slide Down',
    icon: '⬇️',
    oldKeyframes: `@keyframes slide-out-up {
  from { transform: translateY(0); opacity: 1; }
  to { transform: translateY(-30px); opacity: 0; }
}`,
    newKeyframes: `@keyframes slide-in-down {
  from { transform: translateY(-30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  },
  'zoom-in': {
    label: 'Zoom In',
    icon: '🔍',
    oldKeyframes: `@keyframes zoom-out {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(0.85); opacity: 0; }
}`,
    newKeyframes: `@keyframes zoom-in {
  from { transform: scale(1.15); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`,
  },
  'zoom-out': {
    label: 'Zoom Out',
    icon: '🔎',
    oldKeyframes: `@keyframes zoom-out-large {
  from { transform: scale(1); opacity: 1; }
  to { transform: scale(1.15); opacity: 0; }
}`,
    newKeyframes: `@keyframes zoom-in-small {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`,
  },
  morph: {
    label: 'Morph (Shared)',
    icon: '✨',
    oldKeyframes: `/* No custom keyframes needed —
   the browser morphs between the two
   elements automatically via view-transition-name */`,
    newKeyframes: `/* The browser handles the interpolation.
   You can add extra motion on top:
@keyframes morph-in {
  from { transform: scale(0.95); }
  to { transform: scale(1); }
} */`,
  },
};

function buildCSS(cfg: Config): string {
  const t = TRANSITIONS[cfg.type];
  const animName1 = cfg.type === 'morph' ? 'none' :
    cfg.type === 'fade' ? 'fade-out' :
    cfg.type.startsWith('slide') ? `slide-out-${cfg.type.split('-')[1]}` :
    cfg.type === 'zoom-in' ? 'zoom-out' : 'zoom-out-large';
  const animName2 = cfg.type === 'morph' ? 'none' :
    cfg.type === 'fade' ? 'fade-in' :
    cfg.type === 'slide-left' ? 'slide-in-right' :
    cfg.type === 'slide-right' ? 'slide-in-left' :
    cfg.type === 'slide-up' ? 'slide-in-up' :
    cfg.type === 'slide-down' ? 'slide-in-down' :
    cfg.type === 'zoom-in' ? 'zoom-in' : 'zoom-in-small';

  return `/* ─── View Transition: ${t.label} ─── */

/* 1. Keyframes */
${t.oldKeyframes}

${t.newKeyframes}

/* 2. Apply to the transition pseudo-elements */
::view-transition-old(${cfg.name}) {
  animation: ${cfg.duration}ms ${cfg.easing} ${cfg.fill} ${animName1};
}

::view-transition-new(${cfg.name}) {
  animation: ${cfg.duration}ms ${cfg.easing} ${cfg.fill} ${animName2};
}${cfg.type === 'morph' ? `

/* 3. Tag the elements to morph between */
.hero-image {
  view-transition-name: ${cfg.name};
}` : ''}`;
}

function buildJS(cfg: Config): string {
  return `// Trigger a View Transition
async function navigate(url) {
  // Check for browser support
  if (!document.startViewTransition) {
    window.location.href = url;
    return;
  }

  const response = await fetch(url);
  const html = await response.text();
  const parser = new DOMParser();
  const newDoc = parser.parseFromString(html, 'text/html');

  await document.startViewTransition(() => {
    // Swap the page content
    document.body.innerHTML = newDoc.body.innerHTML;
    document.title = newDoc.title;
    history.pushState({}, '', url);
  });
}

// Example: intercept link clicks
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link || link.origin !== location.origin) return;
  e.preventDefault();
  navigate(link.href);
});`;
}

export default function ViewTransitionsGenerator() {
  const [config, setConfig] = useState<Config>({
    type: 'fade',
    duration: 300,
    easing: 'ease',
    fill: 'both',
    name: 'root',
  });
  const [tab, setTab] = useState<'css' | 'js'>('css');
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewPage, setPreviewPage] = useState(0);

  const css = buildCSS(config);
  const js = buildJS(config);

  const copy = () => {
    const text = tab === 'css' ? css : js;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const triggerPreview = () => {
    setPreviewKey(k => k + 1);
    setPreviewPage(p => (p + 1) % 3);
  };

  const pages = [
    { bg: 'bg-indigo-100 dark:bg-indigo-950', title: 'Home', icon: '🏠', desc: 'Welcome to the page' },
    { bg: 'bg-emerald-100 dark:bg-emerald-950', title: 'About', icon: '👤', desc: 'Learn about us' },
    { bg: 'bg-rose-100 dark:bg-rose-950', title: 'Contact', icon: '✉️', desc: 'Get in touch' },
  ];
  const page = pages[previewPage];

  const animStyle = {
    animation: `preview-anim ${config.duration}ms ${config.easing} ${config.fill}`,
  };

  const animCSS = config.type === 'fade'
    ? `@keyframes preview-anim { from { opacity: 0; } to { opacity: 1; } }`
    : config.type.startsWith('slide-left') || config.type === 'slide-right'
    ? `@keyframes preview-anim { from { transform: translateX(${config.type === 'slide-right' ? '-30px' : '30px'}); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`
    : config.type === 'slide-up' || config.type === 'slide-down'
    ? `@keyframes preview-anim { from { transform: translateY(${config.type === 'slide-down' ? '-20px' : '20px'}); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`
    : config.type === 'zoom-in'
    ? `@keyframes preview-anim { from { transform: scale(1.1); opacity: 0; } to { transform: scale(1); opacity: 1; } }`
    : config.type === 'zoom-out'
    ? `@keyframes preview-anim { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }`
    : `@keyframes preview-anim { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }`;

  return (
    <div class="space-y-6">
      <style>{animCSS}</style>

      {/* Transition Type */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Transition Type</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(TRANSITIONS) as TransitionType[]).map(type => (
            <button
              key={type}
              onClick={() => setConfig(c => ({ ...c, type }))}
              class={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-sm ${config.type === type ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
            >
              <span class="text-xl">{TRANSITIONS[type].icon}</span>
              <span>{TRANSITIONS[type].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div class="bg-surface rounded-xl p-5 border border-border space-y-4">
        <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Settings</h2>

        <div>
          <div class="flex justify-between mb-1">
            <label class="text-sm font-medium">Duration</label>
            <span class="font-mono text-sm text-text-muted">{config.duration}ms</span>
          </div>
          <input
            type="range" min="100" max="1000" step="50" value={config.duration}
            onInput={(e) => setConfig(c => ({ ...c, duration: parseInt((e.target as HTMLInputElement).value) }))}
            class="w-full accent-accent"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="text-sm font-medium block mb-1">Easing</label>
            <select
              value={config.easing}
              onChange={(e) => setConfig(c => ({ ...c, easing: (e.target as HTMLSelectElement).value as TimingFn }))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            >
              {['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label class="text-sm font-medium block mb-1">Fill Mode</label>
            <select
              value={config.fill}
              onChange={(e) => setConfig(c => ({ ...c, fill: (e.target as HTMLSelectElement).value as FillMode }))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
            >
              {['both', 'forwards', 'backwards', 'none'].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          <div>
            <label class="text-sm font-medium block mb-1">view-transition-name</label>
            <input
              type="text"
              value={config.name}
              onInput={(e) => setConfig(c => ({ ...c, name: (e.target as HTMLInputElement).value || 'root' }))}
              placeholder="root"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Live Preview</h2>
          <button
            onClick={triggerPreview}
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
          >
            Simulate Transition →
          </button>
        </div>
        <div class="rounded-lg overflow-hidden border border-border h-32 flex items-center justify-center relative">
          <div key={previewKey} class={`${page.bg} w-full h-full flex flex-col items-center justify-center gap-1`} style={animStyle}>
            <span class="text-3xl">{page.icon}</span>
            <span class="font-semibold">{page.title}</span>
            <span class="text-sm text-text-muted">{page.desc}</span>
          </div>
        </div>
        <p class="text-xs text-text-muted mt-2">Click "Simulate Transition" to preview the animation. Note: browser View Transitions API provides smoother cross-document effects.</p>
      </div>

      {/* Code Output */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <div class="flex gap-1">
            {(['css', 'js'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-accent text-white' : 'hover:bg-bg'}`}
              >
                {t === 'css' ? 'CSS' : 'JavaScript'}
              </button>
            ))}
          </div>
          <button
            onClick={copy}
            class="px-3 py-1.5 rounded-lg border border-border hover:border-accent text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 text-sm font-mono overflow-x-auto text-text-muted leading-relaxed">
          <code>{tab === 'css' ? css : js}</code>
        </pre>
      </div>

      {/* Browser Support */}
      <div class="bg-surface rounded-xl p-5 border border-border text-sm text-text-muted">
        <p class="font-medium text-text mb-2">Browser Support</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { name: 'Chrome', since: '111+', ok: true },
            { name: 'Edge', since: '111+', ok: true },
            { name: 'Safari', since: '18+', ok: true },
            { name: 'Firefox', since: 'Partial', ok: false },
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
        <p class="mt-3">Always include a fallback: <code class="bg-bg px-1 rounded">if (!document.startViewTransition) {'{ /* fallback */ }'}</code></p>
      </div>
    </div>
  );
}
