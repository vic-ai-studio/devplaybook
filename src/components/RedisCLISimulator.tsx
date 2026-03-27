import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

interface HistoryEntry {
  id: number;
  input: string;
  output: string;
  isError: boolean;
}

let entryCounter = 0;

// In-memory Redis store
type RedisValue =
  | { type: 'string'; value: string; expiry?: number }
  | { type: 'list'; value: string[] }
  | { type: 'hash'; value: Record<string, string> }
  | { type: 'set'; value: Set<string> };

function now(): number {
  return Date.now();
}

class RedisStore {
  private store: Map<string, RedisValue> = new Map();

  private checkExpiry(key: string): boolean {
    const v = this.store.get(key);
    if (!v) return false;
    if (v.type === 'string' && v.expiry !== undefined && v.expiry < now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  get(key: string): RedisValue | undefined {
    if (!this.checkExpiry(key)) return undefined;
    return this.store.get(key);
  }

  set(key: string, value: string, exSeconds?: number): void {
    this.store.set(key, {
      type: 'string',
      value,
      expiry: exSeconds !== undefined ? now() + exSeconds * 1000 : undefined,
    });
  }

  del(keys: string[]): number {
    let count = 0;
    for (const k of keys) {
      if (this.store.has(k)) { this.store.delete(k); count++; }
    }
    return count;
  }

  exists(keys: string[]): number {
    return keys.filter(k => this.checkExpiry(k) && this.store.has(k)).length;
  }

  expire(key: string, seconds: number): number {
    const v = this.get(key);
    if (!v) return 0;
    if (v.type === 'string') {
      v.expiry = now() + seconds * 1000;
    }
    return 1;
  }

  ttl(key: string): number {
    const v = this.store.get(key);
    if (!v) return -2;
    if (v.type !== 'string' || v.expiry === undefined) return -1;
    if (v.expiry < now()) { this.store.delete(key); return -2; }
    return Math.ceil((v.expiry - now()) / 1000);
  }

  keys(pattern: string): string[] {
    const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return [...this.store.keys()].filter(k => { this.checkExpiry(k); return this.store.has(k) && re.test(k); });
  }

  type(key: string): string {
    const v = this.get(key);
    if (!v) return 'none';
    return v.type;
  }

  // List
  lpush(key: string, values: string[]): number {
    let v = this.get(key);
    if (!v) { v = { type: 'list', value: [] }; this.store.set(key, v); }
    if (v.type !== 'list') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    v.value.unshift(...values.reverse());
    return v.value.length;
  }

  rpush(key: string, values: string[]): number {
    let v = this.get(key);
    if (!v) { v = { type: 'list', value: [] }; this.store.set(key, v); }
    if (v.type !== 'list') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    v.value.push(...values);
    return v.value.length;
  }

  lrange(key: string, start: number, stop: number): string[] {
    const v = this.get(key);
    if (!v) return [];
    if (v.type !== 'list') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    const len = v.value.length;
    const s = start < 0 ? Math.max(0, len + start) : Math.min(start, len);
    const e = stop < 0 ? len + stop : Math.min(stop, len - 1);
    return v.value.slice(s, e + 1);
  }

  llen(key: string): number {
    const v = this.get(key);
    if (!v) return 0;
    if (v.type !== 'list') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return v.value.length;
  }

  // Hash
  hset(key: string, field: string, value: string): number {
    let v = this.get(key);
    const isNew = !v || !(field in (v as {value: Record<string, string>}).value);
    if (!v) { v = { type: 'hash', value: {} }; this.store.set(key, v); }
    if (v.type !== 'hash') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    v.value[field] = value;
    return isNew ? 1 : 0;
  }

  hget(key: string, field: string): string | null {
    const v = this.get(key);
    if (!v) return null;
    if (v.type !== 'hash') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return v.value[field] ?? null;
  }

  hgetall(key: string): Record<string, string> | null {
    const v = this.get(key);
    if (!v) return null;
    if (v.type !== 'hash') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    return { ...v.value };
  }

  hdel(key: string, fields: string[]): number {
    const v = this.get(key);
    if (!v || v.type !== 'hash') return 0;
    let count = 0;
    for (const f of fields) { if (f in v.value) { delete v.value[f]; count++; } }
    return count;
  }

  hkeys(key: string): string[] {
    const v = this.get(key);
    if (!v) return [];
    if (v.type !== 'hash') throw new Error('WRONGTYPE');
    return Object.keys(v.value);
  }

  hvals(key: string): string[] {
    const v = this.get(key);
    if (!v) return [];
    if (v.type !== 'hash') throw new Error('WRONGTYPE');
    return Object.values(v.value);
  }

  // Set
  sadd(key: string, members: string[]): number {
    let v = this.get(key);
    if (!v) { v = { type: 'set', value: new Set() }; this.store.set(key, v); }
    if (v.type !== 'set') throw new Error('WRONGTYPE Operation against a key holding the wrong kind of value');
    let count = 0;
    for (const m of members) { if (!v.value.has(m)) { v.value.add(m); count++; } }
    return count;
  }

  smembers(key: string): string[] {
    const v = this.get(key);
    if (!v) return [];
    if (v.type !== 'set') throw new Error('WRONGTYPE');
    return [...v.value];
  }

  scard(key: string): number {
    const v = this.get(key);
    if (!v) return 0;
    if (v.type !== 'set') throw new Error('WRONGTYPE');
    return v.value.size;
  }

  sismember(key: string, member: string): number {
    const v = this.get(key);
    if (!v || v.type !== 'set') return 0;
    return v.value.has(member) ? 1 : 0;
  }

  incr(key: string): number {
    const v = this.get(key);
    const cur = v ? (v.type === 'string' ? parseInt(v.value, 10) : NaN) : 0;
    if (isNaN(cur)) throw new Error('ERR value is not an integer or out of range');
    const next = cur + 1;
    this.set(key, String(next));
    return next;
  }

  decr(key: string): number {
    const v = this.get(key);
    const cur = v ? (v.type === 'string' ? parseInt(v.value, 10) : NaN) : 0;
    if (isNaN(cur)) throw new Error('ERR value is not an integer or out of range');
    const next = cur - 1;
    this.set(key, String(next));
    return next;
  }

  flushall(): void {
    this.store.clear();
  }

  dbsize(): number {
    for (const k of [...this.store.keys()]) this.checkExpiry(k);
    return this.store.size;
  }
}

const db = new RedisStore();

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    while (i < input.length && /\s/.test(input[i])) i++;
    if (i >= input.length) break;
    if (input[i] === '"') {
      i++;
      let s = '';
      while (i < input.length && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < input.length) { i++; s += input[i]; }
        else s += input[i];
        i++;
      }
      i++; // closing quote
      tokens.push(s);
    } else {
      let s = '';
      while (i < input.length && !/\s/.test(input[i])) s += input[i++];
      tokens.push(s);
    }
  }
  return tokens;
}

