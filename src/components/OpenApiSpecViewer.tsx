import { useState, useMemo } from 'preact/hooks';

// ── Minimal YAML → JSON converter (handles OpenAPI 3.x spec structure) ────────

function parseYamlToJson(src: string): unknown {
  const lines = src.split('\n');

  function getIndent(line: string): number {
    const m = line.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }

  function isBlankOrComment(line: string): boolean {
    return /^\s*(#.*)?$/.test(line);
  }

  function findNextNonBlank(from: number): number {
    for (let i = from; i < lines.length; i++) {
      if (!isBlankOrComment(lines[i])) return i;
    }
    return -1;
  }

  function coerceScalar(s: string): unknown {
    if (s === '' || s === '~' || s.toLowerCase() === 'null') return null;
    if (s.toLowerCase() === 'true') return true;
    if (s.toLowerCase() === 'false') return false;
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1);
    }
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    if (/^-?\d*\.\d+$/.test(s)) return parseFloat(s);
    return s;
  }

  function parseValue(startLine: number, baseIndent: number): { value: unknown; nextLine: number } {
    let i = startLine;
    while (i < lines.length && isBlankOrComment(lines[i])) i++;
    if (i >= lines.length) return { value: null, nextLine: i };

    const line = lines[i];
    const indent = getIndent(line);
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed === '-') {
      return parseSequence(i, indent);
    }
    if (/^("(?:[^"\\]|\\.)*"|'[^']*'|[a-zA-Z0-9_\-./]+)\s*:/.test(trimmed)) {
      return parseMapping(i, indent);
    }
    return { value: coerceScalar(trimmed), nextLine: i + 1 };
  }

  function parseMapping(startLine: number, baseIndent: number): { value: unknown; nextLine: number } {
    const obj: Record<string, unknown> = {};
    let i = startLine;

    while (i < lines.length) {
      if (isBlankOrComment(lines[i])) { i++; continue; }
      const indent = getIndent(lines[i]);
      if (indent < baseIndent) break;
      if (indent > baseIndent) break;

      const trimmed = lines[i].trim().replace(/#[^'"]*$/, '').trim();
      const m = trimmed.match(/^("(?:[^"\\]|\\.)*"|'[^']*'|[^:]+?)\s*:\s*(.*)$/);
      if (!m) break;

      let key = m[1].trim();
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
      }
      const valueStr = m[2].trim();

      if (valueStr === '') {
        const nextNonBlank = findNextNonBlank(i + 1);
        if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
          const child = parseValue(nextNonBlank, getIndent(lines[nextNonBlank]));
          obj[key] = child.value;
          i = child.nextLine;
        } else {
          obj[key] = null;
          i++;
        }
      } else if (valueStr.startsWith('|') || valueStr.startsWith('>')) {
        const fold = valueStr.startsWith('>');
        const parts: string[] = [];
        let blockIndent = -1;
        let j = i + 1;
        while (j < lines.length) {
          const raw = lines[j];
          if (isBlankOrComment(raw) && blockIndent === -1) { j++; continue; }
          const ind = getIndent(raw);
          if (blockIndent === -1) blockIndent = ind;
          if (ind < blockIndent && !isBlankOrComment(raw)) break;
          parts.push(isBlankOrComment(raw) ? '' : raw.slice(blockIndent));
          j++;
        }
        obj[key] = fold ? parts.join(' ').trim() : parts.join('\n').trimEnd();
        i = j;
      } else if (valueStr.startsWith('[') || valueStr.startsWith('{')) {
        try {
          obj[key] = JSON.parse(valueStr.replace(/'([^']*)'/g, '"$1"'));
        } catch {
          obj[key] = valueStr;
        }
        i++;
      } else {
        obj[key] = coerceScalar(valueStr);
        i++;
      }
    }

    return { value: obj, nextLine: i };
  }

  function parseSequence(startLine: number, baseIndent: number): { value: unknown; nextLine: number } {
    const arr: unknown[] = [];
    let i = startLine;

    while (i < lines.length) {
      if (isBlankOrComment(lines[i])) { i++; continue; }
      const indent = getIndent(lines[i]);
      if (indent < baseIndent) break;
      if (indent > baseIndent) break;

      const trimmed = lines[i].trim();
      if (!trimmed.startsWith('- ') && trimmed !== '-') break;

      const itemStr = trimmed.startsWith('- ') ? trimmed.slice(2).trim() : '';

      if (itemStr === '') {
        const nextNonBlank = findNextNonBlank(i + 1);
        if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
          const child = parseValue(nextNonBlank, getIndent(lines[nextNonBlank]));
          arr.push(child.value);
          i = child.nextLine;
        } else {
          arr.push(null);
          i++;
        }
      } else if (/^[a-zA-Z0-9_\-."'].*:/.test(itemStr)) {
        const fakeLines = [' '.repeat(baseIndent + 2) + itemStr];
        let j = i + 1;
        while (j < lines.length && !isBlankOrComment(lines[j]) && getIndent(lines[j]) > baseIndent) {
          fakeLines.push(lines[j]);
          j++;
        }
        // Temporarily inject fakeLines into our closure's lines by merging
        const savedLines = lines.splice(i + 1, j - (i + 1), ...fakeLines);
        const child = parseMapping(i + 1, getIndent(fakeLines[0]));
        lines.splice(i + 1, fakeLines.length, ...savedLines);
        arr.push(child.value);
        i = j;
      } else {
        arr.push(coerceScalar(itemStr));
        i++;
      }
    }

    return { value: arr, nextLine: i };
  }

  try {
    const firstNonBlank = findNextNonBlank(0);
    if (firstNonBlank === -1) return null;
    const result = parseValue(firstNonBlank, getIndent(lines[firstNonBlank]));
    return result.value;
  } catch {
    throw new Error('YAML parse failed');
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface OpenApiSpec {
  openapi?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
    contact?: { name?: string; email?: string; url?: string };
    license?: { name?: string; url?: string };
  };
  servers?: Array<{ url?: string; description?: string }>;
  paths?: Record<string, Record<string, OpenApiOperation>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, unknown>;
  };
  tags?: Array<{ name?: string; description?: string }>;
  security?: Array<Record<string, string[]>>;
}

