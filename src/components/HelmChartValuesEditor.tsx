import { useState } from 'preact/hooks';

type ChartTemplate = 'nginx-ingress' | 'cert-manager' | 'prometheus' | 'grafana' | 'postgresql' | 'redis' | 'mongodb' | 'custom';
type OutputTab = 'values' | 'install' | 'upgrade';

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

interface CustomValue {
  id: string;
  path: string;
  value: string;
}

interface HelmValues {
  chartTemplate: ChartTemplate;
  releaseName: string;
  namespace: string;
  replicaCount: string;
  imageRepository: string;
  imageTag: string;
  imagePullPolicy: 'Always' | 'IfNotPresent' | 'Never';
  cpuRequest: string;
  cpuLimit: string;
  memRequest: string;
  memLimit: string;
  serviceType: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  servicePort: string;
  ingressEnabled: boolean;
  ingressHost: string;
  ingressAnnotations: string;
  persistenceEnabled: boolean;
  persistenceSize: string;
  storageClass: string;
  envVars: EnvVar[];
  customValues: CustomValue[];
}

const TEMPLATE_DEFAULTS: Record<ChartTemplate, Partial<HelmValues>> = {
  'nginx-ingress': {
    releaseName: 'nginx-ingress',
    imageRepository: 'registry.k8s.io/ingress-nginx/controller',
    imageTag: 'v1.10.0',
    replicaCount: '2',
    cpuRequest: '100m',
    cpuLimit: '500m',
    memRequest: '90Mi',
    memLimit: '256Mi',
    serviceType: 'LoadBalancer',
    servicePort: '80',
    ingressEnabled: false,
  },
  'cert-manager': {
    releaseName: 'cert-manager',
    imageRepository: 'quay.io/jetstack/cert-manager-controller',
    imageTag: 'v1.14.4',
    replicaCount: '1',
    cpuRequest: '10m',
    cpuLimit: '100m',
    memRequest: '32Mi',
    memLimit: '128Mi',
    serviceType: 'ClusterIP',
    servicePort: '9402',
    ingressEnabled: false,
    persistenceEnabled: false,
  },
  'prometheus': {
    releaseName: 'prometheus',
    imageRepository: 'quay.io/prometheus/prometheus',
    imageTag: 'v2.51.0',
    replicaCount: '1',
    cpuRequest: '500m',
    cpuLimit: '2000m',
    memRequest: '512Mi',
    memLimit: '2Gi',
    serviceType: 'ClusterIP',
    servicePort: '9090',
    ingressEnabled: true,
    ingressHost: 'prometheus.example.com',
    persistenceEnabled: true,
    persistenceSize: '20Gi',
    storageClass: 'standard',
  },
  'grafana': {
    releaseName: 'grafana',
    imageRepository: 'grafana/grafana',
    imageTag: '10.4.0',
    replicaCount: '1',
    cpuRequest: '100m',
    cpuLimit: '500m',
    memRequest: '128Mi',
    memLimit: '512Mi',
    serviceType: 'ClusterIP',
    servicePort: '3000',
    ingressEnabled: true,
    ingressHost: 'grafana.example.com',
    persistenceEnabled: true,
    persistenceSize: '10Gi',
    storageClass: 'standard',
  },
  'postgresql': {
    releaseName: 'postgresql',
    imageRepository: 'bitnami/postgresql',
    imageTag: '16.2.0',
    replicaCount: '1',
    cpuRequest: '250m',
    cpuLimit: '1000m',
    memRequest: '256Mi',
    memLimit: '1Gi',
    serviceType: 'ClusterIP',
    servicePort: '5432',
    ingressEnabled: false,
    persistenceEnabled: true,
    persistenceSize: '8Gi',
    storageClass: 'standard',
  },
  'redis': {
    releaseName: 'redis',
    imageRepository: 'bitnami/redis',
    imageTag: '7.2.4',
    replicaCount: '1',
    cpuRequest: '100m',
    cpuLimit: '500m',
    memRequest: '128Mi',
    memLimit: '256Mi',
    serviceType: 'ClusterIP',
    servicePort: '6379',
    ingressEnabled: false,
    persistenceEnabled: true,
    persistenceSize: '4Gi',
    storageClass: 'standard',
  },
  'mongodb': {
    releaseName: 'mongodb',
    imageRepository: 'bitnami/mongodb',
    imageTag: '7.0.7',
    replicaCount: '1',
    cpuRequest: '250m',
    cpuLimit: '1000m',
    memRequest: '256Mi',
    memLimit: '1Gi',
    serviceType: 'ClusterIP',
    servicePort: '27017',
    ingressEnabled: false,
    persistenceEnabled: true,
    persistenceSize: '8Gi',
    storageClass: 'standard',
  },
  'custom': {
    releaseName: 'my-app',
    imageRepository: 'my-registry/my-app',
    imageTag: 'latest',
    replicaCount: '2',
    cpuRequest: '100m',
    cpuLimit: '500m',
    memRequest: '128Mi',
    memLimit: '512Mi',
    serviceType: 'ClusterIP',
    servicePort: '8080',
    ingressEnabled: true,
    ingressHost: 'myapp.example.com',
    persistenceEnabled: false,
    persistenceSize: '5Gi',
    storageClass: 'standard',
  },
};

