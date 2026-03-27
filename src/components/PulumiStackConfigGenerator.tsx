import { useState } from 'preact/hooks';

type Runtime = 'nodejs' | 'python' | 'go' | 'dotnet';
type OutputTab = 'yaml' | 'cli';

interface ConfigEntry {
  id: number;
  key: string;
  value: string;
  isSecret: boolean;
}

interface ProviderConfig {
  id: number;
  provider: 'aws' | 'azure' | 'gcp' | 'custom';
  region: string;
  customKey: string;
  customValue: string;
}

const RUNTIME_LABELS: Record<Runtime, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  go: 'Go',
  dotnet: '.NET',
};

const PROVIDER_LABELS = {
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  custom: 'Custom',
};

const PROVIDER_REGION_KEY: Record<string, string> = {
  aws: 'aws:region',
  azure: 'azure:location',
  gcp: 'gcp:region',
};

const PROVIDER_REGION_PLACEHOLDER: Record<string, string> = {
  aws: 'us-east-1',
  azure: 'eastus',
  gcp: 'us-central1',
};

let nextId = 1;
function uid() { return nextId++; }

function generateYaml(opts: {
  projectName: string;
  stackName: string;
  runtime: Runtime;
  configEntries: ConfigEntry[];
  providerConfigs: ProviderConfig[];
}): string {
  const { projectName, stackName, runtime, configEntries, providerConfigs } = opts;

  const lines: string[] = [];
  lines.push(`# Pulumi.${stackName || 'dev'}.yaml`);
  lines.push(`# Project: ${projectName || 'my-project'}`);
  lines.push(`# Runtime: ${runtime}`);
  lines.push('');
  lines.push('config:');

  // Provider configs first
  for (const pc of providerConfigs) {
    if (pc.provider === 'custom') {
      if (pc.customKey && pc.customValue) {
        lines.push(`  ${pc.customKey}: ${pc.customValue}`);
      }
    } else {
      const key = PROVIDER_REGION_KEY[pc.provider];
      const val = pc.region || PROVIDER_REGION_PLACEHOLDER[pc.provider];
      lines.push(`  ${key}: ${val}`);
    }
  }

  // Config entries
  for (const entry of configEntries) {
    const key = entry.key || 'myapp:key';
    const value = entry.value || '';
    if (entry.isSecret) {
      lines.push(`  ${key}:`);
      lines.push(`    secure: enc:v1:${btoa(value || 'secret-value').slice(0, 24)}...`);
    } else {
      lines.push(`  ${key}: ${value}`);
    }
  }

  if (providerConfigs.length === 0 && configEntries.length === 0) {
    lines.push('  # No config entries yet');
    lines.push('  # aws:region: us-east-1');
    lines.push('  # myapp:instanceType: t3.medium');
  }

  return lines.join('\n');
}

function generateCli(opts: {
  stackName: string;
  configEntries: ConfigEntry[];
  providerConfigs: ProviderConfig[];
}): string {
  const { stackName, configEntries, providerConfigs } = opts;
  const stack = stackName || 'dev';
  const lines: string[] = [];

  lines.push(`# pulumi config set commands for stack: ${stack}`);
  lines.push(`# Run these commands after: pulumi stack select ${stack}`);
  lines.push('');

  for (const pc of providerConfigs) {
    if (pc.provider === 'custom') {
      if (pc.customKey && pc.customValue) {
        lines.push(`pulumi config set ${pc.customKey} ${pc.customValue}`);
      }
    } else {
      const key = PROVIDER_REGION_KEY[pc.provider];
      const val = pc.region || PROVIDER_REGION_PLACEHOLDER[pc.provider];
      lines.push(`pulumi config set ${key} ${val}`);
    }
  }

  if (providerConfigs.length > 0 && configEntries.length > 0) {
    lines.push('');
  }

  for (const entry of configEntries) {
    const key = entry.key || 'myapp:key';
    const value = entry.value || '';
    if (entry.isSecret) {
      lines.push(`pulumi config set --secret ${key} "${value || 'your-secret-value'}"`);
    } else {
      lines.push(`pulumi config set ${key} "${value}"`);
    }
  }

  if (providerConfigs.length === 0 && configEntries.length === 0) {
    lines.push('# pulumi config set aws:region us-east-1');
    lines.push('# pulumi config set myapp:instanceType t3.medium');
    lines.push('# pulumi config set --secret myapp:dbPassword "s3cr3t"');
  }

  return lines.join('\n');
}

