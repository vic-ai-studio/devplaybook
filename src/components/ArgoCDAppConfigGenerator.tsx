import { useState } from 'preact/hooks';

interface HelmValue { key: string; value: string; }

interface AppConfig {
  // Metadata
  appName: string;
  namespace: string;
  project: string;
  // Source
  repoURL: string;
  targetRevision: string;
  sourceType: 'git' | 'helm';
  path: string;
  chart: string;
  chartVersion: string;
  helmValues: HelmValue[];
  // Destination
  server: string;
  destNamespace: string;
  // Sync policy
  automated: boolean;
  selfHeal: boolean;
  prune: boolean;
  createNamespace: boolean;
  prunePropagationPolicy: boolean;
  applyOutOfSyncOnly: boolean;
  // Retry
  retryEnabled: boolean;
  retryLimit: string;
  backoffDuration: string;
  backoffFactor: string;
  backoffMaxDuration: string;
}

function generateAppYAML(cfg: AppConfig): string {
  const name = cfg.appName || 'my-app';
  const ns = cfg.namespace || 'argocd';
  const project = cfg.project || 'default';
  const server = cfg.server || 'https://kubernetes.default.svc';
  const destNs = cfg.destNamespace || 'default';
  const revision = cfg.targetRevision || 'HEAD';

  let lines: string[] = [];

  lines.push('apiVersion: argoproj.io/v1alpha1');
  lines.push('kind: Application');
  lines.push('metadata:');
  lines.push(`  name: ${name}`);
  lines.push(`  namespace: ${ns}`);
  lines.push('spec:');
  lines.push(`  project: ${project}`);
  lines.push('');
  lines.push('  source:');
  lines.push(`    repoURL: ${cfg.repoURL || 'https://github.com/your-org/your-repo'}`);
  lines.push(`    targetRevision: ${revision}`);

  if (cfg.sourceType === 'git') {
    lines.push(`    path: ${cfg.path || 'k8s/overlays/production'}`);
  } else {
    lines.push(`    chart: ${cfg.chart || 'my-chart'}`);
    if (cfg.chartVersion) {
      lines.push(`    # targetRevision above acts as chart version: ${cfg.chartVersion}`);
    }
    if (cfg.helmValues.length > 0) {
      lines.push('    helm:');
      lines.push('      values: |');
      cfg.helmValues.forEach(hv => {
        if (hv.key) {
          lines.push(`        ${hv.key}: ${hv.value}`);
        }
      });
    }
  }

  lines.push('');
  lines.push('  destination:');
  lines.push(`    server: ${server}`);
  lines.push(`    namespace: ${destNs}`);

  const hasSyncPolicy = cfg.automated || cfg.createNamespace || cfg.prunePropagationPolicy || cfg.applyOutOfSyncOnly || cfg.retryEnabled;

  if (hasSyncPolicy) {
    lines.push('');
    lines.push('  syncPolicy:');

    if (cfg.automated) {
      lines.push('    automated:');
      lines.push(`      selfHeal: ${cfg.selfHeal}`);
      lines.push(`      prune: ${cfg.prune}`);
    }

    const syncOpts: string[] = [];
    if (cfg.createNamespace) syncOpts.push('CreateNamespace=true');
    if (cfg.prunePropagationPolicy) syncOpts.push('PrunePropagationPolicy=foreground');
    if (cfg.applyOutOfSyncOnly) syncOpts.push('ApplyOutOfSyncOnly=true');

    if (syncOpts.length > 0) {
      lines.push('    syncOptions:');
      syncOpts.forEach(opt => lines.push(`      - ${opt}`));
    }

    if (cfg.retryEnabled) {
      const limit = cfg.retryLimit || '5';
      const duration = cfg.backoffDuration || '5s';
      const factor = cfg.backoffFactor || '2';
      const maxDuration = cfg.backoffMaxDuration || '3m';
      lines.push('    retry:');
      lines.push(`      limit: ${limit}`);
      lines.push('      backoff:');
      lines.push(`        duration: ${duration}`);
      lines.push(`        factor: ${factor}`);
      lines.push(`        maxDuration: ${maxDuration}`);
    }
  }

  return lines.join('\n');
}

