import { useState } from 'preact/hooks';

const EXAMPLES = [
  {
    label: 'User',
    code: `interface User {
  id: number;
  name: string;
  email: string;
  age?: number;
  isActive: boolean;
  tags: string[];
}`,
  },
  {
    label: 'Address',
    code: `type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}`,
  },
  {
    label: 'Product',
    code: `interface Product {
  id: string;
  title: string;
  price: number;
  description?: string;
  inStock: boolean;
  categories: string[];
  rating: number | null;
}`,
  },
];

type TSField = {
  name: string;
  type: string;
  optional: boolean;
};

function parseTypeScript(input: string): TSField[] | null {
  const cleaned = input
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // Match interface or type alias body
  const bodyMatch = cleaned.match(/(?:interface|type)\s+\w+\s*=?\s*\{([\s\S]*)\}/);
  if (!bodyMatch) return null;

  const body = bodyMatch[1];
  const fields: TSField[] = [];

  const lines = body.split(/[;\n]/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Match: name?: type  or  name: type
    const m = line.match(/^(\w+)(\?)?:\s*(.+?)\s*[;,]?$/);
    if (!m) continue;
    fields.push({ name: m[1], type: m[3].trim(), optional: m[2] === '?' });
  }

  return fields.length > 0 ? fields : null;
}

function tsTypeToZod(tsType: string): string {
  const t = tsType.trim();

  // Array: T[]
  if (t.endsWith('[]')) {
    const inner = t.slice(0, -2).trim();
    return `z.array(${tsTypeToZod(inner)})`;
  }

  // Array: Array<T>
  const arrayGeneric = t.match(/^Array<(.+)>$/);
  if (arrayGeneric) {
    return `z.array(${tsTypeToZod(arrayGeneric[1])})`;
  }

  // Union: T | null -> nullable
  const unionParts = t.split('|').map(p => p.trim()).filter(Boolean);
  if (unionParts.length > 1) {
    const nonNull = unionParts.filter(p => p !== 'null' && p !== 'undefined');
    const hasNull = unionParts.includes('null');
    const hasUndefined = unionParts.includes('undefined');
    if (nonNull.length === 1) {
      let base = tsTypeToZod(nonNull[0]);
      if (hasNull) base += '.nullable()';
      if (hasUndefined) base += '.optional()';
      return base;
    }
    return `z.union([${unionParts.map(tsTypeToZod).join(', ')}])`;
  }

  switch (t) {
    case 'string': return 'z.string()';
    case 'number': return 'z.number()';
    case 'boolean': return 'z.boolean()';
    case 'null': return 'z.null()';
    case 'undefined': return 'z.undefined()';
    case 'any': return 'z.any()';
    case 'unknown': return 'z.unknown()';
    case 'never': return 'z.never()';
    case 'void': return 'z.void()';
    case 'bigint': return 'z.bigint()';
    case 'symbol': return 'z.symbol()';
    case 'Date': return 'z.date()';
    default:
      // Record<K, V>
      if (t.startsWith('Record<')) return 'z.record(z.string(), z.unknown())';
      // Capitalize → likely another interface
      if (/^[A-Z]/.test(t)) return `${t}Schema`;
      return 'z.unknown()';
  }
}

function generateZodSchema(interfaceName: string, fields: TSField[]): string {
  const lines = fields.map(f => {
    let zodType = tsTypeToZod(f.type);
    if (f.optional) zodType += '.optional()';
    return `  ${f.name}: ${zodType},`;
  });

  const schemaName = interfaceName
    ? interfaceName.charAt(0).toLowerCase() + interfaceName.slice(1) + 'Schema'
    : 'schema';

  return `import { z } from 'zod';

export const ${schemaName} = z.object({
${lines.join('\n')}
});

export type ${interfaceName || 'Schema'} = z.infer<typeof ${schemaName}>;`;
}

function extractName(input: string): string {
  const m = input.match(/(?:interface|type)\s+(\w+)/);
  return m ? m[1] : 'MyType';
}

export default function ZodSchemaGenerator() {
  const [input, setInput] = useState(EXAMPLES[0].code);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = () => {
    const fields = parseTypeScript(input);
    if (!fields) {
      setError('Could not parse. Make sure input is a TypeScript interface or type alias with named fields.');
      setOutput('');
      return;
    }
    const name = extractName(input);
    setOutput(generateZodSchema(name, fields));
    setError('');
  };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Auto-generate on mount
  if (!output && !error) {
    const fields = parseTypeScript(input);
    if (fields) {
      const name = extractName(input);
      setOutput(generateZodSchema(name, fields));
    }
  }

  return (
    <div class="space-y-5">
      {/* Examples */}
      <div class="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => {
              setInput(ex.code);
              const fields = parseTypeScript(ex.code);
              if (fields) setOutput(generateZodSchema(extractName(ex.code), fields));
              setError('');
            }}
            class="text-xs px-3 py-1.5 bg-surface border border-border rounded-full text-text-muted hover:border-brand hover:text-brand transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input */}
        <div>
          <label class="block text-sm font-medium text-text mb-2">TypeScript Interface / Type</label>
          <textarea
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            rows={14}
            class="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand resize-y"
          />
          <button
            onClick={generate}
            class="mt-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
          >
            Generate Zod Schema
          </button>
        </div>

        {/* Output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text">Zod Schema</label>
            {output && (
              <button
                onClick={copy}
                class="text-xs px-3 py-1 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>
          {error && (
            <div class="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm mb-2">{error}</div>
          )}
          {output && (
            <pre class="bg-surface border border-border rounded-lg p-3 text-sm font-mono text-text-muted overflow-x-auto whitespace-pre min-h-[14rem]">
              {output}
            </pre>
          )}
        </div>
      </div>

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text text-sm mb-1">Supported TypeScript types</p>
        <p>string, number, boolean, null, undefined, any, unknown, Date, T[], Array&lt;T&gt;, T | null, T | undefined, union types, Record&lt;K,V&gt;, and nested interface references</p>
      </div>
    </div>
  );
}
