import { useState, useCallback, useRef } from 'preact/hooks';

interface KVEntry {
  value: string;
  metadata?: string;
  expirationTtl?: number;
  createdAt: number;
}

interface KVStore {
  [namespace: string]: {
    [key: string]: KVEntry;
  };
}

interface LogEntry {
  ts: number;
  op: string;
  key?: string;
  result: string;
  code: string;
  isError: boolean;
}

type Operation = 'get' | 'put' | 'delete' | 'list' | 'getWithMetadata';

function generateSnippet(ns: string, op: Operation, key: string, value: string, metadata: string, ttl: string): string {
  switch (op) {
    case 'get':
      return `// Get a value from KV
const value = await env.${ns}.get('${key || 'my-key'}');
console.log(value); // string or null`;
    case 'put':
      const opts: string[] = [];
      if (metadata) opts.push(`metadata: ${metadata || '{}'}`);
      if (ttl) opts.push(`expirationTtl: ${ttl}`);
      const optsStr = opts.length ? `, { ${opts.join(', ')} }` : '';
      return `// Put a value into KV
await env.${ns}.put('${key || 'my-key'}', '${(value || 'my-value').replace(/'/g, "\\'")}' ${optsStr});`;
    case 'delete':
      return `// Delete a key from KV
await env.${ns}.delete('${key || 'my-key'}');`;
    case 'list':
      return `// List all keys in a namespace
const { keys, list_complete, cursor } = await env.${ns}.list();
for (const { name, expiration, metadata } of keys) {
  console.log(name);
}`;
    case 'getWithMetadata':
      return `// Get value with metadata
const { value, metadata } = await env.${ns}.getWithMetadata('${key || 'my-key'}');
console.log(value, metadata);`;
  }
}

