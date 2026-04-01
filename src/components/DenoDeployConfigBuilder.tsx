import { useState } from 'preact/hooks';

type Pattern = 'rest-api' | 'ssr' | 'static' | 'websocket' | 'cron';

interface EnvVar {
  id: string;
  key: string;
  value: string;
  secret: boolean;
}

interface Config {
  projectName: string;
  entryPoint: string;
  envVars: EnvVar[];
  staticFiles: boolean;
  kvDatabase: boolean;
  cronJobs: boolean;
  websockets: boolean;
  typescript: boolean;
  pattern: Pattern;
  importMapUrl: string;
  useImportMap: boolean;
}

const PATTERNS: { key: Pattern; label: string; desc: string }[] = [
  { key: 'rest-api', label: 'REST API', desc: 'JSON API with routing' },
  { key: 'ssr', label: 'SSR App', desc: 'Server-side rendering' },
  { key: 'static', label: 'Static Site', desc: 'File serving + API' },
  { key: 'websocket', label: 'WebSocket', desc: 'Real-time server' },
  { key: 'cron', label: 'Cron Job', desc: 'Scheduled background task' },
];

function generateDenoJson(cfg: Config): string {
  const tasks: Record<string, string> = {
    start: `deno run ${cfg.typescript ? '--allow-net --allow-read --allow-env' : '--allow-all'} ${cfg.entryPoint || 'main.ts'}`,
    dev: `deno run --watch ${cfg.typescript ? '--allow-net --allow-read --allow-env' : '--allow-all'} ${cfg.entryPoint || 'main.ts'}`,
    test: 'deno test --allow-all',
    fmt: 'deno fmt',
    lint: 'deno lint',
  };

  const obj: any = {
    name: cfg.projectName || 'my-deno-app',
    version: '1.0.0',
    tasks,
    ...(cfg.useImportMap && { importMap: cfg.importMapUrl || './import_map.json' }),
    ...(cfg.typescript && {
      compilerOptions: {
        strict: true,
        noImplicitAny: true,
        lib: ['deno.window', 'deno.unstable'],
      },
    }),
    exclude: ['node_modules/', 'dist/', '.git/'],
  };

  return JSON.stringify(obj, null, 2);
}

function generateDeployYaml(cfg: Config): string {
  const name = cfg.projectName || 'my-deno-app';
  const entry = cfg.entryPoint || 'main.ts';
  const envBlock = cfg.envVars.filter(v => v.key && !v.secret).length > 0
    ? `\n          env:\n` + cfg.envVars.filter(v => v.key && !v.secret).map(v => `            ${v.key}: \${{ secrets.${v.key} }}`).join('\n')
    : '';

  return `name: Deploy to Deno Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for Deno Deploy OIDC
      contents: read

    steps:
      - name: Clone repository
        uses: actions/checkout@v4

      - name: Setup Deno
        uses: denoland/setup-deno@v1
        with:
          deno-version: v2.x

      - name: Run tests
        run: deno test --allow-all

      - name: Deploy to Deno Deploy
        uses: denoland/deployctl@v1
        with:
          project: "${name}"
          entrypoint: "${entry}"
          root: "."${envBlock}`;
}

function generateImportMap(cfg: Config): string {
  const imports: Record<string, string> = {
    'std/': 'https://deno.land/std@0.220.0/',
  };

  if (cfg.kvDatabase) {
    imports['@deno/kv'] = 'jsr:@deno/kv';
  }
  if (cfg.pattern === 'rest-api' || cfg.pattern === 'ssr') {
    imports['hono'] = 'https://deno.land/x/hono@v4.3.11/mod.ts';
    imports['hono/'] = 'https://deno.land/x/hono@v4.3.11/';
  }
  if (cfg.websockets) {
    imports['std/ws/'] = 'https://deno.land/std@0.220.0/ws/';
  }

  return JSON.stringify({ imports }, null, 2);
}