function formatArray(arr: string[]): string {
  if (arr.length === 0) return '(empty array)';
  return arr.map((v, i) => `${i + 1}) "${v}"`).join('\n');
}

function formatHash(obj: Record<string, string>): string {
  const entries = Object.entries(obj);
  if (entries.length === 0) return '(empty hash)';
  return entries.map(([k, v], i) => `${i * 2 + 1}) "${k}"\n${i * 2 + 2}) "${v}"`).join('\n');
}

function execCommand(tokens: string[]): { output: string; isError: boolean } {
  if (tokens.length === 0) return { output: '', isError: false };
  const cmd = tokens[0].toUpperCase();
  const args = tokens.slice(1);

  try {
    switch (cmd) {
      case 'SET': {
        if (args.length < 2) throw new Error('ERR wrong number of arguments for SET');
        let ex: number | undefined;
        const exIdx = args.findIndex(a => a.toUpperCase() === 'EX');
        if (exIdx !== -1) ex = parseInt(args[exIdx + 1], 10);
        db.set(args[0], args[1], ex);
        return { output: 'OK', isError: false };
      }
      case 'GET': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for GET');
        const v = db.get(args[0]);
        if (!v) return { output: '(nil)', isError: false };
        if (v.type !== 'string') throw new Error('WRONGTYPE');
        return { output: `"${v.value}"`, isError: false };
      }
      case 'DEL': {
        if (args.length === 0) throw new Error('ERR wrong number of arguments for DEL');
        return { output: `(integer) ${db.del(args)}`, isError: false };
      }
      case 'EXISTS': {
        if (args.length === 0) throw new Error('ERR wrong number of arguments for EXISTS');
        return { output: `(integer) ${db.exists(args)}`, isError: false };
      }
      case 'EXPIRE': {
        if (args.length !== 2) throw new Error('ERR wrong number of arguments for EXPIRE');
        return { output: `(integer) ${db.expire(args[0], parseInt(args[1], 10))}`, isError: false };
      }
      case 'TTL': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for TTL');
        return { output: `(integer) ${db.ttl(args[0])}`, isError: false };
      }
      case 'KEYS': {
        const pattern = args[0] ?? '*';
        const keys = db.keys(pattern);
        return { output: formatArray(keys), isError: false };
      }
      case 'TYPE': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for TYPE');
        return { output: db.type(args[0]), isError: false };
      }
      case 'INCR': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for INCR');
        return { output: `(integer) ${db.incr(args[0])}`, isError: false };
      }
      case 'DECR': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for DECR');
        return { output: `(integer) ${db.decr(args[0])}`, isError: false };
      }
      case 'LPUSH': {
        if (args.length < 2) throw new Error('ERR wrong number of arguments for LPUSH');
        return { output: `(integer) ${db.lpush(args[0], args.slice(1))}`, isError: false };
      }
      case 'RPUSH': {
        if (args.length < 2) throw new Error('ERR wrong number of arguments for RPUSH');
        return { output: `(integer) ${db.rpush(args[0], args.slice(1))}`, isError: false };
      }
      case 'LRANGE': {
        if (args.length !== 3) throw new Error('ERR wrong number of arguments for LRANGE');
        const list = db.lrange(args[0], parseInt(args[1], 10), parseInt(args[2], 10));
        return { output: formatArray(list), isError: false };
      }
      case 'LLEN': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for LLEN');
        return { output: `(integer) ${db.llen(args[0])}`, isError: false };
      }
      case 'HSET': {
        if (args.length !== 3) throw new Error('ERR wrong number of arguments for HSET');
        return { output: `(integer) ${db.hset(args[0], args[1], args[2])}`, isError: false };
      }
      case 'HGET': {
        if (args.length !== 2) throw new Error('ERR wrong number of arguments for HGET');
        const hv = db.hget(args[0], args[1]);
        return { output: hv === null ? '(nil)' : `"${hv}"`, isError: false };
      }
      case 'HGETALL': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for HGETALL');
        const hva = db.hgetall(args[0]);
        return { output: hva === null ? '(empty hash)' : formatHash(hva), isError: false };
      }
      case 'HDEL': {
        if (args.length < 2) throw new Error('ERR wrong number of arguments for HDEL');
        return { output: `(integer) ${db.hdel(args[0], args.slice(1))}`, isError: false };
      }
      case 'HKEYS': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for HKEYS');
        return { output: formatArray(db.hkeys(args[0])), isError: false };
      }
      case 'HVALS': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for HVALS');
        return { output: formatArray(db.hvals(args[0])), isError: false };
      }
      case 'SADD': {
        if (args.length < 2) throw new Error('ERR wrong number of arguments for SADD');
        return { output: `(integer) ${db.sadd(args[0], args.slice(1))}`, isError: false };
      }
      case 'SMEMBERS': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for SMEMBERS');
        return { output: formatArray(db.smembers(args[0])), isError: false };
      }
      case 'SCARD': {
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for SCARD');
        return { output: `(integer) ${db.scard(args[0])}`, isError: false };
      }
      case 'SISMEMBER': {
        if (args.length !== 2) throw new Error('ERR wrong number of arguments for SISMEMBER');
        return { output: `(integer) ${db.sismember(args[0], args[1])}`, isError: false };
      }
      case 'FLUSHALL':
        db.flushall();
        return { output: 'OK', isError: false };
      case 'DBSIZE':
        return { output: `(integer) ${db.dbsize()}`, isError: false };
      case 'PING':
        return { output: args.length > 0 ? `"${args[0]}"` : 'PONG', isError: false };
      case 'ECHO':
        if (args.length !== 1) throw new Error('ERR wrong number of arguments for ECHO');
        return { output: `"${args[0]}"`, isError: false };
      case 'HELP':
      case 'COMMAND':
        return {
          output: `Supported commands:\nStrings: SET GET DEL EXISTS EXPIRE TTL KEYS TYPE INCR DECR\nLists:   LPUSH RPUSH LRANGE LLEN\nHashes:  HSET HGET HGETALL HDEL HKEYS HVALS\nSets:    SADD SMEMBERS SCARD SISMEMBER\nOther:   PING ECHO DBSIZE FLUSHALL HELP`,
          isError: false,
        };
      default:
        return { output: `ERR unknown command '${tokens[0]}'`, isError: true };
    }
  } catch (e: unknown) {
    return { output: e instanceof Error ? e.message : String(e), isError: true };
  }
}

