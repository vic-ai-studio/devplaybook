import { useState } from 'preact/hooks';

type TaskType = 'chat' | 'code' | 'summarize' | 'classify' | 'embed' | 'vision' | 'rag' | 'agents';
type LatencyReq = 'realtime' | 'interactive' | 'batch';
type QualityReq = 'highest' | 'balanced' | 'cost-optimized';

interface TaskConfig {
  type: TaskType;
  enabled: boolean;
  volume: number; // estimated requests/day
}

interface ModelOption {
  name: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  contextK: number;
  latencyMs: number; // typical p50
  strengths: string[];
}

const MODELS: Record<string, ModelOption> = {
  'gpt-4o': { name: 'GPT-4o', provider: 'OpenAI', inputPer1M: 2.5, outputPer1M: 10, contextK: 128, latencyMs: 800, strengths: ['code', 'vision', 'chat', 'agents'] },
  'gpt-4o-mini': { name: 'GPT-4o mini', provider: 'OpenAI', inputPer1M: 0.15, outputPer1M: 0.6, contextK: 128, latencyMs: 400, strengths: ['classify', 'summarize', 'chat'] },
  'claude-3-5-sonnet': { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPer1M: 3, outputPer1M: 15, contextK: 200, latencyMs: 900, strengths: ['code', 'chat', 'rag', 'agents'] },
  'claude-3-5-haiku': { name: 'Claude 3.5 Haiku', provider: 'Anthropic', inputPer1M: 0.8, outputPer1M: 4, contextK: 200, latencyMs: 450, strengths: ['chat', 'classify', 'summarize'] },
  'gemini-1.5-pro': { name: 'Gemini 1.5 Pro', provider: 'Google', inputPer1M: 1.25, outputPer1M: 5, contextK: 1000, latencyMs: 1200, strengths: ['rag', 'summarize', 'vision'] },
  'gemini-1.5-flash': { name: 'Gemini 1.5 Flash', provider: 'Google', inputPer1M: 0.075, outputPer1M: 0.3, contextK: 1000, latencyMs: 350, strengths: ['classify', 'summarize', 'embed'] },
  'llama-3.1-70b': { name: 'Llama 3.1 70B', provider: 'Groq', inputPer1M: 0.59, outputPer1M: 0.79, contextK: 128, latencyMs: 200, strengths: ['chat', 'code', 'summarize'] },
  'llama-3.1-8b': { name: 'Llama 3.1 8B', provider: 'Groq', inputPer1M: 0.05, outputPer1M: 0.08, contextK: 128, latencyMs: 100, strengths: ['classify', 'summarize'] },
  'text-embedding-3-small': { name: 'text-embedding-3-small', provider: 'OpenAI', inputPer1M: 0.02, outputPer1M: 0, contextK: 8, latencyMs: 100, strengths: ['embed'] },
};

const TASK_INFO: Record<TaskType, { label: string; description: string; avgInputTokens: number; avgOutputTokens: number }> = {
  chat: { label: 'Conversational Chat', description: 'Multi-turn conversations', avgInputTokens: 500, avgOutputTokens: 250 },
  code: { label: 'Code Generation', description: 'Write or review code', avgInputTokens: 800, avgOutputTokens: 600 },
  summarize: { label: 'Summarization', description: 'Condense long documents', avgInputTokens: 2000, avgOutputTokens: 300 },
  classify: { label: 'Classification', description: 'Categorize or label text', avgInputTokens: 200, avgOutputTokens: 20 },
  embed: { label: 'Embeddings', description: 'Vector representations', avgInputTokens: 300, avgOutputTokens: 0 },
  vision: { label: 'Vision/Image', description: 'Analyze images or PDFs', avgInputTokens: 1000, avgOutputTokens: 400 },
  rag: { label: 'RAG / Retrieval', description: 'Q&A over documents', avgInputTokens: 3000, avgOutputTokens: 400 },
  agents: { label: 'AI Agents', description: 'Multi-step agentic tasks', avgInputTokens: 2000, avgOutputTokens: 1000 },
};

