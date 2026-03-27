import { useState } from 'preact/hooks';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rules: ParsedRule[];
  summary: string;
}

interface ParsedRule {
  group: string;
  alert: string;
  expr: string;
  duration: string;
  severity: string;
  issues: string[];
}

const EXAMPLE_RULES = `groups:
  - name: node_alerts
    rules:
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}%"

      - alert: OutOfMemory
        expr: node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100 < 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Out of memory (instance {{ $labels.instance }})"
          description: "Node memory is filling up (< 10% left)"

      - alert: HighDiskUsage
        expr: (node_filesystem_size_bytes - node_filesystem_free_bytes) / node_filesystem_size_bytes * 100 > 85
        for: 10m
        labels:
          severity: warning`;

function validatePromQL(expr: string): string[] {
  const issues: string[] = [];
  if (!expr || !expr.trim()) {
    issues.push('Expression is empty');
    return issues;
  }
  // Basic checks
  const openBrackets = (expr.match(/\{/g) || []).length;
  const closeBrackets = (expr.match(/\}/g) || []).length;
  if (openBrackets !== closeBrackets) issues.push('Unmatched curly braces in expression');

  const openParens = (expr.match(/\(/g) || []).length;
  const closeParens = (expr.match(/\)/g) || []).length;
  if (openParens !== closeParens) issues.push('Unmatched parentheses in expression');

  // Check for range vectors in rate/irate/increase
  if (/\b(rate|irate|increase|delta)\s*\([^)]*\)/.test(expr)) {
    if (!/\b(rate|irate|increase|delta)\s*\([^[]*\[[^\]]+\]/.test(expr)) {
      issues.push('rate/irate/increase/delta requires a range vector e.g. [5m]');
    }
  }

  // Check for valid duration in range vectors
  const rangeMatches = expr.match(/\[([^\]]+)\]/g) || [];
  for (const range of rangeMatches) {
    const inner = range.slice(1, -1);
    if (!/^\d+[smhdwy]$/.test(inner)) {
      issues.push(`Invalid range duration: ${range} — use format like [5m], [1h], [30s]`);
    }
  }

  // Check for comparison operators
  if (expr.includes('=') && !expr.includes('==') && !expr.includes('!=') && !expr.includes('<=') && !expr.includes('>=') && !/{[^}]*=/.test(expr)) {
    issues.push('Use == for equality comparison, not single =');
  }

  return issues;
}

