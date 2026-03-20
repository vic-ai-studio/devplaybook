import { useState } from 'preact/hooks';

function formatHtml(html: string, indentSize: number): string {
  if (!html.trim()) return '';
  const indent = ' '.repeat(indentSize);
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const inlineTags = new Set(['a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'button', 'cite', 'code', 'dfn', 'em', 'i', 'img', 'input', 'kbd', 'label', 'map', 'object', 'q', 's', 'samp', 'select', 'small', 'span', 'strong', 'sub', 'sup', 'textarea', 'time', 'tt', 'u', 'var']);
  const preformattedTags = new Set(['pre', 'script', 'style', 'textarea']);

  // Tokenize HTML into tags, text, comments, etc.
  const tokens: string[] = [];
  const re = /<!--[\s\S]*?-->|<!\s*\w[^>]*>|<\/?\s*[\w:-]+(?:[^"'>]|"[^"]*"|'[^']*')*\/?>|[^<]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const t = m[0];
    if (t.trim()) tokens.push(t);
  }

  let level = 0;
  const lines: string[] = [];
  let insidePre = false;

  for (const token of tokens) {
    if (token.startsWith('<!--') || token.startsWith('<!')) {
      lines.push(indent.repeat(level) + token.trim());
      continue;
    }

    const tagMatch = token.match(/^<(\/?)[\s:]*([\w:-]+)/i);
    if (!tagMatch) {
      // Text node
      const text = token.trim();
      if (text) lines.push(indent.repeat(level) + text);
      continue;
    }

    const isClose = tagMatch[1] === '/';
    const tagName = tagMatch[2].toLowerCase();
    const isSelfClose = token.endsWith('/>') || voidTags.has(tagName);

    if (insidePre) {
      lines.push(token);
      if (isClose && preformattedTags.has(tagName)) {
        insidePre = false;
        level--;
      }
      continue;
    }

    if (isClose) {
      level = Math.max(0, level - 1);
      lines.push(indent.repeat(level) + token.trim());
    } else if (isSelfClose || inlineTags.has(tagName)) {
      lines.push(indent.repeat(level) + token.trim());
    } else {
      lines.push(indent.repeat(level) + token.trim());
      if (preformattedTags.has(tagName)) {
        insidePre = true;
      }
      level++;
    }
  }

  return lines.join('\n');
}

function minifyHtml(html: string): string {
  return html
    .replace(/<!--(?![\s\S]*?\bIE\b)[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .replace(/\s+>/g, '>')
    .replace(/<\s+/g, '<')
    .trim();
}

export default function HtmlFormatter() {
  const [input, setInput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [copied, setCopied] = useState(false);

  const output = input ? (mode === 'format' ? formatHtml(input, indentSize) : minifyHtml(input)) : '';

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const savings = input && mode === 'minify'
    ? Math.round((1 - output.length / input.length) * 100)
    : null;

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          {(['format', 'minify'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {m === 'format' ? 'Format / Beautify' : 'Minify'}
            </button>
          ))}
        </div>
        {mode === 'format' && (
          <div class="flex items-center gap-2 ml-2">
            <label class="text-sm text-text-muted">Indent:</label>
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setIndentSize(n)}
                class={`px-3 py-1.5 rounded text-sm transition-colors ${indentSize === n ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Input HTML</label>
          <textarea
            class="w-full h-72 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your HTML here..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          />
          <div class="flex justify-between mt-1">
            <span class="text-xs text-text-muted">{input.length} chars</span>
            <button onClick={() => setInput('')} class="text-xs text-text-muted hover:text-primary transition-colors">Clear</button>
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">
              {mode === 'format' ? 'Formatted HTML' : 'Minified HTML'}
              {savings !== null && savings > 0 && (
                <span class="ml-2 text-xs text-green-400">−{savings}% smaller</span>
              )}
            </label>
            <button
              onClick={copy}
              disabled={!output}
              class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            class="w-full h-72 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            placeholder="Output appears here..."
            value={output}
          />
        </div>
      </div>

      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-1">Features</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Auto-indent nested HTML tags</li>
            <li>Handles void elements (br, img, input, etc.) correctly</li>
            <li>Preserves pre, script, and style block content</li>
            <li>Minify removes whitespace and comments to reduce file size</li>
          </ul>
        </div>
      )}
    </div>
  );
}
