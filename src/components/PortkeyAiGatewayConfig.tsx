import { useState } from 'preact/hooks';

type Strategy = 'fallback' | 'loadbalance' | 'single';
type Provider = 'openai' | 'anthropic' | 'google' | 'groq' | 'cohere' | 'mistral' | 'azure' | 'bedrock';

interface TargetConfig {
  provider: Provider;
  model: string;
  weight?: number;
  onStatusCodes?: string;
  virtualKeyEnv: string;
}

const PROVIDER_MODELS: Record<Provider, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
  groq: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
  cohere: ['command-r-plus', 'command-r', 'command'],
  mistral: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
  azure: ['gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
  bedrock: ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'meta.llama3-70b-instruct-v1:0'],
};

export default function PortkeyAiGatewayConfig() {
  const [strategy, setStrategy] = useState<Strategy>('fallback');
  const [configName, setConfigName] = useState('my-config');
  const [targets, setTargets] = useState<TargetConfig[]>([
    { provider: 'openai', model: 'gpt-4o', virtualKeyEnv: 'PORTKEY_OPENAI_KEY', weight: 70 },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', virtualKeyEnv: 'PORTKEY_ANTHROPIC_KEY', weight: 30, onStatusCodes: '429,503,500' },
  ]);
  const [maxRetries, setMaxRetries] = useState(3);
  const [retryOnCodes, setRetryOnCodes] = useState('429,503');
  const [enableCache, setEnableCache] = useState(false);
  const [cacheTtl, setCacheTtl] = useState(3600);
  const [cacheMode, setCacheMode] = useState<'simple' | 'semantic'>('simple');
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  function generateConfig(): object {
    const config: Record<string, unknown> = {
      name: configName,
      mode: strategy,
    };

    if (strategy === 'single') {
      const t = targets[0];
      config.targets = [{
        virtual_key: `\${${t.virtualKeyEnv}}`,
        override_params: { model: t.model },
      }];
    } else {
      config.targets = targets.map(t => {
        const target: Record<string, unknown> = {
          virtual_key: `\${${t.virtualKeyEnv}}`,
          override_params: { model: t.model },
        };
        if (strategy === 'loadbalance' && t.weight !== undefined) {
          target.weight = t.weight;
        }
        if (strategy === 'fallback' && t.onStatusCodes) {
          target.on_status_codes = t.onStatusCodes.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        }
        return target;
      });
    }

    if (maxRetries > 0) {
      config.retry = {
        attempts: maxRetries,
        on_status_codes: retryOnCodes.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)),
      };
    }

    if (enableCache) {
      config.cache = {
        mode: cacheMode,
        max_age: cacheTtl,
      };
    }

    return config;
  }

  function generatePythonCode(): string {
    const lines: string[] = [];
    lines.push('from portkey_ai import Portkey, Config');
    lines.push('');
    lines.push('# Install: pip install portkey-ai');
    lines.push('# Docs: https://portkey.ai/docs');
    lines.push('');
    lines.push('client = Portkey(');
    lines.push('    api_key=os.environ["PORTKEY_API_KEY"],');
    lines.push(`    config=Config(**config_object)  # Pass the generated config`);
    lines.push(')');
    lines.push('');
    lines.push('response = client.chat.completions.create(');
    lines.push('    model="gpt-4o",  # Overridden per target config');
    lines.push('    messages=[{"role": "user", "content": "Hello!"}]');
    lines.push(')');
    lines.push('print(response.choices[0].message.content)');
    return lines.join('\n');
  }

  const configObj = generateConfig();
  const configJson = JSON.stringify(configObj, null, 2);
  const pythonCode = generatePythonCode();

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const download = () => {
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portkey-config-${configName}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelCls = 'block text-sm font-medium text-text-muted mb-1';
  const inputCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono';
  const selectCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const btnSmCls = 'px-2 py-1 text-xs bg-bg-card border border-border rounded hover:border-primary transition-colors';

  const addTarget = () => {
    setTargets(prev => [...prev, { provider: 'groq', model: 'llama-3.1-70b-versatile', virtualKeyEnv: 'PORTKEY_GROQ_KEY', weight: 10 }]);
  };

  return (
    <div class="space-y-6">
      {/* Strategy + name */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class={labelCls}>Config Name</label>
          <input class={inputCls} type="text" value={configName} onInput={e => setConfigName((e.target as HTMLInputElement).value)} placeholder="my-config" />
        </div>
        <div>
          <label class={labelCls}>Strategy</label>
          <select class={selectCls} value={strategy} onChange={e => setStrategy((e.target as HTMLSelectElement).value as Strategy)}>
            <option value="fallback">Fallback (try next on error)</option>
            <option value="loadbalance">Load Balance (weighted distribution)</option>
            <option value="single">Single Target</option>
          </select>
        </div>
      </div>

      {/* Targets */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>
            Targets {strategy === 'single' && '(only first target used)'}
          </label>
          {strategy !== 'single' && (
            <button onClick={addTarget} class={btnSmCls}>+ Add Target</button>
          )}
        </div>
        <div class="space-y-2">
          {targets.slice(0, strategy === 'single' ? 1 : undefined).map((t, i) => (
            <div key={i} class="bg-bg-card border border-border rounded-lg p-3 space-y-2">
              <div class="flex gap-2 items-center">
                <select
                  class="flex-1 bg-transparent border border-border rounded px-2 py-1 text-xs"
                  value={t.provider}
                  onChange={e => {
                    const v = [...targets];
                    const p = (e.target as HTMLSelectElement).value as Provider;
                    v[i] = { ...v[i], provider: p, model: PROVIDER_MODELS[p][0] };
                    setTargets(v);
                  }}
                >
                  {Object.keys(PROVIDER_MODELS).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  class="flex-1 bg-transparent border border-border rounded px-2 py-1 text-xs font-mono"
                  value={t.model}
                  onChange={e => { const v = [...targets]; v[i].model = (e.target as HTMLSelectElement).value; setTargets(v); }}
                >
                  {PROVIDER_MODELS[t.provider].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {i > 0 && (
                  <button onClick={() => setTargets(prev => prev.filter((_, idx) => idx !== i))} class="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
                )}
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="text-xs text-text-muted">Virtual Key Env Var</label>
                  <input class="w-full bg-transparent border border-border rounded px-2 py-1 text-xs font-mono mt-0.5" value={t.virtualKeyEnv} onInput={e => { const v = [...targets]; v[i].virtualKeyEnv = (e.target as HTMLInputElement).value; setTargets(v); }} />
                </div>
                {strategy === 'loadbalance' && (
                  <div class="w-24">
                    <label class="text-xs text-text-muted">Weight (%)</label>
                    <input class="w-full bg-transparent border border-border rounded px-2 py-1 text-xs text-center mt-0.5" type="number" min="0" max="100" value={t.weight} onInput={e => { const v = [...targets]; v[i].weight = parseInt((e.target as HTMLInputElement).value) || 0; setTargets(v); }} />
                  </div>
                )}
                {strategy === 'fallback' && i > 0 && (
                  <div class="flex-1">
                    <label class="text-xs text-text-muted">Fallback on status codes</label>
                    <input class="w-full bg-transparent border border-border rounded px-2 py-1 text-xs font-mono mt-0.5" placeholder="429,503,500" value={t.onStatusCodes || ''} onInput={e => { const v = [...targets]; v[i].onStatusCodes = (e.target as HTMLInputElement).value; setTargets(v); }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retry + Cache */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class={labelCls}>Retry Attempts</label>
          <input class={inputCls} type="number" min="0" max="10" value={maxRetries} onInput={e => setMaxRetries(parseInt((e.target as HTMLInputElement).value) || 0)} />
        </div>
        <div>
          <label class={labelCls}>Retry on Status Codes</label>
          <input class={inputCls} type="text" value={retryOnCodes} onInput={e => setRetryOnCodes((e.target as HTMLInputElement).value)} placeholder="429,503" />
        </div>
        <div class="flex items-center gap-3">
          <input type="checkbox" id="cache" checked={enableCache} onChange={e => setEnableCache((e.target as HTMLInputElement).checked)} class="w-4 h-4 accent-primary" />
          <label for="cache" class="text-sm text-text-muted cursor-pointer">Enable response caching</label>
        </div>
        {enableCache && (
          <>
            <div>
              <label class={labelCls}>Cache Mode</label>
              <select class={selectCls} value={cacheMode} onChange={e => setCacheMode((e.target as HTMLSelectElement).value as 'simple' | 'semantic')}>
                <option value="simple">Simple (exact match)</option>
                <option value="semantic">Semantic (vector similarity)</option>
              </select>
            </div>
            <div>
              <label class={labelCls}>Cache TTL (seconds)</label>
              <input class={inputCls} type="number" value={cacheTtl} onInput={e => setCacheTtl(parseInt((e.target as HTMLInputElement).value) || 3600)} />
            </div>
          </>
        )}
      </div>

      {/* Config output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Portkey Config JSON</label>
          <div class="flex gap-2">
            <button onClick={() => copy(configJson, setCopied)} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={download} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
              ↓ Download JSON
            </button>
          </div>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-72 whitespace-pre-wrap">{configJson}</pre>
      </div>

      {/* Python snippet */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Python usage example</label>
          <button onClick={() => copy(pythonCode, setCopiedCode)} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
            {copiedCode ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto whitespace-pre-wrap">{pythonCode}</pre>
      </div>
    </div>
  );
}
