import { useState } from 'preact/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────

type Controller = 'nginx' | 'traefik' | 'istio';
type PathType = 'Prefix' | 'Exact' | 'ImplementationSpecific';

interface PathRule {
  id: string;
  path: string;
  pathType: PathType;
  serviceName: string;
  servicePort: string;
}

interface HostRule {
  id: string;
  host: string;
  paths: PathRule[];
}

interface TlsEntry {
  id: string;
  secretName: string;
  hosts: string;
}

interface Annotation {
  id: string;
  key: string;
  value: string;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => `${++_id}`;

function defaultPath(): PathRule {
  return { id: uid(), path: '/', pathType: 'Prefix', serviceName: 'my-service', servicePort: '80' };
}

function defaultHost(): HostRule {
  return { id: uid(), host: 'example.com', paths: [defaultPath()] };
}

function defaultTls(): TlsEntry {
  return { id: uid(), secretName: 'example-tls', hosts: 'example.com' };
}

const CONTROLLER_ANNOTATIONS: Record<Controller, Annotation[]> = {
  nginx: [
    { id: uid(), key: 'kubernetes.io/ingress.class', value: 'nginx' },
    { id: uid(), key: 'nginx.ingress.kubernetes.io/rewrite-target', value: '/' },
    { id: uid(), key: 'nginx.ingress.kubernetes.io/ssl-redirect', value: 'true' },
  ],
  traefik: [
    { id: uid(), key: 'kubernetes.io/ingress.class', value: 'traefik' },
    { id: uid(), key: 'traefik.ingress.kubernetes.io/router.entrypoints', value: 'websecure' },
    { id: uid(), key: 'traefik.ingress.kubernetes.io/router.tls', value: 'true' },
  ],
  istio: [
    { id: uid(), key: 'kubernetes.io/ingress.class', value: 'istio' },
    { id: uid(), key: 'kubernetes.io/ingress.allow-http', value: 'false' },
  ],
};

// ── YAML Builder ──────────────────────────────────────────────────────────────

function buildYaml(
  name: string,
  namespace: string,
  controller: Controller,
  rules: HostRule[],
  tlsEnabled: boolean,
  tlsEntries: TlsEntry[],
  annotations: Annotation[],
): string {
  const lines: string[] = [];

  lines.push(`apiVersion: networking.k8s.io/v1`);
  lines.push(`kind: Ingress`);
  lines.push(`metadata:`);
  lines.push(`  name: ${name || 'my-ingress'}`);
  lines.push(`  namespace: ${namespace || 'default'}`);

  if (annotations.filter(a => a.key.trim()).length > 0) {
    lines.push(`  annotations:`);
    for (const a of annotations) {
      if (a.key.trim()) lines.push(`    ${a.key}: "${a.value}"`);
    }
  }

  lines.push(`spec:`);

  if (controller === 'nginx' || controller === 'traefik') {
    lines.push(`  ingressClassName: ${controller}`);
  } else if (controller === 'istio') {
    lines.push(`  ingressClassName: istio`);
  }

  if (tlsEnabled && tlsEntries.filter(t => t.secretName.trim()).length > 0) {
    lines.push(`  tls:`);
    for (const t of tlsEntries) {
      if (!t.secretName.trim()) continue;
      const hosts = t.hosts.split(',').map(h => h.trim()).filter(Boolean);
      if (hosts.length > 0) {
        lines.push(`  - hosts:`);
        for (const h of hosts) lines.push(`    - ${h}`);
        lines.push(`    secretName: ${t.secretName}`);
      } else {
        lines.push(`  - secretName: ${t.secretName}`);
      }
    }
  }

  if (rules.filter(r => r.host.trim()).length > 0) {
    lines.push(`  rules:`);
    for (const rule of rules) {
      if (!rule.host.trim()) continue;
      lines.push(`  - host: ${rule.host}`);
      lines.push(`    http:`);
      lines.push(`      paths:`);
      for (const p of rule.paths) {
        lines.push(`      - path: ${p.path || '/'}`);
        lines.push(`        pathType: ${p.pathType}`);
        lines.push(`        backend:`);
        lines.push(`          service:`);
        lines.push(`            name: ${p.serviceName || 'my-service'}`);
        lines.push(`            port:`);
        lines.push(`              number: ${parseInt(p.servicePort) || 80}`);
      }
    }
  }

  return lines.join('\n');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Input({ label, value, onInput, placeholder, mono }: {
  label: string; value: string; onInput: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label class="block text-xs text-text-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onInput={e => onInput((e.target as HTMLInputElement).value)}
        placeholder={placeholder}
        class={`w-full bg-bg border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  return (
    <div>
      <label class="block text-xs text-text-muted mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange((e.target as HTMLSelectElement).value as T)}
        class="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function K8sIngressBuilder() {
  const [name, setName] = useState('my-ingress');
  const [namespace, setNamespace] = useState('default');
  const [controller, setController] = useState<Controller>('nginx');
  const [rules, setRules] = useState<HostRule[]>([defaultHost()]);
  const [tlsEnabled, setTlsEnabled] = useState(false);
  const [tlsEntries, setTlsEntries] = useState<TlsEntry[]>([defaultTls()]);
  const [annotations, setAnnotations] = useState<Annotation[]>(CONTROLLER_ANNOTATIONS.nginx.map(a => ({ ...a })));
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'builder' | 'annotations'>('builder');

  const yaml = buildYaml(name, namespace, controller, rules, tlsEnabled, tlsEntries, annotations);

  const onControllerChange = (c: Controller) => {
    setController(c);
    setAnnotations(CONTROLLER_ANNOTATIONS[c].map(a => ({ ...a, id: uid() })));
  };

  // Host rule helpers
  const updateHost = (id: string, host: string) =>
    setRules(rs => rs.map(r => r.id === id ? { ...r, host } : r));
  const addHost = () => setRules(rs => [...rs, defaultHost()]);
  const removeHost = (id: string) => setRules(rs => rs.filter(r => r.id !== id));

  // Path helpers
  const addPath = (hostId: string) =>
    setRules(rs => rs.map(r => r.id === hostId ? { ...r, paths: [...r.paths, defaultPath()] } : r));
  const removePath = (hostId: string, pathId: string) =>
    setRules(rs => rs.map(r => r.id === hostId ? { ...r, paths: r.paths.filter(p => p.id !== pathId) } : r));
  const updatePath = (hostId: string, pathId: string, field: keyof PathRule, value: string) =>
    setRules(rs => rs.map(r => r.id === hostId
      ? { ...r, paths: r.paths.map(p => p.id === pathId ? { ...p, [field]: value } : p) }
      : r
    ));

  // TLS helpers
  const addTls = () => setTlsEntries(ts => [...ts, defaultTls()]);
  const removeTls = (id: string) => setTlsEntries(ts => ts.filter(t => t.id !== id));
  const updateTls = (id: string, field: keyof TlsEntry, value: string) =>
    setTlsEntries(ts => ts.map(t => t.id === id ? { ...t, [field]: value } : t));

  // Annotation helpers
  const addAnnotation = () => setAnnotations(as => [...as, { id: uid(), key: '', value: '' }]);
  const removeAnnotation = (id: string) => setAnnotations(as => as.filter(a => a.id !== id));
  const updateAnnotation = (id: string, field: 'key' | 'value', value: string) =>
    setAnnotations(as => as.map(a => a.id === id ? { ...a, [field]: value } : a));

  const copy = () => navigator.clipboard.writeText(yaml).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  });

  return (
    <div class="space-y-6">
      {/* Basic config */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Ingress Name" value={name} onInput={setName} placeholder="my-ingress" mono />
        <Input label="Namespace" value={namespace} onInput={setNamespace} placeholder="default" mono />
        <Select<Controller>
          label="Ingress Controller"
          value={controller}
          options={[
            { value: 'nginx', label: 'NGINX Ingress' },
            { value: 'traefik', label: 'Traefik' },
            { value: 'istio', label: 'Istio' },
          ]}
          onChange={onControllerChange}
        />
      </div>

      {/* Tabs */}
      <div class="border-b border-border">
        <div class="flex gap-0">
          {(['builder', 'annotations'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab === 'builder' ? 'Rules & TLS' : `Annotations (${annotations.filter(a => a.key).length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'builder' && (
        <div class="space-y-6">
          {/* Host Rules */}
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-text">Host Rules</h3>
              <button onClick={addHost} class="text-xs text-primary hover:underline">+ Add Host</button>
            </div>

            {rules.map((rule, hi) => (
              <div key={rule.id} class="border border-border rounded-lg p-4 space-y-4 bg-bg-card">
                <div class="flex items-center gap-3">
                  <div class="flex-1">
                    <Input
                      label={`Host ${hi + 1}`}
                      value={rule.host}
                      onInput={v => updateHost(rule.id, v)}
                      placeholder="example.com"
                      mono
                    />
                  </div>
                  {rules.length > 1 && (
                    <button
                      onClick={() => removeHost(rule.id)}
                      class="mt-5 text-xs text-red-400 hover:text-red-500 shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {/* Paths for this host */}
                <div class="space-y-3">
                  {rule.paths.map((p, pi) => (
                    <div key={p.id} class="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-4 border-l-2 border-border">
                      <Input
                        label={`Path ${pi + 1}`}
                        value={p.path}
                        onInput={v => updatePath(rule.id, p.id, 'path', v)}
                        placeholder="/"
                        mono
                      />
                      <Select<PathType>
                        label="Path Type"
                        value={p.pathType}
                        options={[
                          { value: 'Prefix', label: 'Prefix' },
                          { value: 'Exact', label: 'Exact' },
                          { value: 'ImplementationSpecific', label: 'ImplementationSpecific' },
                        ]}
                        onChange={v => updatePath(rule.id, p.id, 'pathType', v)}
                      />
                      <Input
                        label="Service Name"
                        value={p.serviceName}
                        onInput={v => updatePath(rule.id, p.id, 'serviceName', v)}
                        placeholder="my-service"
                        mono
                      />
                      <div class="flex items-end gap-2">
                        <div class="flex-1">
                          <Input
                            label="Port"
                            value={p.servicePort}
                            onInput={v => updatePath(rule.id, p.id, 'servicePort', v)}
                            placeholder="80"
                            mono
                          />
                        </div>
                        {rule.paths.length > 1 && (
                          <button
                            onClick={() => removePath(rule.id, p.id)}
                            class="pb-1.5 text-xs text-red-400 hover:text-red-500 shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => addPath(rule.id)}
                    class="text-xs text-text-muted hover:text-primary pl-4"
                  >
                    + Add Path
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* TLS */}
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tlsEnabled}
                  onChange={e => setTlsEnabled((e.target as HTMLInputElement).checked)}
                  class="w-4 h-4 accent-primary"
                />
                <span class="text-sm font-semibold text-text">Enable TLS</span>
              </label>
            </div>

            {tlsEnabled && (
              <div class="space-y-3 pl-4 border-l-2 border-primary/40">
                {tlsEntries.map((t, ti) => (
                  <div key={t.id} class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <Input
                      label={`TLS Secret ${ti + 1}`}
                      value={t.secretName}
                      onInput={v => updateTls(t.id, 'secretName', v)}
                      placeholder="my-tls-secret"
                      mono
                    />
                    <div class="flex items-end gap-2">
                      <div class="flex-1">
                        <Input
                          label="Hosts (comma-separated)"
                          value={t.hosts}
                          onInput={v => updateTls(t.id, 'hosts', v)}
                          placeholder="example.com, www.example.com"
                          mono
                        />
                      </div>
                      {tlsEntries.length > 1 && (
                        <button onClick={() => removeTls(t.id)} class="pb-1.5 text-xs text-red-400 hover:text-red-500">✕</button>
                      )}
                    </div>
                  </div>
                ))}
                <button onClick={addTls} class="text-xs text-primary hover:underline">+ Add TLS Entry</button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'annotations' && (
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <p class="text-sm text-text-muted">
              Pre-filled for <span class="font-medium text-text capitalize">{controller}</span>. Edit or add custom annotations.
            </p>
            <button onClick={addAnnotation} class="text-xs text-primary hover:underline">+ Add</button>
          </div>
          {annotations.map(a => (
            <div key={a.id} class="flex items-center gap-2">
              <input
                type="text"
                value={a.key}
                onInput={e => updateAnnotation(a.id, 'key', (e.target as HTMLInputElement).value)}
                placeholder="annotation-key"
                class="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <span class="text-text-muted text-sm">:</span>
              <input
                type="text"
                value={a.value}
                onInput={e => updateAnnotation(a.id, 'value', (e.target as HTMLInputElement).value)}
                placeholder="value"
                class="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <button onClick={() => removeAnnotation(a.id)} class="text-red-400 hover:text-red-500 text-sm px-1">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* YAML Output */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text">Generated YAML</h3>
          <button
            onClick={copy}
            class="text-xs bg-bg border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy YAML'}
          </button>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-sm font-mono overflow-x-auto text-text whitespace-pre leading-relaxed max-h-96 overflow-y-auto">
          {yaml}
        </pre>
      </div>

      {/* Quick tips */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-text-muted">
        <div class="bg-bg-card border border-border rounded-lg p-3">
          <p class="font-medium text-text mb-1">NGINX</p>
          <p>Use <code class="font-mono">rewrite-target</code> for path stripping. Enable SSL redirect with <code class="font-mono">ssl-redirect: "true"</code>.</p>
        </div>
        <div class="bg-bg-card border border-border rounded-lg p-3">
          <p class="font-medium text-text mb-1">Traefik</p>
          <p>Set entrypoints to <code class="font-mono">websecure</code> for HTTPS. Use <code class="font-mono">router.tls: "true"</code> to enable TLS termination.</p>
        </div>
        <div class="bg-bg-card border border-border rounded-lg p-3">
          <p class="font-medium text-text mb-1">Istio</p>
          <p>Prefer <code class="font-mono">Gateway</code> + <code class="font-mono">VirtualService</code> for full Istio features. Ingress mode is basic.</p>
        </div>
      </div>
    </div>
  );
}
