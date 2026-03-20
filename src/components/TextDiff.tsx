import { useState, useMemo } from 'preact/hooks';

type DiffType = 'removed' | 'added' | 'unchanged';

interface DiffLine {
  type: DiffType;
  text: string;
  leftLineNo:  number | null;
  rightLineNo: number | null;
}

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const left  = original.split('\n');
  const right = modified.split('\n');
  const dp    = computeLCS(left, right);

  const result: DiffLine[] = [];
  let i = left.length, j = right.length;

  // Backtrack through LCS table
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      result.unshift({ type: 'unchanged', text: left[i - 1], leftLineNo: i, rightLineNo: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added',   text: right[j - 1], leftLineNo: null, rightLineNo: j });
      j--;
    } else {
      result.unshift({ type: 'removed', text: left[i - 1],  leftLineNo: i,    rightLineNo: null });
      i--;
    }
  }

  return result;
}

function LineNo({ n }: { n: number | null }) {
  return (
    <span class="select-none text-right pr-3 text-text-muted font-mono text-xs w-10 shrink-0 inline-block">
      {n ?? ''}
    </span>
  );
}

const SAMPLE_ORIGINAL = `function greet(name) {
  console.log("Hello, " + name);
  return true;
}

const users = ["Alice", "Bob"];
users.forEach(u => greet(u));`;

const SAMPLE_MODIFIED = `function greet(name, greeting = "Hello") {
  console.log(\`\${greeting}, \${name}!\`);
  return name.length > 0;
}

const users = ["Alice", "Bob", "Carol"];
users.forEach(u => greet(u));
console.log("Done");`;

export default function TextDiff() {
  const [original, setOriginal] = useState(SAMPLE_ORIGINAL);
  const [modified, setModified] = useState(SAMPLE_MODIFIED);
  const [copied, setCopied]     = useState(false);

  const diffLines = useMemo(() => computeDiff(original, modified), [original, modified]);

  const stats = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0;
    for (const l of diffLines) {
      if (l.type === 'added')     added++;
      else if (l.type === 'removed') removed++;
      else unchanged++;
    }
    return { added, removed, unchanged };
  }, [diffLines]);

  function rowClass(type: DiffType) {
    if (type === 'added')   return 'bg-green-900/30 text-green-300';
    if (type === 'removed') return 'bg-red-900/30 text-red-300';
    return 'text-text-muted';
  }

  function prefix(type: DiffType) {
    if (type === 'added')   return '+';
    if (type === 'removed') return '-';
    return ' ';
  }

  async function copyDiff() {
    const summary = [
      `Diff summary: +${stats.added} added, -${stats.removed} removed, ${stats.unchanged} unchanged`,
      '',
      ...diffLines.map(l => `${prefix(l.type)} ${l.text}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — clipboard not available
    }
  }

  const TEXTAREA_CLASS = 'bg-bg-card border border-border rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-primary focus:border-transparent w-full resize-none h-48';

  return (
    <div class="space-y-6">
      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">
            Original <span class="text-text-muted font-normal">(left)</span>
          </label>
          <textarea
            class={TEXTAREA_CLASS}
            value={original}
            onInput={(e) => setOriginal((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste original text here..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">
            Modified <span class="text-text-muted font-normal">(right)</span>
          </label>
          <textarea
            class={TEXTAREA_CLASS}
            value={modified}
            onInput={(e) => setModified((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste modified text here..."
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div class="bg-bg-card rounded-xl p-4 border border-border flex flex-wrap items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-sm bg-green-500 inline-block"></span>
          <span class="text-sm"><span class="font-semibold text-green-400">+{stats.added}</span> <span class="text-text-muted">added</span></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-sm bg-red-500 inline-block"></span>
          <span class="text-sm"><span class="font-semibold text-red-400">-{stats.removed}</span> <span class="text-text-muted">removed</span></span>
        </div>
        <div class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-sm bg-border inline-block"></span>
          <span class="text-sm"><span class="font-semibold">{stats.unchanged}</span> <span class="text-text-muted">unchanged</span></span>
        </div>
        <div class="ml-auto">
          <button
            onClick={copyDiff}
            class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {copied ? 'Copied!' : 'Copy Diff Summary'}
          </button>
        </div>
      </div>

      {/* Diff View */}
      <div class="bg-bg-card rounded-xl border border-border overflow-hidden">
        <div class="grid grid-cols-2 border-b border-border">
          <div class="px-4 py-2 text-xs font-medium text-text-muted border-r border-border">Original</div>
          <div class="px-4 py-2 text-xs font-medium text-text-muted">Modified</div>
        </div>

        {diffLines.length === 0 ? (
          <div class="p-8 text-center text-text-muted text-sm">Enter text in both boxes to see the diff.</div>
        ) : (
          <div class="overflow-x-auto">
            <table class="w-full text-xs font-mono border-collapse">
              <tbody>
                {diffLines.map((line, idx) => {
                  if (line.type === 'unchanged') {
                    return (
                      <tr key={idx} class="border-b border-border/30 hover:bg-white/5">
                        {/* Left */}
                        <td class="py-0.5 pl-2 pr-0 text-text-muted border-r border-border/20 w-10 text-right align-top select-none">{line.leftLineNo}</td>
                        <td class="py-0.5 px-3 text-text-muted border-r border-border align-top whitespace-pre">{line.text || '\u00A0'}</td>
                        {/* Right */}
                        <td class="py-0.5 pl-2 pr-0 text-text-muted border-r border-border/20 w-10 text-right align-top select-none">{line.rightLineNo}</td>
                        <td class="py-0.5 px-3 text-text-muted align-top whitespace-pre">{line.text || '\u00A0'}</td>
                      </tr>
                    );
                  }
                  if (line.type === 'removed') {
                    return (
                      <tr key={idx} class="border-b border-border/30 bg-red-900/20">
                        <td class="py-0.5 pl-2 pr-0 text-red-400 border-r border-red-900/40 w-10 text-right align-top select-none">{line.leftLineNo}</td>
                        <td class="py-0.5 px-3 text-red-300 border-r border-border align-top whitespace-pre"><span class="text-red-500 mr-1">-</span>{line.text || '\u00A0'}</td>
                        <td class="py-0.5 pl-2 pr-0 border-r border-border/20 w-10 align-top select-none"></td>
                        <td class="py-0.5 px-3 bg-red-900/10 align-top whitespace-pre"></td>
                      </tr>
                    );
                  }
                  // added
                  return (
                    <tr key={idx} class="border-b border-border/30 bg-green-900/20">
                      <td class="py-0.5 pl-2 pr-0 border-r border-border/20 w-10 align-top select-none"></td>
                      <td class="py-0.5 px-3 bg-green-900/10 border-r border-border align-top whitespace-pre"></td>
                      <td class="py-0.5 pl-2 pr-0 text-green-400 border-r border-green-900/40 w-10 text-right align-top select-none">{line.rightLineNo}</td>
                      <td class="py-0.5 px-3 text-green-300 align-top whitespace-pre"><span class="text-green-500 mr-1">+</span>{line.text || '\u00A0'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