interface OpenApiOperation {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    description?: string;
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  responses?: Record<string, { description?: string; content?: Record<string, { schema?: OpenApiSchema }> }>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
}

interface OpenApiParameter {
  name?: string;
  in?: string;
  description?: string;
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
}

interface OpenApiSchema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: unknown[];
  example?: unknown;
  $ref?: string;
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
}

// ── Sample spec ────────────────────────────────────────────────────────────────

const SAMPLE_SPEC = `openapi: 3.0.3
info:
  title: Bookstore API
  version: 1.2.0
  description: A simple RESTful API for managing a bookstore inventory, orders, and authors.
  contact:
    name: API Support
    email: api@bookstore.example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.bookstore.example.com/v1
    description: Production
  - url: https://sandbox.bookstore.example.com/v1
    description: Sandbox

tags:
  - name: books
    description: Book inventory management
  - name: orders
    description: Order processing
  - name: authors
    description: Author profiles

paths:
  /books:
    get:
      tags: [books]
      summary: List all books
      description: Returns a paginated list of all books in the inventory. Supports filtering by genre and author.
      operationId: listBooks
      parameters:
        - name: page
          in: query
          description: Page number (1-indexed)
          required: false
          schema:
            type: integer
            default: 1
            minimum: 1
        - name: limit
          in: query
          description: Number of results per page
          required: false
          schema:
            type: integer
            default: 20
            maximum: 100
        - name: genre
          in: query
          description: Filter by genre
          required: false
          schema:
            type: string
            enum: [fiction, non-fiction, science, history, biography]
      responses:
        "200":
          description: A paginated list of books
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: "#/components/schemas/Book"
                  total:
                    type: integer
                  page:
                    type: integer
        "400":
          description: Invalid query parameters
    post:
      tags: [books]
      summary: Add a new book
      description: Creates a new book entry in the inventory. Requires authentication.
      operationId: createBook
      security:
        - bearerAuth: []
      requestBody:
        required: true
        description: Book data to create
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/BookInput"
      responses:
        "201":
          description: Book created successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Book"
        "400":
          description: Validation error
        "401":
          description: Unauthorized

  /books/{bookId}:
    get:
      tags: [books]
      summary: Get a book by ID
      description: Retrieves a single book by its unique identifier.
      operationId: getBook
      parameters:
        - name: bookId
          in: path
          required: true
          description: Unique book identifier
          schema:
            type: string
            format: uuid
      responses:
        "200":
          description: Book details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Book"
        "404":
          description: Book not found
    delete:
      tags: [books]
      summary: Delete a book
      description: Permanently removes a book from the inventory.
      operationId: deleteBook
      security:
        - bearerAuth: []
      parameters:
        - name: bookId
          in: path
          required: true
          description: Unique book identifier
          schema:
            type: string
            format: uuid
      responses:
        "204":
          description: Book deleted
        "404":
          description: Book not found

  /orders:
    post:
      tags: [orders]
      summary: Place an order
      description: Creates a new order for one or more books. Returns order confirmation with estimated delivery date.
      operationId: createOrder
      security:
        - bearerAuth: []
      requestBody:
        required: true
        description: Order details
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/OrderInput"
      responses:
        "201":
          description: Order placed successfully
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "400":
          description: Invalid order data
        "422":
          description: One or more books are out of stock

components:
  schemas:
    Book:
      type: object
      required: [id, title, author, isbn, price]
      properties:
        id:
          type: string
          format: uuid
          description: Unique book identifier
        title:
          type: string
          description: Book title
          example: "The Great Gatsby"
        author:
          type: string
          description: Author full name
        isbn:
          type: string
          description: ISBN-13 identifier
          pattern: "^\\\\d{13}$"
        price:
          type: number
          format: float
          description: Price in USD
          minimum: 0
        genre:
          type: string
          enum: [fiction, non-fiction, science, history, biography]
        inStock:
          type: boolean
          description: Whether the book is currently in stock
        publishedYear:
          type: integer
          minimum: 1000
          maximum: 2100

    BookInput:
      type: object
      required: [title, author, isbn, price]
      properties:
        title:
          type: string
          minLength: 1
          maxLength: 255
        author:
          type: string
        isbn:
          type: string
        price:
          type: number
          minimum: 0
        genre:
          type: string

    Order:
      type: object
      properties:
        id:
          type: string
          format: uuid
        status:
          type: string
          enum: [pending, confirmed, shipped, delivered, cancelled]
        items:
          type: array
          items:
            $ref: "#/components/schemas/OrderItem"
        total:
          type: number
          format: float
        createdAt:
          type: string
          format: date-time
        estimatedDelivery:
          type: string
          format: date

    OrderInput:
      type: object
      required: [items, shippingAddress]
      properties:
        items:
          type: array
          items:
            $ref: "#/components/schemas/OrderItem"
        shippingAddress:
          type: string
          description: Full shipping address

    OrderItem:
      type: object
      required: [bookId, quantity]
      properties:
        bookId:
          type: string
          format: uuid
        quantity:
          type: integer
          minimum: 1
          maximum: 99

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
`;

