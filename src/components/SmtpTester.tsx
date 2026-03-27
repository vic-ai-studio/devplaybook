import { useState } from 'preact/hooks';

type TestStep = { label: string; status: 'pending' | 'ok' | 'error' | 'running'; detail?: string };

function simulateSmtp(host: string, port: number, user: string, pass: string, tls: boolean): Promise<TestStep[]> {
  return new Promise((resolve) => {
    const steps: TestStep[] = [
      { label: `DNS lookup: ${host}`, status: 'pending' },
      { label: `TCP connect: ${host}:${port}`, status: 'pending' },
      { label: tls ? 'TLS handshake (STARTTLS)' : 'Plain connection established', status: 'pending' },
      { label: '220 SMTP greeting received', status: 'pending' },
      { label: 'EHLO sent, capabilities listed', status: 'pending' },
      { label: user ? 'AUTH LOGIN — credentials accepted' : 'No auth (anonymous)', status: 'pending' },
    ];

    // Detect likely invalid configs
    const knownBadPorts = [25]; // often blocked by ISPs
    const isLikelyBlocked = knownBadPorts.includes(port);
    const missingCredentials = user && !pass;

    let delay = 0;
    const results: TestStep[] = steps.map((s) => ({ ...s }));

    for (let i = 0; i < results.length; i++) {
      const idx = i;
      delay += 350 + Math.random() * 150;
      setTimeout(() => {
        if (isLikelyBlocked && idx === 1) {
          results[idx] = { ...results[idx], status: 'error', detail: `Port ${port} is commonly blocked by ISPs/cloud providers. Try 587 (STARTTLS) or 465 (SSL).` };
          // mark rest as error
          for (let j = idx + 1; j < results.length; j++) {
            results[j] = { ...results[j], status: 'error', detail: 'Skipped — TCP connection failed.' };
          }
          resolve([...results]);
          return;
        }
        if (missingCredentials && idx === 5) {
          results[idx] = { ...results[idx], status: 'error', detail: 'Username provided but no password — authentication would fail.' };
          resolve([...results]);
          return;
        }
        results[idx] = { ...results[idx], status: 'ok', detail: getOkDetail(idx, host, port, tls, user) };
        if (idx === results.length - 1) resolve([...results]);
      }, delay);
    }
  });
}

function getOkDetail(idx: number, host: string, port: number, tls: boolean, user: string): string {
  const details = [
    `Resolved ${host} → 203.0.113.${Math.floor(Math.random() * 250) + 1}`,
    `Connected to ${host}:${port} (simulated)`,
    tls ? 'TLS 1.3 negotiated, cipher: AES_128_GCM_SHA256' : 'Unencrypted connection (not recommended for production)',
    `220 ${host} ESMTP ready`,
    `250-AUTH PLAIN LOGIN\n250-STARTTLS\n250 SIZE 35882577`,
    user ? 'AUTH LOGIN 235 2.7.0 Authentication successful' : '(skipped — no credentials)',
  ];
  return details[idx] ?? '';
}

function statusIcon(s: TestStep['status']) {
  if (s === 'ok') return <span class="text-green-400">✓</span>;
  if (s === 'error') return <span class="text-red-400">✗</span>;
  if (s === 'running') return <span class="text-yellow-400 animate-pulse">●</span>;
  return <span class="text-text-muted">○</span>;
}

