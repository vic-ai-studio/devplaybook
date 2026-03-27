import { useState } from 'preact/hooks';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: DashboardInfo | null;
  summary: string;
}

interface PanelInfo {
  id: number;
  title: string;
  type: string;
  datasource: string;
  targets: number;
  issues: string[];
}

interface DashboardInfo {
  title: string;
  uid: string;
  version: number;
  schemaVersion: number;
  panels: PanelInfo[];
  variables: string[];
  tags: string[];
  refresh: string;
  timePicker: string;
}

const KNOWN_PANEL_TYPES = new Set([
  'graph', 'timeseries', 'stat', 'gauge', 'bar-gauge', 'table', 'text',
  'news', 'piechart', 'histogram', 'heatmap', 'logs', 'nodeGraph',
  'canvas', 'geomap', 'stateTimeline', 'statusHistory', 'trend',
  'xyChart', 'alertlist', 'dashlist', 'row',
]);

const EXAMPLE_DASHBOARD = `{
  "title": "System Overview",
  "uid": "abc123",
  "version": 1,
  "schemaVersion": 39,
  "refresh": "30s",
  "time": { "from": "now-1h", "to": "now" },
  "tags": ["production", "infra"],
  "panels": [
    {
      "id": 1,
      "title": "CPU Usage",
      "type": "timeseries",
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "100 - (avg(rate(node_cpu_seconds_total{mode=\\"idle\\"}[5m])) * 100)",
          "legendFormat": "CPU %"
        }
      ],
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 }
    },
    {
      "id": 2,
      "title": "Memory Usage",
      "type": "gauge",
      "datasource": { "type": "prometheus", "uid": "prometheus" },
      "targets": [
        {
          "expr": "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100",
          "legendFormat": "Memory Available %"
        }
      ],
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 }
    }
  ]
}`;