function selectBestModel(taskType: TaskType, latency: LatencyReq, quality: QualityReq): string {
  const scores: Record<string, number> = {};

  Object.entries(MODELS).forEach(([key, model]) => {
    if (!model.strengths.includes(taskType)) return;

    let score = 10;

    // Latency score
    if (latency === 'realtime') {
      if (model.latencyMs > 600) score -= 5;
      else if (model.latencyMs > 300) score -= 2;
    } else if (latency === 'interactive') {
      if (model.latencyMs > 1000) score -= 3;
    }

    // Quality score
    if (quality === 'highest') {
      // Prefer more capable models
      if (model.inputPer1M < 0.1) score -= 4;
      if (['claude-3-5-sonnet', 'gpt-4o', 'gemini-1.5-pro'].includes(key)) score += 3;
    } else if (quality === 'cost-optimized') {
      // Heavily prefer cheaper models
      score -= model.inputPer1M * 2;
      score -= model.outputPer1M * 0.5;
      if (model.inputPer1M < 0.2) score += 4;
    } else {
      // balanced
      if (model.inputPer1M < 1) score += 1;
    }

    scores[key] = score;
  });

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : 'gpt-4o-mini';
}

function formatCost(dollars: number): string {
  if (dollars < 0.01) return `$${(dollars * 100).toFixed(4)}¢`;
  if (dollars < 1) return `$${dollars.toFixed(4)}`;
  if (dollars < 100) return `$${dollars.toFixed(2)}`;
  return `$${Math.round(dollars).toLocaleString()}`;
}

