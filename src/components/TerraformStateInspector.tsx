import { useState } from 'preact/hooks';

const SAMPLE_STATE = JSON.stringify({
  "version": 4,
  "terraform_version": "1.7.0",
  "serial": 42,
  "lineage": "abc12345-1234-5678-abcd-ef0123456789",
  "resources": [
    {
      "module": "module.vpc",
      "mode": "managed",
      "type": "aws_vpc",
      "name": "main",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 1,
          "attributes": {
            "id": "vpc-0123456789abcdef0",
            "cidr_block": "10.0.0.0/16",
            "tags": { "Name": "main-vpc", "Environment": "production" }
          }
        }
      ]
    },
    {
      "mode": "managed",
      "type": "aws_s3_bucket",
      "name": "data",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "id": "my-data-bucket-prod",
            "bucket": "my-data-bucket-prod",
            "region": "us-east-1",
            "tags": { "Environment": "production" }
          }
        }
      ]
    },
    {
      "mode": "data",
      "type": "aws_ami",
      "name": "ubuntu",
      "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": { "id": "ami-0abcdef1234567890", "name": "ubuntu/images/hvm-ssd/ubuntu-22.04-amd64*" }
        }
      ]
    }
  ]
}, null, 2);

type TfResource = {
  module?: string;
  mode: 'managed' | 'data';
  type: string;
  name: string;
  provider: string;
  instances: any[];
};

type ParsedState = {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  resources: TfResource[];
};

type InspectionIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
};

function parseProvider(raw: string): string {
  const m = raw.match(/\/([^/]+)\]$/);
  return m ? m[1] : raw;
}

function inspectState(state: ParsedState): InspectionIssue[] {
  const issues: InspectionIssue[] = [];
  const managed = state.resources.filter(r => r.mode === 'managed');
  const dataOnly = state.resources.filter(r => r.mode === 'data');

  // Version check
  if (state.version < 4) {
    issues.push({ level: 'warning', message: `State format version ${state.version} is outdated. Terraform 1.x uses version 4. Run "terraform state replace-provider" and upgrade your state.` });
  }

  // Serial check — high serial can indicate frequent changes
  if (state.serial > 200) {
    issues.push({ level: 'info', message: `High state serial (${state.serial}). This means the state has been modified ${state.serial} times. Consider reviewing your automation for unnecessary state writes.` });
  }

  // Resources without modules
  const rootResources = managed.filter(r => !r.module);
  if (rootResources.length > 10) {
    issues.push({ level: 'warning', message: `${rootResources.length} managed resources at root level (no module). Consider organizing resources into modules for better maintainability and reuse.` });
  }

  // Multiple providers
  const providers = new Set(state.resources.map(r => parseProvider(r.provider)));
  if (providers.size > 3) {
    issues.push({ level: 'info', message: `${providers.size} providers used: ${[...providers].join(', ')}. Multi-provider states can be complex — ensure each provider's version is pinned in required_providers.` });
  }

  // Resources with 0 instances (potential drift)
  const emptyInstances = managed.filter(r => r.instances.length === 0);
  if (emptyInstances.length > 0) {
    emptyInstances.forEach(r => {
      issues.push({ level: 'warning', message: `Resource "${r.type}.${r.name}" has 0 instances in state — possible drift or tainted resource. Run "terraform plan" to check.` });
    });
  }

  // Large instance counts
  managed.forEach(r => {
    if (r.instances.length > 10) {
      issues.push({ level: 'info', message: `Resource "${r.type}.${r.name}" has ${r.instances.length} instances. Consider using count/for_each carefully to avoid state complexity.` });
    }
  });

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'State looks healthy — no structural issues detected.' });
  }
  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400' },
};

type Tab = 'resources' | 'analysis' | 'providers';

