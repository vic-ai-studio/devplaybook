import { useState } from 'preact/hooks';

interface Breakpoint {
  label: string;
  width: number;
  height: number;
  aspectRatio: string; // CSS aspect-ratio value
}

const BREAKPOINTS: Breakpoint[] = [
  { label: 'Mobile', width: 375, height: 667, aspectRatio: '9/16' },
  { label: 'Tablet', width: 768, height: 576, aspectRatio: '4/3' },
  { label: 'Laptop', width: 1024, height: 576, aspectRatio: '16/9' },
  { label: 'Desktop', width: 1440, height: 810, aspectRatio: '16/9' },
  { label: 'Wide', width: 1920, height: 1080, aspectRatio: '16/9' },
];

function getTailwindBreakpoint(w: number): string {
  if (w >= 1536) return '2xl (≥1536px)';
  if (w >= 1280) return 'xl (≥1280px)';
  if (w >= 1024) return 'lg (≥1024px)';
  if (w >= 768) return 'md (≥768px)';
  if (w >= 640) return 'sm (≥640px)';
  return 'xs (< 640px — no Tailwind prefix)';
}

function getAspectRatio(w: number): string {
  if (w <= 480) return '9/16';
  if (w <= 900) return '4/3';
  return '16/9';
}

function getFrameHeight(w: number): number {
  const ratio = getAspectRatio(w);
  const [rw, rh] = ratio.split('/').map(Number);
  return Math.round((w * rh) / rw);
}

// Scale iframe + container to fit within a max container width
const MAX_CONTAINER = 900; // px — max display width

