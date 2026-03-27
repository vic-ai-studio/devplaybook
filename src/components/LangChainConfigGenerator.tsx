import { useState, useMemo } from 'preact/hooks';

type ChainType = 'llmchain' | 'sequential' | 'lcel';
type ModelId = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-3.5-turbo' | 'claude-3-5-sonnet' | 'gemini-1.5-flash';

interface ModelInfo {
  label: string;
  provider: 'openai' | 'anthropic' | 'google';
  importPkg: string;
  className: string;
}

const CHAIN_TYPES: { id: ChainType; label: string; desc: string }[] = [
  { id: 'llmchain', label: 'LLMChain (simple)', desc: 'Single prompt → single LLM call' },
  { id: 'sequential', label: 'SequentialChain (multi-step)', desc: 'Chain outputs feed into next step' },
  { id: 'lcel', label: 'LCEL Pipe (modern)', desc: 'prompt | llm | parser syntax' },
];

const MODELS: Record<ModelId, ModelInfo> = {
  'gpt-4o': {
    label: 'GPT-4o',
    provider: 'openai',
    importPkg: 'langchain_openai',
    className: 'ChatOpenAI',
  },
  'gpt-4o-mini': {
    label: 'GPT-4o mini',
    provider: 'openai',
    importPkg: 'langchain_openai',
    className: 'ChatOpenAI',
  },
  'gpt-3.5-turbo': {
    label: 'GPT-3.5 Turbo',
    provider: 'openai',
    importPkg: 'langchain_openai',
    className: 'ChatOpenAI',
  },
  'claude-3-5-sonnet': {
    label: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    importPkg: 'langchain_anthropic',
    className: 'ChatAnthropic',
  },
  'gemini-1.5-flash': {
    label: 'Gemini 1.5 Flash',
    provider: 'google',
    importPkg: 'langchain_google_genai',
    className: 'ChatGoogleGenerativeAI',
  },
};

function extractVariables(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

function generateCode(
  chainType: ChainType,
  modelId: ModelId,
  temperature: number,
  maxTokens: number,
  promptTemplate: string,
): string {
  const model = MODELS[modelId];
  const variables = extractVariables(promptTemplate);
  const varsStr = variables.length > 0 ? `["${variables.join('", "')}"]` : '[]';
  const exampleArgs =
    variables.length > 0
      ? variables.map((v) => `"${v}": "your_${v}_here"`).join(', ')
      : '"input": "your question here"';

  const llmInit =
    model.provider === 'openai'
      ? `llm = ${model.className}(
    model="${modelId}",
    temperature=${temperature},
    max_tokens=${maxTokens},
    # api_key="sk-..."  # or set OPENAI_API_KEY env var
)`
      : model.provider === 'anthropic'
      ? `llm = ${model.className}(
    model="claude-3-5-sonnet-20241022",
    temperature=${temperature},
    max_tokens=${maxTokens},
    # api_key="sk-ant-..."  # or set ANTHROPIC_API_KEY env var
)`
      : `llm = ${model.className}(
    model="gemini-1.5-flash",
    temperature=${temperature},
    max_output_tokens=${maxTokens},
    # google_api_key="..."  # or set GOOGLE_API_KEY env var
)`;

  const installPkg =
    model.provider === 'openai'
      ? 'langchain langchain-openai'
      : model.provider === 'anthropic'
      ? 'langchain langchain-anthropic'
      : 'langchain langchain-google-genai';

  if (chainType === 'llmchain') {
    return `# pip install ${installPkg}

from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from ${model.importPkg} import ${model.className}

# 1. Define your prompt template
prompt = PromptTemplate(
    input_variables=${varsStr},
    template="""${promptTemplate}"""
)

# 2. Initialize the LLM
${llmInit}

# 3. Build the chain
chain = LLMChain(llm=llm, prompt=prompt)

# 4. Run the chain
result = chain.invoke({${exampleArgs}})
print(result["text"])
`;
  }

  if (chainType === 'sequential') {
    return `# pip install ${installPkg}

from langchain.chains import LLMChain, SequentialChain
from langchain.prompts import PromptTemplate
from ${model.importPkg} import ${model.className}

# 1. Initialize the LLM
${llmInit}

# 2. Define first chain (your prompt)
prompt_1 = PromptTemplate(
    input_variables=${varsStr},
    template="""${promptTemplate}"""
)
chain_1 = LLMChain(llm=llm, prompt=prompt_1, output_key="step_1_output")

# 3. Define second chain (processes output of first)
prompt_2 = PromptTemplate(
    input_variables=["step_1_output"],
    template="Summarize this in 3 bullet points: {step_1_output}"
)
chain_2 = LLMChain(llm=llm, prompt=prompt_2, output_key="final_output")

# 4. Compose into SequentialChain
overall_chain = SequentialChain(
    chains=[chain_1, chain_2],
    input_variables=${varsStr},
    output_variables=["step_1_output", "final_output"],
    verbose=True
)

# 5. Run
result = overall_chain.invoke({${exampleArgs}})
print(result["final_output"])
`;
  }

  // LCEL
  return `# pip install ${installPkg}

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from ${model.importPkg} import ${model.className}

# 1. Define your prompt template (LCEL uses ChatPromptTemplate)
prompt = ChatPromptTemplate.from_template(
    """${promptTemplate}"""
)

# 2. Initialize the LLM
${llmInit}

# 3. Build the LCEL chain with pipe syntax
output_parser = StrOutputParser()
chain = prompt | llm | output_parser

# 4. Invoke
result = chain.invoke({${exampleArgs}})
print(result)

# Streaming (LCEL supports this natively):
# for chunk in chain.stream({${exampleArgs}}):
#     print(chunk, end="", flush=True)
`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
        copied ? 'bg-green-700 text-white' : 'bg-surface border border-border text-text-muted hover:text-text'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy code'}
    </button>
  );
}

