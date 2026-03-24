import { useState } from 'preact/hooks';

interface ParsedUrl {
  protocol: string; username: string; password: string;
  hostname: string; port: string; pathname: string;
  search: string; hash: string;
  params: Array<[string, string]>;
  href: string;
}

function parseUrl(raw: string): ParsedUrl | null {
  try {
    const u = new URL(raw.trim());
    const params: Array<[string, string]> = [];
    u.searchParams.forEach((v, k) => params.push([k, v]));
    return { protocol: u.protocol, username: u.username, password: u.password, hostname: u.hostname, port: u.port, pathname: u.pathname, search: u.search, hash: u.hash, params, href: u.href };
  } catch { return null; }
}

function buildUrl(parts: { protocol: string; hostname: string; port: string; pathname: string; params: Array<[string, string]>; hash: string }): string {
  try {
    const u = new URL(`${parts.protocol}//${parts.hostname}${parts.port ? ':' + parts.port : ''}${parts.pathname || '/'}`);
    parts.params.forEach(([k, v]) => { if (k) u.searchParams.set(k, v); });
    if (parts.hash) u.hash = parts.hash.startsWith('#') ? parts.hash.slice(1) : parts.hash;
    return u.href;
  } catch { return ''; }
}

export default function UrlParser() {
  const [input, setInput] = useState('https://api.example.com/v1/users?page=1&limit=20&sort=name#results');
  const [tab, setTab] = useState<'parse' | 'build'>('parse');
  const [copied, setCopied] = useState<string | null>(null);
  // Builder state
  const [bProtocol, setBProtocol] = useState('https:');
  const [bHost, setBHost] = useState('example.com');
  const [bPort, setBPort] = useState('');
  const [bPath, setBPath] = useState('/');
  const [bParams, setBParams] = useState<Array<[string, string]>>([['', '']]);
  const [bHash, setBHash] = useState('');

  const parsed = input.trim() ? parseUrl(input) : null;

  const copy = (text: string, key: string) => navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });

  const builtUrl = buildUrl({ protocol: bProtocol, hostname: bHost, port: bPort, pathname: bPath, params: bParams, hash: bHash });

  const FIELDS: Array<[keyof ParsedUrl, string]> = [
    ['protocol', 'Protocol'], ['username', 'Username'], ['password', 'Password'],
    ['hostname', 'Hostname'], ['port', 'Port'], ['pathname', 'Path'],
    ['search', 'Query String'], ['hash', 'Fragment (hash)'],
  ];

  return (
    <div class="space-y-4">
      <div class="flex gap-2">
        {(['parse', 'build'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
            {t === 'parse' ? 'Parse URL' : 'Build URL'}
          </button>
        ))}
      </div>

      {tab === 'parse' ? (
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">URL to Parse</label>
            <input
              type="text"
              value={input}
              onInput={e => setInput((e.target as HTMLInputElement).value)}
              placeholder="https://example.com/path?query=value#hash"
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {parsed ? (
            <div class="space-y-3">
              <div class="overflow-x-auto rounded-lg border border-border">
                <table class="w-full text-sm">
                  <tbody>
                    {FIELDS.map(([key, label]) => {
                      const val = String(parsed[key] || '');
                      return val ? (
                        <tr key={key} class="border-b border-border last:border-0">
                          <td class="px-4 py-2 text-text-muted w-36">{label}</td>
                          <td class="px-4 py-2 font-mono text-text">{val}</td>
                          <td class="px-4 py-2 w-16">
                            <button onClick={() => copy(val, key)} class="text-xs text-text-muted hover:text-primary">{copied === key ? '✓' : 'Copy'}</button>
                          </td>
                        </tr>
                      ) : null;
                    })}
                  </tbody>
                </table>
              </div>

              {parsed.params.length > 0 && (
                <div>
                  <p class="text-sm font-medium text-text-muted mb-2">Query Parameters</p>
                  <div class="overflow-x-auto rounded-lg border border-border">
                    <table class="w-full text-sm">
                      <thead><tr class="bg-bg-card border-b border-border">
                        <th class="text-left px-4 py-2 text-text-muted font-medium">Key</th>
                        <th class="text-left px-4 py-2 text-text-muted font-medium">Value</th>
                      </tr></thead>
                      <tbody>
                        {parsed.params.map(([k, v], i) => (
                          <tr key={i} class={i % 2 === 0 ? 'bg-bg' : 'bg-bg-card'}>
                            <td class="px-4 py-2 font-mono text-primary">{k}</td>
                            <td class="px-4 py-2 font-mono text-text">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : input.trim() && (
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">Invalid URL. Make sure to include the protocol (e.g., https://)</div>
          )}
        </div>
      ) : (
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-text-muted mb-1">Protocol</label>
              <select value={bProtocol} onChange={e => setBProtocol((e.target as HTMLSelectElement).value)} class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary">
                <option>https:</option><option>http:</option><option>ftp:</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Hostname</label>
              <input type="text" value={bHost} onInput={e => setBHost((e.target as HTMLInputElement).value)} placeholder="example.com" class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Port (optional)</label>
              <input type="text" value={bPort} onInput={e => setBPort((e.target as HTMLInputElement).value)} placeholder="3000" class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Path</label>
              <input type="text" value={bPath} onInput={e => setBPath((e.target as HTMLInputElement).value)} placeholder="/api/v1/users" class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary" />
            </div>
          </div>

          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-sm font-medium text-text-muted">Query Parameters</label>
              <button onClick={() => setBParams(p => [...p, ['', '']])} class="text-xs bg-bg-card border border-border px-2 py-1 rounded hover:border-primary hover:text-primary transition-colors">+ Add</button>
            </div>
            {bParams.map(([k, v], i) => (
              <div key={i} class="flex gap-2 mb-2">
                <input type="text" value={k} placeholder="key" onInput={e => setBParams(p => p.map((x, j) => j === i ? [(e.target as HTMLInputElement).value, x[1]] : x))} class="flex-1 bg-bg-card border border-border rounded px-2 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-primary" />
                <input type="text" value={v} placeholder="value" onInput={e => setBParams(p => p.map((x, j) => j === i ? [x[0], (e.target as HTMLInputElement).value] : x))} class="flex-1 bg-bg-card border border-border rounded px-2 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-primary" />
                <button onClick={() => setBParams(p => p.filter((_, j) => j !== i))} class="text-text-muted hover:text-red-400 px-1">×</button>
              </div>
            ))}
          </div>

          <div>
            <label class="block text-xs text-text-muted mb-1">Hash / Fragment</label>
            <input type="text" value={bHash} onInput={e => setBHash((e.target as HTMLInputElement).value)} placeholder="section" class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary" />
          </div>

          {builtUrl && (
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-text-muted">Built URL</label>
                <button onClick={() => copy(builtUrl, 'built')} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">{copied === 'built' ? '✓ Copied!' : 'Copy'}</button>
              </div>
              <div class="bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text break-all">{builtUrl}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
