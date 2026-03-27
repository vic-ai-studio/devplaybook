import { useState } from 'preact/hooks';

type CheckResult = {
  level: 'error' | 'warning' | 'info' | 'pass';
  message: string;
};

const SAMPLE_APP = `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/my-org/my-repo
    targetRevision: HEAD
    path: helm/my-app
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: false
      selfHeal: false
    syncOptions:
      - CreateNamespace=true
`;

function checkArgoCdApp(yaml: string): CheckResult[] {
  const results: CheckResult[] = [];
  const lines = yaml.split('\n');

  if (!yaml.trim()) {
    return [{ level: 'error', message: 'Empty input. Paste an ArgoCD Application YAML to check.' }];
  }

  // Tab check
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      results.push({ level: 'error', message: `Tab character on line ${idx + 1}. YAML requires spaces only.` });
    }
  });

  // apiVersion
  const apiVersionLine = lines.find(l => l.match(/^apiVersion\s*:/));
  const apiVersion = apiVersionLine?.match(/apiVersion\s*:\s*(\S+)/)?.[1];
  if (!apiVersionLine) {
    results.push({ level: 'error', message: 'Missing "apiVersion". ArgoCD Applications require "apiVersion: argoproj.io/v1alpha1".' });
  } else if (apiVersion !== 'argoproj.io/v1alpha1') {
    results.push({ level: 'error', message: `apiVersion "${apiVersion}" is not valid for ArgoCD. Use "argoproj.io/v1alpha1".` });
  } else {
    results.push({ level: 'pass', message: 'apiVersion is correct (argoproj.io/v1alpha1).' });
  }

  // kind
  const kindLine = lines.find(l => l.match(/^kind\s*:/));
  const kind = kindLine?.match(/kind\s*:\s*(\S+)/)?.[1];
  if (!kindLine) {
    results.push({ level: 'error', message: 'Missing "kind". Must be "Application".' });
  } else if (kind !== 'Application' && kind !== 'AppProject') {
    results.push({ level: 'error', message: `kind "${kind}" is not an ArgoCD resource. Expected "Application" or "AppProject".` });
  } else {
    results.push({ level: 'pass', message: `kind: ${kind} — recognized ArgoCD resource.` });
  }

  // namespace should be argocd
  const nsLine = lines.find(l => l.trim().match(/^namespace\s*:/) && !l.includes('destination'));
  const ns = nsLine?.match(/namespace\s*:\s*(\S+)/)?.[1];
  if (!ns) {
    results.push({ level: 'warning', message: 'No namespace in metadata. ArgoCD Applications should be in the "argocd" namespace.' });
  } else if (ns !== 'argocd') {
    results.push({ level: 'warning', message: `metadata.namespace is "${ns}". ArgoCD Applications are typically deployed in the "argocd" namespace.` });
  } else {
    results.push({ level: 'pass', message: 'metadata.namespace: argocd — correct.' });
  }

  // spec.source
  const hasRepoURL = yaml.includes('repoURL:');
  const hasTargetRevision = yaml.includes('targetRevision:');
  const hasPath = yaml.includes('path:') || yaml.includes('chart:');

  if (!hasRepoURL) results.push({ level: 'error', message: 'Missing spec.source.repoURL. Required to specify the Git or Helm repository URL.' });
  else results.push({ level: 'pass', message: 'spec.source.repoURL is set.' });

  if (!hasTargetRevision) {
    results.push({ level: 'warning', message: 'No targetRevision specified. HEAD is used by default but pinning a branch, tag, or commit SHA improves stability.' });
  } else {
    const revLine = lines.find(l => l.trim().match(/^targetRevision\s*:/));
    const rev = revLine?.match(/targetRevision\s*:\s*(\S+)/)?.[1];
    if (rev === 'HEAD') {
      results.push({ level: 'warning', message: 'targetRevision: HEAD tracks the latest commit on the default branch. Pin to a tag or commit SHA for production.' });
    } else {
      results.push({ level: 'pass', message: `targetRevision: ${rev} — pinned revision.` });
    }
  }

  if (!hasPath) results.push({ level: 'warning', message: 'No spec.source.path or chart specified. ArgoCD needs a path (for Git) or chart (for Helm repo) to find the manifests.' });

  // spec.destination
  const hasDestServer = yaml.includes('server:');
  const hasDestNamespace = lines.some(l => l.trim().match(/^namespace\s*:/) && lines.indexOf(l) > lines.findIndex(ll => ll.includes('destination:')));

  if (!hasDestServer) results.push({ level: 'error', message: 'Missing spec.destination.server. Use "https://kubernetes.default.svc" for the local cluster.' });
  else results.push({ level: 'pass', message: 'spec.destination.server is set.' });

  if (!hasDestNamespace) results.push({ level: 'warning', message: 'No spec.destination.namespace. Specify the target namespace for deployed resources.' });

  // project
  const projectLine = lines.find(l => l.trim().match(/^project\s*:/));
  const project = projectLine?.match(/project\s*:\s*(\S+)/)?.[1];
  if (!projectLine) {
    results.push({ level: 'warning', message: 'No spec.project specified. Defaults to "default". Create dedicated projects for multi-team environments.' });
  } else if (project === 'default') {
    results.push({ level: 'info', message: 'spec.project: default — consider creating a dedicated AppProject for better RBAC isolation in production.' });
  }

  // syncPolicy
  const hasSyncPolicy = yaml.includes('syncPolicy:');
  if (!hasSyncPolicy) {
    results.push({ level: 'info', message: 'No syncPolicy defined. ArgoCD will require manual syncs. Add "automated:" for GitOps-style continuous delivery.' });
  } else {
    const hasAutomated = yaml.includes('automated:');
    if (hasAutomated) {
      // prune
      const hasPruneTrue = yaml.includes('prune: true');
      if (!hasPruneTrue) {
        results.push({ level: 'info', message: '"prune: false" or not set — ArgoCD will not delete resources removed from Git. Set "prune: true" to keep cluster in sync with Git.' });
      } else {
        results.push({ level: 'pass', message: 'Automated sync with prune: true — orphaned resources will be cleaned up.' });
      }

      // selfHeal
      const hasSelfHealTrue = yaml.includes('selfHeal: true');
      if (!hasSelfHealTrue) {
        results.push({ level: 'info', message: '"selfHeal: false" or not set — manual changes to the cluster will not be reverted. Enable selfHeal for strict GitOps compliance.' });
      } else {
        results.push({ level: 'pass', message: 'selfHeal: true — cluster drift from Git state will be automatically corrected.' });
      }
    } else {
      results.push({ level: 'info', message: 'syncPolicy defined but no "automated:" section. Syncs will be manual. Add "automated:" to enable auto-sync.' });
    }
  }

  return results;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400', label: 'ERROR' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400', label: 'WARNING' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ', text: 'text-blue-400', label: 'INFO' },
  pass: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400', label: 'PASS' },
};

