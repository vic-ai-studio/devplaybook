import { useState } from 'preact/hooks';

interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  line?: number;
}

interface ParsedSpec {
  version: string;
  swaggerVersion?: string;
  title: string;
  paths: number;
  operations: number;
  schemas: number;
  servers: number;
  tags: string[];
}

const SAMPLE = `openapi: "3.0.3"
info:
  title: Pet Store API
  version: "1.0.0"
  description: Sample OpenAPI 3.0 spec
servers:
  - url: https://api.example.com/v1
paths:
  /pets:
    get:
      summary: List all pets
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        "200":
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Pet"
  /pets/{petId}:
    get:
      summary: Get a pet by ID
      operationId: getPet
      tags:
        - pets
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: A single pet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        "404":
          description: Pet not found
components:
  schemas:
    Pet:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: integer
        name:
          type: string
        tag:
          type: string`;

// Minimal YAML → JS object parser (supports key: value, lists, nesting via indentation)
function parseYaml(yaml: string): any {
  try {
    // Try JSON first
    return JSON.parse(yaml);
  } catch {
    // Simple YAML parser
    const lines = yaml.split('\n');
    const stack: { indent: number; obj: any; key: string | null }[] = [{ indent: -1, obj: {}, key: null }];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim() || raw.trim().startsWith('#')) continue;

      const indent = raw.search(/\S/);
      const trimmed = raw.trim();

      // Pop stack to current indent level
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];
      const current = parent.key !== null ? parent.obj[parent.key] : parent.obj;

      if (trimmed.startsWith('- ')) {
        // List item
        const val = trimmed.slice(2).trim();
        if (!Array.isArray(current)) {
          if (parent.key !== null) parent.obj[parent.key] = [];
          else parent.obj = [];
        }
        const arr = parent.key !== null ? parent.obj[parent.key] : parent.obj;
        const parsed = parseScalar(val);
        arr.push(parsed);
      } else if (trimmed.includes(': ')) {
        const colonIdx = trimmed.indexOf(': ');
        const key = trimmed.slice(0, colonIdx).replace(/^["']|["']$/g, '');
        const val = trimmed.slice(colonIdx + 2).trim();
        const target = Array.isArray(current) ? {} : current;
        if (Array.isArray(current)) current.push(target);
        if (val === '' || val === null) {
          target[key] = {};
          stack.push({ indent, obj: target, key });
        } else {
          target[key] = parseScalar(val);
        }
      } else if (trimmed.endsWith(':')) {
        const key = trimmed.slice(0, -1).replace(/^["']|["']$/g, '');
        const target = Array.isArray(current) ? {} : current;
        if (Array.isArray(current)) current.push(target);
        target[key] = {};
        stack.push({ indent, obj: target, key });
      }
    }

    return stack[0].obj;
  }
}

function parseScalar(val: string): any {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val === 'null' || val === '~') return null;
  const num = Number(val);
  if (!isNaN(num) && val !== '') return num;
  return val.replace(/^["']|["']$/g, '');
}

function getLineNumber(yaml: string, searchPath: string[]): number | undefined {
  const lines = yaml.split('\n');
  let depth = 0;
  let targetKey = searchPath[0];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(targetKey + ':') || trimmed.startsWith(`"${targetKey}":`)) {
      if (depth + 1 >= searchPath.length) return i + 1;
      depth++;
      targetKey = searchPath[depth];
    }
  }
  return undefined;
}

