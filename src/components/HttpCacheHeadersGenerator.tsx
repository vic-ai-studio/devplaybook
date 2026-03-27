import { useState } from 'preact/hooks';

type ResourceType = 'html' | 'css' | 'js' | 'image' | 'font' | 'api' | 'custom';
type CacheStrategy = 'public' | 'private' | 'no-cache' | 'no-store';

interface CacheConfig {
  resourceType: ResourceType;
  strategy: CacheStrategy;
  maxAge: number;
  sMaxAge: number;
  useSMaxAge: boolean;
  mustRevalidate: boolean;
  immutable: boolean;
  staleWhileRevalidate: number;
  useStaleWhileRevalidate: boolean;
  staleIfError: number;
  useStaleIfError: boolean;
  etagEnabled: boolean;
  lastModified: boolean;
  varyAcceptEncoding: boolean;
  varyAcceptLanguage: boolean;
  varyOrigin: boolean;
  pragma: boolean;
  expires: boolean;
}

const RESOURCE_PRESETS: Record<ResourceType, Partial<CacheConfig> & { label: string; description: string }> = {
  html: {
    label: 'HTML Page',
    description: 'Dynamic pages — revalidate every request',
    strategy: 'no-cache',
    maxAge: 0,
    useSMaxAge: true,
    sMaxAge: 60,
    mustRevalidate: true,
    immutable: false,
    varyAcceptEncoding: true,
    varyAcceptLanguage: true,
  },
  css: {
    label: 'CSS / JS (hashed)',
    description: 'Fingerprinted assets — cache forever',
    strategy: 'public',
    maxAge: 31536000,
    useSMaxAge: false,
    mustRevalidate: false,
    immutable: true,
    varyAcceptEncoding: true,
  },
  js: {
    label: 'JavaScript (hashed)',
    description: 'Fingerprinted JS — cache forever',
    strategy: 'public',
    maxAge: 31536000,
    useSMaxAge: false,
    mustRevalidate: false,
    immutable: true,
    varyAcceptEncoding: true,
  },
  image: {
    label: 'Images',
    description: 'Static images — cache for a long time',
    strategy: 'public',
    maxAge: 2592000,
    useSMaxAge: false,
    mustRevalidate: false,
    immutable: false,
    varyAcceptEncoding: false,
  },
  font: {
    label: 'Web Fonts',
    description: 'Fonts rarely change — cache for a year',
    strategy: 'public',
    maxAge: 31536000,
    useSMaxAge: false,
    mustRevalidate: false,
    immutable: true,
    varyOrigin: true,
  },
  api: {
    label: 'API Response',
    description: 'Private data — do not cache in CDN',
    strategy: 'private',
    maxAge: 0,
    useSMaxAge: false,
    mustRevalidate: true,
    immutable: false,
    varyAcceptEncoding: false,
  },
  custom: {
    label: 'Custom',
    description: 'Configure every option manually',
    strategy: 'public',
    maxAge: 3600,
    useSMaxAge: false,
    mustRevalidate: false,
    immutable: false,
  },
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return '0 (no caching)';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 31536000) return `${Math.round(seconds / 86400)}d`;
  return `${Math.round(seconds / 31536000)}y`;
}

