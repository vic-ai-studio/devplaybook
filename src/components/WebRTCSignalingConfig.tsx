import { useState, useCallback } from 'preact/hooks';

interface StunServer {
  urls: string;
}

interface TurnServer {
  urls: string;
  username: string;
  credential: string;
}

interface IceConfig {
  iceServers: (StunServer | TurnServer)[];
  iceTransportPolicy: 'all' | 'relay';
  iceCandidatePoolSize: number;
  bundlePolicy: 'balanced' | 'max-bundle' | 'max-compat';
  rtcpMuxPolicy: 'require' | 'negotiate';
}

const PUBLIC_STUN = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun.cloudflare.com:3478',
  'stun:stun.nextcloud.com:443',
];

const BROWSER_COMPAT: Record<string, Record<string, string>> = {
  chrome: { stun: '✅', turn_udp: '✅', turn_tcp: '✅', turn_tls: '✅' },
  firefox: { stun: '✅', turn_udp: '✅', turn_tcp: '✅', turn_tls: '✅' },
  safari: { stun: '✅', turn_udp: '✅', turn_tcp: '✅', turn_tls: '✅ (14.1+)' },
  edge: { stun: '✅', turn_udp: '✅', turn_tcp: '✅', turn_tls: '✅' },
  ios_safari: { stun: '✅', turn_udp: '✅', turn_tcp: '✅', turn_tls: '⚠️ (13+)' },
};

