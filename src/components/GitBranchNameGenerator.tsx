import { useState, useCallback } from 'preact/hooks';

type Convention = 'feature' | 'bugfix' | 'hotfix' | 'chore' | 'docs' | 'refactor' | 'test';

const CONVENTIONS: { value: Convention; label: string; color: string }[] = [
  { value: 'feature', label: 'feature/', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { value: 'bugfix', label: 'bugfix/', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
  { value: 'hotfix', label: 'hotfix/', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { value: 'chore', label: 'chore/', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
  { value: 'docs', label: 'docs/', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  { value: 'refactor', label: 'refactor/', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { value: 'test', label: 'test/', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove ticket prefixes like JIRA-123, VIC-456
    .replace(/^[a-z]+-\d+\s*/i, match => match.trim().toLowerCase().replace(/\s+/, '-') + '-')
    // Replace special chars and spaces with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-{2,}/g, '-')
    // Max 60 chars
    .slice(0, 60)
    .replace(/-+$/, '');
}

function extractTicket(text: string): string {
  const match = text.match(/^([A-Z]+-\d+)\s*/i);
  return match ? match[1].toUpperCase() : '';
}

function buildBranchName(convention: Convention, description: string, includeTicket: boolean, ticket: string): string {
  let slug = slugify(description);
  if (!slug) return '';

  // If ticket extraction is on and ticket found, prepend it
  if (includeTicket && ticket) {
    const ticketSlug = ticket.toLowerCase();
    // Avoid duplication if slug already starts with ticket
    if (!slug.startsWith(ticketSlug)) {
      slug = `${ticketSlug}-${slug.replace(new RegExp(`^${ticketSlug}-?`), '')}`;
    }
  }

  return `${convention}/${slug}`;
}

const EXAMPLES = [
  'JIRA-123 Add user authentication with OAuth2',
  'Fix login page crash on mobile Safari',
  'VIC-456 Implement dark mode toggle',
  'Update README with setup instructions',
  'Refactor payment processing module',
];

export default function GitBranchNameGenerator() {
  const [description, setDescription] = useState('');
  const [convention, setConvention] = useState<Convention>('feature');
  const [includeTicket, setIncludeTicket] = useState(true);
  const [copied, setCopied] = useState(false);

  const ticket = extractTicket(description);
  const branchName = buildBranchName(convention, description, includeTicket, ticket);

  const copy = useCallback(() => {
    if (!branchName) return;
    navigator.clipboard.writeText(branchName).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [branchName]);

  const conventionColor = CONVENTIONS.find(c => c.value === convention)?.color ?? '';

  return (
    <div class="space-y-5">
      {/* Description input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">
          Ticket / Issue Description
        </label>
        <textarea
          value={description}
          onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
          placeholder="e.g. JIRA-123 Add user authentication with OAuth2"
          rows={2}
          class="w-full px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-accent resize-none"
        />
        {ticket && (
          <p class="text-xs text-text-muted mt-1">
            Detected ticket: <span class="font-mono text-accent">{ticket}</span>
          </p>
        )}
      </div>

      {/* Convention selector */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Branch Convention</label>
        <div class="flex flex-wrap gap-2">
          {CONVENTIONS.map(c => (
            <button
              key={c.value}
              onClick={() => setConvention(c.value)}
              class={`px-3 py-1 rounded-full border text-sm font-mono font-medium transition-colors ${
                convention === c.value
                  ? c.color + ' border-current'
                  : 'bg-surface border-border text-text-muted hover:border-accent/50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      {ticket && (
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={includeTicket}
            onChange={(e) => setIncludeTicket((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 rounded accent-accent"
          />
          <span class="text-text-muted">Prepend ticket number (<span class="font-mono">{ticket}</span>)</span>
        </label>
      )}

      {/* Result */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">Generated Branch Name</label>
        <div class="flex items-center gap-2">
          <div class="flex-1 px-3 py-3 bg-surface border border-border rounded-lg font-mono text-sm min-h-[46px] break-all">
            {branchName ? (
              <>
                <span class={`font-semibold ${conventionColor.split(' ')[1] ?? 'text-accent'}`}>
                  {convention}/
                </span>
                <span>{branchName.slice(convention.length + 1)}</span>
              </>
            ) : (
              <span class="text-text-muted">Enter a description to generate...</span>
            )}
          </div>
          <button
            onClick={copy}
            disabled={!branchName}
            class={`px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              branchName
                ? 'bg-accent text-white hover:bg-accent/90'
                : 'bg-surface border border-border text-text-muted cursor-not-allowed'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Git command */}
      {branchName && (
        <div class="p-3 bg-surface border border-border rounded-lg">
          <p class="text-xs text-text-muted mb-1">Git command:</p>
          <code class="text-xs font-mono text-accent">git checkout -b {branchName}</code>
        </div>
      )}

      {/* Examples */}
      <div>
        <p class="text-xs text-text-muted mb-2">Try an example:</p>
        <div class="flex flex-wrap gap-2">
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setDescription(ex)}
              class="text-xs px-2 py-1 rounded border border-border bg-surface hover:border-accent/50 hover:text-accent text-text-muted transition-colors"
            >
              {ex.length > 40 ? ex.slice(0, 40) + '…' : ex}
            </button>
          ))}
        </div>
      </div>

      {/* Rules info */}
      <div class="text-xs text-text-muted space-y-1 p-3 bg-surface border border-border rounded-lg">
        <p class="font-medium">Naming rules applied:</p>
        <ul class="list-disc list-inside space-y-0.5 ml-1">
          <li>Lowercase only</li>
          <li>Spaces and special chars → hyphens</li>
          <li>Ticket ID preserved (JIRA-123, VIC-456...)</li>
          <li>Max 60 characters</li>
          <li>No double hyphens</li>
        </ul>
      </div>
    </div>
  );
}
