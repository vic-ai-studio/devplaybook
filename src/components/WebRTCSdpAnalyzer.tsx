import { useState, useCallback } from 'preact/hooks';

interface SdpMediaSection {
  type: string;
  port: string;
  protocol: string;
  codecs: string[];
  direction: string;
  ssrcs: string[];
  candidates: string[];
  mid: string;
  rtcpFb: string[];
  extmap: string[];
  fmtp: string[];
}

interface SdpAnalysis {
  version: string;
  sessionName: string;
  origin: string;
  fingerprint: string;
  ice: { ufrag: string; pwd: string };
  setup: string;
  bandwidth: string;
  groups: string[];
  mediaSections: SdpMediaSection[];
}

const SAMPLE_SDP = `v=0
o=- 4611731400430051336 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1
a=extmap-allow-mixed
a=msid-semantic: WMS stream1
m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:abcd1234
a=ice-pwd:xyz987654321abcdefghijklmn
a=ice-options:trickle
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=sendrecv
a=msid:stream1 audio1
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptype=10;useinbandfec=1
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=ssrc:1234567890 cname:user@example.com
a=ssrc:1234567890 msid:stream1 audio1
a=candidate:1 1 UDP 2113667327 192.168.1.100 54400 typ host
a=candidate:2 1 UDP 1677729535 203.0.113.1 54400 typ srflx raddr 192.168.1.100 rport 54400
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 121 127 120 125 107 108 109 35 36 124 119 123 118 114 115 116
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:abcd1234
a=ice-pwd:xyz987654321abcdefghijklmn
a=ice-options:trickle
a=fingerprint:sha-256 AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
a=setup:actpass
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=sendrecv
a=msid:stream1 video1
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:98 VP9/90000
a=rtpmap:99 H264/90000
a=fmtp:99 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=ssrc-group:FID 2345678901 3456789012
a=ssrc:2345678901 cname:user@example.com
a=ssrc:3456789012 cname:user@example.com
a=candidate:1 1 UDP 2113667327 192.168.1.100 54401 typ host`;

function parseSdp(sdp: string): SdpAnalysis {
  const lines = sdp.split('\n').map(l => l.trim());
  const result: SdpAnalysis = {
    version: '',
    sessionName: '',
    origin: '',
    fingerprint: '',
    ice: { ufrag: '', pwd: '' },
    setup: '',
    bandwidth: '',
    groups: [],
    mediaSections: [],
  };

  let currentMedia: SdpMediaSection | null = null;

  for (const line of lines) {
    if (!line) continue;
    const [type, ...rest] = line.split('=');
    const value = rest.join('=');

    if (currentMedia === null) {
      // Session-level
      if (type === 'v') result.version = value;
      else if (type === 's') result.sessionName = value;
      else if (type === 'o') result.origin = value;
      else if (type === 'a') {
        if (value.startsWith('fingerprint:')) result.fingerprint = value.replace('fingerprint:', '');
        else if (value.startsWith('ice-ufrag:')) result.ice.ufrag = value.replace('ice-ufrag:', '');
        else if (value.startsWith('ice-pwd:')) result.ice.pwd = value.replace('ice-pwd:', '');
        else if (value.startsWith('setup:')) result.setup = value.replace('setup:', '');
        else if (value.startsWith('group:')) result.groups.push(value.replace('group:', ''));
      } else if (type === 'b') result.bandwidth = value;
    }

    if (type === 'm') {
      const parts = value.split(' ');
      currentMedia = {
        type: parts[0],
        port: parts[1],
        protocol: parts[2],
        codecs: parts.slice(3),
        direction: '',
        ssrcs: [],
        candidates: [],
        mid: '',
        rtcpFb: [],
        extmap: [],
        fmtp: [],
      };
      result.mediaSections.push(currentMedia);
    } else if (currentMedia && type === 'a') {
      if (['sendrecv', 'sendonly', 'recvonly', 'inactive'].includes(value)) {
        currentMedia.direction = value;
      } else if (value.startsWith('ssrc:')) {
        const ssrc = value.split(' ')[0].replace('ssrc:', '');
        if (!currentMedia.ssrcs.includes(ssrc)) currentMedia.ssrcs.push(ssrc);
      } else if (value.startsWith('candidate:')) {
        currentMedia.candidates.push(value);
      } else if (value.startsWith('mid:')) {
        currentMedia.mid = value.replace('mid:', '');
      } else if (value.startsWith('rtcp-fb:')) {
        currentMedia.rtcpFb.push(value.replace('rtcp-fb:', ''));
      } else if (value.startsWith('extmap:')) {
        currentMedia.extmap.push(value.replace('extmap:', ''));
      } else if (value.startsWith('fmtp:')) {
        currentMedia.fmtp.push(value.replace('fmtp:', ''));
      } else if (value.startsWith('fingerprint:') && !result.fingerprint) {
        result.fingerprint = value.replace('fingerprint:', '');
      } else if (value.startsWith('ice-ufrag:') && !result.ice.ufrag) {
        result.ice.ufrag = value.replace('ice-ufrag:', '');
      } else if (value.startsWith('ice-pwd:') && !result.ice.pwd) {
        result.ice.pwd = value.replace('ice-pwd:', '');
      } else if (value.startsWith('setup:') && !result.setup) {
        result.setup = value.replace('setup:', '');
      }
    }
  }

  return result;
}

