import { useState, useCallback } from 'preact/hooks';

interface ValidationIssue {
  level: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  fix?: string;
}

interface ParsedSpec {
  version: string;
  title: string;
  openapiVersion: string;
  paths: number;
  operations: number;
  schemas: number;
  servers: number;
  tags: string[];
  webhooks: number;
}

const SAMPLE_31 = `openapi: "3.1.0"
info:
  title: My API
  version: "1.0.0"
  summary: A sample OpenAPI 3.1 spec
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.example.com/v1
    description: Production
paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      tags:
        - users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            minimum: 1
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/User"
    post:
      summary: Create user
      operationId: createUser
      tags:
        - users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewUser"
      responses:
        "201":
          description: Created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/User"
        "422":
          description: Validation error
components:
  schemas:
    User:
      type: object
      required: [id, email]
      properties:
        id:
          type: integer
        email:
          type: string
          format: email
        name:
          type: string
    NewUser:
      type: object
      required: [email]
      properties:
        email:
          type: string
          format: email
        name:
          type: string`;

function parseYaml(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    // Simple YAML parser for well-formed specs
    const lines = text.split('\n');
    const root: any = {};
    const stack: { indent: number; target: any; key: string | null; isArray: boolean }[] = [
      { indent: -1, target: root, key: null, isArray: false },
    ];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (!raw.trim() || raw.trim().startsWith('#')) continue;
      const indent = raw.search(/\S/);
      const trimmed = raw.trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      const parent = stack[stack.length - 1];

      if (trimmed.startsWith('- ')) {
        const val = trimmed.slice(2).trim();
        const arr = parent.key ? parent.target[parent.key] : parent.target;
        if (!Array.isArray(arr)) {
          if (parent.key) parent.target[parent.key] = [];
        }
        const target = parent.key ? parent.target[parent.key] : parent.target;
        if (val.includes(': ')) {
          const obj: any = {};
          const [k, v] = val.split(': ', 2);
          obj[k.trim()] = parseScalar(v.trim());
          target.push(obj);
          stack.push({ indent, target: obj, key: null, isArray: false });
        } else {
          target.push(parseScalar(val));
        }
        continue;
      }

      const colonIdx = trimmed.indexOf(': ');
      const colonEnd = trimmed.endsWith(':');
      if (colonIdx === -1 && !colonEnd) continue;

      const key = colonEnd ? trimmed.slice(0, -1) : trimmed.slice(0, colonIdx);
      const val = colonEnd ? undefined : trimmed.slice(colonIdx + 2);

      const target = parent.isArray
        ? (parent.target[parent.target.length - 1] = parent.target[parent.target.length - 1] || {})
        : parent.target;

      if (val === undefined || val === '') {
        target[key] = {};
        stack.push({ indent, target: target[key], key: null, isArray: false });
      } else if (val === '[]') {
        target[key] = [];
      } else {
        target[key] = parseScalar(val);
        stack.push({ indent, target, key, isArray: false });
      }
    }
    return root;
  }
}

