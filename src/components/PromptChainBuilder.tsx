import { useState } from 'preact/hooks';

type Role = 'system' | 'user' | 'assistant';

interface ChainStep {
  id: string;
  name: string;
  role: Role;
  prompt: string;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

const DEFAULT_STEPS: ChainStep[] = [
  {
    id: makeId(),
    name: 'Research',
    role: 'user',
    prompt: 'You are a research assistant. Search your knowledge and provide detailed factual information about the following topic:\n\n{{topic}}',
  },
  {
    id: makeId(),
    name: 'Analyze',
    role: 'user',
    prompt: 'Based on the research below, identify the 3 most important insights and any potential risks or limitations:\n\n{{step1_output}}',
  },
  {
    id: makeId(),
    name: 'Summarize',
    role: 'user',
    prompt: 'Write a concise executive summary (max 150 words) based on this analysis:\n\n{{step2_output}}\n\nFocus on actionable takeaways.',
  },
];

const ROLE_COLORS: Record<Role, string> = {
  system: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  user: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
  assistant: 'bg-green-500/20 border-green-500/40 text-green-300',
};

type OutputTab = 'json' | 'template';

function buildJsonOutput(steps: ChainStep[]): string {
  const messages = steps.map(s => ({
    role: s.role,
    content: s.prompt,
    _step_name: s.name,
  }));
  return JSON.stringify(messages, null, 2);
}

function buildTemplateOutput(steps: ChainStep[]): string {
  if (steps.length === 0) return '# No steps defined yet';
  return steps
    .map((s, i) => {
      const header = `## Step ${i + 1}: ${s.name} [${s.role}]`;
      const divider = '-'.repeat(40);
      return `${header}\n${divider}\n${s.prompt}`;
    })
    .join('\n\n');
}

export default function PromptChainBuilder() {
  const [steps, setSteps] = useState<ChainStep[]>(DEFAULT_STEPS);
  const [activeTab, setActiveTab] = useState<OutputTab>('json');
  const [copied, setCopied] = useState(false);

  function addStep() {
    setSteps(prev => [
      ...prev,
      {
        id: makeId(),
        name: `Step ${prev.length + 1}`,
        role: 'user',
        prompt: '',
      },
    ]);
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id));
  }

  function moveStep(id: string, dir: -1 | 1) {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  }

  function updateStep(id: string, field: keyof ChainStep, value: string) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  const output = activeTab === 'json'
    ? buildJsonOutput(steps)
    : buildTemplateOutput(steps);

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: chain steps */}
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">Chain Steps ({steps.length})</div>
            <button
              onClick={addStep}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              + Add Step
            </button>
          </div>

          <div class="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {steps.length === 0 && (
              <div class="text-sm text-text-muted bg-surface border border-border rounded-lg p-4 text-center">
                No steps yet. Click "+ Add Step" to start building your chain.
              </div>
            )}
            {steps.map((step, i) => (
              <div key={step.id} class="bg-surface border border-border rounded-lg p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-text-muted font-mono">#{i + 1}</span>
                    <span class={`text-xs px-2 py-0.5 rounded border font-mono ${ROLE_COLORS[step.role]}`}>
                      {step.role}
                    </span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      onClick={() => moveStep(step.id, -1)}
                      disabled={i === 0}
                      class="text-text-muted hover:text-text disabled:opacity-30 text-xs px-1"
                      title="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveStep(step.id, 1)}
                      disabled={i === steps.length - 1}
                      class="text-text-muted hover:text-text disabled:opacity-30 text-xs px-1"
                      title="Move down"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => removeStep(step.id)}
                      class="text-text-muted hover:text-red-400 text-xs transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Step Name</label>
                    <input
                      type="text"
                      class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={step.name}
                      onInput={(e) => updateStep(step.id, 'name', (e.target as HTMLInputElement).value)}
                      placeholder="e.g. Research"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-text-muted mb-0.5">Role</label>
                    <select
                      class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                      value={step.role}
                      onChange={(e) => updateStep(step.id, 'role', (e.target as HTMLSelectElement).value as Role)}
                    >
                      <option value="system">system</option>
                      <option value="user">user</option>
                      <option value="assistant">assistant</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label class="block text-xs text-text-muted mb-0.5">
                    Prompt text
                    <span class="ml-2 text-text-muted/60">— use <code class="font-mono">&#123;&#123;step1_output&#125;&#125;</code> to reference previous steps</span>
                  </label>
                  <textarea
                    class="w-full font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    rows={4}
                    value={step.prompt}
                    onInput={(e) => updateStep(step.id, 'prompt', (e.target as HTMLTextAreaElement).value)}
                    placeholder={`Step ${i + 1} prompt...`}
                  />
                </div>

                {/* Variable hints */}
                {i > 0 && (
                  <div class="flex flex-wrap gap-1">
                    {steps.slice(0, i).map((prev, pi) => (
                      <span key={prev.id} class="text-xs font-mono bg-surface-alt border border-border rounded px-1.5 py-0.5 text-text-muted">
                        &#123;&#123;step{pi + 1}_output&#125;&#125;
                      </span>
                    ))}
                    <span class="text-xs text-text-muted self-center">← reference previous outputs</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: generated output */}
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            {(['json', 'template'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 text-sm font-mono rounded-lg border transition-colors ${
                  activeTab === tab
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-border text-text-muted hover:bg-surface'
                }`}
              >
                {tab === 'json' ? 'OpenAI JSON' : 'Chain Template'}
              </button>
            ))}
            <button
              onClick={copyOutput}
              class="ml-auto text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <pre class="w-full h-[520px] overflow-auto font-mono text-xs bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>

          <p class="text-xs text-text-muted">
            The JSON output uses the OpenAI messages format. Replace <code class="font-mono">&#123;&#123;variable&#125;&#125;</code> placeholders with actual values or wire them via your orchestration code.
          </p>
        </div>
      </div>
    </div>
  );
}
