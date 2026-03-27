import { useState, useMemo } from 'preact/hooks';

type Category = 'All' | 'Code' | 'Chat' | 'Vision' | 'Embedding';

interface OllamaModel {
  name: string;
  pullName: string;
  params: string;
  contextK: number;
  category: Exclude<Category, 'All'>;
  desc: string;
  useCase: string;
}

const MODELS: OllamaModel[] = [
  {
    name: 'Llama 3.2 (3B)',
    pullName: 'llama3.2',
    params: '3B',
    contextK: 128,
    category: 'Chat',
    desc: "Meta's latest small Llama model. Fast, efficient, great for local chat on modest hardware.",
    useCase: 'Fast local chat, summarization, Q&A on CPU',
  },
  {
    name: 'Llama 3.1 (8B)',
    pullName: 'llama3.1',
    params: '8B',
    contextK: 128,
    category: 'Chat',
    desc: "Meta's Llama 3.1 8B — strong instruction-following and multilingual support.",
    useCase: 'General assistant, text generation, translation',
  },
  {
    name: 'Llama 3.1 (70B)',
    pullName: 'llama3.1:70b',
    params: '70B',
    contextK: 128,
    category: 'Chat',
    desc: 'Llama 3.1 70B — near frontier quality for a local model. Requires 40+ GB VRAM.',
    useCase: 'Complex reasoning, detailed analysis, long documents',
  },
  {
    name: 'Llama 3.2 Vision (11B)',
    pullName: 'llama3.2-vision',
    params: '11B',
    contextK: 128,
    category: 'Vision',
    desc: "Meta's multimodal Llama with vision understanding. Analyzes images + text together.",
    useCase: 'Image description, visual Q&A, document OCR',
  },
  {
    name: 'Mistral (7B)',
    pullName: 'mistral',
    params: '7B',
    contextK: 32,
    category: 'Chat',
    desc: "Mistral AI's flagship 7B model. Excellent instruction following, fast inference.",
    useCase: 'General chat, classification, structured output',
  },
  {
    name: 'Mistral Nemo (12B)',
    pullName: 'mistral-nemo',
    params: '12B',
    contextK: 128,
    category: 'Chat',
    desc: 'Mistral Nemo with 128K context. Built with Nvidia, strong multilingual performance.',
    useCase: 'Long document analysis, multilingual tasks',
  },
  {
    name: 'CodeLlama (7B)',
    pullName: 'codellama',
    params: '7B',
    contextK: 16,
    category: 'Code',
    desc: "Meta's code-specialized Llama. Trained on code datasets, supports fill-in-the-middle.",
    useCase: 'Code completion, debugging, code explanation',
  },
  {
    name: 'DeepSeek Coder V2',
    pullName: 'deepseek-coder-v2',
    params: '16B',
    contextK: 128,
    category: 'Code',
    desc: 'DeepSeek Coder V2 — state-of-the-art open-source code model. Beats many closed models on coding benchmarks.',
    useCase: 'Code generation, refactoring, multi-language support',
  },
  {
    name: 'Phi 3.5 (3.8B)',
    pullName: 'phi3.5',
    params: '3.8B',
    contextK: 128,
    category: 'Chat',
    desc: "Microsoft's Phi-3.5 small language model. Punches above its weight for reasoning tasks.",
    useCase: 'Edge deployment, constrained hardware, reasoning tasks',
  },
  {
    name: 'Gemma 2 (9B)',
    pullName: 'gemma2',
    params: '9B',
    contextK: 8,
    category: 'Chat',
    desc: "Google's Gemma 2 model. Strong on instruction following and safety alignment.",
    useCase: 'General assistant, writing, summarization',
  },
  {
    name: 'Gemma 2 (27B)',
    pullName: 'gemma2:27b',
    params: '27B',
    contextK: 8,
    category: 'Chat',
    desc: 'Gemma 2 27B — larger version with significantly better reasoning and quality.',
    useCase: 'Complex tasks, professional writing, analysis',
  },
  {
    name: 'Qwen 2.5 (7B)',
    pullName: 'qwen2.5',
    params: '7B',
    contextK: 128,
    category: 'Chat',
    desc: "Alibaba's Qwen 2.5 7B. Excellent multilingual support including Chinese. Strong coder variant available.",
    useCase: 'Multilingual tasks, Chinese language, general chat',
  },
  {
    name: 'Qwen 2.5 (72B)',
    pullName: 'qwen2.5:72b',
    params: '72B',
    contextK: 128,
    category: 'Chat',
    desc: 'Qwen 2.5 72B — frontier-level open model. Top performance on MMLU and code benchmarks.',
    useCase: 'Advanced reasoning, complex code, enterprise tasks',
  },
  {
    name: 'nomic-embed-text',
    pullName: 'nomic-embed-text',
    params: '137M',
    contextK: 8,
    category: 'Embedding',
    desc: "Nomic AI's text embedding model. High-quality 768-dim embeddings optimized for RAG pipelines.",
    useCase: 'RAG retrieval, semantic search, document similarity',
  },
  {
    name: 'mxbai-embed-large',
    pullName: 'mxbai-embed-large',
    params: '335M',
    contextK: 512,
    category: 'Embedding',
    desc: 'MixedBread AI embedding model. State-of-the-art on MTEB benchmarks. 1024-dim embeddings.',
    useCase: 'High-quality RAG, reranking, semantic search',
  },
];

