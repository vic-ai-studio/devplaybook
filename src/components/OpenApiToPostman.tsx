import { useState, useCallback } from 'preact/hooks';

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: { key: string; value: string; type: string }[];
    url: { raw: string; host: string[]; path: string[] };
    body?: { mode: string; raw: string; options?: { raw: { language: string } } };
    auth?: { type: string; bearer?: { key: string; value: string; type: string }[] };
  };
}

interface PostmanCollection {
  info: { name: string; schema: string; _postman_id: string };
  item: PostmanItem[];
}

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function parseOpenAPI(input: string): PostmanCollection | { error: string } {
  let spec: any;
  try {
    spec = JSON.parse(input);
  } catch {
    try {
      // minimal YAML support: key: value
      const lines = input.split('\n');
      const obj: any = {};
      const stack: any[] = [obj];
      const indentStack: number[] = [0];
      for (const raw of lines) {
        if (!raw.trim() || raw.trim().startsWith('#')) continue;
        const indent = raw.search(/\S/);
        const trimmed = raw.trim();
        if (trimmed.startsWith('- ')) {
          // ignore arrays for minimal parse
          continue;
        }
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        while (indentStack.length > 1 && indent <= indentStack[indentStack.length - 1]) {
          stack.pop(); indentStack.pop();
        }
        const parent = stack[stack.length - 1];
        if (val === '' || val === '{}' || val === '[]') {
          parent[key] = {};
          stack.push(parent[key]);
          indentStack.push(indent);
        } else {
          parent[key] = val.replace(/^["']|["']$/g, '');
        }
      }
      spec = obj;
    } catch {
      return { error: 'Could not parse input as JSON or YAML. Please paste a valid OpenAPI 3.0 JSON or Swagger 2.0 JSON spec.' };
    }
  }

  if (!spec) return { error: 'Empty spec.' };

  const title = spec.info?.title || spec.title || 'API Collection';
  const isSwagger2 = spec.swagger === '2.0';
  const isOpenAPI3 = spec.openapi?.startsWith('3');

  if (!isSwagger2 && !isOpenAPI3) {
    return { error: 'Spec must be OpenAPI 3.x or Swagger 2.0. Detected neither "openapi: 3.x" nor "swagger: 2.0".' };
  }

  const baseUrl = isOpenAPI3
    ? (spec.servers?.[0]?.url || 'https://api.example.com')
    : `${spec.schemes?.[0] || 'https'}://${spec.host || 'api.example.com'}${spec.basePath || ''}`;

  const paths = spec.paths || {};
  const items: PostmanItem[] = [];

  for (const [path, methods] of Object.entries(paths) as [string, any][]) {
    for (const [method, op] of Object.entries(methods) as [string, any][]) {
      if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
        const name = op.summary || op.operationId || `${method.toUpperCase()} ${path}`;
        const pathParts = path.replace(/^\//, '').split('/');
        const headers: { key: string; value: string; type: string }[] = [];

        // Detect content type
        let bodyRaw = '';
        const consumes = op.consumes || spec.consumes || ['application/json'];
        if (['post', 'put', 'patch'].includes(method)) {
          headers.push({ key: 'Content-Type', value: 'application/json', type: 'text' });
          const bodyParam = op.requestBody?.content?.['application/json']?.schema
            || op.parameters?.find((p: any) => p.in === 'body')?.schema;
          if (bodyParam?.properties) {
            const sample: any = {};
            for (const [k, v] of Object.entries(bodyParam.properties) as [string, any][]) {
              sample[k] = v.example ?? (v.type === 'integer' ? 0 : v.type === 'boolean' ? false : 'string');
            }
            bodyRaw = JSON.stringify(sample, null, 2);
          } else {
            bodyRaw = '{}';
          }
        }

        headers.push({ key: 'Accept', value: 'application/json', type: 'text' });

        const item: PostmanItem = {
          name,
          request: {
            method: method.toUpperCase(),
            header: headers,
            url: {
              raw: `${baseUrl}${path}`,
              host: [baseUrl],
              path: pathParts,
            },
          },
        };

        if (bodyRaw) {
          item.request.body = {
            mode: 'raw',
            raw: bodyRaw,
            options: { raw: { language: 'json' } },
          };
        }

        // Auth from security
        const security = op.security || spec.security;
        if (security?.length) {
          const scheme = Object.keys(security[0])[0];
          const secDef = spec.components?.securitySchemes?.[scheme] || spec.securityDefinitions?.[scheme];
          if (secDef?.type === 'http' && secDef?.scheme === 'bearer') {
            item.request.auth = {
              type: 'bearer',
              bearer: [{ key: 'token', value: '{{token}}', type: 'string' }],
            };
          } else if (secDef?.type === 'apiKey') {
            item.request.header.push({ key: secDef.name || 'X-API-Key', value: '{{apiKey}}', type: 'text' });
          }
        }

        items.push(item);
      }
    }
  }

  if (items.length === 0) {
    return { error: 'No API paths found in the spec. Make sure the "paths" object is populated.' };
  }

  return {
    info: { name: title, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', _postman_id: generateId() },
    item: items,
  };
}

const SAMPLE_SPEC = `{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet Store API",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "https://petstore.example.com/v1" }
  ],
  "paths": {
    "/pets": {
      "get": {
        "summary": "List all pets",
        "operationId": "listPets",
        "security": [{ "bearerAuth": [] }]
      },
      "post": {
        "summary": "Create a pet",
        "operationId": "createPet",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "Doggo" },
                  "age": { "type": "integer", "example": 3 }
                }
              }
            }
          }
        }
      }
    },
    "/pets/{id}": {
      "get": {
        "summary": "Get a pet by ID",
        "operationId": "getPet"
      },
      "delete": {
        "summary": "Delete a pet",
        "operationId": "deletePet"
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": { "type": "http", "scheme": "bearer" }
    }
  }
}`;

export default function OpenApiToPostman() {
  const [input, setInput] = useState(SAMPLE_SPEC);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  const convert = useCallback(() => {
    setError(null);
    setResult(null);
    const out = parseOpenAPI(input);
    if ('error' in out) {
      setError(out.error);
    } else {
      setItemCount(out.item.length);
      setResult(JSON.stringify(out, null, 2));
    }
  }, [input]);

  const copy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [result]);

  const download = useCallback(() => {
    if (!result) return;
    const blob = new Blob([result], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'postman_collection.json';
    a.click(); URL.revokeObjectURL(url);
  }, [result]);

  return (
    <div class="space-y-4">
      <div class="flex gap-2 flex-wrap items-center">
        <span class="text-sm text-text-muted">OpenAPI 3.0 / Swagger 2.0 JSON Spec</span>
        <button
          onClick={() => { setInput(SAMPLE_SPEC); setResult(null); setError(null); }}
          class="ml-auto px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
      </div>

      <textarea
        value={input}
        onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setResult(null); setError(null); }}
        placeholder="Paste your OpenAPI 3.0 or Swagger 2.0 JSON spec here..."
        class="w-full h-72 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
        spellcheck={false}
      />

      <button
        onClick={convert}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Convert to Postman Collection
      </button>

      {error && (
        <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-400">{error}</div>
      )}

      {result && (
        <div class="space-y-2">
          <div class="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg text-sm flex-wrap">
            <span class="text-green-400 font-medium">✓ Converted {itemCount} endpoint{itemCount !== 1 ? 's' : ''}</span>
            <div class="ml-auto flex gap-2">
              <button
                onClick={copy}
                class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
              >
                {copied ? 'Copied!' : 'Copy JSON'}
              </button>
              <button
                onClick={download}
                class="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/80 transition-colors"
              >
                Download .json
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={result}
            class="w-full h-80 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none text-text"
            spellcheck={false}
          />
        </div>
      )}

      <p class="text-xs text-text-muted">
        Converts OpenAPI 3.0 and Swagger 2.0 JSON specs to Postman Collection v2.1 format. Preserves endpoints, methods, request bodies, auth headers, and security schemes. Runs 100% in your browser.
      </p>
    </div>
  );
}
