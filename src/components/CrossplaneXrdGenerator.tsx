import { useState } from 'preact/hooks';

type VersionOption = 'v1alpha1' | 'v1beta1' | 'v1';
type ScopeOption = 'Cluster' | 'Namespaced';
type ParamType = 'string' | 'integer' | 'boolean' | 'object';
type CloudProvider = 'aws' | 'gcp' | 'azure';
type OutputTab = 'xrd' | 'composition' | 'claim';

interface SpecParam {
  id: string;
  name: string;
  type: ParamType;
  required: boolean;
  description: string;
  defaultValue: string;
}

interface ConnectionDetail {
  id: string;
  key: string;
}

let counter = 0;
function newId() { return `p-${++counter}`; }

function defaultParams(): SpecParam {
  return { id: newId(), name: '', type: 'string', required: false, description: '', defaultValue: '' };
}

function indent(n: number) { return ' '.repeat(n); }

function generateXrdYaml(
  group: string,
  kind: string,
  version: VersionOption,
  scope: ScopeOption,
  params: SpecParam[],
  claimEnabled: boolean,
  claimName: string,
  connectionDetails: ConnectionDetail[],
): string {
  const pluralKind = kind.toLowerCase() + 's';
  const claimPluralKind = claimName.toLowerCase() + 's';
  const lines: string[] = ['---'];
  lines.push(`apiVersion: apiextensions.crossplane.io/v1`);
  lines.push(`kind: CompositeResourceDefinition`);
  lines.push(`metadata:`);
  lines.push(`  name: ${pluralKind}.${group}`);
  lines.push(`spec:`);
  lines.push(`  group: ${group}`);
  lines.push(`  names:`);
  lines.push(`    kind: ${kind}`);
  lines.push(`    plural: ${pluralKind}`);
  lines.push(`  scope: ${scope}`);

  if (claimEnabled && claimName) {
    lines.push(`  claimNames:`);
    lines.push(`    kind: ${claimName}`);
    lines.push(`    plural: ${claimPluralKind}`);
  }

  if (connectionDetails.filter(c => c.key).length > 0) {
    lines.push(`  connectionSecretKeys:`);
    connectionDetails.filter(c => c.key).forEach(c => {
      lines.push(`    - ${c.key}`);
    });
  }

  lines.push(`  versions:`);
  lines.push(`    - name: ${version}`);
  lines.push(`      served: true`);
  lines.push(`      referenceable: true`);
  lines.push(`      schema:`);
  lines.push(`        openAPIV3Schema:`);
  lines.push(`          type: object`);
  lines.push(`          properties:`);
  lines.push(`            spec:`);
  lines.push(`              type: object`);

  if (params.filter(p => p.name).length > 0) {
    const requiredParams = params.filter(p => p.required && p.name);
    lines.push(`              properties:`);
    lines.push(`                parameters:`);
    lines.push(`                  type: object`);
    if (requiredParams.length > 0) {
      lines.push(`                  required:`);
      requiredParams.forEach(p => lines.push(`                    - ${p.name}`));
    }
    lines.push(`                  properties:`);
    params.filter(p => p.name).forEach(p => {
      lines.push(`                    ${p.name}:`);
      lines.push(`                      type: ${p.type}`);
      if (p.description) lines.push(`                      description: "${p.description}"`);
      if (p.defaultValue) {
        const val = p.type === 'boolean' ? p.defaultValue : p.type === 'integer' ? p.defaultValue : `"${p.defaultValue}"`;
        lines.push(`                      default: ${val}`);
      }
    });
  }

  lines.push(`            status:`);
  lines.push(`              type: object`);
  lines.push(`              properties:`);
  lines.push(`                conditions:`);
  lines.push(`                  description: Conditions of the resource.`);
  lines.push(`                  items:`);
  lines.push(`                    type: object`);
  lines.push(`                  type: array`);

  return lines.join('\n');
}

