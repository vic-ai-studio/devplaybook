import { useState } from 'preact/hooks';

type TempBand = 'zero' | 'low' | 'mid' | 'high' | 'max';

interface SampleOutputs {
  outputs: string[];
}

function getTempBand(t: number): TempBand {
  if (t <= 0.05) return 'zero';
  if (t <= 0.4) return 'low';
  if (t <= 0.9) return 'mid';
  if (t <= 1.4) return 'high';
  return 'max';
}

const SAMPLE_OUTPUTS: Record<TempBand, SampleOutputs> = {
  zero: {
    outputs: [
      'Where every cup tells a story.',
      'Where every cup tells a story.',
      'Where every cup tells a story.',
    ],
  },
  low: {
    outputs: [
      'Where every cup tells a story.',
      'Crafted with care, served with love.',
      'Where every cup tells a story.',
    ],
  },
  mid: {
    outputs: [
      'Fuel your mornings, savor your afternoons.',
      'Life's too short for bad coffee — sip the difference.',
      'Where great days begin, one cup at a time.',
    ],
  },
  high: {
    outputs: [
      'We don't just brew coffee. We brew conversations, connections, and cosmic coincidences.',
      'Your neighborhood alchemist — turning beans into liquid gold since forever.',
      'Coffee so good, it makes Monday mornings feel illegal in a good way.',
    ],
  },
  max: {
    outputs: [
      'INFINITE BEANS INFINITE DREAMS the universe smells like espresso and we are the universe!!',
      'A cup. A soul. A thermodynamic event. Coffee: the original singularity.',
      'transcend the ordinary. CAFFEINATE. the beans are talking. are you listening???',
    ],
  },
};

const BAND_LABELS: Record<TempBand, string> = {
  zero: 'Deterministic',
  low: 'Very Focused',
  mid: 'Balanced',
  high: 'Creative',
  max: 'Chaotic',
};

const BAND_COLORS: Record<TempBand, string> = {
  zero: 'text-blue-400',
  low: 'text-cyan-400',
  mid: 'text-green-400',
  high: 'text-orange-400',
  max: 'text-red-400',
};

const TOP_P_DESCRIPTIONS: Record<string, string> = {
  low: 'Only the top few most likely tokens are considered. Output is very focused and predictable.',
  mid: 'A balanced token pool — the model has reasonable variety without going off the rails.',
  high: 'Almost all tokens are in the pool. Combined with high temperature, output can be very unpredictable.',
};

function getTopPLabel(p: number): string {
  if (p <= 0.3) return 'low';
  if (p <= 0.7) return 'mid';
  return 'high';
}

export default function LlmTemperatureSimulator() {
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);

  const band = getTempBand(temperature);
  const { outputs } = SAMPLE_OUTPUTS[band];
  const topPLabel = getTopPLabel(topP);

  const consistencyPct = Math.round((1 - temperature / 2) * 100);
  const creativityPct = 100 - consistencyPct;

  return (
    <div class="space-y-6">
      {/* Prompt */}
      <div class="bg-surface border border-border rounded-lg p-4">
        <div class="text-xs text-text-muted mb-1 font-medium uppercase tracking-wide">Sample Prompt</div>
        <div class="font-mono text-sm text-text">"Write a tagline for a coffee shop."</div>
      </div>

      {/* Controls */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <label class="font-medium text-sm">Temperature</label>
            <span class={`font-mono font-bold text-lg ${BAND_COLORS[band]}`}>{temperature.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={temperature}
            onInput={(e) => setTemperature(parseFloat((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted">
            <span>0.0 — Deterministic</span>
            <span>1.0 — Default</span>
            <span>2.0 — Chaotic</span>
          </div>
          <div class={`text-xs font-medium ${BAND_COLORS[band]}`}>
            Mode: {BAND_LABELS[band]}
          </div>
          <div class="text-xs text-text-muted leading-relaxed">
            Temperature controls randomness in token sampling. Lower values make the model more deterministic; higher values increase creativity and variability.
          </div>
        </div>

        {/* Top-P */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between">
            <label class="font-medium text-sm">Top-P (nucleus sampling)</label>
            <span class="font-mono font-bold text-lg text-accent">{topP.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={topP}
            onInput={(e) => setTopP(parseFloat((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted">
            <span>0.0 — Narrow</span>
            <span>0.5</span>
            <span>1.0 — All tokens</span>
          </div>
          <div class="text-xs text-text-muted leading-relaxed">
            {TOP_P_DESCRIPTIONS[topPLabel]}
          </div>
          <div class="text-xs text-text-muted leading-relaxed mt-1">
            Top-P defines the cumulative probability threshold for token selection. OpenAI and Anthropic recommend changing temperature <em>or</em> top-p, not both.
          </div>
        </div>
      </div>

      {/* Creativity vs Consistency meter */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
        <div class="text-sm font-medium mb-2">Creativity vs. Consistency</div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-blue-400 w-20 text-right">Consistency</span>
          <div class="flex-1 h-4 bg-surface-alt rounded-full overflow-hidden flex">
            <div
              class="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${consistencyPct}%` }}
            />
            <div
              class="h-full bg-orange-500 transition-all duration-200"
              style={{ width: `${creativityPct}%` }}
            />
          </div>
          <span class="text-xs text-orange-400 w-20">Creativity</span>
        </div>
        <div class="flex justify-between text-xs text-text-muted px-24">
          <span>{consistencyPct}%</span>
          <span>{creativityPct}%</span>
        </div>
      </div>

      {/* Sample outputs */}
      <div class="space-y-2">
        <div class="text-sm font-medium">
          Sample Outputs at Temperature <span class={`font-mono ${BAND_COLORS[band]}`}>{temperature.toFixed(2)}</span>
        </div>
        <div class="space-y-2">
          {outputs.map((out, i) => (
            <div key={i} class="bg-surface border border-border rounded-lg p-3 flex items-start gap-3">
              <span class="text-xs text-text-muted font-mono mt-0.5 shrink-0">Run {i + 1}</span>
              <span class="text-sm text-text">{out}</span>
            </div>
          ))}
        </div>
        {band === 'zero' && (
          <p class="text-xs text-text-muted italic">At temperature 0, the model always picks the single most likely token — outputs are identical every run.</p>
        )}
        {band === 'max' && (
          <p class="text-xs text-text-muted italic">At temperature 2.0, token probabilities are flattened dramatically — outputs become unpredictable and may lose coherence.</p>
        )}
      </div>

      {/* Use-case guide */}
      <div class="bg-surface border border-border rounded-lg p-4">
        <div class="text-sm font-medium mb-3">Quick Reference: When to Use Each Temperature</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { range: '0.0 – 0.2', use: 'Classification, extraction, deterministic Q&A', color: 'text-blue-400' },
            { range: '0.3 – 0.6', use: 'Code generation, factual summarization', color: 'text-cyan-400' },
            { range: '0.7 – 1.0', use: 'Conversational AI, balanced creative writing', color: 'text-green-400' },
            { range: '1.1 – 1.5', use: 'Brainstorming, poetry, diverse suggestions', color: 'text-orange-400' },
            { range: '1.6 – 2.0', use: 'Experimental / novelty generation only', color: 'text-red-400' },
          ].map(({ range, use, color }) => (
            <div key={range} class="flex gap-2">
              <span class={`font-mono shrink-0 ${color}`}>{range}</span>
              <span class="text-text-muted">{use}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
