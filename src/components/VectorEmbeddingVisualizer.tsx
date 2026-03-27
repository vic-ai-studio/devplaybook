import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

interface Vec2D {
  x: number;
  y: number;
  label: string;
  color: string;
  index: number;
}

const PRESET_SAMPLES: Record<string, string[]> = {
  'Programming Languages': [
    'Python is a high-level programming language',
    'JavaScript runs in the browser',
    'Rust provides memory safety without garbage collection',
    'Go is great for concurrent systems',
    'TypeScript adds types to JavaScript',
    'Ruby is designed for developer happiness',
    'Java is object-oriented and platform-independent',
    'C++ gives you fine-grained memory control',
  ],
  'Fruits & Vegetables': [
    'Apple is a sweet red or green fruit',
    'Banana is a yellow tropical fruit',
    'Orange is a citrus fruit with vitamin C',
    'Carrot is an orange root vegetable',
    'Broccoli is a green vegetable with antioxidants',
    'Strawberry is a small red sweet fruit',
    'Spinach is a leafy green vegetable',
    'Mango is a tropical stone fruit',
  ],
  'AI & ML Concepts': [
    'Neural networks learn from data through backpropagation',
    'Large language models generate text token by token',
    'Gradient descent minimizes the loss function',
    'Embeddings represent text as dense vectors',
    'Attention mechanism allows models to focus on relevant parts',
    'Fine-tuning adapts pretrained models to specific tasks',
    'Reinforcement learning trains agents with rewards',
    'Transformer architecture revolutionized NLP',
  ],
};

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1'];

// Simple TF-IDF vectorizer
function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
}

function buildVocab(docs: string[][]): string[] {
  const vocab = new Set<string>();
  docs.forEach(doc => doc.forEach(t => vocab.add(t)));
  return Array.from(vocab).sort();
}

function tfidfVector(doc: string[], vocab: string[], allDocs: string[][]): number[] {
  const tf: Record<string, number> = {};
  doc.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
  const total = doc.length || 1;

  return vocab.map(term => {
    const termTf = (tf[term] || 0) / total;
    const df = allDocs.filter(d => d.includes(term)).length;
    const idf = Math.log((allDocs.length + 1) / (df + 1)) + 1;
    return termTf * idf;
  });
}

function normalize(v: number[]): number[] {
  const mag = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / mag);
}

