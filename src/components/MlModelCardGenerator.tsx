import { useState } from 'preact/hooks';

type ModelType = 'text-classification' | 'token-classification' | 'text-generation' | 'text2text-generation' | 'question-answering' | 'summarization' | 'translation' | 'feature-extraction' | 'image-classification' | 'object-detection' | 'tabular-classification' | 'tabular-regression';

const MODEL_TYPES: { value: ModelType; label: string }[] = [
  { value: 'text-classification', label: 'Text Classification' },
  { value: 'token-classification', label: 'Token Classification (NER)' },
  { value: 'text-generation', label: 'Text Generation' },
  { value: 'text2text-generation', label: 'Text-to-Text Generation' },
  { value: 'question-answering', label: 'Question Answering' },
  { value: 'summarization', label: 'Summarization' },
  { value: 'translation', label: 'Translation' },
  { value: 'feature-extraction', label: 'Feature Extraction / Embedding' },
  { value: 'image-classification', label: 'Image Classification' },
  { value: 'object-detection', label: 'Object Detection' },
  { value: 'tabular-classification', label: 'Tabular Classification' },
  { value: 'tabular-regression', label: 'Tabular Regression' },
];

const LICENSE_OPTIONS = ['apache-2.0', 'mit', 'cc-by-4.0', 'cc-by-sa-4.0', 'cc-by-nc-4.0', 'openrail', 'bigscience-openrail-m', 'other'];

interface MetricRow {
  id: string;
  name: string;
  value: string;
  dataset: string;
}

let _mid = 0;
function mid() { return `m-${++_mid}`; }

function generateCard(
  modelName: string,
  modelType: ModelType,
  baseModel: string,
  language: string,
  license: string,
  trainingData: string,
  intendedUse: string,
  outOfScope: string,
  metrics: MetricRow[],
  limitations: string,
  ethical: string,
): string {
  const slug = modelName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'my-model';

  const metricsYaml = metrics.filter(m => m.name && m.value).map(m => {
    const ds = m.dataset || 'test_set';
    return `  - task:\n      type: ${modelType}\n    dataset:\n      name: ${ds}\n      type: ${ds.toLowerCase().replace(/\s+/g, '-')}\n    metrics:\n      - type: ${m.name.toLowerCase().replace(/\s+/g, '_')}\n        value: ${m.value}\n        name: ${m.name}`;
  }).join('\n');

  let yaml = `---
language:
  - ${language || 'en'}
license: ${license}
tags:
  - ${modelType}
  - transformers
base_model: ${baseModel || 'null'}
pipeline_tag: ${modelType}`;

  if (metricsYaml) {
    yaml += `\nmodel-index:\n  - name: ${modelName || 'My Model'}\n    results:\n${metricsYaml}`;
  }

  yaml += '\n---';

  const metricTable = metrics.filter(m => m.name && m.value).length > 0
    ? `\n## Evaluation Results\n\n| Metric | Value | Dataset |\n|--------|-------|---------|\n` +
      metrics.filter(m => m.name && m.value).map(m => `| ${m.name} | ${m.value} | ${m.dataset || 'Test set'} |`).join('\n')
    : '';

  return `${yaml}

# ${modelName || 'Model Name'}

## Model Description

**Model Type:** ${MODEL_TYPES.find(t => t.value === modelType)?.label || modelType}
**Base Model:** ${baseModel || 'N/A'}
**Language(s):** ${language || 'en'}
**License:** ${license}

## Training Data

${trainingData || 'Describe the training data here.'}

## Intended Uses & Limitations

### Intended Use

${intendedUse || 'Describe intended uses here.'}

### Out-of-Scope Uses

${outOfScope || 'Describe out-of-scope uses here.'}
${metricTable}

## Known Limitations

${limitations || 'Describe known limitations here.'}

## Ethical Considerations

${ethical || 'Describe ethical considerations here.'}

## How to Use

\`\`\`python
from transformers import pipeline

pipe = pipeline("${modelType}", model="${slug}")
result = pipe("Your input here")
print(result)
\`\`\`

## Citation

\`\`\`bibtex
@misc{${slug},
  author = {Author Name},
  title = {${modelName || 'My Model'}},
  year = {2025},
  publisher = {HuggingFace},
  url = {https://huggingface.co/username/${slug}}
}
\`\`\`
`;
}

