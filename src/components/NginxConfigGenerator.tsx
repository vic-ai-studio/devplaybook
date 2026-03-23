import { useState } from 'preact/hooks';

type ServerType = 'static' | 'reverse_proxy' | 'php' | 'redirect';

const SERVER_TYPE_LABELS: Record<ServerType, string> = {
  static: 'Static Site',
  reverse_proxy: 'Reverse Proxy (Node/API)',
  php: 'PHP-FPM',
  redirect: 'Redirect / HTTPS Enforce',
};

function generateConfig(opts: {
  serverType: ServerType;
  serverName: string;
  rootDir: string;
  proxyPort: string;
  enableSsl: boolean;
  enableGzip: boolean;
  enableCache: boolean;
  enableSecurity: boolean;
  enableHsts: boolean;
  certPath: string;
  keyPath: string;
  indexFile: string;
  accessLog: string;
  errorLog: string;
}): string {
  const {
    serverType, serverName, rootDir, proxyPort,
    enableSsl, enableGzip, enableCache, enableSecurity,
    enableHsts, certPath, keyPath, indexFile, accessLog, errorLog,
  } = opts;

  const domain = serverName || 'example.com';
  const root = rootDir || '/var/www/html';
  const port = proxyPort || '3000';
  const ssl_cert = certPath || `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  const ssl_key = keyPath || `/etc/letsencrypt/live/${domain}/privkey.pem`;

  const gzipBlock = enableGzip ? `
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss image/svg+xml;
    gzip_comp_level 6;
` : '';

  const securityHeaders = enableSecurity ? `
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
` : '';

  const hstsHeader = enableHsts && enableSsl
    ? `        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n`
    : '';

  const cacheBlock = enableCache ? `
        # Cache static assets
        location ~* \\.(jpg|jpeg|png|gif|ico|css|js|pdf|txt|woff|woff2|ttf|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
` : '';

  const accessLogLine = accessLog ? `    access_log ${accessLog};` : `    access_log /var/log/nginx/${domain.replace(/[^a-z0-9]/gi, '_')}_access.log;`;
  const errorLogLine = errorLog ? `    error_log ${errorLog};` : `    error_log /var/log/nginx/${domain.replace(/[^a-z0-9]/gi, '_')}_error.log warn;`;

  // HTTP → HTTPS redirect block
  const httpRedirectBlock = enableSsl ? `server {
    listen 80;
    listen [::]:80;
    server_name ${domain} www.${domain};

    # Redirect all HTTP to HTTPS
    return 301 https://\$host\$request_uri;
}

` : '';

  const listenDirectives = enableSsl
    ? `    listen 443 ssl http2;
    listen [::]:443 ssl http2;`
    : `    listen 80;
    listen [::]:80;`;

  const sslBlock = enableSsl ? `
    # SSL
    ssl_certificate ${ssl_cert};
    ssl_certificate_key ${ssl_key};
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
` : '';

  let locationBlock = '';

  if (serverType === 'static') {
    locationBlock = `
    location / {
        root ${root};
        index ${indexFile || 'index.html'};
        try_files \$uri \$uri/ =404;
${securityHeaders}${hstsHeader}    }
${cacheBlock}
    # 404 handling
    error_page 404 /404.html;`;
  } else if (serverType === 'reverse_proxy') {
    locationBlock = `
    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
${securityHeaders}${hstsHeader}    }`;
  } else if (serverType === 'php') {
    locationBlock = `
    root ${root};
    index ${indexFile || 'index.php index.html'};

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
${securityHeaders}${hstsHeader}    }

    location ~ \\.php$ {
        fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
    }

    location ~ /\\.ht {
        deny all;
    }