function generateCLICommand(cfg: AppConfig): string {
  const name = cfg.appName || 'my-app';
  const project = cfg.project || 'default';
  const ns = cfg.namespace || 'argocd';
  const server = cfg.server || 'https://kubernetes.default.svc';
  const destNs = cfg.destNamespace || 'default';
  const revision = cfg.targetRevision || 'HEAD';
  const repoURL = cfg.repoURL || 'https://github.com/your-org/your-repo';

  let cmd = `argocd app create ${name} \\\n`;
  cmd += `  --project ${project} \\\n`;
  cmd += `  --dest-server ${server} \\\n`;
  cmd += `  --dest-namespace ${destNs} \\\n`;
  cmd += `  --repo ${repoURL} \\\n`;
  cmd += `  --revision ${revision} \\\n`;

  if (cfg.sourceType === 'git') {
    cmd += `  --path ${cfg.path || 'k8s/overlays/production'} \\\n`;
  } else {
    cmd += `  --helm-chart ${cfg.chart || 'my-chart'} \\\n`;
    cfg.helmValues.forEach(hv => {
      if (hv.key) cmd += `  --helm-set ${hv.key}=${hv.value} \\\n`;
    });
  }

  if (cfg.automated) {
    cmd += `  --sync-policy automated \\\n`;
    if (cfg.selfHeal) cmd += `  --self-heal \\\n`;
    if (cfg.prune) cmd += `  --auto-prune \\\n`;
  }

  if (cfg.createNamespace) cmd += `  --sync-option CreateNamespace=true \\\n`;
  if (cfg.prunePropagationPolicy) cmd += `  --sync-option PrunePropagationPolicy=foreground \\\n`;
  if (cfg.applyOutOfSyncOnly) cmd += `  --sync-option ApplyOutOfSyncOnly=true \\\n`;

  if (cfg.retryEnabled) {
    cmd += `  --retry-limit ${cfg.retryLimit || '5'} \\\n`;
    cmd += `  --retry-backoff-duration ${cfg.backoffDuration || '5s'} \\\n`;
    cmd += `  --retry-backoff-factor ${cfg.backoffFactor || '2'} \\\n`;
    cmd += `  --retry-backoff-max-duration ${cfg.backoffMaxDuration || '3m'} \\\n`;
  }

  // Add namespace flag for argocd CLI context
  cmd += `  --upsert`;

  return cmd;
}

