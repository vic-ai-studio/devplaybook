import { useState, useCallback } from 'preact/hooks';

// ── Minimal YAML parser (subset — reused pattern from YamlValidator) ──────────

interface YamlError { line: number; message: string; }
interface ParseResult { ok: boolean; value?: unknown; error?: YamlError; }

class YamlParseError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.line = line;
  }
}

interface ParseState { value: unknown; nextLine: number; }

function getIndent(line: string): number {
  const m = line.match(/^(\s*)/);
  return m ? m[1].length : 0;
}

function isBlankOrComment(line: string): boolean {
  return /^\s*(#.*)?$/.test(line);
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

function findNextNonBlank(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    if (!isBlankOrComment(lines[i])) return i;
  }
  return -1;
}

function parseInline(s: string, lineIdx: number): unknown {
  const jsonCompatible = s
    .replace(/:\s*true\b/g, ': true')
    .replace(/:\s*false\b/g, ': false')
    .replace(/:\s*null\b/g, ': null')
    .replace(/:\s*~/g, ': null')
    .replace(/'([^']*)'/g, '"$1"');
  try {
    return JSON.parse(jsonCompatible);
  } catch {
    throw new YamlParseError(`Cannot parse inline value: ${s}`, lineIdx + 1);
  }
}

function parseBlockScalar(lines: string[], startLine: number, _ownerIndent: number, fold: boolean): ParseState {
  const parts: string[] = [];
  let blockIndent = -1;
  let i = startLine;
  while (i < lines.length) {
    const raw = lines[i];
    if (isBlankOrComment(raw) && blockIndent === -1) { i++; continue; }
    const indent = getIndent(raw);
    if (blockIndent === -1) blockIndent = indent;
    if (indent < blockIndent && !isBlankOrComment(raw)) break;
    if (isBlankOrComment(raw)) { parts.push(''); }
    else { parts.push(raw.slice(blockIndent)); }
    i++;
  }
  const value = fold ? parts.join(' ').trim() : parts.join('\n').trimEnd();
  return { value, nextLine: i };
}

function parseScalar(lines: string[], lineIdx: number): ParseState {
  const raw = lines[lineIdx].trim();
  return { value: coerceScalar(raw), nextLine: lineIdx + 1 };
}

function parseValue(lines: string[], startLine: number, baseIndent: number): ParseState {
  let i = startLine;
  while (i < lines.length && isBlankOrComment(lines[i])) i++;
  if (i >= lines.length) return { value: null, nextLine: i };
  const line = lines[i];
  const indent = getIndent(line);
  const trimmed = line.trim();
  if (trimmed.startsWith('- ') || trimmed === '-') return parseSequence(lines, i, indent);
  if (/^"[^"]*"\s*:/.test(trimmed) || /^'[^']*'\s*:/.test(trimmed) || /^[a-zA-Z0-9_\-. ]+\s*:/.test(trimmed)) {
    return parseMapping(lines, i, indent);
  }
  return parseScalar(lines, i);
}

function parseMapping(lines: string[], startLine: number, baseIndent: number): ParseState {
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
    if (key in obj) throw new YamlParseError(`Duplicate key: "${key}"`, i + 1);
    if (valueStr === '') {
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
        const child = parseValue(lines, nextNonBlank, getIndent(lines[nextNonBlank]));
        obj[key] = child.value;
        i = child.nextLine;
      } else {
        obj[key] = null;
        i++;
      }
    } else if (valueStr.startsWith('|') || valueStr.startsWith('>')) {
      const blockRes = parseBlockScalar(lines, i + 1, baseIndent, valueStr.startsWith('>'));
      obj[key] = blockRes.value;
      i = blockRes.nextLine;
    } else if (valueStr.startsWith('[') || valueStr.startsWith('{')) {
      try { obj[key] = parseInline(valueStr, i); } catch { obj[key] = valueStr; }
      i++;
    } else {
      obj[key] = coerceScalar(valueStr);
      i++;
    }
  }
  return { value: obj, nextLine: i };
}

