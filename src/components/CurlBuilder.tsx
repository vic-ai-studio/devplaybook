import { useState, useMemo, useCallback } from 'preact/hooks';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type AuthType = 'none' | 'bearer' | 'basic' | 'api-key';

interface Header { key: string; value: string; enabled: boolean; }
interface QueryParam { key: string; value: string; enabled: boolean; }

function uid() { return Math.random().toString(36).slice(2, 8); }

function escapeShell(s: string): string {
  return s.replace(/'/g, `'\\''`);
}

function buildCurl(
  method: Method,
  url: string,
  params: QueryParam[],
  headers: Header[],
  authType: AuthType,
  bearerToken: string,
  basicUser: string,
  basicPass: string,
  apiKeyHeader: string,
  apiKeyValue: string,
  body: string,
  bodyType: string,
  followRedirects: boolean,
  verbose: boolean,
  insecure: boolean,
  timeout: string,
): string {
  if (!url) return '# Enter a URL to generate the curl command';

  const lines: string[] = [`curl`];
  const flags: string[] = [];

  if (method !== 'GET') flags.push(`-X ${method}`);
  if (followRedirects) flags.push('-L');
  if (verbose) flags.push('-v');
  if (insecure) flags.push('-k');
  if (timeout) flags.push(`--max-time ${timeout}`);

  // Build URL with query params
  const enabledParams = params.filter(p => p.enabled && p.key);
  let fullUrl = url;
  if (enabledParams.length) {
    const qs = enabledParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
    fullUrl += (url.includes('?') ? '&' : '?') + qs;
  }

  // Auth headers
  const allHeaders = [...headers];
  if (authType === 'bearer' && bearerToken) {
    allHeaders.unshift({ key: 'Authorization', value: `Bearer ${bearerToken}`, enabled: true });
  } else if (authType === 'basic' && (basicUser || basicPass)) {
    flags.push(`-u '${escapeShell(basicUser)}:${escapeShell(basicPass)}'`);
  } else if (authType === 'api-key' && apiKeyHeader && apiKeyValue) {
    allHeaders.unshift({ key: apiKeyHeader, value: apiKeyValue, enabled: true });
  }

  // Content-Type for body
  if (body && !allHeaders.find(h => h.enabled && h.key.toLowerCase() === 'content-type')) {
    if (bodyType === 'json') allHeaders.unshift({ key: 'Content-Type', value: 'application/json', enabled: true });
    else if (bodyType === 'form') allHeaders.unshift({ key: 'Content-Type', value: 'application/x-www-form-urlencoded', enabled: true });
    else if (bodyType === 'xml') allHeaders.unshift({ key: 'Content-Type', value: 'application/xml', enabled: true });
  }

  const enabledHeaders = allHeaders.filter(h => h.enabled && h.key);

  // Compose
  const parts: string[] = [];
  if (flags.length) parts.push(flags.join(' '));
  enabledHeaders.forEach(h => parts.push(`-H '${escapeShell(h.key)}: ${escapeShell(h.value)}'`));
  if (body && method !== 'GET' && method !== 'HEAD') {
    parts.push(`-d '${escapeShell(body)}'`);
  }
  parts.push(`'${escapeShell(fullUrl)}'`);

  return `curl ${parts.join(' \\\n  ')}`;
}

const METHOD_COLORS: Record<Method, string> = {
  GET: 'text-green-400', POST: 'text-blue-400', PUT: 'text-yellow-400',
  PATCH: 'text-orange-400', DELETE: 'text-red-400', HEAD: 'text-purple-400', OPTIONS: 'text-cyan-400',
};

export default function CurlBuilder() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('https://api.example.com/users');
  const [params, setParams] = useState<(QueryParam & { id: string })[]>([
    { id: uid(), key: 'page', value: '1', enabled: true },
    { id: uid(), key: 'limit', value: '20', enabled: true },
  ]);
  const [headers, setHeaders] = useState<(Header & { id: string })[]>([
    { id: uid(), key: 'Accept', value: 'application/json', enabled: true },
  ]);
  const [authType, setAuthType] = useState<AuthType>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUser, setBasicUser] = useState('');
  const [basicPass, setBasicPass] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState('json');
  const [followRedirects, setFollowRedirects] = useState(true);
  const [verbose, setVerbose] = useState(false);
  const [insecure, setInsecure] = useState(false);
  const [timeout, setTimeout_] = useState('30');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'auth' | 'body' | 'options'>('params');

  const curlCommand = useMemo(() => buildCurl(
    method, url, params, headers, authType, bearerToken, basicUser, basicPass,
    apiKeyHeader, apiKeyValue, body, bodyType, followRedirects, verbose, insecure, timeout,
  ), [method, url, params, headers, authType, bearerToken, basicUser, basicPass,
    apiKeyHeader, apiKeyValue, body, bodyType, followRedirects, verbose, insecure, timeout]);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [curlCommand]);

  function addParam() { setParams(p => [...p, { id: uid(), key: '', value: '', enabled: true }]); }
  function removeParam(id: string) { setParams(p => p.filter(x => x.id !== id)); }
  function updateParam(id: string, field: keyof QueryParam, val: string | boolean) {
    setParams(p => p.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  function addHeader() { setHeaders(h => [...h, { id: uid(), key: '', value: '', enabled: true }]); }
  function removeHeader(id: string) { setHeaders(h => h.filter(x => x.id !== id)); }
  function updateHeader(id: string, field: keyof Header, val: string | boolean) {
    setHeaders(h => h.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-accent text-text';
  const tabCls = (t: string) => `px-3 py-1.5 text-xs rounded-t transition-colors ${activeTab === t ? 'bg-surface border border-border border-b-surface text-text' : 'text-text-muted hover:text-text'}`;

  const BODY_PLACEHOLDER: Record<string, string> = {
    json: '{\n  "name": "Alice",\n  "email": "alice@example.com"\n}',
    form: 'name=Alice&email=alice%40example.com',
    xml: '<user>\n  <name>Alice</name>\n</user>',
    raw: 'raw body content',
  };

  return (
    <div class="space-y-4">
      {/* Method + URL */}
      <div class="flex gap-2">
        <select
          value={method}
          onChange={e => setMethod((e.target as HTMLSelectElement).value as Method)}
          class={`bg-surface border border-border rounded px-2 py-2 text-sm font-mono font-bold focus:outline-none focus:border-accent ${METHOD_COLORS[method]}`}
        >
          {(['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'] as Method[]).map(m => (
            <option key={m} value={m} class="text-text">{m}</option>
          ))}
        </select>
        <input
          value={url}
          onInput={e => setUrl((e.target as HTMLInputElement).value)}
          placeholder="https://api.example.com/endpoint"
          class={`flex-1 ${inputCls}`}
        />
      </div>

      {/* Tabs */}
      <div class="border-b border-border -mb-px flex gap-1">
        {(['params','headers','auth','body','options'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} class={tabCls(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'params' && params.filter(p=>p.enabled&&p.key).length > 0 && (
              <span class="ml-1 text-accent">{params.filter(p=>p.enabled&&p.key).length}</span>
            )}
            {t === 'headers' && headers.filter(h=>h.enabled&&h.key).length > 0 && (
              <span class="ml-1 text-accent">{headers.filter(h=>h.enabled&&h.key).length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div class="border border-border rounded-lg p-4 -mt-px">
        {activeTab === 'params' && (
          <div class="space-y-2">
            <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-text-muted mb-1">
              <span></span><span>Key</span><span>Value</span><span></span>
            </div>
            {params.map(p => (
              <div key={p.id} class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                <input type="checkbox" checked={p.enabled} onChange={e => updateParam(p.id, 'enabled', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                <input value={p.key} onInput={e => updateParam(p.id, 'key', (e.target as HTMLInputElement).value)} placeholder="key" class={inputCls} />
                <input value={p.value} onInput={e => updateParam(p.id, 'value', (e.target as HTMLInputElement).value)} placeholder="value" class={inputCls} />
                <button onClick={() => removeParam(p.id)} class="text-text-muted hover:text-red-400 text-lg leading-none">×</button>
              </div>
            ))}
            <button onClick={addParam} class="text-xs text-accent hover:underline mt-1">+ Add param</button>
          </div>
        )}

        {activeTab === 'headers' && (
          <div class="space-y-2">
            <div class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 text-xs text-text-muted mb-1">
              <span></span><span>Header</span><span>Value</span><span></span>
            </div>
            {headers.map(h => (
              <div key={h.id} class="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-center">
                <input type="checkbox" checked={h.enabled} onChange={e => updateHeader(h.id, 'enabled', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                <input value={h.key} onInput={e => updateHeader(h.id, 'key', (e.target as HTMLInputElement).value)} placeholder="Header-Name" class={inputCls} />
                <input value={h.value} onInput={e => updateHeader(h.id, 'value', (e.target as HTMLInputElement).value)} placeholder="value" class={inputCls} />
                <button onClick={() => removeHeader(h.id)} class="text-text-muted hover:text-red-400 text-lg leading-none">×</button>
              </div>
            ))}
            <button onClick={addHeader} class="text-xs text-accent hover:underline mt-1">+ Add header</button>
          </div>
        )}

        {activeTab === 'auth' && (
          <div class="space-y-3">
            <div class="flex flex-wrap gap-2">
              {(['none','bearer','basic','api-key'] as AuthType[]).map(a => (
                <button key={a} onClick={() => setAuthType(a)}
                  class={`px-3 py-1 text-sm rounded border transition-colors ${authType === a ? 'bg-accent border-accent text-white' : 'border-border text-text-muted hover:text-text'}`}>
                  {a === 'none' ? 'No Auth' : a === 'bearer' ? 'Bearer Token' : a === 'basic' ? 'Basic Auth' : 'API Key'}
                </button>
              ))}
            </div>
            {authType === 'bearer' && (
              <div class="space-y-1">
                <label class="text-xs text-text-muted">Token</label>
                <input value={bearerToken} onInput={e => setBearerToken((e.target as HTMLInputElement).value)} placeholder="your-token-here" class={`w-full ${inputCls}`} />
              </div>
            )}
            {authType === 'basic' && (
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs text-text-muted">Username</label>
                  <input value={basicUser} onInput={e => setBasicUser((e.target as HTMLInputElement).value)} placeholder="username" class={`w-full ${inputCls}`} />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-text-muted">Password</label>
                  <input type="password" value={basicPass} onInput={e => setBasicPass((e.target as HTMLInputElement).value)} placeholder="password" class={`w-full ${inputCls}`} />
                </div>
              </div>
            )}
            {authType === 'api-key' && (
              <div class="grid grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="text-xs text-text-muted">Header name</label>
                  <input value={apiKeyHeader} onInput={e => setApiKeyHeader((e.target as HTMLInputElement).value)} placeholder="X-API-Key" class={`w-full ${inputCls}`} />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-text-muted">Value</label>
                  <input value={apiKeyValue} onInput={e => setApiKeyValue((e.target as HTMLInputElement).value)} placeholder="your-api-key" class={`w-full ${inputCls}`} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'body' && (
          <div class="space-y-3">
            <div class="flex gap-2">
              {['json','form','xml','raw'].map(t => (
                <button key={t} onClick={() => setBodyType(t)}
                  class={`px-3 py-1 text-sm rounded border transition-colors ${bodyType === t ? 'bg-accent border-accent text-white' : 'border-border text-text-muted hover:text-text'}`}>
                  {t === 'json' ? 'JSON' : t === 'form' ? 'Form URL-Encoded' : t === 'xml' ? 'XML' : 'Raw'}
                </button>
              ))}
            </div>
            {method === 'GET' || method === 'HEAD' ? (
              <p class="text-xs text-text-muted">Body is not available for {method} requests.</p>
            ) : (
              <textarea
                value={body}
                onInput={e => setBody((e.target as HTMLTextAreaElement).value)}
                placeholder={BODY_PLACEHOLDER[bodyType]}
                class="w-full h-36 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
                spellcheck={false}
              />
            )}
          </div>
        )}

        {activeTab === 'options' && (
          <div class="space-y-3">
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={followRedirects} onChange={e => setFollowRedirects((e.target as HTMLInputElement).checked)} class="accent-accent" />
              Follow redirects <span class="text-xs font-mono text-text-muted/60">-L</span>
            </label>
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={verbose} onChange={e => setVerbose((e.target as HTMLInputElement).checked)} class="accent-accent" />
              Verbose output <span class="text-xs font-mono text-text-muted/60">-v</span>
            </label>
            <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={insecure} onChange={e => setInsecure((e.target as HTMLInputElement).checked)} class="accent-accent" />
              Skip TLS verification <span class="text-xs font-mono text-text-muted/60">-k</span>
            </label>
            <div class="flex items-center gap-2">
              <label class="text-sm text-text-muted">Timeout (seconds)</label>
              <input value={timeout} onInput={e => setTimeout_((e.target as HTMLInputElement).value)} type="number" min="1" max="300"
                class="w-20 bg-surface border border-border rounded px-2 py-1 text-sm font-mono focus:outline-none focus:border-accent text-text" />
            </div>
          </div>
        )}
      </div>

      {/* Output */}
      <div class="border border-border rounded-lg overflow-hidden">
        <div class="bg-surface/80 px-3 py-2 flex items-center justify-between border-b border-border">
          <span class="text-xs text-text-muted font-mono">Generated curl command</span>
          <button onClick={copy} class="text-xs bg-surface border border-border rounded px-3 py-1 hover:border-accent transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 font-mono text-xs text-green-300 overflow-auto whitespace-pre-wrap bg-[#0d1117] max-h-64">
          {curlCommand}
        </pre>
      </div>
    </div>
  );
}
