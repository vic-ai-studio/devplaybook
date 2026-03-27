import { useState } from 'preact/hooks';

type DirectiveName =
  | 'default-src' | 'script-src' | 'style-src' | 'img-src' | 'font-src'
  | 'connect-src' | 'frame-src' | 'object-src' | 'base-uri' | 'form-action'
  | 'frame-ancestors' | 'upgrade-insecure-requests' | 'block-all-mixed-content';

interface Directive {
  name: DirectiveName;
  enabled: boolean;
  sources: string;
  noSources?: boolean; // for flags like upgrade-insecure-requests
  description: string;
}

const DEFAULT_DIRECTIVES: Directive[] = [
  { name: 'default-src', enabled: true, sources: "'self'", description: "Fallback for all fetch directives" },
  { name: 'script-src', enabled: true, sources: "'self'", description: "JavaScript sources" },
  { name: 'style-src', enabled: true, sources: "'self' 'unsafe-inline'", description: "CSS sources" },
  { name: 'img-src', enabled: true, sources: "'self' data: https:", description: "Image sources" },
  { name: 'font-src', enabled: false, sources: "'self' https://fonts.gstatic.com", description: "Font sources" },
  { name: 'connect-src', enabled: false, sources: "'self'", description: "XHR, fetch, WebSocket targets" },
  { name: 'frame-src', enabled: false, sources: "'none'", description: "Frame/iframe sources" },
  { name: 'object-src', enabled: true, sources: "'none'", description: "Plugin sources (Flash, etc.)" },
  { name: 'base-uri', enabled: true, sources: "'self'", description: "Restricts <base> element URLs" },
  { name: 'form-action', enabled: false, sources: "'self'", description: "Form submission targets" },
  { name: 'frame-ancestors', enabled: false, sources: "'none'", description: "Replaces X-Frame-Options" },
  { name: 'upgrade-insecure-requests', enabled: false, sources: '', noSources: true, description: "Auto-upgrade HTTP to HTTPS" },
  { name: 'block-all-mixed-content', enabled: false, sources: '', noSources: true, description: "Block HTTP on HTTPS pages" },
];

function buildCsp(directives: Directive[]): string {
  return directives
    .filter(d => d.enabled)
    .map(d => d.noSources ? d.name : `${d.name} ${d.sources.trim()}`)
    .join('; ');
}

export default function CspHeaderBuilder() {
  const [directives, setDirectives] = useState<Directive[]>(DEFAULT_DIRECTIVES);
  const [copied, setCopied] = useState(false);
  const [reportUri, setReportUri] = useState('');

  function toggle(name: DirectiveName) {
    setDirectives(prev => prev.map(d => d.name === name ? { ...d, enabled: !d.enabled } : d));
  }

  function updateSources(name: DirectiveName, val: string) {
    setDirectives(prev => prev.map(d => d.name === name ? { ...d, sources: val } : d));
  }

  const csp = buildCsp(directives) + (reportUri ? `; report-uri ${reportUri}` : '');

  async function copy() {
    await navigator.clipboard.writeText(csp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const nginxSnippet = `add_header Content-Security-Policy "${csp}" always;`;
  const apacheSnippet = `Header always set Content-Security-Policy "${csp}"`;

  return (
    <div class="space-y-5">
      {/* Directives table */}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left">
              <th class="pb-2 pr-3 text-text-muted font-medium w-8">On</th>
              <th class="pb-2 pr-3 text-text-muted font-medium">Directive</th>
              <th class="pb-2 text-text-muted font-medium">Sources / Value</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            {directives.map(d => (
              <tr key={d.name} class={d.enabled ? '' : 'opacity-50'}>
                <td class="py-2 pr-3">
                  <input
                    type="checkbox"
                    checked={d.enabled}
                    onChange={() => toggle(d.name)}
                    class="accent-accent w-4 h-4 cursor-pointer"
                  />
                </td>
                <td class="py-2 pr-3">
                  <code class="font-mono text-xs text-primary">{d.name}</code>
                  <p class="text-xs text-text-muted mt-0.5">{d.description}</p>
                </td>
                <td class="py-2">
                  {d.noSources ? (
                    <span class="text-xs text-text-muted italic">(no value needed)</span>
                  ) : (
                    <input
                      type="text"
                      value={d.sources}
                      onInput={(e) => updateSources(d.name, (e.target as HTMLInputElement).value)}
                      disabled={!d.enabled}
                      class="w-full px-2 py-1 bg-surface border border-border rounded font-mono text-xs focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Report-URI */}
      <div>
        <label class="block text-sm text-text-muted mb-1">report-uri (optional)</label>
        <input
          type="text"
          value={reportUri}
          onInput={(e) => setReportUri((e.target as HTMLInputElement).value)}
          placeholder="https://example.com/csp-report"
          class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
        />
      </div>

      {/* CSP Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Generated CSP Header</label>
          <button
            onClick={copy}
            class="text-sm px-3 py-1 border border-border rounded hover:border-accent hover:text-accent transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy value'}
          </button>
        </div>
        <div class="bg-surface border border-border rounded p-4 font-mono text-xs break-all text-green-400">
          {csp || '(enable at least one directive)'}
        </div>
      </div>

      {/* Server snippets */}
      <div class="space-y-3">
        <div>
          <p class="text-xs font-medium text-text-muted mb-1">nginx</p>
          <div class="bg-surface border border-border rounded p-3 font-mono text-xs text-text break-all">
            {nginxSnippet}
          </div>
        </div>
        <div>
          <p class="text-xs font-medium text-text-muted mb-1">Apache (.htaccess)</p>
          <div class="bg-surface border border-border rounded p-3 font-mono text-xs text-text break-all">
            {apacheSnippet}
          </div>
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Tip: Use <code class="bg-surface px-1 rounded">Content-Security-Policy-Report-Only</code> first to test without breaking your site.
      </p>
    </div>
  );
}
