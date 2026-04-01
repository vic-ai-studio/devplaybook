import { useState } from 'preact/hooks';

type KVOp = 'get' | 'put' | 'delete' | 'list' | 'getWithMetadata' | 'bulkPut';

interface KVConfig {
  namespace: string;
  bindingName: string;
  op: KVOp;
  key: string;
  value: string;
  ttl: number;
  ttlEnabled: boolean;
  prefix: string;
  limit: number;
  cursor: string;
  metadataType: string;
  cacheStrategy: 'none' | 'stale-while-revalidate' | 'cache-api' | 'kv-ttl';
}

const OP_LABELS: Record<KVOp, string> = {
  get: 'KV.get()',
  put: 'KV.put()',
  delete: 'KV.delete()',
  list: 'KV.list()',
  getWithMetadata: 'KV.getWithMetadata()',
  bulkPut: 'Bulk PUT (batch)',
};

function generateCode(cfg: KVConfig): string {
  const b = cfg.bindingName || 'MY_KV';
  const k = cfg.key || 'my-key';
  const v = cfg.value || 'my-value';

  switch (cfg.op) {
    case 'get':
      return `// Worker: KV Get
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const value = await env.${b}.get("${k}");

    if (value === null) {
      return new Response("Key not found", { status: 404 });
    }

    return new Response(value, {
      headers: { "Content-Type": "text/plain" },
    });
  },
};

interface Env {
  ${b}: KVNamespace;
}`;

    case 'put':
      const ttlOpts = cfg.ttlEnabled && cfg.ttl > 0 ? `, { expirationTtl: ${cfg.ttl} }` : '';
      return `// Worker: KV Put
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await env.${b}.put("${k}", "${v}"${ttlOpts});

    return new Response(JSON.stringify({ success: true, key: "${k}" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

interface Env {
  ${b}: KVNamespace;
}`;

    case 'delete':
      return `// Worker: KV Delete
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await env.${b}.delete("${k}");

    return new Response(JSON.stringify({ deleted: "${k}" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

interface Env {
  ${b}: KVNamespace;
}`;

    case 'list':
      const prefixOpt = cfg.prefix ? `prefix: "${cfg.prefix}", ` : '';
      const limitOpt = cfg.limit ? `limit: ${cfg.limit}, ` : '';
      const cursorOpt = cfg.cursor ? `\n    cursor: "${cfg.cursor}",` : '';
      return `// Worker: KV List
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const result = await env.${b}.list({
      ${prefixOpt}${limitOpt}${cursorOpt}
    });

    // result.keys: Array<{ name: string; expiration?: number; metadata?: unknown }>
    // result.list_complete: boolean (false = more pages)
    // result.cursor: string (for next page)

    return new Response(JSON.stringify({
      keys: result.keys.map(k => k.name),
      complete: result.list_complete,
      cursor: result.cursor,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

interface Env {
  ${b}: KVNamespace;
}`;

    case 'getWithMetadata':
      return `// Worker: KV Get with Metadata
interface ItemMetadata {
  createdAt: string;
  version: number;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { value, metadata } = await env.${b}.getWithMetadata<ItemMetadata>("${k}");

    if (value === null) {
      return new Response("Not found", { status: 404 });
    }

    return new Response(JSON.stringify({ value, metadata }), {
      headers: { "Content-Type": "application/json" },
    });
  },
};

// To PUT with metadata:
// await env.${b}.put("${k}", "${v}", {
//   metadata: { createdAt: new Date().toISOString(), version: 1 },
//   expirationTtl: 86400, // optional TTL
// });

interface Env {
  ${b}: KVNamespace;
}`;

    case 'bulkPut':
      return `// Worker: Bulk KV Write (via wrangler CLI or KV API)
// Note: Workers KV has no native bulk put in the runtime.
// Use the REST API or wrangler for bulk operations.

// Option 1: wrangler CLI
// wrangler kv:bulk put --namespace-id=<ID> bulk-data.json
// bulk-data.json format: [{ "key": "k1", "value": "v1" }, ...]

// Option 2: Cloudflare REST API (from server/CI)
async function bulkPut(
  accountId: string,
  namespaceId: string,
  apiToken: string,
  entries: { key: string; value: string; expiration_ttl?: number }[]
) {
  const response = await fetch(
    \`https://api.cloudflare.com/client/v4/accounts/\${accountId}/storage/kv/namespaces/\${namespaceId}/bulk\`,
    {
      method: "PUT",
      headers: {
        Authorization: \`Bearer \${apiToken}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entries),
    }
  );
  return response.json();
}

// Example:
await bulkPut(ACCOUNT_ID, NAMESPACE_ID, API_TOKEN, [
  { key: "user:1", value: JSON.stringify({ name: "Alice" }) },
  { key: "user:2", value: JSON.stringify({ name: "Bob" }), expiration_ttl: 3600 },
]);`;

    default:
      return '';
  }
}

