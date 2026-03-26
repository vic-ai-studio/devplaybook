import { useState } from 'preact/hooks';

interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  line?: number;
}

interface ValidateResult {
  issues: ValidationIssue[];
  summary: {
    paths: number;
    operations: number;
    schemas: number;
    version: string;
    title: string;
  };
}

const SAMPLE_OPENAPI = `openapi: "3.0.3"
info:
  title: Sample API
  version: "1.0.0"
  description: A sample OpenAPI 3.x spec
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      tags:
        - users
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"
  /users/{id}:
    get:
      summary: Get user by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: OK
        "404":
          description: Not found
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        email:
          type: string`;

// Minimal YAML parser — handles string values, nested objects, arrays
function parseYaml(text: string): { data?: any; error?: string; lineMap?: Record<string, number> } {
  // Convert YAML to JSON-compatible structure using a simple approach
  // This handles basic OpenAPI YAML (not anchors/aliases/multiline blocks)
  try {
    const lines = text.split('\n');
    const lineMap: Record<string, number> = {};

    // Try JSON first
    try {
      return { data: JSON.parse(text) };
    } catch {}

    // Simple YAML parser state machine
    const stack: { obj: any; indent: number; key: string | null; inArray: boolean }[] = [];
    const root: any = {};
    stack.push({ obj: root, indent: -1, key: null, inArray: false });

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (raw.trim() === '' || raw.trim().startsWith('#')) continue;

      const indent = raw.search(/\S/);
      const trimmed = raw.trim();

      // Pop stack to correct indent level
      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      if (trimmed.startsWith('- ')) {
        // Array item
        const value = trimmed.slice(2).trim();
        if (!Array.isArray(parent.obj[parent.key!])) {
          if (parent.key !== null) parent.obj[parent.key] = [];
        }
        const arr = parent.key !== null ? parent.obj[parent.key] : parent.obj;
        if (value.startsWith('{') || value.startsWith('"')) {
          try { arr.push(JSON.parse(value)); } catch { arr.push(value); }
        } else {
          arr.push(parseScalar(value));
        }
      } else if (trimmed.includes(':')) {
        const colonIdx = trimmed.indexOf(':');
        const key = trimmed.slice(0, colonIdx).replace(/^["']|["']$/g, '').trim();
        const rest = trimmed.slice(colonIdx + 1).trim();

        // Record line for key path
        const pathKey = [...stack.map(s => s.key).filter(Boolean), key].join('.');
        lineMap[pathKey] = i + 1;

        let target = parent.obj;
        if (parent.inArray && Array.isArray(target)) {
          if (target.length === 0 || typeof target[target.length - 1] !== 'object') {
            target.push({});
          }
          target = target[target.length - 1];
        }

        if (rest === '' || rest === '|' || rest === '>') {
          // Nested object
          target[key] = {};
          stack.push({ obj: target, indent, key, inArray: false });
        } else if (rest === '[]') {
          target[key] = [];
        } else if (rest === '{}') {
          target[key] = {};
        } else {
          target[key] = parseScalar(rest);
          lineMap[key] = i + 1;
        }
      }
    }

    return { data: root, lineMap };
  } catch (e: any) {
    return { error: `Parse error: ${e.message}` };
  }
}

function parseScalar(value: string): any {
  if (!value || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!isNaN(Number(value)) && value !== '') return Number(value);
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function validateOpenApi(data: any, lineMap: Record<string, number> = {}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  function addIssue(level: ValidationIssue['level'], message: string, path?: string, line?: number) {
    issues.push({ level, message, path, line });
  }

  // 1. Check openapi version
  if (!data.openapi) {
    addIssue('error', 'Missing required field: openapi (e.g., "3.0.3")', 'openapi', lineMap['openapi']);
  } else if (!String(data.openapi).startsWith('3.')) {
    addIssue('warning', `openapi version "${data.openapi}" — this validator targets OpenAPI 3.x`, 'openapi');
  }

  // 2. Check info
  if (!data.info) {
    addIssue('error', 'Missing required field: info', 'info', lineMap['info']);
  } else {
    if (!data.info.title) addIssue('error', 'info.title is required', 'info.title', lineMap['info.title']);
    if (!data.info.version) addIssue('error', 'info.version is required', 'info.version', lineMap['info.version']);
    if (!data.info.description) addIssue('warning', 'info.description is missing — recommended for documentation', 'info.description');
  }

  // 3. Check paths
  if (!data.paths) {
    addIssue('error', 'Missing required field: paths', 'paths', lineMap['paths']);
  } else {
    const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
    const seenPaths = new Set<string>();
    const seenOperationIds = new Set<string>();
    const duplicateOperationIds = new Set<string>();

    for (const [pathKey, pathObj] of Object.entries(data.paths)) {
      if (!pathKey.startsWith('/')) {
        addIssue('error', `Path "${pathKey}" must start with /`, `paths.${pathKey}`);
      }

      // Check for duplicate path definitions
      const normalizedPath = pathKey.toLowerCase().replace(/\{[^}]+\}/g, '{param}');
      if (seenPaths.has(normalizedPath)) {
        addIssue('error', `Duplicate path detected: "${pathKey}"`, `paths.${pathKey}`);
      }
      seenPaths.add(normalizedPath);

      if (pathObj && typeof pathObj === 'object') {
        const pathOperations = HTTP_METHODS.filter(m => (pathObj as any)[m]);

        if (pathOperations.length === 0) {
          addIssue('warning', `Path "${pathKey}" has no HTTP method operations`, `paths.${pathKey}`);
        }

        for (const method of pathOperations) {
          const op = (pathObj as any)[method];
          const opPath = `paths.${pathKey}.${method}`;

          // Check operationId
          if (!op.operationId) {
            addIssue('warning', `Missing operationId on ${method.toUpperCase()} ${pathKey}`, opPath);
          } else {
            if (seenOperationIds.has(op.operationId)) {
              duplicateOperationIds.add(op.operationId);
              addIssue('error', `Duplicate operationId: "${op.operationId}" on ${method.toUpperCase()} ${pathKey}`, opPath);
            }
            seenOperationIds.add(op.operationId);
          }

          // Check responses
          if (!op.responses) {
            addIssue('error', `Missing responses on ${method.toUpperCase()} ${pathKey}`, `${opPath}.responses`);
          } else {
            const statusCodes = Object.keys(op.responses);
            if (statusCodes.length === 0) {
              addIssue('error', `${method.toUpperCase()} ${pathKey} has empty responses object`, `${opPath}.responses`);
            }
            if (!statusCodes.some(s => s.startsWith('2') || s === 'default')) {
              addIssue('warning', `${method.toUpperCase()} ${pathKey} has no 2xx response defined`, `${opPath}.responses`);
            }
          }

          // Check summary / description
          if (!op.summary && !op.description) {
            addIssue('info', `${method.toUpperCase()} ${pathKey} has no summary or description`, opPath);
          }

          // Check path parameters
          const pathParams = (pathKey.match(/\{([^}]+)\}/g) || []).map(p => p.slice(1, -1));
          const definedParams = (op.parameters || []).filter((p: any) => p.in === 'path').map((p: any) => p.name);
          for (const pp of pathParams) {
            if (!definedParams.includes(pp)) {
              addIssue('error', `Path parameter "{${pp}}" in "${pathKey}" is not defined in parameters for ${method.toUpperCase()}`, opPath);
            }
          }

          // Validate request body for POST/PUT/PATCH
          if (['post', 'put', 'patch'].includes(method) && !op.requestBody) {
            addIssue('info', `${method.toUpperCase()} ${pathKey} has no requestBody defined`, opPath);
          }
        }
      }
    }
  }

  // 4. Check components/schemas
  if (data.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(data.components.schemas)) {
      const s = schema as any;
      if (!s.type && !s['$ref'] && !s.allOf && !s.oneOf && !s.anyOf) {
        addIssue('warning', `Schema "${schemaName}" has no type defined`, `components.schemas.${schemaName}`);
      }
      if (s.type === 'object' && !s.properties && !s.additionalProperties) {
        addIssue('info', `Schema "${schemaName}" is type:object but has no properties defined`, `components.schemas.${schemaName}`);
      }
    }
  }

  // 5. Check servers
  if (!data.servers || data.servers.length === 0) {
    addIssue('info', 'No servers defined — recommended to specify at least one server URL', 'servers');
  }

  // 6. Check tags
  if (!data.tags || data.tags.length === 0) {
    addIssue('info', 'No top-level tags defined — recommended for documentation grouping', 'tags');
  }

  return issues;
}

