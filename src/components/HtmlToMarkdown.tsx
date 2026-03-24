import { useState } from 'preact/hooks';

function nodeToMd(node: Node, listType?: 'ul' | 'ol', listIndex?: { n: number }): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const inner = () => Array.from(el.childNodes).map(c => nodeToMd(c)).join('');

  switch (tag) {
    case 'h1': return `\n# ${inner().trim()}\n`;
    case 'h2': return `\n## ${inner().trim()}\n`;
    case 'h3': return `\n### ${inner().trim()}\n`;
    case 'h4': return `\n#### ${inner().trim()}\n`;
    case 'h5': return `\n##### ${inner().trim()}\n`;
    case 'h6': return `\n###### ${inner().trim()}\n`;
    case 'p': return `\n${inner().trim()}\n`;
    case 'strong': case 'b': return `**${inner()}**`;
    case 'em': case 'i': return `*${inner()}*`;
    case 'del': case 's': return `~~${inner()}~~`;
    case 'code': return tag === 'code' && el.parentElement?.tagName.toLowerCase() !== 'pre' ? `\`${inner()}\`` : inner();
    case 'pre': return `\n\`\`\`\n${el.textContent?.trim()}\n\`\`\`\n`;
    case 'a': { const href = el.getAttribute('href') || ''; return `[${inner()}](${href})`; }
    case 'img': { const src = el.getAttribute('src') || ''; const alt = el.getAttribute('alt') || ''; return `![${alt}](${src})`; }
    case 'blockquote': return inner().split('\n').filter(Boolean).map(l => `> ${l}`).join('\n') + '\n';
    case 'hr': return '\n---\n';
    case 'br': return '\n';
    case 'ul': return Array.from(el.children).map(li => `\n- ${nodeToMd(li).trim()}`).join('') + '\n';
    case 'ol': {
      let n = 0;
      return Array.from(el.children).map(li => `\n${++n}. ${nodeToMd(li).trim()}`).join('') + '\n';
    }
    case 'li': return inner();
    case 'table': {
      const rows = Array.from(el.querySelectorAll('tr'));
      if (!rows.length) return '';
      const toRow = (tr: Element) => '| ' + Array.from(tr.querySelectorAll('td,th')).map(c => c.textContent?.trim() || '').join(' | ') + ' |';
      const header = toRow(rows[0]);
      const sep = '| ' + Array.from(rows[0].querySelectorAll('td,th')).map(() => '---').join(' | ') + ' |';
      const body = rows.slice(1).map(toRow).join('\n');
      return `\n${header}\n${sep}\n${body}\n`;
    }
    default: return inner();
  }
}

function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return Array.from(doc.body.childNodes).map(n => nodeToMd(n)).join('').replace(/\n{3,}/g, '\n\n').trim();
}

export default function HtmlToMarkdown() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = input.trim() ? htmlToMarkdown(input) : '';

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">HTML Input</label>
        <textarea
          class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={`<h1>Hello World</h1>\n<p>This is a <strong>paragraph</strong> with <em>emphasis</em>.</p>\n<ul>\n  <li>Item one</li>\n  <li>Item two</li>\n</ul>`}
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
        <button onClick={() => setInput('')} class="mt-2 text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">Clear</button>
      </div>
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium text-text-muted">Markdown Output</label>
          <button onClick={copy} disabled={!output} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors disabled:opacity-40">{copied ? '✓ Copied!' : 'Copy'}</button>
        </div>
        <textarea
          readOnly
          class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none"
          value={output}
          placeholder="Markdown output will appear here..."
        />
      </div>
    </div>
  );
}