export default function TerraformStateInspector() {
  const [input, setInput] = useState(SAMPLE_STATE);
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [issues, setIssues] = useState<InspectionIssue[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('resources');

  const handleInspect = () => {
    try {
      const state = JSON.parse(input) as ParsedState;
      setParsed(state);
      setIssues(inspectState(state));
      setParseError(null);
    } catch (e) {
      setParseError(`Invalid JSON: ${(e as Error).message}`);
      setParsed(null);
      setIssues(null);
    }
  };

  const handleLoad = () => {
    setInput(SAMPLE_STATE);
    setParsed(null);
    setIssues(null);
    setParseError(null);
  };

  const handleClear = () => {
    setInput('');
    setParsed(null);
    setIssues(null);
    setParseError(null);
  };

  const managed = parsed?.resources.filter(r => r.mode === 'managed') ?? [];
  const dataResources = parsed?.resources.filter(r => r.mode === 'data') ?? [];
  const providers = parsed ? [...new Set(parsed.resources.map(r => parseProvider(r.provider)))] : [];
  const modules = parsed ? [...new Set(parsed.resources.map(r => r.module ?? '(root)'))] : [];

  const typeCount: Record<string, number> = {};
  managed.forEach(r => { typeCount[r.type] = (typeCount[r.type] ?? 0) + r.instances.length; });
  const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]);

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Terraform state file (terraform.tfstate or JSON output)</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setParsed(null); setIssues(null); setParseError(null); }}
          rows={14}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder='Paste your terraform.tfstate JSON here...'
          spellcheck={false}
        />
      </div>

      <button onClick={handleInspect} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Inspect State
      </button>

      {parseError && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          ✗ {parseError}
        </div>
      )}

      {parsed && issues && (
        <div class="space-y-4">
          {/* Stats */}
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Managed Resources', value: managed.reduce((s, r) => s + r.instances.length, 0) },
              { label: 'Data Sources', value: dataResources.length },
              { label: 'Providers', value: providers.length },
              { label: 'Modules', value: modules.length },
            ].map(stat => (
              <div key={stat.label} class="p-3 bg-surface border border-border rounded-lg text-center">
                <div class="text-2xl font-bold text-accent">{stat.value}</div>
                <div class="text-xs text-text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div class="flex flex-wrap gap-3 text-xs text-text-muted">
            <span>Terraform <strong class="text-text">{parsed.terraform_version}</strong></span>
            <span>State v<strong class="text-text">{parsed.version}</strong></span>
            <span>Serial <strong class="text-text">#{parsed.serial}</strong></span>
            <span class="font-mono opacity-70">{parsed.lineage}</span>
          </div>

          {/* Tabs */}
          <div class="flex border-b border-border">
            {(['resources', 'providers', 'analysis'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                class={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'resources' && (
            <div class="space-y-2">
              <p class="text-xs text-text-muted">Top resource types by instance count</p>
              {sortedTypes.slice(0, 15).map(([type, count]) => (
                <div key={type} class="flex items-center gap-3 p-2 bg-surface border border-border rounded-lg">
                  <span class="font-mono text-xs text-accent flex-1 truncate">{type}</span>
                  <span class="text-xs text-text-muted">{count} instance{count > 1 ? 's' : ''}</span>
                  <div class="w-16 bg-background rounded-full h-1.5">
                    <div class="bg-accent h-1.5 rounded-full" style={{ width: `${Math.min(100, (count / (sortedTypes[0]?.[1] ?? 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {parsed.resources.length > 0 && (
                <div class="mt-3 space-y-1">
                  <p class="text-xs text-text-muted font-medium">All resources</p>
                  <div class="max-h-48 overflow-y-auto space-y-1">
                    {parsed.resources.map((r, i) => (
                      <div key={i} class="flex items-center gap-2 text-xs font-mono p-1.5 rounded bg-surface border border-border">
                        <span class={`px-1 rounded text-xs ${r.mode === 'data' ? 'bg-blue-500/20 text-blue-400' : 'bg-accent/20 text-accent'}`}>
                          {r.mode === 'data' ? 'data' : 'rsrc'}
                        </span>
                        {r.module && <span class="text-text-muted">{r.module}.</span>}
                        <span class="text-text">{r.type}.{r.name}</span>
                        <span class="text-text-muted ml-auto">×{r.instances.length}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'providers' && (
            <div class="space-y-2">
              {providers.map(p => {
                const pResources = parsed.resources.filter(r => parseProvider(r.provider) === p);
                return (
                  <div key={p} class="p-3 bg-surface border border-border rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-mono text-sm text-accent">{p}</span>
                      <span class="text-xs text-text-muted">{pResources.length} resource type{pResources.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="flex flex-wrap gap-1">
                      {[...new Set(pResources.map(r => r.type))].map(t => (
                        <span key={t} class="font-mono text-xs px-1.5 py-0.5 bg-background border border-border rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {modules.length > 1 && (
                <div class="p-3 bg-surface border border-border rounded-lg">
                  <p class="text-sm font-medium text-text mb-2">Modules</p>
                  <div class="flex flex-wrap gap-1">
                    {modules.map(m => (
                      <span key={m} class="text-xs px-2 py-0.5 bg-accent/10 border border-accent/20 rounded text-accent">{m}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'analysis' && (
            <div class="space-y-2">
              {issues.map((issue, i) => {
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
          )}
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">How to get your state file</p>
        <ul class="space-y-1 list-disc list-inside font-mono">
          <li>Local: <span class="text-text">cat terraform.tfstate</span></li>
          <li>Remote: <span class="text-text">terraform state pull {'>'} state.json</span></li>
          <li>S3: <span class="text-text">aws s3 cp s3://bucket/path/terraform.tfstate -</span></li>
        </ul>
        <p class="mt-2 text-yellow-400/80">⚠ Never paste state files with real secrets into online tools. This tool runs 100% in your browser.</p>
      </div>
    </div>
  );
}
