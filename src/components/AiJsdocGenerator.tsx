import { useState } from 'preact/hooks';

type DocStyle = 'jsdoc' | 'tsdoc' | 'python' | 'rust';

interface ParsedFn {
  name: string;
  params: Array<{ name: string; type: string; optional: boolean }>;
  returnType: string;
  isAsync: boolean;
  isClass: boolean;
  description: string;
}

function parseFunctionSignature(sig: string): ParsedFn {
  const clean = sig.trim();

  // Detect async
  const isAsync = /\basync\b/.test(clean);
  const isClass = /^(class|interface|type)\b/.test(clean) || /\bconstructor\b/.test(clean);

  // Extract function name
  const nameMatch =
    clean.match(/(?:function\s+|class\s+|interface\s+|type\s+)(\w+)/) ||
    clean.match(/(?:const|let|var)\s+(\w+)\s*[:=]/) ||
    clean.match(/(\w+)\s*[:(<]/);
  const name = nameMatch?.[1] ?? 'myFunction';

  // Extract return type from TypeScript annotation
  const returnTypeMatch = clean.match(/\):\s*([\w<>\[\]|&{}, ]+?)(?:\s*{|\s*=>|\s*$)/);
  let returnType = returnTypeMatch?.[1]?.trim() ?? '';
  if (!returnType) {
    if (/\bvoid\b/.test(clean)) returnType = 'void';
    else if (isAsync) returnType = 'Promise<unknown>';
    else returnType = 'unknown';
  }

  // Extract params
  const paramsBlockMatch = clean.match(/\(([^)]*)\)/);
  const paramsRaw = paramsBlockMatch?.[1] ?? '';
  const params: ParsedFn['params'] = [];

  if (paramsRaw.trim()) {
    // Split by comma, accounting for generics (basic)
    const parts = paramsRaw.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const optional = part.includes('?') || part.includes('=');
      const withoutDefault = part.split('=')[0].trim().replace('?', '');
      const [paramName, ...typeParts] = withoutDefault.split(':');
      params.push({
        name: paramName.trim(),
        type: typeParts.join(':').trim() || 'unknown',
        optional,
      });
    }
  }

  return { name, params, returnType, isAsync, isClass, description: '' };
}

function generateDoc(sig: string, style: DocStyle, userDesc: string): string {
  if (!sig.trim()) return '';
  const fn = parseFunctionSignature(sig);
  const desc = userDesc.trim() || `${fn.name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`;

  if (style === 'jsdoc') {
    const lines: string[] = ['/**', ` * ${desc.charAt(0).toUpperCase() + desc.slice(1)}.`];
    if (fn.isAsync) lines.push(' *', ' * @async');
    if (fn.params.length) {
      lines.push(' *');
      for (const p of fn.params) {
        const typeStr = p.type !== 'unknown' ? p.type : '*';
        const optMark = p.optional ? `[${p.name}]` : p.name;
        lines.push(` * @param {${typeStr}} ${optMark} - ${p.name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`);
      }
    }
    if (fn.returnType && fn.returnType !== 'void') {
      lines.push(' *');
      lines.push(` * @returns {${fn.returnType}} The result`);
    }
    if (fn.isClass) {
      lines.push(' *');
      lines.push(` * @class`);
    }
    lines.push(' */');
    return lines.join('\n');
  }

  if (style === 'tsdoc') {
    const lines: string[] = ['/**', ` * ${desc.charAt(0).toUpperCase() + desc.slice(1)}.`];
    if (fn.params.length) {
      lines.push(' *');
      for (const p of fn.params) {
        lines.push(` * @param ${p.name} - ${p.name.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`);
      }
    }
    if (fn.returnType && fn.returnType !== 'void') {
      lines.push(' *');
      lines.push(` * @returns The result`);
    }
    if (fn.isAsync) {
      lines.push(' *');
      lines.push(` * @remarks This is an async function — remember to \`await\` it.`);
    }
    lines.push(' */');
    return lines.join('\n');
  }

  if (style === 'python') {
    const indent = '    ';
    const lines: string[] = [
      '"""',
      `${desc.charAt(0).toUpperCase() + desc.slice(1)}.`,
    ];
    if (fn.params.length) {
      lines.push('', 'Args:');
      for (const p of fn.params) {
        const typeHint = p.type !== 'unknown' ? p.type : 'Any';
        lines.push(`${indent}${p.name} (${typeHint}): ${p.name.replace(/_/g, ' ')}`);
      }
    }
    if (fn.returnType && fn.returnType !== 'void') {
      lines.push('', 'Returns:');
      lines.push(`${indent}${fn.returnType}: The result.`);
    }
    lines.push('', 'Example:');
    const exParams = fn.params.map(p => `${p.name}=...`).join(', ');
    lines.push(`${indent}>>> result = ${fn.name}(${exParams})`);
    lines.push('"""');
    return lines.join('\n');
  }

  if (style === 'rust') {
    const lines: string[] = [
      `/// ${desc.charAt(0).toUpperCase() + desc.slice(1)}.`,
    ];
    if (fn.params.length) {
      lines.push('///');
      lines.push('/// # Arguments');
      lines.push('///');
      for (const p of fn.params) {
        lines.push(`/// * \`${p.name}\` - ${p.name.replace(/_/g, ' ')}`);
      }
    }
    if (fn.returnType && fn.returnType !== 'void') {
      lines.push('///');
      lines.push(`/// # Returns`);
      lines.push('///');
      lines.push(`/// * \`${fn.returnType}\` - The result.`);
    }
    lines.push('///');
    lines.push('/// # Examples');
    lines.push('///');
    lines.push('/// ```');
    const exParams = fn.params.map(p => `${p.name}`).join(', ');
    lines.push(`/// let result = ${fn.name}(${exParams});`);
    lines.push('/// ```');
    return lines.join('\n');
  }

  return '';
}