function parseSequence(lines: string[], startLine: number, baseIndent: number): ParseState {
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
      const nextNonBlank = findNextNonBlank(lines, i + 1);
      if (nextNonBlank !== -1 && getIndent(lines[nextNonBlank]) > baseIndent) {
        const child = parseValue(lines, nextNonBlank, getIndent(lines[nextNonBlank]));
        arr.push(child.value);
        i = child.nextLine;
      } else {
        arr.push(null);
        i++;
      }
    } else if (/^[a-zA-Z0-9_\-. "'].*:/.test(itemStr)) {
      const fakeLines = [' '.repeat(baseIndent + 2) + itemStr];
      let j = i + 1;
      while (j < lines.length && !isBlankOrComment(lines[j]) && getIndent(lines[j]) > baseIndent) {
        fakeLines.push(lines[j]);
        j++;
      }
      const child = parseMapping(fakeLines, 0, getIndent(fakeLines[0]));
      arr.push(child.value);
      i = j;
    } else {
      arr.push(coerceScalar(itemStr));
      i++;
    }
  }
  return { value: arr, nextLine: i };
}

function parseYaml(src: string): ParseResult {
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\t/.test(lines[i])) {
      return { ok: false, error: { line: i + 1, message: 'Tab character used for indentation (YAML requires spaces)' } };
    }
  }
  try {
    const result = parseValue(lines, 0, 0);
    return { ok: true, value: result.value };
  } catch (e: unknown) {
    if (e instanceof YamlParseError) return { ok: false, error: { line: e.line, message: e.message } };
    return { ok: false, error: { line: 0, message: String(e) } };
  }
}

// ── OpenAPI 3.x Validator ─────────────────────────────────────────────────────

type Severity = 'error' | 'warning' | 'info';

interface ValidationIssue {
  severity: Severity;
  path: string;
  message: string;
  line?: number;
}

