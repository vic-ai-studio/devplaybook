import { useState } from 'preact/hooks';

type Provider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'cohere' | 'mistral' | 'together' | 'ollama';
type RoutingStrategy = 'simple-shuffle' | 'least-busy' | 'latency-based-routing' | 'cost-based-routing';

interface ProviderConfig {
  provider: Provider;
  model: string;
  apiKeyEnv: string;
  weight: number;
  enabled: boolean;
}

const PROVIDER_DEFAULTS: Record<Provider, { model: string; keyEnv: string; baseUrl?: string }> = {
  openai: { model: 'gpt-4o', keyEnv: 'OPENAI_API_KEY' },
  anthropic: { model: 'claude-3-5-sonnet-20241022', keyEnv: 'ANTHROPIC_API_KEY' },
  gemini: { model: 'gemini/gemini-1.5-pro', keyEnv: 'GEMINI_API_KEY' },
  groq: { model: 'groq/llama-3.1-70b-versatile', keyEnv: 'GROQ_API_KEY' },
  cohere: { model: 'command-r-plus', keyEnv: 'COHERE_API_KEY' },
  mistral: { model: 'mistral/mistral-large-latest', keyEnv: 'MISTRAL_API_KEY' },
  together: { model: 'together_ai/meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', keyEnv: 'TOGETHERAI_API_KEY' },
  ollama: { model: 'ollama/llama3.1', keyEnv: 'OLLAMA_API_KEY', baseUrl: 'http://localhost:11434' },
};

