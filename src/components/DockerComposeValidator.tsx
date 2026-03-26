import { useState, useCallback } from 'preact/hooks';

// Minimal YAML parser for docker-compose validation
// (structural checks only — no full YAML parser dependency)

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
};

const SAMPLE_COMPOSE = `version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    depends_on:
      - db
    environment:
      - NODE_ENV=production

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
`;

function validateDockerCompose(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = yaml.split('\n');

  // 1. Check for version key
  const versionLine = lines.find(l => l.match(/^version\s*:/));
  if (!versionLine) {
    issues.push({ level: 'warning', message: 'Missing "version" key. Recommended to specify compose file format version (e.g. version: "3.8").' });
  } else {
    const versionMatch = versionLine.match(/version\s*:\s*['"]([\d.]+)['"]/);
    if (versionMatch) {
      const ver = parseFloat(versionMatch[1]);
      if (ver < 2) {
        issues.push({ level: 'warning', message: `Version "${versionMatch[1]}" is very old. Consider upgrading to 3.x for modern features.` });
      }
    }
  }

  // 2. Check for services key
  const servicesLine = lines.findIndex(l => l.match(/^services\s*:/));
  if (servicesLine === -1) {
    issues.push({ level: 'error', message: 'Missing required "services" key. Docker Compose files must define at least one service.' });
    return issues;
  }

  // 3. Extract service blocks (basic indentation parse)
  const serviceNames: string[] = [];
  let inServices = false;
  let inServiceBlock = false;
  const portLines: { line: number; value: string }[] = [];
  const imageLines: { line: number; service: string; value: string }[] = [];
  let currentService = '';
  let hasBuild = false;
  let hasImage = false;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();

    if (line.match(/^services\s*:/)) { inServices = true; return; }
    if (inServices && line.match(/^[a-zA-Z]/)) { inServices = false; inServiceBlock = false; }

    if (inServices && line.match(/^  [a-zA-Z_][a-zA-Z0-9_-]*\s*:/)) {
      if (currentService) {
        if (!hasBuild && !hasImage) {
          issues.push({ level: 'error', message: `Service "${currentService}" has neither "image" nor "build" — it cannot be started.`, line: lineNum });
        }
      }
      currentService = line.trim().replace(':', '');
      serviceNames.push(currentService);
      hasBuild = false;
      hasImage = false;
    }

    if (inServices && trimmed.startsWith('image:')) {
      hasImage = true;
      const val = trimmed.replace('image:', '').trim().replace(/['"]/g, '');
      imageLines.push({ line: lineNum, service: currentService, value: val });
      if (val === 'latest' || val.endsWith(':latest')) {
        issues.push({ level: 'warning', message: `Service "${currentService}" uses ":latest" tag. Pin a specific version for reproducible builds (line ${lineNum}).`, line: lineNum });
      }
    }

    if (inServices && trimmed.startsWith('build:')) hasBuild = true;
    if (inServices && trimmed === 'build:') hasBuild = true;

    // Port format check
    if (inServices && trimmed.startsWith('- ') && trimmed.includes(':')) {
      const portVal = trimmed.replace('- ', '').replace(/['"]/g, '');
      // Look for port patterns like "8080:80"
      if (portVal.match(/^\d+:\d+$/) || portVal.match(/^[\d.]+:\d+:\d+$/)) {
        portLines.push({ line: lineNum, value: portVal });
        const parts = portVal.split(':');
        const hostPort = parseInt(parts[parts.length - 2]);
        if (hostPort < 1024 && hostPort !== 80 && hostPort !== 443) {
          issues.push({ level: 'warning', message: `Port ${hostPort} is a privileged port (< 1024). Requires root or CAP_NET_BIND_SERVICE (line ${lineNum}).`, line: lineNum });
        }
      }
    }

    // Hardcoded secrets
    if (inServices && (trimmed.includes('PASSWORD=') || trimmed.includes('SECRET=') || trimmed.includes('API_KEY='))) {
      const isPlaceholder = trimmed.includes('${') || trimmed.toLowerCase().includes('secret') && !trimmed.includes('=');
      if (!trimmed.includes('${')) {
        issues.push({ level: 'warning', message: `Possible hardcoded secret detected on line ${lineNum}. Use environment variables or Docker secrets instead.`, line: lineNum });
      }
    }

    // restart policy
    if (inServices && trimmed === 'restart: no') {
      issues.push({ level: 'info', message: `Service "${currentService}" has restart: no. Consider "unless-stopped" or "always" for production.`, line: lineNum });
    }
  });

  // Final service check
  if (currentService && !hasBuild && !hasImage) {
    issues.push({ level: 'error', message: `Service "${currentService}" has neither "image" nor "build" — it cannot be started.` });
  }

  // 4. depends_on references
  const dependsMatches = yaml.matchAll(/depends_on:\s*\n((?:\s+-\s+\S+\n?)+)/g);
  for (const match of dependsMatches) {
    const deps = match[1].match(/- (\S+)/g)?.map(d => d.replace('- ', '')) ?? [];
    deps.forEach(dep => {
      if (!serviceNames.includes(dep)) {
        issues.push({ level: 'error', message: `depends_on references service "${dep}" which is not defined in services.` });
      }
    });
  }

  // 5. No services defined
  if (serviceNames.length === 0) {
    issues.push({ level: 'error', message: 'No services found. Add at least one service under the "services" key.' });
  }

  // 6. Tab characters (YAML doesn't allow tabs)
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Tab character found on line ${idx + 1}. YAML does not allow tabs — use spaces only.`, line: idx + 1 });
    }
  });

  // All good message
  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'No issues detected. Your docker-compose.yml looks valid!' });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  info: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
};

export default function DockerComposeValidator() {
  const [input, setInput] = useState(SAMPLE_COMPOSE);
  const [issues, setIssues] = useState<ValidationIssue[]>(() => validateDockerCompose(SAMPLE_COMPOSE));
  const [validated, setValidated] = useState(true);

  const handleInput = (val: string) => {
    setInput(val);
    setValidated(false);
  };

  const handleValidate = () => {
    setIssues(validateDockerCompose(input));
    setValidated(true);
  };

  const handleClear = () => {
    setInput('');
    setIssues([]);
    setValidated(false);
  };

  const handleLoad = () => {
    setInput(SAMPLE_COMPOSE);
    setIssues(validateDockerCompose(SAMPLE_COMPOSE));
    setValidated(true);
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  const infos = issues.filter(i => i.level === 'info');

  return (
    <div class="space-y-4">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">docker-compose.yml</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => handleInput((e.target as HTMLTextAreaElement).value)}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your docker-compose.yml here..."
          spellcheck={false}
        />
      </div>

      <button
        onClick={handleValidate}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Validate
      </button>

      {/* Results */}
      {validated && issues.length > 0 && (
        <div class="space-y-3">
          {/* Summary */}
          <div class="flex items-center gap-3 text-sm">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
            )}
            {warnings.length > 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
            )}
            {infos.length > 0 && errors.length === 0 && warnings.length === 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>
            )}
          </div>

          {/* Issues list */}
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!validated && input.trim() && (
        <p class="text-xs text-text-muted text-center">Click Validate to check your docker-compose.yml</p>
      )}

      {/* Checks performed */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Version key presence and format</li>
          <li>Services key and non-empty service list</li>
          <li>Each service has <code class="font-mono bg-background px-1 rounded">image</code> or <code class="font-mono bg-background px-1 rounded">build</code></li>
          <li><code class="font-mono bg-background px-1 rounded">depends_on</code> references valid service names</li>
          <li>Privileged port usage (ports below 1024)</li>
          <li><code class="font-mono bg-background px-1 rounded">:latest</code> image tag warnings</li>
          <li>Hardcoded secrets in environment variables</li>
          <li>Tab characters (not allowed in YAML)</li>
          <li>Restart policy suggestions</li>
        </ul>
      </div>
    </div>
  );
}
