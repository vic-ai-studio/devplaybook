import { useState } from 'preact/hooks';

const SAMPLE_SPEC = `openapi: "3.0.3"
info:
  title: Bookstore API
  version: "2.1.0"
  description: |
    A simple API to manage books and authors.
    Supports full CRUD operations.
  contact:
    name: API Support
    email: support@bookstore.example
servers:
  - url: https://api.bookstore.example/v2
    description: Production
  - url: https://staging-api.bookstore.example/v2
    description: Staging
tags:
  - name: books
    description: Book management
  - name: authors
    description: Author management
paths:
  /books:
    get:
      summary: List all books
      operationId: listBooks
      tags: [books]
      parameters:
        - name: limit
          in: query
          description: Maximum number of results
          schema:
            type: integer
            default: 20
        - name: genre
          in: query
          description: Filter by genre
          schema:
            type: string
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Book"
    post:
      summary: Create a new book
      operationId: createBook
      tags: [books]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewBook"
      responses:
        "201":
          description: Book created
        "400":
          description: Validation error
  /books/{bookId}:
    get:
      summary: Get a book by ID
      operationId: getBook
      tags: [books]
      parameters:
        - name: bookId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Book found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Book"
        "404":
          description: Book not found
    put:
      summary: Update a book
      operationId: updateBook
      tags: [books]
      parameters:
        - name: bookId
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewBook"
      responses:
        "200":
          description: Updated
        "404":
          description: Not found
    delete:
      summary: Delete a book
      operationId: deleteBook
      tags: [books]
      parameters:
        - name: bookId
          in: path
          required: true
          schema:
            type: string
      responses:
        "204":
          description: Deleted
        "404":
          description: Not found
  /authors:
    get:
      summary: List all authors
      operationId: listAuthors
      tags: [authors]
      responses:
        "200":
          description: List of authors
components:
  schemas:
    Book:
      type: object
      required: [id, title, author]
      properties:
        id:
          type: string
          example: "book-123"
        title:
          type: string
          example: "The Great Gatsby"
        author:
          type: string
          example: "F. Scott Fitzgerald"
        genre:
          type: string
          example: "Fiction"
        publishedYear:
          type: integer
          example: 1925
    NewBook:
      type: object
      required: [title, author]
      properties:
        title:
          type: string
        author:
          type: string
        genre:
          type: string
`;

// Minimal YAML parser
function parseYaml(input: string): any {
  try { return JSON.parse(input); } catch {}
  try {
    const lines = input.split('\n');
    const stack: Array<{ obj: any; indent: number }> = [{ obj: {}, indent: -1 }];
    let currentList: any[] | null = null;
    let lastKey = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.search(/\S/);

      // List item
      if (trimmed.startsWith('- ')) {
        const val = trimmed.slice(2).trim();
        while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
        const top = stack[stack.length - 1].obj;
        if (!Array.isArray(top[lastKey])) top[lastKey] = [];
        const parsed = parseScalar(val);
        if (typeof parsed === 'object' && parsed !== null) {
          top[lastKey].push(parsed);
        } else {
          top[lastKey].push(parsed);
        }
        continue;
      }

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx === -1) continue;

      const key = trimmed.slice(0, colonIdx).trim();
      const rest = trimmed.slice(colonIdx + 1).trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const top = stack[stack.length - 1].obj;

      if (!rest || rest === '|' || rest === '>') {
        // Nested object or block scalar — collect multiline
        if (rest === '|' || rest === '>') {
          const blockLines: string[] = [];
          while (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextIndent = nextLine.search(/\S/);
            if (nextIndent > indent || nextLine.trim() === '') {
              blockLines.push(nextLine.substring(indent + 2));
              i++;
            } else break;
          }
          top[key] = blockLines.join('\n').trim();
        } else {
          top[key] = {};
          stack.push({ obj: top[key], indent });
          lastKey = key;
        }
      } else {
        top[key] = parseScalar(rest);
      }
      lastKey = key;
    }
    return stack[0].obj;
  } catch {
    return null;
  }
}

