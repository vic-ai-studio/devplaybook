import { useState } from 'preact/hooks';

interface BenchmarkScore {
  value: number | null;
  note?: string;
}

interface ModelData {
  name: string;
  provider: string;
  color: string;
  releaseYear: number;
  params: string;
  benchmarks: {
    mmlu: BenchmarkScore;
    humaneval: BenchmarkScore;
    gsm8k: BenchmarkScore;
    hellaswag: BenchmarkScore;
    truthfulqa: BenchmarkScore;
    bbh: BenchmarkScore;
    arc: BenchmarkScore;
    math: BenchmarkScore;
  };
}

const MODELS: ModelData[] = [
  {
    name: 'GPT-4o', provider: 'OpenAI', color: '#10a37f', releaseYear: 2024, params: '?',
    benchmarks: { mmlu: { value: 88.7 }, humaneval: { value: 90.2 }, gsm8k: { value: 96.1 }, hellaswag: { value: 98.4 }, truthfulqa: { value: 77.8 }, bbh: { value: 87.0 }, arc: { value: 96.7 }, math: { value: 76.6 } }
  },
  {
    name: 'GPT-4 Turbo', provider: 'OpenAI', color: '#10a37f', releaseYear: 2023, params: '?',
    benchmarks: { mmlu: { value: 86.5 }, humaneval: { value: 87.1 }, gsm8k: { value: 94.2 }, hellaswag: { value: 97.0 }, truthfulqa: { value: 76.2 }, bbh: { value: 83.1 }, arc: { value: 95.9 }, math: { value: 72.3 } }
  },
  {
    name: 'Claude 3.5 Sonnet', provider: 'Anthropic', color: '#d97706', releaseYear: 2024, params: '?',
    benchmarks: { mmlu: { value: 88.3 }, humaneval: { value: 92.0 }, gsm8k: { value: 96.4 }, hellaswag: { value: 89.0, note: 'est.' }, truthfulqa: { value: 71.3 }, bbh: { value: 93.1 }, arc: { value: 93.2 }, math: { value: 71.1 } }
  },
  {
    name: 'Claude 3 Opus', provider: 'Anthropic', color: '#d97706', releaseYear: 2024, params: '?',
    benchmarks: { mmlu: { value: 86.8 }, humaneval: { value: 84.9 }, gsm8k: { value: 95.0 }, hellaswag: { value: 89.0, note: 'est.' }, truthfulqa: { value: 68.6 }, bbh: { value: 86.8 }, arc: { value: 94.3 }, math: { value: 60.1 } }
  },
  {
    name: 'Gemini 1.5 Pro', provider: 'Google', color: '#4285f4', releaseYear: 2024, params: '?',
    benchmarks: { mmlu: { value: 85.9 }, humaneval: { value: 84.1 }, gsm8k: { value: 91.7 }, hellaswag: { value: 87.8 }, truthfulqa: { value: 67.4 }, bbh: { value: 84.0 }, arc: { value: 92.8 }, math: { value: 67.7 } }
  },
  {
    name: 'Gemini 2.0 Flash', provider: 'Google', color: '#4285f4', releaseYear: 2025, params: '?',
    benchmarks: { mmlu: { value: 89.0 }, humaneval: { value: 88.0, note: 'est.' }, gsm8k: { value: 92.9 }, hellaswag: { value: 91.0, note: 'est.' }, truthfulqa: { value: 72.0, note: 'est.' }, bbh: { value: 87.0, note: 'est.' }, arc: { value: 93.5 }, math: { value: 79.7 } }
  },
  {
    name: 'Llama 3.1 405B', provider: 'Meta', color: '#0066cc', releaseYear: 2024, params: '405B',
    benchmarks: { mmlu: { value: 88.6 }, humaneval: { value: 89.0 }, gsm8k: { value: 96.8 }, hellaswag: { value: 89.5 }, truthfulqa: { value: 69.7 }, bbh: { value: 85.9 }, arc: { value: 95.5 }, math: { value: 73.8 } }
  },
  {
    name: 'Llama 3.1 70B', provider: 'Meta', color: '#0066cc', releaseYear: 2024, params: '70B',
    benchmarks: { mmlu: { value: 83.6 }, humaneval: { value: 80.5 }, gsm8k: { value: 93.0 }, hellaswag: { value: 87.0 }, truthfulqa: { value: 63.0 }, bbh: { value: 81.0 }, arc: { value: 92.9 }, math: { value: 68.0 } }
  },
  {
    name: 'Mistral Large 2', provider: 'Mistral', color: '#ff7000', releaseYear: 2024, params: '123B',
    benchmarks: { mmlu: { value: 84.0 }, humaneval: { value: 92.1 }, gsm8k: { value: 93.0 }, hellaswag: { value: 86.0, note: 'est.' }, truthfulqa: { value: 63.5, note: 'est.' }, bbh: { value: 81.2 }, arc: { value: 93.7 }, math: { value: 69.9 } }
  },
  {
    name: 'DeepSeek-V3', provider: 'DeepSeek', color: '#7c3aed', releaseYear: 2024, params: '671B MoE',
    benchmarks: { mmlu: { value: 88.5 }, humaneval: { value: 82.6 }, gsm8k: { value: 89.3 }, hellaswag: { value: 88.0, note: 'est.' }, truthfulqa: { value: 65.0, note: 'est.' }, bbh: { value: 87.5 }, arc: { value: 92.0, note: 'est.' }, math: { value: 75.9 } }
  },
];

