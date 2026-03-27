import { useState } from 'preact/hooks';

type TfType = 'string' | 'number' | 'bool' | 'list(string)' | 'list(number)' | 'map(string)' | 'any';

function inferTfType(value: unknown): TfType {
  if (value === null || value === undefined) return 'any';
  if (typeof value === 'boolean') return 'bool';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'list(string)';
    const allNumbers = value.every(v => typeof v === 'number');
    if (allNumbers) return 'list(number)';
    return 'list(string)';
  }
  if (typeof value === 'object') return 'map(string)';
  return 'string';
}

function formatTfValue(value: unknown, type: TfType): string {
  if (value === null || value === undefined) return '""';
  if (type === 'bool') return String(value);
  if (type === 'number') return String(value);
  if (type === 'string') return `"${String(value).replace(/"/g, '\\"')}"`;
  if (type === 'list(string)' || type === 'list(number)') {
    if (Array.isArray(value)) {
      const items = value.map(v => type === 'list(number)' ? String(v) : `"${String(v).replace(/"/g, '\\"')}"`);
      return `[${items.join(', ')}]`;
    }
    return '[]';
  }
  if (type === 'map(string)') {
    if (typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => `    ${k} = "${String(v).replace(/"/g, '\\"')}"`);
      return entries.length > 0 ? `{\n${entries.join('\n')}\n  }` : '{}';
    }
    return '{}';
  }
  return `"${String(value)}"`;
}

interface VarEntry {
  name: string;
  type: TfType;
  value: unknown;
  description: string;
}

const EXAMPLE_JSON = `{
  "region": "us-east-1",
  "instance_count": 3,
  "enable_monitoring": true,
  "allowed_ips": ["10.0.0.1", "10.0.0.2"],
  "tags": {
    "env": "production",
    "team": "platform"
  },
  "app_name": "my-service",
  "min_size": 1,
  "max_size": 10
}`;

export default function TerraformVariableSchema() {
  const [input, setInput] = useState('');
  const [vars, setVars] = useState<VarEntry[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'variables' | 'tfvars'>('variables');
  const [copiedVars, setCopiedVars] = useState(false);
  const [copiedTfvars, setCopiedTfvars] = useState(false);

  function parseInput() {
    setError('');
    const trimmed = input.trim();
    if (!trimmed) {
      setError('Please paste a JSON object above.');
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      setError(`Invalid JSON: ${(e as Error).message}`);
      return;
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      setError('Input must be a JSON object (not an array or primitive).');
      return;
    }

    const entries: VarEntry[] = Object.entries(parsed as Record<string, unknown>).map(([key, val]) => ({
      name: key,
      type: inferTfType(val),
      value: val,
      description: `The ${key.replace(/_/g, ' ')} value`,
    }));

    setVars(entries);
  }

  function loadExample() {
    setInput(EXAMPLE_JSON);
    setError('');
  }

  function updateType(name: string, type: TfType) {
    setVars(vs => vs.map(v => v.name === name ? { ...v, type } : v));
  }

  function updateDescription(name: string, desc: string) {
    setVars(vs => vs.map(v => v.name === name ? { ...v, description: desc } : v));
  }

  function generateVariablesTf(): string {
    if (vars.length === 0) return '# Paste JSON above and click Generate';
    return vars.map(v => [
      `variable "${v.name}" {`,
      `  type        = ${v.type}`,
      `  description = "${v.description.replace(/"/g, '\\"')}"`,
      `}`,
    ].join('\n')).join('\n\n');
  }

  function generateTfvars(): string {
    if (vars.length === 0) return '# Paste JSON above and click Generate';
    return vars.map(v => `${v.name} = ${formatTfValue(v.value, v.type)}`).join('\n');
  }

  const variablesTf = generateVariablesTf();
  const tfvars = generateTfvars();

  function copyVars() {
    navigator.clipboard.writeText(variablesTf).then(() => {
      setCopiedVars(true);
      setTimeout(() => setCopiedVars(false), 2000);
    });
  }

  function copyTfvars() {
    navigator.clipboard.writeText(tfvars).then(() => {
      setCopiedTfvars(true);
      setTimeout(() => setCopiedTfvars(false), 2000);
    });
  }

  const TYPE_OPTIONS: TfType[] = ['string', 'number', 'bool', 'list(string)', 'list(number)', 'map(string)', 'any'];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Input JSON Object</label>
          <button onClick={loadExample} class="text-xs px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-text-muted hover:border-accent transition-colors">
            Load Example
          </button>
        </div>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={10}
          placeholder={'{\n  "region": "us-east-1",\n  "instance_count": 3,\n  "enable_monitoring": true\n}'}
          class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
        />
        {error && <p class="mt-2 text-red-400 text-sm">{error}</p>}
        <button
          onClick={parseInput}
          class="mt-3 px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Generate Terraform Files
        </button>
      </div>

      {/* Type Overrides */}
      {vars.length > 0 && (
        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3">Inferred Variables — Override Types &amp; Descriptions</h3>
          <div class="space-y-3">
            {vars.map(v => (
              <div key={v.name} class="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-3 rounded-lg bg-surface-alt border border-border">
                <div>
                  <label class="block text-xs text-text-muted mb-1 font-mono">{v.name}</label>
                  <select value={v.type} onChange={e => updateType(v.name, (e.target as HTMLSelectElement).value as TfType)}
                    class="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono">
                    {TYPE_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div class="md:col-span-2">
                  <label class="block text-xs text-text-muted mb-1">Description</label>
                  <input value={v.description} onInput={e => updateDescription(v.name, (e.target as HTMLInputElement).value)}
                    class="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Tabs */}
      <div>
        <div class="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('variables')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'variables' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:border-accent'}`}
          >
            variables.tf
          </button>
          <button
            onClick={() => setActiveTab('tfvars')}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tfvars' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:border-accent'}`}
          >
            terraform.tfvars
          </button>
        </div>

        {activeTab === 'variables' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-text-muted">variables.tf</label>
              <button onClick={copyVars} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
                {copiedVars ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="p-4 rounded-xl bg-surface border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">{variablesTf}</pre>
          </div>
        )}

        {activeTab === 'tfvars' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-text-muted">terraform.tfvars</label>
              <button onClick={copyTfvars} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
                {copiedTfvars ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="p-4 rounded-xl bg-surface border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">{tfvars}</pre>
          </div>
        )}
      </div>

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Note</p>
        <p class="text-text-muted text-xs">This tool auto-infers types from JSON values. Complex nested objects are mapped to <code class="font-mono">map(string)</code> — adjust the type selector for <code class="font-mono">object(&#123;...&#125;)</code> types as needed. Add default values manually in variables.tf if required.</p>
      </div>
    </div>
  );
}