${cacheBlock}`;
  } else if (serverType === 'redirect') {
    locationBlock = `
    location / {
        return 301 https://www.${domain}\$request_uri;
    }`;
  }

  const mainBlock = `${httpRedirectBlock}server {
${listenDirectives}
    server_name ${domain} www.${domain};
${sslBlock}${gzipBlock}
    ${accessLogLine.trim()}
    ${errorLogLine.trim()}
${locationBlock}
}`;

  return mainBlock;
}

export default function NginxConfigGenerator() {
  const [serverType, setServerType] = useState<ServerType>('static');
  const [serverName, setServerName] = useState('');
  const [rootDir, setRootDir] = useState('');
  const [proxyPort, setProxyPort] = useState('3000');
  const [enableSsl, setEnableSsl] = useState(true);
  const [enableGzip, setEnableGzip] = useState(true);
  const [enableCache, setEnableCache] = useState(true);
  const [enableSecurity, setEnableSecurity] = useState(true);
  const [enableHsts, setEnableHsts] = useState(true);
  const [certPath, setCertPath] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [indexFile, setIndexFile] = useState('');
  const [accessLog, setAccessLog] = useState('');
  const [errorLog, setErrorLog] = useState('');
  const [copied, setCopied] = useState(false);

  const config = generateConfig({
    serverType, serverName, rootDir, proxyPort,
    enableSsl, enableGzip, enableCache, enableSecurity,
    enableHsts, certPath, keyPath, indexFile, accessLog, errorLog,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* Server type */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Server Type</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(SERVER_TYPE_LABELS) as ServerType[]).map(t => (
            <button
              key={t}
              onClick={() => setServerType(t)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                serverType === t
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {SERVER_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Domain */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Domain Name</label>
          <input
            type="text"
            value={serverName}
            onInput={(e) => setServerName((e.target as HTMLInputElement).value)}
            class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
            placeholder="example.com"
          />
        </div>
        {serverType !== 'redirect' && (
          serverType === 'reverse_proxy' ? (
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1">Upstream Port</label>
              <input
                type="text"
                value={proxyPort}
                onInput={(e) => setProxyPort((e.target as HTMLInputElement).value)}
                class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
                placeholder="3000"
              />
            </div>
          ) : (
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1">Document Root</label>
              <input
                type="text"
                value={rootDir}
                onInput={(e) => setRootDir((e.target as HTMLInputElement).value)}
                class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
                placeholder="/var/www/html"
              />
            </div>
          )
        )}
      </div>

      {/* Options */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Options</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'ssl', label: 'SSL / HTTPS', value: enableSsl, set: setEnableSsl },
            { key: 'gzip', label: 'Gzip Compression', value: enableGzip, set: setEnableGzip },
            { key: 'cache', label: 'Static Asset Cache', value: enableCache, set: setEnableCache },
            { key: 'security', label: 'Security Headers', value: enableSecurity, set: setEnableSecurity },
            { key: 'hsts', label: 'HSTS (requires SSL)', value: enableHsts, set: setEnableHsts },
          ].map(opt => (
            <label key={opt.key} class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={opt.value}
                onChange={() => opt.set(!opt.value)}
                class="accent-accent w-4 h-4"
              />
              <span class="text-sm text-text-muted">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* SSL paths (if enabled) */}
      {enableSsl && (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Certificate Path</label>
            <input
              type="text"
              value={certPath}
              onInput={(e) => setCertPath((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              placeholder="/etc/letsencrypt/live/example.com/fullchain.pem"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Private Key Path</label>
            <input
              type="text"
              value={keyPath}
              onInput={(e) => setKeyPath((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              placeholder="/etc/letsencrypt/live/example.com/privkey.pem"
            />
          </div>
        </div>
      )}

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Generated nginx Config</label>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted max-h-96 overflow-y-auto">{config}</pre>
        <p class="text-xs text-text-muted mt-2">
          Save to <code class="bg-surface px-1 rounded">/etc/nginx/sites-available/your-site</code>, then run <code class="bg-surface px-1 rounded">nginx -t && systemctl reload nginx</code>
        </p>
      </div>
    </div>
  );
}
