import { useState } from 'preact/hooks';

type SpanStatus = 'OK' | 'ERROR' | 'UNSET';
type SpanKind = 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';
type AttrValueType = 'string' | 'int' | 'float' | 'bool';

interface SpanAttribute {
  id: string;
  key: string;
  value: string;
  type: AttrValueType;
}

interface SpanEvent {
  id: string;
  name: string;
  timestamp: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function randomHex(bytes: number): string {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
  ).join('');
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 23);
}

function toNanoseconds(ms: number): number {
  return ms * 1_000_000;
}

function isoToUnixNano(iso: string): number {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? Date.now() * 1_000_000 : d.getTime() * 1_000_000;
}

function castAttrValue(value: string, type: AttrValueType): string | number | boolean {
  if (type === 'int') return parseInt(value, 10) || 0;
  if (type === 'float') return parseFloat(value) || 0.0;
  if (type === 'bool') return value === 'true';
  return value;
}

function spanKindInt(kind: SpanKind): number {
  const map: Record<SpanKind, number> = {
    INTERNAL: 1,
    SERVER: 2,
    CLIENT: 3,
    PRODUCER: 4,
    CONSUMER: 5,
  };
  return map[kind];
}

function spanStatusCode(status: SpanStatus): number {
  const map: Record<SpanStatus, number> = { UNSET: 0, OK: 1, ERROR: 2 };
  return map[status];
}

function generateOtlpJson(
  serviceName: string,
  spanName: string,
  traceId: string,
  spanId: string,
  parentSpanId: string,
  startTime: string,
  durationMs: number,
  status: SpanStatus,
  kind: SpanKind,
  attributes: SpanAttribute[],
  events: SpanEvent[]
): string {
  const startNano = isoToUnixNano(startTime);
  const endNano = startNano + toNanoseconds(durationMs);

  const spanAttrs = attributes
    .filter(a => a.key.trim())
    .map(a => {
      const v = a.value;
      if (a.type === 'int') return { key: a.key, value: { intValue: String(parseInt(v, 10) || 0) } };
      if (a.type === 'float') return { key: a.key, value: { doubleValue: parseFloat(v) || 0 } };
      if (a.type === 'bool') return { key: a.key, value: { boolValue: v === 'true' } };
      return { key: a.key, value: { stringValue: v } };
    });

  const eventsJson = events
    .filter(e => e.name.trim())
    .map(e => ({
      timeUnixNano: String(isoToUnixNano(e.timestamp)),
      name: e.name,
      attributes: [],
    }));

  const span: Record<string, unknown> = {
    traceId: traceId || randomHex(16),
    spanId: spanId || randomHex(8),
    name: spanName || 'span.name',
    kind: spanKindInt(kind),
    startTimeUnixNano: String(startNano),
    endTimeUnixNano: String(endNano),
    attributes: spanAttrs,
    events: eventsJson,
    status: {
      code: spanStatusCode(status),
      ...(status === 'ERROR' ? { message: 'An error occurred' } : {}),
    },
  };

  if (parentSpanId.trim()) {
    span.parentSpanId = parentSpanId.trim();
  }

  const otlp = {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: 'service.name', value: { stringValue: serviceName || 'my-service' } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: 'opentelemetry.instrumentation', version: '1.0.0' },
            spans: [span],
          },
        ],
      },
    ],
  };

  return JSON.stringify(otlp, null, 2);
}

function generatePythonSdk(
  serviceName: string,
  spanName: string,
  status: SpanStatus,
  kind: SpanKind,
  attributes: SpanAttribute[],
  events: SpanEvent[],
  durationMs: number
): string {
  const kindMap: Record<SpanKind, string> = {
    INTERNAL: 'SpanKind.INTERNAL',
    SERVER: 'SpanKind.SERVER',
    CLIENT: 'SpanKind.CLIENT',
    PRODUCER: 'SpanKind.PRODUCER',
    CONSUMER: 'SpanKind.CONSUMER',
  };

  const attrLines = attributes
    .filter(a => a.key.trim())
    .map(a => {
      const v = castAttrValue(a.value, a.type);
      const pyVal =
        a.type === 'string' ? `"${v}"` :
        a.type === 'bool' ? (v ? 'True' : 'False') :
        String(v);
      return `        "${a.key}": ${pyVal},`;
    });

  const eventLines = events
    .filter(e => e.name.trim())
    .map(e => `    span.add_event("${e.name}")`);

  const statusLine =
    status === 'OK'
      ? '    span.set_status(Status(StatusCode.OK))'
      : status === 'ERROR'
      ? '    span.set_status(Status(StatusCode.ERROR, "An error occurred"))'
      : '    # status is UNSET (default)';

  const lines: string[] = [
    'from opentelemetry import trace',
    'from opentelemetry.trace import SpanKind, Status, StatusCode',
    'from opentelemetry.sdk.trace import TracerProvider',
    'from opentelemetry.sdk.resources import Resource',
    'from opentelemetry.sdk.trace.export import BatchSpanProcessor',
    'from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter',
    '',
    '# Configure the tracer provider',
    `resource = Resource.create({"service.name": "${serviceName || 'my-service'}"})`,
    'provider = TracerProvider(resource=resource)',
    'exporter = OTLPSpanExporter(endpoint="http://localhost:4318/v1/traces")',
    'provider.add_span_processor(BatchSpanProcessor(exporter))',
    'trace.set_tracer_provider(provider)',
    '',
    `tracer = trace.get_tracer("${serviceName || 'my-service'}")`,
    '',
    `with tracer.start_as_current_span(`,
    `    "${spanName || 'span.name'}",`,
    `    kind=${kindMap[kind]},`,
    `) as span:`,
  ];

  if (attrLines.length > 0) {
    lines.push('    span.set_attributes({');
    lines.push(...attrLines);
    lines.push('    })');
  }

  if (eventLines.length > 0) {
    lines.push(...eventLines);
  }

  lines.push(statusLine);
  lines.push(`    # Simulated work duration: ${durationMs}ms`);
  lines.push('    pass  # Your logic goes here');

  return lines.join('\n');
}