function parseYamlRules(input: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rules: ParsedRule[] = [];

  if (!input.trim()) {
    return { valid: false, errors: ['Input is empty'], warnings: [], rules: [], summary: 'No content to validate' };
  }

  // Check basic YAML structure
  if (!input.includes('groups:') && !input.trimStart().startsWith('- name:') && !input.trimStart().startsWith('- alert:')) {
    errors.push('Missing top-level "groups:" key — Prometheus alert rules require a groups structure');
  }

  // Simple line-by-line parsing
  const lines = input.split('\n');
  let currentGroup = '';
  let currentRule: Partial<ParsedRule> | null = null;
  let inAnnotations = false;
  let inLabels = false;
  let indent = 0;

  const finalizeRule = () => {
    if (currentRule && currentRule.alert) {
      const ruleIssues: string[] = [];

      if (!currentRule.expr) ruleIssues.push('Missing "expr" field');
      else {
        const exprIssues = validatePromQL(currentRule.expr);
        ruleIssues.push(...exprIssues);
      }

      if (!currentRule.duration) warnings.push(`Alert "${currentRule.alert}" has no "for:" duration — it will fire immediately`);
      if (!currentRule.severity) warnings.push(`Alert "${currentRule.alert}" has no severity label`);

      if (!currentRule.alert.match(/^[A-Z][a-zA-Z0-9_]*$/)) {
        warnings.push(`Alert name "${currentRule.alert}" should use PascalCase (e.g. HighCpuUsage)`);
      }

      // Check duration format
      if (currentRule.duration && !/^\d+[smhdwy]$/.test(currentRule.duration)) {
        ruleIssues.push(`Invalid "for:" duration "${currentRule.duration}" — use format like 5m, 2h, 30s`);
      }

      rules.push({
        group: currentGroup,
        alert: currentRule.alert || '',
        expr: currentRule.expr || '',
        duration: currentRule.duration || '0s',
        severity: currentRule.severity || 'none',
        issues: ruleIssues,
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const currentIndent = line.search(/\S/);

    if (/^  - name:\s*(.+)/.test(line)) {
      const match = line.match(/^  - name:\s*(.+)/);
      if (match) currentGroup = match[1].trim();
    } else if (/^\s+- alert:\s*(.+)/.test(line)) {
      finalizeRule();
      const match = line.match(/- alert:\s*(.+)/);
      currentRule = { alert: match ? match[1].trim() : '', group: currentGroup };
      inAnnotations = false;
      inLabels = false;
    } else if (currentRule) {
      if (/^\s+expr:\s*(.+)/.test(line)) {
        const match = line.match(/expr:\s*(.+)/);
        if (match) currentRule.expr = match[1].trim();
        inAnnotations = false;
        inLabels = false;
      } else if (/^\s+for:\s*(.+)/.test(line)) {
        const match = line.match(/for:\s*(.+)/);
        if (match) currentRule.duration = match[1].trim();
      } else if (/^\s+labels:/.test(line)) {
        inLabels = true;
        inAnnotations = false;
      } else if (/^\s+annotations:/.test(line)) {
        inAnnotations = true;
        inLabels = false;
      } else if (inLabels && /^\s+severity:\s*(.+)/.test(line)) {
        const match = line.match(/severity:\s*(.+)/);
        if (match) currentRule.severity = match[1].trim();
      }
    }
  }
  finalizeRule();

  // Overall checks
  if (rules.length === 0 && errors.length === 0) {
    errors.push('No alert rules found — check your YAML indentation and structure');
  }

  const ruleErrors = rules.filter(r => r.issues.length > 0);
  if (ruleErrors.length > 0) {
    for (const r of ruleErrors) {
      for (const issue of r.issues) {
        errors.push(`[${r.alert}] ${issue}`);
      }
    }
  }

  const valid = errors.length === 0;
  const summary = valid
    ? `✓ Valid — ${rules.length} alert rule${rules.length !== 1 ? 's' : ''} in ${new Set(rules.map(r => r.group)).size} group${new Set(rules.map(r => r.group)).size !== 1 ? 's' : ''}`
    : `✗ ${errors.length} error${errors.length !== 1 ? 's' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`;

  return { valid, errors, warnings, rules, summary };
}

export default function PrometheusAlertRulesValidator() {
  const [input, setInput] = useState(EXAMPLE_RULES);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleValidate = () => {
    setResult(parseYamlRules(input));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const severityColor: Record<string, string> = {
    critical: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-400',
    none: 'text-text-muted',
  };

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Prometheus Alert Rules YAML</label>
            <button onClick={handleCopy} class="text-xs px-2 py-1 rounded border border-border hover:border-primary transition-colors">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            class="w-full border border-border rounded p-3 bg-code-bg text-code-text text-xs font-mono h-96 focus:outline-none focus:border-primary resize-none"
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
            placeholder="Paste your Prometheus alert rules YAML here..."
          />
        </div>

        {/* Results */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Validation Results</label>
          </div>
          {!result ? (
            <div class="border border-border rounded p-6 h-96 flex items-center justify-center text-text-muted text-sm">
              Click "Validate" to check your alert rules
            </div>
          ) : (
            <div class="border border-border rounded p-4 h-96 overflow-auto space-y-4">
              {/* Summary */}
              <div class={`p-3 rounded text-sm font-medium ${result.valid ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {result.summary}
              </div>

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
                  <h3 class="text-sm font-semibold text-yellow-400 mb-2">Warnings ({result.warnings.length})</h3>
                  <ul class="space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} class="text-xs text-yellow-300 bg-yellow-500/5 rounded px-2 py-1 border border-yellow-500/10">⚠ {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rules */}
              {result.rules.length > 0 && (
                <div>
                  <h3 class="text-sm font-semibold text-text mb-2">Parsed Rules ({result.rules.length})</h3>
                  <div class="space-y-2">
                    {result.rules.map((r, i) => (
                      <div key={i} class={`text-xs p-2 rounded border ${r.issues.length > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-bg'}`}>
                        <div class="flex items-center justify-between">
                          <span class="font-mono font-semibold">{r.alert}</span>
                          <span class={`${severityColor[r.severity] || 'text-text-muted'} font-medium`}>{r.severity}</span>
                        </div>
                        <div class="text-text-muted mt-1">Group: {r.group} · for: {r.duration}</div>
                        <div class="text-code-text font-mono mt-1 truncate" title={r.expr}>{r.expr}</div>
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
          Validate Rules
        </button>
        <button
          onClick={() => { setInput(EXAMPLE_RULES); setResult(null); }}
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
        <p>• Use <code class="font-mono bg-code-bg px-1 rounded">for:</code> to add evaluation duration and avoid flapping alerts</p>
        <p>• Always add a <code class="font-mono bg-code-bg px-1 rounded">severity</code> label (critical/warning/info) for proper routing</p>
        <p>• PromQL <code class="font-mono bg-code-bg px-1 rounded">rate()</code> requires a range vector like <code class="font-mono bg-code-bg px-1 rounded">[5m]</code></p>
        <p>• Test expressions in your Prometheus /graph or with <code class="font-mono bg-code-bg px-1 rounded">promtool check rules</code></p>
      </div>
    </div>
  );
}
