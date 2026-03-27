import { useState } from 'preact/hooks';

type MemoryUnit = 'Mi' | 'Gi';

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
        <span class="text-xs font-mono text-text-muted">{label}</span>
        <CopyButton value={code} />
      </div>
      <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function toMi(value: number, unit: MemoryUnit): number {
  return unit === 'Gi' ? value * 1024 : value;
}

function fmtMem(mi: number): string {
  if (mi >= 1024 && mi % 1024 === 0) return `${mi / 1024}Gi`;
  return `${mi}Mi`;
}

export default function KubernetesResourceCalculator() {
  const [containerName, setContainerName] = useState('app');
  const [cpuReq, setCpuReq] = useState(100);
  const [cpuLimit, setCpuLimit] = useState(500);
  const [memReq, setMemReq] = useState(128);
  const [memReqUnit, setMemReqUnit] = useState<MemoryUnit>('Mi');
  const [memLimit, setMemLimit] = useState(512);
  const [memLimitUnit, setMemLimitUnit] = useState<MemoryUnit>('Mi');
  const [minReplicas, setMinReplicas] = useState(2);
  const [maxReplicas, setMaxReplicas] = useState(5);
  const [namespace, setNamespace] = useState('production');

  const safeContainer = containerName.trim() || 'app';
  const memReqMi = toMi(memReq, memReqUnit);
  const memLimitMi = toMi(memLimit, memLimitUnit);

  const podYaml = `resources:
  requests:
    cpu: "${cpuReq}m"
    memory: "${fmtMem(memReqMi)}"
  limits:
    cpu: "${cpuLimit}m"
    memory: "${fmtMem(memLimitMi)}"`;

  const fullPodYaml = `apiVersion: v1
kind: Pod
metadata:
  name: ${safeContainer}
  namespace: ${namespace}
spec:
  containers:
    - name: ${safeContainer}
      image: your-image:latest
      ${podYaml.split('\n').join('\n      ')}`;

  const hpaYaml = `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${safeContainer}-hpa
  namespace: ${namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${safeContainer}
  minReplicas: ${minReplicas}
  maxReplicas: ${maxReplicas}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70`;

  const quotaYaml = `apiVersion: v1
kind: ResourceQuota
metadata:
  name: ${namespace}-quota
  namespace: ${namespace}
spec:
  hard:
    requests.cpu: "${cpuReq * maxReplicas}m"
    requests.memory: "${fmtMem(memReqMi * maxReplicas)}"
    limits.cpu: "${cpuLimit * maxReplicas}m"
    limits.memory: "${fmtMem(memLimitMi * maxReplicas)}"
    pods: "${maxReplicas}"`;

  const summaryRows = [
    { label: 'CPU Request (per pod)', value: `${cpuReq}m` },
    { label: 'CPU Limit (per pod)', value: `${cpuLimit}m` },
    { label: 'Memory Request (per pod)', value: fmtMem(memReqMi) },
    { label: 'Memory Limit (per pod)', value: fmtMem(memLimitMi) },
    { label: `Total CPU Requests (×${minReplicas} min replicas)`, value: `${cpuReq * minReplicas}m` },
    { label: `Total CPU Requests (×${maxReplicas} max replicas)`, value: `${cpuReq * maxReplicas}m` },
    { label: `Total Mem Requests (×${minReplicas} min replicas)`, value: fmtMem(memReqMi * minReplicas) },
    { label: `Total Mem Requests (×${maxReplicas} max replicas)`, value: fmtMem(memReqMi * maxReplicas) },
    { label: `Total CPU Limits (×${maxReplicas} max replicas)`, value: `${cpuLimit * maxReplicas}m` },
    { label: `Total Mem Limits (×${maxReplicas} max replicas)`, value: fmtMem(memLimitMi * maxReplicas) },
  ];

  return (
    <div class="space-y-6">
      {/* Container Config */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-semibold text-text-primary">Container Configuration</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Container Name</label>
            <input
              type="text"
              value={containerName}
              onInput={(e: any) => setContainerName(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="app"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Namespace</label>
            <input
              type="text"
              value={namespace}
              onInput={(e: any) => setNamespace(e.target.value)}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              placeholder="production"
            />
          </div>
        </div>
      </div>

      {/* CPU */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-semibold text-text-primary">CPU (millicores)</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">CPU Request (m)</label>
            <input
              type="number"
              value={cpuReq}
              min={1}
              max={64000}
              onInput={(e: any) => setCpuReq(Number(e.target.value))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <p class="text-xs text-text-muted mt-1">e.g. 100m = 0.1 vCPU</p>
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">CPU Limit (m)</label>
            <input
              type="number"
              value={cpuLimit}
              min={1}
              max={64000}
              onInput={(e: any) => setCpuLimit(Number(e.target.value))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <p class="text-xs text-text-muted mt-1">e.g. 1000m = 1 vCPU</p>
          </div>
        </div>
        {cpuReq > cpuLimit && (
          <p class="text-xs text-red-400">Warning: CPU request exceeds limit. Kubernetes requires request ≤ limit.</p>
        )}
      </div>

      {/* Memory */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-semibold text-text-primary">Memory</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Memory Request</label>
            <div class="flex gap-2">
              <input
                type="number"
                value={memReq}
                min={1}
                onInput={(e: any) => setMemReq(Number(e.target.value))}
                class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <select
                value={memReqUnit}
                onChange={(e: any) => setMemReqUnit(e.target.value as MemoryUnit)}
                class="bg-bg border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="Mi">Mi</option>
                <option value="Gi">Gi</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Memory Limit</label>
            <div class="flex gap-2">
              <input
                type="number"
                value={memLimit}
                min={1}
                onInput={(e: any) => setMemLimit(Number(e.target.value))}
                class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
              />
              <select
                value={memLimitUnit}
                onChange={(e: any) => setMemLimitUnit(e.target.value as MemoryUnit)}
                class="bg-bg border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-accent"
              >
                <option value="Mi">Mi</option>
                <option value="Gi">Gi</option>
              </select>
            </div>
          </div>
        </div>
        {memReqMi > memLimitMi && (
          <p class="text-xs text-red-400">Warning: Memory request exceeds limit. Kubernetes requires request ≤ limit.</p>
        )}
      </div>

      {/* HPA Replicas */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-semibold text-text-primary">HPA Replicas</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Min Replicas</label>
            <input
              type="number"
              value={minReplicas}
              min={1}
              max={1000}
              onInput={(e: any) => setMinReplicas(Number(e.target.value))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Max Replicas</label>
            <input
              type="number"
              value={maxReplicas}
              min={1}
              max={1000}
              onInput={(e: any) => setMaxReplicas(Number(e.target.value))}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        {minReplicas > maxReplicas && (
          <p class="text-xs text-red-400">Warning: Min replicas exceeds max replicas.</p>
        )}
      </div>

      {/* Summary Table */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-2.5 border-b border-border bg-bg">
          <span class="text-xs font-semibold text-text-muted">Resource Summary</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left px-4 py-2 text-xs text-text-muted font-medium">Metric</th>
                <th class="text-right px-4 py-2 text-xs text-text-muted font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row, i) => (
                <tr key={i} class={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-bg/40'}`}>
                  <td class="px-4 py-2 text-xs text-text-muted">{row.label}</td>
                  <td class="px-4 py-2 text-xs font-mono text-right text-text-primary">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated YAML */}
      <div class="space-y-4">
        <div class="text-sm font-semibold text-text-primary">Generated YAML</div>
        <CodeBlock code={podYaml} label="resources: block (paste into container spec)" />
        <CodeBlock code={fullPodYaml} label="Full Pod spec" />
        <CodeBlock code={hpaYaml} label="HorizontalPodAutoscaler" />
        <CodeBlock code={quotaYaml} label="Namespace ResourceQuota" />
      </div>

      {/* Tips */}
      <div class="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300 space-y-1.5">
        <div class="font-medium">Best practice tips</div>
        <ul class="list-disc list-inside space-y-1 text-blue-300/80 text-xs">
          <li>Always set both requests and limits — unset limits can cause node OOM kills</li>
          <li>Requests determine scheduling; limits cap usage after scheduling</li>
          <li>CPU throttling happens at the limit; memory OOM kills the container</li>
          <li>Start with request ≈ 50% of limit to allow bursting headroom</li>
          <li>HPA scales on CPU utilization relative to the <strong>request</strong>, not the limit</li>
        </ul>
      </div>
    </div>
  );
}
