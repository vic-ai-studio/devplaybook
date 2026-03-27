import { useState } from 'preact/hooks';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChangeEntry {
  category: 'breaking' | 'feature' | 'deprecation' | 'other';
  message: string;
}

interface ChangelogResult {
  breaking: ChangeEntry[];
  features: ChangeEntry[];
  deprecations: ChangeEntry[];
  other: ChangeEntry[];
  totalChanges: number;
}

// ─── Sample specs ───────────────────────────────────────────────────────────

const SAMPLE_V1 = `{
  "openapi": "3.0.3",
  "info": { "title": "Pet Store API", "version": "1.0.0" },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "operationId": "listPets",
        "parameters": [
          { "name": "limit", "in": "query", "required": false, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "A list of pets" }
        }
      },
      "post": {
        "summary": "Create a pet",
        "operationId": "createPet",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "tag": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Pet created" }
        }
      }
    },
    "/pets/{id}": {
      "get": {
        "summary": "Get a pet",
        "operationId": "getPet",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "A pet" },
          "404": { "description": "Not found" }
        }
      },
      "delete": {
        "summary": "Delete a pet",
        "operationId": "deletePet",
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "204": { "description": "Deleted" }
        }
      }
    },
    "/owners": {
      "get": {
        "summary": "List owners",
        "operationId": "listOwners",
        "responses": {
          "200": { "description": "OK" }
        }
      }
    }
  }
}`;

const SAMPLE_V2 = `{
  "openapi": "3.0.3",
  "info": { "title": "Pet Store API", "version": "2.0.0" },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets — now supports pagination",
        "operationId": "listPets",
        "parameters": [
          { "name": "limit", "in": "query", "required": false, "schema": { "type": "integer" } },
          { "name": "offset", "in": "query", "required": false, "schema": { "type": "integer" } },
          { "name": "species", "in": "query", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "A paginated list of pets" }
        }
      },
      "post": {
        "summary": "Create a pet",
        "operationId": "createPet",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string" },
                  "species": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Pet created" }
        }
      }
    },
    "/pets/{petId}": {
      "get": {
        "summary": "Get a pet by petId",
        "operationId": "getPet",
        "parameters": [
          { "name": "petId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "A pet" },
          "404": { "description": "Not found" }
        }
      }
    },
    "/pets/{petId}/vaccinations": {
      "get": {
        "summary": "List vaccinations for a pet",
        "operationId": "listVaccinations",
        "parameters": [
          { "name": "petId", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Vaccinations list" }
        }
      }
    },
    "/owners": {
      "get": {
        "summary": "List owners (deprecated — use /v2/owners)",
        "operationId": "listOwners",
        "deprecated": true,
        "responses": {
          "200": { "description": "OK" }
        }
      }
    }
  }
}`;

// ─── Minimal YAML parser ─────────────────────────────────────────────────────