// ── Helpers ────────────────────────────────────────────────────────────────────

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

const METHOD_COLORS: Record<string, string> = {
  get:     'bg-green-500/20 text-green-400 border border-green-500/40',
  post:    'bg-blue-500/20 text-blue-400 border border-blue-500/40',
  put:     'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  patch:   'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  delete:  'bg-red-500/20 text-red-400 border border-red-500/40',
  head:    'bg-purple-500/20 text-purple-400 border border-purple-500/40',
  options: 'bg-gray-500/20 text-gray-400 border border-gray-500/40',
  trace:   'bg-gray-500/20 text-gray-400 border border-gray-500/40',
};

const STATUS_COLORS: Record<string, string> = {
  '2': 'text-green-400',
  '3': 'text-blue-400',
  '4': 'text-yellow-400',
  '5': 'text-red-400',
};

function getStatusColor(code: string): string {
  return STATUS_COLORS[code[0]] ?? 'text-text-muted';
}

function resolveRef(ref: string, spec: OpenApiSpec): OpenApiSchema | null {
  if (!ref.startsWith('#/')) return null;
  const parts = ref.replace('#/', '').split('/');
  let current: unknown = spec;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return null;
    }
  }
  return current as OpenApiSchema;
}

function renderSchemaProps(
  schema: OpenApiSchema,
  spec: OpenApiSpec,
  depth = 0
): { name: string; type: string; required: boolean; description: string; extra: string }[] {
  if (!schema) return [];
  if (schema.$ref) {
    const resolved = resolveRef(schema.$ref, spec);
    if (resolved) return renderSchemaProps(resolved, spec, depth);
    return [{ name: schema.$ref.split('/').pop() ?? '$ref', type: 'object', required: false, description: '', extra: schema.$ref }];
  }
  if (schema.allOf || schema.oneOf || schema.anyOf) {
    const combined = (schema.allOf ?? schema.oneOf ?? schema.anyOf) as OpenApiSchema[];
    return combined.flatMap(s => renderSchemaProps(s, spec, depth));
  }
  if (!schema.properties) return [];
  const requiredFields = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([name, prop]) => {
    const resolved = prop.$ref ? (resolveRef(prop.$ref, spec) ?? prop) : prop;
    let type = resolved.type ?? (prop.$ref ? prop.$ref.split('/').pop() ?? 'object' : 'any');
    if (type === 'array' && resolved.items) {
      const itemType = resolved.items.$ref
        ? resolved.items.$ref.split('/').pop() ?? 'object'
        : resolved.items.type ?? 'any';
      type = `${itemType}[]`;
    }
    if (resolved.format) type = `${type} (${resolved.format})`;
    const extras: string[] = [];
    if (resolved.enum) extras.push(`enum: ${resolved.enum.join(', ')}`);
    if (resolved.minimum !== undefined) extras.push(`min: ${resolved.minimum}`);
    if (resolved.maximum !== undefined) extras.push(`max: ${resolved.maximum}`);
    if (resolved.minLength !== undefined) extras.push(`minLen: ${resolved.minLength}`);
    if (resolved.maxLength !== undefined) extras.push(`maxLen: ${resolved.maxLength}`);
    if (resolved.pattern) extras.push(`pattern: ${resolved.pattern}`);
    if (resolved.default !== undefined) extras.push(`default: ${JSON.stringify(resolved.default)}`);
    return {
      name,
      type,
      required: requiredFields.has(name),
      description: resolved.description ?? prop.description ?? '',
      extra: extras.join(' · '),
    };
  });
}

