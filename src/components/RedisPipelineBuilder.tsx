import { useState } from 'preact/hooks';

type RedisCommand = 'GET' | 'SET' | 'DEL' | 'EXISTS' | 'EXPIRE' | 'TTL' | 'HSET' | 'HGET' | 'HGETALL' | 'HDEL' | 'LPUSH' | 'RPUSH' | 'LRANGE' | 'LLEN' | 'SADD' | 'SMEMBERS' | 'SCARD' | 'INCR' | 'DECR' | 'KEYS' | 'TYPE' | 'PERSIST' | 'RENAME';

type PipelineStep = {
  id: string;
  command: RedisCommand;
  key: string;
  args: string;
  comment: string;
};

const COMMAND_DOCS: Record<RedisCommand, { syntax: string; desc: string; argsLabel: string; argsPlaceholder: string; group: string }> = {
  GET:      { syntax: 'GET key',                   desc: 'Get the value of a key.',                              argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  SET:      { syntax: 'SET key value [EX seconds]', desc: 'Set key to hold a string value.',                     argsLabel: 'value [EX sec]', argsPlaceholder: 'hello EX 60',     group: 'String' },
  DEL:      { syntax: 'DEL key [key ...]',          desc: 'Delete one or more keys.',                            argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  EXISTS:   { syntax: 'EXISTS key',                 desc: 'Determine if a key exists.',                          argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  EXPIRE:   { syntax: 'EXPIRE key seconds',         desc: 'Set a key\'s time to live in seconds.',               argsLabel: 'seconds',        argsPlaceholder: '60',              group: 'String' },
  TTL:      { syntax: 'TTL key',                    desc: 'Get the time to live for a key.',                     argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  PERSIST:  { syntax: 'PERSIST key',                desc: 'Remove the existing timeout on key.',                 argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  RENAME:   { syntax: 'RENAME key newkey',          desc: 'Rename a key.',                                       argsLabel: 'newkey',         argsPlaceholder: 'new-key-name',    group: 'String' },
  INCR:     { syntax: 'INCR key',                   desc: 'Increment integer value of a key by 1.',              argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  DECR:     { syntax: 'DECR key',                   desc: 'Decrement integer value of a key by 1.',              argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  KEYS:     { syntax: 'KEYS pattern',               desc: 'Find all keys matching the given pattern.',           argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  TYPE:     { syntax: 'TYPE key',                   desc: 'Get the data type stored at key.',                    argsLabel: '',              argsPlaceholder: '',                group: 'String' },
  HSET:     { syntax: 'HSET key field value',       desc: 'Set field(s) in a hash.',                             argsLabel: 'field value',    argsPlaceholder: 'name Alice',      group: 'Hash' },
  HGET:     { syntax: 'HGET key field',             desc: 'Get the value of a hash field.',                      argsLabel: 'field',          argsPlaceholder: 'name',            group: 'Hash' },
  HGETALL:  { syntax: 'HGETALL key',                desc: 'Get all fields and values in a hash.',                argsLabel: '',              argsPlaceholder: '',                group: 'Hash' },
  HDEL:     { syntax: 'HDEL key field [field ...]', desc: 'Delete one or more hash fields.',                     argsLabel: 'field',          argsPlaceholder: 'name',            group: 'Hash' },
  LPUSH:    { syntax: 'LPUSH key value [value ...]',desc: 'Prepend values to a list.',                           argsLabel: 'value(s)',       argsPlaceholder: 'item1 item2',     group: 'List' },
  RPUSH:    { syntax: 'RPUSH key value [value ...]',desc: 'Append values to a list.',                            argsLabel: 'value(s)',       argsPlaceholder: 'item1 item2',     group: 'List' },
  LRANGE:   { syntax: 'LRANGE key start stop',      desc: 'Get a range of elements from a list.',                argsLabel: 'start stop',     argsPlaceholder: '0 -1',            group: 'List' },
  LLEN:     { syntax: 'LLEN key',                   desc: 'Get the length of a list.',                           argsLabel: '',              argsPlaceholder: '',                group: 'List' },
  SADD:     { syntax: 'SADD key member [member ...]',desc: 'Add members to a set.',                              argsLabel: 'member(s)',      argsPlaceholder: 'alice bob',       group: 'Set' },
  SMEMBERS: { syntax: 'SMEMBERS key',               desc: 'Get all members of a set.',                           argsLabel: '',              argsPlaceholder: '',                group: 'Set' },
  SCARD:    { syntax: 'SCARD key',                  desc: 'Get the number of members in a set.',                 argsLabel: '',              argsPlaceholder: '',                group: 'Set' },
};

const COMMAND_GROUPS: Record<string, RedisCommand[]> = {
  String: ['GET', 'SET', 'DEL', 'EXISTS', 'EXPIRE', 'TTL', 'PERSIST', 'RENAME', 'INCR', 'DECR', 'KEYS', 'TYPE'],
  Hash:   ['HSET', 'HGET', 'HGETALL', 'HDEL'],
  List:   ['LPUSH', 'RPUSH', 'LRANGE', 'LLEN'],
  Set:    ['SADD', 'SMEMBERS', 'SCARD'],
};

let nextId = 1;
function makeId() { return String(nextId++); }

function buildCommandLine(step: PipelineStep): string {
  const doc = COMMAND_DOCS[step.command];
  const key = step.key || 'mykey';
  const args = step.args.trim();
  if (args) return `${step.command} ${key} ${args}`;
  return `${step.command} ${key}`;
}

const DEFAULT_STEPS: PipelineStep[] = [
  { id: makeId(), command: 'SET',   key: 'user:1:name', args: 'Alice EX 3600', comment: 'Set user name with 1h TTL' },
  { id: makeId(), command: 'HSET',  key: 'user:1',      args: 'age 30 city NYC', comment: 'Set user hash fields' },
  { id: makeId(), command: 'LPUSH', key: 'feed:user:1', args: 'post:99 post:88', comment: 'Add recent posts to feed' },
  { id: makeId(), command: 'GET',   key: 'user:1:name', args: '', comment: 'Read back the name' },
];

export default function RedisPipelineBuilder() {
  const [steps, setSteps] = useState<PipelineStep[]>(DEFAULT_STEPS);
  const [copied, setCopied] = useState(false);
  const [newCmd, setNewCmd] = useState<RedisCommand>('SET');
  const [newKey, setNewKey] = useState('');
  const [newArgs, setNewArgs] = useState('');
  const [newComment, setNewComment] = useState('');
  const [outputFormat, setOutputFormat] = useState<'pipeline' | 'redis-cli' | 'node'>('pipeline');

  function addStep() {
    setSteps(prev => [...prev, { id: makeId(), command: newCmd, key: newKey || 'mykey', args: newArgs, comment: newComment }]);
    setNewKey('');
    setNewArgs('');
    setNewComment('');
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function moveStep(id: string, dir: -1 | 1) {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  function updateStep(id: string, field: keyof PipelineStep, value: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function buildOutput(): string {
    if (outputFormat === 'pipeline') {
      return steps.map(s => {
        const line = buildCommandLine(s);
        return s.comment ? `# ${s.comment}\n${line}` : line;
      }).join('\n');
    }
    if (outputFormat === 'redis-cli') {
      return steps.map(s => `redis-cli ${buildCommandLine(s)}`).join('\n');
    }
    // node (ioredis)
    const lines = ['const Redis = require("ioredis");', 'const redis = new Redis();', '', 'async function runPipeline() {', '  const pipeline = redis.pipeline();'];
    steps.forEach(s => {
      const doc = COMMAND_DOCS[s.command];
      const key = s.key || 'mykey';
      const args = s.args.trim();
      const commentLine = s.comment ? `  // ${s.comment}` : '';
      const argsParts = args ? args.split(/\s+/).map(a => `"${a}"`).join(', ') : '';
      const call = argsParts
        ? `  pipeline.${s.command.toLowerCase()}("${key}", ${argsParts});`
        : `  pipeline.${s.command.toLowerCase()}("${key}");`;
      if (commentLine) lines.push(commentLine);
      lines.push(call);
    });
    lines.push('  const results = await pipeline.exec();', '  console.log(results);', '  redis.disconnect();', '}', '', 'runPipeline();');
    return lines.join('\n');
  }

  function copyOutput() {
    navigator.clipboard.writeText(buildOutput()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const doc = COMMAND_DOCS[newCmd];

  return (
    <div class="font-mono text-sm">
      {/* Pipeline steps */}
      <div class="mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-text-muted text-xs uppercase tracking-wide">Pipeline ({steps.length} commands)</span>
        </div>
        {steps.length === 0 && (
          <div class="border border-dashed border-border rounded p-4 text-center text-text-muted">No commands yet. Add a command below.</div>
        )}
        <div class="space-y-1">
          {steps.map((step, idx) => (
            <div key={step.id} class="flex items-start gap-2 bg-surface border border-border rounded p-2 group">
              <span class="text-text-muted w-5 text-right flex-shrink-0 mt-1">{idx + 1}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <select
                    value={step.command}
                    onChange={e => updateStep(step.id, 'command', (e.target as HTMLSelectElement).value as RedisCommand)}
                    class="bg-bg border border-border rounded px-1 py-0.5 text-xs text-accent-blue"
                  >
                    {Object.entries(COMMAND_GROUPS).map(([grp, cmds]) => (
                      <optgroup key={grp} label={grp}>
                        {cmds.map(c => <option key={c} value={c}>{c}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={step.key}
                    onInput={e => updateStep(step.id, 'key', (e.target as HTMLInputElement).value)}
                    placeholder="key"
                    class="bg-bg border border-border rounded px-1 py-0.5 text-xs w-32"
                  />
                  {COMMAND_DOCS[step.command].argsLabel && (
                    <input
                      type="text"
                      value={step.args}
                      onInput={e => updateStep(step.id, 'args', (e.target as HTMLInputElement).value)}
                      placeholder={COMMAND_DOCS[step.command].argsPlaceholder}
                      class="bg-bg border border-border rounded px-1 py-0.5 text-xs flex-1 min-w-24"
                    />
                  )}
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={step.comment}
                    onInput={e => updateStep(step.id, 'comment', (e.target as HTMLInputElement).value)}
                    placeholder="optional comment"
                    class="bg-bg border border-border rounded px-1 py-0.5 text-xs text-text-muted flex-1"
                  />
                </div>
              </div>
              <div class="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => moveStep(step.id, -1)} disabled={idx === 0} class="px-1 py-0.5 text-xs text-text-muted hover:text-text disabled:opacity-30">↑</button>
                <button onClick={() => moveStep(step.id, 1)} disabled={idx === steps.length - 1} class="px-1 py-0.5 text-xs text-text-muted hover:text-text disabled:opacity-30">↓</button>
                <button onClick={() => removeStep(step.id)} class="px-1 py-0.5 text-xs text-red-500 hover:text-red-400">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add command */}
      <div class="border border-border rounded p-3 mb-4 bg-surface">
        <div class="text-xs text-text-muted mb-2 uppercase tracking-wide">Add Command</div>
        <div class="flex flex-wrap items-end gap-2">
          <div>
            <label class="block text-xs text-text-muted mb-1">Command</label>
            <select
              value={newCmd}
              onChange={e => { setNewCmd((e.target as HTMLSelectElement).value as RedisCommand); setNewArgs(''); }}
              class="bg-bg border border-border rounded px-2 py-1 text-xs text-accent-blue"
            >
              {Object.entries(COMMAND_GROUPS).map(([grp, cmds]) => (
                <optgroup key={grp} label={grp}>
                  {cmds.map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Key</label>
            <input
              type="text"
              value={newKey}
              onInput={e => setNewKey((e.target as HTMLInputElement).value)}
              placeholder="mykey"
              class="bg-bg border border-border rounded px-2 py-1 text-xs w-36"
            />
          </div>
          {doc.argsLabel && (
            <div>
              <label class="block text-xs text-text-muted mb-1">{doc.argsLabel}</label>
              <input
                type="text"
                value={newArgs}
                onInput={e => setNewArgs((e.target as HTMLInputElement).value)}
                placeholder={doc.argsPlaceholder}
                class="bg-bg border border-border rounded px-2 py-1 text-xs w-40"
              />
            </div>
          )}
          <div class="flex-1">
            <label class="block text-xs text-text-muted mb-1">Comment (optional)</label>
            <input
              type="text"
              value={newComment}
              onInput={e => setNewComment((e.target as HTMLInputElement).value)}
              placeholder="what this command does"
              class="bg-bg border border-border rounded px-2 py-1 text-xs w-full"
            />
          </div>
          <button
            onClick={addStep}
            class="bg-accent-blue text-white rounded px-3 py-1 text-xs hover:opacity-90"
          >
            + Add
          </button>
        </div>
        <p class="text-xs text-text-muted mt-2 italic">{doc.syntax} — {doc.desc}</p>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div class="flex gap-1">
            {(['pipeline', 'redis-cli', 'node'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                class={`px-2 py-1 text-xs rounded border ${outputFormat === fmt ? 'bg-accent-blue text-white border-accent-blue' : 'border-border text-text-muted hover:text-text'}`}
              >
                {fmt === 'pipeline' ? 'Raw Pipeline' : fmt === 'redis-cli' ? 'redis-cli' : 'Node (ioredis)'}
              </button>
            ))}
          </div>
          <button
            onClick={copyOutput}
            class="flex items-center gap-1 px-3 py-1 text-xs bg-surface border border-border rounded hover:border-accent-blue"
          >
            {copied ? '✓ Copied!' : '⎘ Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-3 overflow-x-auto text-xs leading-relaxed text-text whitespace-pre">{buildOutput()}</pre>
      </div>
    </div>
  );
}