export default function OpenApiValidator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  function validate(text: string) {
    if (!text.trim()) { setParseError('Please paste an OpenAPI spec.'); setResult(null); return; }
    const { data, error, lineMap } = parseYaml(text);
    if (error || !data) {
      setParseError(error || 'Failed to parse input.');
      setResult(null);
      return;
    }
    setParseError('');
    const issues = validateOpenApi(data, lineMap ?? {});
    const paths = data.paths ? Object.keys(data.paths) : [];
    const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
    let operations = 0;
    for (const p of paths) {
      const pathObj = data.paths[p];
      if (pathObj) operations += HTTP_METHODS.filter(m => pathObj[m]).length;
    }
    setResult({
      issues,
      summary: {
        paths: paths.length,
        operations,
        schemas: data.components?.schemas ? Object.keys(data.components.schemas).length : 0,
        version: data.openapi ?? '?',
        title: data.info?.title ?? 'Untitled',
      },
    });
  }

  const filtered = result ? result.issues.filter(i => filter === 'all' || i.level === filter) : [];
  const errorCount = result ? result.issues.filter(i => i.level === 'error').length : 0;
  const warnCount = result ? result.issues.filter(i => i.level === 'warning').length : 0;
  const infoCount = result ? result.issues.filter(i => i.level === 'info').length : 0;

  const levelIcon = { error: '❌', warning: '⚠️', info: 'ℹ️' };
  const levelColor = { error: 'text-red-400 border-red-500/30 bg-red-500/5', warning: 'text-orange-400 border-orange-500/30 bg-orange-500/5', info: 'text-blue-400 border-blue-500/30 bg-blue-500/5' };

  return (
    <div class="space-y-4">
      <div class="flex gap-2 flex-wrap">
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={() => { setInput(SAMPLE_OPENAPI); setResult(null); setParseError(''); }}
        >
          Load Sample (YAML)
        </button>
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={() => {
            const sample = JSON.stringify({ openapi: '3.0.3', info: { title: 'Sample', version: '1.0.0' }, paths: { '/items': { get: { summary: 'List items', responses: { '200': { description: 'OK' } } } } } }, null, 2);
            setInput(sample);
            setResult(null);
            setParseError('');
          }}
        >
          Load Sample (JSON)
        </button>
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={() => { setInput(''); setResult(null); setParseError(''); }}
        >
          Clear
        </button>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">OpenAPI 3.x Spec (YAML or JSON)</label>
        <textarea
          class="w-full h-56 font-mono text-xs bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
          placeholder="Paste your OpenAPI 3.x YAML or JSON spec here..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <button
          class="mt-2 px-5 py-2 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
          onClick={() => validate(input)}
        >
          Validate Spec
        </button>
      </div>

      {parseError && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{parseError}</div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Summary */}
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Title', value: result.summary.title, color: 'text-accent' },
              { label: 'OpenAPI', value: result.summary.version, color: 'text-blue-400' },
              { label: 'Paths', value: result.summary.paths.toString(), color: 'text-text' },
              { label: 'Operations', value: result.summary.operations.toString(), color: 'text-text' },
              { label: 'Schemas', value: result.summary.schemas.toString(), color: 'text-text' },
            ].map(({ label, value, color }) => (
              <div class="bg-surface border border-border rounded-lg p-3 text-center">
                <div class={`text-lg font-bold ${color} truncate`}>{value}</div>
                <div class="text-xs text-text-muted mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Overall status */}
          {errorCount === 0 && warnCount === 0 ? (
            <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm font-medium text-center">
              ✅ Spec is valid — no errors or warnings found
            </div>
          ) : (
            <div class={`p-4 border rounded-lg text-sm font-medium text-center ${errorCount > 0 ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
              {errorCount > 0 ? `❌ ${errorCount} error${errorCount !== 1 ? 's' : ''}` : ''}
              {errorCount > 0 && warnCount > 0 ? ' · ' : ''}
              {warnCount > 0 ? `⚠️ ${warnCount} warning${warnCount !== 1 ? 's' : ''}` : ''}
              {infoCount > 0 ? ` · ℹ️ ${infoCount} info` : ''}
            </div>
          )}

          {/* Filter tabs */}
          {result.issues.length > 0 && (
            <>
              <div class="flex gap-1 flex-wrap">
                {(['all', 'error', 'warning', 'info'] as const).map(f => {
                  const count = f === 'all' ? result.issues.length : result.issues.filter(i => i.level === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      class={`px-3 py-1.5 rounded text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>

              <div class="space-y-2">
                {filtered.map((issue, i) => (
                  <div key={i} class={`p-3 border rounded-lg text-sm ${levelColor[issue.level]}`}>
                    <div class="flex items-start gap-2">
                      <span class="mt-0.5 shrink-0">{levelIcon[issue.level]}</span>
                      <div class="flex-1 min-w-0">
                        <span class="font-medium">{issue.message}</span>
                        {issue.path && (
                          <span class="ml-2 font-mono text-xs opacity-70">{issue.path}</span>
                        )}
                        {issue.line && (
                          <span class="ml-2 text-xs opacity-60">line {issue.line}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