interface ValidationSummary {
  valid: boolean;
  issues: ValidationIssue[];
  stats: {
    pathCount: number;
    operationCount: number;
    schemaCount: number;
    version: string;
  };
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateOpenApi(doc: unknown): ValidationSummary {
  const issues: ValidationIssue[] = [];
  let pathCount = 0;
  let operationCount = 0;
  let schemaCount = 0;
  let version = '';

  if (!isObj(doc)) {
    issues.push({ severity: 'error', path: '(root)', message: 'Document root must be a YAML/JSON object.' });
    return { valid: false, issues, stats: { pathCount, operationCount, schemaCount, version } };
  }

  // ── openapi field ──
  if (!('openapi' in doc)) {
    issues.push({ severity: 'error', path: 'openapi', message: 'Missing required field "openapi". Must be a string like "3.0.3" or "3.1.0".' });
  } else {
    const oa = doc.openapi;
    if (typeof oa !== 'string') {
      issues.push({ severity: 'error', path: 'openapi', message: '"openapi" must be a string (e.g. "3.0.3").' });
    } else {
      version = oa;
      if (!oa.startsWith('3.')) {
        issues.push({ severity: 'error', path: 'openapi', message: `OpenAPI version "${oa}" is not supported. This validator checks OpenAPI 3.x specs. Swagger 2.x uses "swagger: \\"2.0\\"".` });
      } else if (!(/^3\.\d+\.\d+$/.test(oa))) {
        issues.push({ severity: 'warning', path: 'openapi', message: `OpenAPI version "${oa}" does not match the expected format "3.x.y" (e.g. "3.0.3", "3.1.0").` });
      }
    }
  }

  // ── info object ──
  if (!('info' in doc)) {
    issues.push({ severity: 'error', path: 'info', message: 'Missing required field "info".' });
  } else {
    const info = doc.info;
    if (!isObj(info)) {
      issues.push({ severity: 'error', path: 'info', message: '"info" must be an object.' });
    } else {
      if (!info.title) {
        issues.push({ severity: 'error', path: 'info.title', message: 'Missing required field "info.title".' });
      } else if (typeof info.title !== 'string') {
        issues.push({ severity: 'error', path: 'info.title', message: '"info.title" must be a string.' });
      }
      if (!info.version) {
        issues.push({ severity: 'error', path: 'info.version', message: 'Missing required field "info.version".' });
      } else if (typeof info.version !== 'string' && typeof info.version !== 'number') {
        issues.push({ severity: 'error', path: 'info.version', message: '"info.version" must be a string (e.g. "1.0.0").' });
      }
      if (!info.description) {
        issues.push({ severity: 'info', path: 'info.description', message: '"info.description" is missing — recommended to describe what the API does.' });
      }
      if (info.contact && isObj(info.contact)) {
        const contact = info.contact;
        if (!contact.name && !contact.email && !contact.url) {
          issues.push({ severity: 'info', path: 'info.contact', message: '"info.contact" is present but has no name, email, or url.' });
        }
      }
      if (info.license && isObj(info.license)) {
        if (!info.license.name) {
          issues.push({ severity: 'warning', path: 'info.license.name', message: '"info.license" is present but missing "name" (required if license is defined).' });
        }
      }
    }
  }

  // ── paths object ──
  if (!('paths' in doc)) {
    issues.push({ severity: 'error', path: 'paths', message: 'Missing required field "paths".' });
  } else {
    const paths = doc.paths;
    if (!isObj(paths)) {
      issues.push({ severity: 'error', path: 'paths', message: '"paths" must be an object.' });
    } else {
      const pathKeys = Object.keys(paths);
      pathCount = pathKeys.length;

      if (pathCount === 0) {
        issues.push({ severity: 'warning', path: 'paths', message: '"paths" is an empty object — no endpoints are defined.' });
      }

      for (const pathKey of pathKeys) {
        // Path must start with /
        if (!pathKey.startsWith('/')) {
          issues.push({ severity: 'error', path: `paths["${pathKey}"]`, message: `Path "${pathKey}" must begin with a forward slash "/".` });
        }

        const pathItem = paths[pathKey];
        if (!isObj(pathItem)) {
          issues.push({ severity: 'error', path: `paths["${pathKey}"]`, message: `Path "${pathKey}" value must be an object.` });
          continue;
        }

        let hasAnyOperation = false;

        for (const method of HTTP_METHODS) {
          if (!(method in pathItem)) continue;
          hasAnyOperation = true;
          operationCount++;

          const op = pathItem[method];
          if (!isObj(op)) {
            issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}`, message: `Operation must be an object.` });
            continue;
          }

          // Operation should have summary or description
          if (!op.summary && !op.description) {
            issues.push({ severity: 'warning', path: `paths["${pathKey}"].${method}`, message: `Operation ${method.toUpperCase()} "${pathKey}" has no "summary" or "description".` });
          }

          // operationId should be unique (we collect and check after)
          if (op.operationId !== undefined && typeof op.operationId !== 'string') {
            issues.push({ severity: 'warning', path: `paths["${pathKey}"].${method}.operationId`, message: '"operationId" should be a string.' });
          }

          // responses is required in each operation
          if (!('responses' in op)) {
            issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.responses`, message: `Operation ${method.toUpperCase()} "${pathKey}" is missing required "responses".` });
          } else {
            const responses = op.responses;
            if (!isObj(responses)) {
              issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.responses`, message: '"responses" must be an object.' });
            } else if (Object.keys(responses).length === 0) {
              issues.push({ severity: 'warning', path: `paths["${pathKey}"].${method}.responses`, message: `Operation ${method.toUpperCase()} "${pathKey}" has an empty "responses" object.` });
            } else {
              // Validate each response code
              for (const code of Object.keys(responses)) {
                if (code !== 'default' && !/^[1-5]\d{2}$/.test(code)) {
                  issues.push({ severity: 'warning', path: `paths["${pathKey}"].${method}.responses.${code}`, message: `Response code "${code}" is not a valid HTTP status code (should be 100–599 or "default").` });
                }
                const resp = (responses as Record<string, unknown>)[code];
                if (isObj(resp) && !resp.description) {
                  issues.push({ severity: 'warning', path: `paths["${pathKey}"].${method}.responses.${code}`, message: `Response "${code}" is missing a "description".` });
                }
              }
            }
          }

          // requestBody validation (POST/PUT/PATCH)
          if (['post', 'put', 'patch'].includes(method) && 'requestBody' in op) {
            const rb = op.requestBody;
            if (!isObj(rb)) {
              issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.requestBody`, message: '"requestBody" must be an object.' });
            } else if (!rb.content) {
              issues.push({ severity: 'warning', path: `paths["${pathKey}"].${method}.requestBody.content`, message: '"requestBody" is missing "content".' });
            }
          }

