import { useState } from 'preact/hooks';

type TransportType = 'stdio' | 'sse';
type CommandPreset = 'npx' | 'node' | 'python' | 'uvx' | 'custom';
type ClientType = 'claude-desktop' | 'cursor' | 'continue' | 'windsurf';

interface EnvVar {
  id: string;
  key: string;
  value: string;
}

interface Arg {
  id: string;
  value: string;
}

interface McpServer {
  id: string;
  name: string;
  transport: TransportType;
  enabled: boolean;
  // stdio fields
  commandPreset: CommandPreset;
  customCommand: string;
  args: Arg[];
  env: EnvVar[];
  // sse fields
  url: string;
}

const CLIENT_INFO: Record<ClientType, { label: string; configPath: string; fileKey: string }> = {
  'claude-desktop': {
    label: 'Claude Desktop',
    configPath: {
      win: '%APPDATA%\\Claude\\claude_desktop_config.json',
      mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
      linux: '~/.config/Claude/claude_desktop_config.json',
    }['win'],
    fileKey: 'claude_desktop_config.json',
  },
  cursor: {
    label: 'Cursor',
    configPath: '~/.cursor/mcp.json',
    fileKey: 'mcp.json',
  },
  continue: {
    label: 'Continue',
    configPath: '~/.continue/config.json (mcpServers key)',
    fileKey: 'config.json',
  },
  windsurf: {
    label: 'Windsurf',
    configPath: '~/.codeium/windsurf/mcp_config.json',
    fileKey: 'mcp_config.json',
  },
};

const CLIENT_PATHS_ALL: Record<ClientType, Record<string, string>> = {
  'claude-desktop': {
    Windows: '%APPDATA%\\Claude\\claude_desktop_config.json',
    macOS: '~/Library/Application Support/Claude/claude_desktop_config.json',
    Linux: '~/.config/Claude/claude_desktop_config.json',
  },
  cursor: {
    'All Platforms': '~/.cursor/mcp.json',
  },
  continue: {
    'All Platforms': '~/.continue/config.json',
  },
  windsurf: {
    'All Platforms': '~/.codeium/windsurf/mcp_config.json',
  },
};