function parseScalar(value: string): any {
  if (!value || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value !== '' && !isNaN(Number(value))) return Number(value);
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseSpec(text: string): { data?: any; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { error: 'Input is empty.' };

  // Try JSON first
  try {
    return { data: JSON.parse(trimmed) };
  } catch {}

  // Minimal YAML fallback
  try {
    const lines = trimmed.split('\n');
    const stack: { obj: any; indent: number; key: string | null }[] = [];
    const root: any = {};
    stack.push({ obj: root, indent: -1, key: null });

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (raw.trim() === '' || raw.trim().startsWith('#')) continue;

      const indent = raw.search(/\S/);
      const trimmedLine = raw.trim();

      while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1];

      if (trimmedLine.startsWith('- ')) {
        const value = trimmedLine.slice(2).trim();
        const arr = parent.key !== null ? parent.obj[parent.key] : parent.obj;
        if (!Array.isArray(arr)) {
          if (parent.key !== null) parent.obj[parent.key] = [];
        }
        const target = parent.key !== null ? parent.obj[parent.key] : parent.obj;
        if (value.startsWith('{')) {
          try {
            target.push(JSON.parse(value));
          } catch {
            target.push(value);
          }
        } else {
          target.push(parseScalar(value));
        }
      } else if (trimmedLine.includes(':')) {
        const colonIdx = trimmedLine.indexOf(':');
        const key = trimmedLine
          .slice(0, colonIdx)
          .replace(/^["']|["']$/g, '')
          .trim();
        const rest = trimmedLine.slice(colonIdx + 1).trim();

        let target = parent.obj;
        if (rest === '' || rest === '|' || rest === '>') {
          target[key] = {};
          stack.push({ obj: target, indent, key });
        } else if (rest === '[]') {
          target[key] = [];
        } else if (rest === '{}') {
          target[key] = {};
        } else {
          target[key] = parseScalar(rest);
        }
      }
    }

    return { data: root };
  } catch (e: any) {
    return { error: `Parse error: ${e.message}` };
  }
}

// ─── Changelog logic ─────────────────────────────────────────────────────────

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

function getPathMethods(pathObj: any): string[] {
  if (!pathObj || typeof pathObj !== 'object') return [];
  return HTTP_METHODS.filter(m => pathObj[m] != null);
}

function getParams(op: any): { name: string; required: boolean; in: string }[] {
  if (!op?.parameters || !Array.isArray(op.parameters)) return [];
  return op.parameters.map((p: any) => ({
    name: p.name ?? '',
    required: p.required === true,
    in: p.in ?? 'query',
  }));
}

function isDeprecated(op: any): boolean {
  if (!op) return false;
  if (op.deprecated === true) return true;
  const desc: string = op.description ?? op.summary ?? '';
  return /deprecated/i.test(desc);
}

function generateChangelog(v1Data: any, v2Data: any): ChangelogResult {
  const changes: ChangeEntry[] = [];

  const v1Paths: Record<string, any> = v1Data?.paths ?? {};
  const v2Paths: Record<string, any> = v2Data?.paths ?? {};

  const allPaths = new Set([...Object.keys(v1Paths), ...Object.keys(v2Paths)]);

  for (const path of allPaths) {
    const inV1 = path in v1Paths;
    const inV2 = path in v2Paths;

    // ── Removed endpoint (breaking) ──────────────────────────────────────
    if (inV1 && !inV2) {
      const v1Methods = getPathMethods(v1Paths[path]);
      for (const method of v1Methods) {
        changes.push({
          category: 'breaking',
          message: `Removed endpoint: \`${method.toUpperCase()} ${path}\``,
        });
      }
      continue;
    }

    // ── New endpoint (feature) ────────────────────────────────────────────
    if (!inV1 && inV2) {
      const v2Methods = getPathMethods(v2Paths[path]);
      for (const method of v2Methods) {
        changes.push({
          category: 'feature',
          message: `New endpoint: \`${method.toUpperCase()} ${path}\``,
        });
      }
      continue;
    }

    // ── Compare methods on same path ──────────────────────────────────────
    const v1Methods = new Set(getPathMethods(v1Paths[path]));
    const v2Methods = new Set(getPathMethods(v2Paths[path]));

    for (const m of v1Methods) {
      if (!v2Methods.has(m)) {
        changes.push({
          category: 'breaking',
          message: `Removed HTTP method: \`${m.toUpperCase()} ${path}\``,
        });
      }
    }
    for (const m of v2Methods) {
      if (!v1Methods.has(m)) {
        changes.push({
          category: 'feature',
          message: `New HTTP method: \`${m.toUpperCase()} ${path}\``,
        });
      }
    }

    // ── Compare operations on shared methods ──────────────────────────────
    const sharedMethods = [...v1Methods].filter(m => v2Methods.has(m));

    for (const method of sharedMethods) {
      const v1Op = v1Paths[path][method];
      const v2Op = v2Paths[path][method];
      const label = `\`${method.toUpperCase()} ${path}\``;

      // Deprecation check
      if (!isDeprecated(v1Op) && isDeprecated(v2Op)) {
        changes.push({
          category: 'deprecation',
          message: `Deprecated: ${label}`,
        });
      }

      // Parameter comparison
      const v1Params = getParams(v1Op);
      const v2Params = getParams(v2Op);
      const v1ParamMap = new Map(v1Params.map(p => [p.name, p]));
      const v2ParamMap = new Map(v2Params.map(p => [p.name, p]));

      // Removed params (breaking)
      for (const [name, p] of v1ParamMap) {
        if (!v2ParamMap.has(name)) {
          changes.push({
            category: 'breaking',
            message: `Removed parameter \`${name}\` (${p.in}) from ${label}`,
          });
        }
      }

      // Added params
      for (const [name, p] of v2ParamMap) {
        if (!v1ParamMap.has(name)) {
          if (p.required) {
            changes.push({
              category: 'breaking',
              message: `Added required parameter \`${name}\` (${p.in}) to ${label} — existing clients will break`,
            });
          } else {
            changes.push({
              category: 'feature',
              message: `Added optional parameter \`${name}\` (${p.in}) to ${label}`,
            });
          }
        }
      }

      // Changed required flag (optional → required is breaking)
      for (const [name, v1p] of v1ParamMap) {
        const v2p = v2ParamMap.get(name);
        if (v2p && !v1p.required && v2p.required) {
          changes.push({
            category: 'breaking',
            message: `Parameter \`${name}\` on ${label} changed from optional to required`,
          });
        }
        if (v2p && v1p.required && !v2p.required) {
          changes.push({
            category: 'feature',
            message: `Parameter \`${name}\` on ${label} relaxed from required to optional`,
          });
        }
      }

      // requestBody presence changes
      const v1HasBody = !!v1Op?.requestBody;
      const v2HasBody = !!v2Op?.requestBody;
      if (v1HasBody && !v2HasBody) {
        changes.push({
          category: 'breaking',
          message: `Removed \`requestBody\` from ${label}`,
        });
      } else if (!v1HasBody && v2HasBody) {
        changes.push({
          category: 'feature',
          message: `Added \`requestBody\` to ${label}`,
        });
      }

      // requestBody schema field comparison (top-level properties only)
      if (v1HasBody && v2HasBody) {
        const v1Schema =
          v1Op.requestBody?.content?.['application/json']?.schema?.properties ?? {};
        const v2Schema =
          v2Op.requestBody?.content?.['application/json']?.schema?.properties ?? {};
        const v1Fields = new Set(Object.keys(v1Schema));
        const v2Fields = new Set(Object.keys(v2Schema));

        for (const f of v1Fields) {
          if (!v2Fields.has(f)) {
            changes.push({
              category: 'breaking',
              message: `Removed field \`${f}\` from ${label} request body`,
            });
          }
        }
        for (const f of v2Fields) {
          if (!v1Fields.has(f)) {
            changes.push({
              category: 'feature',
              message: `Added field \`${f}\` to ${label} request body`,
            });
          }
        }
      }

      // Response status code comparison
      const v1Responses = Object.keys(v1Op?.responses ?? {});
      const v2Responses = Object.keys(v2Op?.responses ?? {});
      const v1ResSet = new Set(v1Responses);
      const v2ResSet = new Set(v2Responses);

      for (const code of v1ResSet) {
        if (!v2ResSet.has(code) && code.startsWith('2')) {
          changes.push({
            category: 'breaking',
            message: `Removed success response \`${code}\` from ${label}`,
          });
        }
      }
      for (const code of v2ResSet) {
        if (!v1ResSet.has(code)) {
          changes.push({
            category: 'other',
            message: `Added response code \`${code}\` to ${label}`,
          });
        }
      }

      // Description / summary changes (other)
      const v1Desc = v1Op?.description ?? v1Op?.summary ?? '';
      const v2Desc = v2Op?.description ?? v2Op?.summary ?? '';
      if (v1Desc && v2Desc && v1Desc !== v2Desc) {
        changes.push({
          category: 'other',
          message: `Updated description on ${label}`,
        });
      }
    }
  }

  const result: ChangelogResult = {
    breaking: changes.filter(c => c.category === 'breaking'),
    features: changes.filter(c => c.category === 'feature'),
    deprecations: changes.filter(c => c.category === 'deprecation'),
    other: changes.filter(c => c.category === 'other'),
    totalChanges: changes.length,
  };

  return result;
}

// ─── Markdown formatter ──────────────────────────────────────────────────────

function toMarkdown(result: ChangelogResult, v1Title: string, v2Title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];

  lines.push(`# API Changelog`);
  lines.push('');
  lines.push(`**Generated:** ${today}`);
  if (v1Title || v2Title) {
    lines.push(`**Comparing:** ${v1Title || 'v1'} → ${v2Title || 'v2'}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  if (result.breaking.length > 0) {
    lines.push('## Breaking Changes');
    lines.push('');
    lines.push('> ⚠️ These changes are not backwards-compatible and require client updates.');
    lines.push('');
    for (const c of result.breaking) {
      lines.push(`- ${c.message}`);
    }
    lines.push('');
  }

  if (result.features.length > 0) {
    lines.push('## New Features');
    lines.push('');
    for (const c of result.features) {
      lines.push(`- ${c.message}`);
    }
    lines.push('');
  }

  if (result.deprecations.length > 0) {
    lines.push('## Deprecations');
    lines.push('');
    lines.push('> These items still work but will be removed in a future version.');
    lines.push('');
    for (const c of result.deprecations) {
      lines.push(`- ${c.message}`);
    }
    lines.push('');
  }

  if (result.other.length > 0) {
    lines.push('## Other Changes');
    lines.push('');
    for (const c of result.other) {
      lines.push(`- ${c.message}`);
    }
    lines.push('');
  }

  if (result.totalChanges === 0) {
    lines.push('## No Changes Detected');
    lines.push('');
    lines.push('The two specs appear identical in terms of paths, methods, and parameters.');
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ApiChangelogGenerator() {
  const [v1Input, setV1Input] = useState(SAMPLE_V1);
  const [v2Input, setV2Input] = useState(SAMPLE_V2);
  const [result, setResult] = useState<ChangelogResult | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [v1Title, setV1Title] = useState('');
  const [v2Title, setV2Title] = useState('');
  const [v1Error, setV1Error] = useState('');
  const [v2Error, setV2Error] = useState('');
  const [copied, setCopied] = useState(false);

  function generate() {
    setV1Error('');
    setV2Error('');

    const r1 = parseSpec(v1Input);
    const r2 = parseSpec(v2Input);

    let hasError = false;
    if (r1.error || !r1.data) {
      setV1Error(r1.error ?? 'Failed to parse spec.');
      hasError = true;
    }
    if (r2.error || !r2.data) {
      setV2Error(r2.error ?? 'Failed to parse spec.');
      hasError = true;
    }
    if (hasError) {
      setResult(null);
      setMarkdown('');
      return;
    }

    const t1 = r1.data?.info?.version
      ? `v${r1.data.info.version}`
      : v1Title || 'v1';
    const t2 = r2.data?.info?.version
      ? `v${r2.data.info.version}`
      : v2Title || 'v2';
    setV1Title(t1);
    setV2Title(t2);

    const changelog = generateChangelog(r1.data, r2.data);
    setResult(changelog);
    setMarkdown(toMarkdown(changelog, t1, t2));
  }

  function copyMarkdown() {
    navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function loadSamples() {
    setV1Input(SAMPLE_V1);
    setV2Input(SAMPLE_V2);
    setResult(null);
    setMarkdown('');
    setV1Error('');
    setV2Error('');
    setV1Title('');
    setV2Title('');
  }

  function clearAll() {
    setV1Input('');
    setV2Input('');
    setResult(null);
    setMarkdown('');
    setV1Error('');
    setV2Error('');
    setV1Title('');
    setV2Title('');
  }

  const categoryMeta = {
    breaking: {
      label: 'Breaking Changes',
      color: 'text-red-400',
      bg: 'bg-red-500/8',
      border: 'border-red-500/25',
      badge: 'bg-red-500/15 text-red-400',
      icon: '✕',
    },
    features: {
      label: 'New Features',
      color: 'text-green-400',
      bg: 'bg-green-500/8',
      border: 'border-green-500/25',
      badge: 'bg-green-500/15 text-green-400',
      icon: '+',
    },
    deprecations: {
      label: 'Deprecations',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/8',
      border: 'border-yellow-500/25',
      badge: 'bg-yellow-500/15 text-yellow-400',
      icon: '~',
    },
    other: {
      label: 'Other Changes',
      color: 'text-gray-400',
      bg: 'bg-gray-500/8',
      border: 'border-gray-500/25',
      badge: 'bg-gray-500/15 text-gray-400',
      icon: '·',
    },
  } as const;

  return (
    <div class="space-y-5">
      {/* Action bar */}
      <div class="flex gap-2 flex-wrap">
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={loadSamples}
        >
          Load Example Specs
        </button>
        <button
          class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:bg-accent/10 transition-colors"
          onClick={clearAll}
        >
          Clear
        </button>
      </div>

      {/* Two-panel input */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Before */}
        <div class="space-y-1.5">
          <label class="block text-sm font-medium">
            Before{' '}
            <span class="text-text-muted font-normal">(v1 — OpenAPI JSON or YAML)</span>
          </label>
          <textarea
            class="w-full h-64 font-mono text-xs bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder='Paste your v1 OpenAPI spec here (JSON or YAML)...'
            value={v1Input}
            onInput={(e) => {
              setV1Input((e.target as HTMLTextAreaElement).value);
              setResult(null);
            }}
            spellcheck={false}
          />
          {v1Error && (
            <div class="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded px-3 py-2">
              {v1Error}
            </div>
          )}
        </div>

        {/* After */}
        <div class="space-y-1.5">
          <label class="block text-sm font-medium">
            After{' '}
            <span class="text-text-muted font-normal">(v2 — OpenAPI JSON or YAML)</span>
          </label>
          <textarea
            class="w-full h-64 font-mono text-xs bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
            placeholder='Paste your v2 OpenAPI spec here (JSON or YAML)...'
            value={v2Input}
            onInput={(e) => {
              setV2Input((e.target as HTMLTextAreaElement).value);
              setResult(null);
            }}
            spellcheck={false}
          />
          {v2Error && (
            <div class="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded px-3 py-2">
              {v2Error}
            </div>
          )}
        </div>
      </div>

      {/* Generate button */}
      <button
        class="px-6 py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent/90 transition-colors"
        onClick={generate}
      >
        Generate Changelog
      </button>

      {/* Results */}
      {result && (
        <div class="space-y-4">
          {/* Summary chips */}
          <div class="flex flex-wrap gap-2 items-center">
            <span class="text-sm text-text-muted">
              Comparing <strong class="text-text">{v1Title}</strong> →{' '}
              <strong class="text-text">{v2Title}</strong>
            </span>
            <span class="text-text-muted">·</span>
            {result.totalChanges === 0 ? (
              <span class="text-sm text-green-400">No changes detected</span>
            ) : (
              <>
                {result.breaking.length > 0 && (
                  <span class="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-medium">
                    {result.breaking.length} breaking
                  </span>
                )}
                {result.features.length > 0 && (
                  <span class="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-medium">
                    {result.features.length} new
                  </span>
                )}
                {result.deprecations.length > 0 && (
                  <span class="text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-medium">
                    {result.deprecations.length} deprecated
                  </span>
                )}
                {result.other.length > 0 && (
                  <span class="text-xs px-2 py-0.5 rounded-full bg-gray-500/15 text-gray-400 font-medium">
                    {result.other.length} other
                  </span>
                )}
              </>
            )}
          </div>

          {/* Breaking changes banner */}
          {result.breaking.length > 0 && (
            <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium">
              ⚠ {result.breaking.length} breaking change{result.breaking.length !== 1 ? 's' : ''} detected — existing API clients may break
            </div>
          )}

          {/* Change categories */}
          {(['breaking', 'features', 'deprecations', 'other'] as const).map((cat) => {
            const items = result[cat];
            if (items.length === 0) return null;
            const meta = categoryMeta[cat];
            return (
              <div
                key={cat}
                class={`border rounded-lg overflow-hidden ${meta.border}`}
              >
                <div class={`px-4 py-2.5 flex items-center gap-2 ${meta.bg} border-b ${meta.border}`}>
                  <span class={`text-xs font-mono font-bold w-4 text-center ${meta.color}`}>
                    {meta.icon}
                  </span>
                  <span class={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                  <span class={`ml-auto text-xs px-1.5 py-0.5 rounded ${meta.badge} font-medium`}>
                    {items.length}
                  </span>
                </div>
                <ul class="divide-y divide-border">
                  {items.map((item, idx) => (
                    <li key={idx} class="px-4 py-2.5 text-sm font-mono text-text leading-relaxed">
                      <span class={`mr-2 ${meta.color}`}>{meta.icon}</span>
                      <span
                        dangerouslySetInnerHTML={{
                          __html: item.message.replace(
                            /`([^`]+)`/g,
                            '<code class="bg-surface px-1 py-0.5 rounded text-xs">$1</code>'
                          ),
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {result.totalChanges === 0 && (
            <div class="p-4 bg-green-500/10 border border-green-500/25 rounded-lg text-green-400 text-sm text-center">
              No differences found — the two specs appear identical in paths, methods, and parameters.
            </div>
          )}

          {/* Markdown output */}
          {markdown && (
            <div class="space-y-2">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <span class="text-sm font-medium">Markdown Changelog</span>
                <button
                  class={`px-4 py-1.5 text-xs rounded font-medium transition-colors ${
                    copied
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-surface border border-border hover:bg-accent/10'
                  }`}
                  onClick={copyMarkdown}
                >
                  {copied ? '✓ Copied!' : 'Copy Markdown'}
                </button>
              </div>
              <pre class="w-full bg-surface border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed text-text-muted">
                {markdown}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
