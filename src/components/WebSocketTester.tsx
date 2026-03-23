import { useState, useRef, useCallback, useEffect } from 'preact/hooks';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type MessageDirection = 'sent' | 'received' | 'system';

interface Message {
  id: number;
  direction: MessageDirection;
  content: string;
  timestamp: Date;
  size: number;
}

let msgCounter = 0;

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
    '.' + d.getMilliseconds().toString().padStart(3, '0');
}

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  disconnected: 'text-text-muted',
  connecting: 'text-yellow-400',
  connected: 'text-green-400',
  error: 'text-red-400',
};
const STATUS_DOT: Record<ConnectionStatus, string> = {
  disconnected: 'bg-text-muted',
  connecting: 'bg-yellow-400 animate-pulse',
  connected: 'bg-green-400',
  error: 'bg-red-400',
};
const STATUS_LABEL: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  connected: 'Connected',
  error: 'Error',
};

export default function WebSocketTester() {
  const [url, setUrl] = useState('wss://echo.websocket.events');
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('{"type":"ping","id":1}');
  const [autoScroll, setAutoScroll] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const msgRef = useRef<HTMLTextAreaElement>(null);

  const addMessage = useCallback((direction: MessageDirection, content: string) => {
    const msg: Message = {
      id: ++msgCounter,
      direction,
      content,
      timestamp: new Date(),
      size: new TextEncoder().encode(content).length,
    };
    setMessages(prev => [...prev.slice(-499), msg]); // keep last 500
  }, []);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    setStatus('connecting');
    addMessage('system', `Connecting to ${url}...`);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        addMessage('system', `✓ Connected to ${url}`);
      };

      ws.onmessage = (e) => {
        addMessage('received', typeof e.data === 'string' ? e.data : '[binary data]');
      };

      ws.onerror = () => {
        setStatus('error');
        addMessage('system', '✗ WebSocket error occurred');
      };

      ws.onclose = (e) => {
        setStatus('disconnected');
        addMessage('system', `✗ Disconnected (code: ${e.code}${e.reason ? ', reason: ' + e.reason : ''})`);
        wsRef.current = null;
      };
    } catch (err: unknown) {
      setStatus('error');
      addMessage('system', `✗ Failed to connect: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [url, addMessage]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
    }
  }, []);

  const sendMessage = useCallback(() => {
    if (!wsRef.current || status !== 'connected' || !inputMsg.trim()) return;
    wsRef.current.send(inputMsg);
    addMessage('sent', inputMsg);
  }, [status, inputMsg, addMessage]);

  const sendJson = useCallback((obj: object) => {
    const text = JSON.stringify(obj);
    if (!wsRef.current || status !== 'connected') return;
    wsRef.current.send(text);
    addMessage('sent', text);
  }, [status, addMessage]);

  const clearLog = useCallback(() => setMessages([]), []);

  function tryFormatJson(s: string): string {
    if (!showRaw) {
      try { return JSON.stringify(JSON.parse(s), null, 2); } catch { /* not json */ }
    }
    return s;
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const QUICK_SENDS = [
    { label: 'Ping JSON', msg: { type: 'ping', id: Date.now() } },
    { label: 'Hello', msg: { message: 'hello', ts: Date.now() } },
    { label: 'Subscribe', msg: { action: 'subscribe', channel: 'test' } },
  ];

  return (
    <div class="space-y-4">
      {/* URL + connect */}
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input
            value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)}
            disabled={status === 'connected' || status === 'connecting'}
            placeholder="wss://echo.websocket.events"
            class="w-full bg-surface border border-border rounded px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent text-text disabled:opacity-60"
          />
        </div>
        {status === 'connected' ? (
          <button onClick={disconnect} class="px-4 py-2 text-sm bg-red-900/50 border border-red-700 text-red-300 rounded hover:bg-red-900 transition-colors">
            Disconnect
          </button>
        ) : (
          <button onClick={connect} disabled={status === 'connecting' || !url}
            class="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 transition-colors disabled:opacity-50">
            Connect
          </button>
        )}
      </div>

      {/* Status bar */}
      <div class="flex items-center gap-3 text-sm">
        <div class="flex items-center gap-1.5">
          <span class={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
          <span class={STATUS_COLORS[status]}>{STATUS_LABEL[status]}</span>
        </div>
        <span class="text-text-muted text-xs">{messages.filter(m => m.direction !== 'system').length} messages</span>
        <div class="ml-auto flex items-center gap-3 text-xs text-text-muted">
          <label class="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll((e.target as HTMLInputElement).checked)} class="accent-accent" />
            Auto-scroll
          </label>
          <label class="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showRaw} onChange={e => setShowRaw((e.target as HTMLInputElement).checked)} class="accent-accent" />
            Raw
          </label>
          <button onClick={clearLog} class="hover:text-red-400 transition-colors">Clear</button>
        </div>
      </div>

      {/* Message log */}
      <div ref={logRef} class="h-72 bg-[#0d1117] border border-border rounded-lg overflow-y-auto font-mono text-xs">
        {messages.length === 0 ? (
          <div class="flex items-center justify-center h-full text-text-muted text-sm">
            Connect to a WebSocket server to see messages
          </div>
        ) : (
          <div class="p-3 space-y-1">
            {messages.map(msg => (
              <div key={msg.id} class={`flex gap-2 ${msg.direction === 'system' ? 'text-text-muted/60' : ''}`}>
                <span class="text-text-muted/40 shrink-0 select-none w-24">{formatTime(msg.timestamp)}</span>
                <span class={`shrink-0 w-4 font-bold ${msg.direction === 'sent' ? 'text-blue-400' : msg.direction === 'received' ? 'text-green-400' : 'text-text-muted/40'}`}>
                  {msg.direction === 'sent' ? '▶' : msg.direction === 'received' ? '◀' : '·'}
                </span>
                <span class={`break-all whitespace-pre-wrap ${msg.direction === 'sent' ? 'text-blue-300' : msg.direction === 'received' ? 'text-green-300' : 'text-text-muted/60'}`}>
                  {tryFormatJson(msg.content)}
                </span>
                {msg.direction !== 'system' && (
                  <span class="text-text-muted/30 shrink-0 ml-auto">{msg.size}B</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium">Message</label>
          <span class="text-xs text-text-muted">Ctrl+Enter to send</span>
        </div>
        <textarea
          ref={msgRef}
          value={inputMsg}
          onInput={e => setInputMsg((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          disabled={status !== 'connected'}
          placeholder='{"type": "ping"}'
          class="w-full h-24 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text disabled:opacity-50"
          spellcheck={false}
        />
        <div class="flex items-center gap-2 flex-wrap">
          <button
            onClick={sendMessage}
            disabled={status !== 'connected' || !inputMsg.trim()}
            class="px-4 py-2 text-sm bg-accent text-white rounded hover:bg-accent/80 transition-colors disabled:opacity-40"
          >
            Send
          </button>
          <span class="text-text-muted text-xs">Quick send:</span>
          {QUICK_SENDS.map(qs => (
            <button
              key={qs.label}
              onClick={() => sendJson(qs.msg)}
              disabled={status !== 'connected'}
              class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors disabled:opacity-40"
            >
              {qs.label}
            </button>
          ))}
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Try <code class="font-mono bg-surface px-1 rounded">wss://echo.websocket.events</code> — a free echo server that returns every message you send.
      </p>
    </div>
  );
}
