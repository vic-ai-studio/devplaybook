import { useState, useMemo } from 'preact/hooks';

type WorkloadRow = {
  name: string;
  replicas: number;
  cpuRequest: number;   // millicores
  cpuLimit: number;     // millicores
  memRequest: number;   // MiB
  memLimit: number;     // MiB
};

const DEFAULT_WORKLOADS: WorkloadRow[] = [
  { name: 'api-server', replicas: 3, cpuRequest: 250, cpuLimit: 500, memRequest: 256, memLimit: 512 },
  { name: 'worker', replicas: 2, cpuRequest: 500, cpuLimit: 1000, memRequest: 512, memLimit: 1024 },
  { name: 'redis', replicas: 1, cpuRequest: 100, cpuLimit: 200, memRequest: 128, memLimit: 256 },
];

function formatCpu(millicores: number): string {
  if (millicores >= 1000) return `${(millicores / 1000).toFixed(1)} cores`;
  return `${millicores}m`;
}

function formatMem(mib: number): string {
  if (mib >= 1024) return `${(mib / 1024).toFixed(1)} GiB`;
  return `${mib} MiB`;
}

function generateYaml(row: WorkloadRow): string {
  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${row.name}
spec:
  replicas: ${row.replicas}
  selector:
    matchLabels:
      app: ${row.name}
  template:
    metadata:
      labels:
        app: ${row.name}
    spec:
      containers:
      - name: ${row.name}
        image: your-registry/${row.name}:latest
        resources:
          requests:
            cpu: "${row.cpuRequest}m"
            memory: "${row.memRequest}Mi"
          limits:
            cpu: "${row.cpuLimit}m"
            memory: "${row.memLimit}Mi"`;
}

export default function KubernetesResourceEstimator() {
  const [workloads, setWorkloads] = useState<WorkloadRow[]>(DEFAULT_WORKLOADS);
  const [selectedYaml, setSelectedYaml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const totals = useMemo(() => {
    return workloads.reduce(
      (acc, w) => ({
        cpuRequest: acc.cpuRequest + w.cpuRequest * w.replicas,
        cpuLimit: acc.cpuLimit + w.cpuLimit * w.replicas,
        memRequest: acc.memRequest + w.memRequest * w.replicas,
        memLimit: acc.memLimit + w.memLimit * w.replicas,
        pods: acc.pods + w.replicas,
      }),
      { cpuRequest: 0, cpuLimit: 0, memRequest: 0, memLimit: 0, pods: 0 }
    );
  }, [workloads]);

  // Recommend node size (rough heuristic: +20% overhead for system pods)
  const recommendedCpu = Math.ceil(totals.cpuRequest * 1.2);
  const recommendedMem = Math.ceil(totals.memRequest * 1.2);

  const updateWorkload = (idx: number, field: keyof WorkloadRow, value: string | number) => {
    setWorkloads(prev => prev.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };

  const addWorkload = () => {
    setWorkloads(prev => [...prev, {
      name: `service-${prev.length + 1}`,
      replicas: 1,
      cpuRequest: 100,
      cpuLimit: 200,
      memRequest: 128,
      memLimit: 256,
    }]);
  };

  const removeWorkload = (idx: number) => {
    setWorkloads(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCopy = (yaml: string) => {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const namespaceQuotaYaml = `apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    requests.cpu: "${recommendedCpu}m"
    requests.memory: "${recommendedMem}Mi"
    limits.cpu: "${Math.ceil(totals.cpuLimit * 1.2)}m"
    limits.memory: "${Math.ceil(totals.memLimit * 1.2)}Mi"
    pods: "${Math.ceil(totals.pods * 1.5)}"`;

  return (
    <div class="space-y-6">
      {/* Workload table */}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-text-muted text-left">
              <th class="pb-2 pr-3 font-medium">Workload</th>
              <th class="pb-2 px-2 font-medium text-center">Replicas</th>
              <th class="pb-2 px-2 font-medium text-center">CPU Req (m)</th>
              <th class="pb-2 px-2 font-medium text-center">CPU Lim (m)</th>
              <th class="pb-2 px-2 font-medium text-center">Mem Req (Mi)</th>
              <th class="pb-2 px-2 font-medium text-center">Mem Lim (Mi)</th>
              <th class="pb-2 pl-2 font-medium"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/50">
            {workloads.map((w, idx) => (
              <tr key={idx}>
                <td class="py-2 pr-3">
                  <input
                    value={w.name}
                    onInput={e => updateWorkload(idx, 'name', (e.target as HTMLInputElement).value)}
                    class="w-full bg-background border border-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </td>
                {(['replicas', 'cpuRequest', 'cpuLimit', 'memRequest', 'memLimit'] as const).map(field => (
                  <td key={field} class="py-2 px-2">
                    <input
                      type="number"
                      min={1}
                      value={w[field]}
                      onInput={e => updateWorkload(idx, field, parseInt((e.target as HTMLInputElement).value) || 0)}
                      class="w-20 bg-background border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </td>
                ))}
                <td class="py-2 pl-2">
                  <div class="flex gap-1">
                    <button
                      onClick={() => setSelectedYaml(generateYaml(w))}
                      class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors"
                      title="View YAML"
                    >YAML</button>
                    <button
                      onClick={() => removeWorkload(idx)}
                      class="text-xs px-2 py-1 bg-surface border border-red-500/30 rounded hover:border-red-500 transition-colors text-red-400"
                      title="Remove"
                    >✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={addWorkload}
        class="text-sm px-3 py-1.5 bg-surface border border-border rounded hover:border-accent transition-colors"
      >
        + Add workload
      </button>

      {/* Totals */}
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Pods', value: totals.pods.toString() },
          { label: 'CPU Requests', value: formatCpu(totals.cpuRequest) },
          { label: 'Memory Requests', value: formatMem(totals.memRequest) },
          { label: 'CPU Limits', value: formatCpu(totals.cpuLimit) },
        ].map(({ label, value }) => (
          <div key={label} class="bg-surface border border-border rounded-lg p-3">
            <p class="text-xs text-text-muted mb-1">{label}</p>
            <p class="text-lg font-bold text-accent font-mono">{value}</p>
          </div>
        ))}
      </div>

      {/* Requests vs Limits */}
      <div class="bg-surface border border-border rounded-lg p-4">
        <p class="text-sm font-medium text-text mb-3">Requests vs Limits</p>
        <div class="space-y-3">
          {[
            { label: 'CPU', req: totals.cpuRequest, lim: totals.cpuLimit, fmt: formatCpu },
            { label: 'Memory', req: totals.memRequest, lim: totals.memLimit, fmt: formatMem },
          ].map(({ label, req, lim, fmt }) => {
            const ratio = lim > 0 ? (req / lim) * 100 : 0;
            const isHealthy = ratio >= 50;
            return (
              <div key={label}>
                <div class="flex justify-between text-xs text-text-muted mb-1">
                  <span>{label}</span>
                  <span>{fmt(req)} requests / {fmt(lim)} limits ({ratio.toFixed(0)}%)</span>
                </div>
                <div class="h-2 bg-background rounded-full overflow-hidden">
                  <div
                    class={`h-full rounded-full transition-all ${isHealthy ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(ratio, 100)}%` }}
                  />
                </div>
                {ratio < 50 && (
                  <p class="text-xs text-yellow-400 mt-1">⚠ Requests are less than 50% of limits. Consider tightening limits or raising requests for better scheduling.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Namespace Quota */}
      <div class="bg-surface border border-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="text-sm font-medium text-text">Recommended Namespace ResourceQuota</p>
          <button
            onClick={() => handleCopy(namespaceQuotaYaml)}
            class="text-xs px-2 py-1 bg-background border border-border rounded hover:border-accent transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy YAML'}
          </button>
        </div>
        <pre class="font-mono text-xs text-text-muted bg-background rounded p-3 overflow-x-auto whitespace-pre">{namespaceQuotaYaml}</pre>
        <p class="text-xs text-text-muted mt-2">Values include 20% overhead buffer for system pods and burst capacity.</p>
      </div>

      {/* Per-workload YAML modal */}
      {selectedYaml && (
        <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedYaml(null)}>
          <div class="bg-surface border border-border rounded-xl p-5 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div class="flex items-center justify-between mb-3">
              <p class="font-medium text-text">Deployment YAML</p>
              <div class="flex gap-2">
                <button onClick={() => handleCopy(selectedYaml)} class="text-xs px-2 py-1 bg-background border border-border rounded hover:border-accent transition-colors">
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <button onClick={() => setSelectedYaml(null)} class="text-xs px-2 py-1 bg-background border border-border rounded hover:border-accent transition-colors">✕ Close</button>
              </div>
            </div>
            <pre class="font-mono text-xs text-text-muted bg-background rounded p-3 overflow-x-auto whitespace-pre">{selectedYaml}</pre>
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">How to use this estimator</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Set CPU in millicores (1 core = 1000m). Start with 100–500m for most apps.</li>
          <li>Set Memory in MiB (1 GiB = 1024 MiB). Use <code class="font-mono bg-background px-1 rounded">kubectl top pods</code> to measure real usage.</li>
          <li>Limits should be 2–4× requests for burstable workloads. Set them equal for Guaranteed QoS.</li>
          <li>Apply the ResourceQuota to your namespace to prevent runaway resource usage.</li>
          <li>Add 20–30% headroom to node capacity for DaemonSets and system pods.</li>
        </ul>
      </div>
    </div>
  );
}
