import { useState } from 'preact/hooks';

interface SshHost {
  id: string;
  host: string;
  hostname: string;
  user: string;
  port: string;
  identityFile: string;
  proxyJump: string;
  forwardAgent: boolean;
  serverAliveInterval: string;
  compression: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const TEMPLATES: { label: string; host: Partial<SshHost> }[] = [
  {
    label: 'AWS EC2',
    host: {
      host: 'my-ec2',
      hostname: 'ec2-xx-xx-xx-xx.compute-1.amazonaws.com',
      user: 'ec2-user',
      port: '22',
      identityFile: '~/.ssh/my-key.pem',
      forwardAgent: false,
    },
  },
  {
    label: 'GitHub',
    host: {
      host: 'github.com',
      hostname: 'github.com',
      user: 'git',
      port: '22',
      identityFile: '~/.ssh/id_ed25519',
      forwardAgent: false,
    },
  },
  {
    label: 'Jump host',
    host: {
      host: 'internal-server',
      hostname: '192.168.1.100',
      user: 'admin',
      port: '22',
      proxyJump: 'bastion-host',
      identityFile: '~/.ssh/id_rsa',
      forwardAgent: true,
    },
  },
  {
    label: 'Dev server',
    host: {
      host: 'dev',
      hostname: 'dev.mycompany.com',
      user: 'developer',
      port: '2222',
      identityFile: '~/.ssh/id_ed25519',
      serverAliveInterval: '60',
      compression: true,
    },
  },
];

function buildConfig(hosts: SshHost[]): string {
  return hosts
    .filter((h) => h.host.trim())
    .map((h) => {
      const lines: string[] = [`Host ${h.host.trim()}`];
      if (h.hostname) lines.push(`  HostName ${h.hostname}`);
      if (h.user) lines.push(`  User ${h.user}`);
      if (h.port && h.port !== '22') lines.push(`  Port ${h.port}`);
      if (h.identityFile) lines.push(`  IdentityFile ${h.identityFile}`);
      if (h.proxyJump) lines.push(`  ProxyJump ${h.proxyJump}`);
      if (h.forwardAgent) lines.push(`  ForwardAgent yes`);
      if (h.serverAliveInterval) lines.push(`  ServerAliveInterval ${h.serverAliveInterval}`);
      if (h.compression) lines.push(`  Compression yes`);
      return lines.join('\n');
    })
    .join('\n\n');
}

function emptyHost(): SshHost {
  return {
    id: makeId(),
    host: '',
    hostname: '',
    user: '',
    port: '22',
    identityFile: '~/.ssh/id_ed25519',
    proxyJump: '',
    forwardAgent: false,
    serverAliveInterval: '',
    compression: false,
  };
}

export default function SshConfigGenerator() {
  const [hosts, setHosts] = useState<SshHost[]>([
    {
      id: makeId(),
      host: 'my-server',
      hostname: 'server.example.com',
      user: 'ubuntu',
      port: '22',
      identityFile: '~/.ssh/id_ed25519',
      proxyJump: '',
      forwardAgent: false,
      serverAliveInterval: '60',
      compression: false,
    },
  ]);
  const [copied, setCopied] = useState(false);

  const output = buildConfig(hosts);

  function addHost() {
    setHosts((h) => [...h, emptyHost()]);
  }

  function removeHost(id: string) {
    setHosts((h) => h.filter((x) => x.id !== id));
  }

  function updateHost(id: string, field: keyof SshHost, value: string | boolean) {
    setHosts((h) => h.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  function applyTemplate(idx: number) {
    const t = TEMPLATES[idx];
    setHosts([{ ...emptyHost(), ...t.host, id: makeId() } as SshHost]);
  }

  function copy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div class="space-y-5">
      {/* Templates */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Start from template</label>
        <div class="flex flex-wrap gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.label}
              onClick={() => applyTemplate(i)}
              class="px-3 py-1.5 text-sm rounded-lg bg-bg-card border border-border hover:border-primary hover:text-primary text-text-muted transition-colors"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Host blocks */}
      <div class="space-y-4">
        {hosts.map((h, idx) => (
          <div key={h.id} class="border border-border rounded-xl p-4 space-y-3 bg-bg-card">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-text">Host {idx + 1}</span>
              {hosts.length > 1 && (
                <button
                  onClick={() => removeHost(h.id)}
                  class="text-xs text-red-400 hover:text-red-500 border border-red-400/30 px-2 py-0.5 rounded transition-colors"
                >
                  Remove
                </button>
              )}
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">Host alias <span class="text-primary">*</span></label>
                <input
                  type="text"
                  value={h.host}
                  onInput={(e) => updateHost(h.id, 'host', (e.target as HTMLInputElement).value)}
                  placeholder="my-server"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">HostName (IP or domain)</label>
                <input
                  type="text"
                  value={h.hostname}
                  onInput={(e) => updateHost(h.id, 'hostname', (e.target as HTMLInputElement).value)}
                  placeholder="server.example.com"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">User</label>
                <input
                  type="text"
                  value={h.user}
                  onInput={(e) => updateHost(h.id, 'user', (e.target as HTMLInputElement).value)}
                  placeholder="ubuntu"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Port</label>
                <input
                  type="number"
                  value={h.port}
                  onInput={(e) => updateHost(h.id, 'port', (e.target as HTMLInputElement).value)}
                  placeholder="22"
                  min="1"
                  max="65535"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">IdentityFile</label>
                <input
                  type="text"
                  value={h.identityFile}
                  onInput={(e) => updateHost(h.id, 'identityFile', (e.target as HTMLInputElement).value)}
                  placeholder="~/.ssh/id_ed25519"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">ProxyJump (bastion host alias)</label>
                <input
                  type="text"
                  value={h.proxyJump}
                  onInput={(e) => updateHost(h.id, 'proxyJump', (e.target as HTMLInputElement).value)}
                  placeholder="bastion"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">ServerAliveInterval (seconds)</label>
                <input
                  type="number"
                  value={h.serverAliveInterval}
                  onInput={(e) => updateHost(h.id, 'serverAliveInterval', (e.target as HTMLInputElement).value)}
                  placeholder="60"
                  min="0"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div class="flex items-end gap-4 pb-1">
                <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.forwardAgent}
                    onChange={(e) => updateHost(h.id, 'forwardAgent', (e.target as HTMLInputElement).checked)}
                    class="accent-primary"
                  />
                  ForwardAgent
                </label>
                <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={h.compression}
                    onChange={(e) => updateHost(h.id, 'compression', (e.target as HTMLInputElement).checked)}
                    class="accent-primary"
                  />
                  Compression
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addHost}
        class="w-full py-2 border border-dashed border-border rounded-xl text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
      >
        + Add host
      </button>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-semibold text-text">~/.ssh/config output</label>
          <button
            onClick={copy}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="w-full bg-bg-card border border-border rounded-xl p-4 font-mono text-sm text-text overflow-x-auto whitespace-pre-wrap">{output || '# Fill in a host alias above to generate config'}</pre>
      </div>

      <div class="text-xs text-text-muted space-y-1">
        <p>Save to <code class="font-mono">~/.ssh/config</code> — then connect with <code class="font-mono">ssh my-server</code> instead of the full command.</p>
        <p>Set correct permissions: <code class="font-mono">chmod 600 ~/.ssh/config</code></p>
      </div>
    </div>
  );
}
