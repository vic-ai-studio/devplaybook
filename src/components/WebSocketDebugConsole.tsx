import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MessageType = 'text' | 'binary' | 'ping';
type MessageDirection = 'sent' | 'received' | 'system' | 'error';

interface LogEntry {
  id: number;
  direction: MessageDirection;
  content: string;
  timestamp: Date;
  type: MessageType | 'pong' | 'system' | 'error';
  sizeBytes: number;
  hex?: string;
}

let entryCounter = 0;

function toHex(str: string): string {
  return Array.from(str)
    .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase();
}

function formatTs(d: Date): string {
  return (
    d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    '.' +
    d.getMilliseconds().toString().padStart(3, '0')
  );
}

function makeSysEntry(content: string): LogEntry {
  return {
    id: ++entryCounter,
    direction: 'system',
    content,
    timestamp: new Date(),
    type: 'system',
    sizeBytes: 0,
  };
}

function makeEntry(direction: MessageDirection, content: string, type: MessageType | 'pong' | 'system' | 'error'): LogEntry {
  const bytes = new TextEncoder().encode(content).length;
  return {
    id: ++entryCounter,
    direction,
    content,
    timestamp: new Date(),
    type,
    sizeBytes: bytes,
    hex: toHex(content),
  };
}

const DEMO_RESPONSES: { trigger: string; response: object }[] = [
  { trigger: 'ping', response: { type: 'pong', ts: 0, latency: '3ms' } },
  { trigger: 'subscribe', response: { type: 'subscribed', channel: 'test', id: 'sub_001' } },
  { trigger: 'hello', response: { type: 'message', text: 'Hello from echo server!', ts: 0 } },
  { trigger: 'auth', response: { type: 'auth_ok', user: 'demo_user', token: 'eyJ...demo' } },
];

const DEMO_PUSH_MESSAGES = [
  { type: 'heartbeat', status: 'ok', uptime: 99.9 },
  { type: 'event', name: 'user.connected', count: 42 },
  { type: 'data', stream: 'prices', value: (Math.random() * 100).toFixed(2) },
];