export default function LitellmProxyConfigGenerator() {
  const [providers, setProviders] = useState<ProviderConfig[]>([
    { provider: 'openai', model: 'gpt-4o', apiKeyEnv: 'OPENAI_API_KEY', weight: 1, enabled: true },
    { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKeyEnv: 'ANTHROPIC_API_KEY', weight: 1, enabled: true },
  ]);
  const [routingStrategy, setRoutingStrategy] = useState<RoutingStrategy>('simple-shuffle');
  const [budgetLimit, setBudgetLimit] = useState('100');
  const [budgetDuration, setBudgetDuration] = useState('30d');
  const [enableFallback, setEnableFallback] = useState(true);
  const [enableCaching, setEnableCaching] = useState(false);
  const [port, setPort] = useState('4000');
  const [copied, setCopied] = useState(false);

  function generateConfig(): string {
    const lines: string[] = [];
    lines.push('model_list:');

    providers.filter(p => p.enabled).forEach((p, i) => {
      const defaults = PROVIDER_DEFAULTS[p.provider];
      lines.push(`  - model_name: ${p.provider}-model-${i + 1}`);
      lines.push(`    litellm_params:`);
      lines.push(`      model: ${p.model}`);
      lines.push(`      api_key: os.environ/${p.apiKeyEnv}`);
      if (defaults.baseUrl) {
        lines.push(`      api_base: ${defaults.baseUrl}`);
      }
      if (routingStrategy === 'simple-shuffle' || routingStrategy === 'least-busy') {
        lines.push(`      weight: ${p.weight}`);
      }
    });

    lines.push('');
    lines.push('router_settings:');
    lines.push(`  routing_strategy: ${routingStrategy}`);
    lines.push(`  num_retries: 3`);
    lines.push(`  timeout: 30`);
    lines.push(`  retry_after: 5`);

    if (enableFallback && providers.filter(p => p.enabled).length > 1) {
      lines.push(`  fallbacks:`);
      providers.filter(p => p.enabled).forEach((p, i) => {
        const fallbacks = providers.filter((fp, fi) => fi !== i && fp.enabled).map((fp, fi) => `${fp.provider}-model-${providers.indexOf(fp) + 1}`);
        if (fallbacks.length > 0) {
          lines.push(`    - ${p.provider}-model-${i + 1}: [${fallbacks.join(', ')}]`);
        }
      });
    }

    lines.push('');
    lines.push('general_settings:');
    lines.push(`  master_key: os.environ/LITELLM_MASTER_KEY`);
    lines.push(`  database_url: os.environ/DATABASE_URL`);
    lines.push(`  store_model_in_db: True`);

    if (budgetLimit) {
      lines.push('');
      lines.push('litellm_settings:');
      lines.push(`  max_budget: ${budgetLimit}`);
      lines.push(`  budget_duration: ${budgetDuration}`);
      lines.push(`  set_verbose: False`);
    }

    if (enableCaching) {
      lines.push('');
      lines.push('# Redis caching configuration');
      lines.push('litellm_settings:');
      lines.push('  cache: True');
      lines.push('  cache_params:');
      lines.push('    type: redis');
      lines.push('    host: os.environ/REDIS_HOST');
      lines.push('    port: os.environ/REDIS_PORT');
      lines.push('    password: os.environ/REDIS_PASSWORD');
      lines.push('    supported_call_types: [acompletion, completion, embedding]');
      lines.push('    ttl: 3600  # 1 hour');
    }

    lines.push('');
    lines.push('# Run with:');
    lines.push(`# litellm --config config.yaml --port ${port}`);
    lines.push('# Or with Docker:');
    lines.push(`# docker run -p ${port}:4000 -v $(pwd)/config.yaml:/app/config.yaml ghcr.io/berriai/litellm:main-latest --config /app/config.yaml`);

    return lines.join('\n');
  }

  const output = generateConfig();

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'litellm-config.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelCls = 'block text-sm font-medium text-text-muted mb-1';
  const selectCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const inputCls = selectCls + ' font-mono';
  const btnSmCls = 'px-2 py-1 text-xs bg-bg-card border border-border rounded hover:border-primary transition-colors';

  const addProvider = () => {
    const available = Object.keys(PROVIDER_DEFAULTS).find(
      p => !providers.some(ep => ep.provider === p)
    ) as Provider | undefined;
    if (!available) return;
    const d = PROVIDER_DEFAULTS[available];
    setProviders(prev => [...prev, { provider: available, model: d.model, apiKeyEnv: d.keyEnv, weight: 1, enabled: true }]);
  };

  return (
    <div class="space-y-6">
      {/* Providers */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>LLM Providers</label>
          <button onClick={addProvider} class={btnSmCls} disabled={providers.length >= 8}>+ Add Provider</button>
        </div>
        <div class="space-y-2">
          {providers.map((p, i) => (
            <div key={i} class="flex gap-2 items-center bg-bg-card border border-border rounded-lg p-3">
              <input type="checkbox" checked={p.enabled} onChange={e => { const v = [...providers]; v[i].enabled = (e.target as HTMLInputElement).checked; setProviders(v); }} class="w-4 h-4 accent-primary shrink-0" />
              <select
                class="bg-transparent border border-border rounded px-2 py-1 text-xs shrink-0"
                value={p.provider}
                onChange={e => {
                  const v = [...providers];
                  const newProvider = (e.target as HTMLSelectElement).value as Provider;
                  const d = PROVIDER_DEFAULTS[newProvider];
                  v[i] = { ...v[i], provider: newProvider, model: d.model, apiKeyEnv: d.keyEnv };
                  setProviders(v);
                }}
              >
                {Object.keys(PROVIDER_DEFAULTS).map(pk => (
                  <option key={pk} value={pk}>{pk}</option>
                ))}
              </select>
              <input
                class="flex-1 bg-transparent border border-border rounded px-2 py-1 text-xs font-mono"
                placeholder="model"
                value={p.model}
                onInput={e => { const v = [...providers]; v[i].model = (e.target as HTMLInputElement).value; setProviders(v); }}
              />
              <input
                class="w-32 bg-transparent border border-border rounded px-2 py-1 text-xs font-mono"
                placeholder="API_KEY_ENV"
                value={p.apiKeyEnv}
                onInput={e => { const v = [...providers]; v[i].apiKeyEnv = (e.target as HTMLInputElement).value; setProviders(v); }}
              />
              <input
                class="w-16 bg-transparent border border-border rounded px-2 py-1 text-xs text-center"
                type="number"
                min="1"
                max="10"
                placeholder="weight"
                value={p.weight}
                onInput={e => { const v = [...providers]; v[i].weight = parseInt((e.target as HTMLInputElement).value) || 1; setProviders(v); }}
              />
              <button onClick={() => setProviders(prev => prev.filter((_, idx) => idx !== i))} class="text-xs text-red-400 hover:text-red-600 shrink-0">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Routing & settings */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class={labelCls}>Routing Strategy</label>
          <select class={selectCls} value={routingStrategy} onChange={e => setRoutingStrategy((e.target as HTMLSelectElement).value as RoutingStrategy)}>
            <option value="simple-shuffle">Simple Shuffle (weighted random)</option>
            <option value="least-busy">Least Busy</option>
            <option value="latency-based-routing">Latency-based Routing</option>
            <option value="cost-based-routing">Cost-based Routing</option>
          </select>
        </div>
        <div>
          <label class={labelCls}>Proxy Port</label>
          <input class={inputCls} type="text" value={port} onInput={e => setPort((e.target as HTMLInputElement).value)} placeholder="4000" />
        </div>
        <div>
          <label class={labelCls}>Monthly Budget Limit (USD)</label>
          <input class={inputCls} type="number" value={budgetLimit} onInput={e => setBudgetLimit((e.target as HTMLInputElement).value)} placeholder="100" />
        </div>
        <div>
          <label class={labelCls}>Budget Duration</label>
          <select class={selectCls} value={budgetDuration} onChange={e => setBudgetDuration((e.target as HTMLSelectElement).value)}>
            <option value="1d">Daily</option>
            <option value="7d">Weekly</option>
            <option value="30d">Monthly (30d)</option>
          </select>
        </div>
        <div class="flex items-center gap-3">
          <input type="checkbox" id="fallback" checked={enableFallback} onChange={e => setEnableFallback((e.target as HTMLInputElement).checked)} class="w-4 h-4 accent-primary" />
          <label for="fallback" class="text-sm text-text-muted cursor-pointer">Enable automatic fallbacks</label>
        </div>
        <div class="flex items-center gap-3">
          <input type="checkbox" id="caching" checked={enableCaching} onChange={e => setEnableCaching((e.target as HTMLInputElement).checked)} class="w-4 h-4 accent-primary" />
          <label for="caching" class="text-sm text-text-muted cursor-pointer">Enable Redis caching</label>
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">config.yaml output</label>
          <div class="flex gap-2">
            <button onClick={copy} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={download} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
              ↓ Download config.yaml
            </button>
          </div>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  );
}