const BENCHMARK_INFO: Record<string, { label: string; description: string; higherIsBetter: boolean }> = {
  mmlu: { label: 'MMLU', description: 'Massive Multitask Language Understanding — 57 subjects across STEM, humanities, social science', higherIsBetter: true },
  humaneval: { label: 'HumanEval', description: 'Python code generation — 164 hand-written programming challenges', higherIsBetter: true },
  gsm8k: { label: 'GSM8K', description: 'Grade School Math — 8,500 math word problems requiring multi-step reasoning', higherIsBetter: true },
  hellaswag: { label: 'HellaSwag', description: 'Commonsense NLI — choose the most plausible continuation of a sentence', higherIsBetter: true },
  truthfulqa: { label: 'TruthfulQA', description: 'Truthfulness — 817 questions where humans often give wrong answers due to misconceptions', higherIsBetter: true },
  bbh: { label: 'BIG-Bench Hard', description: '23 hard tasks beyond current LLM capabilities — symbolic reasoning, logical deduction', higherIsBetter: true },
  arc: { label: 'ARC-Challenge', description: 'AI2 Reasoning Challenge — hard science questions from US grade school exams', higherIsBetter: true },
  math: { label: 'MATH', description: 'Competition mathematics — 12,500 problems from AMC, AIME, and similar competitions', higherIsBetter: true },
};

type BenchmarkKey = keyof typeof BENCHMARK_INFO;

function getBarColor(value: number): string {
  if (value >= 90) return '#10b981';
  if (value >= 75) return '#3b82f6';
  if (value >= 60) return '#f59e0b';
  return '#ef4444';
}

