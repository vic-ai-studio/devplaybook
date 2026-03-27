import { useState, useMemo } from 'preact/hooks';

interface ProxyConfig {
  serverName: string;
  upstreamUrl: string;
  listenPort: string;
  locationPath: string;
  enableSsl: boolean;
  certPath: string;
  keyPath: string;
  enableWebSocket: boolean;
  enableCors: boolean;
  corsOrigin: string;
  enableCache: boolean;
  cacheTime: string;
  enableGzip: boolean;
  enableSecurity: boolean;
  enableHsts: boolean;
  enableRateLimit: boolean;
  rateLimitRps: string;
  proxyReadTimeout: string;
  proxyConnectTimeout: string;
  enableLogs: boolean;
}

function generateProxyConfig(cfg: ProxyConfig): string {
  const domain = cfg.serverName || 'example.com';
  const upstream = cfg.upstreamUrl || 'http://127.0.0.1:3000';
  const location = cfg.locationPath || '/';

  // Parse upstream for display
  let upstreamDisplay = upstream;
  if (!upstream.startsWith('http')) upstreamDisplay = 'http://' + upstream;

  const wsHeaders = cfg.enableWebSocket ? `
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";` : `
        proxy_http_version 1.1;
        proxy_set_header Connection "";`;

  const corsBlock = cfg.enableCors ? `
        # CORS headers
        add_header Access-Control-Allow-Origin "${cfg.corsOrigin || '*'}" always;
        add_header Access-Control-Allow-Methods "GET, POST, PUT, PATCH, DELETE, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Max-Age 1728000;
            add_header Content-Type "text/plain charset=UTF-8";
            add_header Content-Length 0;
            return 204;
        }` : '';

  const cacheBlock = cfg.enableCache ? `
        # Static asset caching
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass ${upstreamDisplay};
            expires ${cfg.cacheTime || '7d'};
            add_header Cache-Control "public, immutable";
            access_log off;
        }` : '';

  const securityHeaders = cfg.enableSecurity ? `
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;` : '';

  const hstsHeader = cfg.enableHsts && cfg.enableSsl
    ? `\n        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`
    : '';

  const gzipBlock = cfg.enableGzip ? `
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss image/svg+xml;
    gzip_comp_level 6;
` : '';

  const rateLimitConfig = cfg.enableRateLimit ? `
# Rate limiting zone (add this in http {} block)
limit_req_zone $binary_remote_addr zone=proxy_limit:10m rate=${cfg.rateLimitRps || '10'}r/s;
` : '';

  const rateLimitApply = cfg.enableRateLimit ? `\n        limit_req zone=proxy_limit burst=20 nodelay;` : '';

  const logLines = cfg.enableLogs
    ? `\n    access_log /var/log/nginx/${domain.replace(/[^a-z0-9]/gi, '_')}_access.log;\n    error_log  /var/log/nginx/${domain.replace(/[^a-z0-9]/gi, '_')}_error.log warn;`
    : '\n    access_log off;';

  const timeouts = `
        proxy_read_timeout ${cfg.proxyReadTimeout || '60'}s;
        proxy_connect_timeout ${cfg.proxyConnectTimeout || '10'}s;
        proxy_send_timeout 60s;`;

  const sslBlock = cfg.enableSsl ? `
    ssl_certificate     ${cfg.certPath || `/etc/letsencrypt/live/${domain}/fullchain.pem`};
    ssl_certificate_key ${cfg.keyPath || `/etc/letsencrypt/live/${domain}/privkey.pem`};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozSSL:10m;` : '';

  const listenDirectives = cfg.enableSsl
    ? `    listen 443 ssl;\n    listen [::]:443 ssl;`
    : `    listen ${cfg.listenPort || '80'};\n    listen [::]:${cfg.listenPort || '80'};`;

  const httpRedirect = cfg.enableSsl ? `
# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};
    return 301 https://$host$request_uri;
}

` : '';

  return `${rateLimitConfig}${httpRedirect}server {
${listenDirectives}
    server_name ${domain} www.${domain};
${sslBlock}${logLines}
${gzipBlock}
    location ${location} {
        proxy_pass ${upstreamDisplay};${wsHeaders}

        # Proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_buffering off;${timeouts}${rateLimitApply}${securityHeaders}${hstsHeader}${corsBlock}
    }
${cacheBlock}
}`.trim();
}