export default function CloudflareWorkersKvSimulator() {
  const [namespace, setNamespace] = useState('MY_KV');
  const [op, setOp] = useState<Operation>('put');
  const [key, setKey] = useState('greeting');
  const [value, setValue] = useState('Hello, Workers!');
  const [metadata, setMetadata] = useState('{"source":"worker"}');
  const [ttl, setTtl] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [store, setStore] = useState<KVStore>({ MY_KV: {} });
  const [showSnippet, setShowSnippet] = useState(true);
  const [copied, setCopied] = useState(false);

  const addLog = useCallback((entry: Omit<LogEntry, 'ts'>) => {
    setLogs(prev => [{ ...entry, ts: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const execute = useCallback(() => {
    const ns = namespace.trim() || 'MY_KV';
    const currentStore: KVStore = { ...store };
    if (!currentStore[ns]) currentStore[ns] = {};

    const trimmedKey = key.trim();

    switch (op) {
      case 'put': {
        if (!trimmedKey) { addLog({ op, key: trimmedKey, result: 'Error: key is required', code: 'await env.' + ns + '.put(...)', isError: true }); return; }
        let parsedMeta: any = undefined;
        if (metadata.trim()) {
          try { parsedMeta = JSON.parse(metadata); } catch { addLog({ op, key: trimmedKey, result: 'Error: metadata must be valid JSON', code: '', isError: true }); return; }
        }
        const entry: KVEntry = { value, createdAt: Date.now() };
        if (parsedMeta) entry.metadata = JSON.stringify(parsedMeta);
        if (ttl) entry.expirationTtl = parseInt(ttl, 10);
        currentStore[ns][trimmedKey] = entry;
        setStore(currentStore);
        addLog({
          op: 'put',
          key: trimmedKey,
          result: `✓ Stored "${trimmedKey}" in ${ns}${ttl ? ` (TTL: ${ttl}s)` : ''}`,
          code: `await env.${ns}.put('${trimmedKey}', '${value}')`,
          isError: false,
        });
        break;
      }
      case 'get': {
        if (!trimmedKey) { addLog({ op, key: trimmedKey, result: 'Error: key is required', code: '', isError: true }); return; }
        const found = currentStore[ns]?.[trimmedKey];
        if (found) {
          addLog({ op: 'get', key: trimmedKey, result: `"${found.value}"`, code: `await env.${ns}.get('${trimmedKey}')`, isError: false });
        } else {
          addLog({ op: 'get', key: trimmedKey, result: 'null (key not found)', code: `await env.${ns}.get('${trimmedKey}')`, isError: false });
        }
        break;
      }
      case 'getWithMetadata': {
        if (!trimmedKey) { addLog({ op, key: trimmedKey, result: 'Error: key is required', code: '', isError: true }); return; }
        const found = currentStore[ns]?.[trimmedKey];
        if (found) {
          addLog({
            op: 'getWithMetadata',
            key: trimmedKey,
            result: `{ value: "${found.value}", metadata: ${found.metadata || 'null'} }`,
            code: `await env.${ns}.getWithMetadata('${trimmedKey}')`,
            isError: false,
          });
        } else {
          addLog({ op: 'getWithMetadata', key: trimmedKey, result: '{ value: null, metadata: null }', code: `await env.${ns}.getWithMetadata('${trimmedKey}')`, isError: false });
        }
        break;
      }
      case 'delete': {
        if (!trimmedKey) { addLog({ op, key: trimmedKey, result: 'Error: key is required', code: '', isError: true }); return; }
        if (currentStore[ns]?.[trimmedKey]) {
          delete currentStore[ns][trimmedKey];
          setStore({ ...currentStore });
          addLog({ op: 'delete', key: trimmedKey, result: `✓ Deleted "${trimmedKey}" from ${ns}`, code: `await env.${ns}.delete('${trimmedKey}')`, isError: false });
        } else {
          addLog({ op: 'delete', key: trimmedKey, result: `Key "${trimmedKey}" not found (no-op)`, code: `await env.${ns}.delete('${trimmedKey}')`, isError: false });
        }
        break;
      }
      case 'list': {
        const keys = Object.keys(currentStore[ns] || {});
        const keyList = keys.map(k => {
          const entry = currentStore[ns][k];
          return `{ name: "${k}"${entry.metadata ? `, metadata: ${entry.metadata}` : ''} }`;
        });
        addLog({
          op: 'list',
          result: keys.length
            ? `{ keys: [\n  ${keyList.join(',\n  ')}\n], list_complete: true }`
            : '{ keys: [], list_complete: true }',
          code: `await env.${ns}.list()`,
          isError: false,
        });
        break;
      }
    }
  }, [namespace, op, key, value, metadata, ttl, store, addLog]);

  const snippet = generateSnippet(namespace || 'MY_KV', op, key, value, metadata, ttl);

  const copySnippet = useCallback(() => {
    navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [snippet]);

  const nsKeys = Object.keys(store[namespace] || {});

  return (
    <div class="space-y-4">
      {/* Namespace */}
      <div>
        <label class="text-sm font-medium text-text mb-1 block">KV Namespace Binding</label>
        <input
          value={namespace}
          onInput={e => setNamespace((e.target as HTMLInputElement).value.replace(/\s/g, '_').toUpperCase())}
          placeholder="MY_KV"
          class="w-full bg-[#0d1117] border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent text-text"
        />
        <p class="text-xs text-text-muted mt-1">This maps to <code class="font-mono">env.{namespace || 'MY_KV'}</code> in your Worker</p>
      </div>

      {/* Operation */}
      <div>
        <label class="text-sm font-medium text-text mb-2 block">Operation</label>
        <div class="flex gap-2 flex-wrap">
          {(['get', 'put', 'delete', 'list', 'getWithMetadata'] as Operation[]).map(o => (
            <button
              key={o}
              onClick={() => setOp(o)}
              class={`px-3 py-1.5 text-xs rounded border transition-colors font-mono ${op === o ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text-muted hover:border-accent'}`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Key/Value inputs */}
      {op !== 'list' && (
        <div>
          <label class="text-sm font-medium text-text mb-1 block">Key</label>
          <input
            value={key}
            onInput={e => setKey((e.target as HTMLInputElement).value)}
            placeholder="my-key"
            class="w-full bg-[#0d1117] border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent text-text"
          />
        </div>
      )}

      {op === 'put' && (
        <>
          <div>
            <label class="text-sm font-medium text-text mb-1 block">Value</label>
            <textarea
              value={value}
              onInput={e => setValue((e.target as HTMLTextAreaElement).value)}
              placeholder="value to store"
              class="w-full h-20 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:border-accent text-text"
            />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-text mb-1 block">Metadata (JSON)</label>
              <input
                value={metadata}
                onInput={e => setMetadata((e.target as HTMLInputElement).value)}
                placeholder='{"key": "value"}'
                class="w-full bg-[#0d1117] border border-border rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-accent text-text"
              />
            </div>
            <div>
              <label class="text-sm font-medium text-text mb-1 block">Expiration TTL (seconds)</label>
              <input
                value={ttl}
                onInput={e => setTtl((e.target as HTMLInputElement).value.replace(/\D/g, ''))}
                placeholder="e.g. 3600"
                class="w-full bg-[#0d1117] border border-border rounded-lg px-3 py-2 font-mono text-xs focus:outline-none focus:border-accent text-text"
              />
            </div>
          </div>
        </>
      )}

      <div class="flex gap-2">
        <button
          onClick={execute}
          class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
        >
          Execute
        </button>
        <button
          onClick={() => setLogs([])}
          class="px-4 py-2 text-sm bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
        >
          Clear Log
        </button>
      </div>

      {/* KV State Viewer */}
      <div class="p-3 bg-surface border border-border rounded-lg">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-medium text-text">KV Store — <code class="font-mono">{namespace || 'MY_KV'}</code></span>
          <span class="text-xs text-text-muted ml-auto">{nsKeys.length} key{nsKeys.length !== 1 ? 's' : ''}</span>
        </div>
        {nsKeys.length === 0 ? (
          <p class="text-xs text-text-muted italic">Empty namespace</p>
        ) : (
          <div class="space-y-1.5 max-h-36 overflow-y-auto">
            {nsKeys.map(k => (
              <div key={k} class="flex gap-2 items-start text-xs font-mono">
                <span class="text-accent shrink-0">{k}</span>
                <span class="text-text-muted">→</span>
                <span class="text-text truncate">{store[namespace]?.[k]?.value}</span>
                {store[namespace]?.[k]?.metadata && (
                  <span class="text-text-muted shrink-0">meta:{store[namespace]?.[k]?.metadata}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Operation Log */}
      {logs.length > 0 && (
        <div>
          <p class="text-xs font-medium text-text mb-2">Operation Log</p>
          <div class="space-y-2 max-h-64 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} class={`p-3 rounded-lg border text-xs font-mono ${log.isError ? 'bg-red-500/10 border-red-500/30' : 'bg-surface border-border'}`}>
                <div class="flex items-center gap-2 mb-1">
                  <span class={`font-bold uppercase ${log.isError ? 'text-red-400' : 'text-accent'}`}>{log.op}</span>
                  {log.key && <span class="text-text-muted">"{log.key}"</span>}
                  <span class="text-text-muted ml-auto">{new Date(log.ts).toLocaleTimeString()}</span>
                </div>
                <p class={`${log.isError ? 'text-red-300' : 'text-text'} whitespace-pre-wrap`}>{log.result}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code Snippet */}
      <div>
        <div class="flex items-center gap-2 mb-2">
          <button
            onClick={() => setShowSnippet(s => !s)}
            class="text-xs font-medium text-accent hover:underline"
          >
            {showSnippet ? '▼' : '▶'} Code Snippet
          </button>
          {showSnippet && (
            <button
              onClick={copySnippet}
              class="ml-auto px-3 py-1 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
        </div>
        {showSnippet && (
          <pre class="p-3 bg-[#0d1117] border border-border rounded-lg text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap">{snippet}</pre>
        )}
      </div>

      <p class="text-xs text-text-muted">
        Simulates Cloudflare Workers KV operations in-browser. Supports get, put, delete, list, and getWithMetadata with metadata and TTL. Generates code snippets for your Worker. Nothing is sent to any server.
      </p>
    </div>
  );
}
