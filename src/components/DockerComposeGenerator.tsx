import { useState } from 'preact/hooks';

interface Port { host: string; container: string; }
interface EnvVar { key: string; value: string; }
interface Volume { host: string; container: string; }
interface Service {
  name: string;
  image: string;
  ports: Port[];
  env: EnvVar[];
  volumes: Volume[];
  restart: string;
  dependsOn: string[];
}

const TEMPLATES: Record<string, Service[]> = {
  'Node + Postgres': [
    { name: 'app', image: 'node:20-alpine', ports: [{ host: '3000', container: '3000' }], env: [{ key: 'DATABASE_URL', value: 'postgres://user:pass@db:5432/mydb' }], volumes: [{ host: '.', container: '/app' }], restart: 'unless-stopped', dependsOn: ['db'] },
    { name: 'db', image: 'postgres:16-alpine', ports: [{ host: '5432', container: '5432' }], env: [{ key: 'POSTGRES_USER', value: 'user' }, { key: 'POSTGRES_PASSWORD', value: 'pass' }, { key: 'POSTGRES_DB', value: 'mydb' }], volumes: [{ host: 'pgdata', container: '/var/lib/postgresql/data' }], restart: 'unless-stopped', dependsOn: [] },
  ],
  'Nginx + App': [
    { name: 'nginx', image: 'nginx:alpine', ports: [{ host: '80', container: '80' }], env: [], volumes: [{ host: './nginx.conf', container: '/etc/nginx/nginx.conf' }], restart: 'always', dependsOn: ['app'] },
    { name: 'app', image: 'node:20-alpine', ports: [{ host: '3000', container: '3000' }], env: [{ key: 'NODE_ENV', value: 'production' }], volumes: [{ host: '.', container: '/app' }], restart: 'unless-stopped', dependsOn: [] },
  ],
  'Redis + App': [
    { name: 'app', image: 'node:20-alpine', ports: [{ host: '3000', container: '3000' }], env: [{ key: 'REDIS_URL', value: 'redis://cache:6379' }], volumes: [], restart: 'unless-stopped', dependsOn: ['cache'] },
    { name: 'cache', image: 'redis:7-alpine', ports: [{ host: '6379', container: '6379' }], env: [], volumes: [{ host: 'redis-data', container: '/data' }], restart: 'unless-stopped', dependsOn: [] },
  ],
};

function emptyService(): Service {
  return { name: 'service', image: '', ports: [], env: [], volumes: [], restart: 'unless-stopped', dependsOn: [] };
}

function generateYaml(services: Service[]): string {
  let y = 'services:\n';
  for (const svc of services) {
    y += `  ${svc.name}:\n`;
    y += `    image: ${svc.image}\n`;
    if (svc.restart) y += `    restart: ${svc.restart}\n`;
    if (svc.ports.length) {
      y += '    ports:\n';
      svc.ports.forEach(p => { y += `      - "${p.host}:${p.container}"\n`; });
    }
    if (svc.env.length) {
      y += '    environment:\n';
      svc.env.forEach(e => { y += `      ${e.key}: "${e.value}"\n`; });
    }
    if (svc.volumes.length) {
      y += '    volumes:\n';
      svc.volumes.forEach(v => { y += `      - ${v.host}:${v.container}\n`; });
    }
    if (svc.dependsOn.length) {
      y += '    depends_on:\n';
      svc.dependsOn.forEach(d => { y += `      - ${d}\n`; });
    }
    y += '\n';
  }

  const namedVols = services.flatMap(s => s.volumes).filter(v => !v.host.startsWith('.') && !v.host.startsWith('/'));
  if (namedVols.length) {
    y += 'volumes:\n';
    const seen = new Set<string>();
    namedVols.forEach(v => { if (!seen.has(v.host)) { y += `  ${v.host}:\n`; seen.add(v.host); } });
  }
  return y;
}