function cosineSim(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

// PCA: reduce to 2D
function pca2d(vectors: number[][]): [number, number][] {
  if (vectors.length === 0) return [];
  const n = vectors.length;
  const d = vectors[0].length;

  // Center
  const mean = Array(d).fill(0) as number[];
  vectors.forEach(v => v.forEach((x, i) => { mean[i] += x / n; }));
  const centered = vectors.map(v => v.map((x, i) => x - mean[i]));

  // Covariance matrix (approximated via power iteration for top 2 PCs)
  function powerIter(matrix: number[][], exclude: number[] | null): number[] {
    let v = Array(d).fill(0).map(() => Math.random() - 0.5);
    if (exclude) {
      // Deflate
      const dot = v.reduce((s, x, i) => s + x * exclude[i], 0);
      v = v.map((x, i) => x - dot * exclude[i]);
    }
    for (let iter = 0; iter < 100; iter++) {
      // Multiply v by cov matrix: C*v = (1/n) * X^T * (X * v)
      const Xv = matrix.map(row => row.reduce((s, x, i) => s + x * v[i], 0));
      const newV = Array(d).fill(0) as number[];
      matrix.forEach((row, j) => row.forEach((x, i) => { newV[i] += x * Xv[j] / n; }));
      const mag = Math.sqrt(newV.reduce((s, x) => s + x * x, 0)) || 1;
      v = newV.map(x => x / mag);
    }
    return v;
  }

  const pc1 = powerIter(centered, null);
  const pc2 = powerIter(centered, pc1);

  return centered.map(v => [
    v.reduce((s, x, i) => s + x * pc1[i], 0),
    v.reduce((s, x, i) => s + x * pc2[i], 0),
  ]);
}

interface SimilarityEntry {
  i: number;
  j: number;
  label: string;
  score: number;
}

export default function VectorEmbeddingVisualizer() {
  const [inputTexts, setInputTexts] = useState<string[]>(PRESET_SAMPLES['Programming Languages']);
  const [rawInput, setRawInput] = useState(PRESET_SAMPLES['Programming Languages'].join('\n'));
  const [preset, setPreset] = useState('Programming Languages');
  const [points2d, setPoints2d] = useState<Vec2D[]>([]);
  const [similarities, setSimilarities] = useState<SimilarityEntry[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | 'similarity'>('2d');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const compute = useCallback((texts: string[]) => {
    if (texts.length < 2) return;
    const tokenized = texts.map(tokenize);
    const vocab = buildVocab(tokenized);
    const vecs = tokenized.map(doc => normalize(tfidfVector(doc, vocab, tokenized)));
    const coords = pca2d(vecs);

    if (coords.length === 0) return;

    // Normalize to canvas space
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;

    const pts: Vec2D[] = coords.map((c, i) => ({
      x: 0.1 + ((c[0] - minX) / rangeX) * 0.8,
      y: 0.1 + ((c[1] - minY) / rangeY) * 0.8,
      label: texts[i].length > 40 ? texts[i].slice(0, 40) + '…' : texts[i],
      color: COLORS[i % COLORS.length],
      index: i,
    }));
    setPoints2d(pts);

    // Top similarities
    const sims: SimilarityEntry[] = [];
    for (let i = 0; i < vecs.length; i++) {
      for (let j = i + 1; j < vecs.length; j++) {
        sims.push({ i, j, label: `#${i + 1} ↔ #${j + 1}`, score: cosineSim(vecs[i], vecs[j]) });
      }
    }
    sims.sort((a, b) => b.score - a.score);
    setSimilarities(sims.slice(0, 15));
  }, []);

  useEffect(() => { compute(inputTexts); }, [inputTexts, compute]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points2d.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Draw lines between hovered point and all others
    if (hoveredIdx !== null) {
      const hovered = points2d[hoveredIdx];
      points2d.forEach((p, i) => {
        if (i === hoveredIdx) return;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(hovered.x * W, hovered.y * H);
        ctx.lineTo(p.x * W, p.y * H);
        ctx.stroke();
      });
    }

    // Draw points
    points2d.forEach((p, i) => {
      const px = p.x * W, py = p.y * H;
      const isHovered = hoveredIdx === i;

      // Shadow
      ctx.shadowColor = p.color;
      ctx.shadowBlur = isHovered ? 12 : 4;

      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(px, py, isHovered ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // Label
      ctx.fillStyle = '#e2e8f0';
      ctx.font = isHovered ? 'bold 11px monospace' : '10px monospace';
      ctx.fillText(p.label.length > 25 ? p.label.slice(0, 25) + '…' : p.label, px + 12, py + 4);
    });
  }, [points2d, hoveredIdx]);

  const handlePreset = (name: string) => {
    setPreset(name);
    const texts = PRESET_SAMPLES[name];
    setInputTexts(texts);
    setRawInput(texts.join('\n'));
  };

  const handleInputChange = (val: string) => {
    setRawInput(val);
    const texts = val.split('\n').map(t => t.trim()).filter(Boolean);
    setInputTexts(texts);
  };

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-semibold">Input Texts (one per line)</label>
          <div class="flex gap-2">
            {Object.keys(PRESET_SAMPLES).map(name => (
              <button
                key={name}
                onClick={() => handlePreset(name)}
                class={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  preset === name ? 'bg-accent text-white border-accent' : 'bg-bg border-border text-text-muted hover:border-accent'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <textarea
          class="w-full bg-bg border border-border rounded-lg p-3 font-mono text-sm resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent"
          value={rawInput}
          onInput={(e) => handleInputChange((e.target as HTMLTextAreaElement).value)}
          placeholder="Enter one sentence per line (min 2, recommended 6-12)..."
        />
        <p class="text-xs text-text-muted mt-1">{inputTexts.length} texts loaded. Uses TF-IDF + PCA (browser-side, no API required).</p>
      </div>

      {/* View Toggle */}
      <div class="flex gap-2">
        <button
          onClick={() => setViewMode('2d')}
          class={`px-4 py-2 text-sm rounded-lg border transition-colors ${viewMode === '2d' ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text-muted hover:border-accent'}`}
        >
          2D Scatter Plot
        </button>
        <button
          onClick={() => setViewMode('similarity')}
          class={`px-4 py-2 text-sm rounded-lg border transition-colors ${viewMode === 'similarity' ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text-muted hover:border-accent'}`}
        >
          Similarity Rankings
        </button>
      </div>

      {viewMode === '2d' ? (
        <div class="bg-surface border border-border rounded-xl p-4">
          <h2 class="font-semibold text-sm mb-3">PCA-Reduced 2D Embedding Space</h2>
          <div class="relative">
            <canvas
              ref={canvasRef}
              width={700}
              height={400}
              class="w-full rounded-lg bg-bg border border-border"
              style={{ aspectRatio: '7/4' }}
            />
            {/* Hover overlay */}
            <div class="absolute inset-0 pointer-events-auto"
              onMouseMove={(e) => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const rect = canvas.getBoundingClientRect();
                const scaleX = canvas.width / rect.width;
                const scaleY = canvas.height / rect.height;
                const mx = ((e.clientX - rect.left) * scaleX) / canvas.width;
                const my = ((e.clientY - rect.top) * scaleY) / canvas.height;
                let closest = null;
                let minDist = 0.05;
                points2d.forEach((p, i) => {
                  const dist = Math.hypot(p.x - mx, p.y - my);
                  if (dist < minDist) { minDist = dist; closest = i; }
                });
                setHoveredIdx(closest);
              }}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </div>
          {hoveredIdx !== null && points2d[hoveredIdx] && (
            <div class="mt-3 p-3 bg-bg border border-accent rounded-lg text-sm">
              <span class="font-semibold" style={{ color: points2d[hoveredIdx].color }}>#{hoveredIdx + 1}:</span>{' '}
              {inputTexts[hoveredIdx]}
            </div>
          )}
          <p class="text-xs text-text-muted mt-2">Hover over points to see full text. Similar texts cluster together in this 2D projection.</p>
        </div>
      ) : (
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="px-5 py-3 border-b border-border">
            <h2 class="font-semibold text-sm">Cosine Similarity Rankings</h2>
          </div>
          <div class="divide-y divide-border">
            {similarities.map((s, i) => (
              <div key={`${s.i}-${s.j}`} class="flex items-center gap-4 px-5 py-3">
                <span class="text-xs text-text-muted w-8">#{i + 1}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex gap-2 text-xs mb-1">
                    <span class="font-medium" style={{ color: COLORS[s.i % COLORS.length] }}>#{s.i + 1}</span>
                    <span class="text-text-muted truncate">{inputTexts[s.i]?.slice(0, 35)}…</span>
                  </div>
                  <div class="flex gap-2 text-xs">
                    <span class="font-medium" style={{ color: COLORS[s.j % COLORS.length] }}>#{s.j + 1}</span>
                    <span class="text-text-muted truncate">{inputTexts[s.j]?.slice(0, 35)}…</span>
                  </div>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  <div class="w-20 bg-border rounded-full h-2 overflow-hidden">
                    <div
                      class="h-full rounded-full"
                      style={{ width: `${s.score * 100}%`, backgroundColor: s.score > 0.6 ? '#10b981' : s.score > 0.3 ? '#3b82f6' : '#94a3b8' }}
                    />
                  </div>
                  <span class="text-xs font-mono font-semibold w-12 text-right">{s.score.toFixed(3)}</span>
                </div>
              </div>
            ))}
          </div>
          <p class="text-xs text-text-muted px-5 py-3 border-t border-border">Cosine similarity using TF-IDF vectors. Score of 1.0 = identical content, 0.0 = no shared terms.</p>
        </div>
      )}

      {/* Legend */}
      <div class="bg-surface border border-border rounded-xl p-4">
        <h3 class="text-sm font-semibold mb-3">Text Index</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {inputTexts.map((t, i) => (
            <div key={i} class="flex items-start gap-2 text-xs">
              <span class="font-bold flex-shrink-0 w-5 text-right" style={{ color: COLORS[i % COLORS.length] }}>#{i + 1}</span>
              <span class="text-text-muted">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
