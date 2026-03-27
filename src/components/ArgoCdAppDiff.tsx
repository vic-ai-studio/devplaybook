import { useState } from 'preact/hooks';

const SAMPLE_DESIRED = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/my-app
    targetRevision: v1.2.0
    path: helm/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
`;

const SAMPLE_LIVE = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/example/my-app
    targetRevision: v1.1.5
    path: helm/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
`;

type DiffLine = {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNum?: number;
};

function parseLines(yaml: string): string[] {
  return yaml.split('\n');
}

function computeDiff(desiredLines: string[], liveLines: string[]): DiffLine[] {
  // Simple line-by-line LCS diff
  const m = desiredLines.length;
  const n = liveLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (desiredLines[i - 1] === liveLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && desiredLines[i - 1] === liveLines[j - 1]) {
      result.unshift({ type: 'unchanged', content: desiredLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'removed', content: liveLines[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'added', content: desiredLines[i - 1] });
      i--;
    }
  }
  return result;
}

function extractField(yaml: string, field: string): string | null {
  const lines = yaml.split('\n');
  for (const line of lines) {
    const m = line.match(new RegExp(`^\\s*${field}\\s*:\\s*(.+)$`));
    if (m) return m[1].trim();
  }
  return null;
}

type FieldDiff = { field: string; desired: string | null; live: string | null; changed: boolean };

function computeFieldDiffs(desired: string, live: string): FieldDiff[] {
  const fields = [
    'targetRevision',
    'repoURL',
    'path',
    'server',
    'namespace',
    'project',
    'prune',
    'selfHeal',
  ];
  return fields.map(f => {
    const d = extractField(desired, f);
    const l = extractField(live, f);
    return { field: f, desired: d, live: l, changed: d !== l };
  }).filter(fd => fd.desired !== null || fd.live !== null);
}

