import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
};

const SAMPLE_CHART_YAML = `apiVersion: v2
name: my-app
description: A Helm chart for my application
type: application
version: 0.1.0
appVersion: "1.0.0"
`;

const SAMPLE_VALUES_YAML = `replicaCount: 1

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 80

resources: {}

ingress:
  enabled: false
`;

type Tab = 'chart' | 'values';

function lintChartYaml(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!yaml.trim()) return [{ level: 'error', message: 'Chart.yaml is empty.' }];

  const lines = yaml.split('\n');

  const hasApiVersion = lines.some(l => l.match(/^apiVersion\s*:/));
  const hasName = lines.some(l => l.match(/^name\s*:/));
  const hasVersion = lines.some(l => l.match(/^version\s*:/));

  if (!hasApiVersion) issues.push({ level: 'error', message: 'Missing required field "apiVersion". Use "v2" for Helm 3+.' });
  if (!hasName) issues.push({ level: 'error', message: 'Missing required field "name". The chart name must be lowercase.' });
  if (!hasVersion) issues.push({ level: 'error', message: 'Missing required field "version". Use semantic versioning (e.g. 0.1.0).' });

  // apiVersion check
  const apiVersionLine = lines.find(l => l.match(/^apiVersion\s*:/));
  const apiVer = apiVersionLine?.match(/apiVersion\s*:\s*(\S+)/)?.[1];
  if (apiVer && apiVer !== 'v2' && apiVer !== 'v1') {
    issues.push({ level: 'error', message: `Invalid apiVersion "${apiVer}". Helm 3 charts use "v2". Helm 2 charts use "v1".` });
  }
  if (apiVer === 'v1') {
    issues.push({ level: 'warning', message: 'apiVersion: v1 is Helm 2 format. Upgrade to v2 for Helm 3 features (dependencies, type field).' });
  }

  // name format
  const nameLine = lines.find(l => l.match(/^name\s*:/));
  const chartName = nameLine?.match(/name\s*:\s*(\S+)/)?.[1];
  if (chartName && chartName !== chartName.toLowerCase()) {
    issues.push({ level: 'error', message: `Chart name "${chartName}" must be lowercase. Helm enforces lowercase chart names.` });
  }
  if (chartName && chartName.includes('_')) {
    issues.push({ level: 'warning', message: `Chart name "${chartName}" contains underscores. Use hyphens instead (e.g. my-app).` });
  }

  // version semver
  const versionLine = lines.find(l => l.match(/^version\s*:/));
  const version = versionLine?.match(/version\s*:\s*["']?([\d.]+)["']?/)?.[1];
  if (version && !version.match(/^\d+\.\d+\.\d+$/)) {
    issues.push({ level: 'error', message: `version "${version}" is not valid semver. Use MAJOR.MINOR.PATCH format (e.g. 1.0.0).` });
  }

  // description
  if (!lines.some(l => l.match(/^description\s*:/))) {
    issues.push({ level: 'warning', message: 'No "description" field. Add a description to explain the chart\'s purpose.' });
  }

  // appVersion
  if (!lines.some(l => l.match(/^appVersion\s*:/))) {
    issues.push({ level: 'info', message: 'No "appVersion" field. Add it to track the version of the app being deployed.' });
  }

  // type
  if (!lines.some(l => l.match(/^type\s*:/))) {
    issues.push({ level: 'info', message: 'No "type" field. Defaults to "application". Use "library" for shared charts.' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'Chart.yaml looks valid!' });
  }
  return issues;
}

function lintValuesYaml(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!yaml.trim()) return [{ level: 'error', message: 'values.yaml is empty.' }];

  const lines = yaml.split('\n');

  // Tab check
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Tab character on line ${idx + 1}. YAML requires spaces only.` });
    }
  });

  // latest image tag
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.match(/^tag\s*:/) || trimmed.match(/^imageTag\s*:/)) {
      const val = trimmed.split(':')[1]?.trim().replace(/['"]/g, '');
      if (val === 'latest' || val === '') {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Image tag is "latest" or empty. Pin to a specific version for reproducible deployments.` });
      }
    }
  });

  // empty resources
  if (yaml.includes('resources: {}') || yaml.includes('resources: null')) {
    issues.push({ level: 'warning', message: '"resources" is empty ({}). Define CPU/memory requests and limits for production use.' });
  }

  // replicaCount: 1
  if (lines.some(l => l.match(/^replicaCount\s*:\s*1$/))) {
    issues.push({ level: 'info', message: '"replicaCount: 1" provides no redundancy. Consider 2+ replicas for production.' });
  }

  // Hardcoded passwords
  lines.forEach((line, idx) => {
    const lower = line.toLowerCase();
    if ((lower.includes('password') || lower.includes('secret') || lower.includes('apikey') || lower.includes('api_key')) && line.includes(':')) {
      const val = line.split(':').slice(1).join(':').trim().replace(/['"]/g, '');
      if (val && val !== '""' && val !== "''" && val !== '' && !val.startsWith('{{') && !val.startsWith('$(')) {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Possible hardcoded secret. Use a Kubernetes Secret reference or Helm secret management.` });
      }
    }
  });

  // pullPolicy
  const pullLine = lines.find(l => l.trim().match(/^pullPolicy\s*:/));
  const pullPolicy = pullLine?.match(/pullPolicy\s*:\s*(\S+)/)?.[1];
  if (pullPolicy === 'Always') {
    issues.push({ level: 'info', message: '"pullPolicy: Always" pulls the image on every Pod start. Use IfNotPresent for pinned tags to reduce startup time.' });
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

export default function HelmChartLinter() {
  const [tab, setTab] = useState<Tab>('chart');
  const [chartInput, setChartInput] = useState(SAMPLE_CHART_YAML);
  const [valuesInput, setValuesInput] = useState(SAMPLE_VALUES_YAML);
  const [chartIssues, setChartIssues] = useState<ValidationIssue[]>(() => lintChartYaml(SAMPLE_CHART_YAML));
  const [valuesIssues, setValuesIssues] = useState<ValidationIssue[]>(() => lintValuesYaml(SAMPLE_VALUES_YAML));
  const [validated, setValidated] = useState(true);

  const currentInput = tab === 'chart' ? chartInput : valuesInput;
  const currentIssues = tab === 'chart' ? chartIssues : valuesIssues;

  const handleValidate = () => {
    if (tab === 'chart') setChartIssues(lintChartYaml(chartInput));
    else setValuesIssues(lintValuesYaml(valuesInput));
    setValidated(true);
  };

  const handleLoad = () => {
    if (tab === 'chart') { setChartInput(SAMPLE_CHART_YAML); setChartIssues(lintChartYaml(SAMPLE_CHART_YAML)); }
    else { setValuesInput(SAMPLE_VALUES_YAML); setValuesIssues(lintValuesYaml(SAMPLE_VALUES_YAML)); }
    setValidated(true);
  };

  const handleClear = () => {
    if (tab === 'chart') { setChartInput(''); setChartIssues([]); }
    else { setValuesInput(''); setValuesIssues([]); }
    setValidated(false);
  };

  const errors = currentIssues.filter(i => i.level === 'error');
  const warnings = currentIssues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      {/* Tabs */}
      <div class="flex border-b border-border">
        {(['chart', 'values'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setValidated(false); }}
            class={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
          >
            {t === 'chart' ? 'Chart.yaml' : 'values.yaml'}
          </button>
        ))}
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">{tab === 'chart' ? 'Chart.yaml' : 'values.yaml'}</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={currentInput}
          onInput={e => { const v = (e.target as HTMLTextAreaElement).value; tab === 'chart' ? setChartInput(v) : setValuesInput(v); setValidated(false); }}
          rows={16}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder={`Paste your ${tab === 'chart' ? 'Chart.yaml' : 'values.yaml'} here...`}
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Lint
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
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Chart.yaml: required fields (apiVersion, name, version)</li>
          <li>Chart name: lowercase and hyphen-separated</li>
          <li>Version: valid semantic versioning</li>
          <li>apiVersion: v1 (Helm 2) vs v2 (Helm 3)</li>
          <li>values.yaml: image tag pinning</li>
          <li>Resource requests/limits presence</li>
          <li>Hardcoded secrets detection</li>
          <li>Image pull policy best practices</li>
        </ul>
      </div>
    </div>
  );
}
