import { useState } from 'preact/hooks';

type SiteType = 'static' | 'reverse_proxy' | 'redirect' | 'php' | 'api_gateway';

interface CaddyOptions {
  domain: string;
  siteType: SiteType;
  proxyTarget: string;
  rootDir: string;
  enableCompression: boolean;
  enableHeaders: boolean;
  enableRateLimit: boolean;
  enableBasicAuth: boolean;
  basicAuthUser: string;
  redirectTarget: string;
  phpSocket: string;
  enableLogs: boolean;
  enableMetrics: boolean;
  tlsEmail: string;
}

function generateCaddyfile(opts: CaddyOptions): string {
  const {
    domain, siteType, proxyTarget, rootDir, enableCompression,
    enableHeaders, enableRateLimit, enableBasicAuth, basicAuthUser,
    redirectTarget, phpSocket, enableLogs, enableMetrics, tlsEmail,
  } = opts;

  const d = domain || 'example.com';
  const target = proxyTarget || 'localhost:3000';
  const root = rootDir || '/var/www/html';
  const socket = phpSocket || '/run/php/php8.2-fpm.sock';

  let lines: string[] = [];

  // Global block
  if (tlsEmail || enableMetrics) {
    lines.push('{');
    if (tlsEmail) lines.push(`\temail ${tlsEmail}`);
    if (enableMetrics) lines.push('\tadmin 0.0.0.0:2019');
    lines.push('}', '');
  }

  // Site block
  lines.push(`${d} {`);

  // TLS is automatic in Caddy for public domains — just note it
  if (!d.includes('localhost') && !d.match(/^\d+\.\d+\.\d+\.\d+/)) {
    lines.push('\t# TLS is automatic via Let\'s Encrypt');
  }

  if (enableLogs) {
    lines.push('\tlog {');
    lines.push('\t\toutput file /var/log/caddy/access.log');
    lines.push('\t\tformat json');
    lines.push('\t}');
  }

  if (enableCompression) {
    lines.push('\tencode gzip zstd');
  }

  if (enableHeaders) {
    lines.push('\theader {');
    lines.push('\t\tStrict-Transport-Security "max-age=63072000; includeSubDomains; preload"');
    lines.push('\t\tX-Content-Type-Options nosniff');
    lines.push('\t\tX-Frame-Options SAMEORIGIN');
    lines.push('\t\tReferrer-Policy no-referrer-when-downgrade');
    lines.push('\t\t-Server');
    lines.push('\t}');
  }

  if (enableBasicAuth) {
    lines.push('\tbasicauth {');
    lines.push(`\t\t${basicAuthUser || 'admin'} <hashed-password>`);
    lines.push('\t\t# Generate hash: caddy hash-password --plaintext "yourpassword"');
    lines.push('\t}');
  }

  if (enableRateLimit) {
    lines.push('\t# Rate limiting requires caddy-rate-limit plugin');
    lines.push('\t# caddy add-package github.com/mholt/caddy-ratelimit');
    lines.push('\trate_limit {');
    lines.push('\t\tzone dynamic {');
    lines.push('\t\t\tkey {remote_host}');
    lines.push('\t\t\tevents 100');
    lines.push('\t\t\twindow 1m');
    lines.push('\t\t}');
    lines.push('\t}');
  }

  // Site-type specific config
  if (siteType === 'static') {
    lines.push(`\troot * ${root}`);
    lines.push('\tfile_server');
    lines.push('\ttry_files {path} /index.html');
  } else if (siteType === 'reverse_proxy') {
    lines.push(`\treverse_proxy ${target} {`);
    lines.push('\t\theader_up X-Real-IP {remote_host}');
    lines.push('\t\theader_up X-Forwarded-For {remote_host}');
    lines.push('\t\theader_up X-Forwarded-Proto {scheme}');
    lines.push('\t\thealth_uri /health');
    lines.push('\t\thealth_interval 10s');
    lines.push('\t}');
  } else if (siteType === 'redirect') {
    const redir = redirectTarget || 'https://www.example.com{uri}';
    lines.push(`\tredir ${redir} permanent`);
  } else if (siteType === 'php') {
    lines.push(`\troot * ${root}`);
    lines.push('\tphp_fastcgi unix/' + socket + ' {');
    lines.push('\t\tenv SERVER_NAME {host}');
    lines.push('\t}');
    lines.push('\tfile_server');
    lines.push('\ttry_files {path} /index.php?{query}');
  } else if (siteType === 'api_gateway') {
    lines.push('\t# API Gateway — multiple upstream services');
    lines.push('\thandle /api/v1/users* {');
    lines.push('\t\treverse_proxy localhost:8001');
    lines.push('\t}');
    lines.push('\thandle /api/v1/orders* {');
    lines.push('\t\treverse_proxy localhost:8002');
    lines.push('\t}');
    lines.push('\thandle /api/* {');
    lines.push(`\t\treverse_proxy ${target}`);
    lines.push('\t}');
    lines.push('\thandle {');
    lines.push(`\t\troot * ${root}`);
    lines.push('\t\tfile_server');
    lines.push('\t}');
  }

  lines.push('}');

  return lines.join('\n');
}

const SITE_TYPE_LABELS: Record<SiteType, string> = {
  static: 'Static Site / SPA',
  reverse_proxy: 'Reverse Proxy (Node.js / API)',
  redirect: 'Redirect',
  php: 'PHP (FastCGI)',
  api_gateway: 'API Gateway (multi-upstream)',
};