export default function AiModelBenchmarkComparator() {
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkKey>('mmlu');
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(MODELS.map(m => m.name)));
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score');
  const [hoveredBenchmark, setHoveredBenchmark] = useState<string | null>(null);

  const toggleModel = (name: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(name)) { if (next.size > 1) next.delete(name); }
      else next.add(name);
      return next;
    });
  };

  const filteredModels = MODELS.filter(m => selectedModels.has(m.name));
  const sortedModels = [...filteredModels].sort((a, b) => {
    if (sortBy === 'score') {
      const aVal = a.benchmarks[selectedBenchmark].value ?? -1;
      const bVal = b.benchmarks[selectedBenchmark].value ?? -1;
      return bVal - aVal;
    }
    return a.name.localeCompare(b.name);
  });

  const maxScore = Math.max(...sortedModels.map(m => m.benchmarks[selectedBenchmark].value ?? 0));

  return (
    <div class="space-y-6">
      {/* Benchmark Selector */}
      <div class="bg-surface border border-border rounded-xl p-4">
        <label class="block text-sm font-semibold mb-3">Select Benchmark</label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.entries(BENCHMARK_INFO) as [BenchmarkKey, typeof BENCHMARK_INFO[string]][]).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setSelectedBenchmark(key)}
              onMouseEnter={() => setHoveredBenchmark(key)}
              onMouseLeave={() => setHoveredBenchmark(null)}
              class={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors border ${
                selectedBenchmark === key
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg border-border text-text-muted hover:border-accent'
              }`}
            >
              {info.label}
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-3 bg-bg p-2 rounded-lg">
          <strong>{BENCHMARK_INFO[hoveredBenchmark as BenchmarkKey || selectedBenchmark]?.label}:</strong>{' '}
          {BENCHMARK_INFO[hoveredBenchmark as BenchmarkKey || selectedBenchmark]?.description}
        </p>
      </div>

      {/* Model Filter */}
      <div class="bg-surface border border-border rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-semibold">Models</label>
          <div class="flex gap-2">
            <button
              onClick={() => setSortBy('score')}
              class={`text-xs px-2 py-1 rounded border transition-colors ${sortBy === 'score' ? 'bg-accent text-white border-accent' : 'bg-bg border-border text-text-muted'}`}
            >
              Sort by Score
            </button>
            <button
              onClick={() => setSortBy('name')}
              class={`text-xs px-2 py-1 rounded border transition-colors ${sortBy === 'name' ? 'bg-accent text-white border-accent' : 'bg-bg border-border text-text-muted'}`}
            >
              Sort by Name
            </button>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          {MODELS.map(m => (
            <button
              key={m.name}
              onClick={() => toggleModel(m.name)}
              class={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedModels.has(m.name)
                  ? 'text-white border-transparent'
                  : 'bg-bg border-border text-text-muted'
              }`}
              style={selectedModels.has(m.name) ? { backgroundColor: m.color, borderColor: m.color } : {}}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <h2 class="font-semibold text-sm mb-4">{BENCHMARK_INFO[selectedBenchmark].label} Scores (%)</h2>
        <div class="space-y-3">
          {sortedModels.map((m, i) => {
            const score = m.benchmarks[selectedBenchmark];
            const val = score.value ?? 0;
            const barWidth = maxScore > 0 ? (val / maxScore) * 100 : 0;
            return (
              <div key={m.name} class="flex items-center gap-3">
                <div class="w-36 text-xs text-right text-text-muted truncate flex-shrink-0">
                  <span class="font-medium text-text">{m.name}</span>
                </div>
                <div class="flex-1 bg-border rounded-full h-6 relative overflow-hidden">
                  <div
                    class="h-full rounded-full flex items-center px-2 transition-all duration-300"
                    style={{ width: `${barWidth}%`, backgroundColor: getBarColor(val), minWidth: val > 0 ? '40px' : '0' }}
                  >
                    {val > 0 && (
                      <span class="text-white text-xs font-bold ml-auto">
                        {val.toFixed(1)}{score.note ? '*' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div class="w-6 text-xs text-text-muted flex-shrink-0">#{i + 1}</div>
              </div>
            );
          })}
        </div>
        <p class="text-xs text-text-muted mt-3">* Estimated scores. All scores are best-reported from official papers or provider leaderboards.</p>
      </div>

      {/* Full Comparison Table */}
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="px-5 py-3 border-b border-border">
          <h2 class="font-semibold text-sm">Full Benchmark Matrix</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border text-text-muted">
                <th class="text-left px-4 py-2 font-medium sticky left-0 bg-surface">Model</th>
                {(Object.keys(BENCHMARK_INFO) as BenchmarkKey[]).map(k => (
                  <th
                    key={k}
                    class={`text-center px-3 py-2 font-medium cursor-pointer transition-colors hover:text-accent ${selectedBenchmark === k ? 'text-accent' : ''}`}
                    onClick={() => setSelectedBenchmark(k)}
                  >
                    {BENCHMARK_INFO[k].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredModels.map((m, i) => (
                <tr key={m.name} class={i % 2 === 0 ? 'bg-surface' : 'bg-bg'}>
                  <td class="px-4 py-2 sticky left-0 font-medium" style={i % 2 === 0 ? { backgroundColor: 'var(--color-surface)' } : { backgroundColor: 'var(--color-bg)' }}>
                    <div style={{ color: m.color }}>{m.name}</div>
                    <div class="text-text-muted font-normal">{m.provider}</div>
                  </td>
                  {(Object.keys(BENCHMARK_INFO) as BenchmarkKey[]).map(k => {
                    const s = m.benchmarks[k];
                    const val = s.value;
                    return (
                      <td
                        key={k}
                        class={`text-center px-3 py-2 font-mono ${selectedBenchmark === k ? 'font-bold' : ''}`}
                        style={val !== null ? { color: getBarColor(val) } : { color: 'var(--color-text-muted)' }}
                      >
                        {val !== null ? `${val.toFixed(1)}${s.note ? '*' : ''}` : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
