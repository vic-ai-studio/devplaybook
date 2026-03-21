import { useState } from 'preact/hooks';

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit?utm_source=devplaybook&utm_medium=tool&utm_campaign=ai-commit-generator';

// Heuristic keywords → commit type inference
const TYPE_HINTS: Array<{ patterns: RegExp[]; type: string; emoji: string }> = [
  { patterns: [/\badd(ed|ing)?\b/i, /\bnew\b/i, /\bintroduc/i, /\bcreate/i, /\bimplement/i], type: 'feat', emoji: '✨' },
  { patterns: [/\bfix(ed|ing)?\b/i, /\bbug\b/i, /\bpatch\b/i, /\bresolv/i, /\bcorrect/i, /\bcras/i, /\berror\b/i], type: 'fix', emoji: '🐛' },
  { patterns: [/\brefactor/i, /\bclean/i, /\brewrite/i, /\brestructure/i, /\bmove\b/i, /\brename\b/i], type: 'refactor', emoji: '♻️' },
  { patterns: [/\bperformance\b/i, /\boptimiz/i, /\bspeed\b/i, /\bfast/i, /\bcach/i, /\blatency\b/i], type: 'perf', emoji: '⚡' },
  { patterns: [/\bdocs?\b/i, /\bcomment/i, /\breadme/i, /\bexplain/i, /\bdocumentation\b/i], type: 'docs', emoji: '📝' },
  { patterns: [/\btest/i, /\bspec\b/i, /\bunit test/i, /\bintegration/i], type: 'test', emoji: '✅' },
  { patterns: [/\bdeploy\b/i, /\bci\b/i, /\bcd\b/i, /\bpipeline\b/i, /\bgithub.action/i, /\bworkflow/i], type: 'ci', emoji: '👷' },
  { patterns: [/\bstyle\b/i, /\bformat/i, /\blint/i, /\bwhitespace\b/i, /\bindent/i], type: 'style', emoji: '💄' },
  { patterns: [/\bdependen/i, /\bpackage\b/i, /\bupgrade\b/i, /\bupdat/i, /\bbump\b/i], type: 'chore', emoji: '🔧' },
  { patterns: [/\brevert/i, /\brollback\b/i, /\bundo\b/i], type: 'revert', emoji: '⏪' },
];

const SCOPE_HINTS: Array<{ pattern: RegExp; scope: string }> = [
  { pattern: /\bauth(entication|orization)?\b/i, scope: 'auth' },
  { pattern: /\bapi\b/i, scope: 'api' },
  { pattern: /\bui\b|\bfront[- ]?end\b|\bpage\b|\bcomponent\b/i, scope: 'ui' },
  { pattern: /\bdb\b|\bdatabase\b|\bmigration\b|\bschema\b/i, scope: 'db' },
  { pattern: /\bconfig\b|\benv\b|\bsetting\b/i, scope: 'config' },
  { pattern: /\bdoc\b|\breadme\b/i, scope: 'docs' },
  { pattern: /\btest\b/i, scope: 'tests' },
  { pattern: /\bdeploy\b|\bci\b|\bworkflow\b/i, scope: 'ci' },
];

interface GeneratedCommit {
  type: string;
  emoji: string;
  scope: string;
  message: string;
  full: string;
  style: 'conventional' | 'imperative' | 'descriptive';
}

function inferType(desc: string): { type: string; emoji: string } {
  for (const { patterns, type, emoji } of TYPE_HINTS) {
    if (patterns.some(p => p.test(desc))) return { type, emoji };
  }
  return { type: 'chore', emoji: '🔧' };
}

function inferScope(desc: string): string {
  for (const { pattern, scope } of SCOPE_HINTS) {
    if (pattern.test(desc)) return scope;
  }
  return '';
}

