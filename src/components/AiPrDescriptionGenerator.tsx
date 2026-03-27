import { useState } from 'preact/hooks';

type Section = { title: string; content: string };

function inferType(commits: string, branch: string): string {
  const combined = (commits + ' ' + branch).toLowerCase();
  if (/\bfix(ed|es)?\b|\bbug\b|\bpatch\b|\bhotfix\b/.test(combined)) return '🐛 Bug Fix';
  if (/\bfeat(ure)?\b|\badd(ed|s)?\b|\bnew\b|\bimplement/.test(combined)) return '✨ Feature';
  if (/\brefactor\b|\bclean\b|\brestructure\b/.test(combined)) return '♻️ Refactor';
  if (/\bperf(ormance)?\b|\boptimiz\b|\bspeed\b|\bfast/.test(combined)) return '⚡ Performance';
  if (/\bdoc\b|\breadme\b|\bcomment\b|\bchanelog/.test(combined)) return '📝 Documentation';
  if (/\btest\b|\bspec\b|\be2e\b|\bunit/.test(combined)) return '✅ Tests';
  if (/\bci\b|\bcd\b|\bdeploy\b|\bpipeline\b|\bworkflow\b/.test(combined)) return '👷 CI/CD';
  if (/\bdepen(dency|dencies)\b|\bupgrad\b|\bbump\b/.test(combined)) return '🔧 Dependency Update';
  if (/\bstyle\b|\bformat\b|\blint\b/.test(combined)) return '💄 Style';
  return '🔨 Change';
}

function parseBranch(branch: string): string {
  // Remove common prefixes: feature/, fix/, feat/, chore/, hotfix/
  return branch
    .replace(/^(feature|feat|fix|bugfix|hotfix|chore|refactor|perf|docs|test|ci|style)\//i, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

function generateDescription(
  title: string,
  branch: string,
  commitsRaw: string,
  testingNotes: string,
  jiraTicket: string,
): Section[] {
  const commits = commitsRaw
    .split('\n')
    .map(l => l.replace(/^[-*•]\s*/, '').replace(/^[a-f0-9]{6,40}\s+/, '').trim())
    .filter(Boolean);

  const prType = inferType(commitsRaw, branch);
  const branchReadable = parseBranch(branch);

  const sections: Section[] = [];

  // Summary
  const summary = title.trim() || (branchReadable ? `${prType.split(' ').slice(1).join(' ')}: ${branchReadable}` : 'No title provided');
  sections.push({
    title: '## Summary',
    content: summary + (jiraTicket.trim() ? `\n\nRelated: ${jiraTicket.trim()}` : ''),
  });

  // Type
  sections.push({
    title: '## Type',
    content: `- [x] ${prType}`,
  });

  // What changed
  if (commits.length) {
    sections.push({
      title: '## Changes',
      content: commits.map(c => `- ${c}`).join('\n'),
    });
  }

  // Testing
  const testDefault = testingNotes.trim() ||
    '- [ ] Manual testing in local environment\n- [ ] Existing tests pass\n- [ ] New tests added (if applicable)';
  sections.push({
    title: '## Testing',
    content: testDefault,
  });

  // Notes / checklist
  sections.push({
    title: '## Checklist',
    content:
      '- [ ] Code follows project conventions\n' +
      '- [ ] Self-review completed\n' +
      '- [ ] No console.log or debug code left in\n' +
      '- [ ] Documentation updated (if needed)',
  });

  return sections;
}

export default function AiPrDescriptionGenerator() {
  const [title, setTitle] = useState('');
  const [branch, setBranch] = useState('');
  const [commits, setCommits] = useState('');
  const [testing, setTesting] = useState('');
  const [jira, setJira] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [copied, setCopied] = useState(false);

  const generate = () => setSections(generateDescription(title, branch, commits, testing, jira));

  const fullText = sections.map(s => `${s.title}\n\n${s.content}`).join('\n\n');

  const copy = () => {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const hasInput = branch.trim() || commits.trim() || title.trim();

  return (
    <div class="space-y-5">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1.5">PR title (optional)</label>
          <input
            type="text"
            class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="e.g. Add user authentication flow"
            value={title}
            onInput={e => { setTitle((e.target as HTMLInputElement).value); setSections([]); }}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1.5">Branch name</label>
          <input
            type="text"
            class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors font-mono"
            placeholder="e.g. feature/user-auth or fix/login-crash"
            value={branch}
            onInput={e => { setBranch((e.target as HTMLInputElement).value); setSections([]); }}
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-1.5">
          Commit messages <span class="text-text-muted font-normal">(one per line)</span>
        </label>
        <textarea
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none h-28 font-mono"
          placeholder={'feat(auth): add JWT token validation\nfix(auth): handle expired token edge case\ntest: add auth middleware unit tests'}
          value={commits}
          onInput={e => { setCommits((e.target as HTMLTextAreaElement).value); setSections([]); }}
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1.5">Testing steps (optional)</label>
          <textarea
            class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none h-20"
            placeholder={'- Go to /login\n- Sign in with a valid account\n- Verify token is stored in localStorage'}
            value={testing}
            onInput={e => { setTesting((e.target as HTMLTextAreaElement).value); setSections([]); }}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1.5">Jira / Linear ticket (optional)</label>
          <input
            type="text"
            class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="e.g. PROJ-123 or #456"
            value={jira}
            onInput={e => { setJira((e.target as HTMLInputElement).value); setSections([]); }}
          />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!hasInput}
        class="w-full py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generate PR Description
      </button>

      {sections.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Generated Description</p>
            <button
              onClick={copy}
              class="text-xs text-primary hover:underline font-semibold"
            >
              {copied ? '✓ Copied!' : 'Copy all'}
            </button>
          </div>
          <pre class="bg-bg-card border border-border rounded-xl p-5 text-sm font-mono whitespace-pre-wrap select-all text-text overflow-auto max-h-96">
            {fullText}
          </pre>
          <p class="text-xs text-text-muted">
            Paste this directly into GitHub, GitLab, or Bitbucket PR description field.
          </p>
        </div>
      )}

      <div class="border-t border-border pt-4 text-xs text-text-muted space-y-1">
        <p>Tip: Good PR descriptions help reviewers understand the context and test your changes faster.</p>
        <p>
          <a href="/tools/ai-commit-generator" class="text-primary hover:underline">AI Commit Generator →</a>
          {' · '}
          <a href="/tools/ai-variable-namer" class="text-primary hover:underline">AI Variable Namer →</a>
        </p>
      </div>
    </div>
  );
}
