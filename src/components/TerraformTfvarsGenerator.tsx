import { useState } from 'preact/hooks';

type VarType = 'string' | 'number' | 'bool' | 'list(string)' | 'map(string)' | 'object';

type TfVar = {
  id: number;
  name: string;
  type: VarType;
  description: string;
  defaultValue: string;
  sensitive: boolean;
};

let nextId = 1;
const mkId = () => nextId++;

const INITIAL_VARS: TfVar[] = [
  { id: mkId(), name: 'environment', type: 'string', description: 'Deployment environment', defaultValue: 'production', sensitive: false },
  { id: mkId(), name: 'region', type: 'string', description: 'AWS region', defaultValue: 'us-east-1', sensitive: false },
  { id: mkId(), name: 'instance_count', type: 'number', description: 'Number of EC2 instances', defaultValue: '2', sensitive: false },
  { id: mkId(), name: 'enable_monitoring', type: 'bool', description: 'Enable CloudWatch monitoring', defaultValue: 'true', sensitive: false },
  { id: mkId(), name: 'db_password', type: 'string', description: 'Database password', defaultValue: '', sensitive: true },
];

function formatValue(v: TfVar): string {
  const val = v.defaultValue.trim();
  switch (v.type) {
    case 'number':
      return val || '0';
    case 'bool':
      return val === 'true' || val === 'false' ? val : 'false';
    case 'list(string)': {
      const items = val ? val.split(',').map(s => `"${s.trim()}"`).join(', ') : '';
      return `[${items}]`;
    }
    case 'map(string)': {
      if (!val) return '{}';
      const pairs = val.split(',').map(pair => {
        const [k, v2] = pair.split('=').map(s => s.trim());
        return `  ${k || 'key'} = "${v2 || ''}"`;
      });
      return `{\n${pairs.join('\n')}\n}`;
    }
    case 'object':
      return val || '{}';
    default:
      return `"${val}"`;
  }
}

