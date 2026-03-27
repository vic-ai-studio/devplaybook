import { useState } from 'preact/hooks';

type UseCase = 'spa' | 'wordpress' | 'redirect' | 'security' | 'custom';

const USE_CASE_LABELS: Record<UseCase, string> = {
  spa: 'Single Page App (React/Vue)',
  wordpress: 'WordPress / PHP CMS',
  redirect: 'HTTPS + WWW Redirect',
  security: 'Security Hardening',
  custom: 'Custom / Static Site',
};

function generateHtaccess(opts: {
  useCase: UseCase;
  enableHttps: boolean;
  enableWww: boolean;
  enableGzip: boolean;
  enableCache: boolean;
  enableSecurity: boolean;
  enableHotlinkProtection: boolean;
  enableDirectoryListing: boolean;
  customDomain: string;
  customRedirectFrom: string;
  customRedirectTo: string;
}): string {
  const {
    useCase, enableHttps, enableWww, enableGzip, enableCache,
    enableSecurity, enableHotlinkProtection, enableDirectoryListing,
    customDomain, customRedirectFrom, customRedirectTo,
  } = opts;

  const lines: string[] = ['# Generated .htaccess', ''];

  // Engine on
  lines.push('RewriteEngine On', '');

  // HTTPS redirect
  if (enableHttps) {
    lines.push(
      '# Force HTTPS',
      'RewriteCond %{HTTPS} off',
      'RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]',
      '',
    );
  }

  // WWW redirect
  if (enableWww && customDomain) {
    lines.push(
      '# Force www',
      `RewriteCond %{HTTP_HOST} !^www\\.${customDomain.replace(/\./g, '\\.')} [NC]`,
      `RewriteRule ^ https://www.${customDomain}%{REQUEST_URI} [L,R=301]`,
      '',
    );
  }

  // Use-case specific rules
  if (useCase === 'spa') {
    lines.push(
      '# SPA — route all requests to index.html',
      'RewriteCond %{REQUEST_FILENAME} !-f',
      'RewriteCond %{REQUEST_FILENAME} !-d',
      'RewriteRule . /index.html [L]',
      '',
    );
  } else if (useCase === 'wordpress') {
    lines.push(
      '# WordPress permalink rewrite',
      'RewriteBase /',
      'RewriteRule ^index\\.php$ - [L]',
      'RewriteCond %{REQUEST_FILENAME} !-f',
      'RewriteCond %{REQUEST_FILENAME} !-d',
      'RewriteRule . /index.php [L]',
      '',
    );
  } else if (useCase === 'redirect' && customRedirectFrom && customRedirectTo) {
    lines.push(
      '# Custom redirect',
      `Redirect 301 ${customRedirectFrom} ${customRedirectTo}`,
      '',
    );
  }

  // Directory listing
  if (!enableDirectoryListing) {
    lines.push('# Disable directory listing', 'Options -Indexes', '');
  }

  // Security headers
  if (enableSecurity) {
    lines.push(
      '# Security headers',
      '<IfModule mod_headers.c>',
      '    Header always set X-Frame-Options "SAMEORIGIN"',
      '    Header always set X-Content-Type-Options "nosniff"',
      '    Header always set X-XSS-Protection "1; mode=block"',
      '    Header always set Referrer-Policy "no-referrer-when-downgrade"',
      '    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"',
      '</IfModule>',
      '',
      '# Block access to sensitive files',
      '<FilesMatch "(\\.env|\\.htpasswd|\\.git|composer\\.lock|package-lock\\.json)$">',
      '    Order Allow,Deny',
      '    Deny from all',
      '</FilesMatch>',
      '',
    );
  }

  // Hotlink protection
  if (enableHotlinkProtection && customDomain) {
    lines.push(
      '# Hotlink protection',
      'RewriteCond %{HTTP_REFERER} !^$',
      `RewriteCond %{HTTP_REFERER} !^https?://(www\\.)?${customDomain.replace(/\./g, '\\.')}/ [NC]`,
      'RewriteRule \\.(jpg|jpeg|png|gif|webp|svg)$ - [F,NC,L]',
      '',
    );
  }

  // Gzip compression
  if (enableGzip) {
    lines.push(
      '# Gzip compression',
      '<IfModule mod_deflate.c>',
      '    AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript',
      '    AddOutputFilterByType DEFLATE application/javascript application/json application/xml',
      '    AddOutputFilterByType DEFLATE image/svg+xml font/woff font/woff2',
      '</IfModule>',
      '',
    );
  }

  // Browser caching
  if (enableCache) {
    lines.push(
      '# Browser caching',
      '<IfModule mod_expires.c>',
      '    ExpiresActive On',
      '    ExpiresByType image/jpg "access plus 1 year"',
      '    ExpiresByType image/jpeg "access plus 1 year"',
      '    ExpiresByType image/png "access plus 1 year"',
      '    ExpiresByType image/gif "access plus 1 year"',
      '    ExpiresByType image/webp "access plus 1 year"',
      '    ExpiresByType image/svg+xml "access plus 1 year"',
      '    ExpiresByType text/css "access plus 1 month"',
      '    ExpiresByType application/javascript "access plus 1 month"',
      '    ExpiresByType font/woff "access plus 1 year"',
      '    ExpiresByType font/woff2 "access plus 1 year"',
      '    ExpiresByType text/html "access plus 1 hour"',
      '</IfModule>',
      '',
    );
  }

  return lines.join('\n').trim();
}