const DEFAULT_TEMPLATE = `You are a helpful {role}. Answer the following question in a {tone} tone.

Question: {question}

Provide a clear and concise answer.`;

export default function LangChainConfigGenerator() {
  const [chainType, setChainType] = useState<ChainType>('lcel');
  const [modelId, setModelId] = useState<ModelId>('gpt-4o');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_TEMPLATE);

  const generatedCode = useMemo(
    () => generateCode(chainType, modelId, temperature, maxTokens, promptTemplate),
    [chainType, modelId, temperature, maxTokens, promptTemplate],
  );

  const detectedVars = useMemo(() => extractVariables(promptTemplate), [promptTemplate]);

  return (
    <div class="space-y-6">
      {/* Chain type */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-3">Chain Type</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {CHAIN_TYPES.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setChainType(ct.id)}
              class={`p-3 rounded-lg border text-left transition-colors ${
                chainType === ct.id
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-surface border-border text-text-muted hover:border-primary/40 hover:text-text'
              }`}
            >
              <div class="text-sm font-medium">{ct.label}</div>
              <div class="text-xs mt-0.5 opacity-70">{ct.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Model + parameters */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h2 class="font-semibold text-text">Model &amp; Parameters</h2>

        <div>
          <label class="text-xs text-text-muted mb-2 block">Model</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(MODELS) as [ModelId, ModelInfo][]).map(([key, m]) => (
              <button
                key={key}
                onClick={() => setModelId(key)}
                class={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                  modelId === key
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'bg-surface border-border text-text-muted hover:border-primary/40 hover:text-text'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-text-muted mb-1.5 block flex justify-between">
              <span>Temperature</span>
              <span class="text-text font-mono">{temperature.toFixed(1)}</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onInput={(e) => setTemperature(parseFloat((e.target as HTMLInputElement).value))}
              class="w-full accent-primary"
            />
            <div class="flex justify-between text-xs text-text-muted mt-1">
              <span>0 (deterministic)</span>
              <span>2 (creative)</span>
            </div>
          </div>

          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Max Tokens</label>
            <input
              type="number"
              min="100"
              max="4000"
              step="50"
              value={maxTokens}
              onInput={(e) => setMaxTokens(parseInt((e.target as HTMLInputElement).value, 10) || 1024)}
              class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/50"
            />
            <p class="text-xs text-text-muted mt-1">Range: 100–4000</p>
          </div>
        </div>
      </div>

      {/* Prompt template */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Prompt Template</h2>
          <button
            onClick={() => setPromptTemplate(DEFAULT_TEMPLATE)}
            class="text-xs px-3 py-1.5 rounded-lg bg-surface border border-border text-text-muted hover:text-text transition-colors"
          >
            Reset
          </button>
        </div>
        <textarea
          value={promptTemplate}
          onInput={(e) => setPromptTemplate((e.target as HTMLTextAreaElement).value)}
          class="w-full h-40 bg-surface border border-border rounded-lg p-3 text-sm text-text font-mono resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          placeholder="Enter your prompt template. Use {variable_name} for placeholders."
          spellcheck={false}
        />
        {detectedVars.length > 0 && (
          <div class="flex flex-wrap gap-2 mt-2">
            <span class="text-xs text-text-muted">Detected variables:</span>
            {detectedVars.map((v) => (
              <span key={v} class="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-mono">
                {'{' + v + '}'}
              </span>
            ))}
          </div>
        )}
        <p class="text-xs text-text-muted mt-2">
          Use <code class="font-mono bg-surface px-1 rounded">{'{variable_name}'}</code> for dynamic values. Variables are automatically detected and included in the generated code.
        </p>
      </div>

      {/* Generated code */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-border bg-surface">
          <span class="text-xs font-mono text-text-muted">
            {chainType === 'llmchain' ? 'chain.py' : chainType === 'sequential' ? 'sequential_chain.py' : 'lcel_chain.py'}
          </span>
          <CopyButton value={generatedCode} />
        </div>
        <pre class="p-5 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed">{generatedCode}</pre>
      </div>

      <div class="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300 space-y-1.5">
        <div class="font-medium">Quick start</div>
        <ul class="list-disc list-inside space-y-1 text-blue-300/80 text-xs">
          <li>Install dependencies: shown in the <code class="font-mono bg-blue-950/40 px-1 rounded">pip install</code> comment at the top of the generated code</li>
          <li>Set your API key as an environment variable (e.g. <code class="font-mono bg-blue-950/40 px-1 rounded">OPENAI_API_KEY</code>)</li>
          <li>LCEL chains support <code class="font-mono bg-blue-950/40 px-1 rounded">.stream()</code>, <code class="font-mono bg-blue-950/40 px-1 rounded">.batch()</code>, and async methods out of the box</li>
        </ul>
      </div>
    </div>
  );
}
