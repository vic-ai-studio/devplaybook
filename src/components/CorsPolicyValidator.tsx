import { useState } from 'preact/hooks';

const SAMPLE_HEADERS = `Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Request-ID
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
Access-Control-Expose-Headers: X-Request-ID, X-Rate-Limit-Remaining`;

type CorsIssue = {
  level: 'critical' | 'warning' | 'info' | 'pass';
  rule: string;
  detail: string;
};

function parseHeaders(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of raw.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();
    if (key) map.set(key, value);
  }
  return map;
}

function validateCors(headers: Map<string, string>): CorsIssue[] {
  const issues: CorsIssue[] = [];

  const origin = headers.get('access-control-allow-origin');
  const methods = headers.get('access-control-allow-methods');
  const allowHeaders = headers.get('access-control-allow-headers');
  const credentials = headers.get('access-control-allow-credentials');
  const maxAge = headers.get('access-control-max-age');
  const expose = headers.get('access-control-expose-headers');

  // Origin
  if (!origin) {
    issues.push({ level: 'critical', rule: 'Access-Control-Allow-Origin missing', detail: 'This header is required for CORS to work. Without it, browsers block all cross-origin responses.' });
  } else if (origin === '*') {
    if (credentials === 'true') {
      issues.push({ level: 'critical', rule: 'Wildcard origin with credentials', detail: 'Access-Control-Allow-Origin: * cannot be combined with Access-Control-Allow-Credentials: true. Browsers reject this combination. Use a specific origin or remove credentials.' });
    } else {
      issues.push({ level: 'warning', rule: 'Wildcard origin (Allow-Origin: *)', detail: 'Any origin can access this resource. This is fine for truly public APIs, but dangerous for authenticated endpoints. Consider restricting to specific origins.' });
    }
  } else {
    // Check origin format
    try {
      new URL(origin);
      issues.push({ level: 'pass', rule: 'Specific origin configured', detail: `Restricting access to: ${origin}. Make sure your backend validates the Origin header dynamically if you need to support multiple origins.` });
    } catch {
      issues.push({ level: 'warning', rule: 'Invalid origin format', detail: `"${origin}" doesn't look like a valid URL. Access-Control-Allow-Origin should be a full URL like https://app.example.com` });
    }
  }

  // Methods
  if (!methods) {
    issues.push({ level: 'info', rule: 'Access-Control-Allow-Methods missing', detail: 'Without this header, only simple methods (GET, HEAD, POST) are allowed. Add it if you need PUT, DELETE, PATCH, or custom methods.' });
  } else {
    const methodList = methods.split(',').map(m => m.trim().toUpperCase());
    if (methodList.includes('*')) {
      issues.push({ level: 'warning', rule: 'Wildcard methods (*)', detail: 'Allowing all methods is overly permissive. List only the methods your API supports: GET, POST, PUT, DELETE, OPTIONS.' });
    } else {
      issues.push({ level: 'pass', rule: 'Methods explicitly defined', detail: `Allowed: ${methodList.join(', ')}` });
    }
    if (!methodList.includes('OPTIONS')) {
      issues.push({ level: 'warning', rule: 'OPTIONS not in allowed methods', detail: 'Preflight requests use the OPTIONS method. If your endpoint handles preflight separately (a common pattern), this is fine. Otherwise, add OPTIONS.' });
    }
    const riskyMethods = methodList.filter(m => ['DELETE', 'PATCH', 'PUT'].includes(m));
    if (riskyMethods.length > 0 && origin === '*') {
      issues.push({ level: 'warning', rule: `Write methods with wildcard origin`, detail: `Allowing ${riskyMethods.join(', ')} from any origin (*) is risky for non-public APIs. Use specific origins.` });
    }
  }

  // Headers
  if (!allowHeaders) {
    issues.push({ level: 'info', rule: 'Access-Control-Allow-Headers missing', detail: 'Without this, only simple headers (Accept, Content-Type without body, Accept-Language) are allowed. Add it if your API uses Authorization, X-API-Key, or custom headers.' });
  } else {
    const headerList = allowHeaders.split(',').map(h => h.trim().toLowerCase());
    if (headerList.includes('*')) {
      issues.push({ level: 'warning', rule: 'Wildcard allowed headers (*)', detail: 'Allowing all headers is overly broad. Enumerate only the headers your API accepts.' });
    } else {
      issues.push({ level: 'pass', rule: 'Request headers explicitly defined', detail: `Allowed: ${headerList.join(', ')}` });
    }
    if (!headerList.includes('authorization') && !headerList.includes('*')) {
      issues.push({ level: 'info', rule: 'Authorization header not listed', detail: 'If your API uses Bearer tokens or Basic auth, add "Authorization" to Access-Control-Allow-Headers.' });
    }
    if (!headerList.includes('content-type') && !headerList.includes('*')) {
      issues.push({ level: 'info', rule: 'Content-Type not in allowed headers', detail: 'JSON APIs typically need Content-Type in Access-Control-Allow-Headers for non-simple content type values.' });
    }
  }

  // Credentials
  if (credentials === 'true') {
    issues.push({ level: 'info', rule: 'Credentials allowed', detail: 'Access-Control-Allow-Credentials: true enables cookies and HTTP auth in cross-origin requests. Requires a specific origin (not *) and client-side withCredentials: true.' });
    if (origin !== '*') {
      issues.push({ level: 'pass', rule: 'Credentials + specific origin', detail: 'Correct combination: specific origin with credentials enabled.' });
    }
  } else if (!credentials) {
    issues.push({ level: 'info', rule: 'Credentials not enabled', detail: 'Cross-origin cookies and HTTP auth are blocked. This is the safer default — only enable credentials if your frontend explicitly needs them.' });
  } else if (credentials.toLowerCase() !== 'true') {
    issues.push({ level: 'warning', rule: `Invalid credentials value: "${credentials}"`, detail: 'Access-Control-Allow-Credentials must be exactly "true" (lowercase). Other values are ignored by browsers.' });
  }

  // Max-Age
  if (!maxAge) {
    issues.push({ level: 'info', rule: 'Access-Control-Max-Age missing', detail: 'Without this, browsers send a preflight OPTIONS request before every cross-origin request. Add Max-Age to cache preflight results (e.g. 86400 = 24 hours) and reduce latency.' });
  } else {
    const age = parseInt(maxAge, 10);
    if (isNaN(age) || age < 0) {
      issues.push({ level: 'warning', rule: `Invalid Max-Age: "${maxAge}"`, detail: 'Max-Age must be a non-negative integer (seconds).' });
    } else if (age === 0) {
      issues.push({ level: 'info', rule: 'Max-Age: 0 (no caching)', detail: 'Preflight responses will not be cached. Consider setting a positive value (e.g. 600) to reduce preflight overhead.' });
    } else if (age > 86400) {
      issues.push({ level: 'warning', rule: `Max-Age ${age}s exceeds 24 hours`, detail: 'Chrome caps preflight cache at 7200s (2h). Firefox caps at 86400s (24h). Values above 86400 are ignored by most browsers.' });
    } else {
      issues.push({ level: 'pass', rule: `Preflight cache: ${age}s`, detail: `Browsers will cache preflight results for ${Math.round(age / 60)} minutes.` });
    }
  }

  // Expose-Headers
  if (expose) {
    const exposeList = expose.split(',').map(h => h.trim().toLowerCase());
    issues.push({ level: 'pass', rule: 'Expose-Headers defined', detail: `Frontend JavaScript can read: ${exposeList.join(', ')}. Only headers in this list (plus CORS-safelisted headers) are accessible via XHR/fetch.` });
  }

  return issues;
}