function validateSpec(raw: string): { issues: Issue[]; parsed: ParsedSpec | null } {
  const issues: Issue[] = [];
  let obj: any;

  try {
    obj = parseYaml(raw.trim());
  } catch {
    issues.push({ level: 'error', message: 'Failed to parse input as JSON or YAML', path: 'root', line: 1 });
    return { issues, parsed: null };
  }

  const isSwagger2 = !!obj?.swagger;
  const isOpenApi3 = !!obj?.openapi;

  if (!isSwagger2 && !isOpenApi3) {
    issues.push({ level: 'error', message: 'Missing "openapi" (3.x) or "swagger" (2.0) version field', path: 'root', line: 1 });
  }

  // Info object
  if (!obj?.info) {
    issues.push({ level: 'error', message: 'Missing required "info" object', path: 'info' });
  } else {
    if (!obj.info.title) issues.push({ level: 'error', message: 'info.title is required', path: 'info.title', line: getLineNumber(raw, ['info', 'title']) });
    if (!obj.info.version) issues.push({ level: 'error', message: 'info.version is required', path: 'info.version', line: getLineNumber(raw, ['info', 'version']) });
    if (!obj.info.description) issues.push({ level: 'info', message: 'info.description is recommended', path: 'info.description' });
  }

  // Servers (OpenAPI 3 only)
  if (isOpenApi3 && (!obj.servers || obj.servers.length === 0)) {
    issues.push({ level: 'warning', message: 'No servers defined — clients won\'t know the base URL', path: 'servers' });
  }

  // Paths
  const paths = obj?.paths || {};
  const pathKeys = Object.keys(paths);
  let operationCount = 0;
  const operationIds = new Set<string>();
  const seenPaths = new Set<string>();

  if (pathKeys.length === 0) {
    issues.push({ level: 'warning', message: 'No paths defined in the spec', path: 'paths' });
  }

  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'];

  for (const pathKey of pathKeys) {
    if (!pathKey.startsWith('/')) {
      issues.push({ level: 'error', message: `Path "${pathKey}" must start with /`, path: `paths.${pathKey}`, line: getLineNumber(raw, ['paths', pathKey]) });
    }

    const normalizedPath = pathKey.toLowerCase();
    if (seenPaths.has(normalizedPath)) {
      issues.push({ level: 'error', message: `Duplicate path: "${pathKey}"`, path: `paths.${pathKey}` });
    }
    seenPaths.add(normalizedPath);

    const pathParams = (pathKey.match(/\{([^}]+)\}/g) || []).map(p => p.slice(1, -1));
    const pathObj = paths[pathKey] || {};

    for (const method of HTTP_METHODS) {
      const op = pathObj[method];
      if (!op) continue;
      operationCount++;

      const opPath = `paths.${pathKey}.${method}`;

      // operationId
      if (!op.operationId) {
        issues.push({ level: 'warning', message: `Missing operationId for ${method.toUpperCase()} ${pathKey}`, path: opPath });
      } else {
        if (operationIds.has(op.operationId)) {
          issues.push({ level: 'error', message: `Duplicate operationId: "${op.operationId}"`, path: `${opPath}.operationId` });
        }
        operationIds.add(op.operationId);
      }

      // Responses
      if (!op.responses || Object.keys(op.responses).length === 0) {
        issues.push({ level: 'error', message: `No responses defined for ${method.toUpperCase()} ${pathKey}`, path: `${opPath}.responses` });
      }

      // Summary
      if (!op.summary && !op.description) {
        issues.push({ level: 'info', message: `No summary or description for ${method.toUpperCase()} ${pathKey}`, path: `${opPath}.summary` });
      }

      // Path parameters consistency
      const definedParams = (op.parameters || [])
        .filter((p: any) => p.in === 'path')
        .map((p: any) => p.name);
      const pathParamItems = (pathObj.parameters || [])
        .filter((p: any) => p.in === 'path')
        .map((p: any) => p.name);
      const allDefined = [...definedParams, ...pathParamItems];

      for (const param of pathParams) {
        if (!allDefined.includes(param)) {
          issues.push({ level: 'error', message: `Path param "{${param}}" in "${pathKey}" is not defined in operation parameters`, path: `${opPath}.parameters` });
        }
      }
    }
  }

  // Schemas
  const schemas = isOpenApi3
    ? Object.keys(obj?.components?.schemas || {})
    : Object.keys(obj?.definitions || {});

  if (schemas.length === 0 && operationCount > 0) {
    issues.push({ level: 'info', message: 'No schemas/definitions found — consider defining reusable models', path: isOpenApi3 ? 'components.schemas' : 'definitions' });
  }

  const parsed: ParsedSpec = {
    version: obj?.openapi || '',
    swaggerVersion: obj?.swagger,
    title: obj?.info?.title || 'Unknown',
    paths: pathKeys.length,
    operations: operationCount,
    schemas: schemas.length,
    servers: isOpenApi3 ? (obj?.servers?.length || 0) : 1,
    tags: [...new Set(Object.values(paths).flatMap((p: any) =>
      HTTP_METHODS.flatMap(m => p[m]?.tags || [])
    ))] as string[],
  };

  return { issues, parsed };
}