export default function ArgoCdAppHealthChecker() {
  const [input, setInput] = useState(SAMPLE_APP);
  const [results, setResults] = useState<CheckResult[]>(() => checkArgoCdApp(SAMPLE_APP));
  const [checked, setChecked] = useState(true);

  const handleCheck = () => {
    setResults(checkArgoCdApp(input));
    setChecked(true);
  };

  const errors = results.filter(r => r.level === 'error');
  const warnings = results.filter(r => r.level === 'warning');
  const passes = results.filter(r => r.level === 'pass');

  const score = results.length > 0
    ? Math.round((passes.length / results.length) * 100)
    : 0;

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">ArgoCD Application YAML</label>
          <div class="flex gap-2">
            <button onClick={() => { setInput(SAMPLE_APP); setResults(checkArgoCdApp(SAMPLE_APP)); setChecked(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setResults([]); setChecked(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setChecked(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your ArgoCD Application YAML here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleCheck} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Check Health
      </button>

      {checked && results.length > 0 && (
        <div class="space-y-3">
          {/* Score */}
          <div class="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-text">Health Score</p>
              <p class="text-xs text-text-muted mt-0.5">{passes.length} of {results.length} checks passed</p>
            </div>
            <span class={`text-3xl font-bold ${score >= 80 ? 'text-green-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
              {score}%
            </span>
          </div>

          {/* Summary badges */}
          <div class="flex items-center gap-3 text-sm flex-wrap">
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {passes.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">{passes.length} passed</span>}
          </div>

          <div class="space-y-2">
            {results.map((r, i) => {
              const style = LEVEL_STYLES[r.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{style.label}</span>
                    <p class="text-sm text-text mt-0.5">{r.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>apiVersion: argoproj.io/v1alpha1 validation</li>
          <li>kind: Application/AppProject recognition</li>
          <li>metadata.namespace deployment best practice</li>
          <li>spec.source: repoURL, targetRevision, path/chart</li>
          <li>HEAD tracking vs pinned revision warning</li>
          <li>spec.destination: server and namespace</li>
          <li>syncPolicy: automated, prune, selfHeal</li>
          <li>AppProject isolation recommendation</li>
        </ul>
      </div>
    </div>
  );
}
