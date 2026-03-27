import { useState, useCallback } from 'preact/hooks';

type CheckType = 'http' | 'tcp' | 'cmd' | 'file';

interface HealthcheckConfig {
  checkType: CheckType;
  httpUrl: string;
  httpExpectedStatus: string;
  tcpPort: string;
  cmdCommand: string;
  filePath: string;
  interval: string;
  timeout: string;
  startPeriod: string;
  retries: string;
  dockerfileStyle: boolean;
}

function formatDuration(val: string): string {
  const n = parseInt(val, 10);
  if (isNaN(n)) return val;
  if (n < 60) return `${n}s`;
  return `${Math.floor(n / 60)}m${n % 60 > 0 ? `${n % 60}s` : ''}`;
}

function buildTestCmd(config: HealthcheckConfig): string {
  switch (config.checkType) {
    case 'http': {
      const url = config.httpUrl || 'http://localhost:8080/health';
      const statusCheck = config.httpExpectedStatus
        ? ` | grep -q '"${config.httpExpectedStatus}"' || exit 1`
        : '';
      return `CMD curl -f ${url}${statusCheck} || exit 1`;
    }
    case 'tcp': {
      const port = config.tcpPort || '8080';
      return `CMD nc -z localhost ${port} || exit 1`;
    }
    case 'cmd': {
      const cmd = config.cmdCommand || 'echo "ok"';
      return `CMD ${cmd}`;
    }
    case 'file': {
      const path = config.filePath || '/tmp/healthy';
      return `CMD test -f ${path} || exit 1`;
    }
  }
}

function buildDockerfile(config: HealthcheckConfig): string {
  const testCmd = buildTestCmd(config);
  const interval = formatDuration(config.interval || '30');
  const timeout = formatDuration(config.timeout || '10');
  const startPeriod = formatDuration(config.startPeriod || '30');
  const retries = config.retries || '3';

  return `HEALTHCHECK --interval=${interval} --timeout=${timeout} --start-period=${startPeriod} --retries=${retries} \\
  ${testCmd}`;
}

function buildDockerCompose(config: HealthcheckConfig): string {
  const testCmd = buildTestCmd(config);
  const interval = `${config.interval || '30'}s`;
  const timeout = `${config.timeout || '10'}s`;
  const startPeriod = `${config.startPeriod || '30'}s`;
  const retries = config.retries || '3';

  // Convert CMD [...] format to docker-compose array format
  let testArray: string;
  if (config.checkType === 'http') {
    const url = config.httpUrl || 'http://localhost:8080/health';
    testArray = `["CMD", "curl", "-f", "${url}"]`;
  } else if (config.checkType === 'tcp') {
    const port = config.tcpPort || '8080';
    testArray = `["CMD", "nc", "-z", "localhost", "${port}"]`;
  } else if (config.checkType === 'file') {
    const path = config.filePath || '/tmp/healthy';
    testArray = `["CMD", "test", "-f", "${path}"]`;
  } else {
    const cmd = config.cmdCommand || 'echo "ok"';
    testArray = `["CMD-SHELL", "${cmd}"]`;
  }

  return `healthcheck:
  test: ${testArray}
  interval: ${interval}
  timeout: ${timeout}
  start_period: ${startPeriod}
  retries: ${retries}`;
}

const TYPE_INFO: Record<CheckType, { label: string; description: string; icon: string }> = {
  http: { label: 'HTTP endpoint', description: 'curl to a health endpoint (most common)', icon: '🌐' },
  tcp: { label: 'TCP port', description: 'Check if a port is open with nc', icon: '🔌' },
  cmd: { label: 'Custom command', description: 'Any shell command (exit 0 = healthy)', icon: '⚙️' },
  file: { label: 'File existence', description: 'Check if a file exists on the filesystem', icon: '📁' },
};

