import { useState } from 'preact/hooks';

type Stack = 'node' | 'python' | 'go' | 'java' | 'rust';

interface Layer {
  id: number;
  type: 'RUN' | 'COPY' | 'ENV' | 'ARG' | 'WORKDIR';
  value: string;
}

interface Config {
  stack: Stack;
  version: string;
  workdir: string;
  port: string;
  multistage: boolean;
  layers: Layer[];
  cmd: string;
}

const STACKS: Record<Stack, { label: string; icon: string; versions: string[]; defaultPort: string; baseImage: string; buildCmd: string; runCmd: string; defaultLayers: Omit<Layer, 'id'>[]; multistageBuilder: string; multistageCopy: string }> = {
  node: {
    label: 'Node.js', icon: '🟢', versions: ['20-alpine', '20', '18-alpine', '18'],
    defaultPort: '3000', baseImage: 'node',
    buildCmd: 'RUN npm ci --only=production',
    runCmd: 'CMD ["node", "server.js"]',
    defaultLayers: [
      { type: 'COPY', value: 'package*.json ./' },
      { type: 'RUN', value: 'npm ci --only=production' },
      { type: 'COPY', value: '. .' },
    ],
    multistageBuilder: 'node:20-alpine AS builder',
    multistageCopy: 'COPY --from=builder /app/dist ./dist',
  },
  python: {
    label: 'Python', icon: '🐍', versions: ['3.12-slim', '3.12', '3.11-slim', '3.11', '3.10-slim'],
    defaultPort: '8000', baseImage: 'python',
    buildCmd: 'RUN pip install --no-cache-dir -r requirements.txt',
    runCmd: 'CMD ["python", "app.py"]',
    defaultLayers: [
      { type: 'COPY', value: 'requirements.txt .' },
      { type: 'RUN', value: 'pip install --no-cache-dir -r requirements.txt' },
      { type: 'COPY', value: '. .' },
    ],
    multistageBuilder: 'python:3.12-slim AS builder',
    multistageCopy: 'COPY --from=builder /app /app',
  },
  go: {
    label: 'Go', icon: '🐹', versions: ['1.22-alpine', '1.22', '1.21-alpine', '1.21'],
    defaultPort: '8080', baseImage: 'golang',
    buildCmd: 'RUN go build -o main .',
    runCmd: 'CMD ["./main"]',
    defaultLayers: [
      { type: 'COPY', value: 'go.mod go.sum ./' },
      { type: 'RUN', value: 'go mod download' },
      { type: 'COPY', value: '. .' },
      { type: 'RUN', value: 'go build -o main .' },
    ],
    multistageBuilder: 'golang:1.22-alpine AS builder',
    multistageCopy: 'COPY --from=builder /app/main ./main',
  },
  java: {
    label: 'Java', icon: '☕', versions: ['21-jdk-slim', '17-jdk-slim', '11-jdk-slim', '21-jre-slim'],
    defaultPort: '8080', baseImage: 'eclipse-temurin',
    buildCmd: 'RUN ./mvnw package -DskipTests',
    runCmd: 'CMD ["java", "-jar", "app.jar"]',
    defaultLayers: [
      { type: 'COPY', value: 'pom.xml .' },
      { type: 'COPY', value: 'src ./src' },
      { type: 'RUN', value: './mvnw package -DskipTests' },
    ],
    multistageBuilder: 'eclipse-temurin:21-jdk-slim AS builder',
    multistageCopy: 'COPY --from=builder /app/target/*.jar app.jar',
  },
  rust: {
    label: 'Rust', icon: '🦀', versions: ['1.78-slim', '1.78', '1.77-slim', 'latest'],
    defaultPort: '8080', baseImage: 'rust',
    buildCmd: 'RUN cargo build --release',
    runCmd: 'CMD ["./target/release/app"]',
    defaultLayers: [
      { type: 'COPY', value: 'Cargo.toml Cargo.lock ./' },
      { type: 'RUN', value: 'mkdir src && echo "fn main(){}" > src/main.rs && cargo build --release && rm -rf src' },
      { type: 'COPY', value: 'src ./src' },
      { type: 'RUN', value: 'cargo build --release' },
    ],
    multistageBuilder: 'rust:1.78-slim AS builder',
    multistageCopy: 'COPY --from=builder /app/target/release/app ./app',
  },
};

let nextId = 1;
function mkLayer(type: Layer['type'], value: string): Layer {
  return { id: nextId++, type, value };
}

function buildDockerfile(cfg: Config): string {
  const s = STACKS[cfg.stack];
  const lines: string[] = [];

  if (cfg.multistage) {
    lines.push(`# Build stage`);
    lines.push(`FROM ${s.multistageBuilder}`);
    lines.push(`WORKDIR ${cfg.workdir}`);
    lines.push('');
    cfg.layers.forEach(l => lines.push(`${l.type} ${l.value}`));
    lines.push('');
    lines.push(`# Runtime stage`);
    lines.push(`FROM ${s.baseImage}:${cfg.version}`);
    lines.push(`WORKDIR ${cfg.workdir}`);
    lines.push(s.multistageCopy);
  } else {
    lines.push(`FROM ${s.baseImage}:${cfg.version}`);
    lines.push(`WORKDIR ${cfg.workdir}`);
    lines.push('');
    cfg.layers.forEach(l => lines.push(`${l.type} ${l.value}`));
  }

  if (cfg.port) {
    lines.push('');
    lines.push(`EXPOSE ${cfg.port}`);
  }
  lines.push('');
  lines.push(cfg.cmd);

  return lines.join('\n');
}

