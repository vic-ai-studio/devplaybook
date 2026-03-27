import { useState, useMemo } from 'preact/hooks';

// Parse CPU value to millicores (e.g. "250m" -> 250, "0.5" -> 500, "1" -> 1000)
function parseCpu(val: string): number {
  const s = val.trim();
  if (s.endsWith('m')) {
    return parseFloat(s.slice(0, -1)) || 0;
  }
  return (parseFloat(s) || 0) * 1000;
}

// Parse memory value to MiB (e.g. "256Mi" -> 256, "1Gi" -> 1024, "512" -> 512)
function parseMem(val: string): number {
  const s = val.trim();
  if (s.endsWith('Gi')) return (parseFloat(s) || 0) * 1024;
  if (s.endsWith('Mi')) return parseFloat(s) || 0;
  if (s.endsWith('Ki')) return (parseFloat(s) || 0) / 1024;
  if (s.endsWith('G')) return (parseFloat(s) || 0) * 953.674; // decimal GB to MiB
  if (s.endsWith('M')) return parseFloat(s) || 0;
  return parseFloat(s) || 0;
}

// Format millicores to human-readable string
function formatCpu(mc: number): string {
  if (mc === 0) return '0m';
  if (mc >= 1000 && mc % 1000 === 0) return `${mc / 1000}`;
  return `${Math.round(mc)}m`;
}

// Format MiB to human-readable string
function formatMem(mib: number): string {
  if (mib === 0) return '0Mi';
  if (mib >= 1024 && mib % 1024 === 0) return `${mib / 1024}Gi`;
  return `${Math.round(mib)}Mi`;
}

// Round up to a "nice" number for quota headroom
function headroomCpu(mc: number): number {
  return Math.ceil(mc * 1.2);
}

function headroomMem(mib: number): number {
  return Math.ceil(mib * 1.2);
}