function generateCompositionYaml(
  group: string,
  kind: string,
  version: VersionOption,
  cloud: CloudProvider,
): string {
  const providerMap: Record<CloudProvider, { prefix: string; pkg: string }> = {
    aws: { prefix: 'aws', pkg: 'xpkg.upbound.io/upbound/provider-aws' },
    gcp: { prefix: 'gcp', pkg: 'xpkg.upbound.io/upbound/provider-gcp' },
    azure: { prefix: 'azure', pkg: 'xpkg.upbound.io/upbound/provider-azure' },
  };
  const { prefix } = providerMap[cloud];
  const pluralKind = kind.toLowerCase() + 's';

  const lines: string[] = ['---'];
  lines.push(`apiVersion: apiextensions.crossplane.io/v1`);
  lines.push(`kind: Composition`);
  lines.push(`metadata:`);
  lines.push(`  name: ${pluralKind}.${group}`);
  lines.push(`  labels:`);
  lines.push(`    crossplane.io/xrd: ${pluralKind}.${group}`);
  lines.push(`    provider: ${prefix}`);
  lines.push(`spec:`);
  lines.push(`  compositeTypeRef:`);
  lines.push(`    apiVersion: ${group}/${version}`);
  lines.push(`    kind: ${kind}`);
  lines.push(`  mode: Pipeline`);
  lines.push(`  pipeline:`);
  lines.push(`    - step: patch-and-transform`);
  lines.push(`      functionRef:`);
  lines.push(`        name: function-patch-and-transform`);
  lines.push(`      input:`);
  lines.push(`        apiVersion: pt.fn.crossplane.io/v1beta1`);
  lines.push(`        kind: Resources`);
  lines.push(`        resources:`);
  lines.push(`          - name: ${prefix}-resource`);
  lines.push(`            base:`);
  lines.push(`              apiVersion: ${prefix}.upbound.io/v1beta1`);
  lines.push(`              kind: Resource`);
  lines.push(`              spec:`);
  lines.push(`                forProvider:`);
  lines.push(`                  region: us-east-1  # patch from parameters`);
  lines.push(`                providerConfigRef:`);
  lines.push(`                  name: ${prefix}-provider-config`);
  lines.push(`            patches:`);
  lines.push(`              - type: FromCompositeFieldPath`);
  lines.push(`                fromFieldPath: spec.parameters.region`);
  lines.push(`                toFieldPath: spec.forProvider.region`);
  lines.push(`              - type: ToCompositeFieldPath`);
  lines.push(`                fromFieldPath: status.atProvider.id`);
  lines.push(`                toFieldPath: status.${prefix}ResourceId`);

  return lines.join('\n');
}

function generateClaimYaml(
  group: string,
  version: VersionOption,
  claimName: string,
  params: SpecParam[],
): string {
  const lines: string[] = ['---'];
  lines.push(`apiVersion: ${group}/${version}`);
  lines.push(`kind: ${claimName}`);
  lines.push(`metadata:`);
  lines.push(`  name: my-${claimName.toLowerCase()}`);
  lines.push(`  namespace: default`);
  lines.push(`spec:`);
  if (params.filter(p => p.name).length > 0) {
    lines.push(`  parameters:`);
    params.filter(p => p.name).forEach(p => {
      const val = p.defaultValue
        ? (p.type === 'boolean' ? p.defaultValue : p.type === 'integer' ? p.defaultValue : `"${p.defaultValue}"`)
        : (p.type === 'boolean' ? 'false' : p.type === 'integer' ? '1' : `"example-value"`);
      lines.push(`    ${p.name}: ${val}`);
    });
  } else {
    lines.push(`  parameters: {}`);
  }
  lines.push(`  compositeDeletePolicy: Background`);
  lines.push(`  writeConnectionSecretToRef:`);
  lines.push(`    name: my-${claimName.toLowerCase()}-secret`);

  return lines.join('\n');
}