export default function CaddyfileGenerator() {
  const [opts, setOpts] = useState<CaddyOptions>({
    domain: '',
    siteType: 'reverse_proxy',
    proxyTarget: 'localhost:3000',
    rootDir: '/var/www/html',
    enableCompression: true,
    enableHeaders: true,
    enableRateLimit: false,
    enableBasicAuth: false,
    basicAuthUser: 'admin',
    redirectTarget: '',
    phpSocket: '/run/php/php8.2-fpm.sock',
    enableLogs: false,
    enableMetrics: false,
    tlsEmail: '',
  });
  const [copied, setCopied] = useState(false);

  const update = (k: keyof CaddyOptions, v: string | boolean) => setOpts(o => ({ ...o, [k]: v }));

  const output = generateCaddyfile(opts);

  async function copy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass = "w-full px-3 py-1.5 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const labelClass = "block text-sm font-medium text-text mb-1";
  const checkLabel = "flex items-center gap-2 text-sm text-text cursor-pointer select-none";

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Options */}
      <div class="space-y-4">
        <div>
          <label class={labelClass}>Domain</label>
          <input value={opts.domain} onInput={e => update('domain', (e.target as HTMLInputElement).value)} placeholder="example.com" class={inputClass} />
          <p class="text-xs text-text-muted mt-1">Caddy auto-provisions HTTPS via Let's Encrypt for public domains.</p>
        </div>

        <div>
          <label class={labelClass}>Site Type</label>
          <select value={opts.siteType} onChange={e => update('siteType', (e.target as HTMLSelectElement).value as SiteType)} class={inputClass}>
            {(Object.keys(SITE_TYPE_LABELS) as SiteType[]).map(k => (
              <option key={k} value={k}>{SITE_TYPE_LABELS[k]}</option>
            ))}
          </select>
        </div>

        {(opts.siteType === 'reverse_proxy' || opts.siteType === 'api_gateway') && (
          <div>
            <label class={labelClass}>Proxy Target (host:port)</label>
            <input value={opts.proxyTarget} onInput={e => update('proxyTarget', (e.target as HTMLInputElement).value)} placeholder="localhost:3000" class={inputClass} />
          </div>
        )}

        {(opts.siteType === 'static' || opts.siteType === 'php') && (
          <div>
            <label class={labelClass}>Root Directory</label>
            <input value={opts.rootDir} onInput={e => update('rootDir', (e.target as HTMLInputElement).value)} placeholder="/var/www/html" class={inputClass} />
          </div>
        )}

        {opts.siteType === 'redirect' && (
          <div>
            <label class={labelClass}>Redirect Target URL</label>
            <input value={opts.redirectTarget} onInput={e => update('redirectTarget', (e.target as HTMLInputElement).value)} placeholder="https://www.example.com{uri}" class={inputClass} />
          </div>
        )}

        {opts.siteType === 'php' && (
          <div>
            <label class={labelClass}>PHP-FPM Socket</label>
            <input value={opts.phpSocket} onInput={e => update('phpSocket', (e.target as HTMLInputElement).value)} placeholder="/run/php/php8.2-fpm.sock" class={inputClass} />
          </div>
        )}

        <div>
          <label class={labelClass}>Let's Encrypt Email (optional)</label>
          <input value={opts.tlsEmail} onInput={e => update('tlsEmail', (e.target as HTMLInputElement).value)} placeholder="admin@example.com" class={inputClass} />
        </div>

        <div class="space-y-2 pt-1">
          <label class={checkLabel}><input type="checkbox" checked={opts.enableCompression} onChange={e => update('enableCompression', (e.target as HTMLInputElement).checked)} /> Gzip + Zstd compression</label>
          <label class={checkLabel}><input type="checkbox" checked={opts.enableHeaders} onChange={e => update('enableHeaders', (e.target as HTMLInputElement).checked)} /> Security headers (HSTS, X-Frame-Options…)</label>
          <label class={checkLabel}><input type="checkbox" checked={opts.enableLogs} onChange={e => update('enableLogs', (e.target as HTMLInputElement).checked)} /> Access logs (JSON format)</label>
          <label class={checkLabel}><input type="checkbox" checked={opts.enableMetrics} onChange={e => update('enableMetrics', (e.target as HTMLInputElement).checked)} /> Admin API (metrics endpoint :2019)</label>
          <label class={checkLabel}><input type="checkbox" checked={opts.enableRateLimit} onChange={e => update('enableRateLimit', (e.target as HTMLInputElement).checked)} /> Rate limiting (requires caddy-rate-limit plugin)</label>
          <label class={checkLabel}><input type="checkbox" checked={opts.enableBasicAuth} onChange={e => update('enableBasicAuth', (e.target as HTMLInputElement).checked)} /> Basic Auth</label>
        </div>

        {opts.enableBasicAuth && (
          <div>
            <label class={labelClass}>Basic Auth Username</label>
            <input value={opts.basicAuthUser} onInput={e => update('basicAuthUser', (e.target as HTMLInputElement).value)} placeholder="admin" class={inputClass} />
          </div>
        )}
      </div>

      {/* Output */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text">Caddyfile</span>
          <button onClick={copy} class="text-xs px-3 py-1 rounded border border-border hover:bg-surface-hover transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-sm font-mono overflow-auto max-h-[500px] whitespace-pre text-text leading-relaxed">{output}</pre>
        <p class="text-xs text-text-muted">Save as <code class="bg-surface px-1 rounded">Caddyfile</code> (no extension) and run: <code class="bg-surface px-1 rounded">caddy run</code> or <code class="bg-surface px-1 rounded">caddy start</code></p>
      </div>
    </div>
  );
}
