import { useState } from 'preact/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResourceType = 'Deployment' | 'Service' | 'Ingress' | 'ConfigMap' | 'Secret';

interface KV { id: string; key: string; value: string; }

interface DeploymentConfig {
  name: string;
  namespace: string;
  replicas: string;
  image: string;
  tag: string;
  containerPort: string;
  cpuRequest: string;
  memRequest: string;
  cpuLimit: string;
  memLimit: string;
  imagePullPolicy: 'Always' | 'IfNotPresent' | 'Never';
  envVars: KV[];
  labels: KV[];
}

interface ServiceConfig {
  name: string;
  namespace: string;
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer';
  port: string;
  targetPort: string;
  selectors: KV[];
}

interface IngressConfig {
  name: string;
  namespace: string;
  host: string;
  path: string;
  serviceName: string;
  servicePort: string;
  tls: boolean;
  certSecret: string;
}

interface ConfigMapConfig {
  name: string;
  namespace: string;
  data: KV[];
}

interface SecretConfig {
  name: string;
  namespace: string;
  secretType: 'Opaque' | 'kubernetes.io/dockerconfigjson';
  data: KV[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _id = 0;
function uid() { return String(++_id); }

function kv(key = '', value = ''): KV { return { id: uid(), key, value }; }

function toBase64(s: string): string {
  try { return btoa(s); } catch { return btoa(encodeURIComponent(s)); }
}

// ── YAML Builders ─────────────────────────────────────────────────────────────

function buildDeployment(c: DeploymentConfig): string {
  const labels = c.labels.filter(l => l.key.trim());
  const labelBlock = labels.length
    ? labels.map(l => `      ${l.key}: "${l.value}"`).join('\n')
    : '      app: ' + (c.name || 'my-app');
  const selectorLabels = labels.length
    ? labels.map(l => `      ${l.key}: "${l.value}"`).join('\n')
    : '      app: ' + (c.name || 'my-app');

  const envBlock = c.envVars.filter(e => e.key.trim()).length
    ? '\n        env:\n' + c.envVars.filter(e => e.key.trim()).map(e =>
        `          - name: ${e.key}\n            value: "${e.value}"`
      ).join('\n')
    : '';

  const hasResources = c.cpuRequest || c.memRequest || c.cpuLimit || c.memLimit;
  let resourcesBlock = '';
  if (hasResources) {
    const reqs = [];
    const lims = [];
    if (c.cpuRequest) reqs.push(`            cpu: "${c.cpuRequest}"`);
    if (c.memRequest) reqs.push(`            memory: "${c.memRequest}"`);
    if (c.cpuLimit) lims.push(`            cpu: "${c.cpuLimit}"`);
    if (c.memLimit) lims.push(`            memory: "${c.memLimit}"`);
    resourcesBlock = '\n        resources:';
    if (reqs.length) resourcesBlock += '\n          requests:\n' + reqs.join('\n');
    if (lims.length) resourcesBlock += '\n          limits:\n' + lims.join('\n');
  }

  return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${c.name || 'my-deployment'}
  namespace: ${c.namespace || 'default'}
  labels:
${labelBlock}
spec:
  replicas: ${parseInt(c.replicas) || 1}
  selector:
    matchLabels:
${selectorLabels}
  template:
    metadata:
      labels:
${labelBlock}
    spec:
      containers:
        - name: ${c.name || 'app'}
          image: ${c.image || 'nginx'}:${c.tag || 'latest'}
          imagePullPolicy: ${c.imagePullPolicy}
          ports:
            - containerPort: ${parseInt(c.containerPort) || 80}
              protocol: TCP${envBlock}${resourcesBlock}`;
}

function buildService(c: ServiceConfig): string {
  const selectorLines = c.selectors.filter(s => s.key.trim()).length
    ? c.selectors.filter(s => s.key.trim()).map(s => `    ${s.key}: "${s.value}"`).join('\n')
    : '    app: my-app';

  const nodePortLine = c.type === 'NodePort'
    ? `\n      nodePort: ${parseInt(c.targetPort) >= 30000 ? c.targetPort : '30080'}`
    : '';

  return `apiVersion: v1
kind: Service
metadata:
  name: ${c.name || 'my-service'}
  namespace: ${c.namespace || 'default'}
spec:
  type: ${c.type}
  selector:
${selectorLines}
  ports:
    - protocol: TCP
      port: ${parseInt(c.port) || 80}
      targetPort: ${parseInt(c.targetPort) || 8080}${nodePortLine}`;
}

function buildIngress(c: IngressConfig): string {
  const tlsBlock = c.tls ? `
  tls:
    - hosts:
        - ${c.host || 'example.com'}
      secretName: ${c.certSecret || 'tls-secret'}` : '';

  return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${c.name || 'my-ingress'}
  namespace: ${c.namespace || 'default'}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:${tlsBlock}
  rules:
    - host: ${c.host || 'example.com'}
      http:
        paths:
          - path: ${c.path || '/'}
            pathType: Prefix
            backend:
              service:
                name: ${c.serviceName || 'my-service'}
                port:
                  number: ${parseInt(c.servicePort) || 80}`;
}

function buildConfigMap(c: ConfigMapConfig): string {
  const dataLines = c.data.filter(d => d.key.trim()).length
    ? c.data.filter(d => d.key.trim()).map(d => `  ${d.key}: "${d.value}"`).join('\n')
    : '  KEY: value';

  return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${c.name || 'my-configmap'}
  namespace: ${c.namespace || 'default'}
data:
${dataLines}`;
}

function buildSecret(c: SecretConfig): string {
  const dataLines = c.data.filter(d => d.key.trim()).length
    ? c.data.filter(d => d.key.trim()).map(d => `  ${d.key}: ${toBase64(d.value)}`).join('\n')
    : '  KEY: dmFsdWU=';

  return `apiVersion: v1
kind: Secret
metadata:
  name: ${c.name || 'my-secret'}
  namespace: ${c.namespace || 'default'}
type: ${c.secretType}
data:
${dataLines}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KVEditor({ label, pairs, onChange, keyPlaceholder = 'key', valuePlaceholder = 'value' }: {
  label: string;
  pairs: KV[];
  onChange: (next: KV[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  function update(id: string, field: 'key' | 'value', val: string) {
    onChange(pairs.map(p => p.id === id ? { ...p, [field]: val } : p));
  }
  function remove(id: string) { onChange(pairs.filter(p => p.id !== id)); }
  function add() { onChange([...pairs, kv()]); }

  return (
    <div>
      <label class="block text-xs text-text-muted mb-1.5">{label}</label>
      <div class="space-y-2">
        {pairs.map(p => (
          <div key={p.id} class="flex gap-2 items-center">
            <input
              type="text"
              value={p.key}
              onInput={e => update(p.id, 'key', (e.target as HTMLInputElement).value)}
              placeholder={keyPlaceholder}
              class="flex-1 bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
            />
            <span class="text-text-muted text-xs">=</span>
            <input
              type="text"
              value={p.value}
              onInput={e => update(p.id, 'value', (e.target as HTMLInputElement).value)}
              placeholder={valuePlaceholder}
              class="flex-1 bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-text focus:outline-none focus:border-primary"
            />
            <button
              onClick={() => remove(p.id)}
              class="text-xs text-red-400 hover:text-red-300 shrink-0 px-1"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={add}
        class="mt-2 text-xs text-text-muted hover:text-primary transition-colors"
      >
        + Add row
      </button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false, error = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <div>
      <label class="block text-xs text-text-muted mb-1.5">
        {label}{required && <span class="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onInput={e => onChange((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        class={`w-full bg-bg-card border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors ${
          error ? 'border-red-400' : 'border-border'
        }`}
      />
      {error && <p class="text-xs text-red-400 mt-1">This field is required</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label class="block text-xs text-text-muted mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange((e.target as HTMLSelectElement).value)}
        class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Tab Panels ────────────────────────────────────────────────────────────────

function DeploymentPanel({ config, onChange }: { config: DeploymentConfig; onChange: (c: DeploymentConfig) => void }) {
  const set = (patch: Partial<DeploymentConfig>) => onChange({ ...config, ...patch });
  const [showValidation, setShowValidation] = useState(false);
  const nameError = showValidation && !config.name.trim();
  const imageError = showValidation && !config.image.trim();

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <Field label="Name" value={config.name} onChange={v => set({ name: v })} placeholder="my-app" required error={nameError} />
        <Field label="Namespace" value={config.namespace} onChange={v => set({ namespace: v })} placeholder="default" />
      </div>
      <div class="grid grid-cols-3 gap-3">
        <Field label="Replicas" value={config.replicas} onChange={v => set({ replicas: v })} placeholder="1" type="number" />
        <Field label="Image" value={config.image} onChange={v => set({ image: v })} placeholder="nginx" required error={imageError} />
        <Field label="Tag" value={config.tag} onChange={v => set({ tag: v })} placeholder="latest" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <Field label="Container Port" value={config.containerPort} onChange={v => set({ containerPort: v })} placeholder="8080" type="number" />
        <SelectField
          label="Image Pull Policy"
          value={config.imagePullPolicy}
          onChange={v => set({ imagePullPolicy: v as DeploymentConfig['imagePullPolicy'] })}
          options={[
            { value: 'Always', label: 'Always' },
            { value: 'IfNotPresent', label: 'IfNotPresent' },
            { value: 'Never', label: 'Never' },
          ]}
        />
      </div>
      <div>
        <label class="block text-xs text-text-muted mb-2">Resource Requests</label>
        <div class="grid grid-cols-2 gap-3">
          <Field label="CPU Request" value={config.cpuRequest} onChange={v => set({ cpuRequest: v })} placeholder="100m" />
          <Field label="Memory Request" value={config.memRequest} onChange={v => set({ memRequest: v })} placeholder="128Mi" />
        </div>
      </div>
      <div>
        <label class="block text-xs text-text-muted mb-2">Resource Limits</label>
        <div class="grid grid-cols-2 gap-3">
          <Field label="CPU Limit" value={config.cpuLimit} onChange={v => set({ cpuLimit: v })} placeholder="500m" />
          <Field label="Memory Limit" value={config.memLimit} onChange={v => set({ memLimit: v })} placeholder="512Mi" />
        </div>
      </div>
      <KVEditor label="Environment Variables" pairs={config.envVars} onChange={v => set({ envVars: v })} keyPlaceholder="ENV_VAR" valuePlaceholder="value" />
      <KVEditor label="Labels" pairs={config.labels} onChange={v => set({ labels: v })} keyPlaceholder="app" valuePlaceholder="my-app" />
    </div>
  );
}

function ServicePanel({ config, onChange }: { config: ServiceConfig; onChange: (c: ServiceConfig) => void }) {
  const set = (patch: Partial<ServiceConfig>) => onChange({ ...config, ...patch });
  return (
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <Field label="Name" value={config.name} onChange={v => set({ name: v })} placeholder="my-service" required />
        <Field label="Namespace" value={config.namespace} onChange={v => set({ namespace: v })} placeholder="default" />
      </div>
      <div class="grid grid-cols-3 gap-3">
        <SelectField
          label="Type"
          value={config.type}
          onChange={v => set({ type: v as ServiceConfig['type'] })}
          options={[
            { value: 'ClusterIP', label: 'ClusterIP' },
            { value: 'NodePort', label: 'NodePort' },
            { value: 'LoadBalancer', label: 'LoadBalancer' },
          ]}
        />
        <Field label="Port" value={config.port} onChange={v => set({ port: v })} placeholder="80" type="number" />
        <Field label="Target Port" value={config.targetPort} onChange={v => set({ targetPort: v })} placeholder="8080" type="number" />
      </div>
      <KVEditor label="Selector Labels" pairs={config.selectors} onChange={v => set({ selectors: v })} keyPlaceholder="app" valuePlaceholder="my-app" />
    </div>
  );
}

function IngressPanel({ config, onChange }: { config: IngressConfig; onChange: (c: IngressConfig) => void }) {
  const set = (patch: Partial<IngressConfig>) => onChange({ ...config, ...patch });
  return (
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <Field label="Name" value={config.name} onChange={v => set({ name: v })} placeholder="my-ingress" required />
        <Field label="Namespace" value={config.namespace} onChange={v => set({ namespace: v })} placeholder="default" />
      </div>
      <Field label="Host" value={config.host} onChange={v => set({ host: v })} placeholder="app.example.com" required />
      <div class="grid grid-cols-2 gap-3">
        <Field label="Path" value={config.path} onChange={v => set({ path: v })} placeholder="/" />
        <Field label="Service Name" value={config.serviceName} onChange={v => set({ serviceName: v })} placeholder="my-service" required />
      </div>
      <Field label="Service Port" value={config.servicePort} onChange={v => set({ servicePort: v })} placeholder="80" type="number" />
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => set({ tls: !config.tls })}
            class={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${config.tls ? 'bg-primary' : 'bg-border'}`}
          >
            <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.tls ? 'translate-x-5' : ''}`} />
          </div>
          <span class="text-sm text-text">Enable TLS</span>
        </label>
      </div>
      {config.tls && (
        <Field label="TLS Certificate Secret Name" value={config.certSecret} onChange={v => set({ certSecret: v })} placeholder="tls-secret" />
      )}
    </div>
  );
}

function ConfigMapPanel({ config, onChange }: { config: ConfigMapConfig; onChange: (c: ConfigMapConfig) => void }) {
  const set = (patch: Partial<ConfigMapConfig>) => onChange({ ...config, ...patch });
  return (
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <Field label="Name" value={config.name} onChange={v => set({ name: v })} placeholder="my-configmap" required />
        <Field label="Namespace" value={config.namespace} onChange={v => set({ namespace: v })} placeholder="default" />
      </div>
      <KVEditor label="Data" pairs={config.data} onChange={v => set({ data: v })} keyPlaceholder="KEY" valuePlaceholder="value" />
    </div>
  );
}

function SecretPanel({ config, onChange }: { config: SecretConfig; onChange: (c: SecretConfig) => void }) {
  const set = (patch: Partial<SecretConfig>) => onChange({ ...config, ...patch });
  return (
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <Field label="Name" value={config.name} onChange={v => set({ name: v })} placeholder="my-secret" required />
        <Field label="Namespace" value={config.namespace} onChange={v => set({ namespace: v })} placeholder="default" />
      </div>
      <SelectField
        label="Type"
        value={config.secretType}
        onChange={v => set({ secretType: v as SecretConfig['secretType'] })}
        options={[
          { value: 'Opaque', label: 'Opaque (generic)' },
          { value: 'kubernetes.io/dockerconfigjson', label: 'kubernetes.io/dockerconfigjson' },
        ]}
      />
      <KVEditor
        label="Data (values will be base64-encoded)"
        pairs={config.data}
        onChange={v => set({ data: v })}
        keyPlaceholder="KEY"
        valuePlaceholder="plain text value"
      />
      {config.data.some(d => d.key.trim() && d.value) && (
        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400">
          Values are automatically base64-encoded in the generated YAML.
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const TABS: ResourceType[] = ['Deployment', 'Service', 'Ingress', 'ConfigMap', 'Secret'];

const DEFAULT_DEPLOYMENT: DeploymentConfig = {
  name: 'my-app',
  namespace: 'default',
  replicas: '2',
  image: 'nginx',
  tag: 'latest',
  containerPort: '80',
  cpuRequest: '100m',
  memRequest: '128Mi',
  cpuLimit: '500m',
  memLimit: '512Mi',
  imagePullPolicy: 'IfNotPresent',
  envVars: [kv('NODE_ENV', 'production')],
  labels: [kv('app', 'my-app'), kv('version', 'v1')],
};

const DEFAULT_SERVICE: ServiceConfig = {
  name: 'my-service',
  namespace: 'default',
  type: 'ClusterIP',
  port: '80',
  targetPort: '8080',
  selectors: [kv('app', 'my-app')],
};

const DEFAULT_INGRESS: IngressConfig = {
  name: 'my-ingress',
  namespace: 'default',
  host: 'app.example.com',
  path: '/',
  serviceName: 'my-service',
  servicePort: '80',
  tls: false,
  certSecret: 'tls-secret',
};

const DEFAULT_CONFIGMAP: ConfigMapConfig = {
  name: 'my-configmap',
  namespace: 'default',
  data: [kv('DATABASE_URL', 'postgres://localhost:5432/mydb'), kv('LOG_LEVEL', 'info')],
};

const DEFAULT_SECRET: SecretConfig = {
  name: 'my-secret',
  namespace: 'default',
  secretType: 'Opaque',
  data: [kv('DB_PASSWORD', 'supersecret')],
};

export default function K8sManifestGenerator() {
  const [activeTab, setActiveTab] = useState<ResourceType>('Deployment');
  const [deployment, setDeployment] = useState<DeploymentConfig>(DEFAULT_DEPLOYMENT);
  const [service, setService] = useState<ServiceConfig>(DEFAULT_SERVICE);
  const [ingress, setIngress] = useState<IngressConfig>(DEFAULT_INGRESS);
  const [configMap, setConfigMap] = useState<ConfigMapConfig>(DEFAULT_CONFIGMAP);
  const [secret, setSecret] = useState<SecretConfig>(DEFAULT_SECRET);
  const [copied, setCopied] = useState(false);

  const yaml = (() => {
    switch (activeTab) {
      case 'Deployment': return buildDeployment(deployment);
      case 'Service':    return buildService(service);
      case 'Ingress':    return buildIngress(ingress);
      case 'ConfigMap':  return buildConfigMap(configMap);
      case 'Secret':     return buildSecret(secret);
    }
  })();

  async function copyYaml() {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadYaml() {
    const blob = new Blob([yaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab.toLowerCase()}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div class="space-y-5">
      {/* Tabs */}
      <div class="flex flex-wrap gap-1 border-b border-border pb-0">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            class={`px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors -mb-px ${
              activeTab === tab
                ? 'bg-bg-card border-border text-primary'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Config form */}
        <div class="border border-border rounded-xl overflow-hidden">
          <div class="px-4 py-3 bg-bg-card border-b border-border">
            <span class="text-sm font-semibold text-text">{activeTab} Configuration</span>
          </div>
          <div class="p-4">
            {activeTab === 'Deployment' && <DeploymentPanel config={deployment} onChange={setDeployment} />}
            {activeTab === 'Service'    && <ServicePanel    config={service}    onChange={setService} />}
            {activeTab === 'Ingress'    && <IngressPanel    config={ingress}    onChange={setIngress} />}
            {activeTab === 'ConfigMap'  && <ConfigMapPanel  config={configMap}  onChange={setConfigMap} />}
            {activeTab === 'Secret'     && <SecretPanel     config={secret}     onChange={setSecret} />}
          </div>
        </div>

        {/* Right: YAML output */}
        <div class="border border-border rounded-xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border shrink-0">
            <span class="text-sm font-semibold text-text">Generated YAML</span>
            <div class="flex gap-2">
              <button
                onClick={downloadYaml}
                class="px-3 py-1 text-xs rounded-lg bg-bg border border-border text-text-muted hover:text-text hover:border-primary/40 transition-colors"
              >
                Download .yaml
              </button>
              <button
                onClick={copyYaml}
                class="px-3 py-1 text-xs rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy YAML'}
              </button>
            </div>
          </div>
          <pre class="p-4 text-xs font-mono text-text bg-bg-card overflow-x-auto whitespace-pre flex-1 min-h-[320px]">{yaml}</pre>
        </div>
      </div>

      {/* Validation hints */}
      <div class="bg-bg-card border border-border rounded-xl px-4 py-3 text-xs text-text-muted space-y-1">
        <p class="font-semibold text-text mb-1.5">Quick tips</p>
        <p>• Use <code class="bg-primary/10 text-primary px-1 rounded">kubectl apply -f manifest.yaml</code> to apply this manifest to your cluster.</p>
        <p>• CPU values use millicores (e.g. <code class="bg-primary/10 text-primary px-1 rounded">500m</code> = 0.5 CPU). Memory uses Mi/Gi suffixes.</p>
        {activeTab === 'Secret' && (
          <p class="text-yellow-400">• Secret values are stored base64-encoded in etcd. Use RBAC and encryption at rest for real secrets.</p>
        )}
        {activeTab === 'Ingress' && (
          <p>• Ingress requires an Ingress Controller (e.g. nginx-ingress or Traefik) deployed in your cluster.</p>
        )}
      </div>
    </div>
  );
}