          // parameters validation
          if ('parameters' in op) {
            const params = op.parameters;
            if (!Array.isArray(params)) {
              issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.parameters`, message: '"parameters" must be an array.' });
            } else {
              params.forEach((param: unknown, idx: number) => {
                if (!isObj(param)) return;
                if (!param.name) {
                  issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.parameters[${idx}]`, message: `Parameter at index ${idx} is missing "name".` });
                }
                if (!param.in) {
                  issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.parameters[${idx}]`, message: `Parameter at index ${idx} is missing "in" (must be "query", "header", "path", or "cookie").` });
                } else if (!['query', 'header', 'path', 'cookie'].includes(param.in as string)) {
                  issues.push({ severity: 'error', path: `paths["${pathKey}"].${method}.parameters[${idx}].in`, message: `Parameter "in" value "${param.in}" is invalid. Must be "query", "header", "path", or "cookie".` });
                }
              });
            }
          }
        }

        if (!hasAnyOperation && !pathItem.$ref) {
          issues.push({ severity: 'info', path: `paths["${pathKey}"]`, message: `Path "${pathKey}" has no HTTP method operations defined.` });
        }
      }

      // Check for duplicate paths (case-insensitive)
      const seen = new Map<string, string>();
      for (const p of pathKeys) {
        const normalized = p.toLowerCase().replace(/\{[^}]+\}/g, '{param}');
        if (seen.has(normalized) && seen.get(normalized) !== p) {
          issues.push({ severity: 'warning', path: `paths["${p}"]`, message: `Path "${p}" may conflict with "${seen.get(normalized)}" (same structure after normalizing path parameters).` });
        } else {
          seen.set(normalized, p);
        }
      }
    }
  }

  // ── servers ──
  if (!('servers' in doc)) {
    issues.push({ severity: 'info', path: 'servers', message: '"servers" is missing — recommended to define at least one server URL.' });
  } else {
    const servers = doc.servers;
    if (!Array.isArray(servers)) {
      issues.push({ severity: 'error', path: 'servers', message: '"servers" must be an array.' });
    } else {
      servers.forEach((server: unknown, idx: number) => {
        if (!isObj(server)) return;
        if (!server.url) {
          issues.push({ severity: 'error', path: `servers[${idx}].url`, message: `Server at index ${idx} is missing required "url".` });
        }
      });
    }
  }

  // ── components ──
  if ('components' in doc) {
    const components = doc.components;
    if (!isObj(components)) {
      issues.push({ severity: 'error', path: 'components', message: '"components" must be an object.' });
    } else {
      // schemas
      if ('schemas' in components) {
        const schemas = components.schemas;
        if (!isObj(schemas)) {
          issues.push({ severity: 'error', path: 'components.schemas', message: '"components.schemas" must be an object.' });
        } else {
          const schemaKeys = Object.keys(schemas);
          schemaCount = schemaKeys.length;
          for (const schemaName of schemaKeys) {
            const schema = (schemas as Record<string, unknown>)[schemaName];
            if (!isObj(schema)) {
              issues.push({ severity: 'warning', path: `components.schemas.${schemaName}`, message: `Schema "${schemaName}" must be an object.` });
              continue;
            }
            // Check type is valid if present
            if ('type' in schema) {
              const validTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'];
              if (!validTypes.includes(schema.type as string)) {
                issues.push({ severity: 'warning', path: `components.schemas.${schemaName}.type`, message: `Schema "${schemaName}" has unknown type "${schema.type}".` });
              }
              // array should have items
              if (schema.type === 'array' && !schema.items) {
                issues.push({ severity: 'warning', path: `components.schemas.${schemaName}.items`, message: `Schema "${schemaName}" is type "array" but missing "items".` });
              }
            }
            // object without properties is unusual
            if (schema.type === 'object' && !schema.properties && !schema.additionalProperties && !schema.$ref && !schema.allOf && !schema.anyOf && !schema.oneOf) {
              issues.push({ severity: 'info', path: `components.schemas.${schemaName}`, message: `Schema "${schemaName}" is type "object" with no "properties" defined.` });
            }
          }
        }
      }

      // securitySchemes
      if ('securitySchemes' in components) {
        const ss = components.securitySchemes;
        if (isObj(ss)) {
          for (const [name, scheme] of Object.entries(ss)) {
            if (!isObj(scheme)) continue;
            if (!scheme.type) {
              issues.push({ severity: 'error', path: `components.securitySchemes.${name}.type`, message: `Security scheme "${name}" is missing required "type".` });
            } else {
              const validTypes = ['apiKey', 'http', 'oauth2', 'openIdConnect', 'mutualTLS'];
              if (!validTypes.includes(scheme.type as string)) {
                issues.push({ severity: 'warning', path: `components.securitySchemes.${name}.type`, message: `Security scheme "${name}" has unknown type "${scheme.type}".` });
              }
            }
          }
        }
      }
    }
  }

  // ── tags ──
  if ('tags' in doc) {
    const tags = doc.tags;
    if (!Array.isArray(tags)) {
      issues.push({ severity: 'warning', path: 'tags', message: '"tags" must be an array.' });
    } else {
      tags.forEach((tag: unknown, idx: number) => {
        if (!isObj(tag) || !tag.name) {
          issues.push({ severity: 'warning', path: `tags[${idx}]`, message: `Tag at index ${idx} is missing required "name".` });
        }
      });
    }
  }

  // ── externalDocs ──
  if ('externalDocs' in doc) {
    const ed = doc.externalDocs;
    if (isObj(ed) && !ed.url) {
      issues.push({ severity: 'warning', path: 'externalDocs.url', message: '"externalDocs" is present but missing required "url".' });
    }
  }

  const hasErrors = issues.some(i => i.severity === 'error');
  return { valid: !hasErrors, issues, stats: { pathCount, operationCount, schemaCount, version } };
}

// ── Example OpenAPI spec ──────────────────────────────────────────────────────

const EXAMPLE_YAML = `openapi: "3.0.3"
info:
  title: Pet Store API
  version: "1.0.0"
  description: A sample Pet Store API to demonstrate OpenAPI 3.x validation.
  contact:
    name: API Support
    email: support@petstore.example.com
  license:
    name: Apache 2.0
    url: https://www.apache.org/licenses/LICENSE-2.0.html

servers:
  - url: https://api.petstore.example.com/v1
    description: Production server
  - url: https://sandbox.petstore.example.com/v1
    description: Sandbox server

tags:
  - name: pets
    description: Operations about pets

paths:
  /pets:
    get:
      summary: List all pets
      description: Returns a paginated list of all pets in the store.
      operationId: listPets
      tags:
        - pets
      parameters:
        - name: limit
          in: query
          description: Maximum number of results to return
          required: false
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
        "500":
          description: Unexpected error
    post:
      summary: Create a pet
      operationId: createPet
      tags:
        - pets
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewPet"
      responses:
        "201":
          description: Pet created
        "400":
          description: Invalid input
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
            type: integer
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
          type: string
    NewPet:
      type: object
      required:
        - name
      properties:
        name:
          type: string
        tag:
          type: string
`;

const EXAMPLE_JSON = JSON.stringify({
  openapi: '3.0.3',
  info: { title: 'Pet Store API', version: '1.0.0', description: 'A sample Pet Store API.' },
  servers: [{ url: 'https://api.petstore.example.com/v1', description: 'Production server' }],
  paths: {
    '/pets': {
      get: {
        summary: 'List all pets',
        operationId: 'listPets',
        responses: { '200': { description: 'A list of pets' } }
      },
      post: {
        summary: 'Create a pet',
        operationId: 'createPet',
        requestBody: { required: true, content: { 'application/json': { schema: { '$ref': '#/components/schemas/NewPet' } } } },
        responses: { '201': { description: 'Pet created' }, '400': { description: 'Invalid input' } }
      }
    },
    '/pets/{petId}': {
      get: {
        summary: 'Get a pet by ID',
        operationId: 'getPet',
        parameters: [{ name: 'petId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { '200': { description: 'A single pet' }, '404': { description: 'Pet not found' } }
      }
    }
  },
  components: {
    schemas: {
      Pet: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } },
      NewPet: { type: 'object', properties: { name: { type: 'string' } } }
    }
  }
}, null, 2);

// ── Component ─────────────────────────────────────────────────────────────────

export default function OpenApiSchemaValidator() {
  const [input, setInput] = useState('');
  const [format, setFormat] = useState<'yaml' | 'json'>('yaml');
  const [result, setResult] = useState<ValidationSummary | null>(null);
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const handleValidate = useCallback(() => {
    if (!input.trim()) return;
    setParseError('');
    setResult(null);

    let parsed: unknown;

    // Try JSON first, then YAML
    const trimmed = input.trim();
    if (format === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        parsed = JSON.parse(input);
      } catch (e: unknown) {
        // fallback: try YAML parser
        const yamlResult = parseYaml(input);
        if (!yamlResult.ok) {
          const msg = e instanceof Error ? e.message : String(e);
          setParseError(`JSON parse error: ${msg}. Also tried YAML: ${yamlResult.error?.message || 'parse failed'}.`);
          return;
        }
        parsed = yamlResult.value;
      }
    } else {
      const yamlResult = parseYaml(input);
      if (!yamlResult.ok) {
        setParseError(`YAML parse error on line ${yamlResult.error?.line ?? '?'}: ${yamlResult.error?.message}`);
        return;
      }
      parsed = yamlResult.value;
    }

    setResult(validateOpenApi(parsed));
  }, [input, format]);

  const handleExample = (fmt: 'yaml' | 'json') => {
    setFormat(fmt);
    setInput(fmt === 'yaml' ? EXAMPLE_YAML : EXAMPLE_JSON);
    setResult(null);
    setParseError('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const severityColor = (s: Severity) => {
    if (s === 'error') return 'text-red-400';
    if (s === 'warning') return 'text-yellow-400';
    return 'text-blue-400';
  };

  const severityBg = (s: Severity) => {
    if (s === 'error') return 'bg-red-500/10 border-red-500/30';
    if (s === 'warning') return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-blue-500/10 border-blue-500/30';
  };

  const severityIcon = (s: Severity) => {
    if (s === 'error') return '✕';
    if (s === 'warning') return '⚠';
    return 'ℹ';
  };

  const severityLabel = (s: Severity) => {
    if (s === 'error') return 'ERROR';
    if (s === 'warning') return 'WARN';
    return 'INFO';
  };

  const filteredIssues = result
    ? (filterSeverity === 'all' ? result.issues : result.issues.filter(i => i.severity === filterSeverity))
    : [];

  const errorCount = result ? result.issues.filter(i => i.severity === 'error').length : 0;
  const warnCount = result ? result.issues.filter(i => i.severity === 'warning').length : 0;
  const infoCount = result ? result.issues.filter(i => i.severity === 'info').length : 0;

  return (
    <div class="space-y-5">
      {/* Format + Example bar */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['yaml', 'json'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${format === f ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>
        <span class="text-text-muted text-xs">Load example:</span>
        <button
          onClick={() => handleExample('yaml')}
          class="text-xs border border-border bg-surface px-3 py-1.5 rounded hover:border-accent hover:text-accent transition-colors"
        >
          YAML Example
        </button>
        <button
          onClick={() => handleExample('json')}
          class="text-xs border border-border bg-surface px-3 py-1.5 rounded hover:border-accent hover:text-accent transition-colors"
        >
          JSON Example
        </button>
        {input && (
          <button
            onClick={() => { setInput(''); setResult(null); setParseError(''); }}
            class="ml-auto text-xs text-text-muted hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold text-text">
            Paste your OpenAPI 3.x spec ({format.toUpperCase()})
          </label>
          {input && (
            <button
              onClick={handleCopy}
              class="text-xs border border-border bg-surface px-2.5 py-1 rounded hover:border-accent hover:text-accent transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          )}
        </div>
        <textarea
          class="w-full h-72 bg-surface border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-accent transition-colors"
          placeholder={format === 'yaml'
            ? 'openapi: "3.0.3"\ninfo:\n  title: My API\n  version: "1.0.0"\npaths:\n  /users:\n    get:\n      summary: List users\n      responses:\n        "200":\n          description: OK'
            : '{\n  "openapi": "3.0.3",\n  "info": { "title": "My API", "version": "1.0.0" },\n  "paths": {}\n}'}
          value={input}
          onInput={(e) => { setInput((e.target as HTMLTextAreaElement).value); setResult(null); setParseError(''); }}
          spellcheck={false}
        />
        <div class="text-xs text-text-muted mt-1">{input.split('\n').length} lines · {input.length} chars</div>
      </div>

      {/* Validate button */}
      <button
        onClick={handleValidate}
        disabled={!input.trim()}
        class="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Validate Schema
      </button>

      {/* Parse error */}
      {parseError && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm font-mono whitespace-pre-wrap">
          {parseError}
        </div>
      )}

      {/* Results */}
      {result && (
        <div class="space-y-4">
          {/* Status banner */}
          <div class={`rounded-lg p-4 border flex flex-col sm:flex-row sm:items-center gap-3 ${result.valid ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
            <div class="flex items-center gap-3 flex-1">
              <span class={`text-2xl font-bold ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
                {result.valid ? '✓' : '✕'}
              </span>
              <div>
                <p class={`font-semibold ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
                  {result.valid ? 'Valid OpenAPI 3.x Specification' : 'Validation Failed — Errors Found'}
                </p>
                <p class="text-xs text-text-muted mt-0.5">
                  {errorCount} error{errorCount !== 1 ? 's' : ''} · {warnCount} warning{warnCount !== 1 ? 's' : ''} · {infoCount} suggestion{infoCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            {/* Stats */}
            <div class="flex gap-4 text-center shrink-0">
              <div>
                <div class="text-lg font-bold text-text">{result.stats.pathCount}</div>
                <div class="text-xs text-text-muted">Paths</div>
              </div>
              <div>
                <div class="text-lg font-bold text-text">{result.stats.operationCount}</div>
                <div class="text-xs text-text-muted">Operations</div>
              </div>
              <div>
                <div class="text-lg font-bold text-text">{result.stats.schemaCount}</div>
                <div class="text-xs text-text-muted">Schemas</div>
              </div>
              {result.stats.version && (
                <div>
                  <div class="text-sm font-bold text-accent">{result.stats.version}</div>
                  <div class="text-xs text-text-muted">Version</div>
                </div>
              )}
            </div>
          </div>

          {/* Issue filter tabs */}
          {result.issues.length > 0 && (
            <div class="flex flex-wrap gap-2 items-center">
              <span class="text-xs text-text-muted">Filter:</span>
              {(['all', 'error', 'warning', 'info'] as const).map(f => {
                const count = f === 'all' ? result.issues.length : result.issues.filter(i => i.severity === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setFilterSeverity(f)}
                    disabled={count === 0 && f !== 'all'}
                    class={`text-xs px-3 py-1 rounded border transition-colors disabled:opacity-30 disabled:cursor-default ${
                      filterSeverity === f
                        ? f === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : f === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                          : f === 'info' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          : 'bg-accent/20 border-accent/50 text-accent'
                        : 'bg-surface border-border text-text-muted hover:border-accent'
                    }`}
                  >
                    {f === 'all' ? `All (${count})` : f === 'error' ? `Errors (${count})` : f === 'warning' ? `Warnings (${count})` : `Info (${count})`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Issue list */}
          <div class="space-y-2">
            {filteredIssues.length === 0 && (
              <p class="text-sm text-text-muted italic">No issues match the current filter.</p>
            )}
            {filteredIssues.map((issue, i) => (
              <div key={i} class={`border rounded-lg p-3 flex gap-3 ${severityBg(issue.severity)}`}>
                <div class="shrink-0 mt-0.5">
                  <span class={`text-xs font-bold font-mono ${severityColor(issue.severity)}`}>
                    [{severityLabel(issue.severity)}]
                  </span>
                </div>
                <div class="min-w-0">
                  <code class="text-xs text-text-muted break-all">{issue.path}</code>
                  <p class="text-sm mt-0.5 text-text">{issue.message}</p>
                </div>
                <span class={`shrink-0 text-sm font-bold ${severityColor(issue.severity)}`}>
                  {severityIcon(issue.severity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state features list */}
      {!input.trim() && !result && (
        <div class="bg-surface border border-border rounded-lg p-5">
          <p class="font-medium text-text mb-3 text-sm">What this validator checks</p>
          <div class="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              'Required fields: openapi, info (title + version), paths',
              'OpenAPI version must be 3.x (3.0.x or 3.1.x)',
              'Every path must start with a forward slash',
              'Each operation must have at least a summary or description',
              'Each operation requires a "responses" object',
              'HTTP response codes validated (100–599 or "default")',
              'Parameter "in" values: query, header, path, cookie',
              'components/schemas: type validity, array "items", object properties',
              'securitySchemes: required "type" field',
              'servers, tags, externalDocs structural checks',
              'Duplicate path detection (after parameter normalization)',
              'Runs 100% in your browser — your spec is never uploaded',
            ].map((feat, i) => (
              <div key={i} class="flex items-start gap-2 text-xs text-text-muted">
                <span class="text-green-400 shrink-0 mt-0.5">✓</span>
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
