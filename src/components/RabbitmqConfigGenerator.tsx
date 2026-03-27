import { useState, useCallback } from 'preact/hooks';

type ExchangeType = 'direct' | 'topic' | 'fanout' | 'headers';
type OutputFormat = 'json' | 'yaml';

interface Exchange {
  name: string;
  type: ExchangeType;
  durable: boolean;
  autoDelete: boolean;
}

interface Queue {
  name: string;
  durable: boolean;
  exclusive: boolean;
  autoDelete: boolean;
  ttl: string;
  maxLength: string;
  deadLetterExchange: string;
}

interface Binding {
  exchange: string;
  queue: string;
  routingKey: string;
}

const DEFAULT_EXCHANGES: Exchange[] = [
  { name: 'orders.exchange', type: 'topic', durable: true, autoDelete: false },
];

const DEFAULT_QUEUES: Queue[] = [
  { name: 'orders.created', durable: true, exclusive: false, autoDelete: false, ttl: '', maxLength: '', deadLetterExchange: '' },
  { name: 'orders.failed', durable: true, exclusive: false, autoDelete: false, ttl: '86400000', maxLength: '10000', deadLetterExchange: '' },
];

const DEFAULT_BINDINGS: Binding[] = [
  { exchange: 'orders.exchange', queue: 'orders.created', routingKey: 'order.created' },
  { exchange: 'orders.exchange', queue: 'orders.failed', routingKey: 'order.#' },
];

function generateJSON(exchanges: Exchange[], queues: Queue[], bindings: Binding[]): string {
  const config = {
    rabbitmq: {
      exchanges: exchanges.map(e => ({
        name: e.name,
        type: e.type,
        durable: e.durable,
        auto_delete: e.autoDelete,
        arguments: {},
      })),
      queues: queues.map(q => {
        const args: Record<string, unknown> = {};
        if (q.ttl) args['x-message-ttl'] = parseInt(q.ttl, 10);
        if (q.maxLength) args['x-max-length'] = parseInt(q.maxLength, 10);
        if (q.deadLetterExchange) args['x-dead-letter-exchange'] = q.deadLetterExchange;
        return {
          name: q.name,
          durable: q.durable,
          exclusive: q.exclusive,
          auto_delete: q.autoDelete,
          ...(Object.keys(args).length > 0 ? { arguments: args } : {}),
        };
      }),
      bindings: bindings.map(b => ({
        source: b.exchange,
        destination: b.queue,
        destination_type: 'queue',
        routing_key: b.routingKey,
        arguments: {},
      })),
    },
  };
  return JSON.stringify(config, null, 2);
}

function generateYAML(exchanges: Exchange[], queues: Queue[], bindings: Binding[]): string {
  const lines: string[] = ['rabbitmq:'];

  lines.push('  exchanges:');
  if (exchanges.length === 0) lines.push('    []');
  exchanges.forEach(e => {
    lines.push(`    - name: "${e.name}"`);
    lines.push(`      type: ${e.type}`);
    lines.push(`      durable: ${e.durable}`);
    lines.push(`      auto_delete: ${e.autoDelete}`);
    lines.push('      arguments: {}');
  });

  lines.push('  queues:');
  if (queues.length === 0) lines.push('    []');
  queues.forEach(q => {
    lines.push(`    - name: "${q.name}"`);
    lines.push(`      durable: ${q.durable}`);
    lines.push(`      exclusive: ${q.exclusive}`);
    lines.push(`      auto_delete: ${q.autoDelete}`);
    const hasArgs = q.ttl || q.maxLength || q.deadLetterExchange;
    if (hasArgs) {
      lines.push('      arguments:');
      if (q.ttl) lines.push(`        x-message-ttl: ${parseInt(q.ttl, 10)}`);
      if (q.maxLength) lines.push(`        x-max-length: ${parseInt(q.maxLength, 10)}`);
      if (q.deadLetterExchange) lines.push(`        x-dead-letter-exchange: "${q.deadLetterExchange}"`);
    }
  });

  lines.push('  bindings:');
  if (bindings.length === 0) lines.push('    []');
  bindings.forEach(b => {
    lines.push(`    - source: "${b.exchange}"`);
    lines.push(`      destination: "${b.queue}"`);
    lines.push('      destination_type: queue');
    lines.push(`      routing_key: "${b.routingKey}"`);
    lines.push('      arguments: {}');
  });

  return lines.join('\n');
}

