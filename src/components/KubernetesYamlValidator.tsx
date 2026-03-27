import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
};

const SAMPLE_K8S = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
  labels:
    app: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: nginx:latest
          ports:
            - containerPort: 80
          env:
            - name: DB_PASSWORD
              value: "hardcoded-secret"
`;

function validateK8sYaml(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = yaml.split('\n');

  if (!yaml.trim()) {
    issues.push({ level: 'error', message: 'Empty input. Paste a Kubernetes YAML manifest to validate.' });
    return issues;
  }

  // Tab check
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Tab character on line ${idx + 1}. YAML requires spaces only.`, line: idx + 1 });
    }
  });

  // Required top-level fields
  const hasApiVersion = lines.some(l => l.match(/^apiVersion\s*:/));
  const hasKind = lines.some(l => l.match(/^kind\s*:/));
  const hasMetadata = lines.some(l => l.match(/^metadata\s*:/));
  const hasSpec = lines.some(l => l.match(/^spec\s*:/));

  if (!hasApiVersion) issues.push({ level: 'error', message: 'Missing required field "apiVersion" (e.g. apps/v1, v1, batch/v1).' });
  if (!hasKind) issues.push({ level: 'error', message: 'Missing required field "kind" (e.g. Deployment, Service, ConfigMap).' });
  if (!hasMetadata) issues.push({ level: 'error', message: 'Missing required field "metadata".' });
  if (!hasSpec) issues.push({ level: 'warning', message: 'No "spec" block found. Most resource types require a spec.' });

  // Get kind value
  const kindLine = lines.find(l => l.match(/^kind\s*:/));
  const kind = kindLine?.match(/^kind\s*:\s*(\S+)/)?.[1] ?? '';

  // apiVersion format check
  const apiVersionLine = lines.find(l => l.match(/^apiVersion\s*:/));
  const apiVersion = apiVersionLine?.match(/^apiVersion\s*:\s*(\S+)/)?.[1] ?? '';
  if (apiVersion && !apiVersion.match(/^[a-zA-Z0-9./\-]+$/)) {
    issues.push({ level: 'error', message: `Invalid apiVersion format: "${apiVersion}".` });
  }

  // Latest image tag
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('image:')) {
      const img = trimmed.replace('image:', '').trim().replace(/['"]/g, '');
      if (img.endsWith(':latest') || (!img.includes(':') && !img.startsWith('$(') )) {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: image "${img}" uses :latest or no tag. Pin a specific version for reproducible deployments.`, line: idx + 1 });
      }
    }
  });

  // Resource limits/requests for Deployments and Pods
  if (kind === 'Deployment' || kind === 'Pod' || kind === 'StatefulSet' || kind === 'DaemonSet') {
    const hasResources = yaml.includes('resources:');
    if (!hasResources) {
      issues.push({ level: 'warning', message: 'No "resources" block found. Set CPU/memory requests and limits to prevent resource starvation and OOMKills.' });
    } else {
      const hasLimits = yaml.includes('limits:');
      const hasRequests = yaml.includes('requests:');
      if (!hasLimits) issues.push({ level: 'warning', message: '"resources" block found but no "limits" defined. Add CPU and memory limits.' });
      if (!hasRequests) issues.push({ level: 'warning', message: '"resources" block found but no "requests" defined. Add CPU and memory requests for the scheduler.' });
    }
  }

  // Liveness/readiness probes
  if (kind === 'Deployment' || kind === 'Pod' || kind === 'StatefulSet') {
    const hasLiveness = yaml.includes('livenessProbe:');
    const hasReadiness = yaml.includes('readinessProbe:');
    if (!hasLiveness) issues.push({ level: 'info', message: 'No livenessProbe defined. Consider adding one so Kubernetes can restart unhealthy containers.' });
    if (!hasReadiness) issues.push({ level: 'info', message: 'No readinessProbe defined. Consider adding one so traffic is only routed to ready containers.' });
  }

  // Hardcoded secrets in env
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('value:') || trimmed.match(/value\s*:/)) {
      const ctx = lines.slice(Math.max(0, idx - 3), idx).join(' ').toLowerCase();
      if (ctx.includes('password') || ctx.includes('secret') || ctx.includes('token') || ctx.includes('api_key') || ctx.includes('key')) {
        const val = trimmed.replace(/^value\s*:\s*/, '').trim().replace(/['"]/g, '');
        if (val && val !== '' && !val.startsWith('$(') && !val.startsWith('{{')) {
          issues.push({ level: 'warning', message: `Line ${idx + 1}: Possible hardcoded secret. Use a Secret reference (valueFrom.secretKeyRef) instead.`, line: idx + 1 });
        }
      }
    }
  });

  // Service type
  if (kind === 'Service') {
    const hasType = yaml.includes('type:');
    if (!hasType) issues.push({ level: 'info', message: 'No Service type specified. Defaults to ClusterIP (internal only). Use LoadBalancer or Ingress for external traffic.' });
    if (yaml.includes('type: NodePort')) {
      issues.push({ level: 'info', message: 'NodePort exposes a random port on all nodes. Prefer LoadBalancer or Ingress for production external access.' });
    }
  }

  // namespace
  const hasNamespace = lines.some(l => l.trim().match(/^namespace\s*:/));
  if (!hasNamespace && kind && kind !== 'Namespace' && kind !== 'ClusterRole' && kind !== 'ClusterRoleBinding') {
    issues.push({ level: 'info', message: 'No namespace specified in metadata. Will deploy to the "default" namespace. Explicitly set a namespace for production workloads.' });
  }

  // replicas = 1
  const replicaLine = lines.find(l => l.trim().match(/^replicas\s*:\s*1$/));
  if (replicaLine) {
    issues.push({ level: 'info', message: '"replicas: 1" has no redundancy. Consider 2+ replicas for production availability.' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'No issues detected. Your Kubernetes YAML looks valid!' });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400' },
};

export default function KubernetesYamlValidator() {
  const [input, setInput] = useState(SAMPLE_K8S);
  const [issues, setIssues] = useState<ValidationIssue[]>(() => validateK8sYaml(SAMPLE_K8S));
  const [validated, setValidated] = useState(true);

  const handleValidate = () => {
    setIssues(validateK8sYaml(input));
    setValidated(true);
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Kubernetes YAML manifest</label>
          <div class="flex gap-2">
            <button onClick={() => { setInput(SAMPLE_K8S); setIssues(validateK8sYaml(SAMPLE_K8S)); setValidated(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setIssues([]); setValidated(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setValidated(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your Kubernetes YAML manifest here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Validate
      </button>

      {validated && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {errors.length === 0 && warnings.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!validated && input.trim() && (
        <p class="text-xs text-text-muted text-center">Click Validate to check your manifest</p>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Required fields: apiVersion, kind, metadata</li>
          <li>Image tag pinning (warns on :latest or untagged)</li>
          <li>CPU/memory resource requests and limits</li>
          <li>Liveness and readiness probe presence</li>
          <li>Hardcoded secrets in env values</li>
          <li>Namespace specification</li>
          <li>Single replica availability warning</li>
          <li>Service type best practices</li>
          <li>Tab characters (not valid in YAML)</li>
        </ul>
      </div>
    </div>
  );
}
