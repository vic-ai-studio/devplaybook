import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
};

const SAMPLE_TF = `variable "region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "instance_count" {
  description = "Number of EC2 instances"
  type        = number
  default     = 2
}

variable "db_password" {
  type = string
}

variable "enable_monitoring" {
  type    = bool
  default = true
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
}
`;

function validateTerraformVariables(hcl: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = hcl.split('\n');

  // Parse variable blocks
  type VarBlock = {
    name: string;
    startLine: number;
    hasDescription: boolean;
    hasType: boolean;
    hasDefault: boolean;
    hasValidation: boolean;
    isSensitive: boolean;
    typeValue: string;
    defaultValue: string;
  };

  const variables: VarBlock[] = [];
  let currentVar: VarBlock | null = null;
  let braceDepth = 0;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    // Detect variable block start
    const varMatch = trimmed.match(/^variable\s+"([^"]+)"\s*\{/);
    if (varMatch) {
      if (currentVar) variables.push(currentVar);
      currentVar = {
        name: varMatch[1],
        startLine: lineNum,
        hasDescription: false,
        hasType: false,
        hasDefault: false,
        hasValidation: false,
        isSensitive: false,
        typeValue: '',
        defaultValue: '',
      };
      braceDepth = 1;
      return;
    }

    if (currentVar) {
      if (trimmed.includes('{')) braceDepth += (trimmed.match(/\{/g) || []).length;
      if (trimmed.includes('}')) braceDepth -= (trimmed.match(/\}/g) || []).length;

      if (trimmed.startsWith('description')) currentVar.hasDescription = true;
      if (trimmed.startsWith('type')) {
        currentVar.hasType = true;
        currentVar.typeValue = trimmed.replace(/^type\s*=\s*/, '').trim();
      }
      if (trimmed.startsWith('default')) {
        currentVar.hasDefault = true;
        currentVar.defaultValue = trimmed.replace(/^default\s*=\s*/, '').trim();
      }
      if (trimmed.startsWith('validation')) currentVar.hasValidation = true;
      if (trimmed.startsWith('sensitive') && trimmed.includes('true')) currentVar.isSensitive = true;

      if (braceDepth <= 0) {
        variables.push(currentVar);
        currentVar = null;
        braceDepth = 0;
      }
    }
  });
  if (currentVar) variables.push(currentVar);

  if (variables.length === 0) {
    issues.push({ level: 'error', message: 'No variable blocks found. Paste a valid variables.tf file.' });
    return issues;
  }

  variables.forEach(v => {
    // Missing description
    if (!v.hasDescription) {
      issues.push({
        level: 'warning',
        message: `Variable "${v.name}" has no description. Add one to document what this variable does.`,
        line: v.startLine,
      });
    }

    // Missing type
    if (!v.hasType) {
      issues.push({
        level: 'warning',
        message: `Variable "${v.name}" has no type constraint. Add type = string/number/bool/list/map to enforce input type.`,
        line: v.startLine,
      });
    }

    // Required variable without sensitive flag (likely a secret)
    const lowerName = v.name.toLowerCase();
    const isLikelySecret = ['password', 'secret', 'token', 'key', 'api_key', 'private_key', 'credentials'].some(
      kw => lowerName.includes(kw)
    );
    if (isLikelySecret && !v.isSensitive && !v.hasDefault) {
      issues.push({
        level: 'warning',
        message: `Variable "${v.name}" looks like a secret but is not marked sensitive = true. Add sensitive = true to redact it from logs.`,
        line: v.startLine,
      });
    }

    // Default value conflicts with type
    if (v.hasType && v.hasDefault) {
      if (v.typeValue === 'number' && isNaN(Number(v.defaultValue))) {
        issues.push({
          level: 'error',
          message: `Variable "${v.name}" type is number but default "${v.defaultValue}" is not a valid number.`,
          line: v.startLine,
        });
      }
      if (v.typeValue === 'bool' && !['true', 'false'].includes(v.defaultValue)) {
        issues.push({
          level: 'error',
          message: `Variable "${v.name}" type is bool but default "${v.defaultValue}" is not true or false.`,
          line: v.startLine,
        });
      }
    }

    // No default and not sensitive — required variable
    if (!v.hasDefault && !v.isSensitive && !isLikelySecret) {
      issues.push({
        level: 'info',
        message: `Variable "${v.name}" has no default — it is required. Ensure it is always supplied via tfvars or environment variables.`,
        line: v.startLine,
      });
    }

    // Complex types should have validation
    if (v.hasType && (v.typeValue.startsWith('list') || v.typeValue.startsWith('map')) && !v.hasValidation) {
      issues.push({
        level: 'info',
        message: `Variable "${v.name}" has type ${v.typeValue} — consider adding a validation block to enforce allowed values.`,
        line: v.startLine,
      });
    }
  });

  // Tab characters
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Tab character on line ${idx + 1}. HCL uses spaces (2-space indent recommended).`, line: idx + 1 });
    }
  });

  if (issues.length === 0) {
    issues.push({ level: 'info', message: `All ${variables.length} variables look good!` });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ', text: 'text-blue-400' },
};

export default function TerraformVariableValidator() {
  const [input, setInput] = useState(SAMPLE_TF);
  const [issues, setIssues] = useState<ValidationIssue[]>(() => validateTerraformVariables(SAMPLE_TF));
  const [validated, setValidated] = useState(true);

  const handleValidate = () => {
    setIssues(validateTerraformVariables(input));
    setValidated(true);
  };

  const handleLoad = () => {
    setInput(SAMPLE_TF);
    setIssues(validateTerraformVariables(SAMPLE_TF));
    setValidated(true);
  };

  const handleClear = () => {
    setInput('');
    setIssues([]);
    setValidated(false);
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">variables.tf</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setValidated(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your variables.tf content here..."
          spellcheck={false}
        />
      </div>

      <button
        onClick={handleValidate}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Validate Variables
      </button>

      {validated && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
            )}
            {warnings.length > 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
            )}
            {errors.length === 0 && warnings.length === 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>
            )}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1">
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
        <p class="text-xs text-text-muted text-center">Click Validate to check your variables.tf</p>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Missing <code class="font-mono bg-background px-1 rounded">description</code> on variables</li>
          <li>Missing <code class="font-mono bg-background px-1 rounded">type</code> constraint</li>
          <li>Secret variables without <code class="font-mono bg-background px-1 rounded">sensitive = true</code></li>
          <li>Type/default value mismatch (string vs number vs bool)</li>
          <li>Required variables (no default) flagged for documentation</li>
          <li>Complex types (list/map) without validation blocks</li>
          <li>Tab characters in HCL (should use spaces)</li>
        </ul>
      </div>
    </div>
  );
}
