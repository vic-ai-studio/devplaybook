import { useState } from 'preact/hooks';

interface PairEntry {
  id: number;
  host: string;
  container: string;
}

interface EnvEntry {
  id: number;
  value: string;
}

interface Config {
  image: string;
  name: string;
  ports: PairEntry[];
  volumes: PairEntry[];
  envVars: EnvEntry[];
  network: string;
  restart: string;
  detached: boolean;
  removeOnExit: boolean;
  interactive: boolean;
  workdir: string;
}

let nextId = 1;
function mkPair(host = '', container = ''): PairEntry {
  return { id: nextId++, host, container };
}
function mkEnv(value = ''): EnvEntry {
  return { id: nextId++, value };
}

const defaultConfig = (): Config => ({
  image: '',
  name: '',
  ports: [],
  volumes: [],
  envVars: [],
  network: '',
  restart: 'no',
  detached: true,
  removeOnExit: false,
  interactive: false,
  workdir: '',
});

function buildCommand(cfg: Config): string {
  if (!cfg.image.trim()) return 'docker run [fill in the image name above]';

  const parts: string[] = ['docker run'];

  if (cfg.detached) parts.push('-d');
  if (cfg.interactive) parts.push('-it');
  if (cfg.removeOnExit) parts.push('--rm');
  if (cfg.name.trim()) parts.push(`--name ${cfg.name.trim()}`);

  for (const p of cfg.ports) {
    const h = p.host.trim();
    const c = p.container.trim();
    if (h && c) parts.push(`-p ${h}:${c}`);
    else if (h) parts.push(`-p ${h}`);
  }

  for (const v of cfg.volumes) {
    const h = v.host.trim();
    const c = v.container.trim();
    if (h && c) parts.push(`-v ${h}:${c}`);
    else if (h) parts.push(`-v ${h}`);
  }

  for (const e of cfg.envVars) {
    if (e.value.trim()) parts.push(`-e ${e.value.trim()}`);
  }

  if (cfg.network.trim()) parts.push(`--network ${cfg.network.trim()}`);
  if (cfg.restart && cfg.restart !== 'no') parts.push(`--restart ${cfg.restart}`);
  if (cfg.workdir.trim()) parts.push(`-w ${cfg.workdir.trim()}`);

  parts.push(cfg.image.trim());

  return parts.join(' \\\n  ');
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label class="flex items-center gap-3 cursor-pointer select-none">
      <div
        class={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
        onClick={onChange}
      >
        <div class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span class="text-sm">{label}</span>
    </label>
  );
}

