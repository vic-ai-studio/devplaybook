import { useState } from 'preact/hooks';

function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML special chars first (in code blocks we'll restore)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_m, lang, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre><code class="language-${lang || 'text'}">${escaped.trimEnd()}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, (_m, code) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code>${escaped}</code>`;
    })
    // Headings
    .replace(/^###### (.+)$/gm, '<h6>$1</h6>')
    .replace(/^##### (.+)$/gm, '<h5>$1</h5>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Horizontal rule
    .replace(/^---+$/gm, '<hr>')
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Links and images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Unordered lists
    .replace(/((?:^[*-] .+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(l => `  <li>${l.replace(/^[*-] /, '')}</li>`).join('\n');
      return `<ul>\n${items}\n</ul>`;
    })
    // Ordered lists
    .replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(l => `  <li>${l.replace(/^\d+\. /, '')}</li>`).join('\n');
      return `<ol>\n${items}\n</ol>`;
    })
    // Paragraphs (lines not already wrapped in tags)
    .replace(/^(?!<[a-z]|$)(.+)$/gm, '<p>$1</p>')
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return html;
}

function formatHtml(html: string): string {
  // Simple pretty-printer: add newlines around block tags
  return html
    .replace(/(<\/(?:h[1-6]|p|ul|ol|li|blockquote|pre|hr)>)/g, '$1\n')
    .replace(/(<(?:h[1-6]|p|ul|ol|li|blockquote|pre|hr)[^>]*>)/g, '\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SAMPLE = `# Hello, Markdown!

This is a **bold** and *italic* example with \`inline code\`.

## Features

- Unordered list item
- Another item with ~~strikethrough~~
- [Link to DevPlaybook](https://devplaybook.cc)

## Code Block

\`\`\`javascript
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('World'));
\`\`\`

> Blockquote: Markdown is everywhere.

---

1. Ordered item one
2. Ordered item two
3. Ordered item three
`;

export default function MarkdownToHtml() {
  const [input, setInput] = useState(SAMPLE);
  const [tab, setTab] = useState<'html' | 'preview'>('html');
  const [copied, setCopied] = useState(false);
  const [prettyPrint, setPrettyPrint] = useState(true);

  const rawHtml = input.trim() ? markdownToHtml(input) : '';
  const output = prettyPrint ? formatHtml(rawHtml) : rawHtml;

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center text-sm text-text-muted mb-1">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={prettyPrint}
            onChange={e => setPrettyPrint((e.target as HTMLInputElement).checked)}
            class="accent-accent w-4 h-4"
          />
          Pretty-print HTML
        </label>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div>
          <div class="text-xs font-medium text-text-muted mb-1 uppercase tracking-wide">Markdown Input</div>
          <textarea
            class="w-full h-80 font-mono text-sm bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:border-accent"
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            placeholder="Paste your Markdown here..."
            spellcheck={false}
          />
        </div>

        {/* Output */}
        <div>
          <div class="flex items-center justify-between mb-1">
            <div class="flex gap-1">
              <button
                onClick={() => setTab('html')}
                class={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${tab === 'html' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
              >
                HTML
              </button>
              <button
                onClick={() => setTab('preview')}
                class={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${tab === 'preview' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}
              >
                Preview
              </button>
            </div>
            <button
              onClick={copy}
              disabled={!output}
              class="text-xs px-3 py-1 bg-surface border border-border rounded-md hover:border-accent transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Copied!' : 'Copy HTML'}
            </button>
          </div>

          {tab === 'html' ? (
            <textarea
              class="w-full h-80 font-mono text-sm bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:border-accent"
              value={output}
              readOnly
              placeholder="HTML output will appear here..."
              spellcheck={false}
            />
          ) : (
            <div
              class="w-full h-80 overflow-auto bg-surface border border-border rounded-lg p-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rawHtml }}
            />
          )}
        </div>
      </div>

      <div class="flex gap-2">
        <button
          onClick={() => setInput(SAMPLE)}
          class="text-xs px-3 py-1.5 bg-surface border border-border rounded-md text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
        <button
          onClick={() => setInput('')}
          class="text-xs px-3 py-1.5 bg-surface border border-border rounded-md text-text-muted hover:border-accent transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
