import { useState, useMemo } from 'preact/hooks';

interface Layer {
  id: string;
  instruction: string;
  command: string;
  estimatedMb: number;
  tip?: string;
}

const BASE_IMAGES: Record<string, { size: number; label: string; description: string }> = {
  'scratch': { size: 0, label: 'scratch (0 MB)', description: 'Completely empty — for statically compiled binaries (Go, Rust)' },
  'alpine:3': { size: 7, label: 'alpine:3 (~7 MB)', description: 'Minimal Linux with musl libc — great for compiled apps' },
  'debian:bookworm-slim': { size: 75, label: 'debian:bookworm-slim (~75 MB)', description: 'Slim Debian — good balance of tools and size' },
  'ubuntu:22.04': { size: 77, label: 'ubuntu:22.04 (~77 MB)', description: 'Popular, familiar, but slightly larger' },
  'node:20-alpine': { size: 135, label: 'node:20-alpine (~135 MB)', description: 'Node.js on Alpine — recommended for Node apps' },
  'node:20-slim': { size: 225, label: 'node:20-slim (~225 MB)', description: 'Node.js on Debian slim' },
  'node:20': { size: 1090, label: 'node:20 (~1.09 GB)', description: 'Full Node.js — avoid in production' },
  'python:3.12-alpine': { size: 50, label: 'python:3.12-alpine (~50 MB)', description: 'Python on Alpine — good for simple scripts' },
  'python:3.12-slim': { size: 130, label: 'python:3.12-slim (~130 MB)', description: 'Python slim Debian — best for most Python apps' },
  'python:3.12': { size: 1000, label: 'python:3.12 (~1 GB)', description: 'Full Python — avoid in production' },
  'golang:1.22-alpine': { size: 280, label: 'golang:1.22-alpine (~280 MB)', description: 'Build stage only — use scratch or alpine for final image' },
  'nginx:alpine': { size: 45, label: 'nginx:alpine (~45 MB)', description: 'Nginx on Alpine — great for serving static files' },
  'redis:alpine': { size: 40, label: 'redis:alpine (~40 MB)', description: 'Redis on Alpine' },
};

const COMMON_OPERATIONS: { label: string; instruction: string; command: string; size: number; tip?: string }[] = [
  { label: 'apt-get install (curl, wget, git)', instruction: 'RUN', command: 'apt-get update && apt-get install -y curl wget git && rm -rf /var/lib/apt/lists/*', size: 80, tip: 'Always clean apt cache in same layer to reduce size' },
  { label: 'apt-get install (build tools)', instruction: 'RUN', command: 'apt-get update && apt-get install -y build-essential gcc g++ make && rm -rf /var/lib/apt/lists/*', size: 250, tip: 'Consider multi-stage build to exclude build tools from final image' },
  { label: 'apk add (Alpine packages)', instruction: 'RUN', command: 'apk add --no-cache curl wget git', size: 15 },
  { label: 'npm install (production deps)', instruction: 'RUN', command: 'npm ci --omit=dev', size: 80, tip: 'Use --omit=dev to exclude devDependencies' },
  { label: 'npm install (all deps)', instruction: 'RUN', command: 'npm ci', size: 200, tip: 'Use --omit=dev in production; or separate build/run stages' },
  { label: 'pip install (small package)', instruction: 'RUN', command: 'pip install --no-cache-dir requests', size: 5 },
  { label: 'pip install (requirements.txt)', instruction: 'RUN', command: 'pip install --no-cache-dir -r requirements.txt', size: 150, tip: 'Use --no-cache-dir to avoid pip cache being stored in layer' },
  { label: 'COPY source code (~10 MB app)', instruction: 'COPY', command: '. /app', size: 10 },
  { label: 'ADD large assets / downloads', instruction: 'ADD', command: 'model.bin /app/', size: 500, tip: 'Consider mounting large files at runtime instead of baking into image' },
  { label: 'Go build (binary only)', instruction: 'RUN', command: 'CGO_ENABLED=0 GOOS=linux go build -o /app/server .', size: 15 },
];

let uid = 0;
function newId() { return String(++uid); }

