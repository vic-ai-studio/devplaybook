import { useState } from 'preact/hooks';

type Category = 'All' | 'String' | 'Hash' | 'List' | 'Set' | 'Sorted Set' | 'Pub-Sub' | 'Server' | 'Scripting' | 'HyperLogLog';

interface RedisCommand {
  name: string;
  category: Exclude<Category, 'All'>;
  syntax: string;
  description: string;
  example: string;
  complexity: string;
  returns: string;
}

const COMMANDS: RedisCommand[] = [
  // Strings
  { name: 'SET', category: 'String', syntax: 'SET key value [EX seconds] [PX ms] [NX|XX]', description: 'Set the value of a key, with optional expiration and conditional flags.', example: 'SET user:42 "alice" EX 3600', complexity: 'O(1)', returns: 'OK on success, nil if NX/XX condition not met' },
  { name: 'GET', category: 'String', syntax: 'GET key', description: 'Get the value of a key. Returns nil if key does not exist.', example: 'GET user:42', complexity: 'O(1)', returns: 'String value or nil' },
  { name: 'DEL', category: 'String', syntax: 'DEL key [key ...]', description: 'Delete one or more keys. Returns the number of keys deleted.', example: 'DEL user:42 session:99', complexity: 'O(N) where N = number of keys', returns: 'Integer: number of keys deleted' },
  { name: 'EXISTS', category: 'String', syntax: 'EXISTS key [key ...]', description: 'Check if one or more keys exist. Returns the count of existing keys.', example: 'EXISTS user:42', complexity: 'O(N)', returns: 'Integer: 1 if exists, 0 if not' },
  { name: 'INCR', category: 'String', syntax: 'INCR key', description: 'Atomically increment the integer value of a key by 1. Creates key at 0 if absent.', example: 'INCR page:views', complexity: 'O(1)', returns: 'Integer: new value after increment' },
  { name: 'DECR', category: 'String', syntax: 'DECR key', description: 'Atomically decrement the integer value of a key by 1.', example: 'DECR stock:item:55', complexity: 'O(1)', returns: 'Integer: new value after decrement' },
  { name: 'INCRBY', category: 'String', syntax: 'INCRBY key increment', description: 'Increment the integer value of a key by the given amount.', example: 'INCRBY score:user:1 50', complexity: 'O(1)', returns: 'Integer: new value' },
  { name: 'MSET', category: 'String', syntax: 'MSET key value [key value ...]', description: 'Set multiple key-value pairs atomically.', example: 'MSET name "alice" age 30 city "taipei"', complexity: 'O(N)', returns: 'Always OK' },
  { name: 'MGET', category: 'String', syntax: 'MGET key [key ...]', description: 'Get the values of multiple keys. Returns nil for non-existing keys.', example: 'MGET name age city', complexity: 'O(N)', returns: 'Array of values (nil for missing keys)' },
  { name: 'EXPIRE', category: 'String', syntax: 'EXPIRE key seconds', description: 'Set a TTL (time-to-live) in seconds on a key. Key is deleted when TTL expires.', example: 'EXPIRE session:token 1800', complexity: 'O(1)', returns: '1 if timeout was set, 0 if key not found' },
  { name: 'TTL', category: 'String', syntax: 'TTL key', description: 'Return the remaining TTL of a key in seconds. Returns -2 if expired/missing, -1 if no TTL.', example: 'TTL session:token', complexity: 'O(1)', returns: 'Integer: seconds remaining, -1 (no TTL), -2 (missing)' },
  { name: 'SETEX', category: 'String', syntax: 'SETEX key seconds value', description: 'Set key to value with an expiry in seconds (atomic shorthand for SET + EXPIRE).', example: 'SETEX cache:page 60 "<html>..."', complexity: 'O(1)', returns: 'OK' },
  { name: 'SETNX', category: 'String', syntax: 'SETNX key value', description: 'Set key only if it does not already exist. Useful for distributed locks.', example: 'SETNX lock:resource 1', complexity: 'O(1)', returns: '1 if set, 0 if already exists' },
  { name: 'GETSET', category: 'String', syntax: 'GETSET key value', description: 'Atomically set a new value and return the old value. Deprecated in Redis 6.2 (use GETDEL or SET GET).', example: 'GETSET counter 0', complexity: 'O(1)', returns: 'Old string value or nil' },
  { name: 'APPEND', category: 'String', syntax: 'APPEND key value', description: 'Append a string to the value of a key. Creates key if it does not exist.', example: 'APPEND log:today "2026-03-28 login\\n"', complexity: 'O(1)', returns: 'Integer: new length of the string' },
  { name: 'STRLEN', category: 'String', syntax: 'STRLEN key', description: 'Return the length of the string value stored at key.', example: 'STRLEN user:bio', complexity: 'O(1)', returns: 'Integer: length in bytes, 0 if key missing' },
  // Hashes
  { name: 'HSET', category: 'Hash', syntax: 'HSET key field value [field value ...]', description: 'Set one or more field-value pairs in a hash.', example: 'HSET user:42 name "alice" email "alice@example.com"', complexity: 'O(N) for N fields', returns: 'Integer: number of fields added (not updated)' },
  { name: 'HGET', category: 'Hash', syntax: 'HGET key field', description: 'Get the value of a field in a hash.', example: 'HGET user:42 email', complexity: 'O(1)', returns: 'String value or nil' },
  { name: 'HMSET', category: 'Hash', syntax: 'HMSET key field value [field value ...]', description: 'Set multiple hash fields (deprecated, use HSET with multiple fields instead).', example: 'HMSET user:42 name "alice" age 30', complexity: 'O(N)', returns: 'Always OK' },
  { name: 'HMGET', category: 'Hash', syntax: 'HMGET key field [field ...]', description: 'Get the values of multiple hash fields.', example: 'HMGET user:42 name email age', complexity: 'O(N)', returns: 'Array of values (nil for missing fields)' },
  { name: 'HGETALL', category: 'Hash', syntax: 'HGETALL key', description: 'Return all fields and values of a hash as a flat array of alternating field/value pairs.', example: 'HGETALL user:42', complexity: 'O(N)', returns: 'Array: [field1, val1, field2, val2, ...]' },
  { name: 'HDEL', category: 'Hash', syntax: 'HDEL key field [field ...]', description: 'Delete one or more fields from a hash.', example: 'HDEL user:42 temp_token', complexity: 'O(N)', returns: 'Integer: number of fields deleted' },
  { name: 'HEXISTS', category: 'Hash', syntax: 'HEXISTS key field', description: 'Check if a field exists in a hash.', example: 'HEXISTS user:42 email', complexity: 'O(1)', returns: '1 if field exists, 0 otherwise' },
  { name: 'HKEYS', category: 'Hash', syntax: 'HKEYS key', description: 'Return all field names in a hash.', example: 'HKEYS user:42', complexity: 'O(N)', returns: 'Array of field name strings' },
  { name: 'HVALS', category: 'Hash', syntax: 'HVALS key', description: 'Return all values in a hash.', example: 'HVALS user:42', complexity: 'O(N)', returns: 'Array of value strings' },
  { name: 'HLEN', category: 'Hash', syntax: 'HLEN key', description: 'Return the number of fields in a hash.', example: 'HLEN user:42', complexity: 'O(1)', returns: 'Integer: number of fields' },
  // Lists
  { name: 'LPUSH', category: 'List', syntax: 'LPUSH key element [element ...]', description: 'Prepend one or more elements to a list (left side). Last element becomes list head.', example: 'LPUSH notifications "login" "purchase"', complexity: 'O(N)', returns: 'Integer: new list length' },
  { name: 'RPUSH', category: 'List', syntax: 'RPUSH key element [element ...]', description: 'Append one or more elements to a list (right side). Used for queue-style appending.', example: 'RPUSH queue:jobs "job1" "job2"', complexity: 'O(N)', returns: 'Integer: new list length' },
  { name: 'LPOP', category: 'List', syntax: 'LPOP key [count]', description: 'Remove and return element(s) from the left (head) of a list.', example: 'LPOP queue:jobs', complexity: 'O(N)', returns: 'String value or nil; array if count given' },
  { name: 'RPOP', category: 'List', syntax: 'RPOP key [count]', description: 'Remove and return element(s) from the right (tail) of a list.', example: 'RPOP notifications', complexity: 'O(N)', returns: 'String value or nil; array if count given' },
  { name: 'LRANGE', category: 'List', syntax: 'LRANGE key start stop', description: 'Return a sub-range of elements. 0 is first, -1 is last. Inclusive on both ends.', example: 'LRANGE queue:jobs 0 -1', complexity: 'O(S+N)', returns: 'Array of elements' },
  { name: 'LLEN', category: 'List', syntax: 'LLEN key', description: 'Return the length of a list. Returns 0 if key does not exist.', example: 'LLEN queue:jobs', complexity: 'O(1)', returns: 'Integer: list length' },
  { name: 'LINDEX', category: 'List', syntax: 'LINDEX key index', description: 'Return the element at a given index. Negative indices count from the tail.', example: 'LINDEX notifications 0', complexity: 'O(N)', returns: 'String value or nil' },
  { name: 'LSET', category: 'List', syntax: 'LSET key index element', description: 'Set the value of an element at a given index. Errors if index is out of range.', example: 'LSET queue:jobs 2 "updated-job"', complexity: 'O(N)', returns: 'OK' },
  { name: 'LINSERT', category: 'List', syntax: 'LINSERT key BEFORE|AFTER pivot element', description: 'Insert an element before or after a pivot value.', example: 'LINSERT tasks BEFORE "task3" "task2b"', complexity: 'O(N)', returns: 'Integer: new length, -1 if pivot not found' },
  { name: 'BLPOP', category: 'List', syntax: 'BLPOP key [key ...] timeout', description: 'Blocking left-pop: waits up to timeout seconds for an element. Returns immediately if list is non-empty. Used for worker queues.', example: 'BLPOP queue:jobs 30', complexity: 'O(N)', returns: 'Array: [key, value] or nil on timeout' },
  // Sets
  { name: 'SADD', category: 'Set', syntax: 'SADD key member [member ...]', description: 'Add one or more members to a set. Duplicates are ignored.', example: 'SADD tags:post:5 "redis" "database" "cache"', complexity: 'O(N)', returns: 'Integer: number of new members added' },
  { name: 'SREM', category: 'Set', syntax: 'SREM key member [member ...]', description: 'Remove one or more members from a set.', example: 'SREM tags:post:5 "cache"', complexity: 'O(N)', returns: 'Integer: number of members removed' },
  { name: 'SMEMBERS', category: 'Set', syntax: 'SMEMBERS key', description: 'Return all members of a set. Order is not guaranteed.', example: 'SMEMBERS tags:post:5', complexity: 'O(N)', returns: 'Array of member strings' },
  { name: 'SCARD', category: 'Set', syntax: 'SCARD key', description: 'Return the number of members in a set.', example: 'SCARD online:users', complexity: 'O(1)', returns: 'Integer: set cardinality' },
  { name: 'SISMEMBER', category: 'Set', syntax: 'SISMEMBER key member', description: 'Check whether a value is a member of a set.', example: 'SISMEMBER online:users "alice"', complexity: 'O(1)', returns: '1 if member exists, 0 otherwise' },
  { name: 'SUNION', category: 'Set', syntax: 'SUNION key [key ...]', description: 'Return the union of multiple sets.', example: 'SUNION tags:post:1 tags:post:2', complexity: 'O(N)', returns: 'Array: union of all set members' },
  { name: 'SINTER', category: 'Set', syntax: 'SINTER key [key ...]', description: 'Return the intersection of multiple sets (members common to all sets).', example: 'SINTER user:1:friends user:2:friends', complexity: 'O(N*M)', returns: 'Array: intersection members' },
  { name: 'SDIFF', category: 'Set', syntax: 'SDIFF key [key ...]', description: 'Return members in the first set that are not in any subsequent sets.', example: 'SDIFF all:users banned:users', complexity: 'O(N)', returns: 'Array: difference members' },
  // Sorted Sets
  { name: 'ZADD', category: 'Sorted Set', syntax: 'ZADD key [NX|XX] [GT|LT] [CH] [INCR] score member [score member ...]', description: 'Add members with scores to a sorted set. Sorted by score ascending.', example: 'ZADD leaderboard 9500 "alice" 8800 "bob"', complexity: 'O(log N)', returns: 'Integer: number of new members added' },
  { name: 'ZRANGE', category: 'Sorted Set', syntax: 'ZRANGE key min max [BYSCORE|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]', description: 'Return a range of members from a sorted set by rank (or score/lex in Redis 6.2+).', example: 'ZRANGE leaderboard 0 9 WITHSCORES REV', complexity: 'O(log N + M)', returns: 'Array of members (with scores if WITHSCORES)' },
  { name: 'ZRANK', category: 'Sorted Set', syntax: 'ZRANK key member [WITHSCORE]', description: 'Return the rank (0-indexed, ascending) of a member in a sorted set.', example: 'ZRANK leaderboard "alice"', complexity: 'O(log N)', returns: 'Integer: 0-based rank, nil if not found' },
  { name: 'ZREM', category: 'Sorted Set', syntax: 'ZREM key member [member ...]', description: 'Remove one or more members from a sorted set.', example: 'ZREM leaderboard "alice"', complexity: 'O(M log N)', returns: 'Integer: number of members removed' },
  { name: 'ZSCORE', category: 'Sorted Set', syntax: 'ZSCORE key member', description: 'Return the score of a member in a sorted set.', example: 'ZSCORE leaderboard "alice"', complexity: 'O(1)', returns: 'Double (as string) or nil' },
  { name: 'ZCARD', category: 'Sorted Set', syntax: 'ZCARD key', description: 'Return the number of members in a sorted set.', example: 'ZCARD leaderboard', complexity: 'O(1)', returns: 'Integer: cardinality' },
  { name: 'ZINCRBY', category: 'Sorted Set', syntax: 'ZINCRBY key increment member', description: 'Increment the score of a member in a sorted set.', example: 'ZINCRBY leaderboard 100 "alice"', complexity: 'O(log N)', returns: 'String: new score' },
  { name: 'ZRANGEBYSCORE', category: 'Sorted Set', syntax: 'ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]', description: 'Return members with scores between min and max. Use -inf/+inf for open ranges. (Deprecated in 6.2; use ZRANGE BYSCORE)', example: 'ZRANGEBYSCORE leaderboard 8000 +inf WITHSCORES', complexity: 'O(log N + M)', returns: 'Array of members in score range' },
  // Pub-Sub
  { name: 'PUBLISH', category: 'Pub-Sub', syntax: 'PUBLISH channel message', description: 'Publish a message to a channel. Returns number of subscribers that received it.', example: 'PUBLISH alerts "Server restarted"', complexity: 'O(N+M)', returns: 'Integer: number of receivers' },
  { name: 'SUBSCRIBE', category: 'Pub-Sub', syntax: 'SUBSCRIBE channel [channel ...]', description: 'Subscribe to one or more channels to receive messages. Enters subscription mode.', example: 'SUBSCRIBE alerts events', complexity: 'O(N)', returns: 'Array: [subscribe, channel, count] per channel' },
  { name: 'UNSUBSCRIBE', category: 'Pub-Sub', syntax: 'UNSUBSCRIBE [channel ...]', description: 'Unsubscribe from one or more channels. Unsubscribes from all if no channels given.', example: 'UNSUBSCRIBE alerts', complexity: 'O(N)', returns: 'Array: [unsubscribe, channel, count]' },
  { name: 'PSUBSCRIBE', category: 'Pub-Sub', syntax: 'PSUBSCRIBE pattern [pattern ...]', description: 'Subscribe to channels matching a glob pattern (e.g., "events:*").', example: 'PSUBSCRIBE events:* alerts:*', complexity: 'O(N)', returns: 'Array: [psubscribe, pattern, count]' },
  // Server
  { name: 'PING', category: 'Server', syntax: 'PING [message]', description: 'Test connection to Redis. Returns PONG or echoes optional message.', example: 'PING "hello"', complexity: 'O(1)', returns: 'PONG or the given message' },
  { name: 'INFO', category: 'Server', syntax: 'INFO [section]', description: 'Return server statistics and config. Sections: server, clients, memory, stats, replication, cpu, keyspace, all.', example: 'INFO memory', complexity: 'O(1)', returns: 'Bulk string with key:value lines' },
  { name: 'FLUSHDB', category: 'Server', syntax: 'FLUSHDB [ASYNC|SYNC]', description: 'Delete all keys in the current database. Use ASYNC for non-blocking flush. CAUTION: irreversible.', example: 'FLUSHDB ASYNC', complexity: 'O(N)', returns: 'OK' },
  { name: 'FLUSHALL', category: 'Server', syntax: 'FLUSHALL [ASYNC|SYNC]', description: 'Delete all keys in all databases. CAUTION: deletes everything on the Redis instance.', example: 'FLUSHALL ASYNC', complexity: 'O(N)', returns: 'OK' },
  { name: 'KEYS', category: 'Server', syntax: 'KEYS pattern', description: 'Find all keys matching a glob pattern. Blocks server — use SCAN in production instead.', example: 'KEYS user:*', complexity: 'O(N)', returns: 'Array of matching key names' },
  { name: 'DBSIZE', category: 'Server', syntax: 'DBSIZE', description: 'Return the total number of keys in the current database.', example: 'DBSIZE', complexity: 'O(1)', returns: 'Integer: key count' },
  { name: 'SELECT', category: 'Server', syntax: 'SELECT index', description: 'Switch to a different database (0–15). Default is 0. Not recommended in cluster mode.', example: 'SELECT 1', complexity: 'O(1)', returns: 'OK' },
  { name: 'CONFIG GET', category: 'Server', syntax: 'CONFIG GET parameter [parameter ...]', description: 'Read configuration parameters at runtime without restart.', example: 'CONFIG GET maxmemory', complexity: 'O(N)', returns: 'Array of [parameter, value] pairs' },
  // Scripting
  { name: 'EVAL', category: 'Scripting', syntax: 'EVAL script numkeys [key [key ...]] [arg [arg ...]]', description: 'Execute a Lua script atomically. Keys and args are passed as KEYS[] and ARGV[] tables.', example: "EVAL \"return redis.call('GET', KEYS[1])\" 1 user:42", complexity: 'Depends on script', returns: 'Script return value' },
  { name: 'EVALSHA', category: 'Scripting', syntax: 'EVALSHA sha1 numkeys [key ...] [arg ...]', description: 'Execute a cached Lua script by its SHA1 hash (loaded via SCRIPT LOAD).', example: 'EVALSHA abc123def456... 1 user:42', complexity: 'Depends on script', returns: 'Script return value' },
  { name: 'SCRIPT LOAD', category: 'Scripting', syntax: 'SCRIPT LOAD script', description: 'Cache a Lua script server-side and return its SHA1 hash for use with EVALSHA.', example: "SCRIPT LOAD \"return redis.call('GET', KEYS[1])\"", complexity: 'O(N)', returns: 'SHA1 hex string' },
  { name: 'SCRIPT FLUSH', category: 'Scripting', syntax: 'SCRIPT FLUSH [ASYNC|SYNC]', description: 'Flush all cached Lua scripts from the server script cache.', example: 'SCRIPT FLUSH', complexity: 'O(N)', returns: 'OK' },
  // HyperLogLog
  { name: 'PFADD', category: 'HyperLogLog', syntax: 'PFADD key element [element ...]', description: 'Add elements to a HyperLogLog for approximate cardinality counting with ~0.81% error.', example: 'PFADD unique:visitors "user:1" "user:2" "user:3"', complexity: 'O(1)', returns: '1 if internal representation changed, 0 otherwise' },
  { name: 'PFCOUNT', category: 'HyperLogLog', syntax: 'PFCOUNT key [key ...]', description: 'Return approximate cardinality of a HyperLogLog. If multiple keys given, union is computed.', example: 'PFCOUNT unique:visitors', complexity: 'O(1) per key', returns: 'Integer: approximate unique count' },
  { name: 'PFMERGE', category: 'HyperLogLog', syntax: 'PFMERGE destkey sourcekey [sourcekey ...]', description: 'Merge multiple HyperLogLogs into one. Useful for combining daily unique counters.', example: 'PFMERGE unique:week unique:mon unique:tue unique:wed', complexity: 'O(N)', returns: 'OK' },
];

