import { useState } from 'preact/hooks';

function makeId() {
  return Math.random().toString(36).slice(2);
}

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

interface McpServer {
  id: string;
  name: string;
  command: string;
  args: string;
  envVars: EnvVar[];
}

type ConfigTab = 'claude' | 'cursor';

function defaultServers(): McpServer[] {
  return [
    {
      id: makeId(),
      name: 'filesystem',
      command: 'npx',
      args: '-y, @modelcontextprotocol/server-filesystem, /Users/yourname/Documents',
      envVars: [],
    },
    {
      id: makeId(),
      name: 'fetch',
      command: 'npx',
      args: '-y, @modelcontextprotocol/server-fetch',
      envVars: [],
    },
    {
      id: makeId(),
      name: 'github',
      command: 'npx',
      args: '-y, @modelcontextprotocol/server-github',
      envVars: [
        { id: makeId(), key: 'GITHUB_PERSONAL_ACCESS_TOKEN', value: 'your_token_here' },
      ],
    },
  ];
}

function parseArgs(raw: string): string[] {
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildClaudeConfig(servers: McpServer[]): object {
  const mcpServers: Record<string, object> = {};
  for (const s of servers) {
    const name = s.name.trim() || 'server';
    const entry: Record<string, unknown> = {
      command: s.command,
      args: parseArgs(s.args),
    };
    if (s.envVars.length > 0) {
      const env: Record<string, string> = {};
      for (const ev of s.envVars) {
        if (ev.key.trim()) env[ev.key.trim()] = ev.value;
      }
      entry.env = env;
    }
    mcpServers[name] = entry;
  }
  return { mcpServers };
}

function buildCursorConfig(servers: McpServer[]): object {
  const mcpServers: Record<string, object> = {};
  for (const s of servers) {
    const name = s.name.trim() || 'server';
    const entry: Record<string, unknown> = {
      command: s.command,
      args: parseArgs(s.args),
    };
    if (s.envVars.length > 0) {
      const env: Record<string, string> = {};
      for (const ev of s.envVars) {
        if (ev.key.trim()) env[ev.key.trim()] = ev.value;
      }
      entry.env = env;
    }
    mcpServers[name] = entry;
  }
  return { mcpServers };
}

const COMMANDS = ['npx', 'node', 'uvx', 'python', 'python3', 'deno'];

export default function McpConfigGenerator() {
  const [servers, setServers] = useState<McpServer[]>(defaultServers);
  const [activeTab, setActiveTab] = useState<ConfigTab>('claude');
  const [copied, setCopied] = useState(false);

  function addServer() {
    setServers(prev => [...prev, {
      id: makeId(),
      name: '',
      command: 'npx',
      args: '',
      envVars: [],
    }]);
  }

  function removeServer(id: string) {
    setServers(prev => prev.filter(s => s.id !== id));
  }

  function updateServer(id: string, field: keyof McpServer, value: any) {
    setServers(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function addEnvVar(serverId: string) {
    setServers(prev => prev.map(s =>
      s.id === serverId
        ? { ...s, envVars: [...s.envVars, { id: makeId(), key: '', value: '' }] }
        : s
    ));
  }

  function removeEnvVar(serverId: string, envId: string) {
    setServers(prev => prev.map(s =>
      s.id === serverId
        ? { ...s, envVars: s.envVars.filter(e => e.id !== envId) }
        : s
    ));
  }

  function updateEnvVar(serverId: string, envId: string, field: 'key' | 'value', value: string) {
    setServers(prev => prev.map(s =>
      s.id === serverId
        ? {
            ...s,
            envVars: s.envVars.map(e => e.id === envId ? { ...e, [field]: value } : e),
          }
        : s
    ));
  }

  const config = activeTab === 'claude'
    ? buildClaudeConfig(servers)
    : buildCursorConfig(servers);

  const output = JSON.stringify(config, null, 2);

  const filePath = activeTab === 'claude'
    ? '~/Library/Application Support/Claude/claude_desktop_config.json'
    : '.cursor/mcp.json';

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-4">
      {/* Format tabs */}
      <div class="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab('claude')}
          class={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            activeTab === 'claude'
              ? 'bg-accent/20 border-accent/50 text-accent'
              : 'border-border text-text-muted hover:bg-surface'
          }`}
        >
          Claude Desktop
        </button>
        <button
          onClick={() => setActiveTab('cursor')}
          class={`px-4 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
            activeTab === 'cursor'
              ? 'bg-accent/20 border-accent/50 text-accent'
              : 'border-border text-text-muted hover:bg-surface'
          }`}
        >
          Cursor / Cline
        </button>
        <span class="ml-auto text-xs text-text-muted font-mono bg-surface border border-border px-2 py-1 rounded">
          {filePath}
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Server entries */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">MCP Servers ({servers.length})</div>
            <button
              onClick={addServer}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              + Add Server
            </button>
          </div>

          <div class="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {servers.map((s, i) => (
              <div key={s.id} class="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs text-text-muted font-mono">server #{i + 1}</span>
                  <button
                    onClick={() => removeServer(s.id)}
                    class="text-text-muted hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Server name *</label>
                    <input
                      type="text"
                      class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={s.name}
                      onInput={(e) => updateServer(s.id, 'name', (e.target as HTMLInputElement).value.replace(/\s+/g, '-').toLowerCase())}
                      placeholder="filesystem"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Command</label>
                    <select
                      class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={s.command}
                      onChange={(e) => updateServer(s.id, 'command', (e.target as HTMLSelectElement).value)}
                    >
                      {COMMANDS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-xs text-text-muted mb-0.5">
                    Args <span class="text-text-muted/60">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={s.args}
                    onInput={(e) => updateServer(s.id, 'args', (e.target as HTMLInputElement).value)}
                    placeholder="-y, @modelcontextprotocol/server-filesystem, /path/to/dir"
                  />
                </div>

                {/* Env vars */}
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-xs text-text-muted">Environment Variables</label>
                    <button
                      onClick={() => addEnvVar(s.id)}
                      class="text-xs text-accent hover:text-accent/80 transition-colors"
                    >
                      + Add var
                    </button>
                  </div>
                  {s.envVars.map(ev => (
                    <div key={ev.id} class="flex gap-1.5 items-center">
                      <input
                        type="text"
                        class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        value={ev.key}
                        onInput={(e) => updateEnvVar(s.id, ev.id, 'key', (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                        placeholder="ENV_VAR_NAME"
                      />
                      <span class="text-text-muted text-xs">=</span>
                      <input
                        type="text"
                        class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        value={ev.value}
                        onInput={(e) => updateEnvVar(s.id, ev.id, 'value', (e.target as HTMLInputElement).value)}
                        placeholder="value"
                      />
                      <button
                        onClick={() => removeEnvVar(s.id, ev.id)}
                        class="text-text-muted hover:text-red-400 text-xs transition-colors flex-shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {s.envVars.length === 0 && (
                    <p class="text-xs text-text-muted/50 italic">No env vars — click "+ Add var" to add one</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: JSON preview */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">Generated Config</span>
            <button
              onClick={copyOutput}
              class="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <pre class="w-full h-[560px] overflow-auto font-mono text-sm bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>

          <div class="text-xs text-text-muted bg-surface border border-border rounded-lg p-3 space-y-1">
            {activeTab === 'claude' ? (
              <>
                <p class="font-medium">Claude Desktop — where to paste:</p>
                <p class="font-mono">macOS: ~/Library/Application Support/Claude/claude_desktop_config.json</p>
                <p class="font-mono">Windows: %APPDATA%\Claude\claude_desktop_config.json</p>
              </>
            ) : (
              <>
                <p class="font-medium">Cursor / Cline — where to paste:</p>
                <p class="font-mono">Project-level: &lt;project&gt;/.cursor/mcp.json</p>
                <p class="font-mono">Global (Cursor): ~/.cursor/mcp.json</p>
                <p class="font-mono">Cline: VS Code MCP settings (mcpServers key)</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
