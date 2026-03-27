import { useState } from 'preact/hooks';

type PropType = 'string' | 'number' | 'boolean' | 'array' | 'object';
type Lang = 'javascript' | 'python' | 'node';

interface EventProp {
  id: string;
  name: string;
  type: PropType;
  required: boolean;
  example: string;
}

interface PersonProp {
  id: string;
  name: string;
  value: string;
}

interface EventDef {
  id: string;
  name: string;
  properties: EventProp[];
}

const PROP_TYPES: PropType[] = ['string', 'number', 'boolean', 'array', 'object'];

let nextId = 1;
const uid = () => String(nextId++);

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
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors shrink-0 ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function exampleValue(type: PropType, example: string): string {
  if (example) {
    if (type === 'string') return `'${example}'`;
    if (type === 'boolean') return example === 'true' ? 'true' : 'false';
    if (type === 'number') return isNaN(Number(example)) ? '0' : example;
    return example;
  }
  switch (type) {
    case 'string': return `'value'`;
    case 'number': return '0';
    case 'boolean': return 'false';
    case 'array': return '[]';
    case 'object': return '{}';
  }
}

function generateJSCode(event: EventDef, personProps: PersonProp[], lang: Lang): string {
  const propsObj = event.properties
    .map((p) => `    ${p.name}: ${exampleValue(p.type, p.example)},`)
    .join('\n');

  const personObj = personProps
    .map((p) => `    ${p.name}: '${p.value || 'value'}',`)
    .join('\n');

  if (lang === 'javascript' || lang === 'node') {
    const importLine =
      lang === 'node'
        ? `const PostHog = require('posthog-node');\nconst posthog = new PostHog('YOUR_API_KEY', { host: 'https://app.posthog.com' });\n\n`
        : `// Browser: posthog.init('YOUR_API_KEY', { api_host: 'https://app.posthog.com' });\n\n`;

    const personSection =
      personProps.length > 0
        ? `\n// Set person properties\nposthog.identify({\n  distinctId: userId,\n  properties: {\n${personObj}\n  },\n});\n`
        : '';

    return `${importLine}posthog.capture({\n  distinctId: userId,\n  event: '${event.name}',\n  properties: {\n${propsObj}\n  },\n});${personSection}`;
  }

  if (lang === 'python') {
    const personSection =
      personProps.length > 0
        ? `\n# Set person properties\nposthog.identify(\n  distinct_id=user_id,\n  properties={\n${personProps.map((p) => `    '${p.name}': '${p.value || 'value'}',`).join('\n')}\n  }\n)`
        : '';

    return `from posthog import Posthog\n\nposthog = Posthog('YOUR_API_KEY', host='https://app.posthog.com')\n\nposthog.capture(\n  distinct_id=user_id,\n  event='${event.name}',\n  properties={\n${event.properties.map((p) => `    '${p.name}': ${exampleValue(p.type, p.example)},`).join('\n')}\n  }\n)${personSection}`;
  }

  return '';
}

function generateTSInterface(event: EventDef): string {
  const lines = event.properties.map((p) => {
    const tsType =
      p.type === 'array' ? 'unknown[]' : p.type === 'object' ? 'Record<string, unknown>' : p.type;
    return `  ${p.name}${p.required ? '' : '?'}: ${tsType};`;
  });
  return `interface ${event.name.replace(/[^a-zA-Z0-9]/g, '_')}Properties {\n${lines.join('\n')}\n}`;
}

const DEFAULT_EVENTS: EventDef[] = [
  {
    id: uid(),
    name: 'user_signed_up',
    properties: [
      { id: uid(), name: 'plan', type: 'string', required: true, example: 'pro' },
      { id: uid(), name: 'source', type: 'string', required: false, example: 'landing_page' },
    ],
  },
];