export default function DockerComposeGenerator() {
  const [services, setServices] = useState<Service[]>(TEMPLATES['Node + Postgres']);

  const updateService = (i: number, partial: Partial<Service>) => {
    const next = [...services];
    next[i] = { ...next[i], ...partial };
    setServices(next);
  };

  const addPort = (i: number) => updateService(i, { ports: [...services[i].ports, { host: '', container: '' }] });
  const addEnv = (i: number) => updateService(i, { env: [...services[i].env, { key: '', value: '' }] });
  const addVolume = (i: number) => updateService(i, { volumes: [...services[i].volumes, { host: '', container: '' }] });

  const yaml = generateYaml(services);

  return (
    <div class="space-y-6">
      {/* Templates */}
      <div class="flex gap-2 flex-wrap">
        {Object.keys(TEMPLATES).map(t => (
          <button
            key={t}
            onClick={() => setServices([...TEMPLATES[t]])}
            class="bg-bg-card border border-border rounded-lg px-3 py-1 text-sm hover:border-primary text-text-muted hover:text-text"
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => setServices([...services, emptyService()])}
          class="bg-primary/20 border border-primary rounded-lg px-3 py-1 text-sm text-primary hover:bg-primary/30"
        >
          + Add Service
        </button>
      </div>

      {/* Service editors */}
      {services.map((svc, si) => (
        <div key={si} class="bg-bg-card border border-border rounded-xl p-4">
          <div class="flex justify-between items-center mb-4">
            <div class="flex gap-3 items-center">
              <input
                value={svc.name}
                onInput={(e) => updateService(si, { name: (e.target as HTMLInputElement).value })}
                class="bg-bg-input border border-border rounded px-3 py-1 text-text font-mono font-bold"
                placeholder="service-name"
              />
              <input
                value={svc.image}
                onInput={(e) => updateService(si, { image: (e.target as HTMLInputElement).value })}
                class="bg-bg-input border border-border rounded px-3 py-1 text-text font-mono flex-1"
                placeholder="image:tag"
              />
            </div>
            <button onClick={() => setServices(services.filter((_, i) => i !== si))} class="text-red-400 hover:text-red-300 text-sm">Remove</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {/* Restart */}
            <div>
              <label class="block text-text-muted mb-1">Restart Policy</label>
              <select
                value={svc.restart}
                onChange={(e) => updateService(si, { restart: (e.target as HTMLSelectElement).value })}
                class="bg-bg-input border border-border rounded px-3 py-1 text-text w-full"
              >
                <option value="no">no</option>
                <option value="always">always</option>
                <option value="unless-stopped">unless-stopped</option>
                <option value="on-failure">on-failure</option>
              </select>
            </div>

            {/* Depends on */}
            <div>
              <label class="block text-text-muted mb-1">Depends On (comma-separated)</label>
              <input
                value={svc.dependsOn.join(', ')}
                onInput={(e) => updateService(si, { dependsOn: (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) })}
                class="bg-bg-input border border-border rounded px-3 py-1 text-text font-mono w-full"
                placeholder="db, cache"
              />
            </div>
          </div>

          {/* Ports */}
          <div class="mt-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-text-muted text-sm">Ports</span>
              <button onClick={() => addPort(si)} class="text-primary text-xs hover:underline">+ Add</button>
            </div>
            {svc.ports.map((p, pi) => (
              <div key={pi} class="flex gap-2 mb-1">
                <input value={p.host} onInput={(e) => {
                  const ports = [...svc.ports]; ports[pi] = { ...ports[pi], host: (e.target as HTMLInputElement).value }; updateService(si, { ports });
                }} class="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm font-mono text-text" placeholder="Host" />
                <span class="text-text-muted">:</span>
                <input value={p.container} onInput={(e) => {
                  const ports = [...svc.ports]; ports[pi] = { ...ports[pi], container: (e.target as HTMLInputElement).value }; updateService(si, { ports });
                }} class="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm font-mono text-text" placeholder="Container" />
                <button onClick={() => updateService(si, { ports: svc.ports.filter((_, i) => i !== pi) })} class="text-red-400 text-xs">x</button>
              </div>
            ))}
          </div>

          {/* Environment */}
          <div class="mt-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-text-muted text-sm">Environment</span>
              <button onClick={() => addEnv(si)} class="text-primary text-xs hover:underline">+ Add</button>
            </div>
            {svc.env.map((e, ei) => (
              <div key={ei} class="flex gap-2 mb-1">
                <input value={e.key} onInput={(ev) => {
                  const env = [...svc.env]; env[ei] = { ...env[ei], key: (ev.target as HTMLInputElement).value }; updateService(si, { env });
                }} class="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm font-mono text-text" placeholder="KEY" />
                <span class="text-text-muted">=</span>
                <input value={e.value} onInput={(ev) => {
                  const env = [...svc.env]; env[ei] = { ...env[ei], value: (ev.target as HTMLInputElement).value }; updateService(si, { env });
                }} class="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm font-mono text-text" placeholder="value" />
                <button onClick={() => updateService(si, { env: svc.env.filter((_, i) => i !== ei) })} class="text-red-400 text-xs">x</button>
              </div>
            ))}
          </div>

          {/* Volumes */}
          <div class="mt-3">
            <div class="flex justify-between items-center mb-1">
              <span class="text-text-muted text-sm">Volumes</span>
              <button onClick={() => addVolume(si)} class="text-primary text-xs hover:underline">+ Add</button>
            </div>
            {svc.volumes.map((v, vi) => (
              <div key={vi} class="flex gap-2 mb-1">
                <input value={v.host} onInput={(ev) => {
                  const volumes = [...svc.volumes]; volumes[vi] = { ...volumes[vi], host: (ev.target as HTMLInputElement).value }; updateService(si, { volumes });
                }} class="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm font-mono text-text" placeholder="Host/Named" />
                <span class="text-text-muted">:</span>
                <input value={v.container} onInput={(ev) => {
                  const volumes = [...svc.volumes]; volumes[vi] = { ...volumes[vi], container: (ev.target as HTMLInputElement).value }; updateService(si, { volumes });
                }} class="flex-1 bg-bg-input border border-border rounded px-2 py-1 text-sm font-mono text-text" placeholder="Container" />
                <button onClick={() => updateService(si, { volumes: svc.volumes.filter((_, i) => i !== vi) })} class="text-red-400 text-xs">x</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* YAML output */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-semibold">docker-compose.yml</h3>
          <button
            onClick={() => navigator.clipboard?.writeText(yaml)}
            class="bg-primary hover:bg-primary-dark text-white text-sm px-4 py-2 rounded-lg"
          >
            Copy YAML
          </button>
        </div>
        <pre class="text-sm font-mono text-secondary whitespace-pre-wrap">{yaml}</pre>
      </div>
    </div>
  );
}