export default function K8sResourceLimitsCalculator() {
  const [containerName, setContainerName] = useState('app');
  const [cpuRequest, setCpuRequest] = useState('250m');
  const [cpuLimit, setCpuLimit] = useState('500m');
  const [memRequest, setMemRequest] = useState('256Mi');
  const [memLimit, setMemLimit] = useState('512Mi');
  const [replicas, setReplicas] = useState('3');
  const [containersPerPod, setContainersPerPod] = useState('1');
  const [namespace, setNamespace] = useState('my-namespace');
  const [copied, setCopied] = useState(false);

  const calc = useMemo(() => {
    const cpuReqMc = parseCpu(cpuRequest);
    const cpuLimMc = parseCpu(cpuLimit);
    const memReqMib = parseMem(memRequest);
    const memLimMib = parseMem(memLimit);
    const rep = Math.max(1, parseInt(replicas) || 1);
    const cpp = Math.max(1, parseInt(containersPerPod) || 1);
    const factor = rep * cpp;

    const totalCpuReq = cpuReqMc * factor;
    const totalCpuLim = cpuLimMc * factor;
    const totalMemReq = memReqMib * factor;
    const totalMemLim = memLimMib * factor;

    const quotaCpuReq = headroomCpu(totalCpuReq);
    const quotaCpuLim = headroomCpu(totalCpuLim);
    const quotaMemReq = headroomMem(totalMemReq);
    const quotaMemLim = headroomMem(totalMemLim);

    // Warnings
    const warnings: string[] = [];
    if (cpuLimMc > 0 && cpuReqMc > 0 && cpuLimMc > cpuReqMc * 4) {
      warnings.push('CPU limit is more than 4× the CPU request. This may cause noisy-neighbor issues and unpredictable throttling. Recommended ratio: 2×–3×.');
    }
    if (memLimMib > 0 && memReqMib > 0 && memLimMib > memReqMib * 4) {
      warnings.push('Memory limit is more than 4× the memory request. Pods may be scheduled on underpowered nodes and get OOMKilled. Recommended ratio: 1.5×–2×.');
    }
    if (cpuReqMc === 0 && cpuLimMc > 0) {
      warnings.push('CPU request is not set. Without a CPU request the scheduler cannot guarantee resource placement. Always set requests.');
    }
    if (memReqMib === 0 && memLimMib > 0) {
      warnings.push('Memory request is not set. Without a memory request the pod becomes "Burstable" class — set requests equal to limits for "Guaranteed" QoS.');
    }
    if (cpuLimMc > 0 && cpuLimMc < cpuReqMc) {
      warnings.push('CPU limit is lower than CPU request — this is invalid and will prevent the pod from starting.');
    }
    if (memLimMib > 0 && memLimMib < memReqMib) {
      warnings.push('Memory limit is lower than memory request — this is invalid and will prevent the pod from starting.');
    }

    return {
      cpuReqMc, cpuLimMc, memReqMib, memLimMib,
      rep, cpp, factor,
      totalCpuReq, totalCpuLim, totalMemReq, totalMemLim,
      quotaCpuReq, quotaCpuLim, quotaMemReq, quotaMemLim,
      warnings,
    };
  }, [cpuRequest, cpuLimit, memRequest, memLimit, replicas, containersPerPod]);

  const yaml = useMemo(() => {
    const { cpuReqMc, cpuLimMc, memReqMib, memLimMib,
            quotaCpuReq, quotaCpuLim, quotaMemReq, quotaMemLim } = calc;

    const memReqStr = formatMem(memReqMib);
    const memLimStr = formatMem(memLimMib);

    // Format quota memory as Gi when >= 1024 for readability
    const fmtQuotaMem = (mib: number) => {
      if (mib >= 1024) {
        const gi = mib / 1024;
        return Number.isInteger(gi) ? `${gi}Gi` : `${gi.toFixed(2)}Gi`;
      }
      return `${mib}Mi`;
    };

    return `# Container resource spec — paste into your container definition
resources:
  requests:
    cpu: "${formatCpu(cpuReqMc)}"
    memory: "${memReqStr}"
  limits:
    cpu: "${formatCpu(cpuLimMc)}"
    memory: "${memLimStr}"

---
# Namespace ResourceQuota (with 20% headroom)
# Covers ${calc.rep} replica(s) × ${calc.cpp} container(s)/pod
apiVersion: v1
kind: ResourceQuota
metadata:
  name: resource-quota
  namespace: ${namespace || 'my-namespace'}
spec:
  hard:
    requests.cpu: "${formatCpu(quotaCpuReq)}"
    requests.memory: "${fmtQuotaMem(quotaMemReq)}"
    limits.cpu: "${formatCpu(quotaCpuLim)}"
    limits.memory: "${fmtQuotaMem(quotaMemLim)}"

---
# LimitRange — default values for containers without explicit resources
apiVersion: v1
kind: LimitRange
metadata:
  name: limit-range
  namespace: ${namespace || 'my-namespace'}
spec:
  limits:
    - type: Container
      default:
        cpu: "${formatCpu(cpuLimMc)}"
        memory: "${memLimStr}"
      defaultRequest:
        cpu: "${formatCpu(cpuReqMc)}"
        memory: "${memReqStr}"
      max:
        cpu: "${formatCpu(cpuLimMc * 2)}"
        memory: "${formatMem(memLimMib * 2)}"`;
  }, [calc, namespace]);

  async function copyYaml() {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = yaml;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const inputCls = 'w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none';
  const labelCls = 'block text-xs text-text-muted mb-1';

  const { totalCpuReq, totalCpuLim, totalMemReq, totalMemLim, warnings } = calc;

  return (
    <div class="space-y-6">
      {/* Inputs */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Container & Workload Configuration</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label class={labelCls}>Container Name</label>
            <input
              type="text"
              class={inputCls}
              value={containerName}
              onInput={(e) => setContainerName((e.target as HTMLInputElement).value)}
              placeholder="app"
            />
          </div>
          <div>
            <label class={labelCls}>Namespace</label>
            <input
              type="text"
              class={inputCls}
              value={namespace}
              onInput={(e) => setNamespace((e.target as HTMLInputElement).value)}
              placeholder="my-namespace"
            />
          </div>
          <div>
            <label class={labelCls}>Replicas</label>
            <input
              type="number"
              min="1"
              class={inputCls}
              value={replicas}
              onInput={(e) => setReplicas((e.target as HTMLInputElement).value)}
              placeholder="3"
            />
          </div>
          <div>
            <label class={labelCls}>Containers per Pod</label>
            <input
              type="number"
              min="1"
              class={inputCls}
              value={containersPerPod}
              onInput={(e) => setContainersPerPod((e.target as HTMLInputElement).value)}
              placeholder="1"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* CPU */}
          <div class="bg-bg rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-1 rounded">CPU</span>
              <span class="text-xs text-text-muted">per container</span>
            </div>
            <div>
              <label class={labelCls}>CPU Request (e.g. 250m or 0.25)</label>
              <input
                type="text"
                class={inputCls}
                value={cpuRequest}
                onInput={(e) => setCpuRequest((e.target as HTMLInputElement).value)}
                placeholder="250m"
              />
            </div>
            <div>
              <label class={labelCls}>CPU Limit (e.g. 500m or 0.5)</label>
              <input
                type="text"
                class={inputCls}
                value={cpuLimit}
                onInput={(e) => setCpuLimit((e.target as HTMLInputElement).value)}
                placeholder="500m"
              />
            </div>
            {calc.cpuReqMc > 0 && calc.cpuLimMc > 0 && (
              <div class="text-xs text-text-muted">
                Limit / Request ratio:{' '}
                <span class={`font-semibold ${calc.cpuLimMc / calc.cpuReqMc > 4 ? 'text-red-400' : calc.cpuLimMc / calc.cpuReqMc > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {(calc.cpuLimMc / calc.cpuReqMc).toFixed(1)}×
                </span>
              </div>
            )}
          </div>

          {/* Memory */}
          <div class="bg-bg rounded-xl p-4 space-y-3">
            <div class="flex items-center gap-2 mb-1">
              <span class="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded">Memory</span>
              <span class="text-xs text-text-muted">per container</span>
            </div>
            <div>
              <label class={labelCls}>Memory Request (e.g. 256Mi or 1Gi)</label>
              <input
                type="text"
                class={inputCls}
                value={memRequest}
                onInput={(e) => setMemRequest((e.target as HTMLInputElement).value)}
                placeholder="256Mi"
              />
            </div>
            <div>
              <label class={labelCls}>Memory Limit (e.g. 512Mi or 2Gi)</label>
              <input
                type="text"
                class={inputCls}
                value={memLimit}
                onInput={(e) => setMemLimit((e.target as HTMLInputElement).value)}
                placeholder="512Mi"
              />
            </div>
            {calc.memReqMib > 0 && calc.memLimMib > 0 && (
              <div class="text-xs text-text-muted">
                Limit / Request ratio:{' '}
                <span class={`font-semibold ${calc.memLimMib / calc.memReqMib > 4 ? 'text-red-400' : calc.memLimMib / calc.memReqMib > 2 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {(calc.memLimMib / calc.memReqMib).toFixed(1)}×
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div class="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} class="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
              <span class="text-yellow-400 mt-0.5 shrink-0">⚠</span>
              <p class="text-sm text-yellow-300">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-1">Total Cluster Resource Usage</h2>
        <p class="text-xs text-text-muted mb-4">
          {calc.rep} replica{calc.rep !== 1 ? 's' : ''} × {calc.cpp} container{calc.cpp !== 1 ? 's' : ''}/pod = {calc.factor} total container{calc.factor !== 1 ? 's' : ''}
        </p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-bg rounded-xl p-4 text-center">
            <div class="text-xs text-text-muted mb-1">Total CPU Requests</div>
            <div class="text-2xl font-bold text-blue-400">{formatCpu(totalCpuReq)}</div>
            <div class="text-xs text-text-muted mt-1">millicores</div>
          </div>
          <div class="bg-bg rounded-xl p-4 text-center">
            <div class="text-xs text-text-muted mb-1">Total CPU Limits</div>
            <div class="text-2xl font-bold text-blue-300">{formatCpu(totalCpuLim)}</div>
            <div class="text-xs text-text-muted mt-1">millicores</div>
          </div>
          <div class="bg-bg rounded-xl p-4 text-center">
            <div class="text-xs text-text-muted mb-1">Total Memory Requests</div>
            <div class="text-2xl font-bold text-purple-400">{formatMem(totalMemReq)}</div>
            <div class="text-xs text-text-muted mt-1">binary</div>
          </div>
          <div class="bg-bg rounded-xl p-4 text-center">
            <div class="text-xs text-text-muted mb-1">Total Memory Limits</div>
            <div class="text-2xl font-bold text-purple-300">{formatMem(totalMemLim)}</div>
            <div class="text-xs text-text-muted mt-1">binary</div>
          </div>
        </div>

        {/* Quota headroom info */}
        <div class="mt-4 bg-bg rounded-xl p-4">
          <div class="text-xs font-semibold text-text-muted mb-3 uppercase tracking-wide">Recommended ResourceQuota (20% headroom)</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <div class="text-xs text-text-muted">requests.cpu</div>
              <div class="font-mono text-sm font-bold text-blue-400">{formatCpu(calc.quotaCpuReq)}</div>
            </div>
            <div>
              <div class="text-xs text-text-muted">limits.cpu</div>
              <div class="font-mono text-sm font-bold text-blue-300">{formatCpu(calc.quotaCpuLim)}</div>
            </div>
            <div>
              <div class="text-xs text-text-muted">requests.memory</div>
              <div class="font-mono text-sm font-bold text-purple-400">{formatMem(calc.quotaMemReq)}</div>
            </div>
            <div>
              <div class="text-xs text-text-muted">limits.memory</div>
              <div class="font-mono text-sm font-bold text-purple-300">{formatMem(calc.quotaMemLim)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Generated YAML */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3 gap-4 flex-wrap">
          <div>
            <h2 class="text-base font-semibold">Generated YAML</h2>
            <p class="text-xs text-text-muted mt-0.5">Container spec + ResourceQuota + LimitRange — ready to apply with <code class="font-mono">kubectl apply -f</code></p>
          </div>
          <button
            onClick={copyYaml}
            class={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-accent hover:bg-accent-hover text-white'
            }`}
          >
            {copied ? (
              <>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M5 13l4 4L19 7" /></svg>
                Copied!
              </>
            ) : (
              <>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Copy YAML
              </>
            )}
          </button>
        </div>
        <pre class="bg-bg rounded-xl p-4 overflow-x-auto text-xs font-mono text-text leading-relaxed whitespace-pre">{yaml}</pre>
      </div>

      {/* Quick Reference */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-3">Quick Reference</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">CPU Units</div>
            <ul class="space-y-1 text-text-muted text-xs">
              <li><code class="font-mono text-blue-400">1000m</code> = 1 vCPU core</li>
              <li><code class="font-mono text-blue-400">500m</code> = 0.5 cores</li>
              <li><code class="font-mono text-blue-400">250m</code> = 0.25 cores</li>
              <li><code class="font-mono text-blue-400">100m</code> = 0.1 cores (minimum recommended)</li>
            </ul>
          </div>
          <div>
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Memory Units</div>
            <ul class="space-y-1 text-text-muted text-xs">
              <li><code class="font-mono text-purple-400">1Gi</code> = 1,073,741,824 bytes</li>
              <li><code class="font-mono text-purple-400">512Mi</code> = 536,870,912 bytes</li>
              <li><code class="font-mono text-purple-400">256Mi</code> = typical Node.js/Go app minimum</li>
              <li>Exceeding limit = <span class="text-red-400">OOMKilled</span> (pod restarts)</li>
            </ul>
          </div>
          <div>
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">QoS Classes</div>
            <ul class="space-y-1 text-text-muted text-xs">
              <li><span class="text-green-400 font-semibold">Guaranteed</span> — request = limit for CPU & memory</li>
              <li><span class="text-yellow-400 font-semibold">Burstable</span> — request &lt; limit (at least one resource)</li>
              <li><span class="text-red-400 font-semibold">BestEffort</span> — no requests or limits set (avoid)</li>
            </ul>
          </div>
          <div>
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Apply Commands</div>
            <ul class="space-y-1 text-text-muted text-xs">
              <li><code class="font-mono text-text">kubectl apply -f quota.yaml</code></li>
              <li><code class="font-mono text-text">kubectl describe resourcequota -n {namespace || 'my-namespace'}</code></li>
              <li><code class="font-mono text-text">kubectl top pods -n {namespace || 'my-namespace'}</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