function generateWranglerConfig(cfg: KVConfig): string {
  const ns = cfg.namespace || 'my-namespace';
  const b = cfg.bindingName || 'MY_KV';
  return `# wrangler.toml — KV Namespace Configuration
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# Production KV binding
[[kv_namespaces]]
binding = "${b}"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # create with: wrangler kv:namespace create "${ns}"

# Preview / dev KV binding (optional)
[[kv_namespaces]]
binding = "${b}"
preview_id = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"  # create with: wrangler kv:namespace create "${ns}" --preview

# ─── CLI Cheat Sheet ─────────────────────────────────────────────
# Create namespace:
#   wrangler kv:namespace create "${ns}"

# Put a value:
#   wrangler kv:key put --namespace-id=<ID> "${cfg.key || 'my-key'}" "${cfg.value || 'my-value'}"${cfg.ttlEnabled && cfg.ttl > 0 ? ` --ttl=${cfg.ttl}` : ''}

# Get a value:
#   wrangler kv:key get --namespace-id=<ID> "${cfg.key || 'my-key'}"

# List keys:
#   wrangler kv:key list --namespace-id=<ID>${cfg.prefix ? ` --prefix="${cfg.prefix}"` : ''}

# Delete a key:
#   wrangler kv:key delete --namespace-id=<ID> "${cfg.key || 'my-key'}"`;
}

