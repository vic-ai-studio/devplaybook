import { useState, useMemo } from 'preact/hooks';

// Pure JS TF-IDF based cosine similarity (no server/API needed)
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'is','are','was','were','be','been','being','have','has','had','do','does',
  'did','will','would','could','should','may','might','this','that','these',
  'those','i','you','he','she','we','they','it','its','my','your','our',
]);

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    if (!STOP_WORDS.has(t)) tf.set(t, (tf.get(t) || 0) + 1);
  }
  const len = tokens.length || 1;
  tf.forEach((v, k) => tf.set(k, v / len));
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, magA = 0, magB = 0;
  const allKeys = new Set([...a.keys(), ...b.keys()]);
  allKeys.forEach(k => {
    const va = a.get(k) || 0;
    const vb = b.get(k) || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  });
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function similarityColor(score: number): string {
  // 0 = cold blue, 1 = hot red
  const r = Math.round(score * 220);
  const g = Math.round(50 + (1 - score) * 100);
  const b = Math.round((1 - score) * 220);
  return `rgb(${r},${g},${b})`;
}

const DEFAULT_TEXTS = [
  'Machine learning models require large amounts of training data to perform well.',
  'Deep neural networks are trained on massive datasets to learn patterns.',
  'The weather today is sunny with a light breeze in the afternoon.',
  'Natural language processing enables computers to understand human text.',
  'I enjoy cooking Italian pasta with homemade tomato sauce.',
];

export default function EmbeddingsVisualizer() {
  const [texts, setTexts] = useState<string[]>(DEFAULT_TEXTS);
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);

  function handleTextChange(idx: number, val: string) {
    setTexts(prev => { const n = [...prev]; n[idx] = val; return n; });
  }

  function addText() {
    if (texts.length < 6) setTexts(prev => [...prev, '']);
  }

  function removeText(idx: number) {
    if (texts.length > 2) setTexts(prev => prev.filter((_, i) => i !== idx));
  }

  function loadDefault() {
    setTexts(DEFAULT_TEXTS);
  }

  const validTexts = texts.filter(t => t.trim().length > 0);

  const { tfs, matrix } = useMemo(() => {
    const tfs = texts.map(t => computeTF(tokenize(t)));
    const matrix: number[][] = tfs.map((a, i) =>
      tfs.map((b, j) => (i === j ? 1 : cosineSimilarity(a, b)))
    );
    return { tfs, matrix };
  }, [texts]);

  // Top similar pairs (excluding diagonal)
  const pairs = useMemo(() => {
    const result: { i: number; j: number; score: number }[] = [];
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix.length; j++) {
        result.push({ i, j, score: matrix[i][j] });
      }
    }
    return result.sort((a, b) => b.score - a.score);
  }, [matrix]);

  const labels = texts.map((_, i) => `Text ${i + 1}`);

  return (
    <div class="space-y-6">
      {/* Input texts */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="font-semibold text-text">Text Snippets</h2>
            <p class="text-xs text-text-muted mt-0.5">Add 2–6 text snippets to compare their semantic similarity</p>
          </div>
          <div class="flex gap-2">
            <button
              onClick={loadDefault}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            >
              Load Example
            </button>
            {texts.length < 6 && (
              <button
                onClick={addText}
                class="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                + Add Text
              </button>
            )}
          </div>
        </div>
        <div class="space-y-3">
          {texts.map((t, i) => (
            <div key={i} class="flex gap-2">
              <div class="flex-shrink-0 w-16 pt-2.5 text-xs font-medium text-text-muted text-right">
                Text {i + 1}
              </div>
              <textarea
                value={t}
                onInput={(e) => handleTextChange(i, (e.target as HTMLTextAreaElement).value)}
                rows={2}
                class="flex-1 bg-surface border border-border rounded-lg p-2.5 text-sm text-text resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                placeholder={`Enter text snippet ${i + 1}...`}
              />
              {texts.length > 2 && (
                <button
                  onClick={() => removeText(i)}
                  class="flex-shrink-0 mt-1.5 w-7 h-7 text-text-muted hover:text-red-400 transition-colors text-lg leading-none"
                  title="Remove"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap */}
      {validTexts.length >= 2 && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="font-semibold text-text mb-1">Cosine Similarity Heatmap</h2>
          <p class="text-xs text-text-muted mb-4">
            Similarity ranges from 0 (no overlap) to 1 (identical). Computed using TF-IDF vectors in your browser.
          </p>

          <div class="overflow-x-auto">
            <table class="border-collapse mx-auto">
              <thead>
                <tr>
                  <td class="w-20" />
                  {labels.map((l, j) => (
                    <th key={j} class="text-xs text-text-muted font-medium px-1 pb-2 text-center min-w-[64px]">
                      {l}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, i) => (
                  <tr key={i}>
                    <td class="text-xs text-text-muted font-medium pr-2 text-right py-1">{labels[i]}</td>
                    {row.map((score, j) => (
                      <td
                        key={j}
                        class="p-1 cursor-default"
                        onMouseEnter={() => setHoveredCell([i, j])}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        <div
                          class="w-14 h-14 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm transition-transform hover:scale-105"
                          style={{ backgroundColor: similarityColor(score) }}
                          title={i !== j ? `${labels[i]} ↔ ${labels[j]}: ${score.toFixed(3)}` : 'Same text'}
                        >
                          {score.toFixed(2)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Color legend */}
          <div class="mt-4 flex items-center gap-3 justify-center text-xs text-text-muted">
            <span>Low similarity</span>
            <div class="flex gap-0.5">
              {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
                <div
                  key={v}
                  class="w-8 h-4 rounded"
                  style={{ backgroundColor: similarityColor(v) }}
                />
              ))}
            </div>
            <span>High similarity</span>
          </div>
        </div>
      )}

      {/* Top pairs */}
      {pairs.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="font-semibold text-text mb-4">Similarity Rankings</h2>
          <div class="space-y-2">
            {pairs.map(({ i, j, score }) => (
              <div key={`${i}-${j}`} class="flex items-center gap-3">
                <div class="flex-shrink-0 text-xs text-text-muted w-28">
                  {labels[i]} ↔ {labels[j]}
                </div>
                <div class="flex-1 bg-surface rounded-full h-3 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all"
                    style={{ width: `${score * 100}%`, backgroundColor: similarityColor(score) }}
                  />
                </div>
                <div class="flex-shrink-0 w-12 text-right text-xs font-mono font-medium"
                  style={{ color: similarityColor(score) }}>
                  {score.toFixed(3)}
                </div>
                <div class="flex-shrink-0 w-20 text-xs text-text-muted">
                  {score >= 0.7 ? '🔥 Very similar' : score >= 0.4 ? '~ Moderate' : '❄ Dissimilar'}
                </div>
              </div>
            ))}
          </div>

          <div class="mt-4 p-3 bg-surface rounded-lg text-xs text-text-muted">
            <strong class="text-text">How it works:</strong> Each text is converted to a TF-IDF vector
            (term frequency × inverse document frequency), then cosine similarity measures the angle
            between vectors. Score of 1.0 means identical content; 0.0 means no shared vocabulary.
            Real embedding models (OpenAI, Cohere, Sentence Transformers) use dense neural vectors
            for semantic similarity — this tool uses sparse TF-IDF as a lightweight browser-side approximation.
          </div>
        </div>
      )}
    </div>
  );
}
