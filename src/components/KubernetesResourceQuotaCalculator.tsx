import { useState } from 'preact/hooks';

interface Container {
  id: string;
  name: string;
  cpuRequest: string;
  cpuLimit: string;
  memRequest: string;
  memLimit: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function parseCpu(val: string): number {
  if (!val) return 0;
  val = val.trim();
  if (val.endsWith('m')) return parseFloat(val) / 1000;
  return parseFloat(val) || 0;
}

function parseMem(val: string): number {
  if (!val) return 0;
  val = val.trim();
  if (val.endsWith('Gi')) return parseFloat(val) * 1024;
  if (val.endsWith('Mi')) return parseFloat(val);
  if (val.endsWith('Ki')) return parseFloat(val) / 1024;
  if (val.endsWith('G')) return parseFloat(val) * 1000;
  if (val.endsWith('M')) return parseFloat(val);
  return parseFloat(val) || 0;
}

function formatCpu(cores: number): string {
  if (cores >= 1) return `${cores.toFixed(3).replace(/\.?0+$/, '')}`;
  return `${Math.round(cores * 1000)}m`;
}

function formatMem(mi: number): string {
  if (mi >= 1024) return `${(mi / 1024).toFixed(2).replace(/\.?0+$/, '')}Gi`;
  return `${Math.round(mi)}Mi`;
}

function generateQuotaYaml(containers: Container[]): string {
  const totals = containers.reduce(
    (acc, c) => ({
      cpuReq: acc.cpuReq + parseCpu(c.cpuRequest),
      cpuLim: acc.cpuLim + parseCpu(c.cpuLimit),
      memReq: acc.memReq + parseMem(c.memRequest),
      memLim: acc.memLim + parseMem(c.memLimit),
    }),
    { cpuReq: 0, cpuLim: 0, memReq: 0, memLim: 0 }
  );

  return `apiVersion: v1
kind: ResourceQuota
metadata:
  name: pod-quota
  namespace: default
spec:
  hard:
    requests.cpu: "${formatCpu(totals.cpuReq)}"
    limits.cpu: "${formatCpu(totals.cpuLim)}"
    requests.memory: "${formatMem(totals.memReq)}"
    limits.memory: "${formatMem(totals.memLim)}"`;
}

function generateLimitRangeYaml(containers: Container[]): string {
  if (containers.length === 0) return '# Add containers to generate LimitRange';
  const c = containers[0];
  return `apiVersion: v1
kind: LimitRange
metadata:
  name: container-limits
  namespace: default
spec:
  limits:
  - type: Container
    default:
      cpu: "${c.cpuLimit || '500m'}"
      memory: "${c.memLimit || '256Mi'}"
    defaultRequest:
      cpu: "${c.cpuRequest || '100m'}"
      memory: "${c.memRequest || '128Mi'}"`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      class="text-xs px-2 py-0.5 rounded bg-surface border border-border hover:bg-primary/10 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const defaultContainers: Container[] = [
  { id: makeId(), name: 'app', cpuRequest: '100m', cpuLimit: '500m', memRequest: '128Mi', memLimit: '256Mi' },
  { id: makeId(), name: 'sidecar', cpuRequest: '50m', cpuLimit: '100m', memRequest: '64Mi', memLimit: '128Mi' },
];

export default function KubernetesResourceQuotaCalculator() {
  const [containers, setContainers] = useState<Container[]>(defaultContainers);
  const [activeTab, setActiveTab] = useState<'quota' | 'limitrange'>('quota');

  function addContainer() {
    setContainers(prev => [
      ...prev,
      { id: makeId(), name: `container-${prev.length + 1}`, cpuRequest: '100m', cpuLimit: '200m', memRequest: '128Mi', memLimit: '256Mi' },
    ]);
  }

  function removeContainer(id: string) {
    setContainers(prev => prev.filter(c => c.id !== id));
  }

  function updateContainer(id: string, field: keyof Container, value: string) {
    setContainers(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  }

  const totals = containers.reduce(
    (acc, c) => ({
      cpuReq: acc.cpuReq + parseCpu(c.cpuRequest),
      cpuLim: acc.cpuLim + parseCpu(c.cpuLimit),
      memReq: acc.memReq + parseMem(c.memRequest),
      memLim: acc.memLim + parseMem(c.memLimit),
    }),
    { cpuReq: 0, cpuLim: 0, memReq: 0, memLim: 0 }
  );

  const inputClass = 'w-full px-2 py-1.5 rounded border border-border bg-background text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary';

  const yamlMap = {
    quota: generateQuotaYaml(containers),
    limitrange: generateLimitRangeYaml(containers),
  };

  return (
    <div class="space-y-6">
      {/* Container table */}
      <div class="overflow-x-auto">
        <table class="w-full text-sm border-collapse">
          <thead>
            <tr class="border-b border-border text-text-muted text-xs">
              <th class="text-left py-2 pr-3 font-medium w-1/4">Container</th>
              <th class="text-left py-2 px-2 font-medium">CPU Request</th>
              <th class="text-left py-2 px-2 font-medium">CPU Limit</th>
              <th class="text-left py-2 px-2 font-medium">Mem Request</th>
              <th class="text-left py-2 px-2 font-medium">Mem Limit</th>
              <th class="py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {containers.map(c => (
              <tr key={c.id} class="border-b border-border/50">
                <td class="py-2 pr-3">
                  <input
                    type="text"
                    value={c.name}
                    onInput={e => updateContainer(c.id, 'name', (e.target as HTMLInputElement).value)}
                    class={inputClass}
                    placeholder="container-name"
                  />
                </td>
                <td class="py-2 px-2">
                  <input
                    type="text"
                    value={c.cpuRequest}
                    onInput={e => updateContainer(c.id, 'cpuRequest', (e.target as HTMLInputElement).value)}
                    class={inputClass}
                    placeholder="100m"
                  />
                </td>
                <td class="py-2 px-2">
                  <input
                    type="text"
                    value={c.cpuLimit}
                    onInput={e => updateContainer(c.id, 'cpuLimit', (e.target as HTMLInputElement).value)}
                    class={inputClass}
                    placeholder="500m"
                  />
                </td>
                <td class="py-2 px-2">
                  <input
                    type="text"
                    value={c.memRequest}
                    onInput={e => updateContainer(c.id, 'memRequest', (e.target as HTMLInputElement).value)}
                    class={inputClass}
                    placeholder="128Mi"
                  />
                </td>
                <td class="py-2 px-2">
                  <input
                    type="text"
                    value={c.memLimit}
                    onInput={e => updateContainer(c.id, 'memLimit', (e.target as HTMLInputElement).value)}
                    class={inputClass}
                    placeholder="256Mi"
                  />
                </td>
                <td class="py-2 text-center">
                  <button
                    onClick={() => removeContainer(c.id)}
                    class="text-text-muted hover:text-red-500 transition-colors px-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addContainer}
          class="mt-3 text-sm px-3 py-1.5 rounded border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
        >
          + Add Container
        </button>
      </div>

      {/* Totals summary */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total CPU Requests', value: formatCpu(totals.cpuReq), note: `${totals.cpuReq.toFixed(3)} cores` },
          { label: 'Total CPU Limits', value: formatCpu(totals.cpuLim), note: `${totals.cpuLim.toFixed(3)} cores` },
          { label: 'Total Mem Requests', value: formatMem(totals.memReq), note: `${totals.memReq.toFixed(0)} Mi` },
          { label: 'Total Mem Limits', value: formatMem(totals.memLim), note: `${totals.memLim.toFixed(0)} Mi` },
        ].map(item => (
          <div key={item.label} class="p-3 rounded border border-border bg-surface">
            <div class="text-xs text-text-muted mb-1">{item.label}</div>
            <div class="text-lg font-bold font-mono text-primary">{item.value}</div>
            <div class="text-xs text-text-muted">{item.note}</div>
          </div>
        ))}
      </div>

      {/* YAML output */}
      <div>
        <div class="flex gap-1 border-b border-border mb-0">
          {([
            { id: 'quota' as const, label: 'ResourceQuota YAML' },
            { id: 'limitrange' as const, label: 'LimitRange YAML' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              class={`px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div class="relative">
          <div class="absolute top-2 right-2 z-10">
            <CopyButton text={yamlMap[activeTab]} />
          </div>
          <pre class="text-xs p-4 rounded-b rounded-tr bg-surface border border-t-0 border-border overflow-x-auto leading-relaxed">
            <code>{yamlMap[activeTab]}</code>
          </pre>
        </div>
      </div>

      <div class="text-xs text-text-muted space-y-1 border border-border rounded p-3 bg-surface">
        <p><strong>CPU units:</strong> <code class="font-mono">m</code> = millicores (1000m = 1 core). <code class="font-mono">100m</code> = 10% of one CPU.</p>
        <p><strong>Memory units:</strong> <code class="font-mono">Mi</code> = mebibytes, <code class="font-mono">Gi</code> = gibibytes. Prefer binary units (MiB/GiB) over decimal (MB/GB).</p>
        <p><strong>ResourceQuota</strong> enforces aggregate limits across all pods in a namespace. <strong>LimitRange</strong> sets default per-container limits.</p>
      </div>
    </div>
  );
}
