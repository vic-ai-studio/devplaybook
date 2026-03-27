import { useState } from 'preact/hooks';

interface Inputs {
  jsBundle: number;
  cssSize: number;
  imageSize: number;
  ttfb: number;
  blockingScripts: number;
  blockingStylesheets: number;
}

interface Scores {
  performance: number;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
}

function calcScores(i: Inputs): Scores {
  const performance = Math.max(
    0,
    Math.min(
      100,
      100 -
        (i.jsBundle / 100) * 5 -
        (i.cssSize / 100) * 2 -
        (i.imageSize / 100) * 1 -
        (i.ttfb / 100) * 3 -
        i.blockingScripts * 5 -
        i.blockingStylesheets * 3,
    ),
  );

  const lcp =
    i.ttfb / 1000 + (i.imageSize / 500) * 0.8 + i.jsBundle / 300;

  const fcp =
    i.ttfb / 1000 + (i.cssSize / 100) * 0.1 + i.blockingScripts * 0.3;

  const fid = i.blockingScripts * 50 + (i.jsBundle / 200) * 30;

  const cls =
    i.blockingStylesheets * 0.05 + (i.imageSize / 1000) * 0.1;

  return {
    performance: Math.round(performance),
    lcp: Math.round(lcp * 100) / 100,
    fid: Math.round(fid),
    cls: Math.round(cls * 1000) / 1000,
    fcp: Math.round(fcp * 100) / 100,
  };
}

function perfColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-500';
}

function perfBg(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-500';
}

function perfRingColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 50) return '#fb923c';
  return '#ef4444';
}

type MetricStatus = 'Good' | 'Needs Improvement' | 'Poor';

function lcpStatus(v: number): MetricStatus {
  if (v <= 2.5) return 'Good';
  if (v <= 4.0) return 'Needs Improvement';
  return 'Poor';
}
function fidStatus(v: number): MetricStatus {
  if (v <= 100) return 'Good';
  if (v <= 300) return 'Needs Improvement';
  return 'Poor';
}
function clsStatus(v: number): MetricStatus {
  if (v <= 0.1) return 'Good';
  if (v <= 0.25) return 'Needs Improvement';
  return 'Poor';
}
function fcpStatus(v: number): MetricStatus {
  if (v <= 1.8) return 'Good';
  if (v <= 3.0) return 'Needs Improvement';
  return 'Poor';
}

function statusColor(s: MetricStatus): string {
  if (s === 'Good') return 'text-green-500';
  if (s === 'Needs Improvement') return 'text-orange-400';
  return 'text-red-500';
}

function statusBadge(s: MetricStatus) {
  const color =
    s === 'Good'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : s === 'Needs Improvement'
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span class={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {s}
    </span>
  );
}

function getSuggestions(i: Inputs, s: Scores): string[] {
  const tips: Array<{ weight: number; tip: string }> = [];

  if (i.jsBundle > 200)
    tips.push({
      weight: (i.jsBundle / 100) * 5,
      tip: `Your JS bundle is ${i.jsBundle}KB — code-split with dynamic import() and tree-shake unused dependencies to reduce bundle size.`,
    });

  if (i.imageSize > 300)
    tips.push({
      weight: (i.imageSize / 100) * 1,
      tip: `Images total ${i.imageSize}KB — convert to WebP/AVIF and add loading="lazy" to defer off-screen images.`,
    });

  if (i.ttfb > 200)
    tips.push({
      weight: (i.ttfb / 100) * 3,
      tip: `TTFB is ${i.ttfb}ms — serve via a CDN closer to users and enable HTTP caching (Cache-Control: max-age) for static assets.`,
    });

  if (i.blockingScripts > 0)
    tips.push({
      weight: i.blockingScripts * 5,
      tip: `${i.blockingScripts} render-blocking script(s) detected — add async or defer to <script> tags in <head> to unblock parsing.`,
    });

  if (i.blockingStylesheets > 0)
    tips.push({
      weight: i.blockingStylesheets * 3,
      tip: `${i.blockingStylesheets} render-blocking stylesheet(s) — inline critical CSS and lazy-load non-critical styles with media="print" onload swap.`,
    });

  if (i.cssSize > 100)
    tips.push({
      weight: (i.cssSize / 100) * 2,
      tip: `CSS is ${i.cssSize}KB — remove unused CSS with PurgeCSS or Tailwind's content purging, and minify the output.`,
    });

  tips.sort((a, b) => b.weight - a.weight);
  return tips.slice(0, 3).map((t) => t.tip);
}

interface NumInputProps {
  label: string;
  unit: string;
  value: number;
  min?: number;
  step?: number;
  onChange: (v: number) => void;
}