export default function PostHogEventSchemaBuilder() {
  const [events, setEvents] = useState<EventDef[]>(DEFAULT_EVENTS);
  const [activeEventId, setActiveEventId] = useState<string>(DEFAULT_EVENTS[0].id);
  const [personProps, setPersonProps] = useState<PersonProp[]>([
    { id: uid(), name: 'email', value: 'user@example.com' },
  ]);
  const [lang, setLang] = useState<Lang>('javascript');

  const activeEvent = events.find((e) => e.id === activeEventId) ?? events[0];

  const updateEvent = (id: string, update: Partial<EventDef>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...update } : e)));
  };

  const addEvent = () => {
    const newEvent: EventDef = { id: uid(), name: 'new_event', properties: [] };
    setEvents((prev) => [...prev, newEvent]);
    setActiveEventId(newEvent.id);
  };

  const removeEvent = (id: string) => {
    setEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== id);
      if (activeEventId === id && filtered.length > 0) setActiveEventId(filtered[0].id);
      return filtered;
    });
  };

  const addProp = (eventId: string) => {
    const newProp: EventProp = {
      id: uid(),
      name: 'property_name',
      type: 'string',
      required: false,
      example: '',
    };
    updateEvent(eventId, {
      properties: [...(events.find((e) => e.id === eventId)?.properties ?? []), newProp],
    });
  };

  const updateProp = (eventId: string, propId: string, update: Partial<EventProp>) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, properties: e.properties.map((p) => (p.id === propId ? { ...p, ...update } : p)) }
          : e,
      ),
    );
  };

  const removeProp = (eventId: string, propId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, properties: e.properties.filter((p) => p.id !== propId) } : e,
      ),
    );
  };

  const addPersonProp = () => {
    setPersonProps((prev) => [...prev, { id: uid(), name: '', value: '' }]);
  };

  const updatePersonProp = (id: string, update: Partial<PersonProp>) => {
    setPersonProps((prev) => prev.map((p) => (p.id === id ? { ...p, ...update } : p)));
  };

  const removePersonProp = (id: string) => {
    setPersonProps((prev) => prev.filter((p) => p.id !== id));
  };

  const code = activeEvent ? generateJSCode(activeEvent, personProps, lang) : '';
  const tsInterface = activeEvent ? generateTSInterface(activeEvent) : '';

  return (
    <div class="space-y-6">
      {/* Event list + add */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">Events</div>
          <button
            onClick={addEvent}
            class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add Event
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          {events.map((e) => (
            <div key={e.id} class="flex items-center gap-1">
              <button
                onClick={() => setActiveEventId(e.id)}
                class={`text-xs px-3 py-1.5 rounded-lg border font-mono transition-colors ${
                  activeEventId === e.id
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-bg border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {e.name}
              </button>
              {events.length > 1 && (
                <button
                  onClick={() => removeEvent(e.id)}
                  class="text-xs text-text-muted hover:text-red-400 px-1"
                  title="Remove event"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Active event editor */}
      {activeEvent && (
        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <label class="text-xs text-text-muted mb-1 block">Event Name</label>
              <input
                type="text"
                value={activeEvent.name}
                onInput={(e: any) => updateEvent(activeEvent.id, { name: e.target.value })}
                class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
                spellcheck={false}
              />
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium text-text">Properties</div>
              <button
                onClick={() => addProp(activeEvent.id)}
                class="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                + Add Property
              </button>
            </div>
            {activeEvent.properties.length === 0 && (
              <div class="text-xs text-text-muted text-center py-4">
                No properties yet. Click + Add Property.
              </div>
            )}
            <div class="space-y-2">
              {activeEvent.properties.map((prop) => (
                <div
                  key={prop.id}
                  class="grid grid-cols-[1fr_120px_80px_1fr_auto] gap-2 items-center"
                >
                  <input
                    type="text"
                    value={prop.name}
                    onInput={(e: any) => updateProp(activeEvent.id, prop.id, { name: e.target.value })}
                    placeholder="prop_name"
                    class="bg-bg border border-border rounded-lg px-2 py-1.5 font-mono text-xs focus:outline-none focus:border-primary"
                    spellcheck={false}
                  />
                  <select
                    value={prop.type}
                    onChange={(e: any) => updateProp(activeEvent.id, prop.id, { type: e.target.value as PropType })}
                    class="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
                  >
                    {PROP_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prop.required}
                      onChange={(e: any) => updateProp(activeEvent.id, prop.id, { required: e.target.checked })}
                      class="accent-primary"
                    />
                    req
                  </label>
                  <input
                    type="text"
                    value={prop.example}
                    onInput={(e: any) => updateProp(activeEvent.id, prop.id, { example: e.target.value })}
                    placeholder="example value"
                    class="bg-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
                    spellcheck={false}
                  />
                  <button
                    onClick={() => removeProp(activeEvent.id, prop.id)}
                    class="text-text-muted hover:text-red-400 text-sm px-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Person properties */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">Person Properties</div>
          <button
            onClick={addPersonProp}
            class="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            + Add
          </button>
        </div>
        {personProps.length === 0 && (
          <div class="text-xs text-text-muted text-center py-2">No person properties.</div>
        )}
        <div class="space-y-2">
          {personProps.map((p) => (
            <div key={p.id} class="flex items-center gap-2">
              <input
                type="text"
                value={p.name}
                onInput={(e: any) => updatePersonProp(p.id, { name: e.target.value })}
                placeholder="property_name"
                class="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 font-mono text-xs focus:outline-none focus:border-primary"
                spellcheck={false}
              />
              <input
                type="text"
                value={p.value}
                onInput={(e: any) => updatePersonProp(p.id, { value: e.target.value })}
                placeholder="example value"
                class="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-primary"
                spellcheck={false}
              />
              <button
                onClick={() => removePersonProp(p.id)}
                class="text-text-muted hover:text-red-400 text-sm px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Language + code output */}
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <div class="text-sm font-semibold text-text">Generated Code</div>
          <div class="flex gap-1.5">
            {(['javascript', 'node', 'python'] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                class={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  lang === l
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-bg border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {l === 'javascript' ? 'Browser JS' : l === 'node' ? 'Node.js' : 'Python'}
              </button>
            ))}
          </div>
        </div>

        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
            <span class="text-xs font-mono text-text-muted">posthog.capture()</span>
            <CopyButton value={code} />
          </div>
          <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{code}</pre>
        </div>

        {activeEvent && activeEvent.properties.length > 0 && (
          <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
              <span class="text-xs font-mono text-text-muted">TypeScript Interface</span>
              <CopyButton value={tsInterface} />
            </div>
            <pre class="p-4 text-xs font-mono text-blue-300 overflow-x-auto whitespace-pre">{tsInterface}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
