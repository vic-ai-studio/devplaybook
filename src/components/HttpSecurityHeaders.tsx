import { useState } from 'preact/hooks';

interface HeaderConfig {
  enabled: boolean;
  value: string;
  description: string;
}

const DEFAULTS: Record<string, HeaderConfig> = {
  'Strict-Transport-Security': { enabled: true, value: 'max-age=31536000; includeSubDomains', description: 'Enforce HTTPS for 1 year, including subdomains.' },
  'X-Frame-Options': { enabled: true, value: 'DENY', description: 'Prevent clickjacking — deny all iframe embedding.' },
  'X-Content-Type-Options': { enabled: true, value: 'nosniff', description: 'Prevent MIME-type sniffing attacks.' },
  'Referrer-Policy': { enabled: true, value: 'strict-origin-when-cross-origin', description: 'Send full referrer to same-origin, only origin to cross-origin.' },
  'X-XSS-Protection': { enabled: false, value: '1; mode=block', description: 'Legacy XSS filter (deprecated, use CSP instead).' },
  'Permissions-Policy': { enabled: true, value: 'camera=(), microphone=(), geolocation=()', description: 'Disable camera, microphone, and geolocation APIs.' },
  'Content-Security-Policy': { enabled: false, value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:", description: 'Control which resources the page can load (configure carefully).' },
};

export default function HttpSecurityHeaders() {
  const [headers, setHeaders] = useState(DEFAULTS);
  const [copied, setCopied] = useState<string | null>(null);

  const toggle = (name: string) => setHeaders(h => ({ ...h, [name]: { ...h[name], enabled: !h[name].enabled } }));
  const updateValue = (name: string, value: string) => setHeaders(h => ({ ...h, [name]: { ...h[name], value } }));

  const enabled = Object.entries(headers).filter(([, v]) => v.enabled);

  const nginxConfig = `# nginx security headers\n` + enabled.map(([k, v]) => `add_header ${k} "${v.value}" always;`).join('\n');
  const apacheConfig = `# Apache security headers\n` + enabled.map(([k, v]) => `Header always set ${k} "${v.value}"`).join('\n');

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });
  };

  return (
    <div class="space-y-5">
      <div class="space-y-3">
        {Object.entries(headers).map(([name, cfg]) => (
          <div key={name} class={`rounded-lg border p-4 transition-colors ${cfg.enabled ? 'border-border bg-bg-card' : 'border-border/40 bg-bg opacity-60'}`}>
            <div class="flex items-start gap-3">
              <input type="checkbox" checked={cfg.enabled} onChange={() => toggle(name)} class="mt-1 w-4 h-4 accent-primary cursor-pointer shrink-0" />
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap gap-2 items-center mb-1">
                  <span class="font-mono text-sm font-medium text-text">{name}</span>
                </div>
                <p class="text-xs text-text-muted mb-2">{cfg.description}</p>
                {cfg.enabled && (
                  <input
                    type="text"
                    value={cfg.value}
                    onInput={e => updateValue(name, (e.target as HTMLInputElement).value)}
                    class="w-full bg-bg border border-border rounded px-2 py-1.5 font-mono text-xs text-text focus:outline-none focus:border-primary transition-colors"
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div class="space-y-3">
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">nginx Configuration</label>
            <button onClick={() => copy(nginxConfig, 'nginx')} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
              {copied === 'nginx' ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text overflow-x-auto whitespace-pre">{nginxConfig}</pre>
        </div>
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">Apache .htaccess</label>
            <button onClick={() => copy(apacheConfig, 'apache')} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
              {copied === 'apache' ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text overflow-x-auto whitespace-pre">{apacheConfig}</pre>
        </div>
      </div>
    </div>
  );
}
