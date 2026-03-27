import { useState } from 'preact/hooks';

type ComponentCategory = 'statestore' | 'pubsub' | 'secretstore' | 'binding';

interface SubType {
  value: string;
  label: string;
  defaultMetadata: MetadataField[];
}

interface MetadataField {
  name: string;
  value: string;
  isSecret: boolean;
}

interface ScopedApp {
  id: string;
  appId: string;
}

let counter = 0;
function newId() { return `d-${++counter}`; }

const COMPONENT_TYPES: Record<ComponentCategory, { label: string; apiType: string; subtypes: SubType[] }> = {
  statestore: {
    label: 'State Store',
    apiType: 'state',
    subtypes: [
      {
        value: 'redis', label: 'Redis',
        defaultMetadata: [
          { name: 'redisHost', value: 'localhost:6379', isSecret: false },
          { name: 'redisPassword', value: '', isSecret: true },
          { name: 'actorStateStore', value: 'true', isSecret: false },
        ],
      },
      {
        value: 'postgresql', label: 'PostgreSQL',
        defaultMetadata: [
          { name: 'connectionString', value: '', isSecret: true },
          { name: 'tableName', value: 'state', isSecret: false },
          { name: 'schema', value: 'public', isSecret: false },
        ],
      },
      {
        value: 'azure.blobstorage', label: 'Azure Blob Storage',
        defaultMetadata: [
          { name: 'accountName', value: 'mystorageaccount', isSecret: false },
          { name: 'accountKey', value: '', isSecret: true },
          { name: 'containerName', value: 'dapr-state', isSecret: false },
        ],
      },
      {
        value: 'aws.dynamodb', label: 'DynamoDB',
        defaultMetadata: [
          { name: 'accessKey', value: '', isSecret: true },
          { name: 'secretKey', value: '', isSecret: true },
          { name: 'region', value: 'us-east-1', isSecret: false },
          { name: 'table', value: 'dapr-state', isSecret: false },
        ],
      },
      {
        value: 'mongodb', label: 'MongoDB',
        defaultMetadata: [
          { name: 'host', value: 'localhost:27017', isSecret: false },
          { name: 'username', value: 'admin', isSecret: false },
          { name: 'password', value: '', isSecret: true },
          { name: 'databaseName', value: 'daprStore', isSecret: false },
          { name: 'collectionName', value: 'statestore', isSecret: false },
        ],
      },
    ],
  },
  pubsub: {
    label: 'Pub/Sub',
    apiType: 'pubsub',
    subtypes: [
      {
        value: 'redis', label: 'Redis Streams',
        defaultMetadata: [
          { name: 'redisHost', value: 'localhost:6379', isSecret: false },
          { name: 'redisPassword', value: '', isSecret: true },
          { name: 'enableTLS', value: 'false', isSecret: false },
        ],
      },
      {
        value: 'azure.servicebus.queues', label: 'Azure Service Bus',
        defaultMetadata: [
          { name: 'connectionString', value: '', isSecret: true },
          { name: 'consumerID', value: 'my-app', isSecret: false },
          { name: 'timeoutInSec', value: '60', isSecret: false },
        ],
      },
      {
        value: 'gcp.pubsub', label: 'GCP Pub/Sub',
        defaultMetadata: [
          { name: 'projectId', value: 'my-gcp-project', isSecret: false },
          { name: 'privateKeyId', value: '', isSecret: true },
          { name: 'privateKey', value: '', isSecret: true },
          { name: 'clientEmail', value: 'sa@project.iam.gserviceaccount.com', isSecret: false },
        ],
      },
      {
        value: 'kafka', label: 'Kafka',
        defaultMetadata: [
          { name: 'brokers', value: 'localhost:9092', isSecret: false },
          { name: 'consumerGroup', value: 'my-group', isSecret: false },
          { name: 'authType', value: 'none', isSecret: false },
        ],
      },
      {
        value: 'rabbitmq', label: 'RabbitMQ',
        defaultMetadata: [
          { name: 'host', value: 'amqp://localhost:5672', isSecret: false },
          { name: 'durable', value: 'true', isSecret: false },
          { name: 'deletedWhenUnused', value: 'false', isSecret: false },
        ],
      },
    ],
  },
  secretstore: {
    label: 'Secret Store',
    apiType: 'secretstores',
    subtypes: [
      {
        value: 'kubernetes', label: 'Kubernetes Secrets',
        defaultMetadata: [],
      },
      {
        value: 'hashicorp.vault', label: 'HashiCorp Vault',
        defaultMetadata: [
          { name: 'vaultAddr', value: 'https://vault.example.com:8200', isSecret: false },
          { name: 'vaultToken', value: '', isSecret: true },
          { name: 'vaultMountPath', value: 'secret', isSecret: false },
        ],
      },
      {
        value: 'azure.keyvault', label: 'Azure Key Vault',
        defaultMetadata: [
          { name: 'vaultName', value: 'my-keyvault', isSecret: false },
          { name: 'azureTenantId', value: '', isSecret: false },
          { name: 'azureClientId', value: '', isSecret: false },
          { name: 'azureClientSecret', value: '', isSecret: true },
        ],
      },
      {
        value: 'aws.secretmanager', label: 'AWS Secrets Manager',
        defaultMetadata: [
          { name: 'accessKey', value: '', isSecret: true },
          { name: 'secretKey', value: '', isSecret: true },
          { name: 'region', value: 'us-east-1', isSecret: false },
        ],
      },
    ],
  },
  binding: {
    label: 'Binding',
    apiType: 'bindings',
    subtypes: [
      {
        value: 'http', label: 'HTTP',
        defaultMetadata: [
          { name: 'url', value: 'https://api.example.com', isSecret: false },
          { name: 'method', value: 'POST', isSecret: false },
        ],
      },
      {
        value: 'kafka', label: 'Kafka',
        defaultMetadata: [
          { name: 'brokers', value: 'localhost:9092', isSecret: false },
          { name: 'topics', value: 'my-topic', isSecret: false },
          { name: 'consumerGroup', value: 'my-group', isSecret: false },
        ],
      },
      {
        value: 'azure.storagequeues', label: 'Azure Storage Queue',
        defaultMetadata: [
          { name: 'accountName', value: 'mystorageaccount', isSecret: false },
          { name: 'accountKey', value: '', isSecret: true },
          { name: 'queueName', value: 'myqueue', isSecret: false },
        ],
      },
      {
        value: 'cron', label: 'CRON',
        defaultMetadata: [
          { name: 'schedule', value: '@every 15m', isSecret: false },
        ],
      },
    ],
  },
};

