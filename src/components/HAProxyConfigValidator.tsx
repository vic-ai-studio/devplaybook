import { useState } from 'preact/hooks';

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  detail?: string;
}

function validateHAProxyConfig(config: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const lines = config.split('\n');

  let hasFrontend = false;
  let hasBackend = false;
  let hasGlobal = false;
  let hasDefaults = false;
  let currentSection = '';
  const backends: string[] = [];
  const usedBackends: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    const lineNum = i + 1;

    if (!line || line.startsWith('#')) continue;

    // Section detection
    if (/^global\s*$/.test(line)) { hasGlobal = true; currentSection = 'global'; continue; }
    if (/^defaults\s*$/.test(line)) { hasDefaults = true; currentSection = 'defaults'; continue; }
    if (/^frontend\s+/.test(line)) { hasFrontend = true; currentSection = 'frontend'; continue; }
    if (/^backend\s+/.test(line)) {
      const name = line.split(/\s+/)[1];
      if (name) backends.push(name);
      hasBackend = true;
      currentSection = 'backend';
      continue;
    }
    if (/^listen\s+/.test(line)) { currentSection = 'listen'; continue; }

    // Check 'use_backend' / 'default_backend' references
    const useBackendMatch = line.match(/(?:use_backend|default_backend)\s+(\S+)/);
    if (useBackendMatch) usedBackends.push(useBackendMatch[1]);

    // Validate bind directive
    if (/^bind\s+/.test(line)) {
      if (!/^bind\s+[\w.:*]+:\d+/.test(line)) {
        results.push({ type: 'error', line: lineNum, message: 'Invalid bind directive', detail: 'Expected format: bind *:80 or bind 0.0.0.0:443' });
      }
    }

    // Validate server lines in backend
    if (/^server\s+/.test(line) && currentSection === 'backend') {
      const parts = line.split(/\s+/);
      if (parts.length < 3) {
        results.push({ type: 'error', line: lineNum, message: 'Incomplete server directive', detail: 'Expected: server <name> <ip>:<port> [options]' });
      } else {
        const addr = parts[2];
        if (!/^\S+:\d+$/.test(addr)) {
          results.push({ type: 'warning', line: lineNum, message: 'Server address should be host:port', detail: `Got: ${addr}` });
        }
        if (!line.includes('check')) {
          results.push({ type: 'warning', line: lineNum, message: 'Server missing health check', detail: 'Add "check" option for health monitoring: server s1 127.0.0.1:8080 check' });
        }
      }
    }

    // Detect plain-text passwords
    if (/password\s+\S+/.test(line) && !/password\s+\$/.test(line)) {
      results.push({ type: 'warning', line: lineNum, message: 'Possible plaintext password detected', detail: 'Use hashed passwords ($apr1$...) in production. Generate with: printf "user1:$(openssl passwd -apr1 mypassword)\\n"' });
    }

    // Log directive check in global
    if (currentSection === 'global' && /^log\s+/.test(line)) {
      if (!/^log\s+\S+\s+(local\d|daemon|syslog)/.test(line)) {
        results.push({ type: 'warning', line: lineNum, message: 'Unusual log facility', detail: 'Common: log 127.0.0.1 local0' });
      }
    }

    // maxconn in defaults/global
    if (/^maxconn\s+\d+/.test(line)) {
      const val = parseInt(line.split(/\s+/)[1]);
      if (val < 1000) {
        results.push({ type: 'warning', line: lineNum, message: `Low maxconn value (${val})`, detail: 'Consider at least 1000 for production. Default is 2000.' });
      }
    }

    // mode check
    if (/^mode\s+/.test(line)) {
      const mode = line.split(/\s+/)[1];
      if (mode !== 'http' && mode !== 'tcp') {
        results.push({ type: 'error', line: lineNum, message: `Invalid mode: ${mode}`, detail: 'Allowed values: http, tcp' });
      }
    }

    // balance algorithm
    if (/^balance\s+/.test(line)) {
      const algo = line.split(/\s+/)[1];
      const validAlgos = ['roundrobin', 'leastconn', 'static-rr', 'first', 'source', 'uri', 'url_param', 'hdr', 'rdp-cookie', 'random'];
      if (!validAlgos.includes(algo)) {
        results.push({ type: 'warning', line: lineNum, message: `Unknown balance algorithm: ${algo}`, detail: `Known: ${validAlgos.join(', ')}` });
      }
    }

    // timeout format check
    if (/^timeout\s+/.test(line)) {
      const parts = line.split(/\s+/);
      if (parts.length < 3 || !/^\d+[smh]?$/.test(parts[2])) {
        results.push({ type: 'warning', line: lineNum, message: 'Timeout value may be invalid', detail: 'Use format: timeout connect 5s (or 5000ms)' });
      }
    }

    // SSL/TLS check
    if (/ssl\s+crt\s+/.test(line)) {
      const certMatch = line.match(/crt\s+(\S+)/);
      if (certMatch && !certMatch[1].endsWith('.pem') && !certMatch[1].endsWith('.crt')) {
        results.push({ type: 'warning', line: lineNum, message: 'SSL certificate path should end in .pem or .crt', detail: certMatch[1] });
      }
      if (!line.includes('alpn') && !line.includes('ssl-min-ver')) {
        results.push({ type: 'info', line: lineNum, message: 'Consider adding modern TLS options', detail: 'Add: ssl-min-ver TLSv1.2 alpn h2,http/1.1' });
      }
    }

    // option forwardfor
    if (/^option\s+forwardfor/.test(line) && currentSection !== 'frontend' && currentSection !== 'defaults') {
      results.push({ type: 'info', line: lineNum, message: 'forwardfor is typically set in frontend or defaults' });
    }
  }

  if (!hasGlobal) results.push({ type: 'warning', message: 'Missing "global" section', detail: 'The global section configures process-level settings like log and maxconn.' });
  if (!hasDefaults) results.push({ type: 'warning', message: 'Missing "defaults" section', detail: 'Defaults set common options (timeout, mode) inherited by frontend/backend.' });
  if (!hasFrontend) results.push({ type: 'error', message: 'No frontend section found', detail: 'At least one frontend or listen section is required to accept connections.' });
  if (!hasBackend) results.push({ type: 'warning', message: 'No backend section found', detail: 'Without a backend, the frontend has nowhere to forward traffic.' });

  // Cross-reference backends
  for (const used of usedBackends) {
    if (!backends.includes(used) && !used.startsWith('%[') && used !== 'DENY') {
      results.push({ type: 'error', message: `Referenced backend "${used}" is not defined`, detail: 'Add a backend block: backend ' + used });
    }
  }

  if (results.length === 0) {
    results.push({ type: 'info', message: 'No issues found', detail: 'Configuration looks valid. Test with: haproxy -c -f haproxy.cfg' });
  }

  return results;
}