export default function DockerRunCommandBuilder() {
  const [cfg, setCfg] = useState<Config>(defaultConfig());
  const [copied, setCopied] = useState(false);

  const set = (patch: Partial<Config>) => setCfg(c => ({ ...c, ...patch }));

  const addPort = () => set({ ports: [...cfg.ports, mkPair('', '')] });
  const removePort = (id: number) => set({ ports: cfg.ports.filter(p => p.id !== id) });
  const updatePort = (id: number, field: 'host' | 'container', val: string) =>
    set({ ports: cfg.ports.map(p => p.id === id ? { ...p, [field]: val } : p) });

  const addVolume = () => set({ volumes: [...cfg.volumes, mkPair('', '')] });
  const removeVolume = (id: number) => set({ volumes: cfg.volumes.filter(v => v.id !== id) });
  const updateVolume = (id: number, field: 'host' | 'container', val: string) =>
    set({ volumes: cfg.volumes.map(v => v.id === id ? { ...v, [field]: val } : v) });

  const addEnv = () => set({ envVars: [...cfg.envVars, mkEnv('=')] });
  const removeEnv = (id: number) => set({ envVars: cfg.envVars.filter(e => e.id !== id) });
  const updateEnv = (id: number, val: string) =>
    set({ envVars: cfg.envVars.map(e => e.id === id ? { ...e, value: val } : e) });

  const command = buildCommand(cfg);

  const handleCopy = () => {
    const plain = command.replace(/ \\\n  /g, ' ');
    navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleReset = () => {
    setCfg(defaultConfig());
    setCopied(false);
  };

  const inputClass = 'w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary';
  const labelClass = 'block text-xs text-text-muted mb-1';
  const sectionLabel = 'block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2';
  const pairInput = 'flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm font-mono focus:outline-none focus:border-primary min-w-0';
  const addBtn = 'text-xs px-3 py-1.5 bg-bg-secondary border border-border rounded hover:border-primary text-text-muted hover:text-primary transition-colors';
  const removeBtn = 'shrink-0 text-gray-400 hover:text-red-500 text-xl leading-none px-1';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: form */}
      <div class="space-y-5">

        {/* Image */}
        <div>
          <label class={labelClass}>Image name <span class="text-red-400">*</span></label>
          <input
            type="text"
            value={cfg.image}
            placeholder="nginx:latest"
            onInput={e => set({ image: (e.currentTarget as HTMLInputElement).value })}
            class={inputClass}
          />
        </div>

        {/* Container name */}
        <div>
          <label class={labelClass}>Container name (optional)</label>
          <input
            type="text"
            value={cfg.name}
            placeholder="my-container"
            onInput={e => set({ name: (e.currentTarget as HTMLInputElement).value })}
            class={inputClass}
          />
        </div>

        {/* Port mappings */}
        <div>
          <label class={sectionLabel}>Port mappings (-p)</label>
          <div class="space-y-2">
            {cfg.ports.map(p => (
              <div key={p.id} class="flex items-center gap-2">
                <input
                  type="text"
                  value={p.host}
                  placeholder="8080"
                  onInput={e => updatePort(p.id, 'host', (e.currentTarget as HTMLInputElement).value)}
                  class={pairInput}
                />
                <span class="text-text-muted text-sm shrink-0">:</span>
                <input
                  type="text"
                  value={p.container}
                  placeholder="80"
                  onInput={e => updatePort(p.id, 'container', (e.currentTarget as HTMLInputElement).value)}
                  class={pairInput}
                />
                <button onClick={() => removePort(p.id)} class={removeBtn} aria-label="Remove port">×</button>
              </div>
            ))}
          </div>
          <button onClick={addPort} class={`mt-2 ${addBtn}`}>+ Add port</button>
        </div>

        {/* Volume mounts */}
        <div>
          <label class={sectionLabel}>Volume mounts (-v)</label>
          <div class="space-y-2">
            {cfg.volumes.map(v => (
              <div key={v.id} class="flex items-center gap-2">
                <input
                  type="text"
                  value={v.host}
                  placeholder="./data"
                  onInput={e => updateVolume(v.id, 'host', (e.currentTarget as HTMLInputElement).value)}
                  class={pairInput}
                />
                <span class="text-text-muted text-sm shrink-0">:</span>
                <input
                  type="text"
                  value={v.container}
                  placeholder="/data"
                  onInput={e => updateVolume(v.id, 'container', (e.currentTarget as HTMLInputElement).value)}
                  class={pairInput}
                />
                <button onClick={() => removeVolume(v.id)} class={removeBtn} aria-label="Remove volume">×</button>
              </div>
            ))}
          </div>
          <button onClick={addVolume} class={`mt-2 ${addBtn}`}>+ Add volume</button>
        </div>

        {/* Environment variables */}
        <div>
          <label class={sectionLabel}>Environment variables (-e)</label>
          <div class="space-y-2">
            {cfg.envVars.map(e => (
              <div key={e.id} class="flex items-center gap-2">
                <input
                  type="text"
                  value={e.value}
                  placeholder="KEY=VALUE"
                  onInput={ev => updateEnv(e.id, (ev.currentTarget as HTMLInputElement).value)}
                  class={pairInput}
                />
                <button onClick={() => removeEnv(e.id)} class={removeBtn} aria-label="Remove env var">×</button>
              </div>
            ))}
          </div>
          <button onClick={addEnv} class={`mt-2 ${addBtn}`}>+ Add variable</button>
        </div>

        {/* Network + Restart */}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class={labelClass}>Network (optional)</label>
            <input
              type="text"
              value={cfg.network}
              placeholder="bridge"
              onInput={e => set({ network: (e.currentTarget as HTMLInputElement).value })}
              class={inputClass}
            />
          </div>
          <div>
            <label class={labelClass}>Restart policy</label>
            <select
              value={cfg.restart}
              onChange={e => set({ restart: (e.currentTarget as HTMLSelectElement).value })}
              class="w-full px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            >
              <option value="no">no (default)</option>
              <option value="always">always</option>
              <option value="unless-stopped">unless-stopped</option>
              <option value="on-failure">on-failure</option>
            </select>
          </div>
        </div>

        {/* Working directory */}
        <div>
          <label class={labelClass}>Working directory -w (optional)</label>
          <input
            type="text"
            value={cfg.workdir}
            placeholder="/app"
            onInput={e => set({ workdir: (e.currentTarget as HTMLInputElement).value })}
            class={inputClass}
          />
        </div>

        {/* Toggles */}
        <div class="space-y-3 pt-1">
          <Toggle checked={cfg.detached} onChange={() => set({ detached: !cfg.detached, interactive: cfg.detached ? cfg.interactive : false })} label="Detached mode (-d)" />
          <Toggle checked={cfg.removeOnExit} onChange={() => set({ removeOnExit: !cfg.removeOnExit })} label="Remove on exit (--rm)" />
          <Toggle checked={cfg.interactive} onChange={() => set({ interactive: !cfg.interactive, detached: cfg.interactive ? cfg.detached : false })} label="Interactive + TTY (-it)" />
        </div>
      </div>

      {/* Right: output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <label class={sectionLabel}>Generated command</label>
          <div class="flex gap-2">
            <button
              onClick={handleReset}
              class="text-xs px-3 py-1.5 bg-bg-secondary border border-border rounded-lg hover:border-primary text-text-muted hover:text-primary transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleCopy}
              class="text-xs px-3 py-1.5 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <pre class="bg-gray-950 border border-border rounded-xl p-4 text-sm font-mono text-green-400 whitespace-pre overflow-x-auto min-h-[200px] leading-relaxed">
          {command}
        </pre>
        <p class="text-xs text-text-muted">The command is formatted with line continuations for readability. The copy button outputs a single-line command.</p>
      </div>
    </div>
  );
}