export default function ArgoCdAppDiff() {
  const [desiredInput, setDesiredInput] = useState(SAMPLE_DESIRED);
  const [liveInput, setLiveInput] = useState(SAMPLE_LIVE);
  const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);
  const [fieldDiffs, setFieldDiffs] = useState<FieldDiff[] | null>(null);
  const [view, setView] = useState<'field' | 'raw'>('field');

  const handleDiff = () => {
    const desired = parseLines(desiredInput);
    const live = parseLines(liveInput);
    setDiffLines(computeDiff(desired, live));
    setFieldDiffs(computeFieldDiffs(desiredInput, liveInput));
  };

  const handleReset = () => {
    setDesiredInput(SAMPLE_DESIRED);
    setLiveInput(SAMPLE_LIVE);
    setDiffLines(null);
    setFieldDiffs(null);
  };

  const changedFields = fieldDiffs?.filter(f => f.changed) ?? [];
  const addedLines = diffLines?.filter(l => l.type === 'added').length ?? 0;
  const removedLines = diffLines?.filter(l => l.type === 'removed').length ?? 0;

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-green-400">Desired State (Git)</label>
            <button onClick={() => setDesiredInput(SAMPLE_DESIRED)} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
          </div>
          <textarea
            value={desiredInput}
            onInput={e => { setDesiredInput((e.target as HTMLTextAreaElement).value); setDiffLines(null); setFieldDiffs(null); }}
            rows={16}
            class="w-full font-mono text-sm bg-background border border-green-500/30 rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-green-500 transition-colors"
            placeholder="Paste desired ArgoCD Application YAML (from Git)..."
            spellcheck={false}
          />
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-yellow-400">Live State (Cluster)</label>
            <button onClick={() => setLiveInput(SAMPLE_LIVE)} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
          </div>
          <textarea
            value={liveInput}
            onInput={e => { setLiveInput((e.target as HTMLTextAreaElement).value); setDiffLines(null); setFieldDiffs(null); }}
            rows={16}
            class="w-full font-mono text-sm bg-background border border-yellow-500/30 rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-yellow-500 transition-colors"
            placeholder="Paste live ArgoCD Application YAML (from cluster)..."
            spellcheck={false}
          />
        </div>
      </div>

      <div class="flex gap-3">
        <button onClick={handleDiff} class="flex-1 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
          Compute Diff
        </button>
        <button onClick={handleReset} class="px-4 py-2.5 bg-surface border border-border rounded-lg text-sm hover:border-accent transition-colors">
          Reset
        </button>
      </div>

      {diffLines && fieldDiffs && (
        <div class="space-y-4">
          {/* Summary */}
          <div class="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg text-sm">
            <span class="font-medium text-text">Diff Summary:</span>
            {changedFields.length === 0 ? (
              <span class="text-green-400 font-medium">✓ No differences — states are in sync</span>
            ) : (
              <>
                <span class="text-yellow-400">{changedFields.length} field{changedFields.length > 1 ? 's' : ''} changed</span>
                <span class="text-green-400">+{addedLines} lines</span>
                <span class="text-red-400">-{removedLines} lines</span>
              </>
            )}
          </div>

          {/* View toggle */}
          <div class="flex border-b border-border">
            {(['field', 'raw'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                class={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${view === v ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {v === 'field' ? 'Field Diff' : 'Raw Diff'}
              </button>
            ))}
          </div>

          {view === 'field' && (
            <div class="space-y-2">
              {fieldDiffs.map(fd => (
                <div key={fd.field} class={`p-3 rounded-lg border ${fd.changed ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-surface border-border'}`}>
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-mono text-xs font-medium text-accent">{fd.field}</span>
                    {fd.changed && <span class="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">CHANGED</span>}
                    {!fd.changed && <span class="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">SAME</span>}
                  </div>
                  {fd.changed ? (
                    <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div class="p-2 rounded bg-green-500/10 border border-green-500/20">
                        <span class="text-green-400 font-medium block mb-1">Desired (Git):</span>
                        <span class="text-text">{fd.desired ?? '—'}</span>
                      </div>
                      <div class="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <span class="text-yellow-400 font-medium block mb-1">Live (Cluster):</span>
                        <span class="text-text">{fd.live ?? '—'}</span>
                      </div>
                    </div>
                  ) : (
                    <span class="font-mono text-xs text-text-muted">{fd.desired ?? '—'}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {view === 'raw' && (
            <div class="font-mono text-xs bg-background border border-border rounded-lg overflow-auto max-h-96">
              {diffLines.map((line, i) => (
                <div
                  key={i}
                  class={`px-3 py-0.5 ${
                    line.type === 'added' ? 'bg-green-500/10 text-green-400' :
                    line.type === 'removed' ? 'bg-red-500/10 text-red-400' :
                    'text-text-muted'
                  }`}
                >
                  <span class="mr-2 select-none opacity-50">
                    {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                  </span>
                  {line.content || '\u00a0'}
                </div>
              ))}
            </div>
          )}

          {changedFields.length > 0 && (
            <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
              <p class="font-medium text-text mb-2">What these changes mean</p>
              <ul class="space-y-1 list-disc list-inside">
                {fieldDiffs.filter(f => f.changed).map(fd => {
                  let hint = '';
                  if (fd.field === 'targetRevision') hint = `Image/chart version drift: Git wants ${fd.desired}, cluster has ${fd.live}. ArgoCD will update on next sync.`;
                  if (fd.field === 'prune') hint = `Prune policy differs: desired=${fd.desired}, live=${fd.live}. "prune: false" means orphaned resources won't be deleted.`;
                  if (fd.field === 'selfHeal') hint = `selfHeal differs: desired=${fd.desired}, live=${fd.live}. Without selfHeal, manual cluster changes won't be reverted.`;
                  if (fd.field === 'namespace') hint = `Destination namespace differs: ${fd.desired} vs ${fd.live}. Verify the correct deployment target.`;
                  return hint ? <li key={fd.field}>{hint}</li> : null;
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">How to use</p>
        <ol class="space-y-1 list-decimal list-inside">
          <li>Paste the Application YAML from your Git repo (desired state) on the left</li>
          <li>Paste the live Application YAML from <code class="font-mono">kubectl get application -n argocd -o yaml</code> on the right</li>
          <li>Click "Compute Diff" to see field-level and raw line differences</li>
          <li>Use Field Diff view for quick summary, Raw Diff for full comparison</li>
        </ol>
      </div>
    </div>
  );
}
