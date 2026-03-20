import { useState, useMemo } from 'preact/hooks';

type DiffLine = { type: 'added' | 'removed' | 'unchanged'; text: string; lineNo?: number };

function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');

  // Simple LCS-based diff
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

  // Backtrack
  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && leftLines[i - 1] === rightLines[j - 1]) {
      result.unshift({ type: 'unchanged', text: leftLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: rightLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'removed', text: leftLines[i - 1] });
      i--;
    }
  }
  return result;
}

function formatJson(raw: string): { formatted: string; error: string | null } {
  try {
    return { formatted: JSON.stringify(JSON.parse(raw), null, 2), error: null };
  } catch (e: any) {
    return { formatted: raw, error: e.message };
  }
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : 'https://devplaybook.cc/tools/json-diff-viewer';

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Free JSON Diff Viewer — compare two JSON objects instantly, no signup needed 🔍')}&url=${encodeURIComponent(url)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Free JSON Diff Viewer tool — highlight differences between two JSON objects')}`;

  return (
    <div class="flex gap-2 flex-wrap">
      <span class="text-sm text-gray-400 self-center">Share:</span>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
        class="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        𝕏 Twitter
      </a>
      <a href={redditUrl} target="_blank" rel="noopener noreferrer"
        class="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        Reddit
      </a>
      <button onClick={copyLink}
        class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
    </div>
  );
}

const EXAMPLES = [
  {
    name: 'User object',
    left: `{\n  "name": "Alice",\n  "age": 30,\n  "role": "admin"\n}`,
    right: `{\n  "name": "Alice",\n  "age": 31,\n  "role": "user",\n  "email": "alice@example.com"\n}`,
  },
  {
    name: 'Config diff',
    left: `{\n  "debug": true,\n  "port": 3000,\n  "db": "postgres"\n}`,
    right: `{\n  "debug": false,\n  "port": 8080,\n  "db": "postgres",\n  "cache": true\n}`,
  },
];

export default function JsonDiffViewer() {
  const [left, setLeft] = useState(EXAMPLES[0].left);
  const [right, setRight] = useState(EXAMPLES[0].right);
  const [autoFormat, setAutoFormat] = useState(true);

  const leftResult = useMemo(() => autoFormat ? formatJson(left) : { formatted: left, error: null }, [left, autoFormat]);
  const rightResult = useMemo(() => autoFormat ? formatJson(right) : { formatted: right, error: null }, [right, autoFormat]);

  const diff = useMemo(() => computeDiff(leftResult.formatted, rightResult.formatted), [leftResult.formatted, rightResult.formatted]);

  const stats = useMemo(() => ({
    added: diff.filter(l => l.type === 'added').length,
    removed: diff.filter(l => l.type === 'removed').length,
    unchanged: diff.filter(l => l.type === 'unchanged').length,
  }), [diff]);

  const loadExample = (ex: typeof EXAMPLES[0]) => {
    setLeft(ex.left);
    setRight(ex.right);
  };

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          <span class="text-sm text-gray-400 self-center">Examples:</span>
          {EXAMPLES.map(ex => (
            <button key={ex.name} onClick={() => loadExample(ex)}
              class="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-md transition-colors border border-gray-700">
              {ex.name}
            </button>
          ))}
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input type="checkbox" checked={autoFormat} onChange={e => setAutoFormat((e.target as HTMLInputElement).checked)}
            class="accent-indigo-500" />
          Auto-format JSON
        </label>
      </div>

      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Original JSON</label>
          {leftResult.error && <p class="text-xs text-red-400 mb-1">⚠ {leftResult.error}</p>}
          <textarea
            value={left}
            onInput={e => setLeft((e.target as HTMLTextAreaElement).value)}
            class="w-full h-48 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg p-3 font-mono text-sm resize-y focus:outline-none focus:border-indigo-500"
            placeholder='{"key": "value"}'
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1">Modified JSON</label>
          {rightResult.error && <p class="text-xs text-red-400 mb-1">⚠ {rightResult.error}</p>}
          <textarea
            value={right}
            onInput={e => setRight((e.target as HTMLTextAreaElement).value)}
            class="w-full h-48 bg-gray-900 text-gray-100 border border-gray-700 rounded-lg p-3 font-mono text-sm resize-y focus:outline-none focus:border-indigo-500"
            placeholder='{"key": "new value"}'
          />
        </div>
      </div>

      {/* Stats */}
      <div class="flex gap-4 text-sm flex-wrap">
        <span class="bg-green-900/40 text-green-400 px-3 py-1 rounded-full border border-green-800">+{stats.added} added</span>
        <span class="bg-red-900/40 text-red-400 px-3 py-1 rounded-full border border-red-800">−{stats.removed} removed</span>
        <span class="bg-gray-800 text-gray-400 px-3 py-1 rounded-full border border-gray-700">{stats.unchanged} unchanged</span>
      </div>

      {/* Diff output */}
      <div class="bg-gray-900 rounded-lg border border-gray-700 overflow-auto max-h-96">
        <div class="p-2 font-mono text-sm">
          {diff.length === 0 ? (
            <p class="text-gray-500 p-4 text-center">No differences — both JSONs are identical.</p>
          ) : (
            diff.map((line, idx) => (
              <div key={idx}
                class={`px-3 py-0.5 flex gap-3 ${
                  line.type === 'added' ? 'bg-green-900/30 text-green-300' :
                  line.type === 'removed' ? 'bg-red-900/30 text-red-300' :
                  'text-gray-400'
                }`}>
                <span class="select-none w-4 text-center opacity-60">
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}
                </span>
                <span class="whitespace-pre">{line.text}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Share */}
      <div class="border-t border-gray-800 pt-4">
        <ShareButton />
      </div>
    </div>
  );
}