export default function OpenApiSpecValidator() {
  const [input, setInput] = useState(SAMPLE);
  const [result, setResult] = useState<{ issues: Issue[]; parsed: ParsedSpec | null } | null>(null);
  const [copied, setCopied] = useState(false);

  function validate() {
    setResult(validateSpec(input));
  }

  function copyReport() {
    if (!result) return;
    const lines = result.issues.map(i =>
      `[${i.level.toUpperCase()}] ${i.path}${i.line ? ` (line ${i.line})` : ''}: ${i.message}`
    ).join('\n');
    navigator.clipboard.writeText(lines).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const errors = result?.issues.filter(i => i.level === 'error') || [];
  const warnings = result?.issues.filter(i => i.level === 'warning') || [];
  const infos = result?.issues.filter(i => i.level === 'info') || [];

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">OpenAPI / Swagger Spec (YAML or JSON)</label>
          <textarea
            class="w-full h-80 font-mono text-sm bg-surface border border-border rounded-lg p-3 resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste your OpenAPI 3.x or Swagger 2.0 spec here..."
            spellcheck={false}
          />
          <div class="flex gap-2 mt-2">
            <button
              onClick={validate}
              class="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Validate Spec
            </button>
            <button
              onClick={() => { setInput(SAMPLE); setResult(null); }}
              class="px-3 py-2 border border-border rounded-lg text-sm hover:bg-surface transition-colors"
            >
              Load Sample
            </button>
          </div>
        </div>

        <div>
          {result ? (
            <div class="space-y-3">
              {/* Summary bar */}
              {result.parsed && (
                <div class="bg-surface border border-border rounded-lg p-3 text-sm">
                  <div class="font-semibold mb-2">{result.parsed.swaggerVersion ? `Swagger ${result.parsed.swaggerVersion}` : `OpenAPI ${result.parsed.version}`} — {result.parsed.title}</div>
                  <div class="flex flex-wrap gap-3 text-text-muted">
                    <span>{result.parsed.paths} paths</span>
                    <span>{result.parsed.operations} operations</span>
                    <span>{result.parsed.schemas} schemas</span>
                    <span>{result.parsed.servers} server{result.parsed.servers !== 1 ? 's' : ''}</span>
                    {result.parsed.tags.length > 0 && <span>Tags: {result.parsed.tags.join(', ')}</span>}
                  </div>
                </div>
              )}

              {/* Status */}
              <div class={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${
                errors.length === 0
                  ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border border-red-500/30 text-red-400'
              }`}>
                {errors.length === 0 ? '✓ Valid spec' : `✗ ${errors.length} error${errors.length > 1 ? 's' : ''} found`}
                <span class="text-text-muted font-normal ml-1">
                  {warnings.length > 0 && `· ${warnings.length} warning${warnings.length > 1 ? 's' : ''}`}
                  {infos.length > 0 && ` · ${infos.length} suggestion${infos.length > 1 ? 's' : ''}`}
                </span>
              </div>

              {/* Issues list */}
              {result.issues.length > 0 ? (
                <div class="space-y-1.5 max-h-[340px] overflow-y-auto">
                  {result.issues.map((issue, i) => (
                    <div
                      key={i}
                      class={`rounded p-2.5 text-sm border-l-4 ${
                        issue.level === 'error'
                          ? 'bg-red-500/5 border-red-500 text-red-300'
                          : issue.level === 'warning'
                          ? 'bg-yellow-500/5 border-yellow-500 text-yellow-300'
                          : 'bg-blue-500/5 border-blue-500 text-blue-300'
                      }`}
                    >
                      <div class="flex items-start gap-2">
                        <span class="font-bold uppercase text-xs mt-0.5 shrink-0">
                          {issue.level === 'error' ? 'ERR' : issue.level === 'warning' ? 'WARN' : 'INFO'}
                        </span>
                        <div class="min-w-0">
                          <div>{issue.message}</div>
                          <div class="text-xs opacity-60 mt-0.5 font-mono">
                            {issue.path}{issue.line ? ` · line ${issue.line}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div class="text-text-muted text-sm text-center py-8">
                  No issues found — spec looks good!
                </div>
              )}

              {result.issues.length > 0 && (
                <button
                  onClick={copyReport}
                  class="w-full py-2 border border-border rounded-lg text-sm hover:bg-surface transition-colors"
                >
                  {copied ? '✓ Copied!' : 'Copy Report'}
                </button>
              )}
            </div>
          ) : (
            <div class="h-80 flex items-center justify-center bg-surface border border-border rounded-lg text-text-muted text-sm">
              Paste your spec and click Validate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
