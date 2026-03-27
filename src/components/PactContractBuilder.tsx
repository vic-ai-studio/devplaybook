import { useState, useCallback } from 'preact/hooks';

interface PactHeader { key: string; value: string }
interface PactBody { raw: string; valid: boolean }

interface PactInteraction {
  id: string;
  description: string;
  providerState: string;
  reqMethod: string;
  reqPath: string;
  reqHeaders: PactHeader[];
  reqBody: PactBody;
  resStatus: string;
  resHeaders: PactHeader[];
  resBody: PactBody;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function tryParseJson(raw: string) {
  try { return { parsed: JSON.parse(raw), valid: true }; }
  catch { return { parsed: null, valid: raw.trim() === '' }; }
}

function buildPactJson(
  consumer: string,
  provider: string,
  interactions: PactInteraction[],
  pactVersion: string,
) {
  const pact: Record<string, unknown> = {
    consumer: { name: consumer || 'ConsumerApp' },
    provider: { name: provider || 'ProviderService' },
    interactions: interactions.map(i => {
      const interaction: Record<string, unknown> = {
        description: i.description || 'an interaction',
        request: {
          method: i.reqMethod,
          path: i.reqPath || '/',
        },
        response: {
          status: parseInt(i.resStatus, 10) || 200,
        },
      };

      if (i.providerState) interaction.providerState = i.providerState;

      // Request
      const req = interaction.request as Record<string, unknown>;
      if (i.reqHeaders.some(h => h.key)) {
        req.headers = Object.fromEntries(i.reqHeaders.filter(h => h.key).map(h => [h.key, h.value]));
      }
      if (i.reqBody.raw.trim()) {
        const { parsed, valid } = tryParseJson(i.reqBody.raw);
        req.body = valid && parsed !== null ? parsed : i.reqBody.raw;
      }

      // Response
      const res = interaction.response as Record<string, unknown>;
      if (i.resHeaders.some(h => h.key)) {
        res.headers = Object.fromEntries(i.resHeaders.filter(h => h.key).map(h => [h.key, h.value]));
      }
      if (i.resBody.raw.trim()) {
        const { parsed, valid } = tryParseJson(i.resBody.raw);
        res.body = valid && parsed !== null ? parsed : i.resBody.raw;
      }

      return interaction;
    }),
    metadata: {
      pactSpecification: { version: pactVersion },
    },
  };

  return JSON.stringify(pact, null, 2);
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const STATUS_CODES = [
  { code: '200', label: '200 OK' },
  { code: '201', label: '201 Created' },
  { code: '204', label: '204 No Content' },
  { code: '400', label: '400 Bad Request' },
  { code: '401', label: '401 Unauthorized' },
  { code: '403', label: '403 Forbidden' },
  { code: '404', label: '404 Not Found' },
  { code: '409', label: '409 Conflict' },
  { code: '422', label: '422 Unprocessable Entity' },
  { code: '500', label: '500 Internal Server Error' },
];

function newInteraction(): PactInteraction {
  return {
    id: uid(),
    description: '',
    providerState: '',
    reqMethod: 'GET',
    reqPath: '/',
    reqHeaders: [{ key: 'Accept', value: 'application/json' }],
    reqBody: { raw: '', valid: true },
    resStatus: '200',
    resHeaders: [{ key: 'Content-Type', value: 'application/json' }],
    resBody: { raw: '{"message":"ok"}', valid: true },
  };
}

function HeaderEditor({ headers, onChange }: {
  headers: PactHeader[];
  onChange: (headers: PactHeader[]) => void;
}) {
  const update = (idx: number, field: keyof PactHeader, val: string) => {
    const next = headers.map((h, i) => i === idx ? { ...h, [field]: val } : h);
    onChange(next);
  };
  const add = () => onChange([...headers, { key: '', value: '' }]);
  const remove = (idx: number) => onChange(headers.filter((_, i) => i !== idx));

  return (
    <div class="space-y-1.5">
      {headers.map((h, i) => (
        <div key={i} class="flex gap-2">
          <input
            value={h.key}
            onInput={e => update(i, 'key', (e.target as HTMLInputElement).value)}
            placeholder="Header-Name"
            class="flex-1 bg-[#0d1117] border border-border rounded px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-accent"
          />
          <input
            value={h.value}
            onInput={e => update(i, 'value', (e.target as HTMLInputElement).value)}
            placeholder="value"
            class="flex-1 bg-[#0d1117] border border-border rounded px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-accent"
          />
          <button onClick={() => remove(i)} class="px-2 text-text-muted hover:text-red-400 transition-colors text-xs">✕</button>
        </div>
      ))}
      <button onClick={add} class="text-xs text-accent hover:underline">+ Add header</button>
    </div>
  );
}

function BodyEditor({ body, onChange, label }: { body: PactBody; onChange: (b: PactBody) => void; label: string }) {
  const onInput = (raw: string) => {
    const { valid } = tryParseJson(raw);
    onChange({ raw, valid: valid || raw.trim() === '' });
  };
  const prettify = () => {
    const { parsed, valid } = tryParseJson(body.raw);
    if (valid && parsed !== null) onChange({ raw: JSON.stringify(parsed, null, 2), valid: true });
  };
  return (
    <div>
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-text-muted">{label}</span>
        {body.raw.trim() && (
          <button onClick={prettify} class="text-xs text-accent hover:underline">Prettify JSON</button>
        )}
      </div>
      <textarea
        value={body.raw}
        onInput={e => onInput((e.target as HTMLTextAreaElement).value)}
        placeholder='{"key":"value"} or leave empty'
        class={`w-full h-24 bg-[#0d1117] border rounded p-2 font-mono text-xs resize-none focus:outline-none text-text ${body.valid ? 'border-border focus:border-accent' : 'border-red-500/60'}`}
        spellcheck={false}
      />
      {!body.valid && <p class="text-xs text-red-400 mt-0.5">Invalid JSON</p>}
    </div>
  );
}

export default function PactContractBuilder() {
  const [consumer, setConsumer] = useState('FrontendApp');
  const [provider, setProvider] = useState('UserService');
  const [pactVersion, setPactVersion] = useState('2.0.0');
  const [interactions, setInteractions] = useState<PactInteraction[]>([newInteraction()]);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(interactions[0]?.id ?? null);

  const updateInteraction = useCallback((id: string, patch: Partial<PactInteraction>) => {
    setInteractions(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }, []);

  const addInteraction = useCallback(() => {
    const i = newInteraction();
    setInteractions(prev => [...prev, i]);
    setExpandedId(i.id);
  }, []);

  const removeInteraction = useCallback((id: string) => {
    setInteractions(prev => {
      const next = prev.filter(i => i.id !== id);
      if (expandedId === id) setExpandedId(next[0]?.id ?? null);
      return next;
    });
  }, [expandedId]);

  const generate = useCallback(() => {
    setOutput(buildPactJson(consumer, provider, interactions, pactVersion));
  }, [consumer, provider, interactions, pactVersion]);

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [output]);

  const download = useCallback(() => {
    const blob = new Blob([output], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${consumer}-${provider}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, consumer, provider]);

  return (
    <div class="space-y-5">
      {/* Consumer / Provider */}
      <div class="p-4 bg-surface border border-border rounded-lg space-y-3">
        <div class="text-sm font-medium text-text">Contract Parties</div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-text-muted block mb-1">Consumer Name</label>
            <input
              value={consumer}
              onInput={e => setConsumer((e.target as HTMLInputElement).value)}
              placeholder="FrontendApp"
              class="w-full bg-[#0d1117] border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">Provider Name</label>
            <input
              value={provider}
              onInput={e => setProvider((e.target as HTMLInputElement).value)}
              placeholder="UserService"
              class="w-full bg-[#0d1117] border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">Pact Spec Version</label>
            <select
              value={pactVersion}
              onChange={e => setPactVersion((e.target as HTMLSelectElement).value)}
              class="w-full bg-[#0d1117] border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
            >
              <option value="2.0.0">2.0.0</option>
              <option value="3.0.0">3.0.0</option>
              <option value="4.0.0">4.0.0</option>
            </select>
          </div>
        </div>
      </div>

      {/* Interactions */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-text">Interactions ({interactions.length})</div>
          <button onClick={addInteraction} class="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors">
            + Add Interaction
          </button>
        </div>

        {interactions.map((interaction) => {
          const isOpen = expandedId === interaction.id;
          return (
            <div key={interaction.id} class="border border-border rounded-lg overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedId(isOpen ? null : interaction.id)}
                class="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-surface/80 transition-colors text-left"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <span class="text-xs font-bold text-accent">{interaction.reqMethod}</span>
                  <span class="text-sm text-text truncate">{interaction.reqPath || '/'}</span>
                  {interaction.description && <span class="text-xs text-text-muted truncate hidden sm:block">— {interaction.description}</span>}
                </div>
                <div class="flex items-center gap-2 shrink-0 ml-2">
                  <span class="text-xs text-text-muted">{interaction.resStatus}</span>
                  {interactions.length > 1 && (
                    <button
                      onClick={e => { e.stopPropagation(); removeInteraction(interaction.id); }}
                      class="text-xs text-text-muted hover:text-red-400 transition-colors px-1"
                    >✕</button>
                  )}
                  <span class="text-xs text-text-muted">{isOpen ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Body */}
              {isOpen && (
                <div class="p-4 space-y-4 border-t border-border">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="text-xs text-text-muted block mb-1">Description</label>
                      <input
                        value={interaction.description}
                        onInput={e => updateInteraction(interaction.id, { description: (e.target as HTMLInputElement).value })}
                        placeholder="a request to get a user"
                        class="w-full bg-[#0d1117] border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label class="text-xs text-text-muted block mb-1">Provider State</label>
                      <input
                        value={interaction.providerState}
                        onInput={e => updateInteraction(interaction.id, { providerState: (e.target as HTMLInputElement).value })}
                        placeholder="a user with id 123 exists"
                        class="w-full bg-[#0d1117] border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="text-xs font-semibold text-text-muted uppercase tracking-wide">Request</div>
                    <div class="grid grid-cols-3 gap-2">
                      <div>
                        <label class="text-xs text-text-muted block mb-1">Method</label>
                        <select
                          value={interaction.reqMethod}
                          onChange={e => updateInteraction(interaction.id, { reqMethod: (e.target as HTMLSelectElement).value })}
                          class="w-full bg-[#0d1117] border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                        >
                          {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div class="col-span-2">
                        <label class="text-xs text-text-muted block mb-1">Path</label>
                        <input
                          value={interaction.reqPath}
                          onInput={e => updateInteraction(interaction.id, { reqPath: (e.target as HTMLInputElement).value })}
                          placeholder="/users/123"
                          class="w-full bg-[#0d1117] border border-border rounded px-2 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    <div>
                      <label class="text-xs text-text-muted block mb-1">Request Headers</label>
                      <HeaderEditor headers={interaction.reqHeaders} onChange={h => updateInteraction(interaction.id, { reqHeaders: h })} />
                    </div>
                    <BodyEditor
                      body={interaction.reqBody}
                      onChange={b => updateInteraction(interaction.id, { reqBody: b })}
                      label="Request Body (optional)"
                    />
                  </div>

                  <div class="space-y-2">
                    <div class="text-xs font-semibold text-text-muted uppercase tracking-wide">Response</div>
                    <div>
                      <label class="text-xs text-text-muted block mb-1">Status Code</label>
                      <select
                        value={interaction.resStatus}
                        onChange={e => updateInteraction(interaction.id, { resStatus: (e.target as HTMLSelectElement).value })}
                        class="w-full sm:w-48 bg-[#0d1117] border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent"
                      >
                        {STATUS_CODES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label class="text-xs text-text-muted block mb-1">Response Headers</label>
                      <HeaderEditor headers={interaction.resHeaders} onChange={h => updateInteraction(interaction.id, { resHeaders: h })} />
                    </div>
                    <BodyEditor
                      body={interaction.resBody}
                      onChange={b => updateInteraction(interaction.id, { resBody: b })}
                      label="Response Body"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button onClick={generate} class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium">
        Generate Pact Contract
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-sm font-medium text-text">Pact Contract JSON</span>
            <div class="flex gap-2">
              <button onClick={copy} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={download} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
                Download .json
              </button>
            </div>
          </div>
          <pre class="bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto max-h-96 whitespace-pre">{output}</pre>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Builds consumer-driven contract JSON for the Pact framework. Supports Pact Spec v2, v3, and v4. All contract generation runs in your browser — nothing is sent to any server.
      </p>
    </div>
  );
}
