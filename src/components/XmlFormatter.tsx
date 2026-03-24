import { useState } from 'preact/hooks';

function formatXml(xml: string, indent: number): { ok: boolean; result?: string; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml.trim(), 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return { ok: false, error: parseError.textContent?.split('\n')[0] || 'Parse error' };
    const pad = ' '.repeat(indent);
    function serialize(node: Node, depth: number): string {
      const prefix = pad.repeat(depth);
      if (node.nodeType === Node.TEXT_NODE) {
        const t = (node.textContent || '').trim();
        return t ? `${prefix}${t}` : '';
      }
      if (node.nodeType === Node.COMMENT_NODE) return `${prefix}<!--${node.textContent}-->`;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const el = node as Element;
      const tag = el.tagName;
      const attrs = Array.from(el.attributes).map(a => ` ${a.name}="${a.value}"`).join('');
      const children = Array.from(el.childNodes).map(c => serialize(c, depth + 1)).filter(Boolean);
      if (children.length === 0) return `${prefix}<${tag}${attrs}/>`;
      if (children.length === 1 && !children[0].includes('\n')) return `${prefix}<${tag}${attrs}>${children[0].trim()}</${tag}>`;
      return `${prefix}<${tag}${attrs}>\n${children.join('\n')}\n${prefix}</${tag}>`;
    }
    const root = doc.documentElement;
    return { ok: true, result: serialize(root, 0) };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

function minifyXml(xml: string): { ok: boolean; result?: string; error?: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml.trim(), 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) return { ok: false, error: parseError.textContent?.split('\n')[0] || 'Parse error' };
    const s = new XMLSerializer();
    return { ok: true, result: s.serializeToString(doc).replace(/>\s+</g, '><').trim() };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export default function XmlFormatter() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState(2);
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [copied, setCopied] = useState(false);

  const result = input.trim() ? (mode === 'format' ? formatXml(input, indent) : minifyXml(input)) : null;

  const copy = () => {
    if (!result?.result) return;
    navigator.clipboard.writeText(result.result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          {(['format', 'minify'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
              {m === 'format' ? 'Format / Beautify' : 'Minify'}
            </button>
          ))}
        </div>
        {mode === 'format' && (
          <div class="flex gap-2 items-center ml-auto">
            <label class="text-sm text-text-muted">Indent:</label>
            {[2, 4].map(n => (
              <button key={n} onClick={() => setIndent(n)} class={`px-3 py-1.5 rounded text-sm transition-colors ${indent === n ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>{n}</button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">XML Input</label>
        <textarea
          class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={`<root>\n  <item id="1">Hello</item>\n</root>`}
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {result && (
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">
              {result.ok ? (mode === 'format' ? 'Formatted XML' : 'Minified XML') : 'Error'}
            </label>
            {result.ok && (
              <button onClick={copy} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            )}
          </div>
          {result.ok ? (
            <textarea
              readOnly
              class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
              value={result.result}
            />
          ) : (
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 font-mono">{result.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