function parseScalar(v: string): any {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  const n = Number(v);
  if (!isNaN(n) && v !== '') return n;
  return v.replace(/^["']|["']$/g, '');
}

function collectRefs(obj: any, refs: Set<string>) {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) { obj.forEach(i => collectRefs(i, refs)); return; }
  for (const [k, v] of Object.entries(obj)) {
    if (k === '$ref' && typeof v === 'string') refs.add(v);
    else collectRefs(v, refs);
  }
}

function validateSpec(spec: any, rawText: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!spec || typeof spec !== 'object') {
    issues.push({ level: 'error', message: 'Failed to parse YAML/JSON', path: 'root' });
    return issues;
  }

  // OpenAPI version
  const ov = spec.openapi || spec.swagger;
  if (!ov) {
    issues.push({ level: 'error', message: 'Missing "openapi" field', path: 'root', fix: 'Add: openapi: "3.1.0"' });
  } else if (typeof ov === 'string' && !ov.startsWith('3.1')) {
    if (ov.startsWith('3.0')) {
      issues.push({ level: 'warning', message: `Using OpenAPI ${ov} — upgrade to 3.1.0 for JSON Schema alignment, webhooks, and nullable improvements`, path: 'openapi', fix: 'Change openapi: "3.1.0" and replace nullable:true with type:[..., "null"]' });
    } else if (ov.startsWith('2.')) {
      issues.push({ level: 'warning', message: `Using Swagger ${ov} — migrate to OpenAPI 3.1 for modern features`, path: 'swagger' });
    }
  }

  // Info
  if (!spec.info) {
    issues.push({ level: 'error', message: 'Missing required "info" object', path: 'info', fix: 'Add info: { title: ..., version: ... }' });
  } else {
    if (!spec.info.title) issues.push({ level: 'error', message: 'Missing info.title', path: 'info.title', fix: 'Add title field' });
    if (!spec.info.version) issues.push({ level: 'error', message: 'Missing info.version', path: 'info.version', fix: 'Add version: "1.0.0"' });
    if (!spec.info.description) issues.push({ level: 'info', message: 'Consider adding info.description for better discoverability', path: 'info.description' });
  }

  // Paths
  if (!spec.paths && !spec.webhooks) {
    issues.push({ level: 'warning', message: 'No "paths" or "webhooks" defined', path: 'paths' });
  }

  if (spec.paths && typeof spec.paths === 'object') {
    for (const [path, pathItem] of Object.entries(spec.paths) as [string, any][]) {
      if (!path.startsWith('/')) {
        issues.push({ level: 'error', message: `Path "${path}" must start with /`, path: `paths.${path}`, fix: `Rename to "/${path}"` });
      }

      const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
      for (const method of httpMethods) {
        const op = pathItem?.[method];
        if (!op) continue;

        if (!op.responses || Object.keys(op.responses).length === 0) {
          issues.push({ level: 'error', message: `${method.toUpperCase()} ${path}: missing responses`, path: `paths.${path}.${method}.responses`, fix: 'Add at least one response (e.g. "200")' });
        }

        if (!op.operationId) {
          issues.push({ level: 'warning', message: `${method.toUpperCase()} ${path}: no operationId`, path: `paths.${path}.${method}.operationId`, fix: 'Add a unique operationId for SDK generation' });
        }

        if (!op.summary && !op.description) {
          issues.push({ level: 'info', message: `${method.toUpperCase()} ${path}: no summary or description`, path: `paths.${path}.${method}.summary` });
        }

        // Check for 3.0 nullable pattern in 3.1
        if (ov?.startsWith('3.1') && op.requestBody) {
          const bodyStr = JSON.stringify(op.requestBody);
          if (bodyStr.includes('"nullable":true')) {
            issues.push({ level: 'warning', message: `${method.toUpperCase()} ${path}: "nullable: true" is deprecated in 3.1`, path: `paths.${path}.${method}.requestBody`, fix: 'Replace nullable:true with type:["string","null"] (or your base type + "null")' });
          }
        }
      }
    }
  }

  // Components / $ref validation
  const allRefs = new Set<string>();
  collectRefs(spec, allRefs);

  for (const ref of allRefs) {
    if (ref.startsWith('#/')) {
      const parts = ref.slice(2).split('/');
      let cur: any = spec;
      let valid = true;
      for (const part of parts) {
        if (cur && typeof cur === 'object' && part in cur) {
          cur = cur[part];
        } else {
          valid = false;
          break;
        }
      }
      if (!valid) {
        issues.push({ level: 'error', message: `Broken $ref: ${ref}`, path: ref, fix: `Ensure ${ref} exists in components` });
      }
    }
  }

  // Servers
  if (!spec.servers || spec.servers.length === 0) {
    issues.push({ level: 'warning', message: 'No servers defined. API clients may not know the base URL.', path: 'servers', fix: 'Add servers: [{url: "https://api.example.com"}]' });
  }

  // 3.1-specific checks
  if (ov?.startsWith('3.1')) {
    const specStr = JSON.stringify(spec);
    if (specStr.includes('"nullable":true')) {
      issues.push({ level: 'warning', message: 'Found "nullable: true" — deprecated in OpenAPI 3.1', path: 'components.schemas', fix: 'Replace with type:["TYPE","null"] e.g. type:["string","null"]' });
    }
    if (!spec.info?.license) {
      issues.push({ level: 'info', message: 'OpenAPI 3.1 recommends info.license for public APIs', path: 'info.license' });
    }
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: '✓ Spec looks valid!', path: 'root' });
  }

  return issues;
}

function parseStats(spec: any): ParsedSpec | null {
  try {
    const ov = spec?.openapi || spec?.swagger || '?';
    const paths = spec?.paths ? Object.keys(spec.paths).length : 0;
    const methods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
    let ops = 0;
    if (spec?.paths) {
      for (const p of Object.values(spec.paths) as any[]) {
        for (const m of methods) if (p?.[m]) ops++;
      }
    }
    const schemas = spec?.components?.schemas ? Object.keys(spec.components.schemas).length : 0;
    const servers = spec?.servers?.length || 0;
    const tags: string[] = [];
    if (spec?.tags) tags.push(...spec.tags.map((t: any) => t.name || ''));
    const webhooks = spec?.webhooks ? Object.keys(spec.webhooks).length : 0;

    return {
      version: spec?.info?.version || '?',
      title: spec?.info?.title || '?',
      openapiVersion: String(ov),
      paths, operations: ops, schemas, servers, tags, webhooks,
    };
  } catch {
    return null;
  }
}