function getCacheStrategySnippet(strategy: KVConfig['cacheStrategy'], bindingName: string, key: string): string {
  const b = bindingName || 'MY_KV';
  const k = key || 'my-key';
  switch (strategy) {
    case 'stale-while-revalidate':
      return `// Stale-while-revalidate pattern
const CACHE_TTL = 60; // serve stale for 60s while revalidating

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cached = await env.${b}.get("${k}");

    if (cached !== null) {
      // Revalidate in background (non-blocking)
      ctx.waitUntil(revalidate(env, "${k}"));
      return new Response(cached, { headers: { "X-Cache": "HIT" } });
    }

    const fresh = await fetchFreshData();
    await env.${b}.put("${k}", fresh, { expirationTtl: CACHE_TTL });
    return new Response(fresh, { headers: { "X-Cache": "MISS" } });
  },
};

async function revalidate(env: Env, key: string) {
  const fresh = await fetchFreshData();
  await env.${b}.put(key, fresh, { expirationTtl: CACHE_TTL });
}

async function fetchFreshData(): Promise<string> {
  const res = await fetch("https://api.example.com/data");
  return res.text();
}`;
    case 'cache-api':
      return `// KV + Cache API layered caching
export default {
  async fetch(request: Request, env: Env) {
    const cache = caches.default;
    const cacheKey = new Request(request.url);

    // Layer 1: Cache API (edge memory, ~1ms)
    const cacheHit = await cache.match(cacheKey);
    if (cacheHit) return cacheHit;

    // Layer 2: KV (global persistence, ~5-50ms)
    const kvValue = await env.${b}.get("${k}");
    if (kvValue !== null) {
      const response = new Response(kvValue, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
      await cache.put(cacheKey, response.clone());
      return response;
    }

    // Layer 3: Origin fetch
    const origin = await fetch("https://origin.example.com/data");
    const text = await origin.text();
    await env.${b}.put("${k}", text, { expirationTtl: 3600 });

    const response = new Response(text, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
    await cache.put(cacheKey, response.clone());
    return response;
  },
};`;
    case 'kv-ttl':
      return `// TTL-based expiry patterns

// Short-lived session token (15 min)
await env.${b}.put("session:" + userId, token, {
  expirationTtl: 900,
});

// Daily cache (24 hours)
await env.${b}.put("${k}", value, {
  expirationTtl: 86400,
});

// Absolute expiry (Unix timestamp)
const tomorrow = Math.floor(Date.now() / 1000) + 86400;
await env.${b}.put("${k}:abs", value, {
  expiration: tomorrow, // Unix timestamp, not duration
});

// Note: minimum TTL is 60 seconds
// Keys near expiry will return null before the exact moment`;
    default:
      return '// Select a caching strategy above to see code patterns';
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-bg border border-border text-text-muted hover:border-primary hover:text-primary'}`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div class="relative">
      <div class="absolute top-2 right-2">
        <CopyButton value={code} />
      </div>
      <pre class="bg-gray-950 text-green-300 text-xs font-mono p-4 rounded-lg overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

export default function CloudflareKVExplorer() {
  const [cfg, setCfg] = useState<KVConfig>({
    namespace: 'app-cache',
    bindingName: 'APP_KV',
    op: 'get',
    key: 'user:123',
    value: '{"name":"Alice","role":"admin"}',
    ttl: 3600,
    ttlEnabled: false,
    prefix: 'user:',
    limit: 100,
    cursor: '',
    metadataType: '{ createdAt: string }',
    cacheStrategy: 'none',
  });

  const set = (field: keyof KVConfig, value: any) => setCfg(prev => ({ ...prev, [field]: value }));

  const code = generateCode(cfg);
  const wranglerConfig = generateWranglerConfig(cfg);
  const cacheCode = getCacheStrategySnippet(cfg.cacheStrategy, cfg.bindingName, cfg.key);

  return (
    <div class="space-y-4">
      {/* Config panel */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-4">KV Configuration</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Namespace Name</label>
            <input
              type="text"
              value={cfg.namespace}
              onInput={(e: any) => set('namespace', e.target.value)}
              placeholder="my-namespace"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Binding Name (in Worker)</label>
            <input
              type="text"
              value={cfg.bindingName}
              onInput={(e: any) => set('bindingName', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
              placeholder="MY_KV"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Key</label>
            <input
              type="text"
              value={cfg.key}
              onInput={(e: any) => set('key', e.target.value)}
              placeholder="user:123"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Value (for PUT)</label>
            <input
              type="text"
              value={cfg.value}
              onInput={(e: any) => set('value', e.target.value)}
              placeholder="my-value"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div class="mt-4">
          <label class="block text-xs text-text-muted mb-2">Operation</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(OP_LABELS) as KVOp[]).map(op => (
              <button
                key={op}
                onClick={() => set('op', op)}
                class={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  cfg.op === op
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'border-border text-text-muted hover:border-primary hover:text-primary'
                }`}
              >
                {OP_LABELS[op]}
              </button>
            ))}
          </div>
        </div>

        {/* TTL option */}
        {(cfg.op === 'put' || cfg.op === 'getWithMetadata') && (
          <div class="mt-4 flex items-center gap-4">
            <label class="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.ttlEnabled}
                onChange={(e: any) => set('ttlEnabled', e.target.checked)}
                class="rounded"
              />
              <span>Enable TTL</span>
            </label>
            {cfg.ttlEnabled && (
              <div class="flex items-center gap-2">
                <input
                  type="number"
                  value={cfg.ttl}
                  onInput={(e: any) => set('ttl', parseInt(e.target.value) || 60)}
                  min={60}
                  class="w-24 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
                />
                <span class="text-xs text-text-muted">seconds (min 60)</span>
              </div>
            )}
          </div>
        )}

        {/* List options */}
        {cfg.op === 'list' && (
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-text-muted mb-1">Key Prefix Filter</label>
              <input
                type="text"
                value={cfg.prefix}
                onInput={(e: any) => set('prefix', e.target.value)}
                placeholder="user:"
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Limit (max 1000)</label>
              <input
                type="number"
                value={cfg.limit}
                onInput={(e: any) => set('limit', Math.min(1000, parseInt(e.target.value) || 100))}
                min={1} max={1000}
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generated Worker code */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-2.5 border-b border-border bg-bg flex items-center justify-between">
          <span class="text-xs font-semibold text-text">Worker Code — {OP_LABELS[cfg.op]}</span>
          <CopyButton value={code} />
        </div>
        <CodeBlock code={code} />
      </div>

      {/* wrangler.toml */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-2.5 border-b border-border bg-bg flex items-center justify-between">
          <span class="text-xs font-semibold text-text">wrangler.toml + CLI Reference</span>
          <CopyButton value={wranglerConfig} />
        </div>
        <CodeBlock code={wranglerConfig} />
      </div>

      {/* Caching strategies */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-3">Caching Strategy Patterns</h2>
        <div class="flex flex-wrap gap-2 mb-4">
          {(['none', 'stale-while-revalidate', 'cache-api', 'kv-ttl'] as const).map(s => (
            <button
              key={s}
              onClick={() => set('cacheStrategy', s)}
              class={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                cfg.cacheStrategy === s
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {s === 'none' ? 'Select strategy...' : s}
            </button>
          ))}
        </div>
        {cfg.cacheStrategy !== 'none' && <CodeBlock code={cacheCode} />}
      </div>

      {/* KV limits reference */}
      <div class="bg-blue-950/20 border border-blue-800/30 rounded-xl p-4 text-xs text-blue-300/80">
        <div class="font-medium text-blue-300 mb-2">Cloudflare KV Limits</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            ['Max key size', '512 bytes'],
            ['Max value size', '25 MB'],
            ['Max metadata', '1024 bytes'],
            ['Min TTL', '60 seconds'],
            ['List limit', '1000 keys/call'],
            ['Read latency', '~5–50ms (global)'],
            ['Write propagation', '~60s (eventual)'],
            ['Free tier reads', '100K/day'],
          ].map(([k, v]) => (
            <div key={k} class="bg-blue-950/30 rounded p-2">
              <div class="text-blue-400/70">{k}</div>
              <div class="text-blue-200 font-mono">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