function generateEntryPoint(cfg: Config): string {
  switch (cfg.pattern) {
    case 'rest-api':
      return `import { Hono } from "hono";
${cfg.kvDatabase ? 'const kv = await Deno.openKv();\n' : ''}
const app = new Hono();

app.get("/", (c) => c.json({ message: "Hello from ${cfg.projectName || 'Deno Deploy'}!" }));

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.get("/items/:id", async (c) => {
  const id = c.req.param("id");
${cfg.kvDatabase ? `  const result = await kv.get(["items", id]);
  if (!result.value) return c.json({ error: "Not found" }, 404);
  return c.json(result.value);` : `  return c.json({ id, name: "Sample item" });`}
});

app.post("/items", async (c) => {
  const body = await c.req.json();
${cfg.kvDatabase ? `  const id = crypto.randomUUID();
  await kv.set(["items", id], { id, ...body, createdAt: new Date().toISOString() });
  return c.json({ id }, 201);` : `  return c.json({ id: crypto.randomUUID(), ...body }, 201);`}
});

Deno.serve({ port: parseInt(Deno.env.get("PORT") ?? "8000") }, app.fetch);`;

    case 'ssr':
      return `import { Hono } from "hono";
import { html } from "hono/html";

const app = new Hono();

const Layout = (props: { title: string; children: any }) => html\`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>\${props.title}</title>
    </head>
    <body>
      \${props.children}
    </body>
  </html>
\`;

app.get("/", (c) => {
  return c.html(
    Layout({
      title: "${cfg.projectName || 'Deno App'}",
      children: html\`<h1>Welcome to ${cfg.projectName || 'Deno Deploy'}!</h1>\`,
    })
  );
});

Deno.serve({ port: parseInt(Deno.env.get("PORT") ?? "8000") }, app.fetch);`;

    case 'static':
      return `// Static file server with API routes
async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // API routes
  if (url.pathname.startsWith("/api/")) {
    return new Response(JSON.stringify({ path: url.pathname }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Static file serving
  try {
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = await Deno.readFile(\`./public\${filePath}\`);
    const contentType = getContentType(filePath);
    return new Response(file, { headers: { "Content-Type": contentType } });
  } catch {
    const notFound = await Deno.readFile("./public/404.html").catch(() => new Uint8Array());
    return new Response(notFound, { status: 404, headers: { "Content-Type": "text/html" } });
  }
}

function getContentType(path: string): string {
  const ext = path.split(".").pop() ?? "";
  const types: Record<string, string> = {
    html: "text/html", css: "text/css", js: "text/javascript",
    json: "application/json", png: "image/png", svg: "image/svg+xml",
  };
  return types[ext] ?? "application/octet-stream";
}

Deno.serve({ port: 8000 }, handler);`;

    case 'websocket':
      return `// WebSocket server on Deno Deploy
const clients = new Set<WebSocket>();

function handler(req: Request): Response {
  const url = new URL(req.url);

  if (url.pathname === "/ws") {
    const { socket, response } = Deno.upgradeWebSocket(req);

    socket.onopen = () => {
      clients.add(socket);
      console.log("Client connected, total:", clients.size);
    };

    socket.onmessage = (event) => {
      const data = event.data;
      // Broadcast to all clients
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ from: "server", data, ts: Date.now() }));
        }
      }
    };

    socket.onclose = () => {
      clients.delete(socket);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      clients.delete(socket);
    };

    return response;
  }

  return new Response("WebSocket endpoint: ws://localhost:8000/ws", {
    headers: { "Content-Type": "text/plain" },
  });
}

Deno.serve({ port: 8000 }, handler);`;

    case 'cron':
      return `// Cron job worker on Deno Deploy
// Note: Use Deno.cron() for scheduled tasks (Deno Deploy native)
${cfg.kvDatabase ? 'const kv = await Deno.openKv();\n' : ''}
// Schedule: run every hour
Deno.cron("hourly-sync", "0 * * * *", async () => {
  console.log("[CRON] Starting hourly sync:", new Date().toISOString());
  try {
    await runSync();
    console.log("[CRON] Sync completed successfully");
  } catch (err) {
    console.error("[CRON] Sync failed:", err);
  }
});

// Schedule: run at midnight daily
Deno.cron("daily-cleanup", "0 0 * * *", async () => {
  console.log("[CRON] Running daily cleanup");
  await runCleanup();
});

async function runSync() {
  const res = await fetch("https://api.example.com/data");
  const data = await res.json();
${cfg.kvDatabase ? `  await kv.set(["sync", "last-result"], { data, syncedAt: new Date().toISOString() });` : `  console.log("Fetched", data);`}
}

async function runCleanup() {
${cfg.kvDatabase ? `  // Delete entries older than 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const entries = kv.list({ prefix: ["cache"] });
  for await (const entry of entries) {
    if ((entry.value as any)?.ts < cutoff) {
      await kv.delete(entry.key);
    }
  }` : `  console.log("Cleanup done");`}
}

// HTTP handler for health checks
Deno.serve({ port: 8000 }, (_req) =>
  new Response(JSON.stringify({ status: "ok", cron: "active" }), {
    headers: { "Content-Type": "application/json" },
  })
);`;
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-bg border border-border text-text-muted hover:border-primary hover:text-primary'}`}
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

function CodeFile({ title, lang, code }: { title: string; lang: string; code: string }) {
  return (
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
        <span class="text-xs font-mono text-text-muted">{title}</span>
        <CopyButton value={code} />
      </div>
      <pre class="px-4 py-3 text-xs font-mono text-green-300 bg-gray-950 overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

export default function DenoDeployConfigBuilder() {
  const [cfg, setCfg] = useState<Config>({
    projectName: 'my-deno-app',
    entryPoint: 'main.ts',
    envVars: [{ id: '1', key: 'DATABASE_URL', value: '', secret: true }],
    staticFiles: false,
    kvDatabase: false,
    cronJobs: false,
    websockets: false,
    typescript: true,
    pattern: 'rest-api',
    importMapUrl: './import_map.json',
    useImportMap: true,
  });

  const set = (field: keyof Config, value: any) => setCfg(prev => ({ ...prev, [field]: value }));

  const addEnvVar = () => setCfg(prev => ({
    ...prev,
    envVars: [...prev.envVars, { id: Date.now().toString(), key: '', value: '', secret: false }],
  }));

  const updateEnvVar = (id: string, field: keyof EnvVar, value: any) => setCfg(prev => ({
    ...prev,
    envVars: prev.envVars.map(v => v.id === id ? { ...v, [field]: value } : v),
  }));

  const removeEnvVar = (id: string) => setCfg(prev => ({ ...prev, envVars: prev.envVars.filter(v => v.id !== id) }));

  return (
    <div class="space-y-4">
      {/* Pattern selector */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold mb-3">Project Pattern</h2>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PATTERNS.map(p => (
            <button
              key={p.key}
              onClick={() => set('pattern', p.key)}
              class={`px-3 py-2.5 rounded-lg border text-xs text-left transition-colors ${
                cfg.pattern === p.key
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              <div class="font-semibold">{p.label}</div>
              <div class="mt-0.5 opacity-70">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Basic config */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 class="text-sm font-semibold">Project Settings</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Project Name</label>
            <input
              type="text"
              value={cfg.projectName}
              onInput={(e: any) => set('projectName', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="my-deno-app"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Entry Point</label>
            <input
              type="text"
              value={cfg.entryPoint}
              onInput={(e: any) => set('entryPoint', e.target.value)}
              placeholder="main.ts"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Feature toggles */}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([
            { key: 'kvDatabase', label: 'Deno KV Database' },
            { key: 'staticFiles', label: 'Static Files' },
            { key: 'cronJobs', label: 'Cron Jobs' },
            { key: 'websockets', label: 'WebSockets' },
            { key: 'typescript', label: 'TypeScript Strict' },
            { key: 'useImportMap', label: 'Import Map' },
          ] as { key: keyof Config; label: string }[]).map(({ key, label }) => (
            <label key={key} class="flex items-center gap-2 text-sm cursor-pointer bg-bg border border-border rounded-lg px-3 py-2">
              <input
                type="checkbox"
                checked={cfg[key] as boolean}
                onChange={(e: any) => set(key, e.target.checked)}
                class="rounded"
              />
              <span class="text-xs">{label}</span>
            </label>
          ))}
        </div>

        {/* Env vars */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs text-text-muted font-medium">Environment Variables</label>
            <button onClick={addEnvVar} class="text-xs px-2 py-1 border border-border rounded text-text-muted hover:border-primary hover:text-primary transition-colors">+ Add</button>
          </div>
          <div class="space-y-2">
            {cfg.envVars.map(v => (
              <div key={v.id} class="flex items-center gap-2">
                <input
                  type="text"
                  value={v.key}
                  onInput={(e: any) => updateEnvVar(v.id, 'key', e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                  placeholder="KEY"
                  class="flex-1 bg-bg border border-border rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
                />
                <label class="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap cursor-pointer">
                  <input type="checkbox" checked={v.secret} onChange={(e: any) => updateEnvVar(v.id, 'secret', e.target.checked)} class="rounded" />
                  Secret
                </label>
                <button onClick={() => removeEnvVar(v.id)} class="text-xs text-red-400 px-1 hover:text-red-300">✕</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Generated files */}
      <CodeFile title="deno.json" lang="json" code={generateDenoJson(cfg)} />
      <CodeFile title=".github/workflows/deploy.yaml" lang="yaml" code={generateDeployYaml(cfg)} />
      {cfg.useImportMap && <CodeFile title="import_map.json" lang="json" code={generateImportMap(cfg)} />}
      <CodeFile title={cfg.entryPoint || 'main.ts'} lang="typescript" code={generateEntryPoint(cfg)} />

      {/* Permissions reference */}
      <div class="bg-blue-950/20 border border-blue-800/30 rounded-xl p-4 text-xs text-blue-300/80">
        <div class="font-medium text-blue-300 mb-2">Deno Permission Flags</div>
        <div class="grid grid-cols-2 gap-1">
          {[
            ['--allow-net', 'Network access (fetch, serve)'],
            ['--allow-read', 'File system reads'],
            ['--allow-write', 'File system writes'],
            ['--allow-env', 'Environment variables'],
            ['--allow-run', 'Subprocess execution'],
            ['--allow-all', 'All permissions (not recommended)'],
            ['--unstable-kv', 'Deno KV (built-in database)'],
            ['--unstable-cron', 'Deno.cron() scheduler'],
          ].map(([flag, desc]) => (
            <div key={flag}>
              <code class="font-mono bg-blue-950/40 px-1 rounded">{flag}</code>
              <span class="ml-1 text-blue-300/70">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