const EXCHANGE_TYPES: ExchangeType[] = ['direct', 'topic', 'fanout', 'headers'];
const EXCHANGE_TYPE_DESC: Record<ExchangeType, string> = {
  direct: 'Routes by exact routing key match',
  topic: 'Routes by pattern matching (*, #)',
  fanout: 'Broadcasts to all bound queues',
  headers: 'Routes by message header attributes',
};

export default function RabbitmqConfigGenerator() {
  const [exchanges, setExchanges] = useState<Exchange[]>(DEFAULT_EXCHANGES);
  const [queues, setQueues] = useState<Queue[]>(DEFAULT_QUEUES);
  const [bindings, setBindings] = useState<Binding[]>(DEFAULT_BINDINGS);
  const [format, setFormat] = useState<OutputFormat>('json');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    const result = format === 'json'
      ? generateJSON(exchanges, queues, bindings)
      : generateYAML(exchanges, queues, bindings);
    setOutput(result);
  }, [exchanges, queues, bindings, format]);

  const copy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output]);

  const addExchange = () => setExchanges(prev => [...prev, { name: '', type: 'direct', durable: true, autoDelete: false }]);
  const removeExchange = (i: number) => setExchanges(prev => prev.filter((_, idx) => idx !== i));
  const updateExchange = (i: number, field: keyof Exchange, value: unknown) =>
    setExchanges(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));

  const addQueue = () => setQueues(prev => [...prev, { name: '', durable: true, exclusive: false, autoDelete: false, ttl: '', maxLength: '', deadLetterExchange: '' }]);
  const removeQueue = (i: number) => setQueues(prev => prev.filter((_, idx) => idx !== i));
  const updateQueue = (i: number, field: keyof Queue, value: unknown) =>
    setQueues(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));

  const addBinding = () => setBindings(prev => [...prev, { exchange: exchanges[0]?.name || '', queue: queues[0]?.name || '', routingKey: '#' }]);
  const removeBinding = (i: number) => setBindings(prev => prev.filter((_, idx) => idx !== i));
  const updateBinding = (i: number, field: keyof Binding, value: string) =>
    setBindings(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));

  const inputClass = 'w-full bg-[#0d1117] border border-border rounded px-2 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-accent';
  const labelClass = 'text-xs text-text-muted mb-0.5 block';

  return (
    <div class="space-y-6">
      {/* Format selector */}
      <div class="flex gap-2">
        {(['json', 'yaml'] as OutputFormat[]).map(f => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            class={`px-4 py-1.5 text-sm rounded transition-colors ${format === f ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Exchanges */}
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-text">Exchanges</h2>
          <button onClick={addExchange} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent text-text-muted transition-colors">+ Add</button>
        </div>
        {exchanges.length === 0 && <p class="text-xs text-text-muted italic">No exchanges defined.</p>}
        <div class="space-y-3">
          {exchanges.map((e, i) => (
            <div key={i} class="p-3 bg-surface border border-border rounded-lg">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label class={labelClass}>Name</label>
                  <input value={e.name} onInput={ev => updateExchange(i, 'name', (ev.target as HTMLInputElement).value)} placeholder="my.exchange" class={inputClass} />
                </div>
                <div>
                  <label class={labelClass}>Type</label>
                  <select value={e.type} onChange={ev => updateExchange(i, 'type', (ev.target as HTMLSelectElement).value as ExchangeType)} class={inputClass}>
                    {EXCHANGE_TYPES.map(t => <option key={t} value={t}>{t} — {EXCHANGE_TYPE_DESC[t]}</option>)}
                  </select>
                </div>
              </div>
              <div class="flex items-center gap-4 text-xs text-text-muted">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={e.durable} onChange={ev => updateExchange(i, 'durable', (ev.target as HTMLInputElement).checked)} class="rounded" />
                  Durable
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={e.autoDelete} onChange={ev => updateExchange(i, 'autoDelete', (ev.target as HTMLInputElement).checked)} class="rounded" />
                  Auto-delete
                </label>
                <button onClick={() => removeExchange(i)} class="ml-auto text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Queues */}
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-text">Queues</h2>
          <button onClick={addQueue} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent text-text-muted transition-colors">+ Add</button>
        </div>
        {queues.length === 0 && <p class="text-xs text-text-muted italic">No queues defined.</p>}
        <div class="space-y-3">
          {queues.map((q, i) => (
            <div key={i} class="p-3 bg-surface border border-border rounded-lg">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label class={labelClass}>Name</label>
                  <input value={q.name} onInput={ev => updateQueue(i, 'name', (ev.target as HTMLInputElement).value)} placeholder="my.queue" class={inputClass} />
                </div>
                <div>
                  <label class={labelClass}>Dead Letter Exchange (optional)</label>
                  <input value={q.deadLetterExchange} onInput={ev => updateQueue(i, 'deadLetterExchange', (ev.target as HTMLInputElement).value)} placeholder="dlx.exchange" class={inputClass} />
                </div>
                <div>
                  <label class={labelClass}>Message TTL (ms, optional)</label>
                  <input type="number" value={q.ttl} onInput={ev => updateQueue(i, 'ttl', (ev.target as HTMLInputElement).value)} placeholder="e.g. 86400000" class={inputClass} />
                </div>
                <div>
                  <label class={labelClass}>Max Length (messages, optional)</label>
                  <input type="number" value={q.maxLength} onInput={ev => updateQueue(i, 'maxLength', (ev.target as HTMLInputElement).value)} placeholder="e.g. 10000" class={inputClass} />
                </div>
              </div>
              <div class="flex items-center gap-4 text-xs text-text-muted">
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={q.durable} onChange={ev => updateQueue(i, 'durable', (ev.target as HTMLInputElement).checked)} class="rounded" />
                  Durable
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={q.exclusive} onChange={ev => updateQueue(i, 'exclusive', (ev.target as HTMLInputElement).checked)} class="rounded" />
                  Exclusive
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={q.autoDelete} onChange={ev => updateQueue(i, 'autoDelete', (ev.target as HTMLInputElement).checked)} class="rounded" />
                  Auto-delete
                </label>
                <button onClick={() => removeQueue(i)} class="ml-auto text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bindings */}
      <section>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-text">Bindings</h2>
          <button onClick={addBinding} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent text-text-muted transition-colors">+ Add</button>
        </div>
        {bindings.length === 0 && <p class="text-xs text-text-muted italic">No bindings defined.</p>}
        <div class="space-y-2">
          {bindings.map((b, i) => (
            <div key={i} class="p-3 bg-surface border border-border rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
              <div>
                <label class={labelClass}>Exchange</label>
                <input value={b.exchange} onInput={ev => updateBinding(i, 'exchange', (ev.target as HTMLInputElement).value)} placeholder="exchange name" class={inputClass} />
              </div>
              <div>
                <label class={labelClass}>Queue</label>
                <input value={b.queue} onInput={ev => updateBinding(i, 'queue', (ev.target as HTMLInputElement).value)} placeholder="queue name" class={inputClass} />
              </div>
              <div>
                <label class={labelClass}>Routing Key</label>
                <input value={b.routingKey} onInput={ev => updateBinding(i, 'routingKey', (ev.target as HTMLInputElement).value)} placeholder="order.created" class={inputClass} />
              </div>
              <button onClick={() => removeBinding(i)} class="text-red-400 hover:text-red-300 text-xs text-right">Remove</button>
            </div>
          ))}
        </div>
      </section>

      <button
        onClick={generate}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Generate Config
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">Generated {format.toUpperCase()} Config</span>
            <button onClick={copy} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="w-full bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{output}</pre>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Generates RabbitMQ exchange, queue, and binding configurations. Supports all exchange types, queue arguments (TTL, max-length, DLX), and routing key patterns. Runs entirely in your browser.
      </p>
    </div>
  );
}
