import { useState } from 'preact/hooks';

interface GitOption { flag: string; label: string; hasValue?: boolean; }

const COMMANDS: Record<string, { desc: string; options: GitOption[] }> = {
  commit: {
    desc: 'Record changes to the repository',
    options: [
      { flag: '-m', label: 'Message', hasValue: true },
      { flag: '--amend', label: 'Amend last commit' },
      { flag: '-a', label: 'Stage all modified files' },
      { flag: '--no-verify', label: 'Skip hooks' },
      { flag: '--allow-empty', label: 'Allow empty commit' },
    ],
  },
  branch: {
    desc: 'List, create, or delete branches',
    options: [
      { flag: '-d', label: 'Delete branch' },
      { flag: '-D', label: 'Force delete branch' },
      { flag: '-m', label: 'Rename branch', hasValue: true },
      { flag: '-a', label: 'List all branches' },
      { flag: '-r', label: 'List remote branches' },
    ],
  },
  checkout: {
    desc: 'Switch branches or restore files',
    options: [
      { flag: '-b', label: 'Create and switch', hasValue: true },
      { flag: '--', label: 'Restore file', hasValue: true },
      { flag: '--orphan', label: 'Create orphan branch', hasValue: true },
    ],
  },
  log: {
    desc: 'Show commit logs',
    options: [
      { flag: '--oneline', label: 'One line per commit' },
      { flag: '--graph', label: 'Show graph' },
      { flag: '--all', label: 'All branches' },
      { flag: '-n', label: 'Limit count', hasValue: true },
      { flag: '--author', label: 'Filter by author', hasValue: true },
      { flag: '--since', label: 'Since date', hasValue: true },
    ],
  },
  reset: {
    desc: 'Reset current HEAD to specified state',
    options: [
      { flag: '--soft', label: 'Keep changes staged' },
      { flag: '--mixed', label: 'Keep changes unstaged (default)' },
      { flag: '--hard', label: 'Discard all changes' },
    ],
  },
  stash: {
    desc: 'Stash changes in working directory',
    options: [
      { flag: 'push', label: 'Push to stash' },
      { flag: 'pop', label: 'Pop from stash' },
      { flag: 'list', label: 'List stashes' },
      { flag: '-m', label: 'Stash message', hasValue: true },
      { flag: '--include-untracked', label: 'Include untracked' },
    ],
  },
  rebase: {
    desc: 'Reapply commits on top of another base',
    options: [
      { flag: '-i', label: 'Interactive' },
      { flag: '--onto', label: 'New base', hasValue: true },
      { flag: '--abort', label: 'Abort rebase' },
      { flag: '--continue', label: 'Continue rebase' },
    ],
  },
  cherry_pick: {
    desc: 'Apply specific commits from another branch',
    options: [
      { flag: '-n', label: 'No commit (stage only)' },
      { flag: '-x', label: 'Append cherry-pick line' },
      { flag: '--abort', label: 'Abort cherry-pick' },
    ],
  },
};

export default function GitCommandBuilder() {
  const [cmd, setCmd] = useState('commit');
  const [selected, setSelected] = useState<Record<string, string | boolean>>({});
  const [target, setTarget] = useState('');

  const info = COMMANDS[cmd];

  const toggle = (flag: string, hasValue?: boolean) => {
    const next = { ...selected };
    if (next[flag] !== undefined) delete next[flag];
    else next[flag] = hasValue ? '' : true;
    setSelected(next);
  };

  const setValue = (flag: string, val: string) => {
    setSelected({ ...selected, [flag]: val });
  };

  const buildCommand = () => {
    const cmdName = cmd.replace('_', '-');
    let parts = ['git', cmdName];
    for (const opt of info.options) {
      if (selected[opt.flag] === undefined) continue;
      if (opt.hasValue) {
        const val = selected[opt.flag] as string;
        if (val) {
          if (opt.flag === '--' || !opt.flag.startsWith('-')) parts.push(opt.flag, val.includes(' ') ? `"${val}"` : val);
          else parts.push(`${opt.flag} "${val}"`);
        }
      } else {
        if (!opt.flag.startsWith('-')) parts.push(opt.flag);
        else parts.push(opt.flag);
      }
    }
    if (target) parts.push(target);
    return parts.join(' ');
  };

  return (
    <div class="space-y-6">
      {/* Command selector */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {Object.entries(COMMANDS).map(([key, val]) => (
          <button
            key={key}
            onClick={() => { setCmd(key); setSelected({}); setTarget(''); }}
            class={`rounded-lg px-4 py-2 text-sm font-mono border transition-colors ${
              cmd === key ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-text'
            }`}
          >
            git {key.replace('_', '-')}
          </button>
        ))}
      </div>

      <p class="text-text-muted text-sm">{info.desc}</p>

      {/* Options */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-3">Options</h3>
        <div class="space-y-3">
          {info.options.map(opt => (
            <div key={opt.flag} class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer min-w-48">
                <input
                  type="checkbox"
                  checked={selected[opt.flag] !== undefined}
                  onChange={() => toggle(opt.flag, opt.hasValue)}
                  class="accent-primary"
                />
                <code class="text-sm text-primary">{opt.flag}</code>
                <span class="text-sm text-text-muted">{opt.label}</span>
              </label>
              {opt.hasValue && selected[opt.flag] !== undefined && (
                <input
                  value={selected[opt.flag] as string}
                  onInput={(e) => setValue(opt.flag, (e.target as HTMLInputElement).value)}
                  class="flex-1 bg-bg-input border border-border rounded px-3 py-1 text-sm text-text font-mono"
                  placeholder={`Value for ${opt.flag}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Target */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-2">Target (branch/commit/file)</h3>
        <input
          value={target}
          onInput={(e) => setTarget((e.target as HTMLInputElement).value)}
          class="w-full bg-bg-input border border-border rounded-lg px-4 py-2 text-text font-mono"
          placeholder="e.g., main, HEAD~3, src/index.ts"
        />
      </div>

      {/* Generated command */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-2">Generated Command</h3>
        <div class="bg-bg rounded-lg p-4 font-mono text-lg text-secondary break-all">
          {buildCommand()}
        </div>
        <button
          onClick={() => navigator.clipboard?.writeText(buildCommand())}
          class="mt-3 bg-primary hover:bg-primary-dark text-white text-sm px-4 py-2 rounded-lg"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