function CandidateRow({ raw }: { raw: string }) {
  const parts = raw.replace('candidate:', '').split(' ');
  const foundation = parts[0];
  const component = parts[1] === '1' ? 'RTP' : 'RTCP';
  const proto = parts[2];
  const priority = parts[3];
  const ip = parts[4];
  const port = parts[5];
  const typIdx = parts.indexOf('typ');
  const candType = typIdx !== -1 ? parts[typIdx + 1] : '?';
  const raddr = parts.indexOf('raddr') !== -1 ? parts[parts.indexOf('raddr') + 1] : '';
  const typeColor: Record<string, string> = {
    host: 'text-green-400',
    srflx: 'text-yellow-400',
    relay: 'text-orange-400',
    prflx: 'text-blue-400',
  };

  return (
    <tr class="border-b border-border/30 text-xs">
      <td class="py-1.5 pr-3 font-mono text-text-muted">{foundation}</td>
      <td class="py-1.5 pr-3 text-text">{component}</td>
      <td class="py-1.5 pr-3 text-text">{proto}</td>
      <td class="py-1.5 pr-3 font-mono text-text">{ip}:{port}</td>
      <td class={`py-1.5 pr-3 font-medium ${typeColor[candType] || 'text-text'}`}>{candType}</td>
      <td class="py-1.5 pr-3 text-text-muted font-mono">{priority}</td>
      {raddr && <td class="py-1.5 text-text-muted font-mono">{raddr}</td>}
    </tr>
  );
}

