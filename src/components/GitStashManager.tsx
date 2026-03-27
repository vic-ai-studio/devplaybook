import { useState } from 'preact/hooks';

interface Command {
  cmd: string;
  desc: string;
}

interface Section {
  title: string;
  icon: string;
  commands: Command[];
}

function buildSections(idx: number): Section[] {
  return [
    {
      title: 'Save Changes',
      icon: '💾',
      commands: [
        { cmd: 'git stash', desc: 'Stash all tracked modified files and staged changes, restoring a clean working directory.' },
        { cmd: `git stash push -m "message"`, desc: 'Stash with a descriptive label so you can identify it later in the stash list.' },
        { cmd: 'git stash push --include-untracked', desc: 'Also stash new files that have not been staged yet (untracked files).' },
        { cmd: 'git stash push --all', desc: 'Stash everything including untracked and ignored files.' },
      ],
    },
    {
      title: 'List Stashes',
      icon: '📋',
      commands: [
        { cmd: 'git stash list', desc: 'Show all stash entries with their index, branch, and message.' },
        { cmd: `git stash show stash@{${idx}}`, desc: `Display a summary of files changed in stash@{${idx}} (stat view).` },
        { cmd: `git stash show -p stash@{${idx}}`, desc: `Show the full diff patch of stash@{${idx}} so you can inspect every change.` },
      ],
    },
    {
      title: 'Apply Stashes',
      icon: '▶️',
      commands: [
        { cmd: 'git stash apply', desc: 'Re-apply the most recent stash without removing it from the stash list.' },
        { cmd: `git stash apply stash@{${idx}}`, desc: `Apply stash@{${idx}} without removing it — useful to apply the same stash multiple times.` },
        { cmd: 'git stash pop', desc: 'Apply the most recent stash and remove it from the stash list in one step.' },
        { cmd: `git stash pop stash@{${idx}}`, desc: `Apply stash@{${idx}} and drop it from the stash list.` },
      ],
    },
    {
      title: 'Delete Stashes',
      icon: '🗑️',
      commands: [
        { cmd: `git stash drop stash@{${idx}}`, desc: `Remove stash@{${idx}} from the list without applying it.` },
        { cmd: 'git stash clear', desc: 'Delete all stash entries permanently. Cannot be undone.' },
      ],
    },
    {
      title: 'Branch from Stash',
      icon: '🌿',
      commands: [
        { cmd: `git stash branch new-branch stash@{${idx}}`, desc: `Create a new branch from the commit where stash@{${idx}} was made, apply the stash, and drop it on success.` },
      ],
    },
  ];
}

export default function GitStashManager() {
  const [stashIdx, setStashIdx] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const sections = buildSections(stashIdx);

  function handleCopy(cmd: string) {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(cmd);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  return (
    <div class="space-y-6">
      {/* Stash index control */}
      <div class="flex items-center gap-3 p-4 bg-bg-card border border-border rounded-xl">
        <label class="text-sm font-medium text-text whitespace-nowrap" for="stash-idx">
          Stash index <code class="text-primary">stash@&#123;N&#125;</code>
        </label>
        <input
          id="stash-idx"
          type="number"
          min={0}
          value={stashIdx}
          onInput={(e) => {
            const v = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(v) && v >= 0) setStashIdx(v);
          }}
          class="w-20 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-center font-mono focus:outline-none focus:border-primary transition-colors"
        />
        <span class="text-xs text-text-muted">
          Change this number to update all <code class="font-mono">stash@&#123;N&#125;</code> references below.
        </span>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div key={section.title} class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center gap-2 px-5 py-3 border-b border-border bg-bg">
            <span class="text-lg">{section.icon}</span>
            <h2 class="font-semibold text-base text-text">{section.title}</h2>
          </div>
          <div class="divide-y divide-border">
            {section.commands.map((item) => (
              <div key={item.cmd} class="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
                <div class="flex-1 min-w-0">
                  <div class="bg-[#0d1117] rounded-lg px-4 py-2.5 mb-2 overflow-x-auto">
                    <code class="text-sm font-mono text-green-400 whitespace-nowrap">{item.cmd}</code>
                  </div>
                  <p class="text-xs text-text-muted leading-relaxed">{item.desc}</p>
                </div>
                <button
                  onClick={() => handleCopy(item.cmd)}
                  class={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    copied === item.cmd
                      ? 'bg-green-500/10 border-green-500/40 text-green-500'
                      : 'bg-bg border-border text-text-muted hover:border-primary hover:text-primary'
                  }`}
                  aria-label={`Copy: ${item.cmd}`}
                >
                  {copied === item.cmd ? (
                    <>
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