const DEFAULT_STACK: Stack = 'node';

export default function DockerfileGenerator() {
  const initLayers = () => STACKS[DEFAULT_STACK].defaultLayers.map(l => mkLayer(l.type, l.value));

  const [cfg, setCfg] = useState<Config>({
    stack: DEFAULT_STACK,
    version: STACKS[DEFAULT_STACK].versions[0],
    workdir: '/app',
    port: STACKS[DEFAULT_STACK].defaultPort,
    multistage: false,
    layers: initLayers(),
    cmd: STACKS[DEFAULT_STACK].runCmd,
  });
  const [copied, setCopied] = useState(false);

  const switchStack = (stack: Stack) => {
    const s = STACKS[stack];
    setCfg({
      stack,
      version: s.versions[0],
      workdir: '/app',
      port: s.defaultPort,
      multistage: false,
      layers: s.defaultLayers.map(l => mkLayer(l.type, l.value)),
      cmd: s.runCmd,
    });
  };

  const updateLayer = (id: number, value: string) => {
    setCfg(c => ({ ...c, layers: c.layers.map(l => l.id === id ? { ...l, value } : l) }));
  };

  const removeLayer = (id: number) => {
    setCfg(c => ({ ...c, layers: c.layers.filter(l => l.id !== id) }));
  };

  const addLayer = (type: Layer['type']) => {
    setCfg(c => ({ ...c, layers: [...c.layers, mkLayer(type, '')] }));
  };

  const dockerfile = buildDockerfile(cfg);

  const copyDockerfile = () => {
    navigator.clipboard.writeText(dockerfile);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Config */}
      <div class="space-y-5">
        {/* Stack picker */}
        <div>
          <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Stack</label>
          <div class="grid grid-cols-5 gap-2">
            {(Object.entries(STACKS) as [Stack, typeof STACKS[Stack]][]).map(([key, s]) => (
              <button
                key={key}
                onClick={() => switchStack(key)}
                class={`flex flex-col items-center py-2 px-1 rounded-lg border text-xs font-medium transition-colors ${
                  cfg.stack === key
                    ? 'bg-primary text-white border-primary'
                    : 'bg-bg-secondary border-border hover:border-primary text-text-muted'
                }`}
              >
                <span class="text-lg mb-0.5">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Version, workdir, port */}
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs text-text-muted mb-1">Version</label>
            <select
              value={cfg.version}
              onChange={e => setCfg(c => ({ ...c, version: (e.currentTarget as HTMLSelectElement).value }))}
              class="w-full px-2 py-2 bg-bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              {STACKS[cfg.stack].versions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">WORKDIR</label>
            <input
              type="text"
              value={cfg.workdir}
              onInput={e => setCfg(c => ({ ...c, workdir: (e.currentTarget as HTMLInputElement).value }))}
              class="w-full px-2 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">EXPOSE</label>
            <input
              type="text"
              value={cfg.port}
              onInput={e => setCfg(c => ({ ...c, port: (e.currentTarget as HTMLInputElement).value }))}
              class="w-full px-2 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Multi-stage toggle */}
        <label class="flex items-center gap-3 cursor-pointer">
          <div
            class={`relative w-10 h-5 rounded-full transition-colors ${cfg.multistage ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
            onClick={() => setCfg(c => ({ ...c, multistage: !c.multistage }))}
          >
            <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cfg.multistage ? 'translate-x-5' : ''}`} />
          </div>
          <span class="text-sm">Multi-stage build (smaller image)</span>
        </label>

        {/* Layers */}
        <div>
          <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Layers</label>
          <div class="space-y-2">
            {cfg.layers.map(layer => (
              <div key={layer.id} class="flex gap-2 items-center">
                <span class="font-mono text-xs bg-bg-tertiary px-2 py-1.5 rounded text-primary w-16 shrink-0">{layer.type}</span>
                <input
                  type="text"
                  value={layer.value}
                  onInput={e => updateLayer(layer.id, (e.currentTarget as HTMLInputElement).value)}
                  class="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm font-mono focus:outline-none focus:border-primary"
                />
                <button onClick={() => removeLayer(layer.id)} class="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
              </div>
            ))}
          </div>
          <div class="flex gap-2 mt-2 flex-wrap">
            {(['RUN', 'COPY', 'ENV', 'ARG'] as Layer['type'][]).map(t => (
              <button
                key={t}
                onClick={() => addLayer(t)}
                class="text-xs px-2 py-1 bg-bg-secondary border border-border rounded hover:border-primary text-text-muted hover:text-primary transition-colors"
              >
                + {t}
              </button>
            ))}
          </div>
        </div>

        {/* CMD */}
        <div>
          <label class="block text-xs text-text-muted mb-1">CMD</label>
          <input
            type="text"
            value={cfg.cmd}
            onInput={e => setCfg(c => ({ ...c, cmd: (e.currentTarget as HTMLInputElement).value }))}
            class="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-text-muted uppercase tracking-wide">Generated Dockerfile</label>
          <button
            onClick={copyDockerfile}
            class="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg-secondary border border-border rounded-xl p-4 text-sm font-mono text-text whitespace-pre overflow-x-auto min-h-[400px] leading-relaxed">
          {dockerfile}
        </pre>
      </div>
    </div>
  );
}