const CATEGORIES: Category[] = ['All', 'String', 'Hash', 'List', 'Set', 'Sorted Set', 'Pub-Sub', 'Server', 'Scripting', 'HyperLogLog'];

const CATEGORY_COLORS: Record<string, string> = {
  'String':      'bg-blue-500/10 text-blue-400 border-blue-500/30',
  'Hash':        'bg-purple-500/10 text-purple-400 border-purple-500/30',
  'List':        'bg-orange-500/10 text-orange-400 border-orange-500/30',
  'Set':         'bg-green-500/10 text-green-400 border-green-500/30',
  'Sorted Set':  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  'Pub-Sub':     'bg-pink-500/10 text-pink-400 border-pink-500/30',
  'Server':      'bg-red-500/10 text-red-400 border-red-500/30',
  'Scripting':   'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  'HyperLogLog': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
};

export default function RedisCommandReference() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);

  const filtered = COMMANDS.filter(cmd => {
    const matchesCategory = activeCategory === 'All' || cmd.category === activeCategory;
    const q = search.toLowerCase();
    const matchesSearch =
      q === '' ||
      cmd.name.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.syntax.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === 'All' ? COMMANDS.length : COMMANDS.filter(c => c.category === cat).length;
    return acc;
  }, {} as Record<Category, number>);

  return (
    <div class="space-y-5">
      {/* Search + stats */}
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onInput={(e) => { setSearch((e.target as HTMLInputElement).value); setExpandedCommand(null); }}
            placeholder="Search commands, e.g. ZADD, expire, hash..."
            class="w-full pl-9 pr-3 py-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
            >
              ✕
            </button>
          )}
        </div>
        <div class="flex items-center gap-2 text-sm text-text-muted bg-bg border border-border rounded-lg px-3 py-2 whitespace-nowrap">
          <span class="text-primary font-semibold">{filtered.length}</span>
          <span>/ {COMMANDS.length} commands</span>
        </div>
      </div>

      {/* Category tabs */}
      <div class="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setExpandedCommand(null); }}
            class={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeCategory === cat
                ? 'bg-primary text-white border-primary'
                : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
            }`}
          >
            {cat}
            <span class={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${activeCategory === cat ? 'bg-white/20' : 'bg-surface'}`}>
              {categoryCounts[cat]}
            </span>
          </button>
        ))}
      </div>

      {/* Command list */}
      {filtered.length === 0 ? (
        <div class="text-center py-12 text-text-muted">
          <div class="text-4xl mb-3">🔍</div>
          <p class="font-medium">No commands match "{search}"</p>
          <button onClick={() => { setSearch(''); setActiveCategory('All'); }} class="mt-2 text-primary text-sm hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div class="space-y-2">
          {filtered.map(cmd => {
            const isExpanded = expandedCommand === cmd.name;
            const colorClass = CATEGORY_COLORS[cmd.category];
            return (
              <div
                key={cmd.name}
                class={`border rounded-xl transition-all overflow-hidden ${isExpanded ? 'border-primary bg-surface' : 'border-border bg-bg hover:border-primary/50'}`}
              >
                {/* Command row */}
                <button
                  onClick={() => setExpandedCommand(isExpanded ? null : cmd.name)}
                  class="w-full flex items-start sm:items-center gap-3 p-4 text-left"
                >
                  {/* Command name */}
                  <code class={`font-mono font-bold text-sm px-2 py-1 rounded border ${colorClass} shrink-0`}>
                    {cmd.name}
                  </code>
                  {/* Description */}
                  <span class="text-sm text-text flex-1 line-clamp-2 sm:line-clamp-1">{cmd.description}</span>
                  {/* Complexity badge */}
                  <span class="hidden sm:block text-xs text-text-muted bg-surface border border-border rounded px-2 py-1 font-mono shrink-0">
                    {cmd.complexity}
                  </span>
                  {/* Expand icon */}
                  <svg
                    class={`w-4 h-4 text-text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div class="border-t border-border px-4 pb-5 pt-4 space-y-4">
                    <div class="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Syntax</p>
                        <code class="block text-sm font-mono bg-bg border border-border rounded-lg px-3 py-2 break-all text-primary">
                          {cmd.syntax}
                        </code>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Example</p>
                        <code class="block text-sm font-mono bg-bg border border-border rounded-lg px-3 py-2 break-all text-green-400">
                          {cmd.example}
                        </code>
                      </div>
                    </div>
                    <div class="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Returns</p>
                        <p class="text-sm text-text">{cmd.returns}</p>
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Time Complexity</p>
                        <p class="text-sm font-mono text-text">{cmd.complexity}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p class="text-xs text-text-muted">
        Command syntax based on Redis 7.x. Some flags may not be available in older versions.
        Always check the <a href="https://redis.io/commands" target="_blank" rel="noopener" class="text-primary hover:underline">official Redis docs</a> for the most current reference.
      </p>
    </div>
  );
}