function generateTfvars(vars: TfVar[]): string {
  if (vars.length === 0) return '# No variables defined';

  const lines: string[] = [];
  vars.forEach(v => {
    if (v.description) lines.push(`# ${v.description}`);
    if (v.sensitive) lines.push('# SENSITIVE — set via TF_VAR_' + v.name + ' env var or Vault');
    const val = formatValue(v);
    const multiline = val.includes('\n');
    if (multiline) {
      lines.push(`${v.name} = ${val}`);
    } else {
      lines.push(`${v.name} = ${val}`);
    }
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

function generateVariablesTf(vars: TfVar[]): string {
  if (vars.length === 0) return '# No variables defined';

  return vars.map(v => {
    const parts: string[] = [`variable "${v.name}" {`];
    if (v.description) parts.push(`  description = "${v.description}"`);
    parts.push(`  type        = ${v.type}`);
    if (v.sensitive) parts.push('  sensitive   = true');
    if (v.defaultValue.trim() !== '' && !v.sensitive) {
      parts.push(`  default     = ${formatValue(v)}`);
    }
    parts.push('}');
    return parts.join('\n');
  }).join('\n\n');
}

export default function TerraformTfvarsGenerator() {
  const [vars, setVars] = useState<TfVar[]>(INITIAL_VARS);
  const [view, setView] = useState<'tfvars' | 'variables'>('tfvars');
  const [copied, setCopied] = useState(false);

  const output = view === 'tfvars' ? generateTfvars(vars) : generateVariablesTf(vars);

  const addVar = () => {
    setVars(v => [...v, { id: mkId(), name: '', type: 'string', description: '', defaultValue: '', sensitive: false }]);
  };

  const removeVar = (id: number) => setVars(v => v.filter(x => x.id !== id));

  const updateVar = (id: number, field: keyof TfVar, value: any) => {
    setVars(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-4">
      {/* Variable rows */}
      <div class="space-y-3">
        <div class="hidden sm:grid sm:grid-cols-[1fr_120px_1fr_1fr_80px_32px] gap-2 text-xs text-text-muted px-1">
          <span>Variable name</span>
          <span>Type</span>
          <span>Description</span>
          <span>Default value</span>
          <span>Sensitive</span>
          <span></span>
        </div>
        {vars.map(v => (
          <div key={v.id} class="grid grid-cols-1 sm:grid-cols-[1fr_120px_1fr_1fr_80px_32px] gap-2 items-center p-2 bg-surface border border-border rounded-lg">
            <input
              type="text"
              value={v.name}
              onInput={e => updateVar(v.id, 'name', (e.target as HTMLInputElement).value.replace(/\s/g, '_'))}
              placeholder="variable_name"
              class="font-mono text-sm bg-background border border-border rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <select
              value={v.type}
              onChange={e => updateVar(v.id, 'type', (e.target as HTMLSelectElement).value)}
              class="text-sm bg-background border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {(['string', 'number', 'bool', 'list(string)', 'map(string)', 'object'] as VarType[]).map(t => (
                <option value={t}>{t}</option>
              ))}
            </select>
            <input
              type="text"
              value={v.description}
              onInput={e => updateVar(v.id, 'description', (e.target as HTMLInputElement).value)}
              placeholder="Description"
              class="text-sm bg-background border border-border rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="text"
              value={v.defaultValue}
              onInput={e => updateVar(v.id, 'defaultValue', (e.target as HTMLInputElement).value)}
              placeholder={v.sensitive ? '(leave blank)' : 'default value'}
              disabled={v.sensitive}
              class="font-mono text-sm bg-background border border-border rounded px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-40"
            />
            <label class="flex items-center gap-1.5 cursor-pointer justify-center">
              <input
                type="checkbox"
                checked={v.sensitive}
                onChange={e => updateVar(v.id, 'sensitive', (e.target as HTMLInputElement).checked)}
                class="accent-accent"
              />
              <span class="text-xs text-text-muted">Sensitive</span>
            </label>
            <button
              onClick={() => removeVar(v.id)}
              class="text-xs px-1.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors text-center"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addVar}
          class="w-full py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add variable
        </button>
      </div>

      {/* Output toggle */}
      <div class="flex gap-2 items-center">
        <span class="text-sm text-text-muted">Generate:</span>
        <button
          onClick={() => setView('tfvars')}
          class={`px-3 py-1 text-sm rounded border transition-colors ${view === 'tfvars' ? 'bg-accent text-white border-accent' : 'bg-surface border-border hover:border-accent'}`}
        >
          terraform.tfvars
        </button>
        <button
          onClick={() => setView('variables')}
          class={`px-3 py-1 text-sm rounded border transition-colors ${view === 'variables' ? 'bg-accent text-white border-accent' : 'bg-surface border-border hover:border-accent'}`}
        >
          variables.tf
        </button>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">{view === 'tfvars' ? 'terraform.tfvars' : 'variables.tf'}</label>
          <button
            onClick={handleCopy}
            class={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${copied ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-surface border-border hover:border-accent'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="w-full font-mono text-sm bg-background border border-border rounded-lg p-4 overflow-x-auto whitespace-pre text-text leading-relaxed max-h-96 overflow-y-auto">{output}</pre>
      </div>

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Usage tips</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Save output as <code class="bg-background px-1 rounded">terraform.tfvars</code> in your module directory</li>
          <li>Sensitive variables: set via <code class="bg-background px-1 rounded">TF_VAR_name</code> environment variables instead</li>
          <li>For multiple environments: use <code class="bg-background px-1 rounded">prod.tfvars</code>, <code class="bg-background px-1 rounded">staging.tfvars</code> and run with <code class="bg-background px-1 rounded">terraform apply -var-file=prod.tfvars</code></li>
          <li>Never commit .tfvars files with real secrets — add to .gitignore</li>
        </ul>
      </div>
    </div>
  );
}