export default function MlModelCardGenerator() {
  const [modelName, setModelName] = useState('My Sentiment Classifier');
  const [modelType, setModelType] = useState<ModelType>('text-classification');
  const [baseModel, setBaseModel] = useState('bert-base-uncased');
  const [language, setLanguage] = useState('en');
  const [license, setLicense] = useState('apache-2.0');
  const [trainingData, setTrainingData] = useState('Trained on the SST-2 dataset (67k movie reviews) with binary sentiment labels.');
  const [intendedUse, setIntendedUse] = useState('- Sentiment analysis of English product reviews\n- Customer feedback classification\n- Social media sentiment monitoring');
  const [outOfScope, setOutOfScope] = useState('- Non-English text\n- Medical or legal document analysis\n- Detecting sarcasm or nuanced sentiment');
  const [metrics, setMetrics] = useState<MetricRow[]>([
    { id: mid(), name: 'Accuracy', value: '0.934', dataset: 'SST-2 Test' },
    { id: mid(), name: 'F1', value: '0.931', dataset: 'SST-2 Test' },
  ]);
  const [limitations, setLimitations] = useState('- May underperform on domain-specific vocabulary (medical, legal, technical)\n- English-only; performance degrades on code-mixed text\n- Trained on movie reviews; may not generalize to all domains');
  const [ethical, setEthical] = useState('- This model may reflect biases present in the training data\n- Not intended for high-stakes decision-making without human review\n- Users should evaluate performance on their specific domain before deployment');
  const [copied, setCopied] = useState(false);

  function addMetric() {
    setMetrics(m => [...m, { id: mid(), name: '', value: '', dataset: '' }]);
  }

  function removeMetric(id: string) {
    setMetrics(m => m.filter(x => x.id !== id));
  }

  function updateMetric(id: string, field: keyof MetricRow, val: string) {
    setMetrics(m => m.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  const card = generateCard(modelName, modelType, baseModel, language, license, trainingData, intendedUse, outOfScope, metrics, limitations, ethical);

  function copy() {
    navigator.clipboard.writeText(card).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';
  const textareaCls = `${inputCls} font-mono resize-none`;

  return (
    <div class="space-y-6">
      {/* Basic Info */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">Model Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium mb-1 text-text-muted">Model Name</label>
            <input value={modelName} onInput={e => setModelName((e.target as HTMLInputElement).value)} class={inputCls} placeholder="My Sentiment Classifier" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-text-muted">Model Type</label>
            <select value={modelType} onChange={e => setModelType((e.target as HTMLSelectElement).value as ModelType)} class={inputCls}>
              {MODEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-text-muted">Base Model (HuggingFace ID)</label>
            <input value={baseModel} onInput={e => setBaseModel((e.target as HTMLInputElement).value)} class={inputCls} placeholder="bert-base-uncased" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-text-muted">Language Code(s)</label>
            <input value={language} onInput={e => setLanguage((e.target as HTMLInputElement).value)} class={inputCls} placeholder="en" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1 text-text-muted">License</label>
            <select value={license} onChange={e => setLicense((e.target as HTMLSelectElement).value)} class={inputCls}>
              {LICENSE_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Description fields */}
      <div class="p-4 rounded-xl border border-border bg-surface space-y-4">
        <h3 class="text-sm font-semibold">Documentation</h3>
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Training Data Description</label>
          <textarea value={trainingData} onInput={e => setTrainingData((e.target as HTMLTextAreaElement).value)} rows={3} class={textareaCls} />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Intended Use Cases</label>
          <textarea value={intendedUse} onInput={e => setIntendedUse((e.target as HTMLTextAreaElement).value)} rows={4} class={textareaCls} />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Out-of-Scope Uses</label>
          <textarea value={outOfScope} onInput={e => setOutOfScope((e.target as HTMLTextAreaElement).value)} rows={3} class={textareaCls} />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Known Limitations</label>
          <textarea value={limitations} onInput={e => setLimitations((e.target as HTMLTextAreaElement).value)} rows={3} class={textareaCls} />
        </div>
        <div>
          <label class="block text-xs font-medium mb-1 text-text-muted">Ethical Considerations</label>
          <textarea value={ethical} onInput={e => setEthical((e.target as HTMLTextAreaElement).value)} rows={3} class={textareaCls} />
        </div>
      </div>

      {/* Metrics */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold">Performance Metrics</h3>
          <button onClick={addMetric} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">+ Add Metric</button>
        </div>
        <div class="space-y-2">
          {metrics.map(m => (
            <div key={m.id} class="flex gap-2 items-center">
              <input value={m.name} onInput={e => updateMetric(m.id, 'name', (e.target as HTMLInputElement).value)}
                placeholder="Metric name (e.g. Accuracy)"
                class="flex-1 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input value={m.value} onInput={e => updateMetric(m.id, 'value', (e.target as HTMLInputElement).value)}
                placeholder="0.934"
                class="w-20 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <input value={m.dataset} onInput={e => updateMetric(m.id, 'dataset', (e.target as HTMLInputElement).value)}
                placeholder="Dataset name"
                class="flex-1 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              <button onClick={() => removeMetric(m.id)} class="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
            </div>
          ))}
          {metrics.length === 0 && <p class="text-xs text-text-muted">No metrics added. Click "+ Add Metric".</p>}
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">Generated Model Card (Markdown)</span>
          <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-surface-alt border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text max-h-[500px] overflow-y-auto">{card}</pre>
      </div>

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Save as README.md in your HuggingFace repo</p>
        <code class="text-xs text-text-muted">huggingface-cli upload username/my-model README.md</code>
      </div>
    </div>
  );
}