const TEMPLATE_LABELS: Record<ChartTemplate, string> = {
  'nginx-ingress': 'ingress-nginx',
  'cert-manager': 'cert-manager',
  'prometheus': 'Prometheus',
  'grafana': 'Grafana',
  'postgresql': 'PostgreSQL',
  'redis': 'Redis',
  'mongodb': 'MongoDB',
  'custom': 'Custom Chart',
};

let counter = 0;
function newId() { return `item-${++counter}`; }

function defaultValues(template: ChartTemplate): HelmValues {
  const defaults = TEMPLATE_DEFAULTS[template];
  return {
    chartTemplate: template,
    releaseName: defaults.releaseName ?? 'my-release',
    namespace: 'default',
    replicaCount: defaults.replicaCount ?? '1',
    imageRepository: defaults.imageRepository ?? 'nginx',
    imageTag: defaults.imageTag ?? 'latest',
    imagePullPolicy: 'IfNotPresent',
    cpuRequest: defaults.cpuRequest ?? '100m',
    cpuLimit: defaults.cpuLimit ?? '500m',
    memRequest: defaults.memRequest ?? '128Mi',
    memLimit: defaults.memLimit ?? '512Mi',
    serviceType: defaults.serviceType ?? 'ClusterIP',
    servicePort: defaults.servicePort ?? '80',
    ingressEnabled: defaults.ingressEnabled ?? false,
    ingressHost: defaults.ingressHost ?? '',
    ingressAnnotations: 'kubernetes.io/ingress.class: nginx',
    persistenceEnabled: defaults.persistenceEnabled ?? false,
    persistenceSize: defaults.persistenceSize ?? '5Gi',
    storageClass: defaults.storageClass ?? 'standard',
    envVars: [],
    customValues: [],
  };
}

function indent(n: number) { return ' '.repeat(n); }

function generateValuesYaml(v: HelmValues): string {
  const lines: string[] = ['# Helm values.yaml', `# Chart: ${TEMPLATE_LABELS[v.chartTemplate]}`, ''];

  lines.push(`replicaCount: ${v.replicaCount}`, '');
  lines.push('image:');
  lines.push(`${indent(2)}repository: ${v.imageRepository}`);
  lines.push(`${indent(2)}tag: "${v.imageTag}"`);
  lines.push(`${indent(2)}pullPolicy: ${v.imagePullPolicy}`, '');

  lines.push('resources:');
  lines.push(`${indent(2)}requests:`);
  lines.push(`${indent(4)}cpu: ${v.cpuRequest}`);
  lines.push(`${indent(4)}memory: ${v.memRequest}`);
  lines.push(`${indent(2)}limits:`);
  lines.push(`${indent(4)}cpu: ${v.cpuLimit}`);
  lines.push(`${indent(4)}memory: ${v.memLimit}`, '');

  lines.push('service:');
  lines.push(`${indent(2)}type: ${v.serviceType}`);
  lines.push(`${indent(2)}port: ${v.servicePort}`, '');

  lines.push('ingress:');
  lines.push(`${indent(2)}enabled: ${v.ingressEnabled}`);
  if (v.ingressEnabled) {
    lines.push(`${indent(2)}annotations:`);
    v.ingressAnnotations.trim().split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed) lines.push(`${indent(4)}${trimmed}`);
    });
    lines.push(`${indent(2)}hosts:`);
    lines.push(`${indent(4)}- host: ${v.ingressHost || 'chart-example.local'}`);
    lines.push(`${indent(6)}paths:`);
    lines.push(`${indent(8)}- path: /`);
    lines.push(`${indent(10)}pathType: Prefix`);
    lines.push(`${indent(2)}tls: []`);
  }
  lines.push('');

  lines.push('persistence:');
  lines.push(`${indent(2)}enabled: ${v.persistenceEnabled}`);
  if (v.persistenceEnabled) {
    lines.push(`${indent(2)}size: ${v.persistenceSize}`);
    lines.push(`${indent(2)}storageClass: "${v.storageClass}"`);
    lines.push(`${indent(2)}accessMode: ReadWriteOnce`);
  }
  lines.push('');

  if (v.envVars.length > 0) {
    lines.push('env:');
    v.envVars.forEach(e => {
      if (e.key.trim()) {
        lines.push(`${indent(2)}- name: ${e.key.trim()}`);
        lines.push(`${indent(4)}value: "${e.value}"`);
      }
    });
    lines.push('');
  }

  if (v.customValues.length > 0) {
    lines.push('# Custom values');
    v.customValues.forEach(c => {
      if (c.path.trim()) {
        // Convert dotted path to nested yaml
        const parts = c.path.trim().split('.');
        parts.forEach((part, i) => {
          lines.push(`${indent(i * 2)}${part}:${i === parts.length - 1 ? ` ${c.value}` : ''}`);
        });
      }
    });
    lines.push('');
  }

  lines.push(`nameOverride: ""`);
  lines.push(`fullnameOverride: ""`);
  lines.push('');
  lines.push('serviceAccount:');
  lines.push(`${indent(2)}create: true`);
  lines.push(`${indent(2)}annotations: {}`);
  lines.push('');
  lines.push('podAnnotations: {}');
  lines.push('podSecurityContext: {}');
  lines.push('securityContext: {}');
  lines.push('');
  lines.push('nodeSelector: {}');
  lines.push('tolerations: []');
  lines.push('affinity: {}');

  return lines.join('\n');
}

