import { useState } from 'preact/hooks';

type CommitType = 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore' | 'perf' | 'ci' | 'revert';

const TYPE_LABELS: Record<CommitType, { emoji: string; desc: string }> = {
  feat:     { emoji: '✨', desc: 'New feature' },
  fix:      { emoji: '🐛', desc: 'Bug fix' },
  docs:     { emoji: '📝', desc: 'Documentation' },
  style:    { emoji: '💄', desc: 'Formatting, whitespace' },
  refactor: { emoji: '♻️', desc: 'Code refactor' },
  test:     { emoji: '✅', desc: 'Add or fix tests' },
  chore:    { emoji: '🔧', desc: 'Build / tooling' },
  perf:     { emoji: '⚡', desc: 'Performance' },
  ci:       { emoji: '👷', desc: 'CI/CD changes' },
  revert:   { emoji: '⏪', desc: 'Revert commit' },
};

const SCOPES = ['api', 'auth', 'ui', 'db', 'config', 'docs', 'deps', 'types', 'utils', 'tests'];

function buildCommit(
  type: CommitType,
  scope: string,
  description: string,
  body: string,
  breaking: boolean,
  issueRef: string,
  includeEmoji: boolean,
): string {
  if (!description.trim()) return '';

  const prefix = includeEmoji ? `${TYPE_LABELS[type].emoji} ` : '';
  const scopePart = scope.trim() ? `(${scope.trim()})` : '';
  const breakingMark = breaking ? '!' : '';
  const firstLine = `${prefix}${type}${scopePart}${breakingMark}: ${description.trim()}`;

  const parts: string[] = [firstLine];

  if (body.trim()) {
    parts.push('');
    parts.push(body.trim());
  }

  if (breaking && body.trim()) {
    parts.push('');
    parts.push(`BREAKING CHANGE: ${body.trim().split('\n')[0]}`);
  } else if (breaking) {
    parts.push('');
    parts.push('BREAKING CHANGE: describe what changed');
  }

  if (issueRef.trim()) {
    parts.push('');
    const refs = issueRef.trim().split(/[\s,]+/).filter(Boolean)
      .map(r => r.startsWith('#') ? `Closes ${r}` : `Closes #${r}`);
    parts.push(refs.join('\n'));
  }

  return parts.join('\n');
}

export default function GitCommitGenerator() {
  const [type, setType] = useState<CommitType>('feat');
  const [scope, setScope] = useState('');
  const [customScope, setCustomScope] = useState('');
  const [description, setDescription] = useState('');
  const [body, setBody] = useState('');
  const [breaking, setBreaking] = useState(false);
  const [issueRef, setIssueRef] = useState('');
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [copied, setCopied] = useState(false);

  const effectiveScope = scope === '__custom__' ? customScope : scope;
  const commit = buildCommit(type, effectiveScope, description, body, breaking, issueRef, includeEmoji);

  const firstLineLen = commit.split('\n')[0]?.length ?? 0;
  const headerOk = firstLineLen <= 72;

  const copy = () => {
    if (!commit) return;
    navigator.clipboard.writeText(commit).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      {/* Type selector */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Commit type</label>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(Object.entries(TYPE_LABELS) as [CommitType, { emoji: string; desc: string }][]).map(([t, meta]) => (
            <button
              key={t}
              onClick={() => setType(t)}
              class={`px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                type === t
                  ? 'bg-primary text-white'
                  : 'bg-bg-card border border-border text-text-muted hover:border-primary'
              }`}
            >
              <span class="mr-1">{meta.emoji}</span>
              <span class="font-mono font-medium">{t}</span>
              <span class="block text-xs opacity-70 mt-0.5">{meta.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scope */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Scope (optional)</label>
          <select
            value={scope}
            onChange={(e) => setScope((e.target as HTMLSelectElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
          >
            <option value="">None</option>
            {SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="__custom__">Custom…</option>
          </select>
        </div>
        {scope === '__custom__' && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">Custom scope</label>
            <input
              type="text"
              value={customScope}
              onInput={(e) => setCustomScope((e.target as HTMLInputElement).value)}
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. payments"
            />
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Short description <span class="text-xs font-normal">(imperative mood — "add", not "added")</span>
        </label>
        <input
          type="text"
          value={description}
          onInput={(e) => setDescription((e.target as HTMLInputElement).value)}
          maxLength={100}
          class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
          placeholder="add user authentication via magic link"
        />
      </div>

      {/* Body */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Body <span class="text-xs font-normal">(optional — explain why, not what)</span>
        </label>
        <textarea
          value={body}
          onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          class="w-full h-24 bg-bg-card border border-border rounded-lg p-3 text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder="Provide context or motivation for this change..."
        />
      </div>

      <div class="flex flex-wrap gap-4 items-center">
        <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input type="checkbox" checked={breaking} onChange={() => setBreaking(v => !v)} class="w-4 h-4 accent-primary" />
          Breaking change
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input type="checkbox" checked={includeEmoji} onChange={() => setIncludeEmoji(v => !v)} class="w-4 h-4 accent-primary" />
          Include emoji
        </label>
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Issue / PR ref</label>
          <input
            type="text"
            value={issueRef}
            onInput={(e) => setIssueRef((e.target as HTMLInputElement).value)}
            class="w-28 bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="#123"
          />
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium text-text-muted">Generated commit message</label>
            {description.trim() && (
              <span class={`text-xs px-2 py-0.5 rounded-full ${headerOk ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'}`}>
                {firstLineLen}/72 chars
              </span>
            )}
          </div>
          <button
            onClick={copy}
            disabled={!commit}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="w-full min-h-[80px] bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text overflow-x-auto whitespace-pre-wrap">
          {commit || <span class="text-text-muted">Fill in the fields above…</span>}
        </pre>
      </div>

      <p class="text-xs text-text-muted">
        Follows <a href="https://www.conventionalcommits.org/" target="_blank" rel="noopener" class="text-primary hover:underline">Conventional Commits</a> spec. Header kept under 72 chars for best Git log readability.
      </p>
    </div>
  );
}
