import { useState, useCallback, useEffect } from 'preact/hooks';

// ─── Types ────────────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type ParamLocation = 'path' | 'query' | 'header' | 'cookie';
type ParamType = 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
type OutputFormat = 'yaml' | 'json';

interface Parameter {
  id: string;
  name: string;
  in: ParamLocation;
  type: ParamType;
  required: boolean;
  description: string;
}

interface ResponseConfig {
  code: string;
  description: string;
  enabled: boolean;
  custom: boolean;
}

interface RequestBodyConfig {
  enabled: boolean;
  contentType: 'application/json' | 'multipart/form-data' | 'application/x-www-form-urlencoded';
  schema: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:    'bg-blue-500/20 text-blue-400 border-blue-500/30',
  POST:   'bg-green-500/20 text-green-400 border-green-500/30',
  PUT:    'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  PATCH:  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const PARAM_TYPES: ParamType[] = ['string', 'integer', 'number', 'boolean', 'array', 'object'];
const PARAM_LOCATIONS: ParamLocation[] = ['path', 'query', 'header', 'cookie'];
const CONTENT_TYPES = ['application/json', 'multipart/form-data', 'application/x-www-form-urlencoded'] as const;

const DEFAULT_RESPONSES: ResponseConfig[] = [
  { code: '200', description: 'OK',                    enabled: true,  custom: false },
  { code: '201', description: 'Created',               enabled: false, custom: false },
  { code: '400', description: 'Bad Request',           enabled: true,  custom: false },
  { code: '401', description: 'Unauthorized',          enabled: false, custom: false },
  { code: '403', description: 'Forbidden',             enabled: false, custom: false },
  { code: '404', description: 'Not Found',             enabled: true,  custom: false },
  { code: '422', description: 'Unprocessable Entity',  enabled: false, custom: false },
  { code: '429', description: 'Too Many Requests',     enabled: false, custom: false },
  { code: '500', description: 'Internal Server Error', enabled: true,  custom: false },
];

const DEFAULT_SCHEMA_JSON = `{
  "type": "object",
  "required": ["name"],
  "properties": {
    "name": {
      "type": "string",
      "example": "Alice"
    },
    "email": {
      "type": "string",
      "format": "email"
    }
  }
}`;

let _pid = 1;
function makeParamId() { return `p_${_pid++}`; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugifyPath(path: string): string {
  return path
    .replace(/^\//, '')
    .replace(/[{}]/g, '')
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function autoOperationId(method: HttpMethod, path: string): string {
  const slug = slugifyPath(path) || 'resource';
  const methodMap: Record<HttpMethod, string> = {
    GET: 'get',
    POST: 'create',
    PUT: 'update',
    PATCH: 'patch',
    DELETE: 'delete',
  };
  return `${methodMap[method]}${slug.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('')}`;
}

// ─── YAML Serializer (minimal, no external dep) ───────────────────────────────

function indent(str: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return str.split('\n').map(l => pad + l).join('\n');
}

function yamlString(val: string): string {
  // Use block scalar only for multi-line
  if (val.includes('\n')) return `|\n${indent(val, 2)}`;
  // Quote if contains special chars
  if (/[:#\[\]{}&*!,|>'"%@`]/.test(val) || val.trim() !== val) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val || '""';
}

interface SchemaObj {
  type?: string;
  format?: string;
  example?: unknown;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  [key: string]: unknown;
}

function buildOutput(
  method: HttpMethod,
  path: string,
  summary: string,
  description: string,
  tags: string[],
  operationId: string,
  parameters: Parameter[],
  requestBody: RequestBodyConfig,
  responses: ResponseConfig[],
  format: OutputFormat,
): string {
  const methodLower = method.toLowerCase();
  const enabledResponses = responses.filter(r => r.enabled);

  // ── Build the operation object ─────────────────────────────────────────────
  const operation: Record<string, unknown> = {};

  if (summary) operation.summary = summary;
  if (operationId) operation.operationId = operationId;
  if (tags.length) operation.tags = tags;
  if (description) operation.description = description;

  if (parameters.length) {
    operation.parameters = parameters.map(p => {
      const obj: Record<string, unknown> = {
        name: p.name || 'param',
        in: p.in,
        required: p.in === 'path' ? true : p.required,
        schema: { type: p.type },
      };
      if (p.description) obj.description = p.description;
      return obj;
    });
  }

  const needsBody = ['POST', 'PUT', 'PATCH'].includes(method);
  if (needsBody && requestBody.enabled) {
    let schemaObj: SchemaObj = { type: 'object' };
    try { schemaObj = JSON.parse(requestBody.schema); } catch { /* keep default */ }
    operation.requestBody = {
      required: true,
      content: {
        [requestBody.contentType]: {
          schema: schemaObj,
        },
      },
    };
  }

  if (enabledResponses.length) {
    const respObj: Record<string, { description: string }> = {};
    for (const r of enabledResponses) {
      respObj[r.code] = { description: r.description || 'Response' };
    }
    operation.responses = respObj;
  } else {
    operation.responses = { '200': { description: 'OK' } };
  }

  const root: Record<string, unknown> = {
    [path || '/']: {
      [methodLower]: operation,
    },
  };

  if (format === 'json') {
    return JSON.stringify(root, null, 2);
  }

  // ── YAML serialization ─────────────────────────────────────────────────────
  return serializeYaml(root, 0);
}

function serializeYaml(val: unknown, depth: number): string {
  const pad = ' '.repeat(depth);

  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);

  if (typeof val === 'string') {
    return depth === 0 ? val : yamlString(val);
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return val.map(item => {
      const serialized = serializeYaml(item, depth + 2);
      if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
        const lines = serialized.split('\n');
        return `${pad}- ${lines[0].trimStart()}\n${lines.slice(1).join('\n')}`;
      }
      return `${pad}- ${serialized}`;
    }).join('\n');
  }

  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    return entries.map(([k, v]) => {
      const key = /[:#\[\]{}&*!,|>'"%@`\s]/.test(k) ? `"${k}"` : k;
      if (v === null || v === undefined) return `${pad}${key}: null`;
      if (typeof v === 'object') {
        if (Array.isArray(v) && v.length === 0) return `${pad}${key}: []`;
        if (!Array.isArray(v) && Object.keys(v as object).length === 0) return `${pad}${key}: {}`;
        const child = serializeYaml(v, depth + 2);
        if (Array.isArray(v)) {
          return `${pad}${key}:\n${child}`;
        }
        return `${pad}${key}:\n${child}`;
      }
      return `${pad}${key}: ${serializeYaml(v, 0)}`;
    }).join('\n');
  }

  return String(val);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div class="mb-3">
      <h3 class="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p class="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Label({ children }: { children: string }) {
  return <label class="block text-xs font-medium text-text-muted mb-1">{children}</label>;
}

function Input({ value, onChange, placeholder, className = '', ...rest }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  [k: string]: unknown;
}) {
  return (
    <input
      type="text"
      value={value}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      placeholder={placeholder}
      class={`w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors ${className}`}
      {...rest}
    />
  );
}

function Select({ value, onChange, options, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
      class={`bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors ${className}`}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${checked ? 'bg-blue-600' : 'bg-zinc-600'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      {label && <span class="text-xs text-text-muted">{label}</span>}
    </label>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OpenApiPathGenerator() {
  // Core fields
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/users/{id}');
  const [summary, setSummary] = useState('Get user by ID');
  const [description, setDescription] = useState('');
  const [tagsRaw, setTagsRaw] = useState('users');
  const [operationId, setOperationId] = useState('getUserById');
  const [operationIdEdited, setOperationIdEdited] = useState(false);

  // Parameters
  const [parameters, setParameters] = useState<Parameter[]>([
    { id: makeParamId(), name: 'id', in: 'path', type: 'string', required: true, description: 'User ID' },
  ]);

  // Request body
  const [requestBody, setRequestBody] = useState<RequestBodyConfig>({
    enabled: true,
    contentType: 'application/json',
    schema: DEFAULT_SCHEMA_JSON,
  });

  // Responses
  const [responses, setResponses] = useState<ResponseConfig[]>(DEFAULT_RESPONSES);
  const [newRespCode, setNewRespCode] = useState('');
  const [newRespDesc, setNewRespDesc] = useState('');

  // Output
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('yaml');
  const [copied, setCopied] = useState(false);

  // Auto-generate operation ID when method/path change (unless user edited it)
  useEffect(() => {
    if (!operationIdEdited) {
      setOperationId(autoOperationId(method, path));
    }
  }, [method, path, operationIdEdited]);

  // Auto-enable 201 for POST, 200 for others
  useEffect(() => {
    if (method === 'POST') {
      setResponses(prev => prev.map(r =>
        r.code === '201' ? { ...r, enabled: true } :
        r.code === '200' ? { ...r, enabled: false } :
        r
      ));
    } else {
      setResponses(prev => prev.map(r =>
        r.code === '200' ? { ...r, enabled: true } :
        r.code === '201' ? { ...r, enabled: false } :
        r
      ));
    }
  }, [method]);

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  const needsBody = ['POST', 'PUT', 'PATCH'].includes(method);

  // ── Parameters ──────────────────────────────────────────────────────────────

  const addParam = useCallback(() => {
    setParameters(prev => [...prev, {
      id: makeParamId(),
      name: '',
      in: 'query',
      type: 'string',
      required: false,
      description: '',
    }]);
  }, []);

  const updateParam = useCallback((id: string, key: keyof Parameter, value: unknown) => {
    setParameters(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  }, []);

  const removeParam = useCallback((id: string) => {
    setParameters(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Responses ───────────────────────────────────────────────────────────────

  const toggleResponse = useCallback((code: string) => {
    setResponses(prev => prev.map(r => r.code === code ? { ...r, enabled: !r.enabled } : r));
  }, []);

  const updateResponseDesc = useCallback((code: string, desc: string) => {
    setResponses(prev => prev.map(r => r.code === code ? { ...r, description: desc } : r));
  }, []);

  const addCustomResponse = useCallback(() => {
    const code = newRespCode.trim();
    if (!code || !/^\d{3}$/.test(code)) return;
    setResponses(prev => {
      if (prev.some(r => r.code === code)) return prev;
      return [...prev, { code, description: newRespDesc || 'Custom response', enabled: true, custom: true }];
    });
    setNewRespCode('');
    setNewRespDesc('');
  }, [newRespCode, newRespDesc]);

  const removeCustomResponse = useCallback((code: string) => {
    setResponses(prev => prev.filter(r => r.code !== code));
  }, []);

  // ── Output ──────────────────────────────────────────────────────────────────

  const output = buildOutput(
    method, path, summary, description, tags, operationId,
    parameters, requestBody, responses, outputFormat,
  );

  const copyOutput = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = output;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [output]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 font-mono text-sm">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div class="space-y-5">

        {/* Method + Path */}
        <div class="bg-surface rounded-lg p-4 border border-zinc-700/50">
          <SectionHeader title="Endpoint" />
          <div class="flex gap-2 mb-3">
            {HTTP_METHODS.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                class={`px-3 py-1 rounded border text-xs font-bold transition-all ${
                  method === m
                    ? METHOD_COLORS[m]
                    : 'bg-transparent text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div class="mb-3">
            <Label>Path</Label>
            <Input
              value={path}
              onChange={setPath}
              placeholder="/users/{id}"
            />
            <p class="text-xs text-zinc-500 mt-1">Use <code class="bg-zinc-700/50 px-1 rounded">{'{id}'}</code> syntax for path parameters</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label>Summary</Label>
              <Input value={summary} onChange={setSummary} placeholder="Short description" />
            </div>
            <div>
              <Label>Tags (comma separated)</Label>
              <Input value={tagsRaw} onChange={setTagsRaw} placeholder="users, auth" />
            </div>
          </div>
          <div class="mt-3">
            <Label>Description (optional)</Label>
            <textarea
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Longer description of this operation…"
              rows={2}
              class="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>
          <div class="mt-3">
            <Label>Operation ID</Label>
            <Input
              value={operationId}
              onChange={(v) => { setOperationId(v); setOperationIdEdited(true); }}
              placeholder="getUser"
            />
            {operationIdEdited && (
              <button
                type="button"
                onClick={() => { setOperationIdEdited(false); setOperationId(autoOperationId(method, path)); }}
                class="text-xs text-blue-400 hover:text-blue-300 mt-1"
              >
                ↺ Auto-generate
              </button>
            )}
          </div>
        </div>

        {/* Parameters */}
        <div class="bg-surface rounded-lg p-4 border border-zinc-700/50">
          <div class="flex items-center justify-between mb-3">
            <SectionHeader title="Parameters" subtitle="Path, query, header, and cookie params" />
            <button
              type="button"
              onClick={addParam}
              class="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors font-sans font-medium"
            >
              + Add
            </button>
          </div>

          {parameters.length === 0 && (
            <p class="text-xs text-zinc-500 py-2">No parameters yet. Click "Add" to define path, query or header params.</p>
          )}

          <div class="space-y-3">
            {parameters.map((p) => (
              <div key={p.id} class="bg-zinc-800/60 rounded p-3 border border-zinc-700/40 space-y-2">
                <div class="grid grid-cols-12 gap-2 items-start">
                  {/* Name */}
                  <div class="col-span-4">
                    <Label>Name</Label>
                    <Input
                      value={p.name}
                      onChange={(v) => updateParam(p.id, 'name', v)}
                      placeholder="paramName"
                    />
                  </div>
                  {/* In */}
                  <div class="col-span-3">
                    <Label>In</Label>
                    <Select
                      value={p.in}
                      onChange={(v) => updateParam(p.id, 'in', v as ParamLocation)}
                      options={PARAM_LOCATIONS.map(l => ({ value: l, label: l }))}
                      className="w-full"
                    />
                  </div>
                  {/* Type */}
                  <div class="col-span-3">
                    <Label>Type</Label>
                    <Select
                      value={p.type}
                      onChange={(v) => updateParam(p.id, 'type', v as ParamType)}
                      options={PARAM_TYPES.map(t => ({ value: t, label: t }))}
                      className="w-full"
                    />
                  </div>
                  {/* Remove */}
                  <div class="col-span-2 flex flex-col items-end pt-5">
                    <button
                      type="button"
                      onClick={() => removeParam(p.id)}
                      class="text-zinc-500 hover:text-red-400 transition-colors text-lg leading-none"
                      aria-label="Remove parameter"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {/* Description + Required */}
                <div class="grid grid-cols-12 gap-2 items-center">
                  <div class="col-span-9">
                    <Input
                      value={p.description}
                      onChange={(v) => updateParam(p.id, 'description', v)}
                      placeholder="Parameter description"
                    />
                  </div>
                  <div class="col-span-3 flex justify-end">
                    <Toggle
                      checked={p.in === 'path' ? true : p.required}
                      onChange={(v) => updateParam(p.id, 'required', v)}
                      label={p.in === 'path' ? 'required*' : 'required'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Request Body */}
        {needsBody && (
          <div class="bg-surface rounded-lg p-4 border border-zinc-700/50">
            <div class="flex items-center justify-between mb-3">
              <SectionHeader title="Request Body" subtitle="Payload for POST / PUT / PATCH" />
              <Toggle checked={requestBody.enabled} onChange={(v) => setRequestBody(rb => ({ ...rb, enabled: v }))} />
            </div>

            {requestBody.enabled && (
              <div class="space-y-3">
                <div>
                  <Label>Content Type</Label>
                  <Select
                    value={requestBody.contentType}
                    onChange={(v) => setRequestBody(rb => ({ ...rb, contentType: v as typeof rb.contentType }))}
                    options={CONTENT_TYPES.map(c => ({ value: c, label: c }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label>JSON Schema</Label>
                  <textarea
                    value={requestBody.schema}
                    onInput={(e) => setRequestBody(rb => ({ ...rb, schema: (e.target as HTMLTextAreaElement).value }))}
                    rows={8}
                    spellcheck={false}
                    class="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-y font-mono"
                    placeholder='{ "type": "object", "properties": { ... } }'
                  />
                  <p class="text-xs text-zinc-500 mt-1">Enter a valid JSON Schema object for the request body</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Responses */}
        <div class="bg-surface rounded-lg p-4 border border-zinc-700/50">
          <SectionHeader title="Responses" subtitle="Toggle and customize HTTP response codes" />

          <div class="space-y-2 mb-4">
            {responses.map((r) => (
              <div key={r.code} class={`flex items-center gap-3 rounded px-3 py-2 border transition-colors ${r.enabled ? 'bg-zinc-800/60 border-zinc-600/50' : 'bg-zinc-900/40 border-zinc-800/40'}`}>
                <Toggle checked={r.enabled} onChange={() => toggleResponse(r.code)} />
                <span class={`text-xs font-bold w-10 shrink-0 font-mono ${
                  r.code.startsWith('2') ? 'text-green-400' :
                  r.code.startsWith('4') ? 'text-yellow-400' :
                  r.code.startsWith('5') ? 'text-red-400' : 'text-zinc-400'
                }`}>{r.code}</span>
                <input
                  type="text"
                  value={r.description}
                  onInput={(e) => updateResponseDesc(r.code, (e.target as HTMLInputElement).value)}
                  disabled={!r.enabled}
                  class={`flex-1 bg-transparent text-sm focus:outline-none transition-colors ${r.enabled ? 'text-white' : 'text-zinc-600'}`}
                />
                {r.custom && (
                  <button
                    type="button"
                    onClick={() => removeCustomResponse(r.code)}
                    class="text-zinc-600 hover:text-red-400 transition-colors text-base leading-none ml-1"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add custom response */}
          <div class="flex gap-2 items-end pt-2 border-t border-zinc-700/40">
            <div class="w-20">
              <Label>Code</Label>
              <Input
                value={newRespCode}
                onChange={setNewRespCode}
                placeholder="429"
                className="text-center"
              />
            </div>
            <div class="flex-1">
              <Label>Description</Label>
              <Input
                value={newRespDesc}
                onChange={setNewRespDesc}
                placeholder="Rate limit exceeded"
              />
            </div>
            <button
              type="button"
              onClick={addCustomResponse}
              disabled={!/^\d{3}$/.test(newRespCode.trim())}
              class="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs rounded transition-colors font-sans font-medium h-[34px]"
            >
              Add
            </button>
          </div>
        </div>

      </div>

      {/* ── RIGHT PANEL (Output) ─────────────────────────────────────────── */}
      <div class="flex flex-col gap-4">
        <div class="bg-surface rounded-lg border border-zinc-700/50 overflow-hidden flex flex-col" style="min-height: 520px;">

          {/* Output toolbar */}
          <div class="flex items-center justify-between px-4 py-3 border-b border-zinc-700/50 bg-zinc-800/50">
            <div class="flex items-center gap-1">
              <span class="text-xs font-semibold text-zinc-400 mr-2">Format:</span>
              {(['yaml', 'json'] as OutputFormat[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOutputFormat(f)}
                  class={`px-3 py-1 text-xs rounded font-mono font-bold transition-colors border ${
                    outputFormat === f
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={copyOutput}
              class={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-sans font-medium transition-all border ${
                copied
                  ? 'bg-green-600/20 text-green-400 border-green-500/30'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600'
              }`}
            >
              {copied ? (
                <><span>✓</span> Copied!</>
              ) : (
                <><span>⎘</span> Copy</>
              )}
            </button>
          </div>

          {/* Preview: method badge + path */}
          <div class="px-4 py-2 border-b border-zinc-700/30 bg-zinc-900/30 flex items-center gap-2 flex-wrap">
            <span class={`text-xs font-bold px-2 py-0.5 rounded border ${METHOD_COLORS[method]}`}>{method}</span>
            <code class="text-sm text-zinc-300 font-mono">{path || '/'}</code>
            {tags.length > 0 && tags.map(t => (
              <span key={t} class="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">{t}</span>
            ))}
          </div>

          {/* Generated output */}
          <pre class="flex-1 p-4 text-xs leading-relaxed text-green-300 overflow-auto font-mono whitespace-pre">
            {output}
          </pre>
        </div>

        {/* Quick reference card */}
        <div class="bg-surface rounded-lg p-4 border border-zinc-700/50 text-xs space-y-3">
          <h4 class="text-sm font-semibold text-white">OpenAPI 3.x Quick Reference</h4>
          <div class="grid grid-cols-2 gap-x-6 gap-y-1.5 text-zinc-400">
            <div><code class="text-blue-400">operationId</code> — unique across all paths</div>
            <div><code class="text-blue-400">tags</code> — group operations in docs</div>
            <div><code class="text-blue-400">in: path</code> — always required: true</div>
            <div><code class="text-blue-400">in: query</code> — optional by default</div>
            <div><code class="text-blue-400">$ref</code> — reuse schemas from components</div>
            <div><code class="text-blue-400">nullable</code> — allow null values (3.0)</div>
            <div><code class="text-blue-400">oneOf / anyOf</code> — polymorphic bodies</div>
            <div><code class="text-blue-400">security</code> — override global auth</div>
          </div>
          <div class="pt-2 border-t border-zinc-700/40 text-zinc-500">
            Paste the output into your <code class="text-zinc-400">openapi.yaml</code> under the <code class="text-zinc-400">paths:</code> key.
            Validate with <a href="https://editor.swagger.io" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:underline">Swagger Editor</a> or <code class="text-zinc-400">redocly lint</code>.
          </div>
        </div>
      </div>

    </div>
  );
}