function generateInstallCmd(v: HelmValues, repoName: string): string {
  const lines: string[] = [
    `helm install ${v.releaseName} ${repoName}/${v.chartTemplate === 'custom' ? 'my-chart' : v.chartTemplate} \\`,
    `  --namespace ${v.namespace} \\`,
    `  --create-namespace \\`,
    `  -f values.yaml`,
  ];

  if (v.envVars.length > 0) {
    v.envVars.forEach(e => {
      if (e.key.trim()) lines.push(`  --set env[0].name=${e.key.trim()} \\`);
    });
  }

  lines.push('');
  lines.push('# Or with individual --set flags:');
  lines.push(`helm install ${v.releaseName} ${repoName}/${v.chartTemplate === 'custom' ? 'my-chart' : v.chartTemplate} \\`);
  lines.push(`  --namespace ${v.namespace} --create-namespace \\`);
  lines.push(`  --set replicaCount=${v.replicaCount} \\`);
  lines.push(`  --set image.repository=${v.imageRepository} \\`);
  lines.push(`  --set image.tag=${v.imageTag} \\`);
  lines.push(`  --set service.type=${v.serviceType} \\`);
  lines.push(`  --set ingress.enabled=${v.ingressEnabled} \\`);
  lines.push(`  --set persistence.enabled=${v.persistenceEnabled}`);

  return lines.join('\n');
}

function generateUpgradeCmd(v: HelmValues, repoName: string): string {
  const lines: string[] = [
    `# Upgrade with updated values.yaml`,
    `helm upgrade ${v.releaseName} ${repoName}/${v.chartTemplate === 'custom' ? 'my-chart' : v.chartTemplate} \\`,
    `  --namespace ${v.namespace} \\`,
    `  -f values.yaml`,
    '',
    '# Upgrade and install if not exists (--install flag)',
    `helm upgrade --install ${v.releaseName} ${repoName}/${v.chartTemplate === 'custom' ? 'my-chart' : v.chartTemplate} \\`,
    `  --namespace ${v.namespace} \\`,
    `  --create-namespace \\`,
    `  -f values.yaml \\`,
    `  --atomic \\`,
    `  --timeout 5m0s`,
    '',
    '# Check current values before upgrading',
    `helm get values ${v.releaseName} --namespace ${v.namespace}`,
    '',
    '# Rollback if upgrade fails',
    `helm rollback ${v.releaseName} --namespace ${v.namespace}`,
  ];
  return lines.join('\n');
}

const REPO_NAMES: Record<ChartTemplate, string> = {
  'nginx-ingress': 'ingress-nginx',
  'cert-manager': 'jetstack',
  'prometheus': 'prometheus-community',
  'grafana': 'grafana',
  'postgresql': 'bitnami',
  'redis': 'bitnami',
  'mongodb': 'bitnami',
  'custom': 'my-repo',
};