const SPAN_KINDS: SpanKind[] = ['INTERNAL', 'SERVER', 'CLIENT', 'PRODUCER', 'CONSUMER'];
const SPAN_STATUSES: SpanStatus[] = ['UNSET', 'OK', 'ERROR'];
const ATTR_TYPES: AttrValueType[] = ['string', 'int', 'float', 'bool'];

export default function OpenTelemetrySpanBuilder() {
  const [serviceName, setServiceName] = useState('checkout-service');
  const [spanName, setSpanName] = useState('POST /checkout');
  const [traceId, setTraceId] = useState(randomHex(16));
  const [spanId, setSpanId] = useState(randomHex(8));
  const [parentSpanId, setParentSpanId] = useState('');
  const [startTime, setStartTime] = useState(nowIso());
  const [durationMs, setDurationMs] = useState(142);
  const [status, setStatus] = useState<SpanStatus>('OK');
  const [kind, setKind] = useState<SpanKind>('SERVER');

  const [attributes, setAttributes] = useState<SpanAttribute[]>([
    { id: makeId(), key: 'http.method', value: 'POST', type: 'string' },
    { id: makeId(), key: 'http.status_code', value: '200', type: 'int' },
    { id: makeId(), key: 'http.url', value: 'https://api.example.com/checkout', type: 'string' },
  ]);

  const [events, setEvents] = useState<SpanEvent[]>([
    { id: makeId(), name: 'payment.validated', timestamp: nowIso() },
  ]);

  const [activeTab, setActiveTab] = useState<'otlp' | 'python'>('otlp');
  const [copied, setCopied] = useState(false);

  function addAttribute() {
    setAttributes(prev => [...prev, { id: makeId(), key: '', value: '', type: 'string' }]);
  }

  function removeAttribute(id: string) {
    setAttributes(prev => prev.filter(a => a.id !== id));
  }

  function updateAttribute(id: string, field: keyof SpanAttribute, value: string) {
    setAttributes(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  function addEvent() {
    setEvents(prev => [...prev, { id: makeId(), name: '', timestamp: nowIso() }]);
  }

  function removeEvent(id: string) {
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  function updateEvent(id: string, field: keyof SpanEvent, value: string) {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  }

  const output =
    activeTab === 'otlp'
      ? generateOtlpJson(serviceName, spanName, traceId, spanId, parentSpanId, startTime, durationMs, status, kind, attributes, events)
      : generatePythonSdk(serviceName, spanName, status, kind, attributes, events, durationMs);

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Configuration form */}
        <div class="space-y-3 max-h-[640px] overflow-y-auto pr-1">

          {/* Span Identity */}
          <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
            <div class="text-xs font-medium text-text-muted uppercase tracking-wide">Span Identity</div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-text-muted mb-0.5">Service Name *</label>
                <input
                  type="text"
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={serviceName}
                  onInput={(e) => setServiceName((e.target as HTMLInputElement).value)}
                  placeholder="my-service"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-0.5">Span Name *</label>
                <input
                  type="text"
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={spanName}
                  onInput={(e) => setSpanName((e.target as HTMLInputElement).value)}
                  placeholder="GET /users/:id"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs text-text-muted mb-0.5">Trace ID</label>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={traceId}
                  onInput={(e) => setTraceId((e.target as HTMLInputElement).value)}
                  placeholder="32-char hex"
                  maxLength={32}
                />
                <button
                  onClick={() => setTraceId(randomHex(16))}
                  class="text-xs px-2 py-1 border border-border rounded hover:bg-surface-alt transition-colors text-text-muted whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs text-text-muted mb-0.5">Span ID</label>
              <div class="flex gap-1.5">
                <input
                  type="text"
                  class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={spanId}
                  onInput={(e) => setSpanId((e.target as HTMLInputElement).value)}
                  placeholder="16-char hex"
                  maxLength={16}
                />
                <button
                  onClick={() => setSpanId(randomHex(8))}
                  class="text-xs px-2 py-1 border border-border rounded hover:bg-surface-alt transition-colors text-text-muted whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs text-text-muted mb-0.5">Parent Span ID <span class="opacity-60">(optional)</span></label>
              <input
                type="text"
                class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                value={parentSpanId}
                onInput={(e) => setParentSpanId((e.target as HTMLInputElement).value)}
                placeholder="Leave empty for root span"
                maxLength={16}
              />
            </div>
          </div>

          {/* Timing & Status */}
          <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
            <div class="text-xs font-medium text-text-muted uppercase tracking-wide">Timing &amp; Status</div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-text-muted mb-0.5">Start Time</label>
                <input
                  type="datetime-local"
                  step="0.001"
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={startTime}
                  onInput={(e) => setStartTime((e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-0.5">Duration (ms)</label>
                <input
                  type="number"
                  min="0"
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={durationMs}
                  onInput={(e) => setDurationMs(Number((e.target as HTMLInputElement).value))}
                  placeholder="150"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-text-muted mb-0.5">Status</label>
                <select
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={status}
                  onChange={(e) => setStatus((e.target as HTMLSelectElement).value as SpanStatus)}
                >
                  {SPAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-0.5">Span Kind</label>
                <select
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={kind}
                  onChange={(e) => setKind((e.target as HTMLSelectElement).value as SpanKind)}
                >
                  {SPAN_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Attributes */}
          <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs font-medium text-text-muted uppercase tracking-wide">Attributes ({attributes.length})</div>
              <button
                onClick={addAttribute}
                class="bg-accent hover:bg-accent/90 text-white text-xs font-medium py-1 px-2.5 rounded-lg transition-colors"
              >
                + Add
              </button>
            </div>

            {attributes.length === 0 && (
              <p class="text-xs text-text-muted italic">No attributes added yet.</p>
            )}

            {attributes.map(a => (
              <div key={a.id} class="grid grid-cols-[1fr_80px_1fr_auto] gap-1.5 items-center">
                <input
                  type="text"
                  class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={a.key}
                  onInput={(e) => updateAttribute(a.id, 'key', (e.target as HTMLInputElement).value)}
                  placeholder="attribute.key"
                />
                <select
                  class="font-mono text-xs bg-surface-alt border border-border rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={a.type}
                  onChange={(e) => updateAttribute(a.id, 'type', (e.target as HTMLSelectElement).value)}
                >
                  {ATTR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input
                  type="text"
                  class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={a.value}
                  onInput={(e) => updateAttribute(a.id, 'value', (e.target as HTMLInputElement).value)}
                  placeholder={a.type === 'bool' ? 'true / false' : 'value'}
                />
                <button
                  onClick={() => removeAttribute(a.id)}
                  class="text-text-muted hover:text-red-400 text-xs transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Events */}
          <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
            <div class="flex items-center justify-between">
              <div class="text-xs font-medium text-text-muted uppercase tracking-wide">Events ({events.length})</div>
              <button
                onClick={addEvent}
                class="bg-accent hover:bg-accent/90 text-white text-xs font-medium py-1 px-2.5 rounded-lg transition-colors"
              >
                + Add
              </button>
            </div>

            {events.length === 0 && (
              <p class="text-xs text-text-muted italic">No events added yet.</p>
            )}

            {events.map(ev => (
              <div key={ev.id} class="grid grid-cols-[1fr_1fr_auto] gap-1.5 items-center">
                <input
                  type="text"
                  class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={ev.name}
                  onInput={(e) => updateEvent(ev.id, 'name', (e.target as HTMLInputElement).value)}
                  placeholder="event.name"
                />
                <input
                  type="datetime-local"
                  step="0.001"
                  class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={ev.timestamp}
                  onInput={(e) => updateEvent(ev.id, 'timestamp', (e.target as HTMLInputElement).value)}
                />
                <button
                  onClick={() => removeEvent(ev.id)}
                  class="text-text-muted hover:text-red-400 text-xs transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Generated output */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            {([['otlp', 'OTLP JSON'], ['python', 'OTEL SDK (Python)']] as const).map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 text-sm font-mono rounded-lg border transition-colors ${
                  activeTab === tab
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-border text-text-muted hover:bg-surface'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={copyOutput}
              class="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <pre class="w-full h-[580px] overflow-auto font-mono text-sm bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>
        </div>
      </div>
    </div>
  );
}
