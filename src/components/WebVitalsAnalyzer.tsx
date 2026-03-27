import { useState } from 'preact/hooks';

type Metric = 'LCP' | 'FID' | 'INP' | 'CLS' | 'TTFB' | 'FCP';

interface MetricDef {
  label: string;
  unit: string;
  good: number;
  needsImprovement: number;
  description: string;
  tips: string[];
  placeholder: string;
}

const METRICS: Record<Metric, MetricDef> = {
  LCP: {
    label: 'Largest Contentful Paint',
    unit: 'ms',
    good: 2500,
    needsImprovement: 4000,
    description: 'Time until the largest visible content element loads. Measures loading performance.',
    tips: [
      'Preload the LCP image with <link rel="preload">',
      'Use a CDN to serve images closer to users',
      'Optimize and compress images (WebP, AVIF)',
      'Remove render-blocking resources',
      'Use server-side rendering or static generation',
    ],
    placeholder: '2500',
  },
  FID: {
    label: 'First Input Delay (legacy)',
    unit: 'ms',
    good: 100,
    needsImprovement: 300,
    description: 'Time from first user interaction to browser response. Replaced by INP in 2024.',
    tips: [
      'Reduce long tasks (break up JS execution)',
      'Use web workers for heavy computation',
      'Defer non-critical JavaScript',
      'Minimize main thread work',
    ],
    placeholder: '100',
  },
  INP: {
    label: 'Interaction to Next Paint',
    unit: 'ms',
    good: 200,
    needsImprovement: 500,
    description: 'Responsiveness metric measuring all interactions. Replaced FID as Core Web Vital in March 2024.',
    tips: [
      'Minimize long tasks blocking the main thread',
      'Break up event handlers into smaller chunks',
      'Use requestAnimationFrame for visual updates',
      'Yield to the main thread with scheduler.yield()',
      'Profile with Chrome DevTools Performance panel',
    ],
    placeholder: '200',
  },
  CLS: {
    label: 'Cumulative Layout Shift',
    unit: 'score',
    good: 0.1,
    needsImprovement: 0.25,
    description: 'Visual stability score measuring unexpected layout shifts. Lower is better.',
    tips: [
      'Set explicit width/height on images and videos',
      'Reserve space for ads and embeds',
      'Avoid inserting content above existing content',
      'Use transform animations instead of layout-affecting properties',
      'Add font-display: optional or preload fonts',
    ],
    placeholder: '0.1',
  },
  TTFB: {
    label: 'Time to First Byte',
    unit: 'ms',
    good: 800,
    needsImprovement: 1800,
    description: 'Time from request to first byte of response. Measures server response time.',
    tips: [
      'Use a CDN to reduce network distance',
      'Enable HTTP/2 or HTTP/3',
      'Implement server-side caching (Redis, Varnish)',
      'Optimize database queries and add indexes',
      'Use edge functions for dynamic responses',
    ],
    placeholder: '800',
  },
  FCP: {
    label: 'First Contentful Paint',
    unit: 'ms',
    good: 1800,
    needsImprovement: 3000,
    description: 'Time until the first content (text, image) appears on screen. Early loading signal.',
    tips: [
      'Eliminate render-blocking CSS and JS',
      'Inline critical CSS',
      'Preconnect to required origins',
      'Reduce server response time (TTFB)',
      'Minimize DOM size',
    ],
    placeholder: '1800',
  },
};

function getScore(metric: Metric, value: number): 'good' | 'needs-improvement' | 'poor' {
  const { good, needsImprovement } = METRICS[metric];
  if (value <= good) return 'good';
  if (value <= needsImprovement) return 'needs-improvement';
  return 'poor';
}

const SCORE_COLORS = {
  good: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500' },
  'needs-improvement': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500' },
  poor: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500' },
};

const SCORE_LABELS = { good: 'Good', 'needs-improvement': 'Needs Improvement', poor: 'Poor' };

function scoreBar(metric: Metric, value: number): number {
  const { needsImprovement } = METRICS[metric];
  const max = needsImprovement * 1.5;
  return Math.min(100, (value / max) * 100);
}