export default function CrossplaneXrdGenerator() {
  const [group, setGroup] = useState('platform.example.com');
  const [kind, setKind] = useState('XDatabase');
  const [version, setVersion] = useState<VersionOption>('v1alpha1');
  const [scope, setScope] = useState<ScopeOption>('Cluster');
  const [params, setParams] = useState<SpecParam[]>([
    { id: newId(), name: 'region', type: 'string', required: true, description: 'Cloud region to deploy to', defaultValue: 'us-east-1' },
    { id: newId(), name: 'storageGB', type: 'integer', required: false, description: 'Storage size in GB', defaultValue: '20' },
    { id: newId(), name: 'multiAZ', type: 'boolean', required: false, description: 'Enable multi-AZ deployment', defaultValue: 'false' },
  ]);
  const [claimEnabled, setClaimEnabled] = useState(true);
  const [claimName, setClaimName] = useState('Database');
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetail[]>([
    { id: newId(), key: 'endpoint' },
    { id: newId(), key: 'username' },
    { id: newId(), key: 'password' },
  ]);
  const [activeTab, setActiveTab] = useState<OutputTab>('xrd');
  const [cloud, setCloud] = useState<CloudProvider>('aws');
  const [copied, setCopied] = useState(false);

  function addParam() {
    setParams(p => [...p, defaultParams()]);
  }
  function removeParam(id: string) {
    setParams(p => p.filter(x => x.id !== id));
  }
  function updateParam(id: string, field: keyof SpecParam, val: any) {
    setParams(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  function addConnectionDetail() {
    setConnectionDetails(c => [...c, { id: newId(), key: '' }]);
  }
  function removeConnectionDetail(id: string) {
    setConnectionDetails(c => c.filter(x => x.id !== id));
  }
  function updateConnectionDetail(id: string, val: string) {
    setConnectionDetails(c => c.map(x => x.id === id ? { ...x, key: val } : x));
  }

  const xrdYaml = generateXrdYaml(group, kind, version, scope, params, claimEnabled, claimName, connectionDetails);
  const compositionYaml = generateCompositionYaml(group, kind, version, cloud);
  const claimYaml = claimEnabled && claimName ? generateClaimYaml(group, version, claimName, params) : '# Enable Claim to generate Claim YAML';

  const activeYaml = activeTab === 'xrd' ? xrdYaml : activeTab === 'composition' ? compositionYaml : claimYaml;

  function copy() {
    navigator.clipboard.writeText(activeYaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';
  const labelCls = 'block text-xs font-medium mb-1 text-text-muted';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — config */}
      <div class="space-y-5">
        {/* XRD Identity */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3">XRD Identity</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>Group</label>
              <input value={group} onInput={e => setGroup((e.target as HTMLInputElement).value)}
                placeholder="platform.example.com" class={inputCls} />
            </div>
            <div>
              <label class={labelCls}>Kind</label>
              <input value={kind} onInput={e => setKind((e.target as HTMLInputElement).value)}
                placeholder="XDatabase" class={inputCls} />
            </div>
            <div>
              <label class={labelCls}>Version</label>
              <select value={version} onChange={e => setVersion((e.target as HTMLSelectElement).value as VersionOption)} class={inputCls}>
                <option value="v1alpha1">v1alpha1</option>
                <option value="v1beta1">v1beta1</option>
                <option value="v1">v1</option>
              </select>
            </div>
            <div>
              <label class={labelCls}>Scope</label>
              <select value={scope} onChange={e => setScope((e.target as HTMLSelectElement).value as ScopeOption)} class={inputCls}>
                <option value="Cluster">Cluster</option>
                <option value="Namespaced">Namespaced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Claim */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center gap-3 mb-3">
            <h3 class="text-sm font-semibold">Claim</h3>
            <label class="flex items-center gap-2 cursor-pointer ml-auto">
              <input type="checkbox" checked={claimEnabled} onChange={e => setClaimEnabled((e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span class="text-xs text-text-muted">Enable Claim</span>
            </label>
          </div>
          {claimEnabled && (
            <div>
              <label class={labelCls}>Claim Kind</label>
              <input value={claimName} onInput={e => setClaimName((e.target as HTMLInputElement).value)}
                placeholder="Database" class={inputCls} />
            </div>
          )}
        </div>

        {/* Spec Parameters */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">Spec Parameters</h3>
            <button onClick={addParam}
              class="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
              + Add
            </button>
          </div>
          <div class="space-y-3">
            {params.map(p => (
              <div key={p.id} class="p-3 rounded-lg border border-border bg-surface space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class={labelCls}>Name</label>
                    <input value={p.name} onInput={e => updateParam(p.id, 'name', (e.target as HTMLInputElement).value)}
                      placeholder="paramName" class={inputCls} />
                  </div>
                  <div>
                    <label class={labelCls}>Type</label>
                    <select value={p.type} onChange={e => updateParam(p.id, 'type', (e.target as HTMLSelectElement).value)} class={inputCls}>
                      <option value="string">string</option>
                      <option value="integer">integer</option>
                      <option value="boolean">boolean</option>
                      <option value="object">object</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class={labelCls}>Description</label>
                  <input value={p.description} onInput={e => updateParam(p.id, 'description', (e.target as HTMLInputElement).value)}
                    placeholder="Describe this parameter" class={inputCls} />
                </div>
                <div class="grid grid-cols-2 gap-2 items-center">
                  <div>
                    <label class={labelCls}>Default Value</label>
                    <input value={p.defaultValue} onInput={e => updateParam(p.id, 'defaultValue', (e.target as HTMLInputElement).value)}
                      placeholder="default" class={inputCls} />
                  </div>
                  <div class="flex items-center justify-between pt-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={p.required} onChange={e => updateParam(p.id, 'required', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                      <span class="text-xs text-text-muted">Required</span>
                    </label>
                    <button onClick={() => removeParam(p.id)}
                      class="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
                  </div>
                </div>
              </div>
            ))}
            {params.length === 0 && (
              <p class="text-xs text-text-muted text-center py-2">No parameters. Click + Add to add one.</p>
            )}
          </div>
        </div>

        {/* Connection Details */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">Connection Secret Keys</h3>
            <button onClick={addConnectionDetail}
              class="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
              + Add
            </button>
          </div>
          <div class="space-y-2">
            {connectionDetails.map(c => (
              <div key={c.id} class="flex items-center gap-2">
                <input value={c.key} onInput={e => updateConnectionDetail(c.id, (e.target as HTMLInputElement).value)}
                  placeholder="endpoint" class={inputCls} />
                <button onClick={() => removeConnectionDetail(c.id)}
                  class="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0">✕</button>
              </div>
            ))}
            {connectionDetails.length === 0 && (
              <p class="text-xs text-text-muted">No connection keys defined.</p>
            )}
          </div>
        </div>

        {/* Cloud Provider for Composition */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3">Composition Cloud Provider</h3>
          <div class="flex gap-3">
            {(['aws', 'gcp', 'azure'] as CloudProvider[]).map(c => (
              <button key={c} onClick={() => setCloud(c)}
                class={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${cloud === c ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}>
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right — output */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2 flex-wrap">
          {(['xrd', 'composition', 'claim'] as OutputTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              class={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${activeTab === tab ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}>
              {tab === 'xrd' ? 'XRD YAML' : tab === 'composition' ? 'Composition YAML' : 'Claim YAML'}
            </button>
          ))}
          <button onClick={copy}
            class="ml-auto px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto whitespace-pre text-text">
          {activeYaml}
        </pre>
      </div>
    </div>
  );
}