export default function NginxProxyConfigGenerator() {
  const [cfg, setCfg] = useState<ProxyConfig>({
    serverName: 'example.com',
    upstreamUrl: 'http://127.0.0.1:3000',
    listenPort: '80',
    locationPath: '/',
    enableSsl: false,
    certPath: '',
    keyPath: '',
    enableWebSocket: false,
    enableCors: false,
    corsOrigin: '*',
    enableCache: false,
    cacheTime: '7d',
    enableGzip: true,
    enableSecurity: true,
    enableHsts: false,
    enableRateLimit: false,
    rateLimitRps: '10',
    proxyReadTimeout: '60',
    proxyConnectTimeout: '10',
    enableLogs: true,
  });
  const [copied, setCopied] = useState(false);

  const config = useMemo(() => generateProxyConfig(cfg), [cfg]);

  function set(patch: Partial<ProxyConfig>) {
    setCfg(prev => ({ ...prev, ...patch }));
  }

  function copy() {
    navigator.clipboard?.writeText(config).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const inputCls = 'w-full border border-border rounded px-3 py-2 bg-background text-sm';
  const labelCls = 'block text-xs text-text-muted mb-1';
  const sectionCls = 'border border-border rounded p-4 space-y-3';

  return (
    <div class="space-y-6">
      {/* Basic config */}
      <div class={sectionCls}>
        <h3 class="font-semibold text-sm">Basic Configuration</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class={labelCls}>Domain / Server Name</label>
            <input type="text" class={inputCls} value={cfg.serverName}
              onInput={e => set({ serverName: (e.target as HTMLInputElement).value })}
              placeholder="example.com" />
          </div>
          <div>
            <label class={labelCls}>Upstream URL</label>
            <input type="text" class={inputCls} value={cfg.upstreamUrl}
              onInput={e => set({ upstreamUrl: (e.target as HTMLInputElement).value })}
              placeholder="http://127.0.0.1:3000" />
          </div>
          <div>
            <label class={labelCls}>Location Path</label>
            <input type="text" class={inputCls} value={cfg.locationPath}
              onInput={e => set({ locationPath: (e.target as HTMLInputElement).value })}
              placeholder="/" />
          </div>
          {!cfg.enableSsl && (
            <div>
              <label class={labelCls}>Listen Port</label>
              <input type="text" class={inputCls} value={cfg.listenPort}
                onInput={e => set({ listenPort: (e.target as HTMLInputElement).value })}
                placeholder="80" />
            </div>
          )}
        </div>
      </div>

      {/* Timeouts */}
      <div class={sectionCls}>
        <h3 class="font-semibold text-sm">Timeouts</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class={labelCls}>Read Timeout (seconds)</label>
            <input type="number" class={inputCls} value={cfg.proxyReadTimeout}
              onInput={e => set({ proxyReadTimeout: (e.target as HTMLInputElement).value })}
              min="1" max="600" />
          </div>
          <div>
            <label class={labelCls}>Connect Timeout (seconds)</label>
            <input type="number" class={inputCls} value={cfg.proxyConnectTimeout}
              onInput={e => set({ proxyConnectTimeout: (e.target as HTMLInputElement).value })}
              min="1" max="300" />
          </div>
        </div>
      </div>

      {/* Feature toggles */}
      <div class={sectionCls}>
        <h3 class="font-semibold text-sm">Features</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* SSL/TLS */}
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableSsl}
                onChange={e => set({ enableSsl: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm font-medium">SSL / TLS</span>
            </label>
            {cfg.enableSsl && (
              <div class="pl-5 space-y-2">
                <div>
                  <label class={labelCls}>Certificate Path</label>
                  <input type="text" class={inputCls} value={cfg.certPath}
                    onInput={e => set({ certPath: (e.target as HTMLInputElement).value })}
                    placeholder={`/etc/letsencrypt/live/${cfg.serverName || 'example.com'}/fullchain.pem`} />
                </div>
                <div>
                  <label class={labelCls}>Key Path</label>
                  <input type="text" class={inputCls} value={cfg.keyPath}
                    onInput={e => set({ keyPath: (e.target as HTMLInputElement).value })}
                    placeholder={`/etc/letsencrypt/live/${cfg.serverName || 'example.com'}/privkey.pem`} />
                </div>
              </div>
            )}
          </div>

          {/* WebSocket */}
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableWebSocket}
                onChange={e => set({ enableWebSocket: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">WebSocket Support</span>
            </label>
            <p class="text-xs text-text-muted pl-6 mt-1">Adds Upgrade + Connection headers for WS proxying</p>
          </div>

          {/* CORS */}
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableCors}
                onChange={e => set({ enableCors: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">CORS Headers</span>
            </label>
            {cfg.enableCors && (
              <div class="pl-5">
                <label class={labelCls}>Allowed Origin</label>
                <input type="text" class={inputCls} value={cfg.corsOrigin}
                  onInput={e => set({ corsOrigin: (e.target as HTMLInputElement).value })}
                  placeholder="* or https://yoursite.com" />
              </div>
            )}
          </div>

          {/* Gzip */}
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableGzip}
                onChange={e => set({ enableGzip: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">Gzip Compression</span>
            </label>
          </div>

          {/* Security headers */}
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableSecurity}
                onChange={e => set({ enableSecurity: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">Security Headers</span>
            </label>
            <p class="text-xs text-text-muted pl-6 mt-1">X-Frame-Options, X-Content-Type-Options, XSS-Protection</p>
          </div>

          {/* HSTS */}
          <div>
            <label class={`flex items-center gap-2 ${cfg.enableSsl ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
              <input type="checkbox" checked={cfg.enableHsts}
                disabled={!cfg.enableSsl}
                onChange={e => set({ enableHsts: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">HSTS {!cfg.enableSsl && '(requires SSL)'}</span>
            </label>
          </div>

          {/* Cache static */}
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableCache}
                onChange={e => set({ enableCache: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">Cache Static Assets</span>
            </label>
            {cfg.enableCache && (
              <div class="pl-5">
                <label class={labelCls}>Cache Duration</label>
                <input type="text" class={inputCls} value={cfg.cacheTime}
                  onInput={e => set({ cacheTime: (e.target as HTMLInputElement).value })}
                  placeholder="7d" />
              </div>
            )}
          </div>

          {/* Rate limit */}
          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableRateLimit}
                onChange={e => set({ enableRateLimit: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">Rate Limiting</span>
            </label>
            {cfg.enableRateLimit && (
              <div class="pl-5">
                <label class={labelCls}>Requests/second per IP</label>
                <input type="number" class={inputCls} value={cfg.rateLimitRps}
                  onInput={e => set({ rateLimitRps: (e.target as HTMLInputElement).value })}
                  min="1" />
              </div>
            )}
          </div>

          {/* Logs */}
          <div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.enableLogs}
                onChange={e => set({ enableLogs: (e.target as HTMLInputElement).checked })}
                class="accent-primary" />
              <span class="text-sm">Enable Access Logs</span>
            </label>
          </div>
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-semibold">Generated Config</h3>
          <button
            onClick={copy}
            class="px-4 py-2 text-sm border border-border rounded hover:bg-surface transition-colors"
          >{copied ? '✓ Copied!' : 'Copy Config'}</button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-auto max-h-96 text-text-muted whitespace-pre">{config}</pre>
        <p class="text-xs text-text-muted mt-2">Test before applying: <code class="font-mono bg-surface px-1 rounded">sudo nginx -t</code> → reload: <code class="font-mono bg-surface px-1 rounded">sudo systemctl reload nginx</code></p>
      </div>
    </div>
  );
}