export default function DockerImageSizeEstimator() {
  const [baseImage, setBaseImage] = useState('node:20-alpine');
  const [layers, setLayers] = useState<Layer[]>([
    { id: newId(), instruction: 'WORKDIR', command: '/app', estimatedMb: 0 },
    { id: newId(), instruction: 'COPY', command: 'package*.json ./', estimatedMb: 0.1 },
    { id: newId(), instruction: 'RUN', command: 'npm ci --omit=dev', estimatedMb: 80 },
    { id: newId(), instruction: 'COPY', command: '. .', estimatedMb: 10 },
  ]);

  const baseSize = BASE_IMAGES[baseImage]?.size ?? 100;
  const totalMb = useMemo(
    () => baseSize + layers.reduce((sum, l) => sum + (l.estimatedMb || 0), 0),
    [baseSize, layers]
  );

  function addLayer(op?: typeof COMMON_OPERATIONS[0]) {
    setLayers((prev) => [
      ...prev,
      {
        id: newId(),
        instruction: op?.instruction ?? 'RUN',
        command: op?.command ?? '',
        estimatedMb: op?.size ?? 0,
        tip: op?.tip,
      },
    ]);
  }

  function removeLayer(id: string) {
    setLayers((prev) => prev.filter((l) => l.id !== id));
  }

  function updateLayer(id: string, patch: Partial<Layer>) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  const dockerfile = [
    `FROM ${baseImage}`,
    ...layers.map((l) => `${l.instruction} ${l.command}`),
  ].join('\n');

  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(dockerfile);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sizeColor(mb: number) {
    if (mb < 100) return 'text-green-400';
    if (mb < 500) return 'text-yellow-400';
    return 'text-red-400';
  }

  return (
    <div class="space-y-5">
      {/* Base image */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Base image</label>
        <select
          value={baseImage}
          onChange={(e) => setBaseImage((e.target as HTMLSelectElement).value)}
          class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary"
        >
          {Object.entries(BASE_IMAGES).map(([key, { label, description }]) => (
            <option key={key} value={key}>{label} — {description}</option>
          ))}
        </select>
        <p class="mt-1.5 text-xs text-text-muted">{BASE_IMAGES[baseImage]?.description}</p>
      </div>

      {/* Size estimate */}
      <div class={`flex items-center gap-4 px-4 py-4 border border-border rounded-xl bg-bg-card`}>
        <div>
          <p class="text-xs text-text-muted">Estimated image size</p>
          <p class={`text-3xl font-bold font-mono ${sizeColor(totalMb)}`}>
            {totalMb >= 1000 ? `${(totalMb / 1000).toFixed(2)} GB` : `${Math.round(totalMb)} MB`}
          </p>
        </div>
        <div class="flex-1 h-2 bg-border rounded-full overflow-hidden">
          <div
            class={`h-full rounded-full transition-all ${totalMb < 100 ? 'bg-green-500' : totalMb < 500 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, (totalMb / 1200) * 100)}%` }}
          />
        </div>
        <div class="text-xs text-text-muted text-right">
          <p class={totalMb < 100 ? 'text-green-400' : 'text-text-muted'}>{'<100MB 🟢'}</p>
          <p class={totalMb >= 100 && totalMb < 500 ? 'text-yellow-400' : 'text-text-muted'}>{'<500MB 🟡'}</p>
          <p class={totalMb >= 500 ? 'text-red-400' : 'text-text-muted'}>{'>500MB 🔴'}</p>
        </div>
      </div>

      {/* Layers */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-text">Layers</p>
        </div>

        {/* Base layer (readonly) */}
        <div class="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-bg-card opacity-60">
          <span class="text-xs font-mono text-primary w-20 shrink-0">FROM</span>
          <span class="text-xs font-mono text-text flex-1">{baseImage}</span>
          <span class="text-xs font-mono text-text-muted w-16 text-right">{baseSize} MB</span>
        </div>

        {layers.map((layer) => (
          <div key={layer.id} class="border border-border rounded-lg overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-bg-card">
              <select
                value={layer.instruction}
                onChange={(e) => updateLayer(layer.id, { instruction: (e.target as HTMLSelectElement).value })}
                class="text-xs font-mono text-primary bg-transparent border-0 focus:outline-none w-20 shrink-0"
              >
                {['RUN', 'COPY', 'ADD', 'WORKDIR', 'ENV', 'ARG', 'EXPOSE', 'CMD', 'ENTRYPOINT'].map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <input
                value={layer.command}
                onInput={(e) => updateLayer(layer.id, { command: (e.target as HTMLInputElement).value })}
                class="flex-1 min-w-0 bg-transparent text-xs font-mono text-text focus:outline-none"
                placeholder="command..."
              />
              <input
                type="number"
                value={layer.estimatedMb}
                onInput={(e) => updateLayer(layer.id, { estimatedMb: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                class="w-20 shrink-0 text-xs font-mono text-text-muted text-right bg-transparent focus:outline-none border-0"
                placeholder="0 MB"
              />
              <span class="text-xs text-text-muted shrink-0">MB</span>
              <button
                onClick={() => removeLayer(layer.id)}
                class="text-xs text-red-400 hover:text-red-300 shrink-0"
              >
                ✕
              </button>
            </div>
            {layer.tip && (
              <div class="px-3 py-1.5 bg-yellow-500/5 border-t border-yellow-500/20 text-xs text-yellow-400">
                💡 {layer.tip}
              </div>
            )}
          </div>
        ))}

        <button
          onClick={() => addLayer()}
          class="w-full py-2 border border-dashed border-border rounded-lg text-xs text-text-muted hover:border-primary hover:text-primary transition-colors"
        >
          + Add Custom Layer
        </button>
      </div>

      {/* Common operations */}
      <div>
        <p class="text-xs text-text-muted mb-2">Add common operation:</p>
        <div class="flex flex-wrap gap-2">
          {COMMON_OPERATIONS.map((op) => (
            <button
              key={op.label}
              onClick={() => addLayer(op)}
              class="px-2.5 py-1 text-xs rounded-lg bg-bg-card border border-border hover:border-primary hover:text-primary text-text-muted transition-colors"
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dockerfile preview */}
      <div class="border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-bg-card border-b border-border">
          <span class="text-sm font-semibold text-text">Dockerfile</span>
          <button
            onClick={copy}
            class="px-3 py-1 text-xs rounded-lg bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 text-xs font-mono text-text bg-bg-card overflow-x-auto whitespace-pre">{dockerfile}</pre>
      </div>
    </div>
  );
}
