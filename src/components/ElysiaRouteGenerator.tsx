import { useState } from 'preact/hooks';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ResponseType = 'JSON' | 'text' | 'stream';
type BodyFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface BodyField {
  id: string;
  name: string;
  type: BodyFieldType;
  optional: boolean;
}

interface RouteConfig {
  path: string;
  method: HttpMethod;
  responseType: ResponseType;
  hasBody: boolean;
  bodyFields: BodyField[];
  hasAuth: boolean;
  description: string;
  tags: string;
}

let _uid = 0;
function uid(): string { return String(++_uid); }
function makeField(): BodyField {
  return { id: uid(), name: '', type: 'string', optional: false };
}

const BODY_FIELD_TYPES: BodyFieldType[] = ['string', 'number', 'boolean', 'array', 'object'];

function bodyFieldToSchema(f: BodyField): string {
  const typeMap: Record<BodyFieldType, string> = {
    string: 't.String()',
    number: 't.Number()',
    boolean: 't.Boolean()',
    array: 't.Array(t.String())',
    object: 't.Object({})',
  };
  const base = typeMap[f.type] ?? 't.String()';
  return f.optional ? `t.Optional(${base})` : base;
}

function buildResponseHandler(rt: ResponseType): string {
  switch (rt) {
    case 'JSON':   return '    return { success: true, data: {} };';
    case 'text':   return '    return "OK";';
    case 'stream':
      return `    return new ReadableStream({
      start(controller) {
        controller.enqueue("chunk");
        controller.close();
      },
    });`;
  }
}

