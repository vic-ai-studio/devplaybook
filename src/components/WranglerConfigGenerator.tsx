import { useState } from 'preact/hooks';

interface KVNamespace { binding: string; id: string; previewId: string }
interface D1Database { binding: string; databaseName: string; databaseId: string }
interface R2Bucket { binding: string; bucketName: string }
interface EnvVar { key: string; value: string }

type WorkerType = 'worker' | 'pages' | 'durable';
type CompatibilityDate = '2024-09-23' | '2024-01-01' | '2023-12-01' | '2023-07-01';

export default function WranglerConfigGenerator() {
  const [workerType, setWorkerType] = useState<WorkerType>('worker');
  const [name, setName] = useState('my-worker');
  const [compatDate, setCompatDate] = useState<CompatibilityDate>('2024-09-23');
  const [mainFile, setMainFile] = useState('src/index.ts');
  const [nodeCompat, setNodeCompat] = useState(false);
  const [kvNamespaces, setKvNamespaces] = useState<KVNamespace[]>([]);
  const [d1Databases, setD1Databases] = useState<D1Database[]>([]);
  const [r2Buckets, setR2Buckets] = useState<R2Bucket[]>([]);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [routes, setRoutes] = useState('');
  const [copied, setCopied] = useState(false);

  function generateToml(): string {
    const lines: string[] = [];
    lines.push(`name = "${name}"`);

    if (workerType === 'pages') {
      lines.push(`pages_build_output_dir = "./dist"`);
    } else {
      lines.push(`main = "${mainFile}"`);
    }

    lines.push(`compatibility_date = "${compatDate}"`);

    if (nodeCompat) {
      lines.push(`node_compat = true`);
    }

    if (workerType === 'durable') {
      lines.push('');
      lines.push('[durable_objects]');
      lines.push('bindings = [');
      lines.push('  { name = "MY_DO", class_name = "MyDurableObject" }');
      lines.push(']');
      lines.push('');
      lines.push('[[migrations]]');
      lines.push('tag = "v1"');
      lines.push('new_classes = ["MyDurableObject"]');
    }

    if (kvNamespaces.length > 0) {
      lines.push('');
      kvNamespaces.forEach(kv => {
        lines.push('[[kv_namespaces]]');
        lines.push(`binding = "${kv.binding}"`);
        lines.push(`id = "${kv.id || 'YOUR_KV_NAMESPACE_ID'}"`);
        if (kv.previewId) {
          lines.push(`preview_id = "${kv.previewId}"`);
        }
      });
    }

    if (d1Databases.length > 0) {
      lines.push('');
      d1Databases.forEach(db => {
        lines.push('[[d1_databases]]');
        lines.push(`binding = "${db.binding}"`);
        lines.push(`database_name = "${db.databaseName || 'my-database'}"`);
        lines.push(`database_id = "${db.databaseId || 'YOUR_D1_DATABASE_ID'}"`);
      });
    }

    if (r2Buckets.length > 0) {
      lines.push('');
      r2Buckets.forEach(r2 => {
        lines.push('[[r2_buckets]]');
        lines.push(`binding = "${r2.binding}"`);
        lines.push(`bucket_name = "${r2.bucketName || 'my-bucket'}"`);
      });
    }

    if (envVars.length > 0) {
      lines.push('');
      lines.push('[vars]');
      envVars.forEach(v => {
        lines.push(`${v.key} = "${v.value}"`);
      });
    }

    if (routes.trim()) {
      lines.push('');
      routes.split('\n').filter(r => r.trim()).forEach(route => {
        lines.push('[[routes]]');
        lines.push(`pattern = "${route.trim()}"`);
        lines.push(`zone_name = "example.com"`);
      });
    }

    // Dev and prod environments
    lines.push('');
    lines.push('[env.production]');
    lines.push('# Override settings for production');
    lines.push(`name = "${name}-production"`);

    lines.push('');
    lines.push('[env.staging]');
    lines.push(`name = "${name}-staging"`);

    return lines.join('\n');
  }

  const output = generateToml();

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wrangler.toml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelCls = 'block text-sm font-medium text-text-muted mb-1';
  const inputCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono';
  const selectCls = inputCls + ' cursor-pointer';
  const btnSmCls = 'px-2 py-1 text-xs bg-bg-card border border-border rounded hover:border-primary transition-colors';

  const addKv = () => setKvNamespaces(prev => [...prev, { binding: 'KV', id: '', previewId: '' }]);
  const removeKv = (i: number) => setKvNamespaces(prev => prev.filter((_, idx) => idx !== i));

  const addD1 = () => setD1Databases(prev => [...prev, { binding: 'DB', databaseName: '', databaseId: '' }]);
  const removeD1 = (i: number) => setD1Databases(prev => prev.filter((_, idx) => idx !== i));

  const addR2 = () => setR2Buckets(prev => [...prev, { binding: 'BUCKET', bucketName: '' }]);
  const removeR2 = (i: number) => setR2Buckets(prev => prev.filter((_, idx) => idx !== i));

  const addEnv = () => setEnvVars(prev => [...prev, { key: 'API_KEY', value: 'your-value' }]);
  const removeEnv = (i: number) => setEnvVars(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div class="space-y-6">
      {/* Basic config */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class={labelCls}>Worker Type</label>
          <select class={selectCls} value={workerType} onChange={e => setWorkerType((e.target as HTMLSelectElement).value as WorkerType)}>
            <option value="worker">Cloudflare Worker</option>
            <option value="pages">Cloudflare Pages</option>
            <option value="durable">Durable Objects</option>
          </select>
        </div>
        <div>
          <label class={labelCls}>Worker Name</label>
          <input class={inputCls} type="text" value={name} onInput={e => setName((e.target as HTMLInputElement).value)} placeholder="my-worker" />
        </div>
        <div>
          <label class={labelCls}>Compatibility Date</label>
          <select class={selectCls} value={compatDate} onChange={e => setCompatDate((e.target as HTMLSelectElement).value as CompatibilityDate)}>
            <option value="2024-09-23">2024-09-23 (latest stable)</option>
            <option value="2024-01-01">2024-01-01</option>
            <option value="2023-12-01">2023-12-01</option>
            <option value="2023-07-01">2023-07-01</option>
          </select>
        </div>
        {workerType !== 'pages' && (
          <div>
            <label class={labelCls}>Main Entry File</label>
            <input class={inputCls} type="text" value={mainFile} onInput={e => setMainFile((e.target as HTMLInputElement).value)} placeholder="src/index.ts" />
          </div>
        )}
        <div class="flex items-center gap-3">
          <input type="checkbox" id="nodeCompat" checked={nodeCompat} onChange={e => setNodeCompat((e.target as HTMLInputElement).checked)} class="w-4 h-4 accent-primary" />
          <label for="nodeCompat" class="text-sm text-text-muted cursor-pointer">Enable Node.js compatibility</label>
        </div>
      </div>

      {/* KV Namespaces */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>KV Namespaces</label>
          <button onClick={addKv} class={btnSmCls}>+ Add KV</button>
        </div>
        {kvNamespaces.map((kv, i) => (
          <div key={i} class="flex gap-2 mb-2">
            <input class={inputCls + ' flex-1'} placeholder="Binding (e.g. KV)" value={kv.binding} onInput={e => { const v = [...kvNamespaces]; v[i].binding = (e.target as HTMLInputElement).value; setKvNamespaces(v); }} />
            <input class={inputCls + ' flex-1'} placeholder="Namespace ID" value={kv.id} onInput={e => { const v = [...kvNamespaces]; v[i].id = (e.target as HTMLInputElement).value; setKvNamespaces(v); }} />
            <button onClick={() => removeKv(i)} class="px-2 py-1 text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>

      {/* D1 Databases */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>D1 Databases</label>
          <button onClick={addD1} class={btnSmCls}>+ Add D1</button>
        </div>
        {d1Databases.map((db, i) => (
          <div key={i} class="flex gap-2 mb-2">
            <input class={inputCls + ' flex-1'} placeholder="Binding (e.g. DB)" value={db.binding} onInput={e => { const v = [...d1Databases]; v[i].binding = (e.target as HTMLInputElement).value; setD1Databases(v); }} />
            <input class={inputCls + ' flex-1'} placeholder="Database name" value={db.databaseName} onInput={e => { const v = [...d1Databases]; v[i].databaseName = (e.target as HTMLInputElement).value; setD1Databases(v); }} />
            <input class={inputCls + ' flex-1'} placeholder="Database ID" value={db.databaseId} onInput={e => { const v = [...d1Databases]; v[i].databaseId = (e.target as HTMLInputElement).value; setD1Databases(v); }} />
            <button onClick={() => removeD1(i)} class="px-2 py-1 text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>

      {/* R2 Buckets */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>R2 Buckets</label>
          <button onClick={addR2} class={btnSmCls}>+ Add R2</button>
        </div>
        {r2Buckets.map((r2, i) => (
          <div key={i} class="flex gap-2 mb-2">
            <input class={inputCls + ' flex-1'} placeholder="Binding (e.g. BUCKET)" value={r2.binding} onInput={e => { const v = [...r2Buckets]; v[i].binding = (e.target as HTMLInputElement).value; setR2Buckets(v); }} />
            <input class={inputCls + ' flex-1'} placeholder="Bucket name" value={r2.bucketName} onInput={e => { const v = [...r2Buckets]; v[i].bucketName = (e.target as HTMLInputElement).value; setR2Buckets(v); }} />
            <button onClick={() => removeR2(i)} class="px-2 py-1 text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>

      {/* Environment Variables */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>Environment Variables (vars)</label>
          <button onClick={addEnv} class={btnSmCls}>+ Add Var</button>
        </div>
        {envVars.map((v, i) => (
          <div key={i} class="flex gap-2 mb-2">
            <input class={inputCls + ' flex-1'} placeholder="KEY" value={v.key} onInput={e => { const arr = [...envVars]; arr[i].key = (e.target as HTMLInputElement).value; setEnvVars(arr); }} />
            <input class={inputCls + ' flex-1'} placeholder="value" value={v.value} onInput={e => { const arr = [...envVars]; arr[i].value = (e.target as HTMLInputElement).value; setEnvVars(arr); }} />
            <button onClick={() => removeEnv(i)} class="px-2 py-1 text-xs text-red-400 hover:text-red-600">✕</button>
          </div>
        ))}
      </div>

      {/* Routes */}
      <div>
        <label class={labelCls}>Routes (one per line, e.g. example.com/api/*)</label>
        <textarea
          class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
          placeholder="example.com/api/*"
          value={routes}
          onInput={e => setRoutes((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">wrangler.toml output</label>
          <div class="flex gap-2">
            <button onClick={copy} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={download} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
              ↓ Download wrangler.toml
            </button>
          </div>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  );
}
