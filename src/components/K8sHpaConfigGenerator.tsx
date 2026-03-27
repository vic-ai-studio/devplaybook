import { useState } from 'preact/hooks';

type ApiVersion = 'autoscaling/v2' | 'autoscaling/v1';
type MetricType = 'Resource' | 'Pods' | 'Object';
type ResourceName = 'cpu' | 'memory';
type TargetType = 'Utilization' | 'AverageValue';
type ScaleDirection = 'up' | 'down';
type PolicyType = 'Percent' | 'Pods';

interface ResourceMetric {
  id: number;
  type: 'Resource';
  resourceName: ResourceName;
  targetType: TargetType;
  targetValue: string;
}

interface PodsMetric {
  id: number;
  type: 'Pods';
  metricName: string;
  targetAverageValue: string;
}

interface ObjectMetric {
  id: number;
  type: 'Object';
  metricName: string;
  targetValue: string;
  objectApiVersion: string;
  objectKind: string;
  objectName: string;
}

type Metric = ResourceMetric | PodsMetric | ObjectMetric;

interface ScalePolicy {
  id: number;
  type: PolicyType;
  value: string;
  periodSeconds: string;
}

interface BehaviorDirection {
  stabilizationWindowSeconds: string;
  selectPolicy: 'Max' | 'Min' | 'Disabled';
  policies: ScalePolicy[];
}

let metricCounter = 3;
let policyCounter = 10;

function generateYaml(opts: {
  apiVersion: ApiVersion;
  hpaName: string;
  namespace: string;
  deploymentName: string;
  minReplicas: string;
  maxReplicas: string;
  metrics: Metric[];
  enableBehavior: boolean;
  scaleUp: BehaviorDirection;
  scaleDown: BehaviorDirection;
}): string {
  const {
    apiVersion, hpaName, namespace, deploymentName,
    minReplicas, maxReplicas, metrics, enableBehavior, scaleUp, scaleDown,
  } = opts;

  const name = hpaName || 'my-app-hpa';
  const ns = namespace || 'default';
  const target = deploymentName || 'my-app';
  const minR = parseInt(minReplicas) || 2;
  const maxR = parseInt(maxReplicas) || 10;

  let yaml = `apiVersion: ${apiVersion}
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}
  namespace: ${ns}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${target}
  minReplicas: ${minR}
  maxReplicas: ${maxR}`;

  if (apiVersion === 'autoscaling/v1') {
    // v1 only supports CPU utilization via targetCPUUtilizationPercentage
    const cpuMetric = metrics.find(m => m.type === 'Resource' && (m as ResourceMetric).resourceName === 'cpu') as ResourceMetric | undefined;
    const cpuVal = cpuMetric ? (parseInt(cpuMetric.targetValue) || 80) : 80;
    yaml += `\n  targetCPUUtilizationPercentage: ${cpuVal}`;
  } else {
    // v2 metrics block
    if (metrics.length > 0) {
      yaml += '\n  metrics:';
      for (const metric of metrics) {
        if (metric.type === 'Resource') {
          const m = metric as ResourceMetric;
          yaml += `\n  - type: Resource
    resource:
      name: ${m.resourceName}
      target:
        type: ${m.targetType}`;
          if (m.targetType === 'Utilization') {
            yaml += `\n        averageUtilization: ${parseInt(m.targetValue) || 80}`;
          } else {
            yaml += `\n        averageValue: ${m.targetValue || '200m'}`;
          }
        } else if (metric.type === 'Pods') {
          const m = metric as PodsMetric;
          yaml += `\n  - type: Pods
    pods:
      metric:
        name: ${m.metricName || 'packets-per-second'}
      target:
        type: AverageValue
        averageValue: ${m.targetAverageValue || '1k'}`;
        } else if (metric.type === 'Object') {
          const m = metric as ObjectMetric;
          yaml += `\n  - type: Object
    object:
      metric:
        name: ${m.metricName || 'requests-per-second'}
      describedObject:
        apiVersion: ${m.objectApiVersion || 'networking.k8s.io/v1'}
        kind: ${m.objectKind || 'Ingress'}
        name: ${m.objectName || 'main-ingress'}
      target:
        type: Value
        value: ${m.targetValue || '10k'}`;
        }
      }
    } else {
      yaml += `\n  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80`;
    }

    // behavior block
    if (enableBehavior) {
      yaml += '\n  behavior:';
      // scale up
      yaml += `\n    scaleUp:`;
      if (scaleUp.stabilizationWindowSeconds) {
        yaml += `\n      stabilizationWindowSeconds: ${parseInt(scaleUp.stabilizationWindowSeconds) || 0}`;
      }
      if (scaleUp.selectPolicy !== 'Max') {
        yaml += `\n      selectPolicy: ${scaleUp.selectPolicy}`;
      }
      if (scaleUp.policies.length > 0) {
        yaml += '\n      policies:';
        for (const p of scaleUp.policies) {
          yaml += `\n      - type: ${p.type}
        value: ${parseInt(p.value) || 100}
        periodSeconds: ${parseInt(p.periodSeconds) || 60}`;
        }
      }
      // scale down
      yaml += `\n    scaleDown:`;
      if (scaleDown.stabilizationWindowSeconds) {
        yaml += `\n      stabilizationWindowSeconds: ${parseInt(scaleDown.stabilizationWindowSeconds) || 300}`;
      }
      if (scaleDown.selectPolicy !== 'Max') {
        yaml += `\n      selectPolicy: ${scaleDown.selectPolicy}`;
      }
      if (scaleDown.policies.length > 0) {
        yaml += '\n      policies:';
        for (const p of scaleDown.policies) {
          yaml += `\n      - type: ${p.type}
        value: ${parseInt(p.value) || 100}
        periodSeconds: ${parseInt(p.periodSeconds) || 60}`;
        }
      }
    }
  }

  yaml += '\n';
  return yaml;
}

