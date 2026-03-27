import { useState } from 'preact/hooks';

type ServicePreset = {
  name: string;
  event: string;
  headers: Record<string, string>;
  body: object;
};

const PRESETS: ServicePreset[] = [
  {
    name: 'GitHub',
    event: 'push',
    headers: {
      'Content-Type': 'application/json',
      'X-GitHub-Event': 'push',
      'X-Hub-Signature-256': 'sha256=abc123...',
      'User-Agent': 'GitHub-Hookshot/abc1234',
    },
    body: {
      ref: 'refs/heads/main',
      repository: { full_name: 'owner/repo', private: false },
      pusher: { name: 'octocat', email: 'octocat@github.com' },
      commits: [{ id: 'abc123', message: 'Fix bug', author: { name: 'octocat' }, url: 'https://github.com/owner/repo/commit/abc123' }],
    },
  },
  {
    name: 'Stripe',
    event: 'payment_intent.succeeded',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': 't=1614556800,v1=abc123...',
    },
    body: {
      id: 'evt_1234567890',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_1234567890',
          amount: 2000,
          currency: 'usd',
          status: 'succeeded',
          customer: 'cus_abc123',
        },
      },
      created: 1614556800,
    },
  },
  {
    name: 'Slack',
    event: 'message',
    headers: {
      'Content-Type': 'application/json',
      'X-Slack-Signature': 'v0=abc123...',
      'X-Slack-Request-Timestamp': '1614556800',
    },
    body: {
      token: 'Jhj5dZrVaK7ZwHHjRyZWjbDl',
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'C1234567890',
        user: 'U1234567890',
        text: 'Hello, World!',
        ts: '1614556800.000100',
      },
    },
  },
  {
    name: 'Custom',
    event: 'custom.event',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': 'your-secret-here',
    },
    body: {
      event: 'custom.event',
      timestamp: Math.floor(Date.now() / 1000),
      data: { id: 'obj_123', status: 'active' },
    },
  },
];

function generateCurl(url: string, headers: Record<string, string>, body: object): string {
  const headerFlags = Object.entries(headers)
    .map(([k, v]) => `  -H '${k}: ${v}'`)
    .join(' \\\n');
  const bodyStr = JSON.stringify(body, null, 2);
  return `curl -X POST '${url}' \\\n${headerFlags} \\\n  -d '${bodyStr}'`;
}

export default function WebhookTester() {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [targetUrl, setTargetUrl] = useState('https://your-api.example.com/webhook');
  const [customBody, setCustomBody] = useState('');
  const [customHeaders, setCustomHeaders] = useState('');
  const [tab, setTab] = useState<'payload' | 'headers' | 'curl'>('payload');
  const [editMode, setEditMode] = useState(false);

  const preset = PRESETS[selectedPreset];
  const bodyObj = (() => {
    if (editMode && customBody) {
      try { return JSON.parse(customBody); } catch { return preset.body; }
    }
    return preset.body;
  })();
  const headersObj = (() => {
    if (editMode && customHeaders) {
      try { return JSON.parse(customHeaders); } catch { return preset.headers; }
    }
    return preset.headers;
  })();

  const handlePresetChange = (idx: number) => {
    setSelectedPreset(idx);
    setCustomBody('');
    setCustomHeaders('');
    setEditMode(false);
  };

  const handleEdit = () => {
    setCustomBody(JSON.stringify(preset.body, null, 2));
    setCustomHeaders(JSON.stringify(preset.headers, null, 2));
    setEditMode(true);
  };

  const curlCmd = generateCurl(targetUrl, headersObj, bodyObj);

  return (
    <div class="space-y-4">
      {/* Service selector */}
      <div class="flex gap-2 flex-wrap">
        {PRESETS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => handlePresetChange(i)}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              selectedPreset === i
                ? 'bg-primary text-white'
                : 'bg-surface text-text-muted hover:bg-surface-hover'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Target URL */}
      <div>
        <label class="block text-sm font-medium mb-1">Target URL</label>
        <input
          type="text"
          value={targetUrl}
          onInput={(e) => setTargetUrl((e.target as HTMLInputElement).value)}
          placeholder="https://your-api.example.com/webhook"
          class="w-full font-mono text-sm bg-surface border border-border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Event badge */}
      <div class="flex items-center gap-3">
        <span class="text-sm text-text-muted">Event:</span>
        <code class="bg-surface px-2 py-0.5 rounded text-sm text-primary font-mono">{preset.event}</code>
        {!editMode && (
          <button
            onClick={handleEdit}
            class="text-xs text-text-muted hover:text-text underline"
          >
            Customize payload
          </button>
        )}
      </div>

      {/* Tabs */}
      <div class="border-b border-border">
        <div class="flex gap-4">
          {(['payload', 'headers', 'curl'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              class={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {t === 'curl' ? 'curl Command' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'payload' && (
        <div>
          {editMode ? (
            <textarea
              value={customBody}
              onInput={(e) => setCustomBody((e.target as HTMLTextAreaElement).value)}
              class="w-full h-64 font-mono text-sm bg-surface border border-border rounded p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              spellcheck={false}
            />
          ) : (
            <pre class="bg-surface border border-border rounded p-4 text-sm font-mono overflow-auto max-h-64 text-text">
              {JSON.stringify(bodyObj, null, 2)}
            </pre>
          )}
        </div>
      )}

      {tab === 'headers' && (
        <div>
          {editMode ? (
            <textarea
              value={customHeaders}
              onInput={(e) => setCustomHeaders((e.target as HTMLTextAreaElement).value)}
              class="w-full h-48 font-mono text-sm bg-surface border border-border rounded p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
              spellcheck={false}
            />
          ) : (
            <div class="space-y-1">
              {Object.entries(headersObj).map(([k, v]) => (
                <div key={k} class="flex items-start gap-2 font-mono text-sm bg-surface border border-border rounded px-3 py-1.5">
                  <span class="text-primary min-w-fit">{k}:</span>
                  <span class="text-text break-all">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'curl' && (
        <div class="relative">
          <pre class="bg-surface border border-border rounded p-4 text-sm font-mono overflow-auto max-h-64 text-text">
            {curlCmd}
          </pre>
          <button
            onClick={() => navigator.clipboard.writeText(curlCmd)}
            class="absolute top-2 right-2 px-2 py-1 bg-primary text-white text-xs rounded hover:bg-primary/80 transition-colors"
          >
            Copy
          </button>
        </div>
      )}

      {/* Info boxes */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        <div class="bg-surface rounded p-3 text-sm">
          <div class="font-medium mb-1">Payload size</div>
          <div class="text-text-muted font-mono">{new Blob([JSON.stringify(bodyObj)]).size} bytes</div>
        </div>
        <div class="bg-surface rounded p-3 text-sm">
          <div class="font-medium mb-1">Headers</div>
          <div class="text-text-muted font-mono">{Object.keys(headersObj).length} headers</div>
        </div>
        <div class="bg-surface rounded p-3 text-sm">
          <div class="font-medium mb-1">Content-Type</div>
          <div class="text-text-muted font-mono">{headersObj['Content-Type'] || 'not set'}</div>
        </div>
      </div>

      <p class="text-xs text-text-muted bg-surface/50 border border-border rounded px-3 py-2">
        💡 Copy the curl command and run it in your terminal to send the test webhook to your endpoint. Direct browser-to-server requests may be blocked by CORS — use curl for local development.
      </p>
    </div>
  );
}