function parseScalar(val: string): any {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  if (/^-?\d+$/.test(val)) return parseInt(val, 10);
  if (/^-?\d+\.\d+$/.test(val)) return parseFloat(val);
  return val.replace(/^["']|["']$/g, '');
}

const METHOD_STYLES: Record<string, string> = {
  get: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  post: 'bg-green-500/20 text-green-400 border-green-500/30',
  put: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  patch: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  delete: 'bg-red-500/20 text-red-400 border-red-500/30',
  head: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  options: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

type Operation = {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: Record<string, any>;
};

function extractOperations(spec: any): Operation[] {
  const ops: Operation[] = [];
  const paths = spec?.paths || {};
  for (const [path, pathItem] of Object.entries(paths as Record<string, any>)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem?.[method];
      if (op) {
        ops.push({ method, path, ...op });
      }
    }
  }
  return ops;
}

function groupByTag(ops: Operation[]): Record<string, Operation[]> {
  const groups: Record<string, Operation[]> = {};
  for (const op of ops) {
    const tags = op.tags?.length ? op.tags : ['default'];
    for (const tag of tags) {
      if (!groups[tag]) groups[tag] = [];
      groups[tag].push(op);
    }
  }
  return groups;
}

function ResponseBadge({ code }: { code: string }) {
  const num = parseInt(code);
  const color = num < 300 ? 'text-green-400' : num < 400 ? 'text-blue-400' : num < 500 ? 'text-yellow-400' : 'text-red-400';
  return <span class={`font-mono text-xs font-medium ${color}`}>{code}</span>;
}

function OperationCard({ op }: { op: Operation }) {
  const [open, setOpen] = useState(false);
  const style = METHOD_STYLES[op.method] || METHOD_STYLES.get;
  const params = op.parameters || [];
  const pathParams = params.filter((p: any) => p.in === 'path');
  const queryParams = params.filter((p: any) => p.in === 'query');
  const headerParams = params.filter((p: any) => p.in === 'header');

  return (
    <div class="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        class="w-full flex items-start gap-3 p-3 hover:bg-surface/50 transition-colors text-left"
      >
        <span class={`flex-shrink-0 font-mono text-xs font-bold px-2 py-0.5 rounded border uppercase ${style}`}>
          {op.method}
        </span>
        <span class="font-mono text-sm text-text flex-1 min-w-0 break-all">{op.path}</span>
        {op.summary && <span class="text-sm text-text-muted hidden sm:block truncate max-w-xs">{op.summary}</span>}
        <span class="text-text-muted text-xs flex-shrink-0 ml-1">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div class="border-t border-border bg-surface/30 p-4 space-y-4 text-sm">
          {op.summary && <p class="font-medium text-text">{op.summary}</p>}
          {op.description && <p class="text-text-muted text-xs whitespace-pre-wrap">{op.description}</p>}
          {op.operationId && (
            <div class="text-xs text-text-muted">
              operationId: <span class="font-mono text-text">{op.operationId}</span>
            </div>
          )}

          {pathParams.length > 0 && (
            <div>
              <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Path Parameters</p>
              <div class="space-y-1">
                {pathParams.map((p: any, i: number) => (
                  <div key={i} class="flex items-start gap-2 text-xs">
                    <span class="font-mono text-accent">{p.name}</span>
                    <span class="text-text-muted">{p.schema?.type || 'string'}</span>
                    {p.required && <span class="text-red-400 font-medium">required</span>}
                    {p.description && <span class="text-text-muted">— {p.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {queryParams.length > 0 && (
            <div>
              <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Query Parameters</p>
              <div class="space-y-1">
                {queryParams.map((p: any, i: number) => (
                  <div key={i} class="flex items-start gap-2 text-xs flex-wrap">
                    <span class="font-mono text-accent">{p.name}</span>
                    <span class="text-text-muted">{p.schema?.type || 'string'}</span>
                    {p.required && <span class="text-red-400 font-medium">required</span>}
                    {p.schema?.default !== undefined && <span class="text-text-muted">default: {String(p.schema.default)}</span>}
                    {p.description && <span class="text-text-muted">— {p.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {headerParams.length > 0 && (
            <div>
              <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Header Parameters</p>
              <div class="space-y-1">
                {headerParams.map((p: any, i: number) => (
                  <div key={i} class="flex items-start gap-2 text-xs">
                    <span class="font-mono text-accent">{p.name}</span>
                    {p.required && <span class="text-red-400 font-medium">required</span>}
                    {p.description && <span class="text-text-muted">— {p.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {op.requestBody && (
            <div>
              <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Request Body</p>
              <div class="text-xs space-y-1">
                {op.requestBody.required && <span class="text-red-400 font-medium">required</span>}
                {Object.keys(op.requestBody.content || {}).map((ct: string) => (
                  <div key={ct} class="font-mono text-text-muted">{ct}</div>
                ))}
              </div>
            </div>
          )}

          {op.responses && (
            <div>
              <p class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Responses</p>
              <div class="space-y-1">
                {Object.entries(op.responses).map(([code, res]: [string, any]) => (
                  <div key={code} class="flex items-center gap-2 text-xs">
                    <ResponseBadge code={code} />
                    <span class="text-text-muted">{res?.description || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SwaggerUiPreview() {
  const [input, setInput] = useState(SAMPLE_SPEC);
  const [spec, setSpec] = useState<any>(() => parseYaml(SAMPLE_SPEC));
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState(true);

  const handleParse = () => {
    const result = parseYaml(input);
    if (!result) {
      setError('Failed to parse input as valid YAML or JSON. Check syntax and try again.');
      setSpec(null);
    } else if (!result.paths && !result.swagger && !result.openapi) {
      setError('Parsed successfully but no OpenAPI/Swagger structure found. Make sure your spec has "openapi" or "swagger" and "paths" fields.');
      setSpec(result);
    } else {
      setError(null);
      setSpec(result);
    }
    setParsed(true);
  };

  const ops = spec ? extractOperations(spec) : [];
  const groups = groupByTag(ops);
  const info = spec?.info || {};
  const servers = spec?.servers || (spec?.host ? [{ url: (spec.schemes?.[0] || 'https') + '://' + spec.host + (spec.basePath || '') }] : []);
  const version = spec?.openapi || spec?.swagger || '';
  const schemaCount = Object.keys(spec?.components?.schemas || spec?.definitions || {}).length;

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">OpenAPI / Swagger Spec (YAML or JSON)</label>
          <div class="flex gap-2">
            <button onClick={() => { setInput(SAMPLE_SPEC); const s = parseYaml(SAMPLE_SPEC); setSpec(s); setError(null); setParsed(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setSpec(null); setError(null); setParsed(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setParsed(false); }}
          rows={14}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your OpenAPI 3.x or Swagger 2.0 spec (YAML or JSON)..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleParse} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Preview API Docs
      </button>

      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          ✗ {error}
        </div>
      )}

      {parsed && spec && ops.length > 0 && (
        <div class="space-y-6">
          {/* API Header */}
          <div class="bg-surface border border-border rounded-lg p-4">
            <div class="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 class="text-lg font-bold text-text">{info.title || 'Untitled API'}</h2>
                {info.description && <p class="text-sm text-text-muted mt-1 max-w-2xl">{info.description.split('\n')[0]}</p>}
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                {info.version && <span class="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full font-medium">v{info.version}</span>}
                {version && <span class="text-xs px-2 py-0.5 bg-surface border border-border rounded-full text-text-muted font-mono">{version.startsWith('3') || version.startsWith('2') ? `OpenAPI ${version}` : `Swagger ${version}`}</span>}
              </div>
            </div>

            <div class="mt-3 flex items-center gap-4 text-xs text-text-muted flex-wrap">
              <span>{ops.length} endpoint{ops.length !== 1 ? 's' : ''}</span>
              <span>{Object.keys(groups).length} tag{Object.keys(groups).length !== 1 ? 's' : ''}</span>
              {schemaCount > 0 && <span>{schemaCount} schema{schemaCount !== 1 ? 's' : ''}</span>}
            </div>

            {servers.length > 0 && (
              <div class="mt-3 space-y-1">
                {servers.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} class="flex items-center gap-2 text-xs">
                    <span class="text-text-muted">Server:</span>
                    <span class="font-mono text-text">{s.url}</span>
                    {s.description && <span class="text-text-muted">({s.description})</span>}
                  </div>
                ))}
              </div>
            )}

            {info.contact && (
              <div class="mt-2 text-xs text-text-muted">
                Contact: {info.contact.name}{info.contact.email ? ` · ${info.contact.email}` : ''}
              </div>
            )}
          </div>

          {/* Operations by tag */}
          {Object.entries(groups).map(([tag, tagOps]) => (
            <div key={tag}>
              <div class="flex items-center gap-2 mb-3">
                <h3 class="font-semibold text-text capitalize">{tag}</h3>
                <span class="text-xs text-text-muted bg-surface border border-border rounded-full px-2 py-0.5">{tagOps.length}</span>
              </div>
              <div class="space-y-2">
                {tagOps.map((op, i) => (
                  <OperationCard key={`${op.method}-${op.path}-${i}`} op={op} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {parsed && spec && ops.length === 0 && !error && (
        <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-400">
          ⚠ Spec parsed but no paths/operations found. Make sure your spec has a "paths" object with HTTP methods.
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">What this tool renders</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>API title, version, description, contact info</li>
          <li>Server URLs (production, staging, etc.)</li>
          <li>Operations grouped by tag with color-coded HTTP method badges</li>
          <li>Path, query, and header parameters with types</li>
          <li>Request body content types</li>
          <li>Response codes with status descriptions</li>
          <li>Supports OpenAPI 3.x and Swagger 2.0 in YAML or JSON</li>
        </ul>
      </div>
    </div>
  );
}