const LEVEL_STYLES = {
  critical: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ', text: 'text-blue-400' },
  pass: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400' },
};

export default function CorsPolicyValidator() {
  const [input, setInput] = useState(SAMPLE_HEADERS);
  const [issues, setIssues] = useState<CorsIssue[] | null>(null);
  const [headers, setHeaders] = useState<Map<string, string> | null>(null);

  const handleValidate = () => {
    const parsed = parseHeaders(input);
    setHeaders(parsed);
    setIssues(validateCors(parsed));
  };

  const handleLoad = () => { setInput(SAMPLE_HEADERS); setIssues(null); setHeaders(null); };
  const handleClear = () => { setInput(''); setIssues(null); setHeaders(null); };

  const criticals = issues?.filter(i => i.level === 'critical') ?? [];
  const warnings = issues?.filter(i => i.level === 'warning') ?? [];

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">CORS response headers (one per line)</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setIssues(null); setHeaders(null); }}
          rows={10}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Access-Control-Allow-Origin: https://app.example.com&#10;Access-Control-Allow-Methods: GET, POST, OPTIONS&#10;..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Validate CORS Policy
      </button>

      {issues && headers && (
        <div class="space-y-4">
          {/* Summary */}
          <div class="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg text-sm flex-wrap">
            <span class="font-medium text-text">Policy:</span>
            {criticals.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{criticals.length} critical</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {criticals.length === 0 && warnings.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">No critical issues</span>}
            <span class="text-text-muted text-xs ml-auto">{headers.size} header{headers.size > 1 ? 's' : ''} parsed</span>
          </div>

          {/* Issues */}
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                      <span class="text-sm font-medium text-text">{issue.rule}</span>
                    </div>
                    <p class="text-xs text-text-muted">{issue.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Parsed headers */}
          {headers.size > 0 && (
            <div class="bg-surface border border-border rounded-lg p-3">
              <p class="text-xs font-medium text-text mb-2">Parsed headers</p>
              <div class="space-y-1">
                {Array.from(headers).map(([k, v]) => (
                  <div key={k} class="flex gap-2 text-xs font-mono">
                    <span class="text-accent shrink-0">{k}:</span>
                    <span class="text-text break-all">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">How to get your CORS headers</p>
        <ul class="space-y-1 list-disc list-inside font-mono">
          <li>curl -I -X OPTIONS https://your-api.com/endpoint</li>
          <li>Browser DevTools → Network tab → Headers → Response headers</li>
          <li>Filter for "Access-Control-" prefix</li>
        </ul>
        <p class="mt-2">This tool validates static header configuration — for live CORS testing, use the <strong>CORS Tester</strong> tool.</p>
      </div>
    </div>
  );
}