const QUICK_CMDS = [
  'SET name "Alice"',
  'GET name',
  'INCR counter',
  'EXPIRE name 60',
  'TTL name',
  'HSET user:1 email "alice@example.com"',
  'HGETALL user:1',
  'LPUSH tasks "write tests"',
  'LRANGE tasks 0 -1',
  'KEYS *',
  'DBSIZE',
  'FLUSHALL',
];

export default function RedisCLISimulator() {
  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, input: '', output: 'Redis CLI Simulator — type HELP to list supported commands.', isError: false },
  ]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const termRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [history]);

  const run = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const tokens = tokenize(trimmed);
    const result = execCommand(tokens);
    setHistory(prev => [...prev, { id: ++entryCounter, input: trimmed, output: result.output, isError: result.isError }]);
    setCmdHistory(prev => [trimmed, ...prev.slice(0, 99)]);
    setHistIdx(-1);
    setInput('');
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      run(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCmdHistory(h => {
        const next = Math.min(histIdx + 1, h.length - 1);
        setHistIdx(next);
        if (h[next] !== undefined) setInput(h[next]);
        return h;
      });
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.max(histIdx - 1, -1);
      setHistIdx(next);
      setInput(next === -1 ? '' : cmdHistory[next] ?? '');
    }
  }, [input, run, histIdx, cmdHistory]);

  return (
    <div class="space-y-4">
      {/* Terminal */}
      <div
        ref={termRef}
        class="h-80 bg-[#0d1117] border border-border rounded-lg overflow-y-auto font-mono text-xs p-3 space-y-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map(entry => (
          <div key={entry.id} class="space-y-0.5">
            {entry.input && (
              <div class="flex gap-1">
                <span class="text-green-400 select-none shrink-0">redis&gt;</span>
                <span class="text-text">{entry.input}</span>
              </div>
            )}
            {entry.output && (
              <div class={`whitespace-pre-wrap pl-1 ${entry.isError ? 'text-red-400' : 'text-yellow-300'}`}>
                {entry.output}
              </div>
            )}
          </div>
        ))}
        {/* Input row */}
        <div class="flex gap-1 items-center">
          <span class="text-green-400 select-none shrink-0">redis&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onInput={e => setInput((e.target as HTMLInputElement).value)}
            onKeyDown={handleKeyDown}
            class="flex-1 bg-transparent outline-none text-text caret-green-400"
            spellcheck={false}
            autoComplete="off"
            placeholder="type a command..."
          />
        </div>
      </div>

      {/* Quick commands */}
      <div>
        <p class="text-xs text-text-muted mb-2">Quick commands:</p>
        <div class="flex flex-wrap gap-1.5">
          {QUICK_CMDS.map(cmd => (
            <button
              key={cmd}
              onClick={() => run(cmd)}
              class="text-xs font-mono bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors text-text-muted hover:text-text"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      <p class="text-xs text-text-muted">
        All data is stored in-memory in your browser. Use <kbd class="font-mono bg-surface px-1 rounded">↑↓</kbd> to navigate command history. Type <code class="font-mono bg-surface px-1 rounded">HELP</code> for all supported commands.
      </p>
    </div>
  );
}