const EXAMPLE_CONFIG = `global
    log 127.0.0.1 local0
    log 127.0.0.1 local1 notice
    maxconn 4096
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    timeout connect 5s
    timeout client  30s
    timeout server  30s

frontend http_front
    bind *:80
    default_backend http_back

backend http_back
    balance roundrobin
    server web1 127.0.0.1:8080 check
    server web2 127.0.0.1:8081 check
`;

export default function HAProxyConfigValidator() {
  const [config, setConfig] = useState('');
  const [results, setResults] = useState<ValidationResult[] | null>(null);

  function validate() {
    const r = validateHAProxyConfig(config);
    setResults(r);
  }

  function loadExample() {
    setConfig(EXAMPLE_CONFIG);
    setResults(null);
  }

  const errors = results?.filter(r => r.type === 'error') ?? [];
  const warnings = results?.filter(r => r.type === 'warning') ?? [];
  const infos = results?.filter(r => r.type === 'info') ?? [];

  const badgeColor = (type: 'error' | 'warning' | 'info') => ({
    error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  }[type]);

  const iconFor = (type: 'error' | 'warning' | 'info') => ({ error: '✗', warning: '⚠', info: 'ℹ' }[type]);

  return (
    <div class="space-y-4">
      <div class="flex gap-2 mb-1">
        <button onClick={loadExample} class="text-xs px-3 py-1 rounded border border-border hover:bg-surface-hover transition-colors">Load Example</button>
      </div>
      <textarea
        value={config}
        onInput={(e) => { setConfig((e.target as HTMLTextAreaElement).value); setResults(null); }}
        placeholder="Paste your haproxy.cfg here..."
        rows={16}
        class="w-full font-mono text-sm p-3 rounded border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        spellcheck={false}
      />
      <button
        onClick={validate}
        disabled={!config.trim()}
        class="px-4 py-2 bg-primary text-white rounded font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Validate Config
      </button>

      {results && (
        <div class="space-y-3">
          <div class="flex gap-3 text-sm flex-wrap">
            <span class={`px-2 py-0.5 rounded font-medium ${badgeColor('error')}`}>{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
            <span class={`px-2 py-0.5 rounded font-medium ${badgeColor('warning')}`}>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
            <span class={`px-2 py-0.5 rounded font-medium ${badgeColor('info')}`}>{infos.length} info</span>
          </div>
          <div class="space-y-2">
            {results.map((r, i) => (
              <div key={i} class={`flex gap-3 p-3 rounded border text-sm ${
                r.type === 'error' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800' :
                r.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800' :
                'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
              }`}>
                <span class={`font-bold text-base leading-none mt-0.5 flex-shrink-0 ${
                  r.type === 'error' ? 'text-red-600 dark:text-red-400' :
                  r.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`}>{iconFor(r.type)}</span>
                <div class="min-w-0">
                  <div class="font-medium text-text">
                    {r.line ? <span class="text-text-muted mr-1.5">Line {r.line}:</span> : null}
                    {r.message}
                  </div>
                  {r.detail && <div class="text-text-muted mt-0.5">{r.detail}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
