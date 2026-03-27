import { useState } from 'preact/hooks';

type TfType = 'string' | 'number' | 'bool' | 'list(string)' | 'list(number)' | 'map(string)' | 'set(string)' | 'any';

interface Variable {
  id: string;
  name: string;
  type: TfType;
  description: string;
  defaultValue: string;
  sensitive: boolean;
  hasDefault: boolean;
  hasValidation: boolean;
  validationCondition: string;
  validationError: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function defaultForType(t: TfType): string {
  switch (t) {
    case 'string': return '"value"';
    case 'number': return '0';
    case 'bool': return 'false';
    case 'list(string)': return '[]';
    case 'list(number)': return '[]';
    case 'map(string)': return '{}';
    case 'set(string)': return '[]';
    default: return 'null';
  }
}

function tfVarsValue(v: Variable): string {
  if (!v.hasDefault) return '"<required>"';
  const val = v.defaultValue.trim() || defaultForType(v.type);
  return val;
}

function generateVariablesTf(vars: Variable[]): string {
  if (vars.length === 0) return '# No variables defined yet';

  return vars.map(v => {
    const lines: string[] = [`variable "${v.name || 'variable_name'}" {`];

    if (v.description) {
      lines.push(`  description = "${v.description}"`);
    }

    lines.push(`  type        = ${v.type}`);

    if (v.sensitive) {
      lines.push(`  sensitive   = true`);
    }

    if (v.hasDefault) {
      const val = v.defaultValue.trim() || defaultForType(v.type);
      lines.push(`  default     = ${val}`);
    }

    if (v.hasValidation && v.validationCondition) {
      lines.push(`\n  validation {`);
      lines.push(`    condition     = ${v.validationCondition}`);
      lines.push(`    error_message = "${v.validationError || 'Invalid value.'}"`);
      lines.push(`  }`);
    }

    lines.push(`}`);
    return lines.join('\n');
  }).join('\n\n');
}

function generateTfvars(vars: Variable[]): string {
  if (vars.length === 0) return '# No variables defined yet';

  const maxLen = Math.max(...vars.map(v => (v.name || 'variable_name').length));
  return vars.map(v => {
    const name = v.name || 'variable_name';
    const val = tfVarsValue(v);
    const comment = v.description ? `# ${v.description}\n` : '';
    const sensitiveComment = v.sensitive ? '# sensitive = true\n' : '';
    const padding = ' '.repeat(maxLen - name.length);
    return `${comment}${sensitiveComment}${name}${padding} = ${val}`;
  }).join('\n\n');
}

const TF_TYPES: TfType[] = ['string', 'number', 'bool', 'list(string)', 'list(number)', 'map(string)', 'set(string)', 'any'];

export default function TerraformVariableGenerator() {
  const [vars, setVars] = useState<Variable[]>([
    {
      id: makeId(),
      name: 'region',
      type: 'string',
      description: 'AWS region to deploy resources',
      defaultValue: '"us-east-1"',
      sensitive: false,
      hasDefault: true,
      hasValidation: false,
      validationCondition: '',
      validationError: '',
    },
    {
      id: makeId(),
      name: 'instance_count',
      type: 'number',
      description: 'Number of EC2 instances to launch',
      defaultValue: '2',
      sensitive: false,
      hasDefault: true,
      hasValidation: true,
      validationCondition: 'var.instance_count >= 1 && var.instance_count <= 100',
      validationError: 'Instance count must be between 1 and 100.',
    },
    {
      id: makeId(),
      name: 'db_password',
      type: 'string',
      description: 'Database password (required, no default)',
      defaultValue: '',
      sensitive: true,
      hasDefault: false,
      hasValidation: false,
      validationCondition: '',
      validationError: '',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'variables.tf' | 'terraform.tfvars'>('variables.tf');
  const [copied, setCopied] = useState(false);

  function addVar() {
    setVars(prev => [...prev, {
      id: makeId(),
      name: '',
      type: 'string',
      description: '',
      defaultValue: '',
      sensitive: false,
      hasDefault: false,
      hasValidation: false,
      validationCondition: '',
      validationError: '',
    }]);
  }

  function removeVar(id: string) {
    setVars(prev => prev.filter(v => v.id !== id));
  }

  function updateVar(id: string, field: keyof Variable, value: any) {
    setVars(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  }

  const output = activeTab === 'variables.tf'
    ? generateVariablesTf(vars)
    : generateTfvars(vars);

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Variable form */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Variables ({vars.length})</div>
            <button
              onClick={addVar}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              + Add Variable
            </button>
          </div>

          <div class="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {vars.map((v, i) => (
              <div key={v.id} class="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-text-muted font-mono">var #{i + 1}</span>
                  <button
                    onClick={() => removeVar(v.id)}
                    class="text-text-muted hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Name *</label>
                    <input
                      type="text"
                      class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={v.name}
                      onInput={(e) => updateVar(v.id, 'name', (e.target as HTMLInputElement).value.replace(/[^a-z0-9_]/gi, '_').toLowerCase())}
                      placeholder="variable_name"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Type</label>
                    <select
                      class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={v.type}
                      onChange={(e) => updateVar(v.id, 'type', (e.target as HTMLSelectElement).value)}
                    >
                      {TF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-xs text-text-muted mb-0.5">Description</label>
                  <input
                    type="text"
                    class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={v.description}
                    onInput={(e) => updateVar(v.id, 'description', (e.target as HTMLInputElement).value)}
                    placeholder="What this variable controls..."
                  />
                </div>

                <div class="flex gap-3 flex-wrap">
                  <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.hasDefault}
                      onChange={(e) => updateVar(v.id, 'hasDefault', (e.target as HTMLInputElement).checked)}
                      class="rounded"
                    />
                    Has default
                  </label>
                  <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.sensitive}
                      onChange={(e) => updateVar(v.id, 'sensitive', (e.target as HTMLInputElement).checked)}
                      class="rounded"
                    />
                    Sensitive
                  </label>
                  <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.hasValidation}
                      onChange={(e) => updateVar(v.id, 'hasValidation', (e.target as HTMLInputElement).checked)}
                      class="rounded"
                    />
                    Validation
                  </label>
                </div>

                {v.hasDefault && (
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Default value (HCL)</label>
                    <input
                      type="text"
                      class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={v.defaultValue}
                      onInput={(e) => updateVar(v.id, 'defaultValue', (e.target as HTMLInputElement).value)}
                      placeholder={defaultForType(v.type)}
                    />
                  </div>
                )}

                {v.hasValidation && (
                  <div class="space-y-2 border-t border-border pt-2">
                    <div>
                      <label class="block text-xs text-text-muted mb-0.5">Condition</label>
                      <input
                        type="text"
                        class="w-full font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        value={v.validationCondition}
                        onInput={(e) => updateVar(v.id, 'validationCondition', (e.target as HTMLInputElement).value)}
                        placeholder={`var.${v.name || 'name'} != ""`}
                      />
                    </div>
                    <div>
                      <label class="block text-xs text-text-muted mb-0.5">Error message</label>
                      <input
                        type="text"
                        class="w-full text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        value={v.validationError}
                        onInput={(e) => updateVar(v.id, 'validationError', (e.target as HTMLInputElement).value)}
                        placeholder="The value must be..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Generated output */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            {(['variables.tf', 'terraform.tfvars'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 text-sm font-mono rounded-lg border transition-colors ${
                  activeTab === tab
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-border text-text-muted hover:bg-surface'
                }`}
              >
                {tab}
              </button>
            ))}
            <button
              onClick={copyOutput}
              class="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <pre class="w-full h-[480px] overflow-auto font-mono text-sm bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>
        </div>
      </div>
    </div>
  );
}