export default function PulumiStackConfigGenerator() {
  const [projectName, setProjectName] = useState('my-project');
  const [stackName, setStackName] = useState('dev');
  const [customStack, setCustomStack] = useState('');
  const [runtime, setRuntime] = useState<Runtime>('nodejs');
  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([
    { id: uid(), key: 'myapp:instanceType', value: 't3.medium', isSecret: false },
  ]);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([
    { id: uid(), provider: 'aws', region: 'us-east-1', customKey: '', customValue: '' },
  ]);
  const [activeTab, setActiveTab] = useState<OutputTab>('yaml');
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const effectiveStack = stackName === 'custom' ? customStack : stackName;

  const yamlOutput = generateYaml({ projectName, stackName: effectiveStack, runtime, configEntries, providerConfigs });
  const cliOutput = generateCli({ stackName: effectiveStack, configEntries, providerConfigs });

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(yamlOutput);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliOutput);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  // Config entry helpers
  const addConfigEntry = () => {
    setConfigEntries(prev => [...prev, { id: uid(), key: '', value: '', isSecret: false }]);
  };

  const removeConfigEntry = (id: number) => {
    setConfigEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateConfigEntry = (id: number, patch: Partial<ConfigEntry>) => {
    setConfigEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  // Provider config helpers
  const addProviderConfig = () => {
    setProviderConfigs(prev => [...prev, { id: uid(), provider: 'aws', region: '', customKey: '', customValue: '' }]);
  };

  const removeProviderConfig = (id: number) => {
    setProviderConfigs(prev => prev.filter(p => p.id !== id));
  };

  const updateProviderConfig = (id: number, patch: Partial<ProviderConfig>) => {
    setProviderConfigs(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const STACK_PRESETS = ['dev', 'staging', 'prod', 'custom'];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Form */}
      <div class="space-y-5">
        {/* Project & Stack */}
        <div class="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 class="text-sm font-semibold text-text">Project Settings</h3>

          <div>
            <label class="block text-xs text-text-muted mb-1">Project Name</label>
            <input
              type="text"
              value={projectName}
              onInput={(e) => setProjectName((e.target as HTMLInputElement).value)}
              class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="my-project"
            />
          </div>

          <div>
            <label class="block text-xs text-text-muted mb-1">Stack Name</label>
            <div class="flex flex-wrap gap-1.5 mb-2">
              {STACK_PRESETS.map(s => (
                <button
                  key={s}
                  onClick={() => setStackName(s)}
                  class={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    stackName === s
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-text-muted hover:border-accent'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {stackName === 'custom' && (
              <input
                type="text"
                value={customStack}
                onInput={(e) => setCustomStack((e.target as HTMLInputElement).value)}
                class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="my-custom-stack"
              />
            )}
            <p class="text-xs text-text-muted mt-1">
              Generates: <code class="font-mono bg-surface px-1 rounded">Pulumi.{effectiveStack || 'dev'}.yaml</code>
            </p>
          </div>

          <div>
            <label class="block text-xs text-text-muted mb-1">Runtime</label>
            <div class="flex flex-wrap gap-1.5">
              {(Object.keys(RUNTIME_LABELS) as Runtime[]).map(r => (
                <button
                  key={r}
                  onClick={() => setRuntime(r)}
                  class={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    runtime === r
                      ? 'bg-accent text-white border-accent'
                      : 'bg-surface border-border text-text-muted hover:border-accent'
                  }`}
                >
                  {RUNTIME_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Provider Config */}
        <div class="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-text">Cloud Provider Config</h3>
            <button
              onClick={addProviderConfig}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg"
            >
              + Add Provider
            </button>
          </div>

          {providerConfigs.length === 0 && (
            <p class="text-xs text-text-muted italic">No provider config. Click Add Provider to configure AWS, Azure, or GCP.</p>
          )}

          {providerConfigs.map((pc) => (
            <div key={pc.id} class="bg-surface-alt border border-border rounded-lg p-3 space-y-2">
              <div class="flex items-center gap-2">
                <div class="flex gap-1">
                  {(['aws', 'azure', 'gcp', 'custom'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => updateProviderConfig(pc.id, { provider: p })}
                      class={`px-2 py-0.5 rounded text-xs border transition-colors ${
                        pc.provider === p
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface border-border text-text-muted hover:border-accent'
                      }`}
                    >
                      {PROVIDER_LABELS[p]}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => removeProviderConfig(pc.id)}
                  class="ml-auto text-text-muted hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
              </div>

              {pc.provider !== 'custom' ? (
                <div>
                  <label class="block text-xs text-text-muted mb-1">
                    {pc.provider === 'azure' ? 'Location' : 'Region'}
                  </label>
                  <input
                    type="text"
                    value={pc.region}
                    onInput={(e) => updateProviderConfig(pc.id, { region: (e.target as HTMLInputElement).value })}
                    class="w-full font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={PROVIDER_REGION_PLACEHOLDER[pc.provider]}
                  />
                  <p class="text-xs text-text-muted mt-0.5 font-mono">
                    Key: {PROVIDER_REGION_KEY[pc.provider]}
                  </p>
                </div>
              ) : (
                <div class="flex gap-2">
                  <div class="flex-1">
                    <label class="block text-xs text-text-muted mb-1">Key</label>
                    <input
                      type="text"
                      value={pc.customKey}
                      onInput={(e) => updateProviderConfig(pc.id, { customKey: (e.target as HTMLInputElement).value })}
                      class="w-full font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="provider:configKey"
                    />
                  </div>
                  <div class="flex-1">
                    <label class="block text-xs text-text-muted mb-1">Value</label>
                    <input
                      type="text"
                      value={pc.customValue}
                      onInput={(e) => updateProviderConfig(pc.id, { customValue: (e.target as HTMLInputElement).value })}
                      class="w-full font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="value"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Config Entries */}
        <div class="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-text">Config Entries</h3>
            <button
              onClick={addConfigEntry}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg"
            >
              + Add Entry
            </button>
          </div>

          {configEntries.length === 0 && (
            <p class="text-xs text-text-muted italic">No config entries. Click Add Entry to add key-value pairs.</p>
          )}

          {configEntries.map((entry) => (
            <div key={entry.id} class="bg-surface-alt border border-border rounded-lg p-3 space-y-2">
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-text-muted mb-1">Key</label>
                  <input
                    type="text"
                    value={entry.key}
                    onInput={(e) => updateConfigEntry(entry.id, { key: (e.target as HTMLInputElement).value })}
                    class="w-full font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder="myapp:instanceType"
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-text-muted mb-1">Value</label>
                  <input
                    type={entry.isSecret ? 'password' : 'text'}
                    value={entry.value}
                    onInput={(e) => updateConfigEntry(entry.id, { value: (e.target as HTMLInputElement).value })}
                    class="w-full font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    placeholder={entry.isSecret ? '••••••••' : 't3.medium'}
                  />
                </div>
              </div>
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => updateConfigEntry(entry.id, { isSecret: !entry.isSecret })}
                    class={`relative w-8 h-4 rounded-full transition-colors cursor-pointer ${
                      entry.isSecret ? 'bg-accent' : 'bg-surface border border-border'
                    }`}
                  >
                    <div class={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
                      entry.isSecret ? 'translate-x-4' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span class="text-xs text-text-muted">
                    {entry.isSecret ? (
                      <span class="text-accent font-medium">Secret (encrypted)</span>
                    ) : 'Mark as secret'}
                  </span>
                </label>
                <button
                  onClick={() => removeConfigEntry(entry.id)}
                  class="text-text-muted hover:text-red-400 text-xs transition-colors"
                >
                  Remove
                </button>
              </div>
              {entry.isSecret && (
                <p class="text-xs text-text-muted bg-surface rounded px-2 py-1 font-mono">
                  Will be stored as: <span class="text-accent">secure: enc:v1:...</span> in YAML
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Output */}
      <div class="space-y-3">
        {/* Tabs */}
        <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => setActiveTab('yaml')}
            class={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
              activeTab === 'yaml'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Pulumi.{effectiveStack || 'dev'}.yaml
          </button>
          <button
            onClick={() => setActiveTab('cli')}
            class={`flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors ${
              activeTab === 'cli'
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            pulumi config set (CLI)
          </button>
        </div>

        {activeTab === 'yaml' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-text-muted font-mono">
                Save as: <code class="bg-surface px-1 rounded">Pulumi.{effectiveStack || 'dev'}.yaml</code>
              </span>
              <button
                onClick={handleCopyYaml}
                class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
              >
                {copiedYaml ? '✓ Copied!' : 'Copy YAML'}
              </button>
            </div>
            <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text-muted whitespace-pre">{yamlOutput}</pre>
          </div>
        )}

        {activeTab === 'cli' && (
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-text-muted">
                Run in your project root after <code class="font-mono bg-surface px-1 rounded">pulumi stack select {effectiveStack || 'dev'}</code>
              </span>
              <button
                onClick={handleCopyCli}
                class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
              >
                {copiedCli ? '✓ Copied!' : 'Copy Commands'}
              </button>
            </div>
            <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text-muted whitespace-pre">{cliOutput}</pre>
          </div>
        )}

        {/* Info box */}
        <div class="bg-surface border border-border rounded-lg p-3 space-y-1.5">
          <p class="text-xs font-semibold text-text">How Pulumi stack config works</p>
          <ul class="text-xs text-text-muted space-y-1 list-disc list-inside">
            <li>Each stack has its own <code class="font-mono bg-surface-alt px-1 rounded">Pulumi.&lt;stack&gt;.yaml</code> file</li>
            <li>Secrets are encrypted with your stack's encryption key — never stored in plaintext</li>
            <li>Use <code class="font-mono bg-surface-alt px-1 rounded">namespace:key</code> format to avoid collisions (e.g. <code class="font-mono bg-surface-alt px-1 rounded">aws:region</code>)</li>
            <li>Access values in code: <code class="font-mono bg-surface-alt px-1 rounded">config.require("key")</code> or <code class="font-mono bg-surface-alt px-1 rounded">config.requireSecret("key")</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
