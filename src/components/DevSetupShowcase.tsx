import { useState, useEffect } from 'preact/hooks';

interface Setup {
  id: string;
  name: string;
  ide: string;
  os: string;
  terminal: string;
  tools: string[];
  comment: string;
  upvotes: number;
  createdAt: string;
}

const IDE_OPTIONS = [
  'VS Code',
  'Cursor',
  'Zed',
  'Neovim',
  'Emacs',
  'JetBrains (IntelliJ/WebStorm)',
  'Sublime Text',
  'Other',
];

const OS_OPTIONS = ['macOS', 'Windows 11', 'Ubuntu', 'Fedora', 'Arch Linux', 'Other'];

const TERMINAL_OPTIONS = [
  'Warp',
  'iTerm2',
  'Alacritty',
  'Kitty',
  'Windows Terminal',
  'Hyper',
  'Default',
  'Other',
];

const COMMON_TOOLS = [
  'GitHub Copilot',
  'Docker Desktop',
  'Postman',
  'Raycast',
  'Alfred',
  'Homebrew',
  'Oh My Zsh',
  'tmux',
  'TablePlus',
  'Obsidian',
  'Fig',
  '1Password',
];

const VOTED_KEY = 'dp_voted_setups';

export default function DevSetupShowcase() {
  const [setups, setSetups] = useState<Setup[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'submit'>('list');
  const [form, setForm] = useState({
    name: '',
    ide: '',
    os: '',
    terminal: '',
    tools: [] as string[],
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newSetup, setNewSetup] = useState<Setup | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(VOTED_KEY);
    if (stored) {
      try {
        setVotedIds(new Set(JSON.parse(stored)));
      } catch {}
    }
    fetch('/api/setups')
      .then((r) => r.json())
      .then((data) => {
        setSetups(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleUpvote = async (id: string) => {
    if (votedIds.has(id)) return;
    // Optimistic update
    setSetups((prev) => prev.map((s) => (s.id === id ? { ...s, upvotes: s.upvotes + 1 } : s)));
    const newVoted = new Set([...votedIds, id]);
    setVotedIds(newVoted);
    localStorage.setItem(VOTED_KEY, JSON.stringify([...newVoted]));

    try {
      const res = await fetch('/api/setups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        const updated: Setup = await res.json();
        setSetups((prev) => prev.map((s) => (s.id === id ? updated : s)));
      }
    } catch {}
  };

  const toggleTool = (tool: string) => {
    setForm((f) => ({
      ...f,
      tools: f.tools.includes(tool) ? f.tools.filter((t) => t !== tool) : [...f.tools, tool],
    }));
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.ide || !form.os) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/setups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const created: Setup = await res.json();
        setNewSetup(created);
        setSetups((prev) => [created, ...prev]);
        setSubmitted(true);
        setView('list');
        setForm({ name: '', ide: '', os: '', terminal: '', tools: [], comment: '' });
      } else {
        setError('Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tweetUrl = (setup: Setup) => {
    const text = `My dev setup: ${setup.ide} on ${setup.os}${setup.terminal ? ` + ${setup.terminal}` : ''}${setup.tools.length ? `. Tools: ${setup.tools.slice(0, 3).join(', ')}` : ''}. Check out devplaybook.cc/my-dev-setup`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  };

  const ogCardUrl = (setup: Setup) => {
    const params = new URLSearchParams({
      name: setup.name,
      ide: setup.ide,
      os: setup.os,
      ...(setup.terminal ? { terminal: setup.terminal } : {}),
      ...(setup.tools.length ? { tools: setup.tools.slice(0, 4).join(', ') } : {}),
      ...(setup.comment ? { comment: setup.comment } : {}),
    });
    return `/api/og?${params}`;
  };

  if (view === 'submit') {
    return (
      <div class="max-w-2xl mx-auto">
        <button
          onClick={() => setView('list')}
          class="mb-6 text-text-muted hover:text-primary text-sm transition-colors"
        >
          ← Back to setups
        </button>
        <h2 class="text-2xl font-bold mb-2">Share Your Dev Setup</h2>
        <p class="text-text-muted mb-7 text-sm">
          Tell the community what tools power your workflow.
        </p>
        <form onSubmit={handleSubmit} class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-1.5">
              Your name / handle <span class="text-primary">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah K. or @sarahdev"
              value={form.name}
              onInput={(e) =>
                setForm((f) => ({ ...f, name: (e.target as HTMLInputElement).value }))
              }
              class="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:border-primary outline-none transition-colors"
              maxLength={50}
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1.5">
                IDE / Editor <span class="text-primary">*</span>
              </label>
              <select
                value={form.ide}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ide: (e.target as HTMLSelectElement).value }))
                }
                class="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:border-primary outline-none transition-colors"
                required
              >
                <option value="">Select IDE...</option>
                {IDE_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium mb-1.5">
                Operating System <span class="text-primary">*</span>
              </label>
              <select
                value={form.os}
                onChange={(e) =>
                  setForm((f) => ({ ...f, os: (e.target as HTMLSelectElement).value }))
                }
                class="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:border-primary outline-none transition-colors"
                required
              >
                <option value="">Select OS...</option>
                {OS_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">Terminal</label>
            <select
              value={form.terminal}
              onChange={(e) =>
                setForm((f) => ({ ...f, terminal: (e.target as HTMLSelectElement).value }))
              }
              class="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:border-primary outline-none transition-colors"
            >
              <option value="">Select terminal...</option>
              {TERMINAL_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2">Key Tools</label>
            <div class="flex flex-wrap gap-2">
              {COMMON_TOOLS.map((tool) => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  class={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    form.tools.includes(tool)
                      ? 'bg-primary border-primary text-white'
                      : 'border-border text-text-muted hover:border-primary hover:text-text'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">
              What makes your setup special?{' '}
              <span class="text-text-muted font-normal">({form.comment.length}/200)</span>
            </label>
            <textarea
              placeholder="e.g. Copilot + Warp changed my workflow completely..."
              value={form.comment}
              onInput={(e) =>
                setForm((f) => ({
                  ...f,
                  comment: (e.target as HTMLTextAreaElement).value,
                }))
              }
              class="w-full bg-bg-input border border-border rounded-lg px-4 py-2.5 text-text focus:border-primary outline-none transition-colors h-24 resize-none"
              maxLength={200}
            />
          </div>

          {error && <p class="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !form.name || !form.ide || !form.os}
            class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {submitting ? 'Sharing...' : '🚀 Share My Setup'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      {submitted && newSetup && (
        <div class="mb-6 bg-secondary/10 border border-secondary/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <p class="font-semibold text-secondary flex-1">
            🎉 Your setup is live! Share it on X to get upvotes:
          </p>
          <div class="flex gap-3">
            <a
              href={tweetUrl(newSetup)}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 bg-black hover:bg-zinc-800 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              𝕏 Tweet It
            </a>
            <a
              href={ogCardUrl(newSetup)}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-2 border border-border hover:border-primary text-text-muted hover:text-text px-4 py-2 rounded-lg text-sm transition-colors"
            >
              🖼 View Card
            </a>
          </div>
        </div>
      )}

      <div class="flex items-center justify-between mb-8">
        <p class="text-text-muted">
          {loading ? 'Loading...' : `${setups.length} setups shared`}
        </p>
        <button
          onClick={() => setView('submit')}
          class="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-semibold transition-colors"
        >
          + Share My Setup
        </button>
      </div>

      {loading ? (
        <div class="text-center py-20 text-text-muted">Loading community setups...</div>
      ) : (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {setups.map((setup) => (
            <div
              key={setup.id}
              class="bg-bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors"
            >
              <div class="flex items-start justify-between mb-4 gap-3">
                <div>
                  <p class="font-semibold text-text">{setup.name}</p>
                  <p class="text-xs text-text-muted mt-0.5">
                    {new Date(setup.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleUpvote(setup.id)}
                  disabled={votedIds.has(setup.id)}
                  title={votedIds.has(setup.id) ? 'Already upvoted' : 'Upvote this setup'}
                  class={`flex flex-col items-center min-w-[44px] px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    votedIds.has(setup.id)
                      ? 'border-primary/40 text-primary bg-primary/10 cursor-default'
                      : 'border-border hover:border-primary hover:text-primary cursor-pointer'
                  }`}
                >
                  <span class="text-xs leading-none mb-0.5">▲</span>
                  <span>{setup.upvotes}</span>
                </button>
              </div>

              <div class="space-y-1.5 mb-3 text-sm">
                <div class="flex gap-3">
                  <span class="text-text-muted w-16 flex-shrink-0">IDE</span>
                  <span class="text-primary font-medium">{setup.ide}</span>
                </div>
                <div class="flex gap-3">
                  <span class="text-text-muted w-16 flex-shrink-0">OS</span>
                  <span class="font-medium">{setup.os}</span>
                </div>
                {setup.terminal && (
                  <div class="flex gap-3">
                    <span class="text-text-muted w-16 flex-shrink-0">Terminal</span>
                    <span class="font-medium">{setup.terminal}</span>
                  </div>
                )}
              </div>

              {setup.tools.length > 0 && (
                <div class="flex flex-wrap gap-1.5 mb-3">
                  {setup.tools.map((tool) => (
                    <span
                      key={tool}
                      class="text-xs bg-bg-input border border-border px-2.5 py-0.5 rounded-full text-text-muted"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              {setup.comment && (
                <p class="text-sm text-text-muted italic mb-3">"{setup.comment}"</p>
              )}

              <div class="pt-3 border-t border-border flex gap-4">
                <a
                  href={tweetUrl(setup)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-text-muted hover:text-white transition-colors"
                >
                  𝕏 Share
                </a>
                <a
                  href={ogCardUrl(setup)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-xs text-text-muted hover:text-primary transition-colors"
                >
                  🖼 View Card
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
