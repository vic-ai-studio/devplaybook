import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
};

const SAMPLE_TEMPLATE = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "mychart.fullname" . }}
  labels:
    {{- include "mychart.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "mychart.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "mychart.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
`;

const SAMPLE_VALUES = `replicaCount: 2

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "1.25.3"

service:
  type: ClusterIP
  port: 80

resources:
  limits:
    cpu: 500m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 64Mi
`;

type Tab = 'template' | 'values';

function validateTemplate(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!yaml.trim()) return [{ level: 'error', message: 'Template is empty.' }];

  const lines = yaml.split('\n');

  // Check kind
  if (!lines.some(l => l.match(/^kind\s*:/))) {
    issues.push({ level: 'error', message: 'Missing "kind" field. Every Kubernetes manifest requires a kind (e.g. Deployment, Service, ConfigMap).' });
  }

  // Check apiVersion
  if (!lines.some(l => l.match(/^apiVersion\s*:/))) {
    issues.push({ level: 'error', message: 'Missing "apiVersion" field. Required for all Kubernetes manifests (e.g. apps/v1, v1).' });
  }

  // Check metadata.name
  if (!yaml.includes('metadata:')) {
    issues.push({ level: 'error', message: 'Missing "metadata" section. All Kubernetes resources require metadata with a name.' });
  }

  // Check template braces balance
  const openBraces = (yaml.match(/\{\{/g) || []).length;
  const closeBraces = (yaml.match(/\}\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push({ level: 'error', message: `Unbalanced template braces: ${openBraces} opening {{ vs ${closeBraces} closing }}. Check all template expressions are closed.` });
  }

  // Check for hardcoded image tags (not using .Values or .Chart)
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('image:') && !trimmed.includes('{{')) {
      issues.push({ level: 'warning', message: `Line ${idx + 1}: Hardcoded image value. Use {{ .Values.image.repository }}:{{ .Values.image.tag }} for parameterized deployments.` });
    }
  });

  // Check for missing nindent on label includes
  if (yaml.includes('include') && yaml.includes('labels') && !yaml.includes('nindent')) {
    issues.push({ level: 'warning', message: 'Found "include" for labels without "nindent". Use {{- include "..." . | nindent N }} to correctly indent multi-line includes.' });
  }

  // Check for hardcoded namespace
  lines.forEach((line, idx) => {
    if (line.trim().startsWith('namespace:') && !line.includes('{{')) {
      const val = line.split(':')[1]?.trim();
      if (val && val !== 'kube-system' && val !== 'default') {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Hardcoded namespace "${val}". Use {{ .Release.Namespace }} to make the chart namespace-agnostic.` });
      }
    }
  });

  // Check for missing resources section in Deployment
  const kindLine = lines.find(l => l.match(/^kind\s*:/));
  const kind = kindLine?.match(/kind\s*:\s*(\S+)/)?.[1];
  if (kind === 'Deployment' && !yaml.includes('resources:')) {
    issues.push({ level: 'warning', message: 'No "resources" section found. Define CPU/memory requests and limits for Deployment containers to enable cluster scheduling.' });
  }

  // Check for .Values.image.tag without default
  if (yaml.includes('.Values.image.tag') && !yaml.includes('default') && !yaml.includes('| default')) {
    issues.push({ level: 'info', message: 'Using .Values.image.tag without a default. Consider {{ .Values.image.tag | default .Chart.AppVersion }} as a fallback.' });
  }

  // Check for missing labels on Deployment
  if (kind === 'Deployment' && !yaml.includes('labels:')) {
    issues.push({ level: 'warning', message: 'No labels defined. Add labels for proper resource selection and GitOps tooling compatibility.' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'Template looks valid! Good use of Helm best practices.' });
  }
  return issues;
}

