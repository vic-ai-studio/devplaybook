import { useState, useMemo } from 'preact/hooks';

// ---------------------------------------------------------------------------
// OpenAPI 3.x schema → TypeScript interface generator (no external deps)
// ---------------------------------------------------------------------------

interface SchemaObject {
  type?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  $ref?: string;
  nullable?: boolean;
  required?: string[];
  enum?: (string | number)[];
  description?: string;
  allOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  additionalProperties?: boolean | SchemaObject;
  format?: string;
}

interface ParsedSpec {
  schemas: Record<string, SchemaObject>;
}

function parseSpec(input: string): { result?: ParsedSpec; error?: string } {
  if (!input.trim()) return { error: 'Paste an OpenAPI spec to begin.' };
  try {
    let obj: Record<string, unknown>;
    if (input.trim().startsWith('{')) {
      obj = JSON.parse(input) as Record<string, unknown>;
    } else {
      // Minimal YAML parser: handles simple key:value, indentation, sequences
      obj = parseYaml(input);
    }
    const components = (obj as Record<string, unknown>).components as Record<string, unknown> | undefined;
    const schemas = (components?.schemas || (obj as Record<string, unknown>).definitions || {}) as Record<string, SchemaObject>;
    if (Object.keys(schemas).length === 0) {
      return { error: 'No schemas found. Make sure your spec has a "components.schemas" (OpenAPI 3.x) or "definitions" (Swagger 2.x) section.' };
    }
    return { result: { schemas } };
  } catch (e) {
    return { error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// Very lightweight YAML parser (supports subset needed for OpenAPI schemas)
function parseYaml(text: string): Record<string, unknown> {
  const lines = text.split('\n');
  const root: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown> | unknown[]; indent: number; key?: string }> = [{ obj: root, indent: -1 }];

  function current() { return stack[stack.length - 1]; }

  function setVal(key: string, val: unknown) {
    const c = current();
    if (Array.isArray(c.obj)) {
      (c.obj as unknown[]).push(val);
    } else {
      (c.obj as Record<string, unknown>)[key] = val;
    }
  }

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Pop stack to matching indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (trimmed.startsWith('- ')) {
      // sequence item
      const val = trimmed.slice(2).trim();
      const parsed = parseScalar(val);
      const c = current();
      if (Array.isArray(c.obj)) {
        (c.obj as unknown[]).push(parsed);
      }
    } else if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      const rest = trimmed.slice(colonIdx + 1).trim();

      if (rest === '' || rest === '|' || rest === '>') {
        // nested object coming
        const nested: Record<string, unknown> = {};
        setVal(key, nested);
        stack.push({ obj: nested, indent, key });
      } else if (rest === '-') {
        // sequence coming
        const arr: unknown[] = [];
        setVal(key, arr);
        stack.push({ obj: arr, indent, key });
      } else {
        setVal(key, parseScalar(rest));
      }
    } else if (trimmed === '-') {
      // bare sequence item (object next)
      const nested: Record<string, unknown> = {};
      const c = current();
      if (Array.isArray(c.obj)) {
        (c.obj as unknown[]).push(nested);
        stack.push({ obj: nested, indent });
      }
    }
  }

  return root;
}