export default function LlmRoutingStrategyPlanner() {
  const [tasks, setTasks] = useState<TaskConfig[]>([
    { type: 'chat', enabled: true, volume: 1000 },
    { type: 'code', enabled: true, volume: 200 },
    { type: 'summarize', enabled: false, volume: 500 },
    { type: 'classify', enabled: false, volume: 5000 },
  ]);
  const [latency, setLatency] = useState<LatencyReq>('interactive');
  const [quality, setQuality] = useState<QualityReq>('balanced');
  const [monthlyBudget, setMonthlyBudget] = useState(50);
  const [copied, setCopied] = useState(false);

  const enabledTasks = tasks.filter(t => t.enabled);

  interface RoutingRow {
    taskType: TaskType;
    model: ModelOption;
    modelKey: string;
    volume: number;
    dailyCost: number;
    monthlyCost: number;
  }

  const routingTable: RoutingRow[] = enabledTasks.map(t => {
    const modelKey = selectBestModel(t.type, latency, quality);
    const model = MODELS[modelKey];
    const info = TASK_INFO[t.type];
    const dailyCost = (t.volume * (info.avgInputTokens * model.inputPer1M / 1_000_000 + info.avgOutputTokens * model.outputPer1M / 1_000_000));
    return { taskType: t.type, model, modelKey, volume: t.volume, dailyCost, monthlyCost: dailyCost * 30 };
  });

  const totalMonthlyCost = routingTable.reduce((sum, r) => sum + r.monthlyCost, 0);
  const budgetOk = totalMonthlyCost <= monthlyBudget;

  function generateRoutingConfig(): string {
    const lines: string[] = [];
    lines.push('# LLM Routing Strategy');
    lines.push(`# Quality: ${quality} | Latency: ${latency}`);
    lines.push(`# Estimated monthly cost: ${formatCost(totalMonthlyCost)}`);
    lines.push('');
    lines.push('routing:');
    routingTable.forEach(r => {
      lines.push(`  ${r.taskType}:`);
      lines.push(`    primary: ${r.modelKey}`);
      lines.push(`    provider: ${r.model.provider}`);
      lines.push(`    estimated_cost_per_req: ${formatCost(r.dailyCost / r.volume)}`);
      lines.push(`    monthly_volume: ${r.volume * 30}`);
      lines.push(`    monthly_cost: ${formatCost(r.monthlyCost)}`);
    });
    lines.push('');
    lines.push(`# Total monthly estimate: ${formatCost(totalMonthlyCost)}`);
    lines.push(`# Budget: ${formatCost(monthlyBudget)} ${budgetOk ? '(within budget ✓)' : '(over budget — consider cost-optimized quality)'}`);
    return lines.join('\n');
  }

  const configOutput = generateRoutingConfig();

  const copy = () => {
    navigator.clipboard.writeText(configOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const labelCls = 'block text-sm font-medium text-text-muted mb-1';
  const selectCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const inputCls = selectCls + ' font-mono';

  return (
    <div class="space-y-6">
      {/* Requirements */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class={labelCls}>Latency Requirement</label>
          <select class={selectCls} value={latency} onChange={e => setLatency((e.target as HTMLSelectElement).value as LatencyReq)}>
            <option value="realtime">Real-time (&lt;300ms)</option>
            <option value="interactive">Interactive (&lt;2s)</option>
            <option value="batch">Batch (any latency)</option>
          </select>
        </div>
        <div>
          <label class={labelCls}>Quality Priority</label>
          <select class={selectCls} value={quality} onChange={e => setQuality((e.target as HTMLSelectElement).value as QualityReq)}>
            <option value="highest">Highest quality</option>
            <option value="balanced">Balanced</option>
            <option value="cost-optimized">Cost-optimized</option>
          </select>
        </div>
        <div>
          <label class={labelCls}>Monthly Budget (USD)</label>
          <input class={inputCls} type="number" min="1" value={monthlyBudget} onInput={e => setMonthlyBudget(parseInt((e.target as HTMLInputElement).value) || 50)} />
        </div>
      </div>

      {/* Task selection */}
      <div>
        <label class={labelCls}>Task Types</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {tasks.map((t, i) => {
            const info = TASK_INFO[t.type];
            return (
              <div key={t.type} class={`border rounded-lg p-3 transition-colors ${t.enabled ? 'border-primary bg-primary/5' : 'border-border bg-bg-card'}`}>
                <div class="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={t.enabled}
                    onChange={e => { const v = [...tasks]; v[i].enabled = (e.target as HTMLInputElement).checked; setTasks(v); }}
                    class="w-4 h-4 accent-primary mt-0.5 shrink-0"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium">{info.label}</div>
                    <div class="text-xs text-text-muted">{info.description}</div>
                    {t.enabled && (
                      <div class="flex items-center gap-2 mt-2">
                        <label class="text-xs text-text-muted shrink-0">req/day:</label>
                        <input
                          class="w-24 bg-transparent border border-border rounded px-2 py-0.5 text-xs font-mono"
                          type="number"
                          min="1"
                          value={t.volume}
                          onInput={e => { const v = [...tasks]; v[i].volume = parseInt((e.target as HTMLInputElement).value) || 1; setTasks(v); }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Routing table */}
      {enabledTasks.length > 0 && (
        <div>
          <label class={labelCls}>Recommended Routing Table</label>
          <div class="overflow-x-auto">
            <table class="w-full text-xs border border-border rounded-lg overflow-hidden">
              <thead class="bg-bg-card">
                <tr>
                  <th class="text-left px-3 py-2 text-text-muted font-medium">Task</th>
                  <th class="text-left px-3 py-2 text-text-muted font-medium">Model</th>
                  <th class="text-left px-3 py-2 text-text-muted font-medium">Provider</th>
                  <th class="text-right px-3 py-2 text-text-muted font-medium">Vol/day</th>
                  <th class="text-right px-3 py-2 text-text-muted font-medium">Cost/req</th>
                  <th class="text-right px-3 py-2 text-text-muted font-medium">Monthly</th>
                </tr>
              </thead>
              <tbody>
                {routingTable.map(r => (
                  <tr key={r.taskType} class="border-t border-border hover:bg-bg-card/50">
                    <td class="px-3 py-2 font-medium">{TASK_INFO[r.taskType].label}</td>
                    <td class="px-3 py-2 font-mono text-primary">{r.model.name}</td>
                    <td class="px-3 py-2 text-text-muted">{r.model.provider}</td>
                    <td class="px-3 py-2 text-right">{r.volume.toLocaleString()}</td>
                    <td class="px-3 py-2 text-right font-mono">{formatCost(r.dailyCost / r.volume)}</td>
                    <td class="px-3 py-2 text-right font-mono font-medium">{formatCost(r.monthlyCost)}</td>
                  </tr>
                ))}
                <tr class={`border-t-2 ${budgetOk ? 'border-green-500' : 'border-red-400'}`}>
                  <td class="px-3 py-2 font-bold" colSpan={5}>Total Monthly Estimate</td>
                  <td class={`px-3 py-2 text-right font-mono font-bold ${budgetOk ? 'text-green-500' : 'text-red-400'}`}>
                    {formatCost(totalMonthlyCost)}
                    <span class="ml-2 text-xs">{budgetOk ? '✓ in budget' : '⚠ over budget'}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Config output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Routing config (YAML)</label>
          <button onClick={copy} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-72 whitespace-pre-wrap">{configOutput}</pre>
      </div>
    </div>
  );
}