function generateHeader(cfg: CacheConfig): { header: string; parts: string[] } {
  if (cfg.strategy === 'no-store') {
    return { header: 'Cache-Control: no-store', parts: ['no-store'] };
  }

  const parts: string[] = [];

  if (cfg.strategy === 'no-cache') {
    parts.push('no-cache');
  } else {
    parts.push(cfg.strategy); // public or private
    if (cfg.maxAge > 0 || cfg.strategy !== 'no-cache') {
      parts.push(`max-age=${cfg.maxAge}`);
    }
  }

  if (cfg.useSMaxAge && cfg.sMaxAge > 0 && cfg.strategy !== 'private') {
    parts.push(`s-maxage=${cfg.sMaxAge}`);
  }

  if (cfg.mustRevalidate) parts.push('must-revalidate');
  if (cfg.immutable) parts.push('immutable');
  if (cfg.useStaleWhileRevalidate && cfg.staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${cfg.staleWhileRevalidate}`);
  }
  if (cfg.useStaleIfError && cfg.staleIfError > 0) {
    parts.push(`stale-if-error=${cfg.staleIfError}`);
  }

  return { header: `Cache-Control: ${parts.join(', ')}`, parts };
}

function generateVaryHeader(cfg: CacheConfig): string | null {
  const vary: string[] = [];
  if (cfg.varyAcceptEncoding) vary.push('Accept-Encoding');
  if (cfg.varyAcceptLanguage) vary.push('Accept-Language');
  if (cfg.varyOrigin) vary.push('Origin');
  return vary.length > 0 ? `Vary: ${vary.join(', ')}` : null;
}

function generateNginxConfig(cfg: CacheConfig): string {
  const { header } = generateHeader(cfg);
  const varyHeader = generateVaryHeader(cfg);
  const etagLine = cfg.etagEnabled ? '\n  etag on;' : '\n  etag off;';
  const lines: string[] = [
    `add_header Cache-Control "${header.replace('Cache-Control: ', '')}";`,
  ];
  if (varyHeader) lines.push(`add_header ${varyHeader};`);
  if (cfg.pragma) lines.push('add_header Pragma "no-cache";');
  if (cfg.expires && cfg.maxAge > 0) {
    lines.push(`expires ${cfg.maxAge}s;`);
  } else if (cfg.strategy === 'no-store' || cfg.strategy === 'no-cache') {
    lines.push('expires 0;');
  }

  return `location ~* \\.(${LOCATION_EXT[cfg.resourceType]})$ {${etagLine}\n  ${lines.join('\n  ')}\n}`;
}

function generateApacheConfig(cfg: CacheConfig): string {
  const { header } = generateHeader(cfg);
  const varyHeader = generateVaryHeader(cfg);
  const lines: string[] = [
    `Header set Cache-Control "${header.replace('Cache-Control: ', '')}"`,
  ];
  if (varyHeader) lines.push(`Header set ${varyHeader}`);
  if (cfg.pragma) lines.push('Header set Pragma "no-cache"');

  return `<FilesMatch "\\.(${LOCATION_EXT[cfg.resourceType]})$">
  ${lines.join('\n  ')}
</FilesMatch>`;
}

function generateCloudflareConfig(cfg: CacheConfig): string {
  const ttl = cfg.strategy === 'no-store' || cfg.strategy === 'no-cache' ? 0 : cfg.sMaxAge || cfg.maxAge;
  return `# Cloudflare Page Rule / Cache Rule
# URL pattern: example.com/*.${LOCATION_EXT[cfg.resourceType].split('|')[0]}
# Cache Level: ${cfg.strategy === 'no-store' || cfg.strategy === 'no-cache' ? 'Bypass' : 'Cache Everything'}
# Edge Cache TTL: ${ttl > 0 ? formatDuration(ttl) : 'Bypass'}
# Browser Cache TTL: ${cfg.maxAge > 0 ? formatDuration(cfg.maxAge) : 'Respect headers'}`;
}

const LOCATION_EXT: Record<ResourceType, string> = {
  html: 'html|htm',
  css: 'css',
  js: 'js|mjs',
  image: 'jpg|jpeg|png|gif|webp|svg|ico|avif',
  font: 'woff|woff2|ttf|eot|otf',
  api: 'json',
  custom: '*',
};

const DIRECTIVE_DOCS: Record<string, string> = {
  'no-store': 'Never store the response anywhere — not browser, not CDN, not proxies. Use for sensitive data.',
  'no-cache': 'Store but must revalidate with the server before each use. Not "no caching" — just "always revalidate".',
  'public': 'Any cache (browser, CDN, proxy) may store this response.',
  'private': 'Only the end-user\'s browser may store this. CDNs and shared caches must not.',
  'max-age': 'How long (seconds) the browser considers this response fresh without revalidating.',
  's-maxage': 'Overrides max-age for shared caches (CDNs). Browser ignores this.',
  'must-revalidate': 'Once stale, must revalidate with the server — no serving stale content even if the server is down.',
  'immutable': 'Tells the browser this resource will never change — skip revalidation requests during max-age window.',
  'stale-while-revalidate': 'Serve stale content while revalidating in background (within this time window).',
  'stale-if-error': 'Serve stale content if the server returns an error (within this time window).',
};

export default function HttpCacheHeadersGenerator() {
  const [cfg, setCfg] = useState<CacheConfig>({
    resourceType: 'html',
    strategy: 'no-cache',
    maxAge: 0,
    sMaxAge: 60,
    useSMaxAge: true,
    mustRevalidate: true,
    immutable: false,
    staleWhileRevalidate: 60,
    useStaleWhileRevalidate: false,
    staleIfError: 86400,
    useStaleIfError: false,
    etagEnabled: true,
    lastModified: true,
    varyAcceptEncoding: true,
    varyAcceptLanguage: true,
    varyOrigin: false,
    pragma: false,
    expires: false,
  });

  const [activeConfig, setActiveConfig] = useState<'nginx' | 'apache' | 'cloudflare'>('nginx');
  const [copied, setCopied] = useState<string | null>(null);

  function update(patch: Partial<CacheConfig>) {
    setCfg(prev => ({ ...prev, ...patch }));
  }

  function applyPreset(rt: ResourceType) {
    const preset = RESOURCE_PRESETS[rt];
    update({
      resourceType: rt,
      strategy: preset.strategy ?? 'public',
      maxAge: preset.maxAge ?? 0,
      sMaxAge: preset.sMaxAge ?? 0,
      useSMaxAge: preset.useSMaxAge ?? false,
      mustRevalidate: preset.mustRevalidate ?? false,
      immutable: preset.immutable ?? false,
      varyAcceptEncoding: preset.varyAcceptEncoding ?? false,
      varyAcceptLanguage: preset.varyAcceptLanguage ?? false,
      varyOrigin: preset.varyOrigin ?? false,
    });
  }

  const { header, parts } = generateHeader(cfg);
  const varyHeader = generateVaryHeader(cfg);

  const allHeaders = [
    header,
    varyHeader,
    cfg.etagEnabled ? 'ETag: "abc123def456"  (generated by server)' : null,
    cfg.lastModified ? 'Last-Modified: Thu, 27 Mar 2025 00:00:00 GMT  (set by server)' : null,
    cfg.pragma ? 'Pragma: no-cache  (legacy HTTP/1.0)' : null,
  ].filter(Boolean).join('\n');

  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const configMap = {
    nginx: generateNginxConfig(cfg),
    apache: generateApacheConfig(cfg),
    cloudflare: generateCloudflareConfig(cfg),
  };

  const inputCls = 'bg-surface border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-accent';
  const labelCls = 'block text-xs font-medium text-text-muted mb-1';
  const checkboxRowCls = 'flex items-center gap-2 cursor-pointer group';

  return (
    <div class="space-y-5">
      {/* Resource type presets */}
      <div>
        <p class="text-xs font-medium text-text-muted mb-2">RESOURCE TYPE</p>
        <div class="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
          {(Object.entries(RESOURCE_PRESETS) as [ResourceType, typeof RESOURCE_PRESETS[ResourceType]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              class={`p-2 rounded border text-center transition-colors ${cfg.resourceType === key ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted hover:border-accent'}`}
            >
              <div class="text-xs font-medium">{p.label}</div>
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-1.5">{RESOURCE_PRESETS[cfg.resourceType].description}</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Config panel */}
        <div class="space-y-4">
          {/* Cache-Control strategy */}
          <div>
            <label class={labelCls}>Cache Strategy (Cache-Control)</label>
            <div class="grid grid-cols-2 gap-2">
              {(['public', 'private', 'no-cache', 'no-store'] as CacheStrategy[]).map(s => (
                <button
                  key={s}
                  onClick={() => update({ strategy: s })}
                  class={`p-2.5 rounded border text-sm text-left transition-colors ${cfg.strategy === s ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-surface text-text-muted hover:border-accent'}`}
                >
                  <span class="font-medium font-mono">{s}</span>
                  <span class="block text-xs opacity-70 mt-0.5">
                    {s === 'public' && 'Browser + CDN cache'}
                    {s === 'private' && 'Browser only'}
                    {s === 'no-cache' && 'Always revalidate'}
                    {s === 'no-store' && 'Never store'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {cfg.strategy !== 'no-store' && (
            <>
              {/* max-age */}
              <div>
                <label class={labelCls}>max-age (browser cache TTL)</label>
                <div class="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="31536000"
                    step="60"
                    value={cfg.maxAge}
                    onInput={e => update({ maxAge: parseInt((e.target as HTMLInputElement).value) })}
                    class="flex-1 accent-accent"
                  />
                  <input
                    type="number"
                    value={cfg.maxAge}
                    min="0"
                    max="31536000"
                    onInput={e => update({ maxAge: parseInt((e.target as HTMLInputElement).value) || 0 })}
                    class={`w-24 ${inputCls}`}
                  />
                </div>
                <p class="text-xs text-text-muted mt-1">{formatDuration(cfg.maxAge)}</p>
              </div>

              {/* s-maxage */}
              {cfg.strategy === 'public' && (
                <div>
                  <label class={`${checkboxRowCls} mb-1.5`}>
                    <input
                      type="checkbox"
                      checked={cfg.useSMaxAge}
                      onChange={e => update({ useSMaxAge: (e.target as HTMLInputElement).checked })}
                      class="accent-accent"
                    />
                    <span class={labelCls + ' mb-0'}>s-maxage (CDN cache TTL — overrides max-age for CDNs)</span>
                  </label>
                  {cfg.useSMaxAge && (
                    <div class="flex items-center gap-3 ml-5">
                      <input
                        type="range"
                        min="0"
                        max="31536000"
                        step="60"
                        value={cfg.sMaxAge}
                        onInput={e => update({ sMaxAge: parseInt((e.target as HTMLInputElement).value) })}
                        class="flex-1 accent-accent"
                      />
                      <input
                        type="number"
                        value={cfg.sMaxAge}
                        min="0"
                        max="31536000"
                        onInput={e => update({ sMaxAge: parseInt((e.target as HTMLInputElement).value) || 0 })}
                        class={`w-24 ${inputCls}`}
                      />
                    </div>
                  )}
                  {cfg.useSMaxAge && <p class="text-xs text-text-muted ml-5 mt-1">{formatDuration(cfg.sMaxAge)}</p>}
                </div>
              )}

              {/* Checkboxes */}
              <div class="space-y-2">
                <label class={checkboxRowCls}>
                  <input type="checkbox" checked={cfg.mustRevalidate} onChange={e => update({ mustRevalidate: (e.target as HTMLInputElement).checked })} class="accent-accent" />
                  <span class="text-sm text-text-muted">must-revalidate</span>
                  <span class="text-xs text-text-muted opacity-60">— no stale serving</span>
                </label>
                <label class={checkboxRowCls}>
                  <input type="checkbox" checked={cfg.immutable} onChange={e => update({ immutable: (e.target as HTMLInputElement).checked })} class="accent-accent" />
                  <span class="text-sm text-text-muted">immutable</span>
                  <span class="text-xs text-text-muted opacity-60">— skip revalidation (use with fingerprinted assets)</span>
                </label>
                <label class={checkboxRowCls}>
                  <input type="checkbox" checked={cfg.useStaleWhileRevalidate} onChange={e => update({ useStaleWhileRevalidate: (e.target as HTMLInputElement).checked })} class="accent-accent" />
                  <span class="text-sm text-text-muted">stale-while-revalidate</span>
                </label>
                {cfg.useStaleWhileRevalidate && (
                  <div class="ml-5 flex items-center gap-2">
                    <input
                      type="number"
                      value={cfg.staleWhileRevalidate}
                      min="0"
                      onInput={e => update({ staleWhileRevalidate: parseInt((e.target as HTMLInputElement).value) || 0 })}
                      class={`w-24 ${inputCls}`}
                    />
                    <span class="text-xs text-text-muted">seconds ({formatDuration(cfg.staleWhileRevalidate)})</span>
                  </div>
                )}
                <label class={checkboxRowCls}>
                  <input type="checkbox" checked={cfg.useStaleIfError} onChange={e => update({ useStaleIfError: (e.target as HTMLInputElement).checked })} class="accent-accent" />
                  <span class="text-sm text-text-muted">stale-if-error</span>
                  <span class="text-xs text-text-muted opacity-60">— serve stale on server error</span>
                </label>
                {cfg.useStaleIfError && (
                  <div class="ml-5 flex items-center gap-2">
                    <input
                      type="number"
                      value={cfg.staleIfError}
                      min="0"
                      onInput={e => update({ staleIfError: parseInt((e.target as HTMLInputElement).value) || 0 })}
                      class={`w-24 ${inputCls}`}
                    />
                    <span class="text-xs text-text-muted">seconds ({formatDuration(cfg.staleIfError)})</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ETag & Vary */}
          <div class="space-y-2 pt-1 border-t border-border">
            <label class={checkboxRowCls}>
              <input type="checkbox" checked={cfg.etagEnabled} onChange={e => update({ etagEnabled: (e.target as HTMLInputElement).checked })} class="accent-accent" />
              <span class="text-sm text-text-muted">ETag support</span>
            </label>
            <label class={checkboxRowCls}>
              <input type="checkbox" checked={cfg.varyAcceptEncoding} onChange={e => update({ varyAcceptEncoding: (e.target as HTMLInputElement).checked })} class="accent-accent" />
              <span class="text-sm text-text-muted">Vary: Accept-Encoding</span>
              <span class="text-xs opacity-60 text-text-muted">— gzip/br</span>
            </label>
            <label class={checkboxRowCls}>
              <input type="checkbox" checked={cfg.varyAcceptLanguage} onChange={e => update({ varyAcceptLanguage: (e.target as HTMLInputElement).checked })} class="accent-accent" />
              <span class="text-sm text-text-muted">Vary: Accept-Language</span>
            </label>
            <label class={checkboxRowCls}>
              <input type="checkbox" checked={cfg.varyOrigin} onChange={e => update({ varyOrigin: (e.target as HTMLInputElement).checked })} class="accent-accent" />
              <span class="text-sm text-text-muted">Vary: Origin</span>
              <span class="text-xs opacity-60 text-text-muted">— for CORS resources</span>
            </label>
          </div>
        </div>

        {/* Output panel */}
        <div class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-medium text-text-muted">GENERATED HEADERS</p>
              <button onClick={() => copyText(allHeaders, 'headers')} class="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors">
                {copied === 'headers' ? 'Copied!' : 'Copy Headers'}
              </button>
            </div>
            <pre class="bg-surface border border-border rounded p-3 text-xs font-mono text-text whitespace-pre-wrap">{allHeaders}</pre>
          </div>

          {/* Directive breakdown */}
          <div>
            <p class="text-xs font-medium text-text-muted mb-2">DIRECTIVE BREAKDOWN</p>
            <div class="space-y-1.5">
              {parts.map(p => {
                const key = p.includes('=') ? p.split('=')[0] : p;
                const doc = DIRECTIVE_DOCS[key];
                return (
                  <div key={p} class="flex gap-2 text-xs">
                    <code class="font-mono text-accent bg-accent/5 px-1.5 py-0.5 rounded shrink-0">{p}</code>
                    {doc && <span class="text-text-muted">{doc}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Server configs */}
          <div>
            <div class="flex gap-1 border-b border-border mb-2">
              {(['nginx', 'apache', 'cloudflare'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveConfig(t)}
                  class={`px-3 py-1.5 text-xs border-b-2 transition-colors -mb-px capitalize ${activeConfig === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
                >
                  {t === 'cloudflare' ? 'Cloudflare' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div class="relative">
              <pre class="bg-surface border border-border rounded p-3 text-xs font-mono text-text overflow-x-auto whitespace-pre">{configMap[activeConfig]}</pre>
              <button
                onClick={() => copyText(configMap[activeConfig], activeConfig)}
                class="absolute top-2 right-2 px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90"
              >
                {copied === activeConfig ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
