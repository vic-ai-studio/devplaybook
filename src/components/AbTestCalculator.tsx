import { useState, useMemo } from 'preact/hooks';

// Chi-square test for proportions (two-proportion z-test)
// Returns: z-score, p-value (two-tailed), confidence
function zTestProportions(nA: number, cA: number, nB: number, cB: number) {
  if (nA <= 0 || nB <= 0 || cA < 0 || cB < 0 || cA > nA || cB > nB) return null;
  const pA = cA / nA;
  const pB = cB / nB;
  const pPool = (cA + cB) / (nA + nB);
  if (pPool === 0 || pPool === 1) return null;
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
  if (se === 0) return null;
  const z = (pB - pA) / se;
  // Two-tailed p-value using normal distribution approximation
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const lift = pA > 0 ? ((pB - pA) / pA) * 100 : 0;
  return { pA, pB, z, p, lift };
}

// Standard normal CDF approximation (Abramowitz & Stegun)
function normalCDF(x: number): number {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

// 95% confidence interval for difference in proportions
function confidenceInterval(nA: number, cA: number, nB: number, cB: number, z = 1.96) {
  const pA = cA / nA, pB = cB / nB;
  const se = Math.sqrt((pA * (1 - pA)) / nA + (pB * (1 - pB)) / nB);
  const diff = pB - pA;
  return { lower: diff - z * se, upper: diff + z * se };
}

// Sample size needed for given power and alpha
function requiredSampleSize(baseline: number, mde: number, alpha = 0.05, power = 0.8) {
  const p1 = baseline, p2 = baseline * (1 + mde / 100);
  const zAlpha = 1.96; // alpha=0.05 two-tailed
  const zBeta = 0.842; // power=0.80
  const pAvg = (p1 + p2) / 2;
  return Math.ceil(
    ((zAlpha * Math.sqrt(2 * pAvg * (1 - pAvg)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2) /
    ((p2 - p1) ** 2)
  );
}

export default function AbTestCalculator() {
  const [visitors_a, setVisitorsA] = useState('1000');
  const [conv_a, setConvA] = useState('50');
  const [visitors_b, setVisitorsB] = useState('1000');
  const [conv_b, setConvB] = useState('65');
  const [confidence, setConfidence] = useState<'90' | '95' | '99'>('95');

  // Sample size planner
  const [baseline, setBaseline] = useState('5');
  const [mde, setMde] = useState('20');

  const nA = parseInt(visitors_a) || 0;
  const cA = parseInt(conv_a) || 0;
  const nB = parseInt(visitors_b) || 0;
  const cB = parseInt(conv_b) || 0;

  const alphaMap = { '90': 0.10, '95': 0.05, '99': 0.01 };
  const alpha = alphaMap[confidence];

  const result = useMemo(() => zTestProportions(nA, cA, nB, cB), [nA, cA, nB, cB]);
  const ci = useMemo(() => (result && nA > 0 && nB > 0) ? confidenceInterval(nA, cA, nB, cB, confidence === '90' ? 1.645 : confidence === '95' ? 1.96 : 2.576) : null, [result, nA, cA, nB, cB, confidence]);

  const sampleSize = useMemo(() => {
    const b = parseFloat(baseline) / 100;
    const m = parseFloat(mde);
    if (b <= 0 || b >= 1 || m <= 0) return null;
    return requiredSampleSize(b, m);
  }, [baseline, mde]);

  const isSignificant = result ? result.p < alpha : false;
  const winner = result ? (result.pB > result.pA ? 'B' : result.pB < result.pA ? 'A' : 'tie') : null;

  function pct(n: number) { return (n * 100).toFixed(2) + '%'; }
  function fmt(n: number) { return n.toFixed(4); }

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Test Results</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Variant A */}
          <div class="space-y-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">Variant A (Control)</span>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Visitors</label>
              <input
                type="number" min="1"
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={visitors_a}
                onInput={(e) => setVisitorsA((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Conversions</label>
              <input
                type="number" min="0"
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={conv_a}
                onInput={(e) => setConvA((e.target as HTMLInputElement).value)}
              />
            </div>
            {result && nA > 0 && (
              <div class="bg-bg rounded-lg p-3 text-sm">
                <div class="text-text-muted text-xs">Conversion Rate</div>
                <div class="text-2xl font-bold text-blue-400">{pct(result.pA)}</div>
              </div>
            )}
          </div>

          {/* Variant B */}
          <div class="space-y-3">
            <div class="flex items-center gap-2 mb-2">
              <span class="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded">Variant B (Treatment)</span>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Visitors</label>
              <input
                type="number" min="1"
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={visitors_b}
                onInput={(e) => setVisitorsB((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Conversions</label>
              <input
                type="number" min="0"
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
                value={conv_b}
                onInput={(e) => setConvB((e.target as HTMLInputElement).value)}
              />
            </div>
            {result && nB > 0 && (
              <div class="bg-bg rounded-lg p-3 text-sm">
                <div class="text-text-muted text-xs">Conversion Rate</div>
                <div class="text-2xl font-bold text-purple-400">{pct(result.pB)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Confidence level */}
        <div class="mt-4">
          <label class="block text-sm font-medium mb-2">Confidence Level</label>
          <div class="flex gap-2">
            {(['90', '95', '99'] as const).map(c => (
              <button
                key={c}
                onClick={() => setConfidence(c)}
                class={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                  confidence === c ? 'bg-primary text-white border-primary' : 'bg-bg border-border hover:border-primary text-text-muted'
                }`}
              >
                {c}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div class={`bg-bg-card border rounded-xl p-5 ${isSignificant ? (winner === 'B' ? 'border-green-500/50' : 'border-blue-500/50') : 'border-border'}`}>
          <div class="flex items-start justify-between mb-4 gap-4 flex-wrap">
            <div>
              <h2 class="text-base font-semibold">Statistical Analysis</h2>
              <p class="text-xs text-text-muted mt-0.5">Two-proportion z-test, {confidence}% confidence</p>
            </div>
            <div class={`text-center px-4 py-2 rounded-lg ${
              isSignificant
                ? winner === 'B'
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-blue-500/10 border border-blue-500/30'
                : 'bg-bg border border-border'
            }`}>
              {isSignificant ? (
                <>
                  <div class="text-xs text-text-muted">Winner</div>
                  <div class="text-lg font-bold text-green-400">Variant {winner}</div>
                  <div class="text-xs text-green-400">Statistically Significant</div>
                </>
              ) : (
                <>
                  <div class="text-lg font-bold text-text-muted">No Winner</div>
                  <div class="text-xs text-text-muted">Not Significant</div>
                </>
              )}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-bg rounded-lg p-3 text-center">
              <div class="text-xs text-text-muted mb-1">Lift</div>
              <div class={`text-lg font-bold ${result.lift > 0 ? 'text-green-400' : result.lift < 0 ? 'text-red-400' : 'text-text-muted'}`}>
                {result.lift > 0 ? '+' : ''}{result.lift.toFixed(1)}%
              </div>
            </div>
            <div class="bg-bg rounded-lg p-3 text-center">
              <div class="text-xs text-text-muted mb-1">p-value</div>
              <div class={`text-lg font-bold ${result.p < alpha ? 'text-green-400' : 'text-text-muted'}`}>
                {result.p < 0.001 ? '<0.001' : fmt(result.p)}
              </div>
            </div>
            <div class="bg-bg rounded-lg p-3 text-center">
              <div class="text-xs text-text-muted mb-1">z-score</div>
              <div class="text-lg font-bold">{fmt(result.z)}</div>
            </div>
            <div class="bg-bg rounded-lg p-3 text-center">
              <div class="text-xs text-text-muted mb-1">Confidence</div>
              <div class={`text-lg font-bold ${isSignificant ? 'text-green-400' : 'text-text-muted'}`}>
                {((1 - result.p) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {ci && (
            <div class="mt-3 bg-bg rounded-lg p-3 text-sm">
              <div class="text-xs text-text-muted mb-1">{confidence}% Confidence Interval for B−A</div>
              <div class="font-mono text-sm">
                [{(ci.lower * 100).toFixed(2)}%, {(ci.upper * 100).toFixed(2)}%]
              </div>
              {ci.lower > 0 && <p class="text-xs text-green-400 mt-1">The entire interval is above 0 — B is reliably better than A.</p>}
              {ci.upper < 0 && <p class="text-xs text-red-400 mt-1">The entire interval is below 0 — A is reliably better than B.</p>}
              {ci.lower <= 0 && ci.upper >= 0 && <p class="text-xs text-text-muted mt-1">Interval crosses 0 — no clear winner yet.</p>}
            </div>
          )}

          {!isSignificant && (
            <p class="mt-3 text-xs text-text-muted bg-bg rounded-lg p-3">
              Results are not statistically significant at {confidence}% confidence. Continue collecting data — you need more visitors before declaring a winner. Stopping early increases the risk of a false positive.
            </p>
          )}
        </div>
      )}

      {/* Sample Size Planner */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-1">Sample Size Planner</h2>
        <p class="text-xs text-text-muted mb-4">Estimate visitors needed before starting your test (80% power, 95% confidence).</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Baseline Conversion Rate (%)</label>
            <input
              type="number" min="0.1" max="99" step="0.1"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={baseline}
              onInput={(e) => setBaseline((e.target as HTMLInputElement).value)}
              placeholder="5"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Minimum Detectable Effect (%)</label>
            <input
              type="number" min="1" max="200" step="1"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              value={mde}
              onInput={(e) => setMde((e.target as HTMLInputElement).value)}
              placeholder="20"
            />
            <p class="text-xs text-text-muted mt-1">Relative lift you want to detect (e.g. 20% means 5% → 6%)</p>
          </div>
        </div>
        {sampleSize ? (
          <div class="bg-bg rounded-lg p-4 text-center">
            <div class="text-xs text-text-muted mb-1">Required per variant</div>
            <div class="text-3xl font-bold text-primary">{sampleSize.toLocaleString()}</div>
            <div class="text-xs text-text-muted mt-1">
              Total: {(sampleSize * 2).toLocaleString()} visitors · {parseFloat(baseline).toFixed(1)}% baseline · {mde}% MDE
            </div>
          </div>
        ) : (
          <p class="text-sm text-text-muted">Enter valid baseline and MDE to calculate.</p>
        )}
      </div>
    </div>
  );
}