function validateDashboard(input: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let info: DashboardInfo | null = null;

  if (!input.trim()) {
    return { valid: false, errors: ['Input is empty'], warnings: [], info: null, summary: 'No content to validate' };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      valid: false,
      errors: [`Invalid JSON: ${msg}`],
      warnings: [],
      info: null,
      summary: '✗ Invalid JSON — fix syntax errors first',
    };
  }

  // Required fields
  if (!parsed.title) errors.push('Missing required field: "title"');
  if (!parsed.panels) errors.push('Missing required field: "panels"');
  if (parsed.panels && !Array.isArray(parsed.panels)) errors.push('"panels" must be an array');

  // Optional but recommended
  if (!parsed.uid) warnings.push('Missing "uid" — Grafana will generate one, but explicit UIDs are recommended for reproducibility');
  if (!parsed.schemaVersion) warnings.push('Missing "schemaVersion" — recommended to set (current is 39)');
  if (parsed.schemaVersion && typeof parsed.schemaVersion === 'number' && (parsed.schemaVersion as number) < 36) {
    warnings.push(`Schema version ${parsed.schemaVersion} is old — current is 39. Some features may not work`);
  }
  if (!parsed.time) warnings.push('Missing "time" — default time range may not display correctly');
  if (!parsed.refresh) warnings.push('No auto-refresh set — add "refresh": "30s" for live dashboards');

  // Parse panels
  const panels: PanelInfo[] = [];
  const panelIds = new Set<number>();

  if (Array.isArray(parsed.panels)) {
    for (let i = 0; i < (parsed.panels as unknown[]).length; i++) {
      const panel = (parsed.panels as Record<string, unknown>[])[i];
      const panelIssues: string[] = [];
      const panelTitle = (panel.title as string) || `Panel #${i + 1}`;

      if (!panel.id && panel.id !== 0) panelIssues.push('Missing "id"');
      if (typeof panel.id === 'number') {
        if (panelIds.has(panel.id as number)) {
          panelIssues.push(`Duplicate panel id: ${panel.id}`);
        }
        panelIds.add(panel.id as number);
      }

      if (!panel.title) warnings.push(`Panel ${i + 1} has no title`);
      if (!panel.type) panelIssues.push('Missing "type"');
      if (panel.type && !KNOWN_PANEL_TYPES.has(panel.type as string)) {
        warnings.push(`Panel "${panelTitle}" uses type "${panel.type}" — verify it's a valid/installed panel plugin`);
      }

      if (!panel.gridPos) warnings.push(`Panel "${panelTitle}" has no "gridPos" — layout may be broken`);
      if (panel.gridPos) {
        const gp = panel.gridPos as Record<string, unknown>;
        if (!gp.h || !gp.w) panelIssues.push('gridPos missing h or w dimensions');
      }

      // Datasource check
      let datasource = 'unknown';
      if (panel.datasource) {
        if (typeof panel.datasource === 'string') {
          datasource = panel.datasource as string;
          warnings.push(`Panel "${panelTitle}" uses legacy string datasource "${datasource}" — update to object format: {"type": "...", "uid": "..."}`);
        } else if (typeof panel.datasource === 'object') {
          const ds = panel.datasource as Record<string, unknown>;
          datasource = (ds.type as string) || (ds.uid as string) || 'object';
          if (!ds.uid) warnings.push(`Panel "${panelTitle}" datasource missing "uid" — may fail in Grafana 10+`);
        }
      } else {
        warnings.push(`Panel "${panelTitle}" has no datasource — it will use the dashboard default`);
        datasource = 'default';
      }

      // Targets check
      let targetCount = 0;
      if (panel.type !== 'row' && panel.type !== 'text' && panel.type !== 'news' && panel.type !== 'dashlist' && panel.type !== 'alertlist') {
        if (!panel.targets || !Array.isArray(panel.targets) || (panel.targets as unknown[]).length === 0) {
          if (panel.type !== 'row') {
            warnings.push(`Panel "${panelTitle}" has no query targets`);
          }
        } else {
          targetCount = (panel.targets as unknown[]).length;
          for (let t = 0; t < (panel.targets as Record<string, unknown>[]).length; t++) {
            const target = (panel.targets as Record<string, unknown>[])[t];
            if (!target.expr && !target.query && !target.rawSql && !target.target) {
              warnings.push(`Panel "${panelTitle}" target ${t + 1} has no query expression`);
            }
          }
        }
      }

      panels.push({
        id: (panel.id as number) || i,
        title: panelTitle,
        type: (panel.type as string) || 'unknown',
        datasource,
        targets: targetCount,
        issues: panelIssues,
      });
    }
  }

  // Collect panel errors
  for (const p of panels) {
    for (const issue of p.issues) {
      errors.push(`[Panel "${p.title}"] ${issue}`);
    }
  }

  // Templating/variables
  const variables: string[] = [];
  if (parsed.templating && typeof parsed.templating === 'object') {
    const tmpl = parsed.templating as Record<string, unknown>;
    if (Array.isArray(tmpl.list)) {
      for (const v of tmpl.list as Record<string, unknown>[]) {
        if (v.name) variables.push(v.name as string);
      }
    }
  }

  info = {
    title: (parsed.title as string) || 'Untitled',
    uid: (parsed.uid as string) || '(auto)',
    version: (parsed.version as number) || 0,
    schemaVersion: (parsed.schemaVersion as number) || 0,
    panels,
    variables,
    tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]) : [],
    refresh: (parsed.refresh as string) || 'off',
    timePicker: parsed.time ? `${(parsed.time as Record<string, unknown>).from} → ${(parsed.time as Record<string, unknown>).to}` : 'not set',
  };

  const valid = errors.length === 0;
  const summary = valid
    ? `✓ Valid — ${panels.length} panel${panels.length !== 1 ? 's' : ''}, ${warnings.length} suggestion${warnings.length !== 1 ? 's' : ''}`
    : `✗ ${errors.length} error${errors.length !== 1 ? 's' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`;

  return { valid, errors, warnings, info, summary };
}