function generateYaml(
  category: ComponentCategory,
  subTypeValue: string,
  name: string,
  namespace: string,
  metadata: MetadataField[],
  scopedApps: ScopedApp[],
  authSecretName: string,
  authSecretKey: string,
): string {
  const catDef = COMPONENT_TYPES[category];
  const sub = catDef.subtypes.find(s => s.value === subTypeValue) ?? catDef.subtypes[0];
  const componentType = `${catDef.apiType}.${sub.value}`;

  const lines: string[] = ['---'];
  lines.push(`apiVersion: dapr.io/v1alpha1`);
  lines.push(`kind: Component`);
  lines.push(`metadata:`);
  lines.push(`  name: ${name || 'my-component'}`);
  lines.push(`  namespace: ${namespace || 'default'}`);
  lines.push(`spec:`);
  lines.push(`  type: ${componentType}`);
  lines.push(`  version: v1`);

  const activeMetadata = metadata.filter(m => m.name);

  if (activeMetadata.length > 0) {
    lines.push(`  metadata:`);
    activeMetadata.forEach(m => {
      lines.push(`  - name: ${m.name}`);
      if (m.isSecret && (authSecretName || m.value === '')) {
        if (authSecretName) {
          lines.push(`    secretKeyRef:`);
          lines.push(`      name: ${authSecretName}`);
          lines.push(`      key: ${authSecretKey || m.name}`);
        } else {
          lines.push(`    value: "${m.value}"`);
        }
      } else {
        lines.push(`    value: "${m.value}"`);
      }
    });
  } else {
    lines.push(`  metadata: []`);
  }

  const activeScopes = scopedApps.filter(s => s.appId);
  if (activeScopes.length > 0) {
    lines.push(`scopes:`);
    activeScopes.forEach(s => lines.push(`  - ${s.appId}`));
  }

  return lines.join('\n');
}

