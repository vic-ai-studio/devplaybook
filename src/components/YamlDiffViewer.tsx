import { useState, useMemo } from 'preact/hooks';

const SAMPLE_A = `server:
  host: localhost
  port: 8080
  debug: true

database:
  host: db.local
  port: 5432
  name: myapp
  pool_size: 5

features:
  auth: true
  cache: false
  rate_limit: 100`;

const SAMPLE_B = `server:
  host: 0.0.0.0
  port: 8080
  debug: false
  timeout: 30

database:
  host: db.prod
  port: 5432
  name: myapp_prod
  pool_size: 20

features:
  auth: true
  cache: true
  rate_limit: 500
  new_ui: true`;

type LineType = 'added' | 'removed' | 'changed' | 'same' | 'empty';

type DiffLine = {
  type: LineType;
  left: string;
  right: string;
  lineNumLeft: number | null;
  lineNumRight: number | null;
};

function simpleYamlParse(text: string): Record<string, string> {
  // Simple flat + nested key→value map for comparison
  const result: Record<string, string> = {};
  const stack: { prefix: string; indent: number }[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;

    // Pop stack entries deeper than current
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;

    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    const prefix = stack.length > 0 ? stack[stack.length - 1].prefix + '.' : '';
    const fullKey = prefix + key;

    if (val) {
      result[fullKey] = val;
    } else {
      stack.push({ prefix: fullKey, indent });
    }
  }

  return result;
}

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const result: DiffLine[] = [];

  // Simple line-by-line diff using LCS
  const m = leftLines.length;
  const n = rightLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (leftLines[i - 1] === rightLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback
  type Op = { type: 'same' | 'add' | 'del'; left: string; right: string };
  const ops: Op[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      ops.unshift({ type: 'same', left: leftLines[i - 1], right: rightLines[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.unshift({ type: 'add', left: '', right: rightLines[j - 1] });
      j--;
    } else {
      ops.unshift({ type: 'del', left: leftLines[i - 1], right: '' });
      i--;
    }
  }

  // Pair up consecutive del+add as 'changed'
  const paired: DiffLine[] = [];
  let li = 1, ri = 1;
  let k = 0;
  while (k < ops.length) {
    const op = ops[k];
    if (op.type === 'del' && k + 1 < ops.length && ops[k + 1].type === 'add') {
      paired.push({ type: 'changed', left: op.left, right: ops[k + 1].right, lineNumLeft: li++, lineNumRight: ri++ });
      k += 2;
    } else if (op.type === 'del') {
      paired.push({ type: 'removed', left: op.left, right: '', lineNumLeft: li++, lineNumRight: null });
      k++;
    } else if (op.type === 'add') {
      paired.push({ type: 'added', left: '', right: op.right, lineNumLeft: null, lineNumRight: ri++ });
      k++;
    } else {
      paired.push({ type: 'same', left: op.left, right: op.right, lineNumLeft: li++, lineNumRight: ri++ });
      k++;
    }
  }

  return paired;
}

function highlightDiff(a: string, b: string): { left: string; right: string } {
  if (a === b) return { left: a, right: b };
  // Character-level diff highlighting
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffixA = a.length, suffixB = b.length;
  while (suffixA > prefix && suffixB > prefix && a[suffixA - 1] === b[suffixB - 1]) {
    suffixA--; suffixB--;
  }
  const markLeft = `${a.slice(0, prefix)}<mark class="bg-red-200 dark:bg-red-900/60">${a.slice(prefix, suffixA)}</mark>${a.slice(suffixA)}`;
  const markRight = `${b.slice(0, prefix)}<mark class="bg-green-200 dark:bg-green-900/60">${b.slice(prefix, suffixB)}</mark>${b.slice(suffixB)}`;
  return { left: markLeft, right: markRight };
}

type SummaryStats = { added: number; removed: number; changed: number; same: number };

function computeStats(diff: DiffLine[]): SummaryStats {
  return diff.reduce<SummaryStats>((acc, l) => {
    acc[l.type === 'same' ? 'same' : l.type === 'added' ? 'added' : l.type === 'removed' ? 'removed' : 'changed']++;
    return acc;
  }, { added: 0, removed: 0, changed: 0, same: 0 });
}

type SemanticDiff = { key: string; type: 'added' | 'removed' | 'changed'; leftVal?: string; rightVal?: string };

function computeSemanticDiff(left: string, right: string): SemanticDiff[] {
  const lMap = simpleYamlParse(left);
  const rMap = simpleYamlParse(right);
  const keys = new Set([...Object.keys(lMap), ...Object.keys(rMap)]);
  const result: SemanticDiff[] = [];
  for (const key of [...keys].sort()) {
    const lv = lMap[key];
    const rv = rMap[key];
    if (lv === undefined) result.push({ key, type: 'added', rightVal: rv });
    else if (rv === undefined) result.push({ key, type: 'removed', leftVal: lv });
    else if (lv !== rv) result.push({ key, type: 'changed', leftVal: lv, rightVal: rv });
  }
  return result;
}

export default function YamlDiffViewer() {
  const [left, setLeft] = useState(SAMPLE_A);
  const [right, setRight] = useState(SAMPLE_B);
  const [view, setView] = useState<'side-by-side' | 'unified' | 'semantic'>('side-by-side');
  const [copied, setCopied] = useState(false);

  const diff = useMemo(() => computeDiff(left, right), [left, right]);
  const stats = useMemo(() => computeStats(diff), [diff]);
  const semantic = useMemo(() => computeSemanticDiff(left, right), [left, right]);

  function copyReport() {
    const lines: string[] = ['YAML Diff Report', '================'];
    for (const d of diff) {
      if (d.type === 'same') continue;
      const prefix = d.type === 'added' ? '+' : d.type === 'removed' ? '-' : '~';
      if (d.type === 'changed') {
        lines.push(`- ${d.left}`);
        lines.push(`+ ${d.right}`);
      } else {
        lines.push(`${prefix} ${d.type === 'added' ? d.right : d.left}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const totalChanges = stats.added + stats.removed + stats.changed;

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          {(['side-by-side', 'unified', 'semantic'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${view === v ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent text-text-muted hover:text-accent'}`}
            >
              {v === 'side-by-side' ? 'Side by Side' : v === 'unified' ? 'Unified' : 'Semantic'}
            </button>
          ))}
        </div>
        <div class="flex gap-2 items-center">
          {totalChanges > 0 && (
            <span class="text-sm text-text-muted">
              <span class="text-green-500 font-medium">+{stats.added + stats.changed}</span>
              {' / '}
              <span class="text-red-500 font-medium">-{stats.removed + stats.changed}</span>
              {' · '}{stats.same} unchanged
            </span>
          )}
          {totalChanges === 0 && (
            <span class="text-sm text-green-500 font-medium">Files are identical</span>
          )}
          <button
            onClick={copyReport}
            class="px-3 py-1.5 rounded-lg text-sm border border-border hover:border-accent text-text-muted hover:text-accent transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy Report'}
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium mb-1 text-text-muted">YAML A (original)</label>
          <textarea
            value={left}
            onInput={(e) => setLeft((e.target as HTMLTextAreaElement).value)}
            class="w-full h-48 font-mono text-sm p-3 bg-bg-secondary border border-border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-accent"
            spellcheck={false}
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-text-muted">YAML B (modified)</label>
          <textarea
            value={right}
            onInput={(e) => setRight((e.target as HTMLTextAreaElement).value)}
            class="w-full h-48 font-mono text-sm p-3 bg-bg-secondary border border-border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-accent"
            spellcheck={false}
          />
        </div>
      </div>

      {/* Diff output */}
      {view === 'side-by-side' && (
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="grid grid-cols-2 bg-bg-secondary text-xs font-medium text-text-muted border-b border-border">
            <div class="px-3 py-2 border-r border-border">A (original)</div>
            <div class="px-3 py-2">B (modified)</div>
          </div>
          <div class="font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
            {diff.map((line, idx) => {
              const { left: lh, right: rh } = line.type === 'changed' ? highlightDiff(line.left, line.right) : { left: line.left, right: line.right };
              const bgLeft = line.type === 'removed' || line.type === 'changed' ? 'bg-red-50 dark:bg-red-950/30' : '';
              const bgRight = line.type === 'added' || line.type === 'changed' ? 'bg-green-50 dark:bg-green-950/30' : '';
              return (
                <div key={idx} class="grid grid-cols-2 border-b border-border/40 last:border-0 hover:bg-bg-secondary/50">
                  <div class={`flex ${bgLeft} border-r border-border/40`}>
                    <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumLeft ?? ''}</span>
                    <span class={`px-2 py-0.5 whitespace-pre-wrap break-all flex-1 ${line.type === 'removed' ? 'text-red-700 dark:text-red-400' : line.type === 'changed' ? 'text-orange-700 dark:text-orange-400' : ''}`}>
                      {line.type === 'removed' ? '− ' : line.type === 'changed' ? '~ ' : '  '}
                      {line.type === 'changed' ? <span dangerouslySetInnerHTML={{ __html: lh }} /> : line.left}
                    </span>
                  </div>
                  <div class={`flex ${bgRight}`}>
                    <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumRight ?? ''}</span>
                    <span class={`px-2 py-0.5 whitespace-pre-wrap break-all flex-1 ${line.type === 'added' ? 'text-green-700 dark:text-green-400' : line.type === 'changed' ? 'text-green-700 dark:text-green-400' : ''}`}>
                      {line.type === 'added' ? '+ ' : line.type === 'changed' ? '~ ' : '  '}
                      {line.type === 'changed' ? <span dangerouslySetInnerHTML={{ __html: rh }} /> : line.right}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'unified' && (
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="bg-bg-secondary text-xs font-medium text-text-muted border-b border-border px-3 py-2">Unified diff</div>
          <div class="font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
            {diff.flatMap((line, idx) => {
              if (line.type === 'same') {
                return [
                  <div key={idx} class="flex border-b border-border/40 last:border-0 hover:bg-bg-secondary/50">
                    <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumLeft}</span>
                    <span class="px-2 py-0.5 whitespace-pre-wrap break-all flex-1">  {line.left}</span>
                  </div>
                ];
              }
              if (line.type === 'removed') {
                return [
                  <div key={`${idx}-r`} class="flex bg-red-50 dark:bg-red-950/30 border-b border-border/40">
                    <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumLeft}</span>
                    <span class="px-2 py-0.5 whitespace-pre-wrap break-all flex-1 text-red-700 dark:text-red-400">− {line.left}</span>
                  </div>
                ];
              }
              if (line.type === 'added') {
                return [
                  <div key={`${idx}-a`} class="flex bg-green-50 dark:bg-green-950/30 border-b border-border/40">
                    <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumRight}</span>
                    <span class="px-2 py-0.5 whitespace-pre-wrap break-all flex-1 text-green-700 dark:text-green-400">+ {line.right}</span>
                  </div>
                ];
              }
              // changed
              const { left: lh, right: rh } = highlightDiff(line.left, line.right);
              return [
                <div key={`${idx}-cl`} class="flex bg-red-50 dark:bg-red-950/30 border-b border-border/40">
                  <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumLeft}</span>
                  <span class="px-2 py-0.5 whitespace-pre-wrap break-all flex-1 text-red-700 dark:text-red-400">− <span dangerouslySetInnerHTML={{ __html: lh }} /></span>
                </div>,
                <div key={`${idx}-cr`} class="flex bg-green-50 dark:bg-green-950/30 border-b border-border/40">
                  <span class="text-text-muted/40 select-none px-2 py-0.5 text-right w-8 shrink-0">{line.lineNumRight}</span>
                  <span class="px-2 py-0.5 whitespace-pre-wrap break-all flex-1 text-green-700 dark:text-green-400">+ <span dangerouslySetInnerHTML={{ __html: rh }} /></span>
                </div>
              ];
            })}
          </div>
        </div>
      )}

      {view === 'semantic' && (
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="bg-bg-secondary text-xs font-medium text-text-muted border-b border-border px-3 py-2">
            Semantic diff — key-level changes ({semantic.length} change{semantic.length !== 1 ? 's' : ''})
          </div>
          {semantic.length === 0 ? (
            <div class="p-6 text-center text-text-muted text-sm">No key-level differences found</div>
          ) : (
            <div class="divide-y divide-border/40 max-h-96 overflow-y-auto">
              {semantic.map((s, i) => (
                <div key={i} class={`px-4 py-3 text-sm ${s.type === 'added' ? 'bg-green-50 dark:bg-green-950/20' : s.type === 'removed' ? 'bg-red-50 dark:bg-red-950/20' : 'bg-orange-50 dark:bg-orange-950/20'}`}>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class={`font-mono text-xs px-1.5 py-0.5 rounded ${s.type === 'added' ? 'bg-green-200 dark:bg-green-900 text-green-800 dark:text-green-300' : s.type === 'removed' ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300' : 'bg-orange-200 dark:bg-orange-900 text-orange-800 dark:text-orange-300'}`}>
                      {s.type === 'added' ? 'ADDED' : s.type === 'removed' ? 'REMOVED' : 'CHANGED'}
                    </span>
                    <code class="font-mono text-xs font-medium">{s.key}</code>
                  </div>
                  {s.type === 'changed' && (
                    <div class="mt-1.5 grid grid-cols-2 gap-2 text-xs font-mono">
                      <span class="text-red-600 dark:text-red-400">was: {s.leftVal}</span>
                      <span class="text-green-600 dark:text-green-400">now: {s.rightVal}</span>
                    </div>
                  )}
                  {s.type === 'added' && <div class="mt-1 text-xs font-mono text-green-600 dark:text-green-400">value: {s.rightVal}</div>}
                  {s.type === 'removed' && <div class="mt-1 text-xs font-mono text-red-600 dark:text-red-400">value: {s.leftVal}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
