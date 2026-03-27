import { useState, useCallback } from 'preact/hooks';

interface NatsConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  tls: boolean;
  token: string;
  clusterMode: boolean;
  clusterServers: string;
  connectTimeout: number;
  reconnect: boolean;
  maxReconnectAttempts: number;
  name: string;
}

const defaultConfig: NatsConfig = {
  host: 'localhost',
  port: 4222,
  username: '',
  password: '',
  tls: false,
  token: '',
  clusterMode: false,
  clusterServers: '',
  connectTimeout: 2000,
  reconnect: true,
  maxReconnectAttempts: 10,
  name: '',
};

function maskPassword(password: string): string {
  if (!password) return '';
  if (password.length <= 3) return password;
  return password[0] + '***';
}

function buildNatsUrl(config: NatsConfig): string {
  const scheme = config.tls ? 'tls' : 'nats';
  const host = config.host || 'localhost';
  const port = config.port || 4222;

  let auth = '';
  if (config.token) {
    auth = `${config.token}@`;
  } else if (config.username) {
    const maskedPass = config.password ? `:${maskPassword(config.password)}` : '';
    auth = `${config.username}${maskedPass}@`;
  }

  return `${scheme}://${auth}${host}:${port}`;
}

function buildAllServers(config: NatsConfig): string[] {
  const scheme = config.tls ? 'tls' : 'nats';
  const primary = `${scheme}://${config.host || 'localhost'}:${config.port || 4222}`;
  if (!config.clusterMode) return [primary];

  const extras = config.clusterServers
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.startsWith('nats://') || s.startsWith('tls://') ? s : `${scheme}://${s}`));

  return [primary, ...extras];
}

function buildGoSnippet(config: NatsConfig): string {
  const servers = buildAllServers(config);
  const opts: string[] = [];

  if (config.username && !config.token) {
    opts.push(`\t\tnats.UserInfo("${config.username}", "${config.password || ''}"),`);
  }
  if (config.token) {
    opts.push(`\t\tnats.Token("${config.token}"),`);
  }
  if (config.tls) {
    opts.push(`\t\tnats.Secure(),`);
  }
  if (config.name) {
    opts.push(`\t\tnats.Name("${config.name}"),`);
  }
  opts.push(`\t\tnats.Timeout(${config.connectTimeout} * time.Millisecond),`);
  if (!config.reconnect) {
    opts.push(`\t\tnats.NoReconnect(),`);
  } else {
    opts.push(`\t\tnats.MaxReconnects(${config.maxReconnectAttempts}),`);
  }
  if (config.clusterMode && servers.length > 1) {
    const serverList = servers.map((s) => `"${s}"`).join(', ');
    opts.push(`\t\tnats.Servers([]string{${serverList}}),`);
  }

  const primaryUrl = servers[0];
  const optsStr = opts.length > 0 ? `\n${opts.join('\n')}\n\t` : '';

  return `package main

import (
\t"log"
\t"time"

\t"github.com/nats-io/nats.go"
)

func main() {
\tnc, err := nats.Connect("${primaryUrl}",${optsStr})
\tif err != nil {
\t\tlog.Fatal(err)
\t}
\tdefer nc.Drain()

\t// Ready to use nc
}`;
}

function buildNodeSnippet(config: NatsConfig): string {
  const servers = buildAllServers(config);
  const opts: string[] = [];

  if (config.name) {
    opts.push(`  name: '${config.name}',`);
  }
  if (config.username && !config.token) {
    opts.push(`  user: '${config.username}',`);
    opts.push(`  pass: '${config.password || ''}',`);
  }
  if (config.token) {
    opts.push(`  token: '${config.token}',`);
  }
  if (config.tls) {
    opts.push(`  tls: true,`);
  }
  opts.push(`  timeout: ${config.connectTimeout},`);
  if (!config.reconnect) {
    opts.push(`  reconnect: false,`);
  } else {
    opts.push(`  maxReconnectAttempts: ${config.maxReconnectAttempts},`);
  }

  const serverList =
    servers.length === 1
      ? `'${servers[0]}'`
      : `[\n${servers.map((s) => `    '${s}'`).join(',\n')}\n  ]`;

  opts.unshift(`  servers: ${serverList},`);

  return `import { connect } from 'nats';

const nc = await connect({
${opts.join('\n')}
});

console.log('Connected to NATS');

// Publish a message
nc.publish('subject', 'hello');

// Subscribe
const sub = nc.subscribe('subject');
for await (const msg of sub) {
  console.log(msg.string());
}

await nc.drain();`;
}

function buildPythonSnippet(config: NatsConfig): string {
  const servers = buildAllServers(config);
  const opts: string[] = [];

  if (config.name) {
    opts.push(`    name="${config.name}",`);
  }
  if (config.username && !config.token) {
    opts.push(`    user="${config.username}",`);
    opts.push(`    password="${config.password || ''}",`);
  }
  if (config.token) {
    opts.push(`    token="${config.token}",`);
  }
  if (config.tls) {
    opts.push(`    tls=True,`);
  }
  opts.push(`    connect_timeout=${config.connectTimeout / 1000},`);
  if (!config.reconnect) {
    opts.push(`    allow_reconnect=False,`);
  } else {
    opts.push(`    max_reconnect_attempts=${config.maxReconnectAttempts},`);
  }

  const serverList =
    servers.length === 1
      ? `"${servers[0]}"`
      : `[\n${servers.map((s) => `        "${s}"`).join(',\n')}\n    ]`;

  opts.unshift(`    servers=${serverList},`);

  return `import asyncio
import nats

async def main():
    nc = await nats.connect(
${opts.join('\n')}
    )

    print("Connected to NATS")

    # Publish
    await nc.publish("subject", b"hello")

    # Subscribe
    async def message_handler(msg):
        print(f"Received: {msg.data.decode()}")

    sub = await nc.subscribe("subject", cb=message_handler)
    await asyncio.sleep(1)
    await sub.unsubscribe()
    await nc.drain()

if __name__ == "__main__":
    asyncio.run(main())`;
}

