import { useState, useMemo, useCallback } from 'preact/hooks';

type DiffType = 'removed' | 'added' | 'unchanged';

interface DiffLine {
  type: DiffType;
  text: string;
  leftLineNo: number | null;
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
  const left = original.split('\n');
  const right = modified.split('\n');
  const dp = computeLCS(left, right);
  const result: DiffLine[] = [];
  let i = left.length, j = right.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      result.unshift({ type: 'unchanged', text: left[i - 1], leftLineNo: i, rightLineNo: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: right[j - 1], leftLineNo: null, rightLineNo: j });
      j--;
    } else {
      result.unshift({ type: 'removed', text: left[i - 1], leftLineNo: i, rightLineNo: null });
      i--;
    }
  }
  return result;
}

const SAMPLE_BEFORE = `function fetchUser(id) {
  return fetch('/api/users/' + id)
    .then(res => res.json())
    .then(data => {
      console.log(data);
      return data;
    });
}

const cache = {};

function getUser(id) {
  if (cache[id]) return Promise.resolve(cache[id]);
  return fetchUser(id).then(user => {
    cache[id] = user;
    return user;
  });
}`;

const SAMPLE_AFTER = `async function fetchUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

const cache = new Map<string, User>();

async function getUser(id: string): Promise<User> {
  if (cache.has(id)) return cache.get(id)!;
  const user = await fetchUser(id);
  cache.set(id, user);
  return user;
}`;

type ViewMode = 'unified' | 'split';