function validateValues(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!yaml.trim()) return [{ level: 'error', message: 'values.yaml is empty.' }];

  const lines = yaml.split('\n');

  // Tab check
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Tab character on line ${idx + 1}. YAML requires spaces — never tabs.` });
    }
  });

  // Check for mutable image tags
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if ((trimmed.startsWith('tag:') || trimmed.startsWith('imageTag:'))) {
      const val = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
      if (val === 'latest' || val === '') {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Mutable image tag "${val || 'empty'}". Pin to a specific version (e.g. "1.25.3") for reproducible deployments.` });
      }
    }
  });

  // Check for empty resources
  if (yaml.includes('resources: {}') || yaml.includes('resources: null') ||
      (yaml.includes('resources:') && !yaml.includes('limits:') && !yaml.includes('requests:'))) {
    issues.push({ level: 'warning', message: 'Resource limits/requests not defined. Set CPU and memory constraints to prevent resource contention in the cluster.' });
  }

  // Check for replicaCount: 1
  if (lines.some(l => l.match(/^replicaCount\s*:\s*1$/))) {
    issues.push({ level: 'info', message: '"replicaCount: 1" offers no redundancy. Consider 2+ replicas for production high availability.' });
  }

  // Check for hardcoded secrets
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if ((lower.includes('password') || lower.includes('secret') || lower.includes('apikey') || lower.includes('token')) && line.includes(':')) {
      const val = line.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
      if (val && val !== '""' && val !== "''" && val !== '' && !val.startsWith('{{') && !val.startsWith('$(') && val !== '~') {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Possible hardcoded secret detected. Use Kubernetes Secret references or Helm Secrets plugin instead.` });
      }
    }
  });

  // Check for pullPolicy: Always with pinned tag
  const hasPinnedTag = lines.some(l => {
    const trimmed = l.trim();
    if (!trimmed.startsWith('tag:')) return false;
    const val = trimmed.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
    return val && val !== 'latest' && val !== '';
  });
  if (hasPinnedTag && lines.some(l => l.trim().match(/^pullPolicy\s*:\s*Always$/))) {
    issues.push({ level: 'info', message: '"pullPolicy: Always" with a pinned tag adds unnecessary registry calls. Use "IfNotPresent" for immutable tags.' });
  }

  if (issues.filter(i => i.level !== 'info').length === 0 && issues.length === 0) {
    issues.push({ level: 'info', message: 'values.yaml looks valid!' });
  }
  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400' },
};

export default function HelmChartValidator() {
  const [tab, setTab] = useState<Tab>('template');
  const [templateInput, setTemplateInput] = useState(SAMPLE_TEMPLATE);
  const [valuesInput, setValuesInput] = useState(SAMPLE_VALUES);
  const [templateIssues, setTemplateIssues] = useState<ValidationIssue[]>(() => validateTemplate(SAMPLE_TEMPLATE));
  const [valuesIssues, setValuesIssues] = useState<ValidationIssue[]>(() => validateValues(SAMPLE_VALUES));
  const [validated, setValidated] = useState(true);

  const currentInput = tab === 'template' ? templateInput : valuesInput;
  const currentIssues = tab === 'template' ? templateIssues : valuesIssues;

  const handleValidate = () => {
    if (tab === 'template') setTemplateIssues(validateTemplate(templateInput));
    else setValuesIssues(validateValues(valuesInput));
    setValidated(true);
  };

  const handleLoad = () => {
    if (tab === 'template') { setTemplateInput(SAMPLE_TEMPLATE); setTemplateIssues(validateTemplate(SAMPLE_TEMPLATE)); }
    else { setValuesInput(SAMPLE_VALUES); setValuesIssues(validateValues(SAMPLE_VALUES)); }
    setValidated(true);
  };

  const handleClear = () => {
    if (tab === 'template') { setTemplateInput(''); setTemplateIssues([]); }
    else { setValuesInput(''); setValuesIssues([]); }
    setValidated(false);
  };

  const errors = currentIssues.filter(i => i.level === 'error');
  const warnings = currentIssues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      {/* Tabs */}
      <div class="flex border-b border-border">
        {(['template', 'values'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setValidated(false); }}
            class={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {t === 'template' ? 'Template YAML' : 'values.yaml'}
          </button>
        ))}
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">
            {tab === 'template' ? 'Kubernetes manifest template (e.g. deployment.yaml)' : 'values.yaml'}
          </label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={currentInput}
          onInput={e => {
            const v = (e.target as HTMLTextAreaElement).value;
            tab === 'template' ? setTemplateInput(v) : setValuesInput(v);
            setValidated(false);
          }}
          rows={16}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder={tab === 'template' ? 'Paste your Helm template YAML here...' : 'Paste your values.yaml here...'}
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Validate
      </button>

      {validated && currentIssues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {errors.length === 0 && warnings.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>}
          </div>
          <div class="space-y-2">
            {currentIssues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                    <p class="text-sm text-text mt-0.5">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Validation checks</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Template: required Kubernetes fields (kind, apiVersion, metadata)</li>
          <li>Template brace balance — catches unclosed {{ "{{" }} expressions</li>
          <li>Parameterization — flags hardcoded values that should use .Values</li>
          <li>nindent usage for multi-line includes</li>
          <li>values.yaml: image tag pinning and resource limits</li>
          <li>Hardcoded secrets detection</li>
          <li>replicaCount redundancy hints</li>
          <li>pullPolicy best practices</li>
        </ul>
      </div>
    </div>
  );
}