export default function ResponsiveBreakpointTester() {
  const [url, setUrl] = useState('');
  const [activeWidth, setActiveWidth] = useState<number>(375);
  const [customWidth, setCustomWidth] = useState('');
  const [iframeSrc, setIframeSrc] = useState('');
  const [error, setError] = useState('');

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function loadUrl() {
    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError('Please enter a URL.');
      return;
    }
    try {
      new URL(normalized);
    } catch {
      setError('Invalid URL — please include a valid domain (e.g. example.com).');
      return;
    }
    setError('');
    setIframeSrc(normalized);
  }

  function applyCustomWidth() {
    const w = parseInt(customWidth, 10);
    if (isNaN(w) || w < 200 || w > 3840) {
      setError('Custom width must be between 200 and 3840px.');
      return;
    }
    setError('');
    setActiveWidth(w);
  }

  // Scale factor: fit activeWidth into MAX_CONTAINER
  const scale = activeWidth > MAX_CONTAINER ? MAX_CONTAINER / activeWidth : 1;
  const frameHeight = getFrameHeight(activeWidth);
  const displayWidth = Math.round(activeWidth * scale);
  const displayHeight = Math.round(frameHeight * scale);
  const tailwindBp = getTailwindBreakpoint(activeWidth);
  const currentBp = BREAKPOINTS.find((b) => b.width === activeWidth);
  const bpLabel = currentBp ? currentBp.label : 'Custom';

  return (
    <div class="space-y-5">
      {/* URL Input */}
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          URL to Preview
        </label>
        <div class="flex gap-2">
          <input
            type="url"
            value={url}
            placeholder="https://example.com"
            onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUrl()}
            class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <button
            onClick={loadUrl}
            class="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 whitespace-nowrap"
          >
            Load
          </button>
        </div>
        {error && (
          <p class="mt-2 text-sm text-red-500">{error}</p>
        )}
        <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Some sites block iframe embedding (X-Frame-Options). If the preview shows blank, try another URL or use Chrome DevTools device toolbar instead.
        </p>
      </div>

      {/* Breakpoint Controls */}
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          {BREAKPOINTS.map((bp) => (
            <button
              key={bp.width}
              onClick={() => setActiveWidth(bp.width)}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeWidth === bp.width
                  ? 'bg-blue-600 text-white border-blue-600 dark:border-blue-500'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
              }`}
            >
              {bp.label}
              <span class="ml-1.5 text-xs opacity-70">{bp.width}px</span>
            </button>
          ))}
        </div>

        {/* Custom width */}
        <div class="flex gap-2 items-center">
          <input
            type="number"
            min="200"
            max="3840"
            value={customWidth}
            placeholder="Custom width (px)"
            onInput={(e) => setCustomWidth((e.target as HTMLInputElement).value)}
            onKeyDown={(e) => e.key === 'Enter' && applyCustomWidth()}
            class="w-48 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
          />
          <button
            onClick={applyCustomWidth}
            class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Viewport info bar */}
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-mono">
          <svg class="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clip-rule="evenodd" />
          </svg>
          {activeWidth} × {frameHeight}px
        </div>
        <div class="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
          Tailwind: <span class="font-bold">{tailwindBp}</span>
        </div>
        <div class="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs">
          {bpLabel}{scale < 1 && ` — scaled to fit (${Math.round(scale * 100)}%)`}
        </div>
      </div>

      {/* iframe Preview */}
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800">
        {/* Browser chrome */}
        <div class="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <span class="w-3 h-3 rounded-full bg-red-400" />
          <span class="w-3 h-3 rounded-full bg-yellow-400" />
          <span class="w-3 h-3 rounded-full bg-green-400" />
          <div class="flex-1 mx-3 px-3 py-1 rounded bg-white dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
            {iframeSrc || 'enter a URL above and click Load'}
          </div>
        </div>

        {/* Viewport container */}
        <div
          class="mx-auto flex items-start justify-center py-4 px-4"
          style={{ minHeight: `${Math.min(displayHeight + 32, 700)}px` }}
        >
          <div
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              position: 'relative',
              flexShrink: 0,
            }}
            class="rounded border border-gray-300 dark:border-gray-600 shadow-lg overflow-hidden bg-white"
          >
            {/* Viewport size label */}
            <div class="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none">
              <span class="text-[10px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-b-md">
                {activeWidth} × {frameHeight}
              </span>
            </div>

            {iframeSrc ? (
              <iframe
                src={iframeSrc}
                title="Responsive preview"
                style={{
                  width: `${activeWidth}px`,
                  height: `${frameHeight}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  pointerEvents: 'none',
                  border: 'none',
                  display: 'block',
                }}
              />
            ) : (
              <div class="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-2">
                <svg class="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <span class="text-sm">Enter a URL and click Load to preview</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Breakpoint reference table */}
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300">Breakpoint Reference</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800">
                <th class="px-4 py-2">Device</th>
                <th class="px-4 py-2">Width</th>
                <th class="px-4 py-2">Tailwind</th>
                <th class="px-4 py-2">Bootstrap 5</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              {[
                { device: 'Mobile S', width: '320px', tw: 'xs', bs: 'xs' },
                { device: 'Mobile (iPhone)', width: '375px', tw: 'xs', bs: 'xs' },
                { device: 'Mobile L', width: '430px', tw: 'xs', bs: 'xs' },
                { device: 'Tablet (sm)', width: '640px', tw: 'sm', bs: 'sm (576px)' },
                { device: 'Tablet (md)', width: '768px', tw: 'md', bs: 'md' },
                { device: 'Laptop', width: '1024px', tw: 'lg', bs: 'lg (992px)' },
                { device: 'Desktop', width: '1280px', tw: 'xl', bs: 'xl (1200px)' },
                { device: 'Wide', width: '1536px', tw: '2xl', bs: 'xxl (1400px)' },
              ].map((row) => (
                <tr key={row.width} class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td class="px-4 py-2 text-gray-900 dark:text-gray-100">{row.device}</td>
                  <td class="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">{row.width}</td>
                  <td class="px-4 py-2">
                    <span class="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-mono">
                      {row.tw}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs">{row.bs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
