import { useState } from 'preact/hooks';

type PolicyMode = 'minAvailable' | 'maxUnavailable';
type ValueType = 'number' | 'percentage';

interface LabelSelector {
  key: string;
  value: string;
}

interface PdbConfig {
  name: string;
  namespace: string;
  labels: LabelSelector[];
  policyMode: PolicyMode;
  valueType: ValueType;
  value: string;
  unhealthyPodEviction: boolean;
}

const TEMPLATES: Record<string, Partial<PdbConfig> & { label: string; description: string }> = {
  halfAvailable: {
    label: '50% Available',
    description: 'At least half pods always running — good for stateless services',
    policyMode: 'minAvailable',
    valueType: 'percentage',
    value: '50',
  },
  oneAvailable: {
    label: '1 Always Running',
    description: 'At least one pod must be running at all times',
    policyMode: 'minAvailable',
    valueType: 'number',
    value: '1',
  },
  oneDisruption: {
    label: 'Allow 1 Disruption',
    description: 'At most 1 pod can be disrupted at once',
    policyMode: 'maxUnavailable',
    valueType: 'number',
    value: '1',
  },
  highAvailability: {
    label: 'High Availability (80%)',
    description: 'At least 80% of pods must be available',
    policyMode: 'minAvailable',
    valueType: 'percentage',
    value: '80',
  },
};

function generateYaml(cfg: PdbConfig): string {
  const apiVersion = 'policy/v1';
  const policyValue = cfg.valueType === 'percentage' ? `${cfg.value}%` : cfg.value;

  const labelsBlock = cfg.labels.length > 0
    ? cfg.labels.map(l => `        ${l.key}: "${l.value}"`).join('\n')
    : '        app: my-app';

  const policyLine = cfg.policyMode === 'minAvailable'
    ? `  minAvailable: ${policyValue}`
    : `  maxUnavailable: ${policyValue}`;

  const unhealthyLine = cfg.unhealthyPodEviction
    ? '\n  unhealthyPodEvictionPolicy: AlwaysAllow'
    : '';

  return `apiVersion: ${apiVersion}
kind: PodDisruptionBudget
metadata:
  name: ${cfg.name || 'my-app-pdb'}
  namespace: ${cfg.namespace || 'default'}
  labels:
    app.kubernetes.io/managed-by: kubectl
spec:
${policyLine}${unhealthyLine}
  selector:
    matchLabels:
${labelsBlock}`;
}

function explainPolicy(cfg: PdbConfig): string {
  const value = cfg.valueType === 'percentage' ? `${cfg.value}%` : `${cfg.value} pod${cfg.value !== '1' ? 's' : ''}`;
  const selector = cfg.labels.length > 0
    ? cfg.labels.map(l => `${l.key}=${l.value}`).join(', ')
    : 'app=my-app';

  if (cfg.policyMode === 'minAvailable') {
    return `At least ${value} of pods matching [${selector}] must be available at all times. ` +
      `Kubernetes will refuse to voluntarily evict a pod if doing so would bring the available count below ${value}. ` +
      `This protects your service during node drains, cluster upgrades, and PodDisruptionBudget-aware evictions.`;
  } else {
    return `At most ${value} of pods matching [${selector}] can be unavailable at once. ` +
      `If ${value} pods are already disrupted, Kubernetes will block further voluntary evictions until pods recover. ` +
      `This limits the blast radius during rolling updates, node maintenance, and cluster upgrades.`;
  }
}