const STYLE_OPTIONS: Array<{ value: DocStyle; label: string; lang: string }> = [
  { value: 'jsdoc', label: 'JSDoc', lang: 'JavaScript' },
  { value: 'tsdoc', label: 'TSDoc', lang: 'TypeScript' },
  { value: 'python', label: 'Python Docstring', lang: 'Python' },
  { value: 'rust', label: 'Rust Doc Comments', lang: 'Rust' },
];

const EXAMPLES = [
  'async function fetchUserById(userId: string): Promise<User>',
  'function calculateDiscount(price: number, percentage: number, maxDiscount?: number): number',
  'const validateEmail = (email: string): boolean =>',
  'class UserRepository',
  'def process_payment(amount: float, currency: str, user_id: int) -> dict',
];

export default function AiJsdocGenerator() {
  const [sig, setSig] = useState('');
  const [desc, setDesc] = useState('');
  const [style, setStyle] = useState<DocStyle>('jsdoc');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => setOutput(generateDoc(sig, style, desc));

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fullWithSig = output ? `${output}\n${sig.trim()}` : '';

  return (
    <div class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1.5">Function / class signature</label>
        <textarea
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary transition-colors resize-none h-20"
          placeholder={'async function fetchUserById(userId: string): Promise<User>'}
          value={sig}
          onInput={e => { setSig((e.target as HTMLTextAreaElement).value); setOutput(''); }}
        />
        <div class="flex flex-wrap gap-1.5 mt-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => { setSig(ex); setOutput(''); }}
              class="text-xs text-text-muted hover:text-primary bg-bg-card border border-border px-2 py-1 rounded transition-colors font-mono"
            >
              {ex.slice(0, 40)}{ex.length > 40 ? '…' : ''}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-1.5">
          What does this do? <span class="text-text-muted font-normal">(optional — used in the description line)</span>
        </label>
        <input
          type="text"
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors"
          placeholder="e.g. Retrieves a user record by their unique ID"
          value={desc}
          onInput={e => { setDesc((e.target as HTMLInputElement).value); setOutput(''); }}
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Doc style</label>
        <div class="flex flex-wrap gap-2">
          {STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStyle(opt.value); setOutput(''); }}
              class={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${style === opt.value ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-muted hover:border-primary/50'}`}
            >
              {opt.label}
              <span class="ml-1 text-xs opacity-60">{opt.lang}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!sig.trim()}
        class="w-full py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generate Doc Comment
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-sm font-medium">Generated</p>
            <div class="flex gap-3">
              <button onClick={() => navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
                class="text-xs text-text-muted hover:text-primary transition-colors">
                {copied ? '✓ Copied!' : 'Copy comment only'}
              </button>
              <button onClick={copy}
                class="text-xs text-primary hover:underline font-semibold">
                Copy with signature
              </button>
            </div>
          </div>
          <pre class="bg-bg-card border border-border rounded-xl p-4 text-sm font-mono whitespace-pre-wrap text-text select-all overflow-auto">
            {fullWithSig}
          </pre>
        </div>
      )}

      <div class="border-t border-border pt-4 text-xs text-text-muted space-y-1">
        <p>Tip: In VS Code, you can auto-trigger JSDoc with <code class="font-mono bg-bg-card px-1 rounded">/**</code> then Enter above any function.</p>
        <p>
          <a href="/tools/ai-variable-namer" class="text-primary hover:underline">AI Variable Namer →</a>
          {' · '}
          <a href="/tools/ai-commit-generator" class="text-primary hover:underline">AI Commit Generator →</a>
        </p>
      </div>
    </div>
  );
}