const CATEGORIES: Category[] = ['All', 'Chat', 'Code', 'Vision', 'Embedding'];

const CATEGORY_COLORS: Record<Exclude<Category, 'All'>, string> = {
  Chat: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Code: 'bg-green-500/15 text-green-400 border-green-500/30',
  Vision: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Embedding: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

function CopyPullButton({ modelName }: { modelName: string }) {
  const [copied, setCopied] = useState(false);
  const cmd = `ollama pull ${modelName}`;
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(cmd).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`w-full mt-3 py-2 px-3 rounded-lg text-xs font-mono font-medium transition-colors flex items-center justify-between gap-2 ${
        copied
          ? 'bg-green-700/30 border border-green-600/40 text-green-400'
          : 'bg-surface border border-border text-text-muted hover:text-text hover:border-primary/40'
      }`}
    >
      <span class="truncate">{cmd}</span>
      <span class="shrink-0">{copied ? '✓ Copied' : 'Copy'}</span>
    </button>
  );
}

export default function OllamaModelExplorer() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MODELS.filter((m) => {
      const matchesCategory = activeCategory === 'All' || m.category === activeCategory;
      const matchesSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.pullName.toLowerCase().includes(q) ||
        m.desc.toLowerCase().includes(q) ||
        m.useCase.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory]);

  return (
    <div class="space-y-6">
      {/* Search + filter */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search models by name, use case, or description..."
            class="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              class={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-surface border-border text-text-muted hover:border-primary/40 hover:text-text'
              }`}
            >
              {cat}
              {cat !== 'All' && (
                <span class="ml-1.5 text-xs opacity-60">
                  {MODELS.filter((m) => m.category === cat).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <p class="text-xs text-text-muted">
          Showing <strong class="text-text">{filtered.length}</strong> of {MODELS.length} models
        </p>
      </div>

      {/* Model grid */}
      {filtered.length === 0 ? (
        <div class="bg-bg-card border border-border rounded-xl p-10 text-center">
          <p class="text-text-muted">No models match your search. Try a different keyword or category.</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('All'); }}
            class="mt-3 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((model) => (
            <div key={model.pullName} class="bg-bg-card border border-border rounded-xl p-4 flex flex-col">
              <div class="flex items-start justify-between gap-2 mb-2">
                <h3 class="font-semibold text-text text-sm leading-tight">{model.name}</h3>
                <span class={`shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[model.category]}`}>
                  {model.category}
                </span>
              </div>

              <div class="flex gap-3 mb-3 text-xs text-text-muted">
                <span class="flex items-center gap-1">
                  <span class="text-primary">⚡</span>
                  {model.params} params
                </span>
                <span class="flex items-center gap-1">
                  <span class="text-primary">📐</span>
                  {model.contextK}K ctx
                </span>
              </div>

              <p class="text-xs text-text-muted mb-2 flex-1">{model.desc}</p>

              <div class="bg-surface rounded-lg px-3 py-2 mb-1">
                <p class="text-xs text-text-muted">
                  <span class="text-text font-medium">Best for: </span>
                  {model.useCase}
                </p>
              </div>

              <CopyPullButton modelName={model.pullName} />
            </div>
          ))}
        </div>
      )}

      {/* Info footer */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-3">Getting started with Ollama</h2>
        <div class="space-y-2 text-sm text-text-muted">
          <div class="bg-surface rounded-lg p-3 font-mono text-xs text-green-300 space-y-1">
            <div><span class="text-text-muted"># Install Ollama (macOS/Linux)</span></div>
            <div>curl -fsSL https://ollama.com/install.sh | sh</div>
            <div class="mt-2"><span class="text-text-muted"># Pull and run a model</span></div>
            <div>ollama pull llama3.2</div>
            <div>ollama run llama3.2</div>
            <div class="mt-2"><span class="text-text-muted"># Use the OpenAI-compatible API</span></div>
            <div>curl http://localhost:11434/v1/chat/completions \</div>
            <div>  -H "Content-Type: application/json" \</div>
            <div>{`  -d '{"model":"llama3.2","messages":[{"role":"user","content":"Hello"}]}'`}</div>
          </div>
          <p class="text-xs">
            Ollama exposes an OpenAI-compatible REST API at <code class="font-mono bg-surface px-1 rounded">localhost:11434</code>.
            Use it with LangChain's <code class="font-mono bg-surface px-1 rounded">ChatOllama</code> or any OpenAI SDK by pointing the base URL to Ollama.
          </p>
        </div>
      </div>
    </div>
  );
}
