import { useState, useMemo } from 'preact/hooks';

const COMMANDS = [
  // Setup
  { category: 'Setup', cmd: 'git config --global user.name "Name"', desc: 'Set global username', tags: ['config', 'setup'] },
  { category: 'Setup', cmd: 'git config --global user.email "email@example.com"', desc: 'Set global email', tags: ['config', 'setup'] },
  { category: 'Setup', cmd: 'git config --list', desc: 'Show all config settings', tags: ['config', 'setup'] },
  { category: 'Setup', cmd: 'git init', desc: 'Initialize a new repo in current directory', tags: ['setup', 'init'] },
  { category: 'Setup', cmd: 'git clone <url>', desc: 'Clone a remote repository', tags: ['setup', 'remote'] },
  // Staging & Committing
  { category: 'Staging & Committing', cmd: 'git status', desc: 'Show working tree status', tags: ['status'] },
  { category: 'Staging & Committing', cmd: 'git add <file>', desc: 'Stage a specific file', tags: ['stage', 'add'] },
  { category: 'Staging & Committing', cmd: 'git add .', desc: 'Stage all changes', tags: ['stage', 'add'] },
  { category: 'Staging & Committing', cmd: 'git add -p', desc: 'Interactively stage hunks', tags: ['stage', 'add'] },
  { category: 'Staging & Committing', cmd: 'git commit -m "message"', desc: 'Commit with a message', tags: ['commit'] },
  { category: 'Staging & Committing', cmd: 'git commit --amend', desc: 'Amend the last commit', tags: ['commit', 'amend'] },
  { category: 'Staging & Committing', cmd: 'git diff', desc: 'Show unstaged changes', tags: ['diff'] },
  { category: 'Staging & Committing', cmd: 'git diff --staged', desc: 'Show staged changes', tags: ['diff', 'stage'] },
  { category: 'Staging & Committing', cmd: 'git stash', desc: 'Stash current changes', tags: ['stash'] },
  { category: 'Staging & Committing', cmd: 'git stash pop', desc: 'Apply stashed changes', tags: ['stash'] },
  { category: 'Staging & Committing', cmd: 'git stash list', desc: 'List all stashes', tags: ['stash'] },
  // Branches
  { category: 'Branches', cmd: 'git branch', desc: 'List local branches', tags: ['branch'] },
  { category: 'Branches', cmd: 'git branch -a', desc: 'List all branches (local + remote)', tags: ['branch', 'remote'] },
  { category: 'Branches', cmd: 'git branch <name>', desc: 'Create a new branch', tags: ['branch', 'create'] },
  { category: 'Branches', cmd: 'git checkout <branch>', desc: 'Switch to a branch', tags: ['branch', 'checkout'] },
  { category: 'Branches', cmd: 'git checkout -b <branch>', desc: 'Create and switch to branch', tags: ['branch', 'checkout', 'create'] },
  { category: 'Branches', cmd: 'git switch <branch>', desc: 'Switch branches (modern syntax)', tags: ['branch', 'switch'] },
  { category: 'Branches', cmd: 'git switch -c <branch>', desc: 'Create and switch (modern syntax)', tags: ['branch', 'switch', 'create'] },
  { category: 'Branches', cmd: 'git branch -d <branch>', desc: 'Delete a merged branch', tags: ['branch', 'delete'] },
  { category: 'Branches', cmd: 'git branch -D <branch>', desc: 'Force delete a branch', tags: ['branch', 'delete'] },
  { category: 'Branches', cmd: 'git merge <branch>', desc: 'Merge a branch into current', tags: ['merge'] },
  { category: 'Branches', cmd: 'git rebase <branch>', desc: 'Rebase onto another branch', tags: ['rebase'] },
  { category: 'Branches', cmd: 'git rebase -i HEAD~3', desc: 'Interactive rebase (last 3 commits)', tags: ['rebase', 'interactive'] },
  // Remote
  { category: 'Remote', cmd: 'git remote -v', desc: 'List remote connections', tags: ['remote'] },
  { category: 'Remote', cmd: 'git remote add origin <url>', desc: 'Add a remote named origin', tags: ['remote', 'setup'] },
  { category: 'Remote', cmd: 'git fetch', desc: 'Fetch all remotes', tags: ['remote', 'fetch'] },
  { category: 'Remote', cmd: 'git fetch origin', desc: 'Fetch from origin', tags: ['remote', 'fetch'] },
  { category: 'Remote', cmd: 'git pull', desc: 'Fetch and merge from remote', tags: ['remote', 'pull'] },
  { category: 'Remote', cmd: 'git pull --rebase', desc: 'Fetch and rebase from remote', tags: ['remote', 'pull', 'rebase'] },
  { category: 'Remote', cmd: 'git push origin <branch>', desc: 'Push branch to remote', tags: ['remote', 'push'] },
  { category: 'Remote', cmd: 'git push -u origin <branch>', desc: 'Push and set upstream', tags: ['remote', 'push'] },
  { category: 'Remote', cmd: 'git push --force-with-lease', desc: 'Safe force push', tags: ['remote', 'push'] },
  // History
  { category: 'History', cmd: 'git log', desc: 'Show commit history', tags: ['log', 'history'] },
  { category: 'History', cmd: 'git log --oneline', desc: 'Compact one-line log', tags: ['log', 'history'] },
  { category: 'History', cmd: 'git log --oneline --graph', desc: 'Visual branch graph', tags: ['log', 'history', 'graph'] },
  { category: 'History', cmd: 'git log -p', desc: 'Show patches in log', tags: ['log', 'diff'] },
  { category: 'History', cmd: 'git show <commit>', desc: 'Show a commit details', tags: ['log', 'history'] },
  { category: 'History', cmd: 'git blame <file>', desc: 'Show who changed each line', tags: ['blame', 'history'] },
  { category: 'History', cmd: 'git log --author="Name"', desc: 'Filter log by author', tags: ['log', 'filter'] },
  { category: 'History', cmd: 'git log --since="2 weeks ago"', desc: 'Filter log by date', tags: ['log', 'filter'] },
  // Undo
  { category: 'Undo & Reset', cmd: 'git restore <file>', desc: 'Discard working dir changes', tags: ['undo', 'restore'] },
  { category: 'Undo & Reset', cmd: 'git restore --staged <file>', desc: 'Unstage a file', tags: ['undo', 'stage'] },
  { category: 'Undo & Reset', cmd: 'git reset HEAD~1', desc: 'Undo last commit (keep changes)', tags: ['undo', 'reset'] },
  { category: 'Undo & Reset', cmd: 'git reset --hard HEAD~1', desc: 'Undo last commit (discard changes)', tags: ['undo', 'reset'] },
  { category: 'Undo & Reset', cmd: 'git revert <commit>', desc: 'Create a revert commit', tags: ['undo', 'revert'] },
  { category: 'Undo & Reset', cmd: 'git clean -fd', desc: 'Remove untracked files/dirs', tags: ['undo', 'clean'] },
  // Tags
  { category: 'Tags', cmd: 'git tag', desc: 'List all tags', tags: ['tag'] },
  { category: 'Tags', cmd: 'git tag v1.0.0', desc: 'Create lightweight tag', tags: ['tag', 'create'] },
  { category: 'Tags', cmd: 'git tag -a v1.0.0 -m "Release"', desc: 'Create annotated tag', tags: ['tag', 'create'] },
  { category: 'Tags', cmd: 'git push origin --tags', desc: 'Push all tags to remote', tags: ['tag', 'remote', 'push'] },
  { category: 'Tags', cmd: 'git tag -d v1.0.0', desc: 'Delete a local tag', tags: ['tag', 'delete'] },
];