function parseScalar(s: string): unknown {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  // Strip quotes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// TypeScript generation
function resolveRef(ref: string, schemas: Record<string, SchemaObject>): SchemaObject | null {
  const parts = ref.split('/');
  const name = parts[parts.length - 1];
  return schemas[name] || null;
}

function schemaToTsType(schema: SchemaObject, schemas: Record<string, SchemaObject>, depth: number, inlined = false): string {
  if (!schema) return 'unknown';

  if (schema.$ref) {
    const name = schema.$ref.split('/').pop() || 'unknown';
    const nullable = schema.nullable ? ' | null' : '';
    return name + nullable;
  }

  const wrap = (t: string) => (schema.nullable ? `${t} | null` : t);

  if (schema.enum) {
    const vals = schema.enum.map(v => typeof v === 'string' ? `'${v}'` : String(v)).join(' | ');
    return wrap(vals);
  }

  if (schema.allOf || schema.anyOf || schema.oneOf) {
    const union = (schema.allOf || schema.anyOf || schema.oneOf)!;
    const parts = union.map(s => schemaToTsType(s, schemas, depth, true));
    const sep = schema.allOf ? ' & ' : ' | ';
    return wrap(parts.join(sep));
  }

  const type = schema.type;

  if (type === 'string') return wrap('string');
  if (type === 'integer' || type === 'number') return wrap('number');
  if (type === 'boolean') return wrap('boolean');

  if (type === 'array') {
    if (schema.items) {
      const inner = schemaToTsType(schema.items, schemas, depth, true);
      return wrap(`${inner}[]`);
    }
    return wrap('unknown[]');
  }

  if (type === 'object' || schema.properties) {
    if (schema.properties && !inlined) {
      // Will be rendered as full interface
      return '{ /* see interface */ }';
    }
    if (schema.properties && inlined) {
      const indent = '  '.repeat(depth + 1);
      const closing = '  '.repeat(depth);
      const required = new Set(schema.required || []);
      const fields = Object.entries(schema.properties).map(([k, v]) => {
        const opt = required.has(k) ? '' : '?';
        const t = schemaToTsType(v, schemas, depth + 1, true);
        return `${indent}${k}${opt}: ${t};`;
      });
      return `{\n${fields.join('\n')}\n${closing}}`;
    }
    if (schema.additionalProperties && typeof schema.additionalProperties !== 'boolean') {
      const valType = schemaToTsType(schema.additionalProperties, schemas, depth, true);
      return wrap(`Record<string, ${valType}>`);
    }
    return wrap('Record<string, unknown>');
  }

  return wrap('unknown');
}

function generateInterface(name: string, schema: SchemaObject, schemas: Record<string, SchemaObject>): string {
  if (schema.$ref) {
    const target = schema.$ref.split('/').pop() || 'unknown';
    return `export type ${name} = ${target};\n`;
  }

  if (schema.enum) {
    const vals = schema.enum.map(v => typeof v === 'string' ? `'${v}'` : String(v)).join(' | ');
    return `export type ${name} = ${vals};\n`;
  }

  if (schema.allOf || schema.anyOf || schema.oneOf) {
    const union = (schema.allOf || schema.anyOf || schema.oneOf)!;
    const parts = union.map(s => schemaToTsType(s, schemas, 0, true));
    const sep = schema.allOf ? ' & ' : ' | ';
    return `export type ${name} = ${parts.join(sep)};\n`;
  }

  if (!schema.properties && schema.type !== 'object') {
    const t = schemaToTsType(schema, schemas, 0, true);
    return `export type ${name} = ${t};\n`;
  }

  const props = schema.properties || {};
  const required = new Set(schema.required || []);
  const lines: string[] = [];

  if (schema.description) {
    lines.push(`/** ${schema.description} */`);
  }
  lines.push(`export interface ${name} {`);

  for (const [propName, propSchema] of Object.entries(props)) {
    const opt = required.has(propName) ? '' : '?';
    if (propSchema.description) {
      lines.push(`  /** ${propSchema.description} */`);
    }
    const t = schemaToTsType(propSchema, schemas, 1, true);
    lines.push(`  ${propName}${opt}: ${t};`);
  }

  if (schema.additionalProperties && typeof schema.additionalProperties !== 'boolean') {
    const valType = schemaToTsType(schema.additionalProperties, schemas, 1, true);
    lines.push(`  [key: string]: ${valType};`);
  }

  lines.push(`}`);
  return lines.join('\n') + '\n';
}

function generateAll(parsed: ParsedSpec): string {
  const { schemas } = parsed;
  const parts: string[] = [
    `// Generated by DevPlaybook OpenAPI → TypeScript Generator`,
    `// https://devplaybook.cc/tools/openapi-to-typescript`,
    ``,
  ];
  for (const [name, schema] of Object.entries(schemas)) {
    parts.push(generateInterface(name, schema, schemas));
  }
  return parts.join('\n');
}

// ---- Sample spec ----
const SAMPLE_YAML = `openapi: "3.0.3"
info:
  title: Pet Store API
  version: "1.0"
components:
  schemas:
    Pet:
      type: object
      required:
        - id
        - name
      description: A pet in the store
      properties:
        id:
          type: integer
          description: Unique identifier
        name:
          type: string
          description: Pet name
        tag:
          type: string
          nullable: true
        status:
          type: string
          enum:
            - available
            - pending
            - sold
        owner:
          $ref: '#/components/schemas/Owner'
        tags:
          type: array
          items:
            $ref: '#/components/schemas/Tag'

    Owner:
      type: object
      required:
        - id
        - username
      properties:
        id:
          type: integer
        username:
          type: string
        email:
          type: string
          nullable: true

    Tag:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: integer
        message:
          type: string
        details:
          type: array
          items:
            type: string
`;

export default function OpenapiToTypescript() {
  const [input, setInput] = useState(SAMPLE_YAML);
  const [copied, setCopied] = useState(false);

  const { output, error, schemaCount } = useMemo(() => {
    if (!input.trim()) return { output: '', error: '', schemaCount: 0 };
    const { result, error } = parseSpec(input);
    if (error) return { output: '', error, schemaCount: 0 };
    const out = generateAll(result!);
    return { output: out, error: '', schemaCount: Object.keys(result!.schemas).length };
  }, [input]);

  function copyOutput() {
    navigator.clipboard?.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-5">
      {/* Instructions */}
      <div class="flex flex-wrap gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> OpenAPI 3.x YAML or JSON</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> $ref resolution</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> nullable types</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> enums → union types</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> optional vs required fields</span>
      </div>

      <div class="grid lg:grid-cols-2 gap-4">
        {/* Input */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">OpenAPI / Swagger Spec</label>
            <div class="flex gap-2">
              <button
                onClick={() => setInput(SAMPLE_YAML)}
                class="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
              >
                Load example
              </button>
              {input && (
                <button
                  onClick={() => setInput('')}
                  class="text-xs text-gray-500 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span class="text-xs text-gray-500">YAML or JSON input</span>
              {schemaCount > 0 && (
                <span class="text-xs text-indigo-400">{schemaCount} schema{schemaCount !== 1 ? 's' : ''} detected</span>
              )}
            </div>
            <textarea
              value={input}
              onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
              placeholder="Paste OpenAPI YAML or JSON spec here..."
              rows={22}
              class="w-full bg-transparent text-gray-100 px-4 py-3 text-xs font-mono resize-none focus:outline-none placeholder-gray-600"
              spellcheck={false}
            />
          </div>
        </div>

        {/* Output */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-300">TypeScript Output</label>
            {output && (
              <button
                onClick={copyOutput}
                class="text-xs text-gray-400 hover:text-indigo-400 border border-gray-700 hover:border-indigo-500 px-3 py-1 rounded-lg transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>
          <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden h-full">
            <div class="px-4 py-2 border-b border-gray-700">
              <span class="text-xs text-gray-500">TypeScript interfaces</span>
            </div>
            {error ? (
              <div class="px-4 py-4 text-sm text-red-400 bg-red-950/10">{error}</div>
            ) : output ? (
              <pre class="text-xs text-gray-200 px-4 py-3 overflow-auto font-mono whitespace-pre" style={{ maxHeight: '480px' }}>{output}</pre>
            ) : (
              <div class="px-4 py-8 text-center text-gray-600 text-sm">Output will appear here</div>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div class="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
        <p class="text-xs font-semibold text-gray-400 mb-2">Tips</p>
        <ul class="space-y-1 text-xs text-gray-500">
          <li>• Supports <code class="text-gray-300 bg-gray-800 px-1 rounded">components.schemas</code> (OpenAPI 3.x) and <code class="text-gray-300 bg-gray-800 px-1 rounded">definitions</code> (Swagger 2.x)</li>
          <li>• <code class="text-gray-300 bg-gray-800 px-1 rounded">$ref: '#/components/schemas/Foo'</code> generates a type reference, not an inline expansion</li>
          <li>• Fields in the <code class="text-gray-300 bg-gray-800 px-1 rounded">required</code> array become <code class="text-gray-300 bg-gray-800 px-1 rounded">field: T</code>; omitted fields become <code class="text-gray-300 bg-gray-800 px-1 rounded">field?: T</code></li>
          <li>• <code class="text-gray-300 bg-gray-800 px-1 rounded">nullable: true</code> appends <code class="text-gray-300 bg-gray-800 px-1 rounded">| null</code> to the type</li>
        </ul>
      </div>
    </div>
  );
}