export default function DaprComponentConfigGenerator() {
  const [category, setCategory] = useState<ComponentCategory>('statestore');
  const [subTypeValue, setSubTypeValue] = useState<string>('redis');
  const [name, setName] = useState('statestore');
  const [namespace, setNamespace] = useState('default');
  const [metadata, setMetadata] = useState<MetadataField[]>(
    COMPONENT_TYPES.statestore.subtypes[0].defaultMetadata
  );
  const [scopedApps, setScopedApps] = useState<ScopedApp[]>([]);
  const [authSecretName, setAuthSecretName] = useState('');
  const [authSecretKey, setAuthSecretKey] = useState('');
  const [copied, setCopied] = useState(false);

  function handleCategoryChange(newCat: ComponentCategory) {
    setCategory(newCat);
    const firstSub = COMPONENT_TYPES[newCat].subtypes[0];
    setSubTypeValue(firstSub.value);
    setMetadata(firstSub.defaultMetadata.map(m => ({ ...m })));
    setName(newCat === 'statestore' ? 'statestore' : newCat === 'pubsub' ? 'pubsub' : newCat === 'secretstore' ? 'secretstore' : 'binding');
  }

  function handleSubTypeChange(val: string) {
    setSubTypeValue(val);
    const sub = COMPONENT_TYPES[category].subtypes.find(s => s.value === val);
    if (sub) setMetadata(sub.defaultMetadata.map(m => ({ ...m })));
  }

  function updateMetadata(idx: number, field: keyof MetadataField, val: any) {
    setMetadata(m => m.map((item, i) => i === idx ? { ...item, [field]: val } : item));
  }

  function addMetadata() {
    setMetadata(m => [...m, { name: '', value: '', isSecret: false }]);
  }

  function removeMetadata(idx: number) {
    setMetadata(m => m.filter((_, i) => i !== idx));
  }

  function addScopedApp() {
    setScopedApps(s => [...s, { id: newId(), appId: '' }]);
  }

  function removeScopedApp(id: string) {
    setScopedApps(s => s.filter(x => x.id !== id));
  }

  function updateScopedApp(id: string, val: string) {
    setScopedApps(s => s.map(x => x.id === id ? { ...x, appId: val } : x));
  }

  const yaml = generateYaml(category, subTypeValue, name, namespace, metadata, scopedApps, authSecretName, authSecretKey);

  function copy() {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';
  const labelCls = 'block text-xs font-medium mb-1 text-text-muted';

  const currentSubtypes = COMPONENT_TYPES[category].subtypes;

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — config */}
      <div class="space-y-5">
        {/* Component Type */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3">Component Type</h3>
          <div class="flex flex-wrap gap-2 mb-3">
            {(Object.keys(COMPONENT_TYPES) as ComponentCategory[]).map(cat => (
              <button key={cat} onClick={() => handleCategoryChange(cat)}
                class={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${category === cat ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}>
                {COMPONENT_TYPES[cat].label}
              </button>
            ))}
          </div>
          <div>
            <label class={labelCls}>Sub-type</label>
            <select value={subTypeValue} onChange={e => handleSubTypeChange((e.target as HTMLSelectElement).value)} class={inputCls}>
              {currentSubtypes.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Identity */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-3">Component Identity</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>Component Name</label>
              <input value={name} onInput={e => setName((e.target as HTMLInputElement).value)}
                placeholder="statestore" class={inputCls} />
            </div>
            <div>
              <label class={labelCls}>Namespace</label>
              <input value={namespace} onInput={e => setNamespace((e.target as HTMLInputElement).value)}
                placeholder="default" class={inputCls} />
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">Metadata Fields</h3>
            <button onClick={addMetadata}
              class="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
              + Add
            </button>
          </div>
          <div class="space-y-2">
            {metadata.map((m, i) => (
              <div key={i} class="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                <input value={m.name} onInput={e => updateMetadata(i, 'name', (e.target as HTMLInputElement).value)}
                  placeholder="key" class={inputCls} />
                <input value={m.value} onInput={e => updateMetadata(i, 'value', (e.target as HTMLInputElement).value)}
                  placeholder="value" class={inputCls} />
                <label class="flex items-center gap-1 cursor-pointer shrink-0" title="Mark as secret (use secretKeyRef)">
                  <input type="checkbox" checked={m.isSecret} onChange={e => updateMetadata(i, 'isSecret', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                  <span class="text-xs text-text-muted">secret</span>
                </label>
                <button onClick={() => removeMetadata(i)}
                  class="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0">✕</button>
              </div>
            ))}
            {metadata.length === 0 && (
              <p class="text-xs text-text-muted text-center py-2">No metadata fields. Click + Add to add one.</p>
            )}
          </div>
        </div>

        {/* Auth Secret Reference */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold mb-1">Auth Secret Reference</h3>
          <p class="text-xs text-text-muted mb-3">If set, secret metadata fields will use secretKeyRef instead of inline values.</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelCls}>Secret Name</label>
              <input value={authSecretName} onInput={e => setAuthSecretName((e.target as HTMLInputElement).value)}
                placeholder="my-component-secret" class={inputCls} />
            </div>
            <div>
              <label class={labelCls}>Default Key</label>
              <input value={authSecretKey} onInput={e => setAuthSecretKey((e.target as HTMLInputElement).value)}
                placeholder="password" class={inputCls} />
            </div>
          </div>
        </div>

        {/* Scoped Apps */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-sm font-semibold">Scoped Apps</h3>
              <p class="text-xs text-text-muted mt-0.5">Restrict this component to specific app IDs.</p>
            </div>
            <button onClick={addScopedApp}
              class="px-3 py-1 rounded-lg bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
              + Add
            </button>
          </div>
          <div class="space-y-2">
            {scopedApps.map(s => (
              <div key={s.id} class="flex items-center gap-2">
                <input value={s.appId} onInput={e => updateScopedApp(s.id, (e.target as HTMLInputElement).value)}
                  placeholder="my-app-id" class={inputCls} />
                <button onClick={() => removeScopedApp(s.id)}
                  class="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0">✕</button>
              </div>
            ))}
            {scopedApps.length === 0 && (
              <p class="text-xs text-text-muted">No scopes — component is available to all apps.</p>
            )}
          </div>
        </div>
      </div>

      {/* Right — output */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text-muted">
            Dapr Component YAML — <span class="font-mono text-xs">{COMPONENT_TYPES[category].apiType}.{subTypeValue}</span>
          </span>
          <button onClick={copy}
            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto whitespace-pre text-text">
          {yaml}
        </pre>
      </div>
    </div>
  );
}
