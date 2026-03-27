import { useState } from 'preact/hooks';

type Pattern = 'caching' | 'pubsub' | 'rate-limiting' | 'sessions' | 'leaderboard' | 'queue' | 'distributed-lock' | 'geo';

interface Command {
  cmd: string;
  description: string;
}

interface PatternConfig {
  label: string;
  icon: string;
  description: string;
  fields: Array<{ key: string; label: string; placeholder: string; default: string }>;
  generate: (values: Record<string, string>) => Command[];
}

const PATTERNS: Record<Pattern, PatternConfig> = {
  caching: {
    label: 'Caching',
    icon: '⚡',
    description: 'Cache database results with TTL expiration',
    fields: [
      { key: 'key', label: 'Cache key', placeholder: 'user:profile:123', default: 'user:profile:1001' },
      { key: 'ttl', label: 'TTL (seconds)', placeholder: '3600', default: '3600' },
      { key: 'value', label: 'Value (JSON string)', placeholder: '{"name":"Alice"}', default: '{"id":1001,"name":"Alice","role":"admin"}' },
    ],
    generate: (v) => [
      { cmd: `SET ${v.key} '${v.value}' EX ${v.ttl}`, description: 'Set value with TTL expiry' },
      { cmd: `GET ${v.key}`, description: 'Get cached value (returns nil if expired)' },
      { cmd: `TTL ${v.key}`, description: 'Check remaining TTL in seconds (-1=no TTL, -2=expired)' },
      { cmd: `EXPIRE ${v.key} ${v.ttl}`, description: 'Reset/extend TTL on existing key' },
      { cmd: `DEL ${v.key}`, description: 'Invalidate cache entry' },
      { cmd: `EXISTS ${v.key}`, description: 'Check if cache entry exists (returns 1 or 0)' },
    ],
  },
  pubsub: {
    label: 'Pub/Sub',
    icon: '📡',
    description: 'Publish/subscribe message patterns',
    fields: [
      { key: 'channel', label: 'Channel name', placeholder: 'notifications:user:123', default: 'notifications:user:1001' },
      { key: 'message', label: 'Message', placeholder: '{"type":"alert","msg":"Hello"}', default: '{"type":"alert","message":"New order received"}' },
      { key: 'pattern', label: 'Pattern (for PSUBSCRIBE)', placeholder: 'notifications:*', default: 'notifications:*' },
    ],
    generate: (v) => [
      { cmd: `PUBLISH ${v.channel} '${v.message}'`, description: 'Publish a message to a channel' },
      { cmd: `SUBSCRIBE ${v.channel}`, description: 'Subscribe to exact channel (blocking — use in separate connection)' },
      { cmd: `PSUBSCRIBE ${v.pattern}`, description: 'Subscribe to channels matching a glob pattern' },
      { cmd: `UNSUBSCRIBE ${v.channel}`, description: 'Unsubscribe from channel' },
      { cmd: `PUBSUB CHANNELS ${v.pattern}`, description: 'List active channels matching pattern' },
      { cmd: `PUBSUB NUMSUB ${v.channel}`, description: 'Count subscribers on a channel' },
    ],
  },
  'rate-limiting': {
    label: 'Rate Limiting',
    icon: '🚦',
    description: 'Sliding window and fixed window rate limits',
    fields: [
      { key: 'key', label: 'Rate limit key', placeholder: 'rate:api:user:123', default: 'rate:api:user:1001' },
      { key: 'limit', label: 'Max requests', placeholder: '100', default: '100' },
      { key: 'window', label: 'Window (seconds)', placeholder: '60', default: '60' },
    ],
    generate: (v) => [
      { cmd: `INCR ${v.key}`, description: 'Increment request counter (returns current count)' },
      { cmd: `EXPIRE ${v.key} ${v.window}`, description: 'Set window TTL if key is new' },
      { cmd: `GET ${v.key}`, description: 'Get current count to check against limit (${v.limit})' },
      { cmd: `# Fixed window Lua script (atomic):
EVAL "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]); end; return current;" 1 ${v.key} ${v.limit} ${v.window}`,
        description: 'Atomic increment + expire in one Lua script (recommended for correctness)' },
      { cmd: `TTL ${v.key}`, description: 'Check when the window resets' },
    ],
  },
  sessions: {
    label: 'Sessions',
    icon: '🔐',
    description: 'User session storage with expiration',
    fields: [
      { key: 'sessionId', label: 'Session ID', placeholder: 'sess:abc123', default: 'sess:a1b2c3d4e5f6' },
      { key: 'userId', label: 'User ID', placeholder: '1001', default: '1001' },
      { key: 'ttl', label: 'Session TTL (seconds)', placeholder: '86400', default: '86400' },
    ],
    generate: (v) => [
      { cmd: `HSET ${v.sessionId} userId ${v.userId} createdAt ${Date.now()} role "user"`, description: 'Create session as a hash with multiple fields' },
      { cmd: `EXPIRE ${v.sessionId} ${v.ttl}`, description: `Set session expiration (${Number(v.ttl) / 3600}h)` },
      { cmd: `HGETALL ${v.sessionId}`, description: 'Retrieve all session fields' },
      { cmd: `HGET ${v.sessionId} userId`, description: 'Get single session field' },
      { cmd: `HSET ${v.sessionId} lastSeen ${Date.now()}`, description: 'Update last activity timestamp' },
      { cmd: `EXPIRE ${v.sessionId} ${v.ttl}`, description: 'Extend session TTL on each request (sliding window)' },
      { cmd: `DEL ${v.sessionId}`, description: 'Invalidate session (logout)' },
    ],
  },
  leaderboard: {
    label: 'Leaderboard',
    icon: '🏆',
    description: 'Sorted sets for real-time leaderboards',
    fields: [
      { key: 'key', label: 'Leaderboard key', placeholder: 'leaderboard:weekly', default: 'leaderboard:weekly' },
      { key: 'member', label: 'Member ID', placeholder: 'user:123', default: 'user:1001' },
      { key: 'score', label: 'Score', placeholder: '4250', default: '4250' },
    ],
    generate: (v) => [
      { cmd: `ZADD ${v.key} ${v.score} "${v.member}"`, description: 'Add/update member score in sorted set' },
      { cmd: `ZINCRBY ${v.key} 100 "${v.member}"`, description: 'Increment score by a value' },
      { cmd: `ZREVRANK ${v.key} "${v.member}"`, description: 'Get rank (0-indexed, highest score first)' },
      { cmd: `ZSCORE ${v.key} "${v.member}"`, description: 'Get exact score of a member' },
      { cmd: `ZREVRANGE ${v.key} 0 9 WITHSCORES`, description: 'Get top 10 with scores (highest first)' },
      { cmd: `ZREVRANGEBYSCORE ${v.key} +inf -inf WITHSCORES LIMIT 0 10`, description: 'Top 10 by score range' },
      { cmd: `ZCARD ${v.key}`, description: 'Count total members in leaderboard' },
    ],
  },
  queue: {
    label: 'Queue / Task Queue',
    icon: '📥',
    description: 'Simple FIFO queue using Redis lists',
    fields: [
      { key: 'queue', label: 'Queue name', placeholder: 'jobs:email', default: 'jobs:email' },
      { key: 'job', label: 'Job payload (JSON)', placeholder: '{"to":"user@example.com"}', default: '{"to":"user@example.com","subject":"Welcome","template":"welcome-v2"}' },
      { key: 'dlq', label: 'Dead letter queue', placeholder: 'jobs:email:failed', default: 'jobs:email:failed' },
    ],
    generate: (v) => [
      { cmd: `RPUSH ${v.queue} '${v.job}'`, description: 'Enqueue job (push to tail)' },
      { cmd: `LPOP ${v.queue}`, description: 'Dequeue job (pop from head) — returns nil if empty' },
      { cmd: `BLPOP ${v.queue} 30`, description: 'Blocking dequeue — waits up to 30s for a job' },
      { cmd: `LLEN ${v.queue}`, description: 'Queue depth (backlog size)' },
      { cmd: `LRANGE ${v.queue} 0 9`, description: 'Peek at first 10 jobs without removing them' },
      { cmd: `RPUSH ${v.dlq} '${v.job}'`, description: 'Move failed job to dead letter queue' },
      { cmd: `RPOPLPUSH ${v.queue} ${v.queue}:processing`, description: 'Reliable dequeue — atomically move to processing list' },
    ],
  },
  'distributed-lock': {
    label: 'Distributed Lock',
    icon: '🔒',
    description: 'Mutex lock across distributed services (Redlock pattern)',
    fields: [
      { key: 'resource', label: 'Lock resource', placeholder: 'lock:invoice:generate', default: 'lock:invoice:generate' },
      { key: 'token', label: 'Unique token', placeholder: 'uuid-v4', default: 'a3f7e9c2-1b5d-4a8f-9e2c-7d3b5a1f9e4c' },
      { key: 'ttl', label: 'Lock TTL (ms)', placeholder: '30000', default: '30000' },
    ],
    generate: (v) => [
      { cmd: `SET ${v.resource} "${v.token}" NX PX ${v.ttl}`, description: 'Acquire lock — NX=only if not exists, PX=TTL in ms. Returns OK or nil.' },
      { cmd: `GET ${v.resource}`, description: 'Check if lock is held and by whom (compare to your token)' },
      { cmd: `# Release lock safely (Lua — atomic compare-and-delete):
EVAL "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end" 1 ${v.resource} ${v.token}`,
        description: 'Release lock only if token matches (prevents releasing another process\'s lock)' },
      { cmd: `PTTL ${v.resource}`, description: 'Check remaining lock TTL in milliseconds' },
    ],
  },
  geo: {
    label: 'Geolocation',
    icon: '🗺',
    description: 'Geospatial indexing and proximity search',
    fields: [
      { key: 'key', label: 'Geo key', placeholder: 'locations:stores', default: 'locations:stores' },
      { key: 'member', label: 'Member name', placeholder: 'store:nyc-001', default: 'store:nyc-001' },
      { key: 'lng', label: 'Longitude', placeholder: '-73.935242', default: '-73.935242' },
      { key: 'lat', label: 'Latitude', placeholder: '40.730610', default: '40.730610' },
      { key: 'radius', label: 'Search radius (km)', placeholder: '10', default: '10' },
    ],
    generate: (v) => [
      { cmd: `GEOADD ${v.key} ${v.lng} ${v.lat} "${v.member}"`, description: 'Add member at coordinates (lng, lat)' },
      { cmd: `GEOPOS ${v.key} "${v.member}"`, description: 'Get stored coordinates for a member' },
      { cmd: `GEODIST ${v.key} "${v.member}" "store:nyc-002" km`, description: 'Distance between two members in km' },
      { cmd: `GEOSEARCH ${v.key} FROMMEMBER "${v.member}" BYRADIUS ${v.radius} km ASC COUNT 10 WITHCOORD WITHDIST`, description: `Find up to 10 nearest members within ${v.radius}km` },
      { cmd: `GEOSEARCH ${v.key} FROMLONLAT ${v.lng} ${v.lat} BYRADIUS ${v.radius} km ASC COUNT 10`, description: 'Search from arbitrary coordinates (Redis 6.2+)' },
    ],
  },
};