interface EndpointEntry {
  path: string;
  method: string;
  operation: OpenApiOperation;
  tags: string[];
}

function collectEndpoints(spec: OpenApiSpec): EndpointEntry[] {
  const entries: EndpointEntry[] = [];
  if (!spec.paths) return entries;
  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const op = (pathItem as Record<string, OpenApiOperation>)[method];
      if (!op || typeof op !== 'object') continue;
      entries.push({
        path,
        method,
        operation: op,
        tags: op.tags && op.tags.length > 0 ? op.tags : ['(untagged)'],
      });
    }
  }
  return entries;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SchemaPropsTable({ schema, spec }: { schema: OpenApiSchema; spec: OpenApiSpec }) {
  const props = renderSchemaProps(schema, spec);
  if (props.length === 0) return <p class="text-xs text-text-muted italic">No properties defined.</p>;
  return (
    <div class="overflow-x-auto">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="border-b border-border">
            <th class="text-left py-1.5 pr-3 font-medium text-text-muted w-1/4">Property</th>
            <th class="text-left py-1.5 pr-3 font-medium text-text-muted w-1/4">Type</th>
            <th class="text-left py-1.5 pr-3 font-medium text-text-muted w-12">Req</th>
            <th class="text-left py-1.5 font-medium text-text-muted">Description / Constraints</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p, i) => (
            <tr key={i} class={`border-b border-border/40 ${i % 2 === 0 ? 'bg-primary/5' : ''}`}>
              <td class="py-1.5 pr-3 font-mono text-primary">{p.name}</td>
              <td class="py-1.5 pr-3 font-mono text-text-muted">{p.type}</td>
              <td class="py-1.5 pr-3">
                {p.required ? <span class="text-red-400">✓</span> : <span class="text-text-muted/40">—</span>}
              </td>
              <td class="py-1.5 text-text-muted">
                {p.description}
                {p.extra && <span class="ml-2 text-text-muted/60 font-mono">{p.extra}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointDetail({ entry, spec }: { entry: EndpointEntry; spec: OpenApiSpec }) {
  const { operation, path } = entry;

  const pathParams = (operation.parameters ?? []).filter(p => p.in === 'path');
  const queryParams = (operation.parameters ?? []).filter(p => p.in === 'query');
  const headerParams = (operation.parameters ?? []).filter(p => p.in === 'header');

  const requestBodySchema = (() => {
    if (!operation.requestBody?.content) return null;
    const jsonContent = operation.requestBody.content['application/json'];
    if (!jsonContent?.schema) return null;
    if (jsonContent.schema.$ref) {
      return resolveRef(jsonContent.schema.$ref, spec);
    }
    return jsonContent.schema;
  })();

  return (
    <div class="mt-3 space-y-4 text-sm">
      {operation.description && (
        <p class="text-text-muted text-xs leading-relaxed">{operation.description}</p>
      )}
      {operation.deprecated && (
        <div class="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-1.5">
          <span>⚠</span> This endpoint is deprecated
        </div>
      )}

      {/* Path Parameters */}
      {pathParams.length > 0 && (
        <div>
          <h4 class="text-xs font-semibold text-text uppercase tracking-wider mb-2">Path Parameters</h4>
          <div class="space-y-1">
            {pathParams.map((p, i) => (
              <div key={i} class="flex items-start gap-2 text-xs bg-bg-card border border-border rounded px-3 py-2">
                <span class="font-mono text-orange-400 w-32 flex-shrink-0">{p.name}</span>
                <span class="text-text-muted w-24 flex-shrink-0 font-mono">{p.schema?.type ?? 'string'}{p.schema?.format ? ` (${p.schema.format})` : ''}</span>
                {p.required && <span class="text-red-400 text-xs flex-shrink-0">required</span>}
                <span class="text-text-muted">{p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Query Parameters */}
      {queryParams.length > 0 && (
        <div>
          <h4 class="text-xs font-semibold text-text uppercase tracking-wider mb-2">Query Parameters</h4>
          <div class="space-y-1">
            {queryParams.map((p, i) => (
              <div key={i} class="flex items-start gap-2 text-xs bg-bg-card border border-border rounded px-3 py-2">
                <span class="font-mono text-blue-400 w-32 flex-shrink-0">{p.name}</span>
                <span class="text-text-muted w-24 flex-shrink-0 font-mono">{p.schema?.type ?? 'string'}{p.schema?.format ? ` (${p.schema.format})` : ''}</span>
                {p.required && <span class="text-red-400 text-xs flex-shrink-0">required</span>}
                <span class="text-text-muted flex-1">
                  {p.description}
                  {p.schema?.enum && <span class="ml-1 font-mono text-text-muted/60">enum: {p.schema.enum.join(', ')}</span>}
                  {p.schema?.default !== undefined && <span class="ml-1 font-mono text-text-muted/60">default: {String(p.schema.default)}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Parameters */}
      {headerParams.length > 0 && (
        <div>
          <h4 class="text-xs font-semibold text-text uppercase tracking-wider mb-2">Header Parameters</h4>
          <div class="space-y-1">
            {headerParams.map((p, i) => (
              <div key={i} class="flex items-start gap-2 text-xs bg-bg-card border border-border rounded px-3 py-2">
                <span class="font-mono text-purple-400 w-32 flex-shrink-0">{p.name}</span>
                <span class="text-text-muted">{p.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Request Body */}
      {operation.requestBody && (
        <div>
          <h4 class="text-xs font-semibold text-text uppercase tracking-wider mb-2">
            Request Body {operation.requestBody.required && <span class="text-red-400 normal-case font-normal ml-1">(required)</span>}
          </h4>
          {operation.requestBody.description && (
            <p class="text-xs text-text-muted mb-2">{operation.requestBody.description}</p>
          )}
          {requestBodySchema && (
            <div class="bg-bg-card border border-border rounded-lg p-3">
              <SchemaPropsTable schema={requestBodySchema} spec={spec} />
            </div>
          )}
          {!requestBodySchema && operation.requestBody.content && (
            <p class="text-xs text-text-muted font-mono">
              Content types: {Object.keys(operation.requestBody.content).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Responses */}
      {operation.responses && (
        <div>
          <h4 class="text-xs font-semibold text-text uppercase tracking-wider mb-2">Responses</h4>
          <div class="space-y-2">
            {Object.entries(operation.responses).map(([code, response]) => (
              <div key={code} class="bg-bg-card border border-border rounded-lg px-3 py-2">
                <div class="flex items-center gap-2 mb-1">
                  <span class={`font-mono text-sm font-bold ${getStatusColor(code)}`}>{code}</span>
                  <span class="text-xs text-text-muted">{response.description}</span>
                </div>
                {response.content?.['application/json']?.schema && (
                  <div class="mt-2 border-t border-border/40 pt-2">
                    {(() => {
                      const s = response.content['application/json'].schema!;
                      const resolved = s.$ref ? resolveRef(s.$ref, spec) : s;
                      if (resolved) return <SchemaPropsTable schema={resolved} spec={spec} />;
                      return null;
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security */}
      {operation.security && operation.security.length > 0 && (
        <div class="flex items-center gap-2 text-xs text-text-muted">
          <span class="text-yellow-400">🔒</span>
          Security: {operation.security.map(s => Object.keys(s).join(', ')).join(' | ')}
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function OpenApiSpecViewer() {
  const [input, setInput] = useState(SAMPLE_SPEC);
  const [search, setSearch] = useState('');
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'endpoints' | 'schemas'>('endpoints');

  const spec = useMemo<OpenApiSpec | null>(() => {
    if (!input.trim()) return null;
    try {
      setParseError(null);
      const trimmed = input.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = JSON.parse(trimmed);
        return parsed as OpenApiSpec;
      }
      const parsed = parseYamlToJson(trimmed);
      return parsed as OpenApiSpec;
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Parse error');
      return null;
    }
  }, [input]);

  const endpoints = useMemo(() => {
    if (!spec) return [];
    return collectEndpoints(spec);
  }, [spec]);

  const filteredEndpoints = useMemo(() => {
    if (!search.trim()) return endpoints;
    const q = search.toLowerCase();
    return endpoints.filter(e =>
      e.path.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q)) ||
      (e.operation.summary ?? '').toLowerCase().includes(q) ||
      e.method.toLowerCase().includes(q)
    );
  }, [endpoints, search]);

  const groupedEndpoints = useMemo(() => {
    const groups: Record<string, EndpointEntry[]> = {};
    for (const entry of filteredEndpoints) {
      for (const tag of entry.tags) {
        if (!groups[tag]) groups[tag] = [];
        groups[tag].push(entry);
      }
    }
    return groups;
  }, [filteredEndpoints]);

  const schemas = useMemo(() => {
    if (!spec?.components?.schemas) return {};
    return spec.components.schemas;
  }, [spec]);

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyJson = () => {
    if (!spec) return;
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const isValid = spec !== null;
  const version = (spec as Record<string, unknown>)?.openapi ?? (spec as Record<string, unknown>)?.swagger ?? null;

  return (
    <div class="space-y-4">
      {/* Input area */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-text-muted">OpenAPI 3.x Spec (JSON or YAML)</label>
          <div class="flex items-center gap-2">
            <button
              onClick={() => setInput(SAMPLE_SPEC)}
              class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
            >
              Load Sample
            </button>
            <button
              onClick={() => setInput('')}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder="Paste your OpenAPI 3.x spec (JSON or YAML)..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
      </div>

      {/* Status bar */}
      {input.trim() && (
        <div class={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm ${isValid ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          <div class="flex items-center gap-2">
            <span class="font-mono text-base">{isValid ? '✓' : '✗'}</span>
            {isValid
              ? `Valid OpenAPI ${version ?? ''} · ${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''} · ${Object.keys(schemas).length} schema${Object.keys(schemas).length !== 1 ? 's' : ''}`
              : `Parse error: ${parseError}`}
          </div>
          {isValid && (
            <button
              onClick={copyJson}
              class="text-xs bg-bg-card border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors text-text-muted"
            >
              {copied ? '✓ Copied JSON' : 'Copy as JSON'}
            </button>
          )}
        </div>
      )}

      {/* Rendered view */}
      {isValid && spec && (
        <div class="space-y-6">
          {/* API Info header */}
          <div class="bg-bg-card border border-border rounded-xl p-5">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div class="flex items-center gap-3 flex-wrap">
                  <h2 class="text-xl font-bold text-text">{spec.info?.title ?? 'Untitled API'}</h2>
                  {spec.info?.version && (
                    <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-mono">
                      v{spec.info.version}
                    </span>
                  )}
                  {version && (
                    <span class="text-xs bg-bg border border-border px-2 py-0.5 rounded-full text-text-muted font-mono">
                      OpenAPI {version}
                    </span>
                  )}
                </div>
                {spec.info?.description && (
                  <p class="text-text-muted text-sm mt-2 leading-relaxed max-w-2xl">{spec.info.description}</p>
                )}
                {spec.info?.contact && (
                  <p class="text-xs text-text-muted mt-1">
                    Contact: {spec.info.contact.name}{spec.info.contact.email ? ` · ${spec.info.contact.email}` : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Servers */}
            {spec.servers && spec.servers.length > 0 && (
              <div class="mt-4 pt-4 border-t border-border">
                <p class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Servers</p>
                <div class="space-y-1">
                  {spec.servers.map((s, i) => (
                    <div key={i} class="flex items-center gap-3 text-sm">
                      <span class="font-mono text-primary text-xs">{s.url}</span>
                      {s.description && <span class="text-text-muted text-xs">— {s.description}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags summary */}
            {spec.tags && spec.tags.length > 0 && (
              <div class="mt-3 flex flex-wrap gap-2">
                {spec.tags.map((t, i) => (
                  <span key={i} class="text-xs bg-bg border border-border px-2 py-0.5 rounded-full text-text-muted" title={t.description ?? ''}>
                    {t.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Section tabs */}
          <div class="flex gap-2">
            <button
              onClick={() => setActiveSection('endpoints')}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'endpoints' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              Endpoints ({endpoints.length})
            </button>
            <button
              onClick={() => setActiveSection('schemas')}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === 'schemas' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              Schemas ({Object.keys(schemas).length})
            </button>
          </div>

          {/* Endpoints section */}
          {activeSection === 'endpoints' && (
            <div class="space-y-4">
              {/* Search */}
              <div class="relative">
                <input
                  type="text"
                  placeholder="Filter by path, tag, method, or summary..."
                  value={search}
                  onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
                  class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors pl-9"
                />
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Grouped endpoints */}
              {Object.keys(groupedEndpoints).length === 0 && (
                <div class="bg-bg-card border border-border rounded-xl p-8 text-center text-text-muted text-sm">
                  No endpoints match your filter.
                </div>
              )}

              {Object.entries(groupedEndpoints).map(([tag, tagEndpoints]) => (
                <div key={tag} class="bg-bg-card border border-border rounded-xl overflow-hidden">
                  <div class="px-5 py-3 border-b border-border flex items-center justify-between">
                    <h3 class="font-semibold text-text capitalize">{tag}</h3>
                    <span class="text-xs text-text-muted">{tagEndpoints.length} endpoint{tagEndpoints.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div class="divide-y divide-border/50">
                    {tagEndpoints.map((entry) => {
                      const key = `${entry.method}:${entry.path}`;
                      const expanded = expandedEndpoints.has(key);
                      return (
                        <div key={key} class="group">
                          <button
                            onClick={() => toggleEndpoint(key)}
                            class="w-full flex items-center gap-3 px-5 py-3 hover:bg-primary/5 transition-colors text-left"
                          >
                            <span class={`font-mono text-xs font-bold px-2 py-0.5 rounded uppercase w-16 text-center flex-shrink-0 ${METHOD_COLORS[entry.method] ?? METHOD_COLORS.options}`}>
                              {entry.method}
                            </span>
                            <span class="font-mono text-sm text-text flex-1 truncate">{entry.path}</span>
                            {entry.operation.summary && (
                              <span class="text-xs text-text-muted truncate max-w-xs hidden sm:block">{entry.operation.summary}</span>
                            )}
                            {entry.operation.deprecated && (
                              <span class="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-1.5 py-0.5 rounded flex-shrink-0">deprecated</span>
                            )}
                            {entry.operation.security && entry.operation.security.length > 0 && (
                              <span class="text-yellow-400 text-xs flex-shrink-0" title="Requires authentication">🔒</span>
                            )}
                            <span class={`text-xs text-text-muted flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                          </button>
                          {expanded && (
                            <div class="px-5 pb-5 border-t border-border/40 bg-bg/50">
                              <EndpointDetail entry={entry} spec={spec} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Schemas section */}
          {activeSection === 'schemas' && (
            <div class="space-y-4">
              {Object.keys(schemas).length === 0 && (
                <div class="bg-bg-card border border-border rounded-xl p-8 text-center text-text-muted text-sm">
                  No component schemas defined in this spec.
                </div>
              )}
              {Object.entries(schemas).map(([name, schema]) => {
                const props = renderSchemaProps(schema, spec);
                return (
                  <div key={name} class="bg-bg-card border border-border rounded-xl overflow-hidden">
                    <div class="px-5 py-3 border-b border-border flex items-center gap-3">
                      <span class="font-mono text-primary font-semibold">{name}</span>
                      {schema.type && (
                        <span class="text-xs font-mono text-text-muted bg-bg border border-border px-2 py-0.5 rounded">{schema.type}</span>
                      )}
                      {schema.required && schema.required.length > 0 && (
                        <span class="text-xs text-text-muted">{props.length} properties · {schema.required.length} required</span>
                      )}
                    </div>
                    <div class="p-5">
                      {schema.description && (
                        <p class="text-sm text-text-muted mb-3">{schema.description}</p>
                      )}
                      <SchemaPropsTable schema={schema} spec={spec} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!input.trim() && (
        <div class="bg-bg-card border border-border rounded-xl p-6 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">What this tool does</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Parses OpenAPI 3.x specs in JSON or YAML format</li>
            <li>Renders endpoints grouped by tag with method badges</li>
            <li>Click any endpoint to expand parameters, request body, and responses</li>
            <li>Browse all component schemas with property tables</li>
            <li>Filter endpoints by path, method, tag, or summary</li>
            <li>Export parsed spec as formatted JSON</li>
            <li>Runs entirely in your browser — nothing is sent to a server</li>
          </ul>
        </div>
      )}
    </div>
  );
}
