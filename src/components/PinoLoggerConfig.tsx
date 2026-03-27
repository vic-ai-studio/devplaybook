import { useState } from 'preact/hooks';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type TransportType = 'stdout' | 'file' | 'custom';
type TimestampFormat = 'iso' | 'unix' | 'custom';

interface PinoConfig {
  level: LogLevel;
  prettyPrint: boolean;
  transport: TransportType;
  filePath: string;
  customTransport: string;
  timestampFormat: TimestampFormat;
  customTimestamp: string;
  redactFields: string;
  serializeReq: boolean;
  serializeRes: boolean;
  serializeErr: boolean;
  includePid: boolean;
  includeHostname: boolean;
  mixinEnabled: boolean;
  mixinCode: string;
  messageKey: string;
  errorKey: string;
}

const DEFAULT: PinoConfig = {
  level: 'info',
  prettyPrint: false,
  transport: 'stdout',
  filePath: './logs/app.log',
  customTransport: '',
  timestampFormat: 'iso',
  customTimestamp: "() => `,\"time\":\"${new Date().toISOString()}\"`",
  redactFields: 'req.headers.authorization, req.headers.cookie',
  serializeReq: true,
  serializeRes: true,
  serializeErr: true,
  includePid: true,
  includeHostname: true,
  mixinEnabled: false,
  mixinCode: "() => ({ requestId: getRequestId() })",
  messageKey: 'msg',
  errorKey: 'err',
};

const LOG_LEVELS: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const LEVEL_COLORS: Record<LogLevel, string> = {
  trace: 'text-gray-400',
  debug: 'text-blue-300',
  info: 'text-green-400',
  warn: 'text-yellow-400',
  error: 'text-red-400',
  fatal: 'text-red-600',
};