export default function RedisCommandGenerator() {
  const [pattern, setPattern] = useState<Pattern>('caching');
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [copied, setCopied] = useState<number | null>(null);

  const config = PATTERNS[pattern];

  function getValues(): Record<string, string> {
    const patternValues = values[pattern] || {};
    const result: Record<string, string> = {};
    for (const field of config.fields) {
      result[field.key] = patternValues[field.key] ?? field.default;
    }
    return result;
  }

  function setFieldValue(key: string, val: string) {
    setValues(prev => ({
      ...prev,
      [pattern]: { ...(prev[pattern] || {}), [key]: val },
    }));
  }

  async function copyCmd(cmd: string, idx: number) {
    await navigator.clipboard.writeText(cmd);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  async function copyAll() {
    const cmds = config.generate(getValues()).map(c => c.cmd).join('\n\n');
    await navigator.clipboard.writeText(cmds);
    setCopied(-1);
    setTimeout(() => setCopied(null), 2000);
  }

  const commands = config.generate(getValues());
  const fieldValues = getValues();

  return (
    <div class="space-y-6">
      {/* Pattern selector */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-3">Select Pattern</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(PATTERNS) as Pattern[]).map(p => (
            <button
              key={p}
              onClick={() => setPattern(p)}
              class={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors text-left ${
                pattern === p
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-surface border-border text-text-muted hover:text-text hover:border-border/80'
              }`}
            >
              <span>{PATTERNS[p].icon}</span>
              <span class="truncate">{PATTERNS[p].label}</span>
            </button>
          ))}
        </div>
        <p class="mt-3 text-xs text-text-muted">{config.description}</p>
      </div>

      {/* Configuration fields */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-4">Configuration</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {config.fields.map(field => (
            <div key={field.key}>
              <label class="block text-xs font-medium text-text-muted mb-1.5">{field.label}</label>
              <input
                type="text"
                value={fieldValues[field.key]}
                onInput={(e) => setFieldValue(field.key, (e.target as HTMLInputElement).value)}
                placeholder={field.placeholder}
                class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Generated commands */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-semibold text-text">Generated Commands</h2>
          <button
            onClick={copyAll}
            class="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            {copied === -1 ? '✓ Copied all' : 'Copy all'}
          </button>
        </div>
        <div class="space-y-3">
          {commands.map((cmd, i) => (
            <div key={i} class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="flex items-start justify-between gap-3 p-3">
                <pre class="text-xs font-mono text-text flex-1 overflow-x-auto whitespace-pre-wrap break-all">{cmd.cmd}</pre>
                <button
                  onClick={() => copyCmd(cmd.cmd, i)}
                  class="flex-shrink-0 text-xs px-2.5 py-1 rounded border border-border bg-bg-card text-text-muted hover:text-text transition-colors mt-0.5"
                >
                  {copied === i ? '✓' : 'Copy'}
                </button>
              </div>
              <div class="px-3 pb-3 text-xs text-text-muted">{cmd.description}</div>
            </div>
          ))}
        </div>
      </div>

      <p class="text-xs text-text-muted text-center">
        Commands use Redis CLI syntax. For Redis 7+, some commands may have updated syntax. Always test in dev before production.
      </p>
    </div>
  );
}