export default function GrafanaDashboardJsonValidator() {
  const [input, setInput] = useState(EXAMPLE_DASHBOARD);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleValidate = () => {
    setResult(validateDashboard(input));
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed, null, 2));
    } catch {
      // keep as-is
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const panelTypeColor: Record<string, string> = {
    timeseries: 'text-blue-400',
    stat: 'text-green-400',
    gauge: 'text-yellow-400',
    table: 'text-purple-400',
    row: 'text-text-muted',
    text: 'text-text-muted',
  };

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Grafana Dashboard JSON</label>
            <div class="flex gap-2">
              <button onClick={handleFormat} class="text-xs px-2 py-1 rounded border border-border hover:border-primary transition-colors">
                Format
              </button>
              <button onClick={handleCopy} class="text-xs px-2 py-1 rounded border border-border hover:border-primary transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            class="w-full border border-border rounded p-3 bg-code-bg text-code-text text-xs font-mono h-96 focus:outline-none focus:border-primary resize-none"
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
            placeholder='Paste your Grafana dashboard JSON here...'
          />
        </div>

        {/* Results */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Validation Results</label>
          {!result ? (
            <div class="border border-border rounded p-6 h-96 flex items-center justify-center text-text-muted text-sm">
              Click "Validate" to check your dashboard JSON
            </div>
          ) : (
            <div class="border border-border rounded p-4 h-96 overflow-auto space-y-4">
              {/* Summary */}
              <div class={`p-3 rounded text-sm font-medium ${result.valid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {result.summary}
              </div>

              {/* Dashboard Info */}
              {result.info && (
                <div class="text-xs border border-border rounded p-3 space-y-1">
                  <div class="font-semibold text-text mb-2">Dashboard Info</div>
                  <div class="grid grid-cols-2 gap-1">
                    <span class="text-text-muted">Title:</span><span class="font-mono">{result.info.title}</span>
                    <span class="text-text-muted">UID:</span><span class="font-mono">{result.info.uid}</span>
                    <span class="text-text-muted">Schema:</span><span class="font-mono">v{result.info.schemaVersion}</span>
                    <span class="text-text-muted">Refresh:</span><span class="font-mono">{result.info.refresh}</span>
                    <span class="text-text-muted">Time:</span><span class="font-mono text-xs">{result.info.timePicker}</span>
                    <span class="text-text-muted">Tags:</span><span class="font-mono">{result.info.tags.join(', ') || 'none'}</span>
                    {result.info.variables.length > 0 && (
                      <>
                        <span class="text-text-muted">Variables:</span>
                        <span class="font-mono">{result.info.variables.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <h3 class="text-sm font-semibold text-red-400 mb-2">Errors ({result.errors.length})</h3>
                  <ul class="space-y-1">
                    {result.errors.map((e, i) => (
                      <li key={i} class="text-xs text-red-300 bg-red-500/5 rounded px-2 py-1 border border-red-500/10">✗ {e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div>
                  <h3 class="text-sm font-semibold text-yellow-400 mb-2">Suggestions ({result.warnings.length})</h3>
                  <ul class="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} class="text-xs text-yellow-300 bg-yellow-500/5 rounded px-2 py-1 border border-yellow-500/10">⚠ {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Panels */}
              {result.info && result.info.panels.length > 0 && (
                <div>
                  <h3 class="text-sm font-semibold text-text mb-2">Panels ({result.info.panels.length})</h3>
                  <div class="space-y-1">
                    {result.info.panels.map((p, i) => (
                      <div key={i} class={`text-xs p-2 rounded border flex items-center justify-between ${p.issues.length > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-bg'}`}>
                        <div>
                          <span class="font-semibold">{p.title}</span>
                          <span class="text-text-muted ml-2">#{p.id}</span>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class={`${panelTypeColor[p.type] || 'text-text'} font-mono`}>{p.type}</span>
                          {p.targets > 0 && <span class="text-text-muted">{p.targets}q</span>}
                          {p.issues.length > 0 && <span class="text-red-400">!</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div class="flex gap-3">
        <button
          onClick={handleValidate}
          class="px-6 py-2 bg-primary text-white rounded font-medium hover:opacity-90 transition-opacity"
        >
          Validate Dashboard
        </button>
        <button
          onClick={() => { setInput(EXAMPLE_DASHBOARD); setResult(null); }}
          class="px-4 py-2 border border-border rounded text-sm text-text-muted hover:border-primary transition-colors"
        >
          Load Example
        </button>
        <button
          onClick={() => { setInput(''); setResult(null); }}
          class="px-4 py-2 border border-border rounded text-sm text-text-muted hover:border-primary transition-colors"
        >
          Clear
        </button>
      </div>

      <div class="text-xs text-text-muted border border-border rounded p-3 space-y-1">
        <p><strong>Tips:</strong></p>
        <p>• Export dashboard JSON via Grafana UI: Dashboard menu → Share → Export → Save to file</p>
        <p>• Use explicit <code class="font-mono bg-code-bg px-1 rounded">uid</code> for dashboard-as-code workflows (Terraform, Ansible)</p>
        <p>• Grafana 10+ requires datasource as object format: <code class="font-mono bg-code-bg px-1 rounded">{"{"}"type": "prometheus", "uid": "..."{"}"}</code></p>
        <p>• Validate provisioning YAML separately with <code class="font-mono bg-code-bg px-1 rounded">grafana-cli</code></p>
      </div>
    </div>
  );
}
