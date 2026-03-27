import { useState, useCallback } from 'preact/hooks';

type Capability = 'create' | 'read' | 'update' | 'delete' | 'list' | 'sudo' | 'deny';

interface PolicyRule {
  path: string;
  capabilities: Capability[];
}

const ALL_CAPS: Capability[] = ['create', 'read', 'update', 'delete', 'list', 'sudo', 'deny'];

const CAP_COLORS: Record<Capability, string> = {
  create: 'bg-green-500/20 text-green-400 border-green-500/40',
  read:   'bg-blue-500/20 text-blue-400 border-blue-500/40',
  update: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  delete: 'bg-red-500/20 text-red-400 border-red-500/40',
  list:   'bg-purple-500/20 text-purple-400 border-purple-500/40',
  sudo:   'bg-orange-500/20 text-orange-400 border-orange-500/40',
  deny:   'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',
};

const PRESETS: { label: string; rules: PolicyRule[] }[] = [
  {
    label: 'Read-only secrets',
    rules: [
      { path: 'secret/data/*', capabilities: ['read', 'list'] },
      { path: 'secret/metadata/*', capabilities: ['read', 'list'] },
    ],
  },
  {
    label: 'App service account',
    rules: [
      { path: 'secret/data/myapp/*', capabilities: ['create', 'read', 'update', 'delete', 'list'] },
      { path: 'auth/token/renew-self', capabilities: ['update'] },
      { path: 'auth/token/lookup-self', capabilities: ['read'] },
    ],
  },
  {
    label: 'PKI cert issuer',
    rules: [
      { path: 'pki/issue/*', capabilities: ['create', 'update'] },
      { path: 'pki/certs', capabilities: ['list'] },
      { path: 'pki/revoke', capabilities: ['create', 'update'] },
    ],
  },
  {
    label: 'Database credentials',
    rules: [
      { path: 'database/creds/*', capabilities: ['read'] },
      { path: 'database/static-creds/*', capabilities: ['read'] },
    ],
  },
];

const DEFAULT_RULES: PolicyRule[] = [
  { path: 'secret/data/myapp/*', capabilities: ['create', 'read', 'update', 'delete', 'list'] },
  { path: 'auth/token/renew-self', capabilities: ['update'] },
];

function generateHCL(policyName: string, rules: PolicyRule[]): string {
  const lines: string[] = [];
  if (policyName.trim()) {
    lines.push(`# Policy: ${policyName.trim()}`);
    lines.push('');
  }
  rules.forEach(rule => {
    lines.push(`path "${rule.path}" {`);
    const caps = rule.capabilities.filter(c => c !== 'deny');
    const hasDeny = rule.capabilities.includes('deny');
    if (hasDeny) {
      lines.push('  capabilities = ["deny"]');
    } else if (caps.length > 0) {
      lines.push(`  capabilities = [${caps.map(c => `"${c}"`).join(', ')}]`);
    }
    lines.push('}');
    lines.push('');
  });
  return lines.join('\n').trimEnd();
}

export default function VaultPolicyGenerator() {
  const [policyName, setPolicyName] = useState('myapp-policy');
  const [rules, setRules] = useState<PolicyRule[]>(DEFAULT_RULES);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    setOutput(generateHCL(policyName, rules));
  }, [policyName, rules]);

  const copy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output]);

  const applyPreset = (preset: typeof PRESETS[number]) => {
    setRules(preset.rules);
    setOutput('');
  };

  const addRule = () => setRules(prev => [...prev, { path: '', capabilities: ['read'] }]);
  const removeRule = (i: number) => setRules(prev => prev.filter((_, idx) => idx !== i));
  const updatePath = (i: number, val: string) => setRules(prev => prev.map((r, idx) => idx === i ? { ...r, path: val } : r));
  const toggleCap = (i: number, cap: Capability) => {
    setRules(prev => prev.map((r, idx) => {
      if (idx !== i) return r;
      if (cap === 'deny') return { ...r, capabilities: ['deny'] };
      const without = r.capabilities.filter(c => c !== 'deny' && c !== cap);
      const hasCap = r.capabilities.includes(cap);
      return { ...r, capabilities: hasCap ? without : [...without, cap] };
    }));
  };

  const inputClass = 'w-full bg-[#0d1117] border border-border rounded px-2 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-accent';

  return (
    <div class="space-y-5">
      {/* Policy name */}
      <div>
        <label class="text-xs font-medium text-text-muted mb-1 block">Policy Name</label>
        <input
          value={policyName}
          onInput={e => setPolicyName((e.target as HTMLInputElement).value)}
          placeholder="myapp-policy"
          class="w-full sm:w-64 bg-surface border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
        />
      </div>

      {/* Presets */}
      <div>
        <p class="text-xs font-medium text-text-muted mb-2">Presets</p>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(p)}
              class="px-3 py-1.5 text-xs bg-surface border border-border rounded hover:border-accent text-text-muted transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-text">Policy Rules</h2>
          <button onClick={addRule} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent text-text-muted transition-colors">+ Add Rule</button>
        </div>
        {rules.length === 0 && <p class="text-xs text-text-muted italic">No rules defined.</p>}
        <div class="space-y-3">
          {rules.map((rule, i) => (
            <div key={i} class="p-3 bg-surface border border-border rounded-lg space-y-2">
              <div class="flex items-end gap-2">
                <div class="flex-1">
                  <label class="text-xs text-text-muted mb-0.5 block">Path</label>
                  <input
                    value={rule.path}
                    onInput={ev => updatePath(i, (ev.target as HTMLInputElement).value)}
                    placeholder="secret/data/myapp/*"
                    class={inputClass}
                  />
                </div>
                <button onClick={() => removeRule(i)} class="text-red-400 hover:text-red-300 text-xs mb-1.5">Remove</button>
              </div>
              <div>
                <label class="text-xs text-text-muted mb-1.5 block">Capabilities</label>
                <div class="flex flex-wrap gap-1.5">
                  {ALL_CAPS.map(cap => {
                    const active = rule.capabilities.includes(cap);
                    return (
                      <button
                        key={cap}
                        onClick={() => toggleCap(i, cap)}
                        class={`px-2 py-0.5 text-xs rounded border font-mono transition-colors ${active ? CAP_COLORS[cap] : 'bg-transparent border-border text-text-muted hover:border-accent'}`}
                      >
                        {cap}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Generate HCL Policy
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">Generated Vault Policy (HCL)</span>
            <div class="flex gap-2">
              <span class="text-xs text-text-muted font-mono">vault policy write {policyName || 'my-policy'} policy.hcl</span>
              <button onClick={copy} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <pre class="w-full bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{output}</pre>
        </div>
      )}

      {/* Capability reference */}
      <div class="p-4 bg-surface border border-border rounded-lg">
        <p class="text-xs font-medium text-text mb-2">Capability Reference</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-text-muted">
          <span><code class="text-blue-400">read</code> — GET data at path</span>
          <span><code class="text-green-400">create</code> — POST/write new data</span>
          <span><code class="text-yellow-400">update</code> — PUT/PATCH existing data</span>
          <span><code class="text-red-400">delete</code> — DELETE data</span>
          <span><code class="text-purple-400">list</code> — LIST keys at path</span>
          <span><code class="text-orange-400">sudo</code> — Access root-protected paths</span>
          <span><code class="text-zinc-400">deny</code> — Overrides all other capabilities</span>
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Generates HashiCorp Vault HCL policy files from a UI rule builder. Supports all capabilities including sudo and deny. Runs entirely in your browser.
      </p>
    </div>
  );
}