export default function WebRTCSignalingConfig() {
  const [usePublicStun, setUsePublicStun] = useState(true);
  const [customStun, setCustomStun] = useState('');
  const [useTurn, setUseTurn] = useState(false);
  const [turnUrl, setTurnUrl] = useState('turn:turn.example.com:3478');
  const [turnUser, setTurnUser] = useState('username');
  const [turnCred, setTurnCred] = useState('password');
  const [turnTls, setTurnTls] = useState(false);
  const [relayOnly, setRelayOnly] = useState(false);
  const [bundlePolicy, setBundlePolicy] = useState<IceConfig['bundlePolicy']>('max-bundle');
  const [poolSize, setPoolSize] = useState(0);
  const [outputFormat, setOutputFormat] = useState<'js' | 'json' | 'python'>('js');
  const [copied, setCopied] = useState(false);

  const config = useCallback((): IceConfig => {
    const iceServers: (StunServer | TurnServer)[] = [];

    if (usePublicStun) {
      PUBLIC_STUN.slice(0, 2).forEach(u => iceServers.push({ urls: u }));
    }
    if (customStun.trim()) {
      customStun.trim().split('\n').filter(Boolean).forEach(u => {
        iceServers.push({ urls: u.trim().startsWith('stun:') ? u.trim() : `stun:${u.trim()}` });
      });
    }
    if (useTurn) {
      const protocol = turnTls ? 'turns' : 'turn';
      iceServers.push({
        urls: `${protocol}:${turnUrl.replace(/^turns?:/, '')}`,
        username: turnUser,
        credential: turnCred,
      });
      if (turnTls) {
        iceServers.push({
          urls: `turn:${turnUrl.replace(/^turns?:/, '')}?transport=tcp`,
          username: turnUser,
          credential: turnCred,
        });
      }
    }

    return {
      iceServers,
      iceTransportPolicy: relayOnly ? 'relay' : 'all',
      iceCandidatePoolSize: poolSize,
      bundlePolicy,
      rtcpMuxPolicy: 'require',
    };
  }, [usePublicStun, customStun, useTurn, turnUrl, turnUser, turnCred, turnTls, relayOnly, bundlePolicy, poolSize]);

  const generateOutput = useCallback(() => {
    const cfg = config();
    if (outputFormat === 'json') {
      return JSON.stringify(cfg, null, 2);
    }
    if (outputFormat === 'python') {
      const servers = cfg.iceServers.map(s => {
        if ('username' in s) {
          return `    {"urls": "${s.urls}", "username": "${s.username}", "credential": "${s.credential}"}`;
        }
        return `    {"urls": "${s.urls}"}`;
      }).join(',\n');
      return `# RTCPeerConnection configuration
config = {
    "iceServers": [
${servers}
    ],
    "iceTransportPolicy": "${cfg.iceTransportPolicy}",
    "iceCandidatePoolSize": ${cfg.iceCandidatePoolSize},
    "bundlePolicy": "${cfg.bundlePolicy}",
    "rtcpMuxPolicy": "${cfg.rtcpMuxPolicy}",
}

# JavaScript (aiortc / browser bridge)
# pc = RTCPeerConnection(config)`;
    }
    // JS
    const cfgStr = JSON.stringify(cfg, null, 2);
    return `const iceConfig = ${cfgStr};

const pc = new RTCPeerConnection(iceConfig);

pc.onicecandidate = (event) => {
  if (event.candidate) {
    // Send candidate to remote peer via signaling server
    signalingChannel.send(JSON.stringify({
      type: 'ice-candidate',
      candidate: event.candidate,
    }));
  }
};

pc.onconnectionstatechange = () => {
  console.log('Connection state:', pc.connectionState);
};`;
  }, [config, outputFormat]);

  const output = generateOutput();

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const validation = useCallback(() => {
    const msgs: { level: 'error' | 'warning' | 'info'; text: string }[] = [];
    const cfg = config();
    if (cfg.iceServers.length === 0) {
      msgs.push({ level: 'error', text: 'No ICE servers configured. Connections will only work on the same local network.' });
    }
    const hasStun = cfg.iceServers.some(s => s.urls.startsWith('stun:'));
    const hasTurn = cfg.iceServers.some(s => s.urls.startsWith('turn:') || s.urls.startsWith('turns:'));
    if (!hasTurn) {
      msgs.push({ level: 'warning', text: 'No TURN server. Peers behind symmetric NAT (~10-15% of users) will fail to connect.' });
    }
    if (!hasStun && !hasTurn) {
      msgs.push({ level: 'error', text: 'No STUN or TURN servers configured.' });
    }
    if (relayOnly && !hasTurn) {
      msgs.push({ level: 'error', text: 'iceTransportPolicy=relay requires a TURN server.' });
    }
    if (useTurn && (!turnUser.trim() || !turnCred.trim())) {
      msgs.push({ level: 'error', text: 'TURN server credentials are required.' });
    }
    if (poolSize > 10) {
      msgs.push({ level: 'warning', text: 'iceCandidatePoolSize > 10 can increase resource usage unnecessarily.' });
    }
    if (msgs.length === 0) {
      msgs.push({ level: 'info', text: 'Configuration looks good.' });
    }
    return msgs;
  }, [config, relayOnly, useTurn, turnUser, turnCred, poolSize]);

  const issues = validation();

  return (
    <div class="space-y-6">
      {/* STUN Config */}
      <div class="bg-surface rounded-lg p-4 border border-border space-y-3">
        <h2 class="font-semibold text-base">STUN Servers</h2>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={usePublicStun}
            onChange={e => setUsePublicStun((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 accent-accent"
          />
          <span class="text-sm">Use Google + Cloudflare public STUN (free, reliable)</span>
        </label>
        <div>
          <label class="block text-xs text-text-muted mb-1">Custom STUN URLs (one per line, optional)</label>
          <textarea
            class="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            rows={2}
            placeholder="stun:stun.yourserver.com:3478"
            value={customStun}
            onInput={e => setCustomStun((e.target as HTMLTextAreaElement).value)}
          />
        </div>
      </div>

      {/* TURN Config */}
      <div class="bg-surface rounded-lg p-4 border border-border space-y-3">
        <label class="flex items-center gap-2 cursor-pointer font-semibold">
          <input
            type="checkbox"
            checked={useTurn}
            onChange={e => setUseTurn((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 accent-accent"
          />
          <span>TURN Server (required for NAT traversal)</span>
        </label>
        {useTurn && (
          <div class="space-y-3">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">TURN Server URL</label>
                <input
                  type="text"
                  class="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  value={turnUrl}
                  onInput={e => setTurnUrl((e.target as HTMLInputElement).value)}
                  placeholder="turn:turn.example.com:3478"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Username</label>
                <input
                  type="text"
                  class="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  value={turnUser}
                  onInput={e => setTurnUser((e.target as HTMLInputElement).value)}
                />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">Credential (Password)</label>
                <input
                  type="text"
                  class="w-full bg-bg border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  value={turnCred}
                  onInput={e => setTurnCred((e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="flex items-end pb-1">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={turnTls}
                    onChange={e => setTurnTls((e.target as HTMLInputElement).checked)}
                    class="w-4 h-4 accent-accent"
                  />
                  <span class="text-sm">Enable TURNS (TLS, port 443)</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div class="bg-surface rounded-lg p-4 border border-border space-y-3">
        <h2 class="font-semibold text-base">Advanced Options</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Bundle Policy</label>
            <select
              class="w-full bg-bg border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              value={bundlePolicy}
              onChange={e => setBundlePolicy((e.target as HTMLSelectElement).value as IceConfig['bundlePolicy'])}
            >
              <option value="max-bundle">max-bundle (recommended)</option>
              <option value="balanced">balanced</option>
              <option value="max-compat">max-compat (legacy)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">ICE Candidate Pool Size: {poolSize}</label>
            <input
              type="range" min={0} max={20} value={poolSize}
              onInput={e => setPoolSize(Number((e.target as HTMLInputElement).value))}
              class="w-full"
            />
          </div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={relayOnly}
            onChange={e => setRelayOnly((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 accent-accent"
          />
          <span class="text-sm">Relay-only mode (iceTransportPolicy: relay) — forces TURN, improves privacy</span>
        </label>
      </div>

      {/* Validation */}
      {issues.length > 0 && (
        <div class="space-y-1">
          {issues.map((issue, i) => (
            <div key={i} class={`flex items-start gap-2 text-sm px-3 py-2 rounded ${
              issue.level === 'error' ? 'bg-red-500/10 text-red-400' :
              issue.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400' :
              'bg-green-500/10 text-green-400'
            }`}>
              <span>{issue.level === 'error' ? '✗' : issue.level === 'warning' ? '⚠' : '✓'}</span>
              <span>{issue.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Output */}
      <div class="bg-surface rounded-lg p-4 border border-border space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <h2 class="font-semibold text-base">Generated Config</h2>
          <div class="flex gap-2">
            {(['js', 'json', 'python'] as const).map(fmt => (
              <button
                key={fmt}
                onClick={() => setOutputFormat(fmt)}
                class={`px-3 py-1 text-xs rounded font-mono ${outputFormat === fmt ? 'bg-accent text-bg font-bold' : 'bg-bg border border-border hover:border-accent'}`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
            <button
              onClick={copy}
              class="px-3 py-1 text-xs rounded bg-accent text-bg font-semibold hover:opacity-90"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <pre class="bg-bg rounded p-3 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted border border-border">
          {output}
        </pre>
      </div>

      {/* Browser Compat */}
      <div class="bg-surface rounded-lg p-4 border border-border">
        <h2 class="font-semibold text-base mb-3">Browser Compatibility</h2>
        <div class="overflow-x-auto">
          <table class="text-xs w-full">
            <thead>
              <tr class="text-text-muted">
                <th class="text-left pb-2 pr-4">Browser</th>
                <th class="pb-2 pr-4">STUN</th>
                <th class="pb-2 pr-4">TURN/UDP</th>
                <th class="pb-2 pr-4">TURN/TCP</th>
                <th class="pb-2">TURNS/TLS</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(BROWSER_COMPAT).map(([browser, compat]) => (
                <tr key={browser} class="border-t border-border">
                  <td class="py-1.5 pr-4 capitalize font-medium">{browser.replace('_', ' ')}</td>
                  <td class="py-1.5 pr-4 text-center">{compat.stun}</td>
                  <td class="py-1.5 pr-4 text-center">{compat.turn_udp}</td>
                  <td class="py-1.5 pr-4 text-center">{compat.turn_tcp}</td>
                  <td class="py-1.5 text-center">{compat.turn_tls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
