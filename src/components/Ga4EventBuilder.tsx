import { useState, useMemo } from 'preact/hooks';

interface EventParam {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

interface GA4EventDef {
  name: string;
  category: string;
  description: string;
  params: { key: string; type: 'string' | 'number' | 'boolean'; required: boolean; example: string; desc: string }[];
}

const GA4_EVENTS: GA4EventDef[] = [
  {
    name: 'purchase',
    category: 'Ecommerce',
    description: 'User completes a purchase.',
    params: [
      { key: 'transaction_id', type: 'string', required: true, example: 'T_12345', desc: 'Unique transaction ID' },
      { key: 'value', type: 'number', required: true, example: '29.99', desc: 'Total revenue' },
      { key: 'currency', type: 'string', required: true, example: 'USD', desc: 'Currency code (ISO 4217)' },
      { key: 'coupon', type: 'string', required: false, example: 'SUMMER10', desc: 'Coupon code applied' },
    ],
  },
  {
    name: 'add_to_cart',
    category: 'Ecommerce',
    description: 'User adds an item to their cart.',
    params: [
      { key: 'currency', type: 'string', required: true, example: 'USD', desc: 'Currency code' },
      { key: 'value', type: 'number', required: true, example: '9.99', desc: 'Item value' },
      { key: 'item_id', type: 'string', required: false, example: 'SKU_123', desc: 'Item/SKU ID' },
      { key: 'item_name', type: 'string', required: false, example: 'Pro Plan', desc: 'Item name' },
    ],
  },
  {
    name: 'begin_checkout',
    category: 'Ecommerce',
    description: 'User begins the checkout process.',
    params: [
      { key: 'currency', type: 'string', required: true, example: 'USD', desc: 'Currency code' },
      { key: 'value', type: 'number', required: true, example: '29.99', desc: 'Cart total value' },
      { key: 'coupon', type: 'string', required: false, example: '', desc: 'Coupon code' },
    ],
  },
  {
    name: 'sign_up',
    category: 'Engagement',
    description: 'User creates an account.',
    params: [
      { key: 'method', type: 'string', required: false, example: 'google', desc: 'Sign-up method (google, email, github)' },
    ],
  },
  {
    name: 'login',
    category: 'Engagement',
    description: 'User logs in.',
    params: [
      { key: 'method', type: 'string', required: false, example: 'email', desc: 'Login method' },
    ],
  },
  {
    name: 'search',
    category: 'Engagement',
    description: 'User performs a search.',
    params: [
      { key: 'search_term', type: 'string', required: true, example: 'react hooks', desc: 'The search query' },
    ],
  },
  {
    name: 'share',
    category: 'Engagement',
    description: 'User shares content.',
    params: [
      { key: 'method', type: 'string', required: false, example: 'twitter', desc: 'Share method' },
      { key: 'content_type', type: 'string', required: false, example: 'article', desc: 'Content type shared' },
      { key: 'item_id', type: 'string', required: false, example: 'blog-post-123', desc: 'Content ID' },
    ],
  },
  {
    name: 'generate_lead',
    category: 'Engagement',
    description: 'User fills out a form or requests contact.',
    params: [
      { key: 'currency', type: 'string', required: false, example: 'USD', desc: 'Currency code' },
      { key: 'value', type: 'number', required: false, example: '0', desc: 'Predicted value of lead' },
    ],
  },
  {
    name: 'view_item',
    category: 'Ecommerce',
    description: 'User views a product/item page.',
    params: [
      { key: 'currency', type: 'string', required: false, example: 'USD', desc: 'Currency code' },
      { key: 'value', type: 'number', required: false, example: '9.99', desc: 'Item value' },
      { key: 'item_id', type: 'string', required: false, example: 'SKU_123', desc: 'Item ID' },
      { key: 'item_name', type: 'string', required: false, example: 'Pro Plan', desc: 'Item name' },
    ],
  },
  {
    name: 'custom',
    category: 'Custom',
    description: 'Define your own custom event name and parameters.',
    params: [],
  },
];

function formatValue(val: string, type: 'string' | 'number' | 'boolean'): string {
  if (type === 'number') return isNaN(Number(val)) ? `"${val}"` : val;
  if (type === 'boolean') return val === 'true' ? 'true' : 'false';
  return `"${val}"`;
}

export default function Ga4EventBuilder() {
  const [selectedEvent, setSelectedEvent] = useState<GA4EventDef>(GA4_EVENTS[0]);
  const [customEventName, setCustomEventName] = useState('button_click');
  const [params, setParams] = useState<EventParam[]>(() =>
    GA4_EVENTS[0].params.map(p => ({ key: p.key, value: p.example, type: p.type }))
  );
  const [outputMode, setOutputMode] = useState<'gtag' | 'datalayer'>('gtag');
  const [copied, setCopied] = useState<'gtag' | 'datalayer' | null>(null);

  function selectEvent(event: GA4EventDef) {
    setSelectedEvent(event);
    setParams(event.params.map(p => ({ key: p.key, value: p.example, type: p.type })));
  }

  function updateParam(idx: number, field: keyof EventParam, value: string) {
    setParams(ps => ps.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function addCustomParam() {
    setParams(ps => [...ps, { key: '', value: '', type: 'string' }]);
  }

  function removeParam(idx: number) {
    setParams(ps => ps.filter((_, i) => i !== idx));
  }

  const eventName = selectedEvent.name === 'custom' ? customEventName : selectedEvent.name;

  const validParams = params.filter(p => p.key.trim() !== '');

  const paramsObj = useMemo(() => {
    const lines = validParams.map(p => `  ${p.key}: ${formatValue(p.value, p.type)}`);
    return lines.join(',\n');
  }, [validParams]);

  const gtagCode = useMemo(() =>
    `gtag('event', '${eventName}', {\n${paramsObj}\n});`,
    [eventName, paramsObj]
  );

  const dataLayerCode = useMemo(() => {
    const paramEntries = validParams.map(p => `    ${p.key}: ${formatValue(p.value, p.type)}`).join(',\n');
    return `dataLayer.push({\n  event: '${eventName}',\n${paramEntries}\n});`;
  }, [eventName, validParams]);

  const currentCode = outputMode === 'gtag' ? gtagCode : dataLayerCode;

  async function copyCode(mode: 'gtag' | 'datalayer') {
    await navigator.clipboard.writeText(mode === 'gtag' ? gtagCode : dataLayerCode);
    setCopied(mode);
    setTimeout(() => setCopied(null), 1500);
  }

  const categories = [...new Set(GA4_EVENTS.map(e => e.category))];

  return (
    <div class="space-y-6">
      {/* Event selector */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-3">Select GA4 Event</h2>
        <div class="space-y-3">
          {categories.map(cat => (
            <div key={cat}>
              <div class="text-xs text-text-muted uppercase tracking-wide mb-2">{cat}</div>
              <div class="flex flex-wrap gap-2">
                {GA4_EVENTS.filter(e => e.category === cat).map(e => (
                  <button
                    key={e.name}
                    onClick={() => selectEvent(e)}
                    class={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      selectedEvent.name === e.name
                        ? 'bg-primary text-white border-primary'
                        : 'bg-bg border-border hover:border-primary text-text-muted'
                    }`}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {selectedEvent.name !== 'custom' && (
          <p class="text-xs text-text-muted mt-3">{selectedEvent.description}</p>
        )}
      </div>

      {/* Custom event name */}
      {selectedEvent.name === 'custom' && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <label class="block text-sm font-medium mb-1">Custom Event Name</label>
          <input
            class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary"
            value={customEventName}
            onInput={(e) => setCustomEventName((e.target as HTMLInputElement).value)}
            placeholder="button_click"
          />
          <p class="text-xs text-text-muted mt-1">Use snake_case. Names starting with "ga_" are reserved by Google.</p>
        </div>
      )}

      {/* Parameters */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Event Parameters</h2>
          <button onClick={addCustomParam} class="text-xs text-primary hover:underline">+ Add param</button>
        </div>

        {params.length === 0 ? (
          <p class="text-sm text-text-muted">No parameters defined. Click "+ Add param" to add custom parameters.</p>
        ) : (
          <div class="space-y-2">
            {params.map((p, i) => {
              const def = selectedEvent.params.find(d => d.key === p.key);
              return (
                <div key={i} class="grid grid-cols-12 gap-2 items-center">
                  <div class="col-span-4">
                    <input
                      class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono focus:ring-1 focus:ring-primary"
                      value={p.key}
                      onInput={(e) => updateParam(i, 'key', (e.target as HTMLInputElement).value)}
                      placeholder="param_name"
                    />
                    {def?.desc && <div class="text-xs text-text-muted mt-0.5 truncate">{def.desc}</div>}
                  </div>
                  <div class="col-span-5">
                    <input
                      class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-primary"
                      value={p.value}
                      onInput={(e) => updateParam(i, 'value', (e.target as HTMLInputElement).value)}
                      placeholder="value"
                    />
                  </div>
                  <div class="col-span-2">
                    <select
                      value={p.type}
                      onChange={(e) => updateParam(i, 'type', (e.target as HTMLSelectElement).value as EventParam['type'])}
                      class="w-full text-xs bg-bg border border-border rounded-lg px-2 py-1.5"
                    >
                      <option value="string">string</option>
                      <option value="number">number</option>
                      <option value="boolean">bool</option>
                    </select>
                  </div>
                  <div class="col-span-1 text-right">
                    {!def?.required && (
                      <button onClick={() => removeParam(i)} class="text-text-muted hover:text-red-400 text-xs">✕</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Output */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 class="text-base font-semibold">Generated Code</h2>
          <div class="flex gap-2">
            <div class="flex rounded-lg overflow-hidden border border-border">
              <button
                onClick={() => setOutputMode('gtag')}
                class={`text-xs px-3 py-1.5 transition-colors ${outputMode === 'gtag' ? 'bg-primary text-white' : 'bg-bg text-text-muted hover:bg-bg-card'}`}
              >
                gtag()
              </button>
              <button
                onClick={() => setOutputMode('datalayer')}
                class={`text-xs px-3 py-1.5 transition-colors ${outputMode === 'datalayer' ? 'bg-primary text-white' : 'bg-bg text-text-muted hover:bg-bg-card'}`}
              >
                dataLayer
              </button>
            </div>
            <button
              onClick={() => copyCode(outputMode)}
              class="text-sm bg-primary hover:bg-primary/80 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              {copied === outputMode ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <pre class="bg-bg text-green-400 text-sm rounded-lg p-4 overflow-x-auto font-mono whitespace-pre">{currentCode}</pre>

        {/* Both outputs side by side */}
        {validParams.length > 0 && (
          <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { mode: 'gtag' as const, label: 'gtag() — direct GA4', code: gtagCode },
              { mode: 'datalayer' as const, label: 'dataLayer.push() — GTM', code: dataLayerCode },
            ]).map(({ mode, label, code }) => (
              <div key={mode} class="bg-bg rounded-lg p-3 border border-border">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-xs font-medium text-text-muted">{label}</span>
                  <button onClick={() => copyCode(mode)} class="text-xs text-primary hover:underline">
                    {copied === mode ? '✓' : 'Copy'}
                  </button>
                </div>
                <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">{code}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation hints */}
      <div class="bg-bg-card border border-border rounded-xl p-4 text-sm text-text-muted">
        <p class="font-medium text-text mb-1">Parameter Validation Rules</p>
        <ul class="list-disc list-inside space-y-1 text-xs">
          <li>Event names: max 40 characters, letters, numbers, and underscores only</li>
          <li>Parameter names: max 40 characters</li>
          <li>String values: max 100 characters</li>
          <li>Max 25 parameters per event (50 for custom events)</li>
          <li>Reserved prefixes: <code>ga_</code>, <code>google_</code>, <code>firebase_</code></li>
        </ul>
      </div>
    </div>
  );
}