export default function OpenApi31Validator() {
  const [input, setInput] = useState(SAMPLE_31);
  const [activeTab, setActiveTab] = useState<'validate' | 'stats'>('validate');
  const [showFixes, setShowFixes] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useCallback(() => {
    try {
      const spec = parseYaml(input);
      const issues = validateSpec(spec, input);
      const stats = parseStats(spec);
      return { issues, stats, error: null };
    } catch (e: any) {
      return { issues: [{ level: 'error' as const, message: e.message, path: 'parse' }], stats: null, error: e.message };
    }
  }, [input]);

  const { issues, stats } = result();

  const errors = issues.filter(i => i.level === 'error').length;
  const warnings = issues.filter(i => i.level === 'warning').length;
  const infos = issues.filter(i => i.level === 'info').length;

  const copy = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-4">
      {/* Summary badges */}
      <div class="flex gap-3 flex-wrap">
        {[
          { label: 'Errors', count: errors, color: errors > 0 ? 'bg-red-500/15 text-red-400 border-red-500/30' : 'bg-surface text-text-muted border-border' },
          { label: 'Warnings', count: warnings, color: warnings > 0 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'bg-surface text-text-muted border-border' },
          { label: 'Info', count: infos, color: 'bg-surface text-text-muted border-border' },
        ].map(b => (
          <span key={b.label} class={`px-3 py-1 rounded-full text-xs font-semibold border ${b.color}`}>
            {b.label}: {b.count}
          </span>
        ))}
        {stats && (
          <span class="px-3 py-1 rounded-full text-xs font-semibold bg-surface border border-border text-text-muted">
            OpenAPI {stats.openapiVersion}
          </span>
        )}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium">OpenAPI YAML / JSON</label>
            <div class="flex gap-2">
              <button
                onClick={() => setInput(SAMPLE_31)}
                class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent"
              >
                Sample 3.1
              </button>
              <button onClick={copy} class="text-xs px-2 py-1 bg-accent text-bg rounded font-semibold">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            class="w-full bg-bg border border-border rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            rows={28}
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
        </div>

        {/* Results panel */}
        <div class="space-y-2">
          <div class="flex gap-2">
            {(['validate', 'stats'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                class={`text-xs px-3 py-1 rounded font-medium capitalize ${activeTab === t ? 'bg-accent text-bg' : 'bg-surface border border-border hover:border-accent'}`}
              >
                {t}
              </button>
            ))}
            <label class="flex items-center gap-1.5 ml-auto cursor-pointer">
              <input type="checkbox" checked={showFixes} onChange={e => setShowFixes((e.target as HTMLInputElement).checked)} class="w-3.5 h-3.5 accent-accent" />
              <span class="text-xs text-text-muted">Show fixes</span>
            </label>
          </div>

          {activeTab === 'validate' && (
            <div class="space-y-1.5 max-h-[520px] overflow-y-auto">
              {issues.map((issue, i) => (
                <div key={i} class={`rounded p-2.5 text-xs ${
                  issue.level === 'error' ? 'bg-red-500/10 border border-red-500/20' :
                  issue.level === 'warning' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                  'bg-blue-500/10 border border-blue-500/20'
                }`}>
                  <div class="flex items-start gap-2">
                    <span class={`font-bold mt-0.5 ${issue.level === 'error' ? 'text-red-400' : issue.level === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                      {issue.level === 'error' ? '✗' : issue.level === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-text">{issue.message}</div>
                      <div class="text-text-muted mt-0.5 font-mono">{issue.path}</div>
                      {showFixes && issue.fix && (
                        <div class="mt-1 text-green-400 bg-green-500/10 rounded px-2 py-1 font-mono">
                          💡 {issue.fix}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stats' && stats && (
            <div class="space-y-2">
              <div class="bg-surface rounded-lg p-3 border border-border">
                <div class="text-sm font-semibold mb-1">{stats.title}</div>
                <div class="text-xs text-text-muted">v{stats.version} · OpenAPI {stats.openapiVersion}</div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                {[
                  { label: 'Paths', value: stats.paths },
                  { label: 'Operations', value: stats.operations },
                  { label: 'Schemas', value: stats.schemas },
                  { label: 'Servers', value: stats.servers },
                  { label: 'Webhooks', value: stats.webhooks },
                  { label: 'Tags', value: stats.tags.length },
                ].map(s => (
                  <div key={s.label} class="bg-surface rounded p-3 border border-border text-center">
                    <div class="text-xl font-bold text-accent">{s.value}</div>
                    <div class="text-xs text-text-muted">{s.label}</div>
                  </div>
                ))}
              </div>
              {stats.tags.length > 0 && (
                <div class="bg-surface rounded p-3 border border-border">
                  <div class="text-xs font-medium mb-2">Tags</div>
                  <div class="flex flex-wrap gap-1">
                    {stats.tags.map(t => (
                      <span key={t} class="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent border border-accent/20">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 3.1 feature checklist */}
              {stats.openapiVersion.startsWith('3.1') && (
                <div class="bg-surface rounded p-3 border border-border">
                  <div class="text-xs font-medium mb-2">OpenAPI 3.1 Features</div>
                  {[
                    { label: 'Webhooks defined', ok: stats.webhooks > 0 },
                    { label: 'License field', ok: input.includes('license:') },
                    { label: 'Multiple servers', ok: stats.servers > 1 },
                    { label: 'No deprecated nullable', ok: !input.includes('nullable: true') && !input.includes('nullable:true') },
                  ].map(f => (
                    <div key={f.label} class={`flex items-center gap-2 text-xs py-0.5 ${f.ok ? 'text-green-400' : 'text-text-muted'}`}>
                      <span>{f.ok ? '✓' : '○'}</span> {f.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