function buildCode(cfg: PinoConfig): string {
  const lines: string[] = [];

  // Imports
  lines.push('import pino from "pino";');
  if (cfg.prettyPrint && cfg.transport !== 'file') {
    lines.push('// pino-pretty must be installed: npm install pino-pretty');
  }
  lines.push('');

  // Serializers block
  const hasSerializers = cfg.serializeReq || cfg.serializeRes || cfg.serializeErr;
  if (hasSerializers) {
    lines.push('const serializers = {');
    if (cfg.serializeReq) {
      lines.push('  req: pino.stdSerializers.req,');
    }
    if (cfg.serializeRes) {
      lines.push('  res: pino.stdSerializers.res,');
    }
    if (cfg.serializeErr) {
      lines.push('  err: pino.stdSerializers.err,');
    }
    lines.push('};');
    lines.push('');
  }

  // Redact
  const redactPaths = cfg.redactFields
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Timestamp
  let timestampValue: string;
  switch (cfg.timestampFormat) {
    case 'iso':   timestampValue = 'pino.stdTimeFunctions.isoTime'; break;
    case 'unix':  timestampValue = 'pino.stdTimeFunctions.epochTime'; break;
    case 'custom': timestampValue = cfg.customTimestamp || 'pino.stdTimeFunctions.isoTime'; break;
  }

  // Transport block
  let transportBlock: string | null = null;
  if (cfg.prettyPrint && cfg.transport === 'stdout') {
    transportBlock = `{
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  }`;
  } else if (cfg.transport === 'file') {
    if (cfg.prettyPrint) {
      transportBlock = `{
    targets: [
      {
        target: "pino-pretty",
        level: "${cfg.level}",
        options: { colorize: true },
      },
      {
        target: "pino/file",
        level: "${cfg.level}",
        options: { destination: "${cfg.filePath}", mkdir: true },
      },
    ],
  }`;
    } else {
      transportBlock = `{
    target: "pino/file",
    options: {
      destination: "${cfg.filePath}",
      mkdir: true,
    },
  }`;
    }
  } else if (cfg.transport === 'custom' && cfg.customTransport.trim()) {
    transportBlock = `{
    target: "${cfg.customTransport.trim()}",
    options: {},
  }`;
  }

  // Base object
  const baseFields: string[] = [];
  if (cfg.includePid) baseFields.push('    pid: process.pid,');
  if (cfg.includeHostname) baseFields.push('    hostname: process.env.HOSTNAME ?? require("os").hostname(),');

  // Build options object
  lines.push('const logger = pino({');
  lines.push(`  level: "${cfg.level}",`);
  lines.push(`  timestamp: ${timestampValue},`);

  if (cfg.messageKey !== 'msg') {
    lines.push(`  messageKey: "${cfg.messageKey}",`);
  }
  if (cfg.errorKey !== 'err') {
    lines.push(`  errorKey: "${cfg.errorKey}",`);
  }

  if (baseFields.length) {
    lines.push('  base: {');
    lines.push(...baseFields);
    lines.push('  },');
  } else {
    lines.push('  base: null,');
  }

  if (hasSerializers) {
    lines.push('  serializers,');
  }

  if (redactPaths.length) {
    lines.push('  redact: {');
    lines.push(`    paths: ${JSON.stringify(redactPaths)},`);
    lines.push('    censor: "[REDACTED]",');
    lines.push('  },');
  }

  if (cfg.mixinEnabled) {
    lines.push(`  mixin: ${cfg.mixinCode || '() => ({})'},`);
  }

  if (transportBlock) {
    lines.push(`  transport: ${transportBlock},`);
  }

  lines.push('});');
  lines.push('');
  lines.push('export default logger;');
  lines.push('');
  lines.push('// Usage:');
  lines.push('// logger.info({ userId: "123" }, "User logged in");');
  lines.push('// logger.error({ err }, "Something went wrong");');

  return lines.join('\n');
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span class="text-sm">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export default function PinoLoggerConfig() {
  const [cfg, setCfg] = useState<PinoConfig>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const output = buildCode(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const set = <K extends keyof PinoConfig>(key: K, value: PinoConfig[K]) =>
    setCfg(prev => ({ ...prev, [key]: value }));

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: controls */}
      <div class="space-y-4">
        <Section title="Core Settings">
          <div>
            <label class="text-xs text-text-muted block mb-1">Log level</label>
            <div class="flex gap-1 flex-wrap">
              {LOG_LEVELS.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => set('level', lvl)}
                  class={`px-2.5 py-1 text-xs rounded-full border transition-colors font-mono ${
                    cfg.level === lvl
                      ? `bg-accent border-accent text-white`
                      : `border-border ${LEVEL_COLORS[lvl]} hover:border-accent`
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <Toggle checked={cfg.prettyPrint} onChange={v => set('prettyPrint', v)} label="Pretty-print (pino-pretty)" />

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">Message key</label>
              <input
                type="text"
                value={cfg.messageKey}
                onInput={e => set('messageKey', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Error key</label>
              <input
                type="text"
                value={cfg.errorKey}
                onInput={e => set('errorKey', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </Section>

        <Section title="Transport">
          <div class="flex gap-2 flex-wrap">
            {(['stdout', 'file', 'custom'] as TransportType[]).map(t => (
              <button
                key={t}
                onClick={() => set('transport', t)}
                class={`px-3 py-1 text-xs rounded-full border transition-colors ${cfg.transport === t ? 'bg-accent border-accent text-white' : 'border-border text-text-muted hover:border-accent'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {cfg.transport === 'file' && (
            <div>
              <label class="text-xs text-text-muted block mb-1">Log file path</label>
              <input
                type="text"
                placeholder="./logs/app.log"
                value={cfg.filePath}
                onInput={e => set('filePath', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          )}

          {cfg.transport === 'custom' && (
            <div>
              <label class="text-xs text-text-muted block mb-1">Custom transport target (npm package)</label>
              <input
                type="text"
                placeholder="pino-loki"
                value={cfg.customTransport}
                onInput={e => set('customTransport', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </Section>

        <Section title="Timestamp">
          <div class="flex gap-2 flex-wrap">
            {(['iso', 'unix', 'custom'] as TimestampFormat[]).map(tf => (
              <button
                key={tf}
                onClick={() => set('timestampFormat', tf)}
                class={`px-3 py-1 text-xs rounded-full border transition-colors ${cfg.timestampFormat === tf ? 'bg-accent border-accent text-white' : 'border-border text-text-muted hover:border-accent'}`}
              >
                {tf === 'iso' ? 'ISO 8601' : tf === 'unix' ? 'Unix epoch' : 'Custom'}
              </button>
            ))}
          </div>

          {cfg.timestampFormat === 'custom' && (
            <div>
              <label class="text-xs text-text-muted block mb-1">Custom timestamp function</label>
              <input
                type="text"
                value={cfg.customTimestamp}
                onInput={e => set('customTimestamp', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </Section>

        <Section title="Redact">
          <div>
            <label class="text-xs text-text-muted block mb-1">Redact paths (comma-separated)</label>
            <textarea
              rows={2}
              placeholder="req.headers.authorization, req.body.password"
              value={cfg.redactFields}
              onInput={e => set('redactFields', (e.target as HTMLTextAreaElement).value)}
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent resize-none"
            />
            <p class="text-xs text-text-muted mt-1">Replaced with "[REDACTED]" in all log output.</p>
          </div>
        </Section>

        <Section title="Serializers">
          <Toggle checked={cfg.serializeReq} onChange={v => set('serializeReq', v)} label="pino.stdSerializers.req" />
          <Toggle checked={cfg.serializeRes} onChange={v => set('serializeRes', v)} label="pino.stdSerializers.res" />
          <Toggle checked={cfg.serializeErr} onChange={v => set('serializeErr', v)} label="pino.stdSerializers.err" />
        </Section>

        <Section title="Base Object">
          <Toggle checked={cfg.includePid} onChange={v => set('includePid', v)} label="Include process.pid" />
          <Toggle checked={cfg.includeHostname} onChange={v => set('includeHostname', v)} label="Include hostname" />
        </Section>

        <Section title="Mixin">
          <Toggle checked={cfg.mixinEnabled} onChange={v => set('mixinEnabled', v)} label="Enable mixin function" />
          {cfg.mixinEnabled && (
            <div>
              <label class="text-xs text-text-muted block mb-1">Mixin code</label>
              <input
                type="text"
                value={cfg.mixinCode}
                onInput={e => set('mixinCode', (e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent"
              />
              <p class="text-xs text-text-muted mt-1">Called on every log call; return object is merged into log entry.</p>
            </div>
          )}
        </Section>
      </div>

      {/* Right: output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class={`text-sm font-bold font-mono ${LEVEL_COLORS[cfg.level]}`}>{cfg.level.toUpperCase()}</span>
            <span class="text-sm text-text-muted">pino configuration</span>
          </div>
          <button
            onClick={handleCopy}
            class="px-3 py-1.5 text-xs bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[700px] text-green-400 whitespace-pre-wrap">
          {output}
        </pre>

        {/* Quick reference */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Pino Log Level Reference</h4>
          <div class="space-y-1">
            {LOG_LEVELS.map(lvl => (
              <div key={lvl} class="flex items-center gap-3 text-xs font-mono">
                <span class={`w-12 font-semibold ${LEVEL_COLORS[lvl]}`}>{lvl}</span>
                <span class="text-text-muted">
                  {lvl === 'trace' && 'Most verbose — internal flow tracing'}
                  {lvl === 'debug' && 'Debugging info — dev environments'}
                  {lvl === 'info'  && 'Normal operation events (default)'}
                  {lvl === 'warn'  && 'Unexpected but non-fatal situations'}
                  {lvl === 'error' && 'Errors that need attention'}
                  {lvl === 'fatal' && 'Critical — app cannot continue'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