interface CopyButtonProps {
  text: string;
}

function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

interface OutputBlockProps {
  label: string;
  value: string;
}

function OutputBlock({ label, value }: OutputBlockProps) {
  return (
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-text-muted uppercase tracking-wide">{label}</span>
        <CopyButton text={value} />
      </div>
      <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}

export default function NatsConnectionStringBuilder() {
  const [config, setConfig] = useState<NatsConfig>(defaultConfig);

  const update = useCallback(<K extends keyof NatsConfig>(key: K, value: NatsConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const natsUrl = buildNatsUrl(config);
  const goSnippet = buildGoSnippet(config);
  const nodeSnippet = buildNodeSnippet(config);
  const pythonSnippet = buildPythonSnippet(config);

  const inputClass =
    'w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary';
  const labelClass = 'block text-xs font-medium text-text-muted mb-1';
  const checkboxClass = 'w-4 h-4 rounded border-border accent-primary';

  return (
    <div class="bg-background border border-border rounded-xl p-6 space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div class="space-y-4">
          <h2 class="text-sm font-semibold text-text uppercase tracking-wide">Connection Settings</h2>

          {/* Host + Port */}
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <label class={labelClass}>Host</label>
              <input
                type="text"
                class={inputClass}
                value={config.host}
                placeholder="localhost"
                onInput={(e) => update('host', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class={labelClass}>Port</label>
              <input
                type="number"
                class={inputClass}
                value={config.port}
                min={1}
                max={65535}
                onInput={(e) => update('port', Number((e.target as HTMLInputElement).value))}
              />
            </div>
          </div>

          {/* Username + Password */}
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelClass}>Username (optional)</label>
              <input
                type="text"
                class={inputClass}
                value={config.username}
                placeholder="user"
                onInput={(e) => update('username', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class={labelClass}>Password (optional)</label>
              <input
                type="password"
                class={inputClass}
                value={config.password}
                placeholder="••••••••"
                onInput={(e) => update('password', (e.target as HTMLInputElement).value)}
              />
            </div>
          </div>

          {/* Token auth */}
          <div>
            <label class={labelClass}>Token Auth (optional)</label>
            <input
              type="text"
              class={inputClass}
              value={config.token}
              placeholder="auth-token"
              onInput={(e) => update('token', (e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Client Name */}
          <div>
            <label class={labelClass}>Client Name (optional)</label>
            <input
              type="text"
              class={inputClass}
              value={config.name}
              placeholder="my-service"
              onInput={(e) => update('name', (e.target as HTMLInputElement).value)}
            />
          </div>

          {/* TLS */}
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="tls"
              class={checkboxClass}
              checked={config.tls}
              onChange={(e) => update('tls', (e.target as HTMLInputElement).checked)}
            />
            <label for="tls" class="text-sm text-text cursor-pointer">
              TLS Enabled (use <span class="font-mono text-green-400">tls://</span> scheme)
            </label>
          </div>

          {/* Connect Timeout */}
          <div>
            <label class={labelClass}>Connect Timeout (ms)</label>
            <input
              type="number"
              class={inputClass}
              value={config.connectTimeout}
              min={100}
              step={100}
              onInput={(e) =>
                update('connectTimeout', Number((e.target as HTMLInputElement).value))
              }
            />
          </div>

          {/* Reconnect */}
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="reconnect"
                class={checkboxClass}
                checked={config.reconnect}
                onChange={(e) => update('reconnect', (e.target as HTMLInputElement).checked)}
              />
              <label for="reconnect" class="text-sm text-text cursor-pointer">
                Auto Reconnect
              </label>
            </div>
            {config.reconnect && (
              <div>
                <label class={labelClass}>Max Reconnect Attempts</label>
                <input
                  type="number"
                  class={inputClass}
                  value={config.maxReconnectAttempts}
                  min={-1}
                  onInput={(e) =>
                    update('maxReconnectAttempts', Number((e.target as HTMLInputElement).value))
                  }
                />
              </div>
            )}
          </div>

          {/* Cluster Mode */}
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                id="clusterMode"
                class={checkboxClass}
                checked={config.clusterMode}
                onChange={(e) => update('clusterMode', (e.target as HTMLInputElement).checked)}
              />
              <label for="clusterMode" class="text-sm text-text cursor-pointer">
                Cluster Mode
              </label>
            </div>
            {config.clusterMode && (
              <div>
                <label class={labelClass}>
                  Additional Cluster Servers{' '}
                  <span class="text-text-muted font-normal">(one per line, e.g. host:4222)</span>
                </label>
                <textarea
                  class={`${inputClass} resize-y min-h-[80px]`}
                  value={config.clusterServers}
                  placeholder={'nats-2:4222\nnats-3:4222'}
                  onInput={(e) =>
                    update('clusterServers', (e.target as HTMLTextAreaElement).value)
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Right: Outputs */}
        <div class="space-y-5">
          <h2 class="text-sm font-semibold text-text uppercase tracking-wide">Generated Output</h2>

          <OutputBlock label="NATS URL" value={natsUrl} />
          <OutputBlock label="Go — nats.go" value={goSnippet} />
          <OutputBlock label="Node.js — nats.js" value={nodeSnippet} />
          <OutputBlock label="Python — nats.py" value={pythonSnippet} />
        </div>
      </div>
    </div>
  );
}
