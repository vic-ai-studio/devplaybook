import { useState } from 'preact/hooks';

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bookstore>
  <book category="fiction">
    <title lang="en">The Great Gatsby</title>
    <author>F. Scott Fitzgerald</author>
    <year>1925</year>
    <price>12.99</price>
    <inStock>true</inStock>
  </book>
  <book category="tech">
    <title lang="en">Clean Code</title>
    <author>Robert C. Martin</author>
    <year>2008</year>
    <price>34.99</price>
    <inStock>false</inStock>
  </book>
</bookstore>`;

type XmlNode = {
  [key: string]: unknown;
};

function parseValue(text: string): unknown {
  const t = text.trim();
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (t !== '' && !isNaN(Number(t))) return Number(t);
  return t;
}

function elementToJson(el: Element): unknown {
  const children = Array.from(el.childNodes).filter(
    n => !(n.nodeType === Node.TEXT_NODE && !(n.textContent || '').trim())
  );
  const elementChildren = children.filter(n => n.nodeType === Node.ELEMENT_NODE) as Element[];
  const textChildren = children.filter(n => n.nodeType === Node.TEXT_NODE);

  const attrs: Record<string, unknown> = {};
  Array.from(el.attributes).forEach(a => {
    attrs[`@${a.name}`] = parseValue(a.value);
  });
  const hasAttrs = Object.keys(attrs).length > 0;

  // Pure text node
  if (elementChildren.length === 0 && textChildren.length <= 1) {
    const text = el.textContent?.trim() ?? '';
    if (!hasAttrs) return parseValue(text);
    return { ...attrs, '#text': parseValue(text) };
  }

  // Build object from child elements
  const obj: XmlNode = { ...attrs };
  const tagGroups: Record<string, Element[]> = {};
  for (const child of elementChildren) {
    const tag = child.tagName;
    if (!tagGroups[tag]) tagGroups[tag] = [];
    tagGroups[tag].push(child);
  }

  for (const [tag, elements] of Object.entries(tagGroups)) {
    const parsed = elements.map(e => elementToJson(e));
    obj[tag] = parsed.length === 1 ? parsed[0] : parsed;
  }

  return obj;
}

function xmlToJson(xmlString: string, arrayMode: boolean): { ok: boolean; json?: unknown; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString.trim(), 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { ok: false, error: parseError.textContent?.split('\n')[0] || 'XML parse error' };
    }
    const root = doc.documentElement;
    const body = elementToJson(root);

    let result: unknown;
    if (arrayMode) {
      // Force all single-element groups to arrays
      result = { [root.tagName]: body };
    } else {
      result = { [root.tagName]: body };
    }

    return { ok: true, json: result };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export default function XmlToJsonConverter() {
  const [input, setInput] = useState(SAMPLE_XML);
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);

  const result = xmlToJson(input, false);
  const jsonOutput = result.ok
    ? JSON.stringify(result.json, null, indent)
    : null;

  function copy() {
    if (jsonOutput) {
      navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  const lineCount = jsonOutput ? jsonOutput.split('\n').length : 0;

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Indent:</label>
          {[2, 4].map(n => (
            <button
              key={n}
              onClick={() => setIndent(n)}
              class={`px-3 py-1 rounded text-sm font-mono border transition-colors ${indent === n ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent text-text-muted'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setInput(''); }}
          class="px-3 py-1 text-sm border border-border hover:border-red-400 text-text-muted hover:text-red-400 rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium mb-1 text-text-muted">XML input</label>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          class="w-full h-56 font-mono text-sm p-3 bg-bg-secondary border border-border rounded-lg resize-y focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Paste your XML here..."
          spellcheck={false}
        />
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-text-muted">
            JSON output
            {jsonOutput && <span class="ml-2 text-xs text-text-muted/60">{lineCount} lines</span>}
          </label>
          {jsonOutput && (
            <button
              onClick={copy}
              class="px-3 py-1 text-sm border border-border hover:border-accent text-text-muted hover:text-accent rounded transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy JSON'}
            </button>
          )}
        </div>
        {result.ok ? (
          <pre class="w-full h-56 font-mono text-sm p-3 bg-bg-secondary border border-border rounded-lg overflow-auto text-text-primary">
            <code>{jsonOutput}</code>
          </pre>
        ) : (
          <div class="w-full h-56 p-3 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg overflow-auto">
            <p class="text-sm font-medium text-red-700 dark:text-red-400 mb-1">XML Parse Error</p>
            <pre class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">{result.error}</pre>
          </div>
        )}
      </div>

      {/* Conversion notes */}
      <div class="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted space-y-1.5">
        <p class="font-medium text-text-primary">Conversion rules</p>
        <ul class="list-disc list-inside space-y-1 text-xs">
          <li>XML attributes are prefixed with <code class="font-mono bg-bg-primary px-1 rounded">@</code> (e.g. <code class="font-mono bg-bg-primary px-1 rounded">@lang</code>)</li>
          <li>Text content becomes the value directly, or <code class="font-mono bg-bg-primary px-1 rounded">#text</code> when attributes are present</li>
          <li>Repeated sibling elements become JSON arrays</li>
          <li><code class="font-mono bg-bg-primary px-1 rounded">true</code>, <code class="font-mono bg-bg-primary px-1 rounded">false</code>, and numeric strings are cast to native types</li>
          <li>XML comments and processing instructions are omitted</li>
        </ul>
      </div>
    </div>
  );
}