export default function KubernetesPdbGenerator() {
  const [cfg, setCfg] = useState<PdbConfig>({
    name: 'my-app-pdb',
    namespace: 'default',
    labels: [{ key: 'app', value: 'my-app' }],
    policyMode: 'minAvailable',
    valueType: 'number',
    value: '1',
    unhealthyPodEviction: false,
  });
  const [copied, setCopied] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  const yaml = generateYaml(cfg);
  const explanation = explainPolicy(cfg);

  function update(patch: Partial<PdbConfig>) {
    setCfg(prev => ({ ...prev, ...patch }));
  }

  function applyTemplate(key: string) {
    const t = TEMPLATES[key];
    update({
      policyMode: t.policyMode,
      valueType: t.valueType,
      value: t.value,
    });
  }

  function addLabel() {
    update({ labels: [...cfg.labels, { key: '', value: '' }] });
  }

  function removeLabel(i: number) {
    update({ labels: cfg.labels.filter((_, idx) => idx !== i) });
  }

  function updateLabel(i: number, field: 'key' | 'value', val: string) {
    const newLabels = cfg.labels.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
    update({ labels: newLabels });
  }

  function copyYaml() {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadYaml() {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cfg.name || 'pdb'}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls = 'w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent';
  const labelCls = 'block text-xs font-medium text-text-muted mb-1';

  return (
    <div class="space-y-5">
      {/* Templates */}
      <div>
        <p class="text-xs font-medium text-text-muted mb-2">QUICK TEMPLATES</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(TEMPLATES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => applyTemplate(key)}
              class="p-2.5 text-left rounded border border-border hover:border-accent bg-surface transition-colors group"
            >
              <div class="text-sm font-medium text-text group-hover:text-accent">{t.label}</div>
              <div class="text-xs text-text-muted mt-0.5 leading-snug">{t.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Config form */}
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>PDB Name</label>
              <input
                type="text"
                value={cfg.name}
                onInput={e => update({ name: (e.target as HTMLInputElement).value })}
                class={inputCls}
                placeholder="my-app-pdb"
              />
            </div>
            <div>
              <label class={labelCls}>Namespace</label>
              <input
                type="text"
                value={cfg.namespace}
                onInput={e => update({ namespace: (e.target as HTMLInputElement).value })}
                class={inputCls}
                placeholder="default"
              />
            </div>
          </div>

          {/* Label Selectors */}
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class={labelCls}>Label Selectors (matchLabels)</label>
              <button onClick={addLabel} class="text-xs text-accent hover:underline">+ Add Label</button>
            </div>
            <div class="space-y-2">
              {cfg.labels.map((l, i) => (
                <div key={i} class="flex gap-2 items-center">
                  <input
                    type="text"
                    value={l.key}
                    onInput={e => updateLabel(i, 'key', (e.target as HTMLInputElement).value)}
                    placeholder="key"
                    class={`flex-1 ${inputCls}`}
                  />
                  <span class="text-text-muted text-sm">=</span>
                  <input
                    type="text"
                    value={l.value}
                    onInput={e => updateLabel(i, 'value', (e.target as HTMLInputElement).value)}
                    placeholder="value"
                    class={`flex-1 ${inputCls}`}
                  />
                  <button
                    onClick={() => removeLabel(i)}
                    class="text-red-400 hover:text-red-300 text-sm px-1"
                  >✕</button>
                </div>
              ))}
              {cfg.labels.length === 0 && (
                <p class="text-xs text-text-muted italic">No labels — selector will be empty. Add at least one.</p>
              )}
            </div>
          </div>

          {/* Policy */}
          <div>
            <label class={labelCls}>Disruption Policy</label>
            <div class="grid grid-cols-2 gap-2 mb-3">
              {(['minAvailable', 'maxUnavailable'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => update({ policyMode: mode })}
                  class={`p-2.5 rounded border text-sm text-left transition-colors ${cfg.policyMode === mode ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted hover:border-accent'}`}
                >
                  <div class="font-medium">{mode === 'minAvailable' ? 'minAvailable' : 'maxUnavailable'}</div>
                  <div class="text-xs opacity-70 mt-0.5">
                    {mode === 'minAvailable' ? 'Min pods that must be up' : 'Max pods that can be down'}
                  </div>
                </button>
              ))}
            </div>

            <div class="flex gap-3 items-center">
              <div class="flex gap-2">
                {(['number', 'percentage'] as const).map(vt => (
                  <button
                    key={vt}
                    onClick={() => update({ valueType: vt })}
                    class={`px-3 py-1.5 rounded text-xs transition-colors ${cfg.valueType === vt ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
                  >
                    {vt === 'number' ? '#' : '%'}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                max={cfg.valueType === 'percentage' ? '100' : '100'}
                value={cfg.value}
                onInput={e => update({ value: (e.target as HTMLInputElement).value })}
                class={`w-24 ${inputCls}`}
              />
              {cfg.valueType === 'percentage' && <span class="text-text-muted text-sm">%</span>}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="unhealthy-eviction"
              checked={cfg.unhealthyPodEviction}
              onChange={e => update({ unhealthyPodEviction: (e.target as HTMLInputElement).checked })}
              class="accent-accent"
            />
            <label for="unhealthy-eviction" class="text-sm text-text-muted cursor-pointer">
              unhealthyPodEvictionPolicy: AlwaysAllow
              <span class="text-xs ml-1 opacity-60">(evict unhealthy pods even at min)</span>
            </label>
          </div>
        </div>

        {/* Right: YAML output */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-text-muted">GENERATED YAML</p>
            <div class="flex gap-2">
              <button
                onClick={() => setShowExplain(!showExplain)}
                class="px-3 py-1.5 text-xs rounded bg-surface border border-border text-text-muted hover:border-accent transition-colors"
              >
                {showExplain ? 'Hide' : 'Explain'}
              </button>
              <button onClick={downloadYaml} class="px-3 py-1.5 text-xs rounded bg-surface border border-border text-text-muted hover:border-accent transition-colors">
                ↓ Download
              </button>
              <button onClick={copyYaml} class="px-3 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors">
                {copied ? 'Copied!' : 'Copy YAML'}
              </button>
            </div>
          </div>

          <pre class="bg-surface border border-border rounded p-4 text-xs font-mono text-text overflow-x-auto whitespace-pre leading-relaxed h-64 overflow-y-auto">{yaml}</pre>

          {showExplain && (
            <div class="p-4 bg-accent/5 border border-accent/20 rounded text-sm text-text leading-relaxed">
              <p class="font-medium text-accent mb-1">What this PDB does:</p>
              <p>{explanation}</p>
            </div>
          )}

          <div class="p-3 bg-surface border border-border rounded text-xs space-y-1.5">
            <p class="font-medium text-text-muted">Apply with kubectl:</p>
            <code class="block font-mono text-accent bg-black/20 rounded px-2 py-1">
              kubectl apply -f {cfg.name || 'pdb'}.yaml
            </code>
            <code class="block font-mono text-accent bg-black/20 rounded px-2 py-1">
              kubectl get pdb -n {cfg.namespace || 'default'}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