export default function WebRTCSdpAnalyzer() {
  const [sdp, setSdp] = useState(SAMPLE_SDP);
  const [analysis, setAnalysis] = useState<SdpAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'media' | 'ice' | 'raw'>('overview');
  const [copied, setCopied] = useState(false);

  const analyze = useCallback(() => {
    try {
      setAnalysis(parseSdp(sdp));
    } catch {
      setAnalysis(null);
    }
  }, [sdp]);

  const loadSample = useCallback(() => {
    setSdp(SAMPLE_SDP);
    setAnalysis(null);
  }, []);

  const copy = useCallback((text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  const dirColor = (d: string) => ({
    sendrecv: 'text-green-400', sendonly: 'text-yellow-400',
    recvonly: 'text-blue-400', inactive: 'text-text-muted',
  }[d] || 'text-text');

  const TAB_CLS = (t: string) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${activeTab === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`;

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="flex gap-2 items-center flex-wrap">
        <span class="text-sm font-medium text-text">SDP Offer / Answer</span>
        <button onClick={loadSample} class="ml-auto px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
          Load Sample
        </button>
      </div>
      <textarea
        value={sdp}
        onInput={e => { setSdp((e.target as HTMLTextAreaElement).value); setAnalysis(null); }}
        placeholder="Paste your WebRTC SDP offer or answer here..."
        class="w-full h-48 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
        spellcheck={false}
      />
      <button onClick={analyze} class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium">
        Analyze SDP
      </button>

      {analysis && (
        <div class="space-y-4">
          {/* Tabs */}
          <div class="flex gap-1 flex-wrap">
            {(['overview', 'media', 'ice', 'raw'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)} class={TAB_CLS(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'SDP Version', value: analysis.version || '0' },
                  { label: 'Session Name', value: analysis.sessionName || '(unnamed)' },
                  { label: 'DTLS Setup Role', value: analysis.setup || 'not set', highlight: analysis.setup === 'actpass' ? 'text-green-400' : 'text-yellow-400' },
                  { label: 'Media Sections', value: `${analysis.mediaSections.length} track${analysis.mediaSections.length !== 1 ? 's' : ''}` },
                  { label: 'BUNDLE Groups', value: analysis.groups.join(', ') || 'none' },
                  { label: 'Bandwidth', value: analysis.bandwidth || 'not specified' },
                ].map(({ label, value, highlight }) => (
                  <div key={label} class="p-3 bg-surface border border-border rounded-lg">
                    <div class="text-xs text-text-muted mb-1">{label}</div>
                    <div class={`text-sm font-mono font-medium ${highlight || 'text-text'}`}>{value}</div>
                  </div>
                ))}
              </div>

              {analysis.fingerprint && (
                <div class="p-3 bg-surface border border-border rounded-lg">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-text-muted">DTLS Fingerprint</span>
                    <button onClick={() => copy(analysis.fingerprint)} class="text-xs text-accent hover:underline">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div class="text-xs font-mono text-green-400 break-all">{analysis.fingerprint}</div>
                </div>
              )}

              {(analysis.ice.ufrag || analysis.ice.pwd) && (
                <div class="p-3 bg-surface border border-border rounded-lg">
                  <div class="text-xs text-text-muted mb-2">ICE Credentials</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                    <div><span class="text-text-muted">ufrag: </span><span class="text-text">{analysis.ice.ufrag}</span></div>
                    <div><span class="text-text-muted">pwd: </span><span class="text-text">{analysis.ice.pwd.substring(0, 12)}…</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Media Sections Tab */}
          {activeTab === 'media' && (
            <div class="space-y-4">
              {analysis.mediaSections.map((m, i) => (
                <div key={i} class="p-4 bg-surface border border-border rounded-lg space-y-3">
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs font-bold uppercase">{m.type}</span>
                    {m.mid && <span class="text-xs text-text-muted">mid={m.mid}</span>}
                    {m.direction && <span class={`text-xs font-medium ${dirColor(m.direction)}`}>{m.direction}</span>}
                    <span class="text-xs text-text-muted">port {m.port} · {m.protocol}</span>
                  </div>

                  {m.codecs.length > 0 && (
                    <div>
                      <div class="text-xs text-text-muted mb-1">Payload Types</div>
                      <div class="flex flex-wrap gap-1.5">
                        {m.codecs.map(c => (
                          <span key={c} class="px-1.5 py-0.5 bg-[#0d1117] border border-border rounded text-xs font-mono text-text">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.fmtp.length > 0 && (
                    <div>
                      <div class="text-xs text-text-muted mb-1">Format Parameters (fmtp)</div>
                      <div class="space-y-1">
                        {m.fmtp.map((f, fi) => (
                          <div key={fi} class="text-xs font-mono text-text bg-[#0d1117] px-2 py-1 rounded border border-border/50">{f}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.rtcpFb.length > 0 && (
                    <div>
                      <div class="text-xs text-text-muted mb-1">RTCP Feedback</div>
                      <div class="flex flex-wrap gap-1.5">
                        {m.rtcpFb.map((r, ri) => (
                          <span key={ri} class="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.ssrcs.length > 0 && (
                    <div>
                      <div class="text-xs text-text-muted mb-1">SSRCs</div>
                      <div class="flex flex-wrap gap-1.5">
                        {m.ssrcs.map(s => (
                          <span key={s} class="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-xs font-mono text-purple-400">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.extmap.length > 0 && (
                    <div>
                      <div class="text-xs text-text-muted mb-1">RTP Header Extensions</div>
                      <div class="space-y-1">
                        {m.extmap.map((e, ei) => (
                          <div key={ei} class="text-xs font-mono text-text-muted bg-[#0d1117] px-2 py-1 rounded border border-border/30">{e}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ICE Tab */}
          {activeTab === 'ice' && (
            <div class="space-y-3">
              {analysis.mediaSections.filter(m => m.candidates.length > 0).map((m, i) => (
                <div key={i} class="p-4 bg-surface border border-border rounded-lg">
                  <div class="text-sm font-medium text-text mb-3">
                    {m.type.toUpperCase()} candidates {m.mid ? `(mid: ${m.mid})` : ''}
                    <span class="ml-2 text-xs text-text-muted">{m.candidates.length} candidate{m.candidates.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead>
                        <tr class="text-xs text-text-muted border-b border-border">
                          <th class="text-left pb-2 pr-3">Foundation</th>
                          <th class="text-left pb-2 pr-3">Comp</th>
                          <th class="text-left pb-2 pr-3">Proto</th>
                          <th class="text-left pb-2 pr-3">Address</th>
                          <th class="text-left pb-2 pr-3">Type</th>
                          <th class="text-left pb-2">Priority</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.candidates.map((c, ci) => (
                          <CandidateRow key={ci} raw={c} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div class="mt-3 flex gap-4 text-xs text-text-muted flex-wrap">
                    <span class="flex items-center gap-1"><span class="text-green-400">■</span> host (local)</span>
                    <span class="flex items-center gap-1"><span class="text-yellow-400">■</span> srflx (STUN)</span>
                    <span class="flex items-center gap-1"><span class="text-orange-400">■</span> relay (TURN)</span>
                    <span class="flex items-center gap-1"><span class="text-blue-400">■</span> prflx (peer)</span>
                  </div>
                </div>
              ))}
              {analysis.mediaSections.every(m => m.candidates.length === 0) && (
                <div class="p-4 bg-surface border border-border rounded-lg text-sm text-text-muted">
                  No ICE candidates found. This may be a Trickle ICE SDP where candidates are sent separately.
                </div>
              )}
            </div>
          )}

          {/* Raw Tab */}
          {activeTab === 'raw' && (
            <div class="relative">
              <button
                onClick={() => copy(sdp)}
                class="absolute top-2 right-2 px-2 py-1 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <pre class="bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-text overflow-x-auto max-h-96 whitespace-pre-wrap break-all">{sdp}</pre>
            </div>
          )}
        </div>
      )}

      <p class="text-xs text-text-muted">
        Parses WebRTC SDP offer/answer locally in your browser. Extracts media sections, codecs, ICE candidates, DTLS fingerprint, SSRC identifiers, and header extensions. Nothing is sent to any server.
      </p>
    </div>
  );
}