const COMMAND_PRESETS: Record<CommandPreset, string> = {
  npx: 'npx',
  node: 'node',
  python: 'python',
  uvx: 'uvx',
  custom: '',
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function defaultServer(): McpServer {
  return {
    id: uid(),
    name: 'filesystem',
    transport: 'stdio',
    enabled: true,
    commandPreset: 'npx',
    customCommand: '',
    args: [
      { id: uid(), value: '-y' },
      { id: uid(), value: '@modelcontextprotocol/server-filesystem' },
      { id: uid(), value: '/home/user/files' },
    ],
    env: [],
    url: 'http://localhost:3000/sse',
  };
}

function buildServerJson(server: McpServer): object | null {
  if (!server.name.trim()) return null;
  if (server.transport === 'stdio') {
    const cmd = server.commandPreset === 'custom' ? server.customCommand : COMMAND_PRESETS[server.commandPreset];
    const obj: Record<string, unknown> = { command: cmd || 'npx' };
    const filteredArgs = server.args.map(a => a.value).filter(Boolean);
    if (filteredArgs.length > 0) obj.args = filteredArgs;
    const envObj: Record<string, string> = {};
    server.env.forEach(e => { if (e.key.trim()) envObj[e.key.trim()] = e.value; });
    if (Object.keys(envObj).length > 0) obj.env = envObj;
    return obj;
  } else {
    return { url: server.url || 'http://localhost:3000/sse' };
  }
}

function generateConfig(servers: McpServer[]): string {
  const mcpServers: Record<string, unknown> = {};
  servers.filter(s => s.enabled && s.name.trim()).forEach(server => {
    const obj = buildServerJson(server);
    if (obj) mcpServers[server.name.trim()] = obj;
  });
  return JSON.stringify({ mcpServers }, null, 2);
}

export default function McpServerConfigGenerator() {
  const [client, setClient] = useState<ClientType>('claude-desktop');
  const [servers, setServers] = useState<McpServer[]>([defaultServer()]);
  const [activeTab, setActiveTab] = useState<'config' | 'path'>('config');
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string>(servers[0].id);

  const configJson = generateConfig(servers);

  const copy = () => {
    navigator.clipboard.writeText(activeTab === 'config' ? configJson : '').then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const addServer = () => {
    const s = defaultServer();
    s.name = '';
    s.args = [];
    setServers(prev => [...prev, s]);
    setExpandedId(s.id);
  };

  const removeServer = (id: string) => {
    setServers(prev => prev.filter(s => s.id !== id));
  };

  const updateServer = (id: string, patch: Partial<McpServer>) => {
    setServers(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const addArg = (serverId: string) => {
    setServers(prev => prev.map(s =>
      s.id === serverId ? { ...s, args: [...s.args, { id: uid(), value: '' }] } : s
    ));
  };

  const updateArg = (serverId: string, argId: string, value: string) => {
    setServers(prev => prev.map(s =>
      s.id === serverId
        ? { ...s, args: s.args.map(a => a.id === argId ? { ...a, value } : a) }
        : s
    ));
  };

  const removeArg = (serverId: string, argId: string) => {
    setServers(prev => prev.map(s =>
      s.id === serverId ? { ...s, args: s.args.filter(a => a.id !== argId) } : s
    ));
  };

  const addEnvVar = (serverId: string) => {
    setServers(prev => prev.map(s =>
      s.id === serverId ? { ...s, env: [...s.env, { id: uid(), key: '', value: '' }] } : s
    ));
  };

  const updateEnvVar = (serverId: string, envId: string, field: 'key' | 'value', val: string) => {
    setServers(prev => prev.map(s =>
      s.id === serverId
        ? { ...s, env: s.env.map(e => e.id === envId ? { ...e, [field]: val } : e) }
        : s
    ));
  };

  const removeEnvVar = (serverId: string, envId: string) => {
    setServers(prev => prev.map(s =>
      s.id === serverId ? { ...s, env: s.env.filter(e => e.id !== envId) } : s
    ));
  };

  const clientPaths = CLIENT_PATHS_ALL[client];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Config Form */}
      <div class="space-y-5">
        {/* Client selector */}
        <div>
          <label class="block text-sm font-medium text-text mb-2">Target Client</label>
          <div class="grid grid-cols-2 gap-2">
            {(Object.keys(CLIENT_INFO) as ClientType[]).map(c => (
              <button
                key={c}
                onClick={() => setClient(c)}
                class={`px-3 py-2 rounded-lg text-sm border transition-colors text-left ${client === c
                  ? 'border-accent bg-accent/10 text-accent font-medium'
                  : 'border-border text-text-muted hover:bg-surface'}`}
              >
                {CLIENT_INFO[c].label}
              </button>
            ))}
          </div>
        </div>

        {/* Server entries */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text">MCP Servers</label>
            <button
              onClick={addServer}
              class="text-xs px-2 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors"
            >
              + Add Server
            </button>
          </div>

          <div class="space-y-3">
            {servers.map(server => (
              <div key={server.id} class="bg-surface border border-border rounded-lg overflow-hidden">
                {/* Server header */}
                <div
                  class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface-alt transition-colors"
                  onClick={() => setExpandedId(expandedId === server.id ? '' : server.id)}
                >
                  <input
                    type="checkbox"
                    checked={server.enabled}
                    onClick={e => e.stopPropagation()}
                    onChange={e => updateServer(server.id, { enabled: (e.target as HTMLInputElement).checked })}
                    class="accent-accent"
                  />
                  <span class="font-mono text-sm text-text flex-1 truncate">
                    {server.name || <span class="text-text-muted italic">unnamed</span>}
                  </span>
                  <span class="text-xs px-1.5 py-0.5 rounded bg-surface-alt border border-border text-text-muted">
                    {server.transport}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); removeServer(server.id); }}
                    class="text-text-muted hover:text-red-400 transition-colors text-xs px-1"
                    title="Remove"
                  >
                    ✕
                  </button>
                  <span class="text-text-muted text-xs">{expandedId === server.id ? '▲' : '▼'}</span>
                </div>

                {/* Server details */}
                {expandedId === server.id && (
                  <div class="px-3 pb-3 space-y-3 border-t border-border">
                    {/* Server name */}
                    <div class="pt-3">
                      <label class="block text-xs text-text-muted mb-1">Server Name (key)</label>
                      <input
                        type="text"
                        value={server.name}
                        onInput={e => updateServer(server.id, { name: (e.target as HTMLInputElement).value })}
                        placeholder="e.g. filesystem"
                        class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    {/* Transport */}
                    <div>
                      <label class="block text-xs text-text-muted mb-1">Transport Type</label>
                      <div class="flex gap-2">
                        {(['stdio', 'sse'] as TransportType[]).map(t => (
                          <button
                            key={t}
                            onClick={() => updateServer(server.id, { transport: t })}
                            class={`px-3 py-1 rounded text-xs border transition-colors ${server.transport === t
                              ? 'border-accent bg-accent/10 text-accent'
                              : 'border-border text-text-muted hover:bg-surface-alt'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {server.transport === 'stdio' ? (
                      <>
                        {/* Command */}
                        <div>
                          <label class="block text-xs text-text-muted mb-1">Command</label>
                          <div class="flex gap-2">
                            <select
                              value={server.commandPreset}
                              onChange={e => updateServer(server.id, { commandPreset: (e.target as HTMLSelectElement).value as CommandPreset })}
                              class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                              {(Object.keys(COMMAND_PRESETS) as CommandPreset[]).map(p => (
                                <option key={p} value={p}>{p === 'custom' ? 'custom...' : p}</option>
                              ))}
                            </select>
                            {server.commandPreset === 'custom' && (
                              <input
                                type="text"
                                value={server.customCommand}
                                onInput={e => updateServer(server.id, { customCommand: (e.target as HTMLInputElement).value })}
                                placeholder="e.g. /usr/local/bin/my-server"
                                class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                            )}
                          </div>
                        </div>

                        {/* Args */}
                        <div>
                          <div class="flex items-center justify-between mb-1">
                            <label class="text-xs text-text-muted">Arguments</label>
                            <button
                              onClick={() => addArg(server.id)}
                              class="text-xs text-accent hover:underline"
                            >+ arg</button>
                          </div>
                          <div class="space-y-1">
                            {server.args.map((arg, idx) => (
                              <div key={arg.id} class="flex gap-1 items-center">
                                <span class="text-xs text-text-muted w-5 text-right">{idx}</span>
                                <input
                                  type="text"
                                  value={arg.value}
                                  onInput={e => updateArg(server.id, arg.id, (e.target as HTMLInputElement).value)}
                                  placeholder={`arg[${idx}]`}
                                  class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                                <button
                                  onClick={() => removeArg(server.id, arg.id)}
                                  class="text-text-muted hover:text-red-400 text-xs px-1"
                                >✕</button>
                              </div>
                            ))}
                            {server.args.length === 0 && (
                              <p class="text-xs text-text-muted italic">No args — click "+ arg" to add</p>
                            )}
                          </div>
                        </div>

                        {/* Env vars */}
                        <div>
                          <div class="flex items-center justify-between mb-1">
                            <label class="text-xs text-text-muted">Environment Variables</label>
                            <button
                              onClick={() => addEnvVar(server.id)}
                              class="text-xs text-accent hover:underline"
                            >+ env var</button>
                          </div>
                          <div class="space-y-1">
                            {server.env.map(e => (
                              <div key={e.id} class="flex gap-1 items-center">
                                <input
                                  type="text"
                                  value={e.key}
                                  onInput={ev => updateEnvVar(server.id, e.id, 'key', (ev.target as HTMLInputElement).value)}
                                  placeholder="KEY"
                                  class="w-28 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                                <span class="text-text-muted text-xs">=</span>
                                <input
                                  type="text"
                                  value={e.value}
                                  onInput={ev => updateEnvVar(server.id, e.id, 'value', (ev.target as HTMLInputElement).value)}
                                  placeholder="value"
                                  class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                                <button
                                  onClick={() => removeEnvVar(server.id, e.id)}
                                  class="text-text-muted hover:text-red-400 text-xs px-1"
                                >✕</button>
                              </div>
                            ))}
                            {server.env.length === 0 && (
                              <p class="text-xs text-text-muted italic">No env vars set</p>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* SSE URL */
                      <div>
                        <label class="block text-xs text-text-muted mb-1">Server URL</label>
                        <input
                          type="text"
                          value={server.url}
                          onInput={e => updateServer(server.id, { url: (e.target as HTMLInputElement).value })}
                          placeholder="http://localhost:3000/sse"
                          class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {servers.length === 0 && (
              <div class="text-center py-6 text-text-muted text-sm border border-dashed border-border rounded-lg">
                No servers yet. Click "+ Add Server" to begin.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Output */}
      <div class="space-y-3">
        {/* Output tabs */}
        <div class="flex gap-2">
          {(['config', 'path'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`px-3 py-1.5 rounded text-sm border transition-colors ${activeTab === tab
                ? 'border-accent bg-accent/10 text-accent font-medium'
                : 'border-border text-text-muted hover:bg-surface'}`}
            >
              {tab === 'config' ? 'JSON Config' : 'File Path'}
            </button>
          ))}
          <button
            onClick={copy}
            class="ml-auto px-3 py-1.5 rounded text-sm bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {activeTab === 'config' ? (
          <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre">
            {configJson}
          </pre>
        ) : (
          <div class="bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto space-y-5">
            <div>
              <p class="text-sm font-medium text-text mb-3">
                Save this config as <code class="font-mono text-accent">{CLIENT_INFO[client].fileKey}</code> at:
              </p>
              {Object.entries(clientPaths).map(([platform, path]) => (
                <div key={platform} class="mb-3">
                  <p class="text-xs text-text-muted mb-1">{platform}</p>
                  <code class="block font-mono text-xs bg-surface-alt border border-border rounded px-3 py-2 text-text break-all">
                    {path}
                  </code>
                </div>
              ))}
            </div>

            {client === 'claude-desktop' && (
              <div class="rounded-lg bg-accent/5 border border-accent/20 p-3">
                <p class="text-xs font-semibold text-accent mb-1">Claude Desktop Setup</p>
                <ol class="text-xs text-text-muted space-y-1 list-decimal list-inside">
                  <li>Open Claude Desktop → Settings → Developer</li>
                  <li>Click "Edit Config" to open the config file</li>
                  <li>Paste your JSON config and save</li>
                  <li>Restart Claude Desktop</li>
                  <li>Your MCP servers appear in the tool selector</li>
                </ol>
              </div>
            )}

            {client === 'cursor' && (
              <div class="rounded-lg bg-accent/5 border border-accent/20 p-3">
                <p class="text-xs font-semibold text-accent mb-1">Cursor Setup</p>
                <ol class="text-xs text-text-muted space-y-1 list-decimal list-inside">
                  <li>Open Cursor Settings → Features → MCP</li>
                  <li>Click "Add MCP Server" or edit <code class="font-mono">~/.cursor/mcp.json</code></li>
                  <li>Paste config and restart Cursor</li>
                </ol>
              </div>
            )}

            <div>
              <p class="text-xs text-text-muted font-medium mb-2">Quick test after setup:</p>
              <pre class="font-mono text-xs bg-surface-alt border border-border rounded px-3 py-2 text-text overflow-auto">{`# Check server runs (stdio example)
npx -y @modelcontextprotocol/server-filesystem /tmp

# Or use MCP Inspector
npx @modelcontextprotocol/inspector`}</pre>
            </div>
          </div>
        )}

        {/* Active server count */}
        <p class="text-xs text-text-muted">
          {servers.filter(s => s.enabled && s.name.trim()).length} active server(s) ·{' '}
          {servers.filter(s => !s.enabled).length} disabled ·{' '}
          Target: <span class="text-accent">{CLIENT_INFO[client].label}</span>
        </p>
      </div>
    </div>
  );
}
