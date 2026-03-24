import { useState } from 'preact/hooks';

// ─── 21 Deep Code Scan Patterns ───
const SCAN_PATTERNS = [
  { id: 1, pattern: 'eval()', risk: 'Critical', category: 'Code Injection', desc: 'Arbitrary code execution via eval()' },
  { id: 2, pattern: 'exec()', risk: 'Critical', category: 'Code Injection', desc: 'Arbitrary code execution via exec()' },
  { id: 3, pattern: '__import__()', risk: 'High', category: 'Dynamic Import', desc: 'Dynamic module loading bypasses static analysis' },
  { id: 4, pattern: 'importlib.*', risk: 'High', category: 'Dynamic Import', desc: 'Runtime module import can load malicious code' },
  { id: 5, pattern: 'os.system()', risk: 'Critical', category: 'Shell Injection', desc: 'Shell command execution with no sandboxing' },
  { id: 6, pattern: 'os.popen()', risk: 'Critical', category: 'Shell Injection', desc: 'Shell command execution via pipe' },
  { id: 7, pattern: 'os.exec*()', risk: 'Critical', category: 'Shell Injection', desc: 'Process replacement execution' },
  { id: 8, pattern: 'os.spawn*()', risk: 'High', category: 'Shell Injection', desc: 'Process spawning without subprocess safeguards' },
  { id: 9, pattern: 'subprocess.Popen()', risk: 'High', category: 'Shell Injection', desc: 'Subprocess execution — check shell=False' },
  { id: 10, pattern: 'ctypes.*', risk: 'Critical', category: 'Native Code', desc: 'Loading arbitrary native libraries' },
  { id: 11, pattern: 'pickle.load()', risk: 'Critical', category: 'Deserialization', desc: 'Pickle deserialization executes arbitrary code' },
  { id: 12, pattern: 'shelve.open()', risk: 'High', category: 'Deserialization', desc: 'Uses pickle internally — same risks' },
  { id: 13, pattern: 'shutil.rmtree()', risk: 'High', category: 'Filesystem', desc: 'Recursive directory deletion' },
  { id: 14, pattern: 'input()', risk: 'Medium', category: 'Blocking I/O', desc: 'Blocks unattended processes forever' },
  { id: 15, pattern: 'open(.*.key)', risk: 'High', category: 'Secret Access', desc: 'Reading key files directly' },
  { id: 16, pattern: 'open(.*.env)', risk: 'High', category: 'Secret Access', desc: 'Reading .env files with credentials' },
  { id: 17, pattern: 'open(.*token)', risk: 'High', category: 'Secret Access', desc: 'Reading token files directly' },
  { id: 18, pattern: 'open(.*webhook*.json)', risk: 'Medium', category: 'Secret Access', desc: 'Reading webhook configuration' },
  { id: 19, pattern: 'urllib.request.urlopen()', risk: 'Medium', category: 'Network', desc: 'Outbound HTTP — check against allowlist' },
  { id: 20, pattern: 'requests.get/post()', risk: 'Medium', category: 'Network', desc: 'Outbound HTTP — verify target domain' },
  { id: 21, pattern: 'url = "http..."', risk: 'Medium', category: 'Network', desc: 'Hardcoded URL — check allowlist' },
];

// ─── 13 Runtime Health Checks ───
const HEALTH_CHECKS = [
  { id: 1, name: 'PM2 Process Health', desc: 'Detects errored/stopped/crashed processes and auto-restarts them', icon: '🔄' },
  { id: 2, name: 'PM2 Restart Anomaly', desc: 'Flags processes with 50+ restarts (infinite crash loops)', icon: '🔁' },
  { id: 3, name: 'Dashboard HTTP Health', desc: 'HTTP probe to backend dashboard — auto-restarts on failure', icon: '🌐' },
  { id: 4, name: 'Gateway Health', desc: 'Checks OpenClaw Gateway port liveness', icon: '🚪' },
  { id: 5, name: 'Pipeline Stall Detection', desc: 'Detects tasks stuck > 30 min and auto-rolls-back or reassigns', icon: '⏱️' },
  { id: 6, name: 'Orchestrator Activity', desc: 'Monitors orchestrator log freshness — escalates on 1hr silence', icon: '🎼' },
  { id: 7, name: 'Task Quality Monitor', desc: 'Detects consecutive template fallbacks (AI producing junk)', icon: '📊' },
  { id: 8, name: 'Disk Space Monitor', desc: 'Warns when free disk drops below configurable threshold', icon: '💾' },
  { id: 9, name: 'Cursor Queue Monitor', desc: 'Tracks task queue depth and worker utilization', icon: '📋' },
  { id: 10, name: 'Stuck Task Detection', desc: 'Finds tasks in "doing" state too long and reassigns them', icon: '🔍' },
  { id: 11, name: 'Budget Burn Rate', desc: 'Monitors API spend rate and projects monthly cost', icon: '💰' },
  { id: 12, name: 'Log Rotation', desc: 'Auto-rotates logs exceeding 15 MB, keeps 3 generations', icon: '📜' },
  { id: 13, name: 'AI Validation Health', desc: 'Monitors validation pass rates and detects quality degradation', icon: '✅' },
];