function NumInput({ label, unit, value, min = 0, step = 1, onChange }: NumInputProps) {
  return (
    <div>
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
        <span class="text-gray-400 dark:text-gray-500 font-normal ml-1">({unit})</span>
      </label>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onInput={(e) => onChange(Math.max(0, Number((e.target as HTMLInputElement).value)))}
        class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function CircleScore({ score }: { score: number }) {
  const r = 40;
  const circumference = 2 * Math.PI * r;
  const pct = score / 100;
  const dash = circumference * pct;
  const gap = circumference - dash;
  const color = perfRingColor(score);

  return (
    <div class="flex flex-col items-center gap-1">
      <div class="relative w-28 h-28">
        <svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke="currentColor"
            stroke-width="8"
            class="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="50" cy="50" r={r}
            fill="none"
            stroke={color}
            stroke-width="8"
            stroke-dasharray={`${dash} ${gap}`}
            stroke-linecap="round"
          />
        </svg>
        <span
          class={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${perfColor(score)}`}
        >
          {score}
        </span>
      </div>
      <span class={`text-sm font-semibold ${perfColor(score)}`}>
        {score >= 90 ? 'Good' : score >= 50 ? 'Needs Improvement' : 'Poor'}
      </span>
    </div>
  );
}

interface MetricRowProps {
  label: string;
  value: string;
  status: MetricStatus;
  description: string;
}

function MetricRow({ label, value, status, description }: MetricRowProps) {
  return (
    <div class="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div>
        <div class="flex items-center gap-2">
          <span class="font-medium text-gray-900 dark:text-gray-100 text-sm">{label}</span>
          {statusBadge(status)}
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
      <span class={`text-lg font-bold tabular-nums ${statusColor(status)}`}>{value}</span>
    </div>
  );
}

const DEFAULTS: Inputs = {
  jsBundle: 200,
  cssSize: 50,
  imageSize: 500,
  ttfb: 200,
  blockingScripts: 0,
  blockingStylesheets: 0,
};

export default function LighthouseScoreSimulator() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [scores, setScores] = useState<Scores | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function set(key: keyof Inputs) {
    return (v: number) => setInputs((prev) => ({ ...prev, [key]: v }));
  }

  function calculate() {
    const s = calcScores(inputs);
    setScores(s);
    setSuggestions(getSuggestions(inputs, s));
  }

  return (
    <div class="space-y-6">
      {/* Inputs */}
      <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Page Resource Profile
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NumInput
            label="JS Bundle Size"
            unit="KB"
            value={inputs.jsBundle}
            step={10}
            onChange={set('jsBundle')}
          />
          <NumInput
            label="CSS Size"
            unit="KB"
            value={inputs.cssSize}
            step={5}
            onChange={set('cssSize')}
          />
          <NumInput
            label="Total Image Size"
            unit="KB"
            value={inputs.imageSize}
            step={50}
            onChange={set('imageSize')}
          />
          <NumInput
            label="Time to First Byte (TTFB)"
            unit="ms"
            value={inputs.ttfb}
            step={50}
            onChange={set('ttfb')}
          />
          <NumInput
            label="Render-Blocking Scripts"
            unit="count"
            value={inputs.blockingScripts}
            step={1}
            onChange={set('blockingScripts')}
          />
          <NumInput
            label="Render-Blocking Stylesheets"
            unit="count"
            value={inputs.blockingStylesheets}
            step={1}
            onChange={set('blockingStylesheets')}
          />
        </div>
        <button
          onClick={calculate}
          class="mt-5 w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        >
          Calculate Score
        </button>
      </div>

      {/* Results */}
      {scores !== null && (
        <>
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">
              Estimated Scores
            </h2>
            <div class="flex flex-col sm:flex-row gap-6 items-start">
              {/* Circle badge */}
              <div class="flex flex-col items-center sm:items-start gap-1 min-w-[8rem]">
                <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Performance
                </p>
                <CircleScore score={scores.performance} />
              </div>

              {/* Metric rows */}
              <div class="flex-1 w-full">
                <MetricRow
                  label="LCP — Largest Contentful Paint"
                  value={`${scores.lcp}s`}
                  status={lcpStatus(scores.lcp)}
                  description="Good ≤ 2.5s · Needs Improvement ≤ 4s · Poor > 4s"
                />
                <MetricRow
                  label="FID — First Input Delay"
                  value={`${scores.fid}ms`}
                  status={fidStatus(scores.fid)}
                  description="Good ≤ 100ms · Needs Improvement ≤ 300ms · Poor > 300ms"
                />
                <MetricRow
                  label="CLS — Cumulative Layout Shift"
                  value={scores.cls.toFixed(3)}
                  status={clsStatus(scores.cls)}
                  description="Good ≤ 0.1 · Needs Improvement ≤ 0.25 · Poor > 0.25"
                />
                <MetricRow
                  label="FCP — First Contentful Paint"
                  value={`${scores.fcp}s`}
                  status={fcpStatus(scores.fcp)}
                  description="Good ≤ 1.8s · Needs Improvement ≤ 3s · Poor > 3s"
                />
              </div>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div class="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
              <h2 class="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-3 flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                Top Improvement Opportunities
              </h2>
              <ul class="space-y-2">
                {suggestions.map((tip, idx) => (
                  <li key={idx} class="flex gap-2 text-sm text-amber-900 dark:text-amber-200">
                    <span class="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <p class="text-xs text-gray-400 dark:text-gray-500">
            Scores are estimates based on simplified heuristics. Real Lighthouse scores depend on
            many additional factors. Run Lighthouse in Chrome DevTools for accurate measurements.
          </p>
        </>
      )}
    </div>
  );
}