function buildRoute(cfg: RouteConfig): string {
  const method = cfg.method.toLowerCase();
  const path = cfg.path || '/route';
  const lines: string[] = [];

  lines.push('import { Elysia, t } from "elysia";');
  if (cfg.hasAuth) {
    lines.push('import { bearer } from "@elysiajs/bearer";');
  }
  lines.push('');
  lines.push('const app = new Elysia()');

  if (cfg.hasAuth) {
    lines.push('  .use(bearer())');
  }

  const chainLines: string[] = [];

  // Method call open
  let methodOpen = `  .${method}("${path}",`;

  // Handler
  const handlerParams: string[] = [];
  if (cfg.hasBody && cfg.bodyFields.some(f => f.name.trim())) {
    handlerParams.push('{ body }');
  }
  if (cfg.hasAuth) {
    if (handlerParams.length) {
      handlerParams[0] = handlerParams[0].replace('}', ', bearer }').replace('{ bearer }', '{ bearer }');
    } else {
      handlerParams.push('{ bearer }');
    }
  }

  const paramStr = handlerParams.length ? handlerParams.join(', ') : '_ctx';

  const handlerLines: string[] = [];
  if (cfg.hasAuth) {
    handlerLines.push('    if (!bearer) {');
    handlerLines.push('      throw new Error("Unauthorized");');
    handlerLines.push('    }');
  }
  handlerLines.push(buildResponseHandler(cfg.responseType));

  const handlerBlock = [
    `    async (${paramStr}) => {`,
    ...handlerLines,
    '    },',
  ].join('\n');

  // Schema block
  const schemaEntries: string[] = [];

  if (cfg.description.trim()) {
    schemaEntries.push(`    detail: {\n      summary: "${cfg.description}",${cfg.tags.trim() ? `\n      tags: [${cfg.tags.split(',').map(t => `"${t.trim()}"`).join(', ')}],` : ''}\n    },`);
  }

  if (cfg.hasBody && cfg.bodyFields.some(f => f.name.trim())) {
    const fieldLines = cfg.bodyFields
      .filter(f => f.name.trim())
      .map(f => `      ${f.name}: ${bodyFieldToSchema(f)},`);
    schemaEntries.push(`    body: t.Object({\n${fieldLines.join('\n')}\n    }),`);
  }

  if (cfg.responseType === 'JSON') {
    schemaEntries.push(`    response: t.Object({\n      success: t.Boolean(),\n      data: t.Object({}),\n    }),`);
  } else if (cfg.responseType === 'text') {
    schemaEntries.push('    response: t.String(),');
  }

  const schemaBlock = schemaEntries.length
    ? `\n    // Schema\n${schemaEntries.join('\n')}`
    : '';

  if (schemaBlock) {
    chainLines.push(`${methodOpen}\n${handlerBlock}\n  {${schemaBlock}\n  }`);
  } else {
    chainLines.push(`${methodOpen}\n${handlerBlock}`);
  }

  lines.push(...chainLines);
  lines.push('  .listen(3000);');
  lines.push('');
  lines.push('console.log(`Elysia running at http://localhost:3000`);');

  return lines.join('\n');
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span class="text-sm">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

const DEFAULT_CFG: RouteConfig = {
  path: '/users/:id',
  method: 'GET',
  responseType: 'JSON',
  hasBody: false,
  bodyFields: [],
  hasAuth: false,
  description: '',
  tags: '',
};

export default function ElysiaRouteGenerator() {
  const [cfg, setCfg] = useState<RouteConfig>(DEFAULT_CFG);
  const [copied, setCopied] = useState(false);

  const output = buildRoute(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const set = <K extends keyof RouteConfig>(key: K, value: RouteConfig[K]) =>
    setCfg(prev => ({ ...prev, [key]: value }));

  const addField = () =>
    setCfg(prev => ({ ...prev, bodyFields: [...prev.bodyFields, makeField()] }));

  const removeField = (id: string) =>
    setCfg(prev => ({ ...prev, bodyFields: prev.bodyFields.filter(f => f.id !== id) }));

  const updateField = (id: string, patch: Partial<BodyField>) =>
    setCfg(prev => ({
      ...prev,
      bodyFields: prev.bodyFields.map(f => f.id === id ? { ...f, ...patch } : f),
    }));

  const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const methodColors: Record<HttpMethod, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    PATCH: 'text-orange-400',
    DELETE: 'text-red-400',
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: controls */}
      <div class="space-y-4">
        <Section title="Route">
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-text-muted block mb-1">Path</label>
              <input
                type="text"
                placeholder="/users/:id"
                value={cfg.path}
                onInput={e => set('path', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Method</label>
              <select
                value={cfg.method}
                onChange={e => set('method', (e.target as HTMLSelectElement).value as HttpMethod)}
                class={`w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-semibold focus:outline-none focus:border-accent ${methodColors[cfg.method]}`}
              >
                {HTTP_METHODS.map(m => (
                  <option key={m} value={m} class={methodColors[m]}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label class="text-xs text-text-muted block mb-1">Response type</label>
            <div class="flex gap-2">
              {(['JSON', 'text', 'stream'] as ResponseType[]).map(rt => (
                <button
                  key={rt}
                  onClick={() => set('responseType', rt)}
                  class={`px-3 py-1 text-xs rounded-full border transition-colors ${cfg.responseType === rt ? 'bg-accent border-accent text-white' : 'border-border text-text-muted hover:border-accent'}`}
                >
                  {rt}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Options">
          <Toggle checked={cfg.hasAuth} onChange={v => set('hasAuth', v)} label="Bearer auth (@elysiajs/bearer)" />
          <Toggle
            checked={cfg.hasBody}
            onChange={v => set('hasBody', v)}
            label="Request body (t.Object schema)"
          />
        </Section>

        {cfg.hasBody && (
          <Section title="Body Schema">
            <div class="space-y-2">
              {cfg.bodyFields.map(field => (
                <div key={field.id} class="flex items-center gap-2 bg-bg rounded p-2 border border-border">
                  <input
                    type="text"
                    placeholder="field"
                    value={field.name}
                    onInput={e => updateField(field.id, { name: (e.target as HTMLInputElement).value })}
                    class="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent"
                  />
                  <select
                    value={field.type}
                    onChange={e => updateField(field.id, { type: (e.target as HTMLSelectElement).value as BodyFieldType })}
                    class="bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent"
                  >
                    {BODY_FIELD_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Toggle
                    checked={field.optional}
                    onChange={v => updateField(field.id, { optional: v })}
                    label="?"
                  />
                  <button
                    onClick={() => removeField(field.id)}
                    class="text-xs text-red-400 hover:text-red-300 transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={addField}
                class="w-full px-2 py-1 text-xs text-blue-400 hover:text-blue-300 border border-dashed border-border hover:border-blue-500 rounded transition-colors"
              >
                + Add Field
              </button>
            </div>
          </Section>
        )}

        <Section title="Documentation">
          <div>
            <label class="text-xs text-text-muted block mb-1">Summary / description</label>
            <input
              type="text"
              placeholder="Get user by ID"
              value={cfg.description}
              onInput={e => set('description', (e.target as HTMLInputElement).value)}
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              placeholder="users, auth"
              value={cfg.tags}
              onInput={e => set('tags', (e.target as HTMLInputElement).value)}
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent"
            />
          </div>
        </Section>
      </div>

      {/* Right: output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class={`text-sm font-bold font-mono ${methodColors[cfg.method]}`}>{cfg.method}</span>
            <span class="text-sm font-mono text-text-muted">{cfg.path || '/route'}</span>
          </div>
          <button
            onClick={handleCopy}
            class="px-3 py-1.5 text-xs bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[700px] text-green-400 whitespace-pre-wrap">
          {output}
        </pre>

        {/* Elysia quick reference */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Elysia Type Reference</h4>
          <div class="grid grid-cols-2 gap-1 text-xs font-mono">
            {[
              ['string', 't.String()'],
              ['number', 't.Number()'],
              ['boolean', 't.Boolean()'],
              ['array', 't.Array(t.String())'],
              ['object', 't.Object({})'],
              ['optional', 't.Optional(...)'],
              ['enum', 't.Union([...])'],
              ['file', 't.File()'],
            ].map(([label, code]) => (
              <div key={label} class="flex items-center gap-2">
                <span class="text-text-muted w-16">{label}</span>
                <span class="text-blue-400">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