function toImperative(desc: string): string {
  // Common past → imperative conversions
  return desc
    .trim()
    .replace(/^(added|adds)\b/i, 'add')
    .replace(/^(fixed|fixes)\b/i, 'fix')
    .replace(/^(removed|removes)\b/i, 'remove')
    .replace(/^(updated|updates)\b/i, 'update')
    .replace(/^(refactored|refactors)\b/i, 'refactor')
    .replace(/^(implemented|implements)\b/i, 'implement')
    .replace(/^(created|creates)\b/i, 'create')
    .replace(/^(moved|moves)\b/i, 'move')
    .replace(/^(renamed|renames)\b/i, 'rename')
    .replace(/^(optimized|optimizes)\b/i, 'optimize')
    .replace(/^(deployed|deploys)\b/i, 'deploy')
    .replace(/^(integrated|integrates)\b/i, 'integrate')
    .replace(/^(migrated|migrates)\b/i, 'migrate');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateCommits(description: string, includeEmoji: boolean, breakingChange: boolean, issueRef: string): GeneratedCommit[] {
  if (!description.trim()) return [];

  const { type, emoji } = inferType(description);
  const scope = inferScope(description);
  const imperative = toImperative(description.trim().toLowerCase());
  const breakingMark = breakingChange ? '!' : '';
  const scopeStr = scope ? `(${scope})` : '';
  const emojiPrefix = includeEmoji ? `${emoji} ` : '';
  const issueClose = issueRef.trim()
    ? `\n\nCloses ${issueRef.trim().startsWith('#') ? issueRef.trim() : '#' + issueRef.trim()}`
    : '';

  const commits: GeneratedCommit[] = [
    {
      type, emoji, scope, style: 'conventional',
      message: `${type}${scopeStr}${breakingMark}: ${imperative}`,
      full: `${emojiPrefix}${type}${scopeStr}${breakingMark}: ${imperative}${issueClose}`,
    },
    {
      type, emoji, scope, style: 'imperative',
      message: capitalize(imperative),
      full: `${emojiPrefix}${capitalize(imperative)}${issueClose}`,
    },
    {
      type, emoji, scope, style: 'descriptive',
      message: `[${type.toUpperCase()}] ${capitalize(imperative)}`,
      full: `${emojiPrefix}[${type.toUpperCase()}]${scope ? ` [${scope.toUpperCase()}]` : ''} ${capitalize(imperative)}${issueClose}`,
    },
  ];

  return commits;
}

const STYLE_LABELS: Record<string, string> = {
  conventional: 'Conventional Commits',
  imperative: 'Imperative (simple)',
  descriptive: 'Bracket style [TYPE]',
};

export default function AiCommitGenerator() {
  const [description, setDescription] = useState('');
  const [includeEmoji, setIncludeEmoji] = useState(true);
  const [breakingChange, setBreakingChange] = useState(false);
  const [issueRef, setIssueRef] = useState('');
  const [commits, setCommits] = useState<GeneratedCommit[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>('conventional');

  const generate = () => {
    setCommits(generateCommits(description, includeEmoji, breakingChange, issueRef));
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const selected = commits.find(c => c.style === selectedStyle);
  const charCount = selected?.full.split('\n')[0].length ?? 0;
  const headerOk = charCount <= 72;

  return (
    <div class="space-y-5">
      {/* Description input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Describe your change in plain English
        </label>
        <textarea
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none h-24"
          placeholder={'Examples:\n• "Added user authentication with JWT tokens"\n• "Fixed the login page crashing on mobile"\n• "Refactored the database query to use indexes"'}
          value={description}
          onInput={e => {
            setDescription((e.target as HTMLTextAreaElement).value);
            setCommits([]);
          }}
        />
      </div>

      {/* Options row */}
      <div class="flex flex-wrap gap-4 items-center">
        <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-text-muted">
          <input type="checkbox" checked={includeEmoji}
            onChange={e => setIncludeEmoji((e.target as HTMLInputElement).checked)} />
          Include emoji
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-text-muted">
          <input type="checkbox" checked={breakingChange}
            onChange={e => setBreakingChange((e.target as HTMLInputElement).checked)} />
          Breaking change
        </label>
        <div class="flex items-center gap-2">
          <span class="text-sm text-text-muted">#Issue:</span>
          <input
            type="text"
            value={issueRef}
            onInput={e => setIssueRef((e.target as HTMLInputElement).value)}
            placeholder="123"
            class="w-20 bg-bg-card border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!description.trim()}
        class="w-full py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generate Commit Messages
      </button>

      {commits.length > 0 && (
        <div class="space-y-4">
          {/* Style selector */}
          <div>
            <p class="text-sm font-medium text-text-muted mb-2">Style</p>
            <div class="flex gap-2 flex-wrap">
              {commits.map(c => (
                <button
                  key={c.style}
                  onClick={() => setSelectedStyle(c.style)}
                  class={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${selectedStyle === c.style ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-muted hover:border-primary/50'}`}
                >
                  {STYLE_LABELS[c.style]}
                </button>
              ))}
            </div>
          </div>

          {/* Selected commit output */}
          {selected && (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class={`text-xs px-2 py-0.5 rounded font-mono ${headerOk ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {charCount}/72 chars
                  </span>
                  <span class="text-xs text-text-muted">first line</span>
                </div>
                <div class="flex gap-2">
                  <button onClick={() => copy(selected.message, 'msg')}
                    class="text-xs text-text-muted hover:text-primary transition-colors">
                    {copied === 'msg' ? 'Copied!' : 'Copy short'}
                  </button>
                  <button onClick={() => copy(selected.full, 'full')}
                    class="text-xs text-primary hover:underline">
                    {copied === 'full' ? 'Copied!' : 'Copy full'}
                  </button>
                </div>
              </div>
              <pre class="bg-bg-card border border-border rounded-lg p-4 text-sm font-mono whitespace-pre-wrap select-all text-text">{selected.full}</pre>
              {selected.type && (
                <p class="text-xs text-text-muted">
                  Detected type: <span class="text-primary font-mono">{selected.emoji} {selected.type}</span>
                  {selected.scope && <> · scope: <span class="text-primary font-mono">{selected.scope}</span></>}
                </p>
              )}
            </div>
          )}

          {/* All variants */}
          <details class="group">
            <summary class="text-xs text-text-muted cursor-pointer hover:text-primary select-none">
              See all {commits.length} variants
            </summary>
            <div class="mt-3 space-y-2">
              {commits.map(c => (
                <div key={c.style} class="flex items-center gap-2 p-2 rounded-lg bg-bg-card border border-border">
                  <span class="text-xs text-text-muted w-36 shrink-0">{STYLE_LABELS[c.style]}</span>
                  <code class="text-xs font-mono flex-1 truncate text-text">{c.full.split('\n')[0]}</code>
                  <button onClick={() => copy(c.full, c.style)}
                    class="text-xs text-primary hover:underline shrink-0">
                    {copied === c.style ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      <div class="border-t border-border pt-4">
        <p class="text-xs text-text-muted">
          Tip: Use imperative mood ("add", not "added"). Keep the first line under 72 chars.{' '}
          <a href="/tools/git-commit-generator" class="text-primary hover:underline">
            Try the Conventional Commits builder →
          </a>
        </p>
        <p class="text-xs text-text-muted mt-1">
          <a href={DEVTOOLKIT_URL} target="_blank" rel="noopener" class="text-primary hover:underline">
            Get the DevToolkit Starter Kit →
          </a>
        </p>
      </div>
    </div>
  );
}