export default function DockerHealthcheckGenerator() {
  const [checkType, setCheckType] = useState<CheckType>('http');
  const [httpUrl, setHttpUrl] = useState('http://localhost:8080/health');
  const [httpExpectedStatus, setHttpExpectedStatus] = useState('');
  const [tcpPort, setTcpPort] = useState('8080');
  const [cmdCommand, setCmdCommand] = useState('pg_isready -U postgres');
  const [filePath, setFilePath] = useState('/tmp/healthy');
  const [interval, setInterval] = useState('30');
  const [timeout, setTimeout] = useState('10');
  const [startPeriod, setStartPeriod] = useState('30');
  const [retries, setRetries] = useState('3');
  const [outputMode, setOutputMode] = useState<'dockerfile' | 'compose'>('dockerfile');
  const [copiedDockerfile, setCopiedDockerfile] = useState(false);
  const [copiedCompose, setCopiedCompose] = useState(false);

  const config: HealthcheckConfig = {
    checkType, httpUrl, httpExpectedStatus, tcpPort, cmdCommand, filePath,
    interval, timeout, startPeriod, retries, dockerfileStyle: true,
  };

  const dockerfileOutput = buildDockerfile(config);
  const composeOutput = buildDockerCompose(config);
  const currentOutput = outputMode === 'dockerfile' ? dockerfileOutput : composeOutput;

  const copy = useCallback(async (mode: 'dockerfile' | 'compose') => {
    const text = mode === 'dockerfile' ? dockerfileOutput : composeOutput;
    await navigator.clipboard.writeText(text);
    if (mode === 'dockerfile') {
      setCopiedDockerfile(true);
      setTimeout(() => setCopiedDockerfile(false), 1500);
    } else {
      setCopiedCompose(true);
      setTimeout(() => setCopiedCompose(false), 1500);
    }
  }, [dockerfileOutput, composeOutput]);

  const inputClass = 'bg-surface border border-border rounded px-3 py-2 text-sm text-text w-full focus:outline-none focus:ring-1 focus:ring-primary';
  const chipBase = 'px-3 py-2 rounded border cursor-pointer select-none transition-colors text-sm text-left flex items-start gap-2';
  const chipActive = 'bg-primary/20 border-primary text-primary';
  const chipInactive = 'bg-surface border-border text-text hover:border-text-muted';

  const intervalN = parseInt(interval || '30', 10);
  const timeoutN = parseInt(timeout || '10', 10);
  const startPeriodN = parseInt(startPeriod || '30', 10);

  const warnings: string[] = [];
  if (!isNaN(timeoutN) && !isNaN(intervalN) && timeoutN >= intervalN) {
    warnings.push('Timeout should be less than interval to avoid overlapping checks.');
  }
  if (!isNaN(intervalN) && intervalN < 5) {
    warnings.push('Very short intervals (<5s) may overwhelm your service.');
  }
  if (!isNaN(startPeriodN) && startPeriodN < 10) {
    warnings.push('Short start period may cause false failures during container startup.');
  }

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Config */}
      <div class="space-y-5">
        {/* Check type */}
        <div>
          <label class="block text-sm font-medium text-text mb-2">Health check method</label>
          <div class="grid grid-cols-2 gap-2">
            {(Object.keys(TYPE_INFO) as CheckType[]).map(t => {
              const info = TYPE_INFO[t];
              return (
                <button
                  key={t}
                  onClick={() => setCheckType(t)}
                  class={`${chipBase} ${checkType === t ? chipActive : chipInactive}`}
                >
                  <span class="text-lg leading-none mt-0.5">{info.icon}</span>
                  <div>
                    <div class="font-medium text-sm">{info.label}</div>
                    <div class="text-xs opacity-70">{info.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Type-specific fields */}
        {checkType === 'http' && (
          <>
            <div>
              <label class="block text-sm font-medium text-text mb-1.5">Health endpoint URL</label>
              <input type="text" value={httpUrl} onInput={(e) => setHttpUrl((e.target as HTMLInputElement).value)} placeholder="http://localhost:8080/health" class={inputClass} />
            </div>
            <div>
              <label class="block text-sm font-medium text-text mb-1.5">
                Expected response body substring <span class="text-text-muted font-normal text-xs">(optional, grep check)</span>
              </label>
              <input type="text" value={httpExpectedStatus} onInput={(e) => setHttpExpectedStatus((e.target as HTMLInputElement).value)} placeholder='ok' class={inputClass} />
            </div>
          </>
        )}

        {checkType === 'tcp' && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">TCP port</label>
            <input type="text" value={tcpPort} onInput={(e) => setTcpPort((e.target as HTMLInputElement).value)} placeholder="8080" class={inputClass} />
          </div>
        )}

        {checkType === 'cmd' && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">Shell command <span class="text-text-muted font-normal text-xs">(exit 0 = healthy)</span></label>
            <input type="text" value={cmdCommand} onInput={(e) => setCmdCommand((e.target as HTMLInputElement).value)} placeholder="pg_isready -U postgres" class={inputClass} />
            <p class="text-xs text-text-muted mt-1">Examples: <code class="font-mono">redis-cli ping</code>, <code class="font-mono">pg_isready -U postgres</code>, <code class="font-mono">mysql -u root -e "SELECT 1"</code></p>
          </div>
        )}

        {checkType === 'file' && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">File path</label>
            <input type="text" value={filePath} onInput={(e) => setFilePath((e.target as HTMLInputElement).value)} placeholder="/tmp/healthy" class={inputClass} />
            <p class="text-xs text-text-muted mt-1">Your app writes this file when ready, deletes it on shutdown.</p>
          </div>
        )}

        {/* Timing */}
        <div>
          <label class="block text-sm font-medium text-text mb-2">Timing settings</label>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-text-muted mb-1">Interval (seconds)</label>
              <input type="number" value={interval} onInput={(e) => setInterval((e.target as HTMLInputElement).value)} min="5" max="300" class={inputClass} />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Timeout (seconds)</label>
              <input type="number" value={timeout} onInput={(e) => setTimeout((e.target as HTMLInputElement).value)} min="1" max="60" class={inputClass} />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Start period (seconds)</label>
              <input type="number" value={startPeriod} onInput={(e) => setStartPeriod((e.target as HTMLInputElement).value)} min="0" max="300" class={inputClass} />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Retries</label>
              <input type="number" value={retries} onInput={(e) => setRetries((e.target as HTMLInputElement).value)} min="1" max="10" class={inputClass} />
            </div>
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div class="space-y-1">
            {warnings.map((w, i) => (
              <div key={i} class="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded px-3 py-2">⚠ {w}</div>
            ))}
          </div>
        )}
      </div>

      {/* Output */}
      <div class="space-y-4">
        {/* Dockerfile output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text">Dockerfile</label>
            <button onClick={() => copy('dockerfile')} class="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 transition-colors">
              {copiedDockerfile ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="bg-surface border border-border rounded p-4 text-xs font-mono text-text overflow-auto whitespace-pre">{dockerfileOutput}</pre>
        </div>

        {/* docker-compose output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text">docker-compose.yml</label>
            <button onClick={() => copy('compose')} class="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 transition-colors">
              {copiedCompose ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="bg-surface border border-border rounded p-4 text-xs font-mono text-text overflow-auto whitespace-pre">{composeOutput}</pre>
        </div>

        <div class="bg-surface border border-border rounded p-3 text-xs text-text-muted space-y-1">
          <p class="font-medium text-text">Timing guide</p>
          <p><span class="text-text">interval</span> — How often to run the check (default: 30s)</p>
          <p><span class="text-text">timeout</span> — Max time to wait for a check response (default: 30s)</p>
          <p><span class="text-text">start-period</span> — Grace period for container startup before counting failures (default: 0s)</p>
          <p><span class="text-text">retries</span> — Consecutive failures before marking unhealthy (default: 3)</p>
        </div>
      </div>
    </div>
  );
}