export default function HelmChartValuesEditor() {
  const [values, setValues] = useState<HelmValues>(defaultValues('nginx-ingress'));
  const [activeTab, setActiveTab] = useState<OutputTab>('values');
  const [copied, setCopied] = useState(false);

  function applyTemplate(template: ChartTemplate) {
    setValues(defaultValues(template));
  }

  function update<K extends keyof HelmValues>(key: K, val: HelmValues[K]) {
    setValues(v => ({ ...v, [key]: val }));
  }

  function addEnvVar() {
    setValues(v => ({ ...v, envVars: [...v.envVars, { id: newId(), key: '', value: '' }] }));
  }
  function removeEnvVar(id: string) {
    setValues(v => ({ ...v, envVars: v.envVars.filter(e => e.id !== id) }));
  }
  function updateEnvVar(id: string, field: 'key' | 'value', val: string) {
    setValues(v => ({ ...v, envVars: v.envVars.map(e => e.id === id ? { ...e, [field]: val } : e) }));
  }

  function addCustomValue() {
    setValues(v => ({ ...v, customValues: [...v.customValues, { id: newId(), path: '', value: '' }] }));
  }
  function removeCustomValue(id: string) {
    setValues(v => ({ ...v, customValues: v.customValues.filter(c => c.id !== id) }));
  }
  function updateCustomValue(id: string, field: 'path' | 'value', val: string) {
    setValues(v => ({ ...v, customValues: v.customValues.map(c => c.id === id ? { ...c, [field]: val } : c) }));
  }

  const repoName = REPO_NAMES[values.chartTemplate];
  const valuesYaml = generateValuesYaml(values);
  const installCmd = generateInstallCmd(values, repoName);
  const upgradeCmd = generateUpgradeCmd(values, repoName);

  const outputContent = activeTab === 'values' ? valuesYaml : activeTab === 'install' ? installCmd : upgradeCmd;
  const outputFilename = activeTab === 'values' ? 'values.yaml' : activeTab === 'install' ? 'helm install' : 'helm upgrade';

  function copy() {
    navigator.clipboard.writeText(outputContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-accent font-mono';
  const selectCls = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs font-medium text-text-muted mb-1';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Config Form */}
      <div class="space-y-5">
        {/* Chart Template Selector */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <label class={labelCls}>Chart Template</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(TEMPLATE_LABELS) as ChartTemplate[]).map(t => (
              <button
                key={t}
                onClick={() => applyTemplate(t)}
                class={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  values.chartTemplate === t
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-text hover:border-accent'
                }`}
              >
                {TEMPLATE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Release & Namespace */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3 text-text">Release Settings</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>Release Name</label>
              <input value={values.releaseName} onInput={e => update('releaseName', (e.target as HTMLInputElement).value)} class={inputCls} />
            </div>
            <div>
              <label class={labelCls}>Namespace</label>
              <input value={values.namespace} onInput={e => update('namespace', (e.target as HTMLInputElement).value)} class={inputCls} />
            </div>
          </div>
        </div>

        {/* Image */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3 text-text">Image</h3>
          <div class="space-y-2">
            <div>
              <label class={labelCls}>Repository</label>
              <input value={values.imageRepository} onInput={e => update('imageRepository', (e.target as HTMLInputElement).value)} class={inputCls} />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class={labelCls}>Tag</label>
                <input value={values.imageTag} onInput={e => update('imageTag', (e.target as HTMLInputElement).value)} class={inputCls} />
              </div>
              <div>
                <label class={labelCls}>Pull Policy</label>
                <select value={values.imagePullPolicy} onChange={e => update('imagePullPolicy', (e.target as HTMLSelectElement).value as any)} class={selectCls}>
                  <option value="IfNotPresent">IfNotPresent</option>
                  <option value="Always">Always</option>
                  <option value="Never">Never</option>
                </select>
              </div>
            </div>
            <div>
              <label class={labelCls}>Replica Count</label>
              <input type="number" min="1" value={values.replicaCount} onInput={e => update('replicaCount', (e.target as HTMLInputElement).value)} class={inputCls} />
            </div>
          </div>
        </div>

        {/* Resources */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3 text-text">Resources</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>CPU Request</label>
              <input value={values.cpuRequest} onInput={e => update('cpuRequest', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="100m" />
            </div>
            <div>
              <label class={labelCls}>CPU Limit</label>
              <input value={values.cpuLimit} onInput={e => update('cpuLimit', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="500m" />
            </div>
            <div>
              <label class={labelCls}>Memory Request</label>
              <input value={values.memRequest} onInput={e => update('memRequest', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="128Mi" />
            </div>
            <div>
              <label class={labelCls}>Memory Limit</label>
              <input value={values.memLimit} onInput={e => update('memLimit', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="512Mi" />
            </div>
          </div>
        </div>

        {/* Service */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3 text-text">Service</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>Service Type</label>
              <select value={values.serviceType} onChange={e => update('serviceType', (e.target as HTMLSelectElement).value as any)} class={selectCls}>
                <option value="ClusterIP">ClusterIP</option>
                <option value="NodePort">NodePort</option>
                <option value="LoadBalancer">LoadBalancer</option>
              </select>
            </div>
            <div>
              <label class={labelCls}>Port</label>
              <input value={values.servicePort} onInput={e => update('servicePort', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="80" />
            </div>
          </div>
        </div>

        {/* Ingress */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Ingress</h3>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={values.ingressEnabled} onChange={e => update('ingressEnabled', (e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span>Enabled</span>
            </label>
          </div>
          {values.ingressEnabled && (
            <div class="space-y-2">
              <div>
                <label class={labelCls}>Host</label>
                <input value={values.ingressHost} onInput={e => update('ingressHost', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="myapp.example.com" />
              </div>
              <div>
                <label class={labelCls}>Annotations (key: value per line)</label>
                <textarea
                  value={values.ingressAnnotations}
                  onInput={e => update('ingressAnnotations', (e.target as HTMLTextAreaElement).value)}
                  rows={3}
                  class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-accent font-mono resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Persistence */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Persistence</h3>
            <label class="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={values.persistenceEnabled} onChange={e => update('persistenceEnabled', (e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span>Enabled</span>
            </label>
          </div>
          {values.persistenceEnabled && (
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class={labelCls}>Size</label>
                <input value={values.persistenceSize} onInput={e => update('persistenceSize', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="5Gi" />
              </div>
              <div>
                <label class={labelCls}>Storage Class</label>
                <input value={values.storageClass} onInput={e => update('storageClass', (e.target as HTMLInputElement).value)} class={inputCls} placeholder="standard" />
              </div>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Environment Variables</h3>
            <button onClick={addEnvVar} class="text-xs px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">+ Add</button>
          </div>
          {values.envVars.length === 0 && (
            <p class="text-xs text-text-muted">No environment variables. Click + Add to insert one.</p>
          )}
          <div class="space-y-2">
            {values.envVars.map(e => (
              <div key={e.id} class="flex items-center gap-2">
                <input value={e.key} onInput={ev => updateEnvVar(e.id, 'key', (ev.target as HTMLInputElement).value)}
                  placeholder="KEY" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <span class="text-text-muted text-xs">=</span>
                <input value={e.value} onInput={ev => updateEnvVar(e.id, 'value', (ev.target as HTMLInputElement).value)}
                  placeholder="value" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <button onClick={() => removeEnvVar(e.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Values */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Custom Values</h3>
            <button onClick={addCustomValue} class="text-xs px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">+ Add</button>
          </div>
          {values.customValues.length === 0 && (
            <p class="text-xs text-text-muted">Add arbitrary key paths (e.g. <code class="font-mono">resources.requests.cpu</code>).</p>
          )}
          <div class="space-y-2">
            {values.customValues.map(c => (
              <div key={c.id} class="flex items-center gap-2">
                <input value={c.path} onInput={ev => updateCustomValue(c.id, 'path', (ev.target as HTMLInputElement).value)}
                  placeholder="a.b.c" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <span class="text-text-muted text-xs">=</span>
                <input value={c.value} onInput={ev => updateCustomValue(c.id, 'value', (ev.target as HTMLInputElement).value)}
                  placeholder="value" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <button onClick={() => removeCustomValue(c.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Output */}
      <div class="flex flex-col gap-3">
        {/* Tabs */}
        <div class="flex items-center gap-1 bg-surface-alt rounded-lg p-1 border border-border">
          {(['values', 'install', 'upgrade'] as OutputTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                activeTab === tab ? 'bg-accent text-white' : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'values' ? 'values.yaml' : tab === 'install' ? 'helm install' : 'helm upgrade'}
            </button>
          ))}
        </div>

        {/* Output header */}
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-text-muted">{outputFilename}</span>
          <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent transition-colors text-text">
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre">{outputContent}</pre>

        {/* Quick reference */}
        <div class="p-3 rounded-lg bg-accent/5 border border-accent/20 text-xs space-y-1 text-text-muted">
          <p class="font-semibold text-text text-sm mb-2">Quick Reference</p>
          <p><code class="font-mono">helm repo add {repoName} &lt;repo-url&gt;</code></p>
          <p><code class="font-mono">helm repo update</code></p>
          <p><code class="font-mono">helm search repo {repoName}</code></p>
          <p class="mt-2"><code class="font-mono">helm lint . -f values.yaml</code> — validate before deploy</p>
          <p><code class="font-mono">helm template . -f values.yaml</code> — render without applying</p>
        </div>
      </div>
    </div>
  );
}