type Tab = 'overview' | 'patterns' | 'checks' | 'config' | 'install';

export default function AiSystemGuardian() {
  const [tab, setTab] = useState<Tab>('overview');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');

  const filteredPatterns = SCAN_PATTERNS.filter(p => {
    if (filterRisk !== 'all' && p.risk !== filterRisk) return false;
    if (searchQ && !p.pattern.toLowerCase().includes(searchQ.toLowerCase()) && !p.desc.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const riskColor = (risk: string) => {
    if (risk === 'Critical') return 'text-red-400 bg-red-400/10 border-red-400/30';
    if (risk === 'High') return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'patterns', label: '21 Scan Patterns' },
    { id: 'checks', label: '13 Health Checks' },
    { id: 'config', label: 'Configuration' },
    { id: 'install', label: 'Installation' },
  ];

  return (
    <div class="space-y-6">
      {/* Tab navigation */}
      <div class="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary text-white'
                : 'bg-bg-card text-text-muted hover:text-text hover:bg-bg-card/80 border border-border'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-bg-card border border-border rounded-xl p-6 text-center">
              <div class="text-4xl font-bold text-primary mb-1">21</div>
              <div class="text-text-muted text-sm">Deep Code Scan Patterns</div>
              <div class="text-xs text-text-muted mt-2">eval, exec, pickle, shell injection, secret access, network allowlist</div>
            </div>
            <div class="bg-bg-card border border-border rounded-xl p-6 text-center">
              <div class="text-4xl font-bold text-primary mb-1">13</div>
              <div class="text-text-muted text-sm">Runtime Health Checks</div>
              <div class="text-xs text-text-muted mt-2">PM2, HTTP probes, pipeline stall, disk, budget, task quality</div>
            </div>
            <div class="bg-bg-card border border-border rounded-xl p-6 text-center">
              <div class="text-4xl font-bold text-primary mb-1">10s</div>
              <div class="text-text-muted text-sm">Patrol Interval</div>
              <div class="text-xs text-text-muted mt-2">Adaptive: 10s base, 5-min cooldown per process, daily digest</div>
            </div>
          </div>

          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold text-lg mb-4">How It Works</h3>
            <div class="space-y-3 text-sm text-text-muted">
              <div class="flex items-start gap-3">
                <span class="text-primary font-bold min-w-[24px]">1.</span>
                <span><strong class="text-text">Patrol Loop</strong> — Every 10 seconds, the sentinel runs all 13 health checks in sequence. Each check returns (ok, details).</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-primary font-bold min-w-[24px]">2.</span>
                <span><strong class="text-text">Auto-Heal</strong> — If a check fails (e.g., crashed PM2 process), the sentinel attempts automatic remediation: restart the process, roll back a stalled task, or rotate bloated logs.</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-primary font-bold min-w-[24px]">3.</span>
                <span><strong class="text-text">Cooldown</strong> — After healing a process, a 5-minute cooldown prevents restart storms. Cooldown resets on successful recovery.</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-primary font-bold min-w-[24px]">4.</span>
                <span><strong class="text-text">Escalation</strong> — If auto-heal fails or the same process keeps crashing, the sentinel writes an escalation task and sends a Discord/Telegram alert to a human operator.</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-primary font-bold min-w-[24px]">5.</span>
                <span><strong class="text-text">Deep Code Scan</strong> — Every 24 hours, the sentinel runs the 21-pattern security scanner across all auto-generated scripts before they execute, blocking anything with eval(), pickle, or unauthorized network calls.</span>
              </div>
              <div class="flex items-start gap-3">
                <span class="text-primary font-bold min-w-[24px]">6.</span>
                <span><strong class="text-text">Health Summary</strong> — Every 60 seconds, the sentinel writes a JSON health summary consumed by the dashboard. Daily digest sent to Discord at midnight.</span>
              </div>
            </div>
          </div>

          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold text-lg mb-4">Architecture Diagram</h3>
            <pre class="text-xs text-text-muted overflow-x-auto bg-bg rounded-lg p-4 border border-border">{`
┌─────────────────────────────────────────────────┐
│              Shadow Sentinel v2.0               │
│          (Main Patrol Loop — 10s cycle)         │
├────────────┬────────────┬───────────────────────┤
│ 13 Health  │  Auto-Heal │  21-Pattern Security  │
│  Checks    │   Engine   │     Deep Scan (24h)   │
├────────────┼────────────┼───────────────────────┤
│ PM2 Status │ pm2 restart│ eval/exec detection   │
│ HTTP Probe │ Task rollbk│ pickle/ctypes block   │
│ Pipeline   │ Log rotate │ Network allowlist     │
│ Disk/Budget│ Reassign   │ Secret file access    │
└─────┬──────┴─────┬──────┴──────────┬────────────┘
      │            │                 │
      ▼            ▼                 ▼
┌──────────┐ ┌──────────┐   ┌───────────────┐
│ Dashboard│ │ Discord/ │   │ Escalation    │
│  JSON    │ │ Telegram │   │ Task Queue    │
└──────────┘ └──────────┘   └───────────────┘
`}</pre>
          </div>

          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold text-lg mb-4">Use Cases</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="border border-border rounded-lg p-4">
                <h4 class="font-semibold mb-2">Multi-Agent AI Systems</h4>
                <p class="text-sm text-text-muted">When you run 3+ AI agents (orchestrator, workers, dispatcher) via PM2, crashes and infinite loops are inevitable. The guardian catches them in seconds, not hours.</p>
              </div>
              <div class="border border-border rounded-lg p-4">
                <h4 class="font-semibold mb-2">AI-Generated Code Pipelines</h4>
                <p class="text-sm text-text-muted">If your agents generate and execute Python scripts, the 21-pattern scanner blocks dangerous code (eval, pickle, shell injection) before it runs.</p>
              </div>
              <div class="border border-border rounded-lg p-4">
                <h4 class="font-semibold mb-2">Production Task Queues</h4>
                <p class="text-sm text-text-muted">Pipeline stall detection finds tasks stuck for 30+ minutes and auto-rolls them back, preventing the entire queue from blocking.</p>
              </div>
              <div class="border border-border rounded-lg p-4">
                <h4 class="font-semibold mb-2">Cost-Sensitive API Operations</h4>
                <p class="text-sm text-text-muted">Budget burn rate monitoring catches runaway API calls (e.g., infinite retry loops calling GPT-4) before they drain your credits.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 21 Scan Patterns */}
      {tab === 'patterns' && (
        <div class="space-y-4">
          <div class="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search patterns..."
              value={searchQ}
              onInput={(e) => setSearchQ((e.target as HTMLInputElement).value)}
              class="px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors w-64"
            />
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk((e.target as HTMLSelectElement).value)}
              class="px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="all">All Risks</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
            <span class="text-text-muted text-sm">{filteredPatterns.length} patterns</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="border-b border-border text-left">
                  <th class="py-2 px-3 text-text-muted font-medium">#</th>
                  <th class="py-2 px-3 text-text-muted font-medium">Pattern</th>
                  <th class="py-2 px-3 text-text-muted font-medium">Risk</th>
                  <th class="py-2 px-3 text-text-muted font-medium">Category</th>
                  <th class="py-2 px-3 text-text-muted font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatterns.map(p => (
                  <tr key={p.id} class="border-b border-border/50 hover:bg-bg-card/50">
                    <td class="py-2 px-3 text-text-muted">{p.id}</td>
                    <td class="py-2 px-3 font-mono text-xs text-primary">{p.pattern}</td>
                    <td class="py-2 px-3">
                      <span class={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${riskColor(p.risk)}`}>
                        {p.risk}
                      </span>
                    </td>
                    <td class="py-2 px-3 text-text-muted">{p.category}</td>
                    <td class="py-2 px-3 text-text-muted">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 13 Health Checks */}
      {tab === 'checks' && (
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HEALTH_CHECKS.map(h => (
            <div key={h.id} class="bg-bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <span class="text-2xl">{h.icon}</span>
              <div>
                <div class="font-semibold text-sm mb-1">{h.id}. {h.name}</div>
                <div class="text-text-muted text-xs">{h.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Configuration */}
      {tab === 'config' && (
        <div class="space-y-4">
          <p class="text-text-muted text-sm">All settings are configurable via environment variables. The sentinel reads them at startup.</p>
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="border-b border-border text-left">
                  <th class="py-2 px-3 text-text-muted font-medium">Variable</th>
                  <th class="py-2 px-3 text-text-muted font-medium">Default</th>
                  <th class="py-2 px-3 text-text-muted font-medium">Description</th>
                </tr>
              </thead>
              <tbody class="font-mono text-xs">
                {[
                  ['OPENCLAW_SENTINEL_SLEEP', '10', 'Patrol interval in seconds'],
                  ['OPENCLAW_SENTINEL_COOLDOWN', '300', 'Cooldown per process after restart (seconds)'],
                  ['OPENCLAW_MATRIX_HEARTBEAT_MAX_AGE', '300', 'Max heartbeat age before alert (seconds)'],
                  ['OPENCLAW_PIPELINE_STALL_THRESHOLD', '1800', 'Pipeline stall threshold (seconds)'],
                  ['OPENCLAW_ORCHESTRATOR_MAX_SILENCE', '3600', 'Max orchestrator silence before escalation'],
                  ['OPENCLAW_PM2_RESTART_WARN', '50', 'PM2 restart count warning threshold'],
                  ['OPENCLAW_TEMPLATE_FALLBACK_WARN', '5', 'Consecutive template fallback threshold'],
                  ['OPENCLAW_DISK_FREE_WARN_MB', '500', 'Disk free space warning (MB)'],
                  ['OPENCLAW_SECURITY_SCAN_INTERVAL_HOURS', '24', 'Deep code scan interval (hours)'],
                  ['OPENCLAW_ARCHIVE_MAX_DAYS', '7', 'Archive retention period (days)'],
                ].map(([k, v, d]) => (
                  <tr key={k} class="border-b border-border/50 hover:bg-bg-card/50">
                    <td class="py-2 px-3 text-primary">{k}</td>
                    <td class="py-2 px-3 text-text">{v}</td>
                    <td class="py-2 px-3 text-text-muted font-sans text-sm">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Installation */}
      {tab === 'install' && (
        <div class="space-y-6">
          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold mb-3">1. PM2 Setup (Recommended)</h3>
            <pre class="bg-bg rounded-lg p-4 text-xs overflow-x-auto border border-border text-text-muted">{`# Install PM2 globally
npm install -g pm2

# Start the sentinel as a managed process
pm2 start shadow_sentinel.py \\
  --name "shadow-sentinel" \\
  --interpreter python \\
  --cron-restart="0 */6 * * *" \\
  --max-memory-restart 200M

# Save the process list so it survives reboots
pm2 save
pm2 startup`}</pre>
          </div>

          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold mb-3">2. Environment Variables</h3>
            <pre class="bg-bg rounded-lg p-4 text-xs overflow-x-auto border border-border text-text-muted">{`# Optional: customize thresholds
export OPENCLAW_SENTINEL_SLEEP=10
export OPENCLAW_SENTINEL_COOLDOWN=300
export OPENCLAW_PIPELINE_STALL_THRESHOLD=1800
export OPENCLAW_DISK_FREE_WARN_MB=500
export OPENCLAW_SECURITY_SCAN_INTERVAL_HOURS=24`}</pre>
          </div>

          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold mb-3">3. Discord / Telegram Notifications</h3>
            <pre class="bg-bg rounded-lg p-4 text-xs overflow-x-auto border border-border text-text-muted">{`# The sentinel calls discord_reporter.send_to() for alerts.
# Configure your webhook in matrix/discord_reporter.py:
#   CHANNEL_SENTINEL = "your-webhook-url"
#
# For Telegram, add a relay function that forwards
# Discord messages to your Telegram bot.`}</pre>
          </div>

          <div class="bg-bg-card border border-border rounded-xl p-6">
            <h3 class="font-bold mb-3">4. Verify It Works</h3>
            <pre class="bg-bg rounded-lg p-4 text-xs overflow-x-auto border border-border text-text-muted">{`# Check sentinel is running
pm2 status shadow-sentinel

# View live logs
pm2 logs shadow-sentinel --lines 50

# Check health summary output
cat matrix/data/sentinel_health_summary.json | python -m json.tool

# Manually trigger a deep code scan
python matrix/tools/security_run_all.py`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