export default function SmtpTester() {
  const [host, setHost] = useState('smtp.gmail.com');
  const [port, setPort] = useState(587);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [tls, setTls] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const presets = [
    { label: 'Gmail', host: 'smtp.gmail.com', port: 587, tls: true },
    { label: 'Outlook', host: 'smtp.office365.com', port: 587, tls: true },
    { label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, tls: true },
    { label: 'Mailgun', host: 'smtp.mailgun.org', port: 587, tls: true },
    { label: 'SES', host: 'email-smtp.us-east-1.amazonaws.com', port: 587, tls: true },
  ];

  async function runTest() {
    if (!host || !port) return;
    setRunning(true);
    setDone(false);
    setSteps([]);

    const results = await simulateSmtp(host, port, user, pass, tls);
    setSteps(results);
    setRunning(false);
    setDone(true);
  }

  const allOk = done && steps.every(s => s.status === 'ok');
  const hasError = done && steps.some(s => s.status === 'error');

  return (
    <div class="space-y-5">
      {/* Presets */}
      <div>
        <p class="text-sm text-text-muted mb-2">Quick presets:</p>
        <div class="flex flex-wrap gap-2">
          {presets.map(p => (
            <button
              key={p.label}
              onClick={() => { setHost(p.host); setPort(p.port); setTls(p.tls); }}
              class="px-3 py-1 text-sm rounded border border-border hover:border-accent hover:text-accent transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-text-muted mb-1">SMTP Host</label>
          <input
            type="text"
            value={host}
            onInput={(e) => setHost((e.target as HTMLInputElement).value)}
            placeholder="smtp.example.com"
            class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label class="block text-sm text-text-muted mb-1">Port</label>
          <select
            value={port}
            onChange={(e) => setPort(Number((e.target as HTMLSelectElement).value))}
            class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent"
          >
            <option value={25}>25 (SMTP, often blocked)</option>
            <option value={465}>465 (SMTPS / SSL)</option>
            <option value={587}>587 (STARTTLS — recommended)</option>
            <option value={2525}>2525 (Alternate, no firewall)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-text-muted mb-1">Username (optional)</label>
          <input
            type="text"
            value={user}
            onInput={(e) => setUser((e.target as HTMLInputElement).value)}
            placeholder="user@example.com"
            class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label class="block text-sm text-text-muted mb-1">Password (optional)</label>
          <div class="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={pass}
              onInput={(e) => setPass((e.target as HTMLInputElement).value)}
              placeholder="••••••••"
              class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent pr-16"
            />
            <button
              onClick={() => setShowPass(v => !v)}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text transition-colors px-1"
            >
              {showPass ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
      </div>

      {/* TLS Toggle */}
      <label class="flex items-center gap-2 cursor-pointer w-fit">
        <div
          onClick={() => setTls(v => !v)}
          class={`w-10 h-5 rounded-full transition-colors ${tls ? 'bg-accent' : 'bg-border'} relative`}
        >
          <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${tls ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </div>
        <span class="text-sm">Enable STARTTLS</span>
      </label>

      {/* Test Button */}
      <button
        onClick={runTest}
        disabled={running || !host}
        class="px-5 py-2 bg-accent text-white rounded font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {running ? 'Testing…' : 'Test Connection'}
      </button>

      {/* Results */}
      {steps.length > 0 && (
        <div class="bg-surface border border-border rounded p-4 space-y-2 font-mono text-sm">
          <div class={`text-xs font-bold mb-3 ${allOk ? 'text-green-400' : hasError ? 'text-red-400' : 'text-yellow-400'}`}>
            {allOk ? '✓ Connection simulation passed' : hasError ? '✗ Issues detected' : 'Running…'}
          </div>
          {steps.map((s, i) => (
            <div key={i} class="flex gap-3">
              <span class="w-4 shrink-0 mt-0.5">{statusIcon(s.status)}</span>
              <div>
                <div class={s.status === 'error' ? 'text-red-300' : s.status === 'ok' ? 'text-text' : 'text-text-muted'}>{s.label}</div>
                {s.detail && <div class="text-text-muted text-xs mt-0.5 whitespace-pre-wrap">{s.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <p class="text-xs text-text-muted">
        ⚠ This is a client-side simulation. Browsers cannot open raw TCP sockets — use this tool to validate config format and detect common issues (blocked ports, missing credentials). For live testing, use <code class="bg-surface px-1 rounded">swaks</code> or Telnet from your server.
      </p>
    </div>
  );
}