export default function ArgoCDAppConfigGenerator() {
  // Metadata
  const [appName, setAppName] = useState('my-app');
  const [namespace, setNamespace] = useState('argocd');
  const [project, setProject] = useState('default');
  // Source
  const [repoURL, setRepoURL] = useState('');
  const [targetRevision, setTargetRevision] = useState('HEAD');
  const [sourceType, setSourceType] = useState<'git' | 'helm'>('git');
  const [path, setPath] = useState('k8s/overlays/production');
  const [chart, setChart] = useState('');
  const [chartVersion, setChartVersion] = useState('');
  const [helmValues, setHelmValues] = useState<HelmValue[]>([{ key: 'replicaCount', value: '2' }]);
  // Destination
  const [server, setServer] = useState('https://kubernetes.default.svc');
  const [destNamespace, setDestNamespace] = useState('production');
  // Sync policy
  const [automated, setAutomated] = useState(true);
  const [selfHeal, setSelfHeal] = useState(true);
  const [prune, setPrune] = useState(false);
  const [createNamespace, setCreateNamespace] = useState(true);
  const [prunePropagationPolicy, setPrunePropagationPolicy] = useState(false);
  const [applyOutOfSyncOnly, setApplyOutOfSyncOnly] = useState(false);
  // Retry
  const [retryEnabled, setRetryEnabled] = useState(true);
  const [retryLimit, setRetryLimit] = useState('5');
  const [backoffDuration, setBackoffDuration] = useState('5s');
  const [backoffFactor, setBackoffFactor] = useState('2');
  const [backoffMaxDuration, setBackoffMaxDuration] = useState('3m');
  // UI
  const [activeTab, setActiveTab] = useState<'yaml' | 'cli'>('yaml');
  const [copied, setCopied] = useState(false);

  const cfg: AppConfig = {
    appName, namespace, project,
    repoURL, targetRevision, sourceType, path, chart, chartVersion, helmValues,
    server, destNamespace,
    automated, selfHeal, prune,
    createNamespace, prunePropagationPolicy, applyOutOfSyncOnly,
    retryEnabled, retryLimit, backoffDuration, backoffFactor, backoffMaxDuration,
  };

  const yamlOutput = generateAppYAML(cfg);
  const cliOutput = generateCLICommand(cfg);
  const currentOutput = activeTab === 'yaml' ? yamlOutput : cliOutput;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addHelmValue = () => setHelmValues(prev => [...prev, { key: '', value: '' }]);
  const removeHelmValue = (i: number) => setHelmValues(prev => prev.filter((_, idx) => idx !== i));
  const updateHelmValue = (i: number, field: 'key' | 'value', val: string) => {
    setHelmValues(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: val };
      return next;
    });
  };

  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Config form */}
      <div class="space-y-4">

        {/* App Metadata */}
        <div>
          <h3 class="text-sm font-semibold text-text mb-2">App Metadata</h3>
          <div class="space-y-2">
            <div>
              <label class={labelCls}>App Name</label>
              <input
                type="text"
                value={appName}
                onInput={(e) => setAppName((e.target as HTMLInputElement).value)}
                class={inputCls}
                placeholder="my-app"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class={labelCls}>Namespace (ArgoCD)</label>
                <input
                  type="text"
                  value={namespace}
                  onInput={(e) => setNamespace((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="argocd"
                />
              </div>
              <div>
                <label class={labelCls}>Project</label>
                <input
                  type="text"
                  value={project}
                  onInput={(e) => setProject((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="default"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Source */}
        <div class="border-t border-border pt-3">
          <h3 class="text-sm font-semibold text-text mb-2">Source</h3>
          <div class="space-y-2">
            <div>
              <label class={labelCls}>Repo URL</label>
              <input
                type="text"
                value={repoURL}
                onInput={(e) => setRepoURL((e.target as HTMLInputElement).value)}
                class={inputCls}
                placeholder="https://github.com/your-org/your-repo"
              />
            </div>
            <div>
              <label class={labelCls}>Target Revision</label>
              <input
                type="text"
                value={targetRevision}
                onInput={(e) => setTargetRevision((e.target as HTMLInputElement).value)}
                class={inputCls}
                placeholder="HEAD"
              />
              <p class="text-xs text-text-muted mt-0.5">HEAD, main, v1.2.3, a1b2c3d, or a branch name</p>
            </div>

            {/* Source type toggle */}
            <div>
              <label class={labelCls}>Source Type</label>
              <div class="flex gap-2 mt-1">
                {(['git', 'helm'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSourceType(t)}
                    class={`px-3 py-1 rounded text-sm border transition-colors ${
                      sourceType === t
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface border-border text-text-muted hover:border-accent'
                    }`}
                  >
                    {t === 'git' ? 'Git (path)' : 'Helm Chart'}
                  </button>
                ))}
              </div>
            </div>

            {sourceType === 'git' ? (
              <div>
                <label class={labelCls}>Path</label>
                <input
                  type="text"
                  value={path}
                  onInput={(e) => setPath((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="k8s/overlays/production"
                />
              </div>
            ) : (
              <div class="space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class={labelCls}>Chart Name</label>
                    <input
                      type="text"
                      value={chart}
                      onInput={(e) => setChart((e.target as HTMLInputElement).value)}
                      class={inputCls}
                      placeholder="my-chart"
                    />
                  </div>
                  <div>
                    <label class={labelCls}>Chart Version</label>
                    <input
                      type="text"
                      value={chartVersion}
                      onInput={(e) => setChartVersion((e.target as HTMLInputElement).value)}
                      class={inputCls}
                      placeholder="1.2.3"
                    />
                  </div>
                </div>
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class={labelCls}>Helm Values</label>
                    <button
                      onClick={addHelmValue}
                      class="text-xs text-accent hover:underline"
                    >
                      + Add
                    </button>
                  </div>
                  {helmValues.map((hv, i) => (
                    <div key={i} class="flex gap-1 mb-1 items-center">
                      <input
                        type="text"
                        value={hv.key}
                        onInput={(e) => updateHelmValue(i, 'key', (e.target as HTMLInputElement).value)}
                        class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="key"
                      />
                      <span class="text-text-muted text-xs">:</span>
                      <input
                        type="text"
                        value={hv.value}
                        onInput={(e) => updateHelmValue(i, 'value', (e.target as HTMLInputElement).value)}
                        class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="value"
                      />
                      <button
                        onClick={() => removeHelmValue(i)}
                        class="text-red-400 hover:text-red-300 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Destination */}
        <div class="border-t border-border pt-3">
          <h3 class="text-sm font-semibold text-text mb-2">Destination</h3>
          <div class="space-y-2">
            <div>
              <label class={labelCls}>Cluster Server</label>
              <input
                type="text"
                value={server}
                onInput={(e) => setServer((e.target as HTMLInputElement).value)}
                class={inputCls}
                placeholder="https://kubernetes.default.svc"
              />
              <p class="text-xs text-text-muted mt-0.5">Use <code class="bg-surface px-0.5 rounded">https://kubernetes.default.svc</code> for in-cluster</p>
            </div>
            <div>
              <label class={labelCls}>Destination Namespace</label>
              <input
                type="text"
                value={destNamespace}
                onInput={(e) => setDestNamespace((e.target as HTMLInputElement).value)}
                class={inputCls}
                placeholder="production"
              />
            </div>
          </div>
        </div>

        {/* Sync Policy */}
        <div class="border-t border-border pt-3">
          <h3 class="text-sm font-semibold text-text mb-2">Sync Policy</h3>
          <div class="space-y-2">
            {/* Automated toggle */}
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={automated}
                onChange={() => setAutomated(v => !v)}
                class="accent-accent w-4 h-4"
              />
              <span class="text-sm text-text-muted">Automated sync</span>
            </label>

            {automated && (
              <div class="pl-6 space-y-1">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={selfHeal}
                    onChange={() => setSelfHeal(v => !v)}
                    class="accent-accent w-4 h-4"
                  />
                  <span class="text-sm text-text-muted">Self-heal (re-sync on drift)</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={prune}
                    onChange={() => setPrune(v => !v)}
                    class="accent-accent w-4 h-4"
                  />
                  <span class="text-sm text-text-muted">Prune (delete removed resources)</span>
                </label>
              </div>
            )}

            <div class="mt-1">
              <p class="text-xs text-text-muted mb-1 font-medium">Sync Options</p>
              {[
                { key: 'createNamespace', label: 'CreateNamespace=true', value: createNamespace, set: setCreateNamespace },
                { key: 'pruneProp', label: 'PrunePropagationPolicy=foreground', value: prunePropagationPolicy, set: setPrunePropagationPolicy },
                { key: 'applyOOS', label: 'ApplyOutOfSyncOnly=true', value: applyOutOfSyncOnly, set: setApplyOutOfSyncOnly },
              ].map(opt => (
                <label key={opt.key} class="flex items-center gap-2 cursor-pointer select-none mb-1">
                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={() => opt.set((v: boolean) => !v)}
                    class="accent-accent w-4 h-4"
                  />
                  <span class="text-sm font-mono text-text-muted">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Retry */}
        <div class="border-t border-border pt-3">
          <label class="flex items-center gap-2 cursor-pointer select-none mb-2">
            <input
              type="checkbox"
              checked={retryEnabled}
              onChange={() => setRetryEnabled(v => !v)}
              class="accent-accent w-4 h-4"
            />
            <span class="text-sm font-semibold text-text">Retry on Failure</span>
          </label>

          {retryEnabled && (
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class={labelCls}>Retry Limit</label>
                <input
                  type="text"
                  value={retryLimit}
                  onInput={(e) => setRetryLimit((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="5"
                />
              </div>
              <div>
                <label class={labelCls}>Backoff Duration</label>
                <input
                  type="text"
                  value={backoffDuration}
                  onInput={(e) => setBackoffDuration((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="5s"
                />
              </div>
              <div>
                <label class={labelCls}>Backoff Factor</label>
                <input
                  type="text"
                  value={backoffFactor}
                  onInput={(e) => setBackoffFactor((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="2"
                />
              </div>
              <div>
                <label class={labelCls}>Max Duration</label>
                <input
                  type="text"
                  value={backoffMaxDuration}
                  onInput={(e) => setBackoffMaxDuration((e.target as HTMLInputElement).value)}
                  class={inputCls}
                  placeholder="3m"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Output */}
      <div>
        {/* Tab bar */}
        <div class="flex gap-1 mb-2 bg-surface border border-border rounded-lg p-1">
          {([
            { id: 'yaml', label: 'Application YAML' },
            { id: 'cli', label: 'argocd app create (CLI)' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              class={`flex-1 text-sm font-medium px-3 py-1.5 rounded transition-colors ${
                activeTab === t.id
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Copy button + output */}
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-text-muted">
            {activeTab === 'yaml'
              ? 'kubectl apply -f app.yaml  |  argocd app create -f app.yaml'
              : 'Run this command after argocd login'}
          </span>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text-muted whitespace-pre">{currentOutput}</pre>

        {activeTab === 'yaml' && (
          <p class="text-xs text-text-muted mt-2">
            Apply with: <code class="bg-surface px-1 rounded">kubectl apply -f app.yaml -n argocd</code>
          </p>
        )}
        {activeTab === 'cli' && (
          <p class="text-xs text-text-muted mt-2">
            First run: <code class="bg-surface px-1 rounded">argocd login &lt;ARGOCD_SERVER&gt;</code>, then paste the command above.
          </p>
        )}
      </div>
    </div>
  );
}