function generateKubectlCmd(hpaName: string, namespace: string): string {
  const name = hpaName || 'my-app-hpa';
  const ns = namespace || 'default';
  return `# Apply HPA to cluster
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa ${name} -n ${ns}

# Describe HPA (see current metrics)
kubectl describe hpa ${name} -n ${ns}

# Watch scaling in real-time
kubectl get hpa ${name} -n ${ns} -w

# Check events
kubectl get events -n ${ns} --field-selector involvedObject.name=${name}

# Delete HPA
kubectl delete hpa ${name} -n ${ns}`;
}

function defaultScaleUp(): BehaviorDirection {
  return {
    stabilizationWindowSeconds: '0',
    selectPolicy: 'Max',
    policies: [
      { id: 1, type: 'Percent', value: '100', periodSeconds: '15' },
    ],
  };
}

function defaultScaleDown(): BehaviorDirection {
  return {
    stabilizationWindowSeconds: '300',
    selectPolicy: 'Max',
    policies: [
      { id: 2, type: 'Percent', value: '100', periodSeconds: '15' },
    ],
  };
}

export default function K8sHpaConfigGenerator() {
  const [apiVersion, setApiVersion] = useState<ApiVersion>('autoscaling/v2');
  const [hpaName, setHpaName] = useState('my-app-hpa');
  const [namespace, setNamespace] = useState('default');
  const [deploymentName, setDeploymentName] = useState('my-app');
  const [minReplicas, setMinReplicas] = useState('2');
  const [maxReplicas, setMaxReplicas] = useState('10');
  const [metrics, setMetrics] = useState<Metric[]>([
    { id: 1, type: 'Resource', resourceName: 'cpu', targetType: 'Utilization', targetValue: '80' },
  ]);
  const [enableBehavior, setEnableBehavior] = useState(false);
  const [scaleUp, setScaleUp] = useState<BehaviorDirection>(defaultScaleUp());
  const [scaleDown, setScaleDown] = useState<BehaviorDirection>(defaultScaleDown());
  const [activeTab, setActiveTab] = useState<'yaml' | 'kubectl'>('yaml');
  const [copied, setCopied] = useState(false);

  const yaml = generateYaml({
    apiVersion, hpaName, namespace, deploymentName,
    minReplicas, maxReplicas, metrics, enableBehavior, scaleUp, scaleDown,
  });
  const kubectlCmd = generateKubectlCmd(hpaName, namespace);
  const outputText = activeTab === 'yaml' ? yaml : kubectlCmd;

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addMetric = (type: MetricType) => {
    metricCounter += 1;
    const id = metricCounter;
    if (type === 'Resource') {
      setMetrics(prev => [...prev, { id, type: 'Resource', resourceName: 'memory', targetType: 'AverageValue', targetValue: '200Mi' }]);
    } else if (type === 'Pods') {
      setMetrics(prev => [...prev, { id, type: 'Pods', metricName: 'packets-per-second', targetAverageValue: '1k' }]);
    } else {
      setMetrics(prev => [...prev, { id, type: 'Object', metricName: 'requests-per-second', targetValue: '10k', objectApiVersion: 'networking.k8s.io/v1', objectKind: 'Ingress', objectName: 'main-ingress' }]);
    }
  };

  const removeMetric = (id: number) => {
    setMetrics(prev => prev.filter(m => m.id !== id));
  };

  const updateMetric = (id: number, patch: Partial<Metric>) => {
    setMetrics(prev => prev.map(m => m.id === id ? { ...m, ...patch } as Metric : m));
  };

  const addPolicy = (dir: ScaleDirection) => {
    policyCounter += 1;
    const newPolicy: ScalePolicy = { id: policyCounter, type: 'Percent', value: '100', periodSeconds: '60' };
    if (dir === 'up') {
      setScaleUp(prev => ({ ...prev, policies: [...prev.policies, newPolicy] }));
    } else {
      setScaleDown(prev => ({ ...prev, policies: [...prev.policies, newPolicy] }));
    }
  };

  const removePolicy = (dir: ScaleDirection, id: number) => {
    if (dir === 'up') {
      setScaleUp(prev => ({ ...prev, policies: prev.policies.filter(p => p.id !== id) }));
    } else {
      setScaleDown(prev => ({ ...prev, policies: prev.policies.filter(p => p.id !== id) }));
    }
  };

  const updatePolicy = (dir: ScaleDirection, id: number, patch: Partial<ScalePolicy>) => {
    const updater = (prev: BehaviorDirection) => ({
      ...prev,
      policies: prev.policies.map(p => p.id === id ? { ...p, ...patch } : p),
    });
    if (dir === 'up') setScaleUp(updater); else setScaleDown(updater);
  };

  const inputClass = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelClass = 'block text-xs text-text-muted mb-0.5';
  const sectionLabelClass = 'block text-sm font-medium text-text-muted mb-2';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — form */}
      <div class="space-y-5">

        {/* API version */}
        <div>
          <label class={sectionLabelClass}>API Version</label>
          <div class="flex gap-2">
            {(['autoscaling/v2', 'autoscaling/v1'] as ApiVersion[]).map(v => (
              <button
                key={v}
                onClick={() => setApiVersion(v)}
                class={`px-3 py-1 rounded text-sm border transition-colors ${
                  apiVersion === v
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-text-muted hover:border-accent'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          {apiVersion === 'autoscaling/v1' && (
            <p class="text-xs text-text-muted mt-1.5 bg-surface border border-border rounded px-2 py-1">
              v1 only supports <code>targetCPUUtilizationPercentage</code>. Use v2 for memory, custom metrics, and behavior control.
            </p>
          )}
        </div>

        {/* Basic fields */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class={labelClass}>HPA Name</label>
            <input
              type="text"
              value={hpaName}
              onInput={(e) => setHpaName((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="my-app-hpa"
            />
          </div>
          <div>
            <label class={labelClass}>Namespace</label>
            <input
              type="text"
              value={namespace}
              onInput={(e) => setNamespace((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="default"
            />
          </div>
          <div>
            <label class={labelClass}>Target Deployment Name</label>
            <input
              type="text"
              value={deploymentName}
              onInput={(e) => setDeploymentName((e.target as HTMLInputElement).value)}
              class={inputClass}
              placeholder="my-app"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class={labelClass}>Min Replicas</label>
              <input
                type="number"
                value={minReplicas}
                onInput={(e) => setMinReplicas((e.target as HTMLInputElement).value)}
                class={inputClass}
                min="1"
                placeholder="2"
              />
            </div>
            <div>
              <label class={labelClass}>Max Replicas</label>
              <input
                type="number"
                value={maxReplicas}
                onInput={(e) => setMaxReplicas((e.target as HTMLInputElement).value)}
                class={inputClass}
                min="1"
                placeholder="10"
              />
            </div>
          </div>
        </div>

        {/* Metrics (v2 only) */}
        {apiVersion === 'autoscaling/v2' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class={sectionLabelClass.replace('mb-2', 'mb-0')}>Metrics</label>
              <div class="flex gap-1.5">
                {(['Resource', 'Pods', 'Object'] as MetricType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => addMetric(t)}
                    class="px-2 py-0.5 rounded text-xs border border-border bg-surface text-text-muted hover:border-accent hover:text-text transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
            <div class="space-y-3">
              {metrics.map((metric) => (
                <div key={metric.id} class="bg-surface-alt border border-border rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium text-text bg-surface border border-border rounded px-2 py-0.5">
                      {metric.type}
                    </span>
                    <button
                      onClick={() => removeMetric(metric.id)}
                      class="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  {metric.type === 'Resource' && (() => {
                    const m = metric as ResourceMetric;
                    return (
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class={labelClass}>Resource</label>
                          <select
                            value={m.resourceName}
                            onChange={(e) => updateMetric(m.id, { resourceName: (e.target as HTMLSelectElement).value as ResourceName })}
                            class={inputClass}
                          >
                            <option value="cpu">cpu</option>
                            <option value="memory">memory</option>
                          </select>
                        </div>
                        <div>
                          <label class={labelClass}>Target Type</label>
                          <select
                            value={m.targetType}
                            onChange={(e) => updateMetric(m.id, { targetType: (e.target as HTMLSelectElement).value as TargetType })}
                            class={inputClass}
                          >
                            <option value="Utilization">Utilization (%)</option>
                            <option value="AverageValue">AverageValue</option>
                          </select>
                        </div>
                        <div class="col-span-2">
                          <label class={labelClass}>
                            {m.targetType === 'Utilization' ? 'Target Utilization (%)' : 'Average Value (e.g. 200Mi, 500m)'}
                          </label>
                          <input
                            type="text"
                            value={m.targetValue}
                            onInput={(e) => updateMetric(m.id, { targetValue: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder={m.targetType === 'Utilization' ? '80' : '200Mi'}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {metric.type === 'Pods' && (() => {
                    const m = metric as PodsMetric;
                    return (
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class={labelClass}>Metric Name</label>
                          <input
                            type="text"
                            value={m.metricName}
                            onInput={(e) => updateMetric(m.id, { metricName: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="packets-per-second"
                          />
                        </div>
                        <div>
                          <label class={labelClass}>Target Average Value</label>
                          <input
                            type="text"
                            value={m.targetAverageValue}
                            onInput={(e) => updateMetric(m.id, { targetAverageValue: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="1k"
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {metric.type === 'Object' && (() => {
                    const m = metric as ObjectMetric;
                    return (
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class={labelClass}>Metric Name</label>
                          <input
                            type="text"
                            value={m.metricName}
                            onInput={(e) => updateMetric(m.id, { metricName: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="requests-per-second"
                          />
                        </div>
                        <div>
                          <label class={labelClass}>Target Value</label>
                          <input
                            type="text"
                            value={m.targetValue}
                            onInput={(e) => updateMetric(m.id, { targetValue: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="10k"
                          />
                        </div>
                        <div>
                          <label class={labelClass}>Object Kind</label>
                          <input
                            type="text"
                            value={m.objectKind}
                            onInput={(e) => updateMetric(m.id, { objectKind: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="Ingress"
                          />
                        </div>
                        <div>
                          <label class={labelClass}>Object Name</label>
                          <input
                            type="text"
                            value={m.objectName}
                            onInput={(e) => updateMetric(m.id, { objectName: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="main-ingress"
                          />
                        </div>
                        <div class="col-span-2">
                          <label class={labelClass}>Object API Version</label>
                          <input
                            type="text"
                            value={m.objectApiVersion}
                            onInput={(e) => updateMetric(m.id, { objectApiVersion: (e.target as HTMLInputElement).value })}
                            class={inputClass}
                            placeholder="networking.k8s.io/v1"
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Behavior (v2 only) */}
        {apiVersion === 'autoscaling/v2' && (
          <div>
            <label class="flex items-center gap-2 cursor-pointer select-none mb-3">
              <input
                type="checkbox"
                checked={enableBehavior}
                onChange={() => setEnableBehavior(!enableBehavior)}
                class="accent-accent w-4 h-4"
              />
              <span class="text-sm font-medium text-text-muted">Configure Scale Behavior</span>
            </label>

            {enableBehavior && (
              <div class="space-y-4">
                {(['up', 'down'] as ScaleDirection[]).map(dir => {
                  const behavior = dir === 'up' ? scaleUp : scaleDown;
                  const setBehavior = dir === 'up' ? setScaleUp : setScaleDown;
                  return (
                    <div key={dir} class="bg-surface-alt border border-border rounded-lg p-3 space-y-3">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium text-text capitalize">Scale {dir}</span>
                        <button
                          onClick={() => addPolicy(dir)}
                          class="text-xs px-2 py-0.5 border border-border rounded text-text-muted hover:border-accent hover:text-text transition-colors"
                        >
                          + Add Policy
                        </button>
                      </div>
                      <div class="grid grid-cols-2 gap-2">
                        <div>
                          <label class={labelClass}>Stabilization Window (s)</label>
                          <input
                            type="number"
                            value={behavior.stabilizationWindowSeconds}
                            onInput={(e) => setBehavior(prev => ({ ...prev, stabilizationWindowSeconds: (e.target as HTMLInputElement).value }))}
                            class={inputClass}
                            placeholder={dir === 'up' ? '0' : '300'}
                            min="0"
                          />
                        </div>
                        <div>
                          <label class={labelClass}>Select Policy</label>
                          <select
                            value={behavior.selectPolicy}
                            onChange={(e) => setBehavior(prev => ({ ...prev, selectPolicy: (e.target as HTMLSelectElement).value as 'Max' | 'Min' | 'Disabled' }))}
                            class={inputClass}
                          >
                            <option value="Max">Max</option>
                            <option value="Min">Min</option>
                            <option value="Disabled">Disabled</option>
                          </select>
                        </div>
                      </div>
                      {behavior.policies.map(policy => (
                        <div key={policy.id} class="grid grid-cols-3 gap-2 items-end">
                          <div>
                            <label class={labelClass}>Type</label>
                            <select
                              value={policy.type}
                              onChange={(e) => updatePolicy(dir, policy.id, { type: (e.target as HTMLSelectElement).value as PolicyType })}
                              class={inputClass}
                            >
                              <option value="Percent">Percent</option>
                              <option value="Pods">Pods</option>
                            </select>
                          </div>
                          <div>
                            <label class={labelClass}>Value</label>
                            <input
                              type="number"
                              value={policy.value}
                              onInput={(e) => updatePolicy(dir, policy.id, { value: (e.target as HTMLInputElement).value })}
                              class={inputClass}
                              placeholder="100"
                              min="1"
                            />
                          </div>
                          <div class="flex gap-1.5 items-end">
                            <div class="flex-1">
                              <label class={labelClass}>Period (s)</label>
                              <input
                                type="number"
                                value={policy.periodSeconds}
                                onInput={(e) => updatePolicy(dir, policy.id, { periodSeconds: (e.target as HTMLInputElement).value })}
                                class={inputClass}
                                placeholder="60"
                                min="1"
                              />
                            </div>
                            <button
                              onClick={() => removePolicy(dir, policy.id)}
                              class="text-xs text-red-400 hover:text-red-300 pb-1 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT — output */}
      <div class="flex flex-col">
        {/* Tabs */}
        <div class="flex gap-0 mb-0 border-b border-border">
          {(['yaml', 'kubectl'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? 'border-accent text-text font-medium'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab === 'yaml' ? 'HPA YAML' : 'kubectl apply'}
            </button>
          ))}
          <div class="flex-1" />
          <button
            onClick={handleCopy}
            class="px-3 py-1.5 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors mb-1"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto whitespace-pre text-text-muted mt-0 rounded-tl-none">{outputText}</pre>

        {activeTab === 'yaml' && (
          <p class="text-xs text-text-muted mt-2">
            Save as <code class="bg-surface px-1 rounded">hpa.yaml</code> and apply with{' '}
            <code class="bg-surface px-1 rounded">kubectl apply -f hpa.yaml</code>
          </p>
        )}
        {activeTab === 'kubectl' && (
          <p class="text-xs text-text-muted mt-2">
            Run these commands to deploy and monitor your HPA in the cluster.
          </p>
        )}
      </div>
    </div>
  );
}
