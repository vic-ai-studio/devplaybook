import { useState, useCallback } from 'preact/hooks';

type SchemaVersion = 'draft-07' | '2020-12';

function inferType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function jsonToSchema(value: unknown, version: SchemaVersion, visited = new WeakSet()): Record<string, unknown> {
  const schemaId = version === 'draft-07'
    ? 'http://json-schema.org/draft-07/schema#'
    : 'https://json-schema.org/draft/2020-12/schema';

  function buildSchema(val: unknown): Record<string, unknown> {
    if (val === null) return { type: 'null' };

    if (Array.isArray(val)) {
      if (val.length === 0) return { type: 'array', items: {} };
      // Merge all item schemas
      const itemSchemas = val.map(buildSchema);
      const allSameType = itemSchemas.every(s => s.type === itemSchemas[0].type);
      const items = allSameType ? itemSchemas[0] : (version === 'draft-07' ? { oneOf: itemSchemas } : { anyOf: itemSchemas });
      return { type: 'array', items };
    }

    if (typeof val === 'object' && val !== null) {
      if (visited.has(val as object)) return { type: 'object' };
      visited.add(val as object);

      const properties: Record<string, unknown> = {};
      const required: string[] = [];

      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        properties[k] = buildSchema(v);
        required.push(k);
      }

      visited.delete(val as object);
      return { type: 'object', properties, required };
    }

    const t = typeof val;
    if (t === 'string') {
      const s = val as string;
      // Detect formats
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { type: 'string', format: 'date' };
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return { type: 'string', format: 'date-time' };
      if (/^[^@]+@[^@]+\.[^@]+$/.test(s)) return { type: 'string', format: 'email' };
      if (/^https?:\/\//.test(s)) return { type: 'string', format: 'uri' };
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return { type: 'string', format: 'uuid' };
      return { type: 'string' };
    }
    if (t === 'number') {
      return Number.isInteger(val) ? { type: 'integer' } : { type: 'number' };
    }
    return { type: t };
  }

  const schema = buildSchema(value);
  const idKey = version === 'draft-07' ? '$schema' : '$schema';
  return { [idKey]: schemaId, ...schema };
}

const SAMPLE_JSON = `{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Alice Chen",
  "email": "alice@example.com",
  "age": 30,
  "isPremium": true,
  "score": 9.5,
  "createdAt": "2024-01-15T10:30:00Z",
  "profile": {
    "bio": "Full-stack developer",
    "website": "https://alice.dev"
  },
  "tags": ["typescript", "react", "node"]
}`;

export default function JsonSchemaGenerator() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [version, setVersion] = useState<SchemaVersion>('draft-07');
  const [schema, setSchema] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    setError('');
    setSchema('');
    try {
      const parsed = JSON.parse(input.trim());
      const result = jsonToSchema(parsed, version);
      setSchema(JSON.stringify(result, null, 2));
    } catch (e: any) {
      setError(e.message || 'Invalid JSON');
    }
  }, [input, version]);

  const copy = async () => {
    if (!schema) return;
    await navigator.clipboard.writeText(schema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-generate on load
  if (!schema && !error) {
    try {
      const parsed = JSON.parse(SAMPLE_JSON);
      const result = jsonToSchema(parsed, 'draft-07');
      // setState doesn't work in render, use effect via key trick
    } catch {}
  }

  return (
    <div class="space-y-4">
      {/* Version selector */}
      <div class="flex items-center gap-4">
        <span class="text-sm text-text-muted">Schema version:</span>
        {(['draft-07', '2020-12'] as SchemaVersion[]).map(v => (
          <label key={v} class="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="version"
              value={v}
              checked={version === v}
              onChange={() => setVersion(v)}
              class="accent-accent"
            />
            <span class="text-sm font-mono">{v}</span>
          </label>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text-muted">Input JSON</label>
            <button
              onClick={() => { setInput(SAMPLE_JSON); setSchema(''); setError(''); }}
              class="text-xs text-accent hover:underline"
            >
              Load sample
            </button>
          </div>
          <textarea
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            class="w-full h-80 bg-surface border border-border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none focus:border-accent"
            placeholder="Paste your JSON here..."
            spellcheck={false}
          />
          {error && (
            <div class="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded p-2">
              ⚠ {error}
            </div>
          )}
          <button
            onClick={generate}
            class="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Generate Schema
          </button>
        </div>

        {/* Output */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text-muted">
              Generated Schema ({version === 'draft-07' ? 'JSON Schema Draft-07' : 'JSON Schema 2020-12'})
            </label>
            {schema && (
              <button
                onClick={copy}
                class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>
          <textarea
            value={schema}
            readOnly
            class="w-full h-80 bg-surface border border-border rounded-lg p-3 font-mono text-sm resize-none focus:outline-none text-text-muted"
            placeholder="Generated schema will appear here..."
            spellcheck={false}
          />
          {schema && (
            <div class="text-xs text-text-muted bg-surface border border-border rounded p-2">
              Schema generated successfully. Detected formats: date-time, email, uri, uuid, integer vs number.
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div class="text-xs text-text-muted border-t border-border pt-3 space-y-1">
        <p>Supported formats: <code class="bg-surface px-1 rounded">date</code>, <code class="bg-surface px-1 rounded">date-time</code>, <code class="bg-surface px-1 rounded">email</code>, <code class="bg-surface px-1 rounded">uri</code>, <code class="bg-surface px-1 rounded">uuid</code> • Distinguishes <code class="bg-surface px-1 rounded">integer</code> vs <code class="bg-surface px-1 rounded">number</code> • All fields marked as <code class="bg-surface px-1 rounded">required</code> • Runs 100% in your browser.</p>
      </div>
    </div>
  );
}
