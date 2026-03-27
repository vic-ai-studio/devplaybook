import { useState, useCallback } from 'preact/hooks';

const SAMPLE_JSON = `[
  {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "age": 28,
    "is_active": true,
    "score": 98.5,
    "tags": ["admin", "user"],
    "address": {
      "street": "123 Main St",
      "city": "Springfield",
      "zip": "12345"
    },
    "created_at": "2024-01-15T10:30:00Z"
  }
]`;

type AvroType = string | object;

interface AvroField {
  name: string;
  type: AvroType;
  doc?: string;
  default?: unknown;
}

interface AvroSchema {
  type: 'record';
  name: string;
  namespace?: string;
  doc?: string;
  fields: AvroField[];
}

function inferAvroType(value: unknown, fieldName: string, namespace: string, nestedSchemas: AvroSchema[]): AvroType {
  if (value === null || value === undefined) {
    return ['null', 'string'];
  }
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'long' : 'double';
  }
  if (typeof value === 'string') {
    // Heuristics for string sub-types
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return { type: 'long', logicalType: 'timestamp-millis' } as unknown as AvroType;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { type: 'int', logicalType: 'date' } as unknown as AvroType;
    }
    return 'string';
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'array', items: 'string' } as unknown as AvroType;
    const itemType = inferAvroType(value[0], fieldName + '_item', namespace, nestedSchemas);
    return { type: 'array', items: itemType } as unknown as AvroType;
  }
  if (typeof value === 'object') {
    const recordName = toPascalCase(fieldName);
    const nested = buildRecord(value as Record<string, unknown>, recordName, namespace, nestedSchemas);
    nestedSchemas.push(nested);
    return recordName;
  }
  return 'string';
}

function toPascalCase(str: string): string {
  return str.replace(/(^|_|-)([a-z])/g, (_, __, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function buildRecord(obj: Record<string, unknown>, name: string, namespace: string, nestedSchemas: AvroSchema[]): AvroSchema {
  const fields: AvroField[] = Object.entries(obj).map(([key, value]) => {
    const fieldName = /^[a-z_][a-zA-Z0-9_]*$/.test(key) ? key : toSnakeCase(key);
    const avroType = inferAvroType(value, fieldName, namespace, nestedSchemas);
    const field: AvroField = { name: fieldName, type: avroType };
    if (value === null || value === undefined) {
      field.default = null;
    }
    return field;
  });
  return { type: 'record', name, namespace, fields };
}

function generateAvroSchema(jsonText: string, recordName: string, namespace: string): { schema: string; error: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e: unknown) {
    return { schema: '', error: `JSON parse error: ${(e as Error).message}` };
  }

  const sample = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!sample || typeof sample !== 'object') {
    return { schema: '', error: 'Input must be a JSON object or array of objects.' };
  }

  const nestedSchemas: AvroSchema[] = [];
  const mainSchema = buildRecord(sample as Record<string, unknown>, toPascalCase(recordName) || 'Record', namespace, nestedSchemas);

  // Collect all schemas (nested first for dependency order)
  const allSchemas = [...nestedSchemas.reverse(), mainSchema];
  const output = allSchemas.length === 1
    ? JSON.stringify(mainSchema, null, 2)
    : JSON.stringify(allSchemas, null, 2);

  return { schema: output, error: null };
}

export default function AvroSchemaGenerator() {
  const [json, setJson] = useState(SAMPLE_JSON);
  const [recordName, setRecordName] = useState('User');
  const [namespace, setNamespace] = useState('com.example');
  const [schema, setSchema] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    const result = generateAvroSchema(json, recordName, namespace);
    if (result.error) {
      setError(result.error);
      setSchema('');
    } else {
      setError(null);
      setSchema(result.schema);
    }
  }, [json, recordName, namespace]);

  const loadSample = useCallback(() => {
    setJson(SAMPLE_JSON);
    setRecordName('User');
    setNamespace('com.example');
    setSchema('');
    setError(null);
  }, []);

  const copy = useCallback(() => {
    if (!schema) return;
    navigator.clipboard.writeText(schema).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [schema]);

  return (
    <div class="space-y-4">
      {/* Config row */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="text-xs font-medium text-text-muted mb-1 block">Record Name</label>
          <input
            type="text"
            value={recordName}
            onInput={e => setRecordName((e.target as HTMLInputElement).value)}
            placeholder="User"
            class="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-text-muted mb-1 block">Namespace</label>
          <input
            type="text"
            value={namespace}
            onInput={e => setNamespace((e.target as HTMLInputElement).value)}
            placeholder="com.example"
            class="w-full bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">JSON Sample Data</label>
          <button
            onClick={loadSample}
            class="px-3 py-1 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
          >
            Load Sample
          </button>
        </div>
        <textarea
          value={json}
          onInput={e => { setJson((e.target as HTMLTextAreaElement).value); setSchema(''); setError(null); }}
          placeholder='Paste JSON object or array here...'
          class="w-full h-64 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
          spellcheck={false}
        />
      </div>

      <button
        onClick={generate}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Generate Avro Schema
      </button>

      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-sm text-red-400">
          ✖ {error}
        </div>
      )}

      {schema && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">Generated Avro Schema (JSON)</span>
            <button
              onClick={copy}
              class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="w-full bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{schema}</pre>
        </div>
      )}

      {/* Type mapping reference */}
      <div class="p-4 bg-surface border border-border rounded-lg">
        <p class="text-xs font-medium text-text mb-2">Type Mapping Reference</p>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-text-muted font-mono">
          <span>JSON boolean → Avro boolean</span>
          <span>JSON integer → Avro long</span>
          <span>JSON float → Avro double</span>
          <span>JSON string → Avro string</span>
          <span>ISO 8601 datetime → timestamp-millis</span>
          <span>Date string → date (int)</span>
          <span>JSON array → Avro array</span>
          <span>JSON object → nested record</span>
          <span>JSON null → ["null", "string"]</span>
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Infers Avro schema from JSON sample data. Detects nested records, arrays, logical types (timestamp, date), and nullable fields. Runs entirely in your browser.
      </p>
    </div>
  );
}
