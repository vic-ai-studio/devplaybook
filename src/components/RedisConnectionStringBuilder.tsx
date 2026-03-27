import { useState } from 'preact/hooks';

interface RedisConfig {
  host: string;
  port: string;
  password: string;
  db: string;
  tls: boolean;
  username: string;
}

function buildRedisUrl(cfg: RedisConfig): string {
  const scheme = cfg.tls ? 'rediss' : 'redis';
  const auth = cfg.username && cfg.password
    ? `${encodeURIComponent(cfg.username)}:${encodeURIComponent(cfg.password)}@`
    : cfg.password
    ? `:${encodeURIComponent(cfg.password)}@`
    : '';
  const host = cfg.host || 'localhost';
  const port = cfg.port || '6379';
  const db = cfg.db ? `/${cfg.db}` : '';
  return `${scheme}://${auth}${host}:${port}${db}`;
}

function redisPyExample(cfg: RedisConfig): string {
  const host = cfg.host || 'localhost';
  const port = cfg.port || '6379';
  const db = cfg.db || '0';
  const tls = cfg.tls ? ', ssl=True' : '';
  const pw = cfg.password ? `, password="${cfg.password}"` : '';
  const user = cfg.username ? `, username="${cfg.username}"` : '';
  return `import redis

# Option 1: URL-based
r = redis.from_url("${buildRedisUrl(cfg)}")

# Option 2: Explicit params
r = redis.Redis(
    host="${host}",
    port=${port},
    db=${db}${pw}${user}${tls},
    decode_responses=True
)`;
}

function ioredisExample(cfg: RedisConfig): string {
  const url = buildRedisUrl(cfg);
  const host = cfg.host || 'localhost';
  const port = cfg.port || '6379';
  const db = cfg.db || '0';
  const tls = cfg.tls ? ',\n  tls: {}' : '';
  const pw = cfg.password ? `,\n  password: "${cfg.password}"` : '';
  const user = cfg.username ? `,\n  username: "${cfg.username}"` : '';
  return `import Redis from 'ioredis';

// Option 1: URL-based
const redis = new Redis("${url}");

// Option 2: Explicit config
const redis = new Redis({
  host: "${host}",
  port: ${port},
  db: ${db}${pw}${user}${tls}
});`;
}

function lettuceExample(cfg: RedisConfig): string {
  const host = cfg.host || 'localhost';
  const port = cfg.port || '6379';
  const db = cfg.db || '0';
  const pw = cfg.password ? `\nredisUri.setPassword("${cfg.password}");` : '';
  const user = cfg.username ? `\nredisUri.setUsername("${cfg.username}");` : '';
  const tls = cfg.tls ? '\nredisUri.setVerifyPeer(SslVerifyMode.FULL);' : '';
  return `import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;

RedisURI redisUri = RedisURI.builder()
    .withHost("${host}")
    .withPort(${port})
    .withDatabase(${db})${pw ? '\n    .withPassword("' + cfg.password + '".toCharArray())' : ''}${cfg.tls ? '\n    .withSsl(true)' : ''}
    .build();

RedisClient client = RedisClient.create(redisUri);
// URL-based alternative:
// RedisClient client = RedisClient.create("${buildRedisUrl(cfg)}");`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      class="text-xs px-2 py-0.5 rounded bg-surface border border-border hover:bg-primary/10 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function RedisConnectionStringBuilder() {
  const [cfg, setCfg] = useState<RedisConfig>({
    host: 'localhost',
    port: '6379',
    password: '',
    db: '0',
    tls: false,
    username: '',
  });
  const [activeTab, setActiveTab] = useState<'redis-py' | 'ioredis' | 'lettuce'>('redis-py');

  const url = buildRedisUrl(cfg);

  function set(field: keyof RedisConfig, value: string | boolean) {
    setCfg(prev => ({ ...prev, [field]: value }));
  }

  const tabs = [
    { id: 'redis-py' as const, label: 'redis-py (Python)' },
    { id: 'ioredis' as const, label: 'ioredis (Node.js)' },
    { id: 'lettuce' as const, label: 'Lettuce (Java)' },
  ];

  const codeMap = {
    'redis-py': redisPyExample(cfg),
    ioredis: ioredisExample(cfg),
    lettuce: lettuceExample(cfg),
  };

  return (
    <div class="space-y-6">
      {/* Config form */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-border rounded-lg bg-surface">
        <div>
          <label class="block text-sm font-medium mb-1">Host</label>
          <input
            type="text"
            value={cfg.host}
            onInput={e => set('host', (e.target as HTMLInputElement).value)}
            placeholder="localhost"
            class="w-full px-3 py-2 rounded border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Port</label>
          <input
            type="text"
            value={cfg.port}
            onInput={e => set('port', (e.target as HTMLInputElement).value)}
            placeholder="6379"
            class="w-full px-3 py-2 rounded border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Username <span class="text-text-muted text-xs">(ACL, optional)</span></label>
          <input
            type="text"
            value={cfg.username}
            onInput={e => set('username', (e.target as HTMLInputElement).value)}
            placeholder="default"
            class="w-full px-3 py-2 rounded border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Password</label>
          <input
            type="text"
            value={cfg.password}
            onInput={e => set('password', (e.target as HTMLInputElement).value)}
            placeholder="(leave blank if none)"
            class="w-full px-3 py-2 rounded border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Database Index</label>
          <input
            type="number"
            value={cfg.db}
            onInput={e => set('db', (e.target as HTMLInputElement).value)}
            min="0"
            max="15"
            class="w-full px-3 py-2 rounded border border-border bg-background text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div class="flex items-center gap-3 pt-5">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cfg.tls}
              onChange={e => set('tls', (e.target as HTMLInputElement).checked)}
              class="w-4 h-4 rounded"
            />
            <span class="text-sm font-medium">TLS / SSL (rediss://)</span>
          </label>
        </div>
      </div>

      {/* Connection URL output */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-semibold">Connection URL</span>
          <CopyButton text={url} />
        </div>
        <div class="font-mono text-sm p-3 rounded bg-surface border border-border break-all text-primary">
          {url}
        </div>
      </div>

      {/* Code examples */}
      <div>
        <div class="flex gap-1 border-b border-border mb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              class={`px-3 py-1.5 text-sm rounded-t border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div class="relative">
          <div class="absolute top-2 right-2 z-10">
            <CopyButton text={codeMap[activeTab]} />
          </div>
          <pre class="text-xs p-4 rounded-b rounded-tr bg-surface border border-t-0 border-border overflow-x-auto leading-relaxed">
            <code>{codeMap[activeTab]}</code>
          </pre>
        </div>
      </div>

      {/* Notes */}
      <div class="text-xs text-text-muted space-y-1 border border-border rounded p-3 bg-surface">
        <p><strong>rediss://</strong> — double-s scheme enables TLS. Managed Redis services (Redis Cloud, Upstash, ElastiCache TLS) require this.</p>
        <p><strong>Database index</strong> — Redis supports 0–15 by default. Most managed services only expose db 0.</p>
        <p><strong>ACL username</strong> — Redis 6+ supports username/password ACL. Older versions use password-only auth.</p>
      </div>
    </div>
  );
}