const CATEGORIES = ['All', ...Array.from(new Set(COMMANDS.map(c => c.category)))];

export default function GitCheatsheetInteractive() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return COMMANDS.filter(c => {
      const matchCat = category === 'All' || c.category === category;
      const matchSearch = !q || c.cmd.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.tags.some(t => t.includes(q));
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof COMMANDS>();
    for (const cmd of filtered) {
      if (!map.has(cmd.category)) map.set(cmd.category, []);
      map.get(cmd.category)!.push(cmd);
    }
    return map;
  }, [filtered]);

  const copy = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopied(cmd);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div class="space-y-5">
      {/* Search + filter */}
      <div class="bg-bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search commands, descriptions, tags..."
          value={search}
          onInput={(e: any) => setSearch(e.target.value)}
          class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-primary"
        />
        <select
          value={category}
          onChange={(e: any) => setCategory(e.target.value)}
          class="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
        >
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <span class="text-text-muted text-xs self-center whitespace-nowrap">{filtered.length} commands</span>
      </div>

      {/* Results */}
      {grouped.size === 0 ? (
        <div class="text-center text-text-muted py-10">No commands found.</div>
      ) : (
        Array.from(grouped.entries()).map(([cat, cmds]) => (
          <div key={cat} class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="px-4 py-2 bg-bg border-b border-border">
              <span class="text-xs font-semibold text-primary uppercase tracking-wider">{cat}</span>
            </div>
            <div class="divide-y divide-border">
              {cmds.map(c => (
                <div key={c.cmd} class="flex items-center justify-between gap-4 px-4 py-3 hover:bg-bg transition-colors group">
                  <div class="flex-1 min-w-0">
                    <code class="text-sm text-green-400 font-mono block truncate">{c.cmd}</code>
                    <span class="text-xs text-text-muted">{c.desc}</span>
                  </div>
                  <button
                    onClick={() => copy(c.cmd)}
                    class="flex-shrink-0 text-xs px-3 py-1 rounded-md border border-border text-text-muted hover:text-white hover:border-primary transition-colors"
                  >
                    {copied === c.cmd ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