const STATUS_CONFIG: Record<ConnectionStatus, { dot: string; text: string; label: string }> = {
  disconnected: { dot: 'bg-text-muted', text: 'text-text-muted', label: 'Disconnected' },
  connecting: { dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', label: 'Connecting...' },
  connected: { dot: 'bg-green-400', text: 'text-green-400', label: 'Connected' },
  error: { dot: 'bg-red-400', text: 'text-red-400', label: 'Error' },
};

const MSG_TYPE_LABELS: Record<MessageType, string> = {
  text: 'Text',
  binary: 'Binary (hex)',
  ping: 'Ping frame',
};

export default function WebSocketDebugConsole() {
  const [url, setUrl] = useState('wss://echo.websocket.events');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [msgText, setMsgText] = useState('{"type":"ping","id":1}');
  const [msgType, setMsgType] = useState<MessageType>('text');
  const [autoReconnect, setAutoReconnect] = useState(false);
  const [reconnectDelay, setReconnectDelay] = useState('3');
  const [hexView, setHexView] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [filterDir, setFilterDir] = useState<'all' | 'sent' | 'received'>('all');
  const [stats, setStats] = useState({ sent: 0, received: 0, errors: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const addLog = useCallback((entry: LogEntry) => {
    setLog(prev => [...prev.slice(-999), entry]);
  }, []);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log, autoScroll]);

  // Demo mode: simulate push messages from "server"
  useEffect(() => {
    if (demoMode && status === 'connected') {
      demoTimerRef.current = setInterval(() => {
        const msg = DEMO_PUSH_MESSAGES[Math.floor(Math.random() * DEMO_PUSH_MESSAGES.length)];
        const withTs = { ...msg, ts: Date.now() };
        const entry = makeEntry('received', JSON.stringify(withTs), 'text');
        addLog(entry);
        setStats(s => ({ ...s, received: s.received + 1 }));
      }, 3000 + Math.random() * 2000);
    } else {
      if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    }
    return () => { if (demoTimerRef.current) clearInterval(demoTimerRef.current); };
  }, [demoMode, status, addLog]);

  const connectDemo = useCallback(() => {
    setStatus('connecting');
    addLog(makeSysEntry(`[DEMO MODE] Simulating connection to ${url}...`));
    setTimeout(() => {
      setStatus('connected');
      addLog(makeSysEntry('[DEMO MODE] Connected to simulated echo server. Messages you send will be echoed back.'));
      reconnectAttemptsRef.current = 0;
    }, 600);
  }, [url, addLog]);

  const disconnectDemo = useCallback(() => {
    setStatus('disconnected');
    addLog(makeSysEntry('[DEMO MODE] Disconnected.'));
  }, [addLog]);

  const connectReal = useCallback(() => {
    if (wsRef.current) wsRef.current.close();
    setStatus('connecting');
    addLog(makeSysEntry(`Connecting to ${url}...`));

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        addLog(makeSysEntry(`Connected to ${url} (protocol: ${ws.protocol || 'none'})`));
      };

      ws.onmessage = (e) => {
        const content = typeof e.data === 'string' ? e.data : '[binary frame]';
        const entry = makeEntry('received', content, 'text');
        addLog(entry);
        setStats(s => ({ ...s, received: s.received + 1 }));
      };

      ws.onerror = () => {
        setStatus('error');
        const entry = makeEntry('error', 'WebSocket error — check URL, CORS, and server status', 'error');
        addLog(entry);
        setStats(s => ({ ...s, errors: s.errors + 1 }));
      };

      ws.onclose = (e) => {
        setStatus('disconnected');
        wsRef.current = null;
        addLog(makeSysEntry(`Disconnected (code: ${e.code}${e.reason ? ', reason: ' + e.reason : ''}, clean: ${e.wasClean})`));

        if (autoReconnect && e.code !== 1000) {
          const delay = (parseInt(reconnectDelay, 10) || 3) * 1000;
          reconnectAttemptsRef.current++;
          addLog(makeSysEntry(`Auto-reconnect attempt #${reconnectAttemptsRef.current} in ${delay / 1000}s...`));
          reconnectTimerRef.current = setTimeout(() => connectReal(), delay);
        }
      };
    } catch (err: unknown) {
      setStatus('error');
      addLog(makeSysEntry(`Failed to connect: ${err instanceof Error ? err.message : String(err)}`));
      setStats(s => ({ ...s, errors: s.errors + 1 }));
    }
  }, [url, autoReconnect, reconnectDelay, addLog]);

  const connect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectAttemptsRef.current = 0;
    if (demoMode) connectDemo();
    else connectReal();
  }, [demoMode, connectDemo, connectReal]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (demoMode) disconnectDemo();
    else if (wsRef.current) wsRef.current.close(1000, 'User disconnected');
  }, [demoMode, disconnectDemo]);

  const sendMessage = useCallback(() => {
    if (status !== 'connected' || !msgText.trim()) return;

    if (msgType === 'ping') {
      if (demoMode) {
        addLog(makeEntry('sent', '[PING frame]', 'ping'));
        setTimeout(() => {
          addLog(makeEntry('received', '[PONG frame]', 'pong'));
          setStats(s => ({ ...s, sent: s.sent + 1, received: s.received + 1 }));
        }, 50 + Math.random() * 50);
      } else if (wsRef.current) {
        // Browsers can't send raw ping frames — inform user
        addLog(makeSysEntry('Note: browsers cannot send raw WebSocket ping frames. Sending a JSON ping instead.'));
        const pingMsg = JSON.stringify({ type: 'ping', ts: Date.now() });
        wsRef.current.send(pingMsg);
        addLog(makeEntry('sent', pingMsg, 'text'));
        setStats(s => ({ ...s, sent: s.sent + 1 }));
      }
      return;
    }

    const content = msgType === 'binary'
      ? msgText.replace(/\s+/g, '').match(/.{1,2}/g)?.join(' ') ?? msgText
      : msgText;

    addLog(makeEntry('sent', content, msgType));
    setStats(s => ({ ...s, sent: s.sent + 1 }));

    if (demoMode) {
      // Echo + smart response
      let responseContent = content;
      try {
        const parsed = JSON.parse(content);
        const key = parsed.type || parsed.action || '';
        const match = DEMO_RESPONSES.find(r => key.toLowerCase().includes(r.trigger));
        if (match) {
          responseContent = JSON.stringify({ ...match.response, ts: Date.now() });
        } else {
          responseContent = content; // echo
        }
      } catch { /* not JSON, echo raw */ }

      setTimeout(() => {
        addLog(makeEntry('received', responseContent, 'text'));
        setStats(s => ({ ...s, received: s.received + 1 }));
      }, 30 + Math.random() * 80);
    } else if (wsRef.current) {
      wsRef.current.send(content);
    }
  }, [status, msgText, msgType, demoMode, addLog]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const clearLog = useCallback(() => {
    setLog([]);
    setStats({ sent: 0, received: 0, errors: 0 });
  }, []);

  const visibleLog = log.filter(e =>
    filterDir === 'all' ||
    (filterDir === 'sent' && e.direction === 'sent') ||
    (filterDir === 'received' && e.direction === 'received')
  );

  const QUICK_MESSAGES = [
    { label: 'Ping JSON', text: JSON.stringify({ type: 'ping', ts: Date.now() }) },
    { label: 'Subscribe', text: JSON.stringify({ action: 'subscribe', channel: 'test' }) },
    { label: 'Auth', text: JSON.stringify({ type: 'auth', token: 'Bearer your_token_here' }) },
    { label: 'Heartbeat', text: JSON.stringify({ type: 'heartbeat' }) },
  ];

  const sc = STATUS_CONFIG[status];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — Controls */}
      <div class="space-y-4">
        {/* Demo mode toggle */}
        <div class="flex items-center gap-3 bg-surface-alt border border-border rounded-lg px-4 py-3">
          <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={e => {
                if (status === 'connected') disconnect();
                setDemoMode((e.target as HTMLInputElement).checked);
              }}
              class="accent-accent w-4 h-4"
            />
            <span class="text-sm font-medium">Demo Mode</span>
          </label>
          <span class="text-xs text-text-muted">
            {demoMode ? 'Simulated echo server — no real connection' : 'Connect to a real WebSocket server'}
          </span>
        </div>

        {/* URL + connect */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">WebSocket URL</label>
          <div class="flex gap-2">
            <input
              value={url}
              onInput={e => setUrl((e.target as HTMLInputElement).value)}
              disabled={status === 'connected' || status === 'connecting'}
              placeholder="wss://echo.websocket.events"
              class="flex-1 bg-surface border border-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent text-text disabled:opacity-60"
            />
            {status === 'connected' ? (
              <button
                onClick={disconnect}
                class="px-4 py-2 text-sm bg-red-900/50 border border-red-700 text-red-300 rounded hover:bg-red-900 transition-colors whitespace-nowrap"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                disabled={status === 'connecting' || !url}
                class="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                Connect
              </button>
            )}
          </div>
          {!demoMode && (
            <p class="text-xs text-text-muted mt-1">
              Try <code class="font-mono bg-surface px-1 rounded">wss://echo.websocket.events</code> for a free public echo server.
            </p>
          )}
        </div>

        {/* Status bar */}
        <div class="flex items-center gap-3 text-sm bg-surface border border-border rounded px-3 py-2">
          <span class={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
          <span class={`font-medium ${sc.text}`}>{sc.label}</span>
          {demoMode && <span class="text-xs text-text-muted">(demo)</span>}
          <div class="ml-auto flex gap-3 text-xs text-text-muted">
            <span class="text-blue-400">↑ {stats.sent}</span>
            <span class="text-green-400">↓ {stats.received}</span>
            {stats.errors > 0 && <span class="text-red-400">✗ {stats.errors}</span>}
          </div>
        </div>

        {/* Message composer */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <label class="text-sm font-medium flex-1">Message</label>
            <select
              value={msgType}
              onChange={e => setMsgType((e.target as HTMLSelectElement).value as MessageType)}
              class="bg-surface border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent text-text"
            >
              {(Object.keys(MSG_TYPE_LABELS) as MessageType[]).map(t => (
                <option key={t} value={t}>{MSG_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <span class="text-xs text-text-muted">Ctrl+Enter</span>
          </div>
          <textarea
            value={msgText}
            onInput={e => setMsgText((e.target as HTMLTextAreaElement).value)}
            onKeyDown={handleKeyDown}
            disabled={status !== 'connected'}
            placeholder={msgType === 'binary' ? 'Hex: 48 65 6c 6c 6f' : '{"type": "ping"}'}
            class="w-full h-24 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text disabled:opacity-50"
            spellcheck={false}
          />
          <div class="flex items-center gap-2 flex-wrap">
            <button
              onClick={sendMessage}
              disabled={status !== 'connected' || !msgText.trim()}
              class="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 transition-colors disabled:opacity-40"
            >
              Send
            </button>
            {QUICK_MESSAGES.map(q => (
              <button
                key={q.label}
                onClick={() => { setMsgText(q.text); setMsgType('text'); }}
                class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-reconnect */}
        <div class="border border-border rounded-lg p-3 space-y-2 bg-surface-alt">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoReconnect}
              onChange={e => setAutoReconnect((e.target as HTMLInputElement).checked)}
              class="accent-accent w-4 h-4"
            />
            <span class="text-sm font-medium">Auto-reconnect</span>
            {autoReconnect && <span class="text-xs text-text-muted">(on unexpected disconnect)</span>}
          </label>
          {autoReconnect && (
            <div class="flex items-center gap-2">
              <label class="text-xs text-text-muted">Delay (s):</label>
              <input
                type="number"
                min="1"
                max="30"
                value={reconnectDelay}
                onInput={e => setReconnectDelay((e.target as HTMLInputElement).value)}
                class="w-16 bg-surface border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-accent text-text"
              />
              {reconnectAttemptsRef.current > 0 && (
                <span class="text-xs text-yellow-400">attempt #{reconnectAttemptsRef.current}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Message log */}
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Message Log</span>
          <span class="text-xs text-text-muted">({visibleLog.length} entries)</span>
          <div class="ml-auto flex items-center gap-2 text-xs">
            {/* Filter */}
            {(['all', 'sent', 'received'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterDir(f)}
                class={`px-2 py-0.5 rounded border transition-colors ${
                  filterDir === f
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-text-muted hover:border-accent'
                }`}
              >
                {f}
              </button>
            ))}
            <label class="flex items-center gap-1 cursor-pointer text-text-muted ml-1">
              <input type="checkbox" checked={hexView} onChange={e => setHexView((e.target as HTMLInputElement).checked)} class="accent-accent" />
              Hex
            </label>
            <label class="flex items-center gap-1 cursor-pointer text-text-muted">
              <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll((e.target as HTMLInputElement).checked)} class="accent-accent" />
              Auto-scroll
            </label>
            <button onClick={clearLog} class="hover:text-red-400 transition-colors ml-1">Clear</button>
          </div>
        </div>

        <div
          ref={logRef}
          class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto"
        >
          {visibleLog.length === 0 ? (
            <div class="flex flex-col items-center justify-center h-full text-text-muted text-sm gap-2">
              <span class="text-2xl">⬡</span>
              <span>
                {demoMode
                  ? 'Connect in Demo Mode and send a message to see the log'
                  : 'Connect to a WebSocket server to see messages'}
              </span>
            </div>
          ) : (
            <div class="space-y-1">
              {visibleLog.map(entry => {
                const isSystem = entry.direction === 'system';
                const isErr = entry.direction === 'error';
                const isSent = entry.direction === 'sent';
                const isRecv = entry.direction === 'received';

                let dirSymbol = '·';
                let dirClass = 'text-text-muted/40';
                let contentClass = 'text-text-muted/60';

                if (isSent) { dirSymbol = '▶'; dirClass = 'text-blue-400'; contentClass = 'text-blue-300'; }
                if (isRecv) { dirSymbol = '◀'; dirClass = 'text-green-400'; contentClass = 'text-green-300'; }
                if (isErr) { dirSymbol = '✗'; dirClass = 'text-red-400'; contentClass = 'text-red-300'; }

                let displayContent = entry.content;
                if (hexView && entry.hex && !isSystem && !isErr) {
                  displayContent = entry.hex;
                } else if (!hexView && !isSystem && !isErr) {
                  try {
                    displayContent = JSON.stringify(JSON.parse(entry.content), null, 0);
                  } catch { /* not JSON */ }
                }

                return (
                  <div key={entry.id} class="flex gap-2 text-xs leading-relaxed">
                    <span class="text-text-muted/40 shrink-0 select-none w-[88px]">{formatTs(entry.timestamp)}</span>
                    <span class={`shrink-0 w-4 font-bold ${dirClass}`}>{dirSymbol}</span>
                    <span class={`break-all whitespace-pre-wrap flex-1 ${contentClass}`}>
                      {entry.type === 'ping' || entry.type === 'pong'
                        ? <span class="italic">[{entry.type.toUpperCase()} frame]</span>
                        : displayContent
                      }
                    </span>
                    {entry.sizeBytes > 0 && (
                      <span class="text-text-muted/30 shrink-0 ml-auto">{entry.sizeBytes}B</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div class="flex gap-4 text-xs text-text-muted">
          <span><span class="text-blue-400 font-bold">▶</span> Sent</span>
          <span><span class="text-green-400 font-bold">◀</span> Received</span>
          <span><span class="text-text-muted/50">·</span> System</span>
          <span><span class="text-red-400 font-bold">✗</span> Error</span>
          {demoMode && (
            <span class="ml-auto text-yellow-400/70">Demo Mode — simulated echo server</span>
          )}
        </div>
      </div>
    </div>
  );
}