export default function CodeDiff() {
  const [before, setBefore] = useState(SAMPLE_BEFORE);
  const [after, setAfter] = useState(SAMPLE_AFTER);
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [showUnchanged, setShowUnchanged] = useState(true);
  const [copied, setCopied] = useState(false);

  const diff = useMemo(() => computeDiff(before, after), [before, after]);

  const stats = useMemo(() => ({
    added: diff.filter(l => l.type === 'added').length,
    removed: diff.filter(l => l.type === 'removed').length,
    unchanged: diff.filter(l => l.type === 'unchanged').length,
  }), [diff]);

  const visibleDiff = useMemo(() => {
    if (showUnchanged) return diff;
    // Show changed lines + 2 context lines around them
    const changed = new Set<number>();
    diff.forEach((l, i) => { if (l.type !== 'unchanged') { for (let c = Math.max(0, i-2); c <= Math.min(diff.length-1, i+2); c++) changed.add(c); } });
    const result: (DiffLine | null)[] = [];
    let prevIncluded = true;
    diff.forEach((l, i) => {
      if (changed.has(i)) { result.push(l); prevIncluded = true; }
      else if (prevIncluded && i < diff.length - 1 && changed.has(i + 1)) { result.push(l); }
      else { if (prevIncluded) result.push(null); prevIncluded = false; }
    });
    return result;
  }, [diff, showUnchanged]);

  const copyDiff = useCallback(async () => {
    const text = diff.map(l => {
      const prefix = l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  ';
      return prefix + l.text;
    }).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diff]);

  const bgColor: Record<DiffType, string> = {
    added: 'bg-green-950/60 border-l-2 border-green-600',
    removed: 'bg-red-950/60 border-l-2 border-red-600',
    unchanged: '',
  };
  const textColor: Record<DiffType, string> = {
    added: 'text-green-300',
    removed: 'text-red-300',
    unchanged: 'text-text-muted',
  };
  const prefix: Record<DiffType, string> = { added: '+', removed: '-', unchanged: ' ' };

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['unified', 'split'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              class={`px-3 py-1 text-sm rounded capitalize transition-colors ${viewMode === m ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
            >
              {m}
            </button>
          ))}
        </div>
        <label class="flex items-center gap-1.5 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={showUnchanged} onChange={e => setShowUnchanged((e.target as HTMLInputElement).checked)} class="accent-accent" />
          Show unchanged
        </label>
        {(stats.added > 0 || stats.removed > 0) && (
          <div class="flex gap-3 text-sm ml-auto">
            <span class="text-green-400 font-mono">+{stats.added}</span>
            <span class="text-red-400 font-mono">-{stats.removed}</span>
            <span class="text-text-muted font-mono">{stats.unchanged} unchanged</span>
          </div>
        )}
        <button
          onClick={copyDiff}
          class="text-sm bg-surface border border-border rounded px-3 py-1 hover:border-accent transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy diff'}
        </button>
      </div>

      {/* Input panels */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-red-400">Before</label>
            <span class="text-xs text-text-muted">{before.split('\n').length} lines</span>
          </div>
          <textarea
            value={before}
            onInput={(e) => setBefore((e.target as HTMLTextAreaElement).value)}
            class="w-full h-52 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-red-600"
            spellcheck={false}
          />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-green-400">After</label>
            <span class="text-xs text-text-muted">{after.split('\n').length} lines</span>
          </div>
          <textarea
            value={after}
            onInput={(e) => setAfter((e.target as HTMLTextAreaElement).value)}
            class="w-full h-52 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-green-600"
            spellcheck={false}
          />
        </div>
      </div>

      {/* Diff output */}
      {(stats.added > 0 || stats.removed > 0) && (
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="bg-surface/80 px-3 py-2 text-xs text-text-muted border-b border-border flex items-center gap-2">
            <span>Diff output</span>
            {!showUnchanged && <span class="text-accent">· showing changed lines only</span>}
          </div>

          {viewMode === 'unified' ? (
            <div class="overflow-auto max-h-96 font-mono text-xs">
              {visibleDiff.map((line, i) => {
                if (line === null) {
                  return <div key={i} class="px-3 py-0.5 text-text-muted/50 select-none">···</div>;
                }
                return (
                  <div key={i} class={`flex items-baseline px-0 py-0 ${bgColor[line.type]}`}>
                    <span class="select-none w-10 text-right pr-2 text-text-muted/50 shrink-0 py-0.5 px-1">
                      {line.type !== 'added' ? (line.leftLineNo ?? '') : ''}
                    </span>
                    <span class="select-none w-10 text-right pr-2 text-text-muted/50 shrink-0 py-0.5">
                      {line.type !== 'removed' ? (line.rightLineNo ?? '') : ''}
                    </span>
                    <span class={`select-none pr-2 py-0.5 ${line.type === 'added' ? 'text-green-500' : line.type === 'removed' ? 'text-red-500' : 'text-text-muted/30'}`}>
                      {prefix[line.type]}
                    </span>
                    <span class={`py-0.5 pr-3 whitespace-pre ${textColor[line.type]}`}>{line.text || ' '}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Split view */
            <div class="overflow-auto max-h-96 font-mono text-xs">
              <div class="grid grid-cols-2 divide-x divide-border min-w-0">
                {/* Left (removed) */}
                <div>
                  {visibleDiff.map((line, i) => {
                    if (line === null) return <div key={i} class="px-2 py-0.5 text-text-muted/50 select-none">···</div>;
                    if (line.type === 'added') return <div key={i} class="px-2 py-0.5 opacity-0 select-none">&nbsp;</div>;
                    return (
                      <div key={i} class={`flex items-baseline ${bgColor[line.type]}`}>
                        <span class="select-none w-8 text-right pr-2 text-text-muted/50 shrink-0 py-0.5">{line.leftLineNo ?? ''}</span>
                        <span class={`py-0.5 pr-2 whitespace-pre ${textColor[line.type]}`}>{line.text || ' '}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Right (added) */}
                <div>
                  {visibleDiff.map((line, i) => {
                    if (line === null) return <div key={i} class="px-2 py-0.5 text-text-muted/50 select-none">···</div>;
                    if (line.type === 'removed') return <div key={i} class="px-2 py-0.5 opacity-0 select-none">&nbsp;</div>;
                    return (
                      <div key={i} class={`flex items-baseline ${bgColor[line.type]}`}>
                        <span class="select-none w-8 text-right pr-2 text-text-muted/50 shrink-0 py-0.5">{line.rightLineNo ?? ''}</span>
                        <span class={`py-0.5 pr-2 whitespace-pre ${textColor[line.type]}`}>{line.text || ' '}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stats.added === 0 && stats.removed === 0 && before && after && (
        <div class="text-center text-text-muted text-sm py-6 border border-dashed border-border rounded-lg">
          ✓ No differences found — the two versions are identical.
        </div>
      )}
    </div>
  );
}