export default function HtaccessGenerator() {
  const [useCase, setUseCase] = useState<UseCase>('spa');
  const [enableHttps, setEnableHttps] = useState(true);
  const [enableWww, setEnableWww] = useState(false);
  const [enableGzip, setEnableGzip] = useState(true);
  const [enableCache, setEnableCache] = useState(true);
  const [enableSecurity, setEnableSecurity] = useState(true);
  const [enableHotlinkProtection, setEnableHotlinkProtection] = useState(false);
  const [enableDirectoryListing, setEnableDirectoryListing] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [customRedirectFrom, setCustomRedirectFrom] = useState('/old-page');
  const [customRedirectTo, setCustomRedirectTo] = useState('/new-page');
  const [copied, setCopied] = useState(false);

  const config = generateHtaccess({
    useCase, enableHttps, enableWww, enableGzip, enableCache,
    enableSecurity, enableHotlinkProtection, enableDirectoryListing,
    customDomain, customRedirectFrom, customRedirectTo,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* Use case */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Use Case</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(USE_CASE_LABELS) as UseCase[]).map(t => (
            <button
              key={t}
              onClick={() => setUseCase(t)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                useCase === t
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {USE_CASE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Domain */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">
          Domain Name <span class="text-xs opacity-60">(used for www redirect &amp; hotlink protection)</span>
        </label>
        <input
          type="text"
          value={customDomain}
          onInput={(e) => setCustomDomain((e.target as HTMLInputElement).value)}
          class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
          placeholder="example.com"
        />
      </div>

      {/* Redirect paths (only for redirect use case) */}
      {useCase === 'redirect' && (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Redirect From</label>
            <input
              type="text"
              value={customRedirectFrom}
              onInput={(e) => setCustomRedirectFrom((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              placeholder="/old-page"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Redirect To</label>
            <input
              type="text"
              value={customRedirectTo}
              onInput={(e) => setCustomRedirectTo((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
              placeholder="/new-page"
            />
          </div>
        </div>
      )}

      {/* Options */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Options</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'https', label: 'Force HTTPS', value: enableHttps, set: setEnableHttps },
            { key: 'www', label: 'Force www', value: enableWww, set: setEnableWww },
            { key: 'gzip', label: 'Gzip Compression', value: enableGzip, set: setEnableGzip },
            { key: 'cache', label: 'Browser Caching', value: enableCache, set: setEnableCache },
            { key: 'security', label: 'Security Headers', value: enableSecurity, set: setEnableSecurity },
            { key: 'hotlink', label: 'Hotlink Protection', value: enableHotlinkProtection, set: setEnableHotlinkProtection },
            { key: 'dirlisting', label: 'Allow Directory Listing', value: enableDirectoryListing, set: setEnableDirectoryListing },
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

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Generated .htaccess</label>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted max-h-96 overflow-y-auto">{config}</pre>
        <p class="text-xs text-text-muted mt-2">
          Save as <code class="bg-surface px-1 rounded">.htaccess</code> in your web root. Requires Apache with <code class="bg-surface px-1 rounded">mod_rewrite</code> and <code class="bg-surface px-1 rounded">AllowOverride All</code> enabled.
        </p>
      </div>
    </div>
  );
}