export default function WebVitalsAnalyzer() {
  const [values, setValues] = useState<Partial<Record<Metric, string>>>({
    LCP: '',
    INP: '',
    CLS: '',
    TTFB: '',
    FCP: '',
  });
  const [expanded, setExpanded] = useState<Metric | null>(null);

  function setValue(metric: Metric, val: string) {
    setValues(v => ({ ...v, [metric]: val }));
  }

  const activeMetrics = (Object.keys(values) as Metric[]).filter(m => values[m] !== '');

  function overallGrade(): { grade: string; color: string; desc: string } {
    if (activeMetrics.length === 0) return { grade: '—', color: 'text-text-muted', desc: 'Enter metric values' };
    const scores = activeMetrics.map(m => getScore(m, parseFloat(values[m]!)));
    const goodCount = scores.filter(s => s === 'good').length;
    const poorCount = scores.filter(s => s === 'poor').length;
    const pct = goodCount / scores.length;
    if (poorCount > 0) return { grade: 'Poor', color: 'text-red-400', desc: `${poorCount} metric(s) need urgent attention` };
    if (pct === 1) return { grade: 'Excellent', color: 'text-green-400', desc: 'All metrics are in good range' };
    if (pct >= 0.5) return { grade: 'Fair', color: 'text-yellow-400', desc: 'Some metrics need improvement' };
    return { grade: 'Poor', color: 'text-red-400', desc: 'Multiple metrics below threshold' };
  }

  const overall = overallGrade();

  return (
    <div class="space-y-6">
      {/* Overall score */}
      {activeMetrics.length > 0 && (
        <div class="p-4 rounded-xl bg-bg border border-border flex items-center gap-4">
          <div class={`text-4xl font-bold ${overall.color}`}>{overall.grade}</div>
          <div>
            <p class="text-sm font-medium">Overall Web Vitals</p>
            <p class="text-xs text-text-muted">{overall.desc}</p>
          </div>
        </div>
      )}

      {/* Metrics grid */}
      <div class="space-y-3">
        {(Object.entries(METRICS) as [Metric, MetricDef][])
          .filter(([m]) => m !== 'FID')
          .map(([metric, def]) => {
            const rawVal = values[metric] || '';
            const numVal = parseFloat(rawVal);
            const hasValue = rawVal !== '' && !isNaN(numVal);
            const score = hasValue ? getScore(metric, numVal) : null;
            const colors = score ? SCORE_COLORS[score] : null;
            const isExpanded = expanded === metric;

            return (
              <div
                key={metric}
                class={`rounded-xl border transition-all ${colors ? `${colors.bg} ${colors.border}` : 'bg-bg border-border'}`}
              >
                <div class="p-4">
                  <div class="flex items-start gap-3">
                    {/* Badge */}
                    <div class={`shrink-0 w-12 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${colors?.badge || 'bg-surface'}`}>
                      {metric}
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2 flex-wrap">
                        <label class="text-sm font-medium">{def.label}</label>
                        {score && (
                          <span class={`text-xs font-semibold ${colors!.text}`}>{SCORE_LABELS[score]}</span>
                        )}
                      </div>
                      <p class="text-xs text-text-muted mb-2">{def.description}</p>

                      <div class="flex items-center gap-3">
                        <input
                          type="number"
                          value={rawVal}
                          onInput={e => setValue(metric, (e.target as HTMLInputElement).value)}
                          placeholder={def.placeholder}
                          step={metric === 'CLS' ? '0.01' : '10'}
                          class="w-28 px-3 py-1.5 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
                        />
                        <span class="text-xs text-text-muted">{def.unit}</span>
                        <div class="flex gap-2 text-xs text-text-muted">
                          <span class="text-green-400">≤{def.good}{metric === 'CLS' ? '' : 'ms'} good</span>
                          <span>•</span>
                          <span class="text-yellow-400">≤{def.needsImprovement}{metric === 'CLS' ? '' : 'ms'} ok</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      {hasValue && (
                        <div class="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
                          <div
                            class={`h-full rounded-full transition-all ${score === 'good' ? 'bg-green-500' : score === 'needs-improvement' ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${scoreBar(metric, numVal)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Tips toggle */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : metric)}
                      class="shrink-0 text-xs text-text-muted hover:text-primary transition-colors"
                    >
                      {isExpanded ? '▲' : '▼'} Tips
                    </button>
                  </div>
                </div>

                {/* Tips drawer */}
                {isExpanded && (
                  <div class="border-t border-border/50 p-4">
                    <p class="text-xs font-medium mb-2">How to improve {metric}:</p>
                    <ul class="space-y-1">
                      {def.tips.map((tip, i) => (
                        <li key={i} class="flex items-start gap-2 text-xs text-text-muted">
                          <span class="text-primary mt-0.5">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Reference thresholds */}
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p class="font-medium mb-2">How to measure</p>
        <ul class="text-text-muted space-y-1 text-xs">
          <li>• Chrome DevTools → Lighthouse → run audit</li>
          <li>• PageSpeed Insights: pagespeed.web.dev</li>
          <li>• Chrome UX Report (CrUX) for real-user data</li>
          <li>• web-vitals npm package for in-app measurement</li>
        </ul>
      </div>
    </div>
  );
}
