import { useState } from 'preact/hooks';

const DEFAULT_MD = `# Welcome to Markdown Preview

Write **Markdown** on the left, see the rendered output on the right — instantly.

## Features
- Live preview as you type
- GitHub Flavored Markdown (GFM)
- Code blocks with syntax hints
- Tables, task lists, and more

## Code Example
\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('World'));
\`\`\`

## Table
| Tool | Use case |
|------|----------|
| Base64 | Encoding binary data |
| SHA-256 | File integrity check |
| CRON | Scheduling jobs |

## Task List
- [x] Write markdown
- [x] See live preview
- [ ] Copy HTML output
`;

// Lightweight markdown → HTML (GFM subset, no external deps)
function markdownToHtml(md: string): string {
  let html = md
    // Escape HTML entities first
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Fenced code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre class="bg-bg-card border border-border rounded p-3 my-3 overflow-x-auto text-sm"><code class="text-green-400">${code.trimEnd()}</code></pre>`)
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-5 mb-2 text-text">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-2 text-text">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-3 text-text">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-bg-card px-1.5 py-0.5 rounded text-sm font-mono text-primary">$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => {
      const sanitizedHref = /^\s*(javascript|data|vbscript)\s*:/i.test(href) ? '#' : href;
      return `<a href="${sanitizedHref}" class="text-primary underline hover:no-underline" target="_blank" rel="noopener">${text}</a>`;
    })
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="border-border my-6" />')
    // Task lists (before normal lists)
    .replace(/^- \[x\] (.+)$/gm, '<li class="flex gap-2 items-start"><span class="text-green-400 mt-0.5">✓</span><span class="line-through text-text-muted">$1</span></li>')
    .replace(/^- \[ \] (.+)$/gm, '<li class="flex gap-2 items-start"><span class="text-text-muted mt-0.5">☐</span><span>$1</span></li>')
    // Tables
    .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (_, header, rows) => {
      const ths = header.split('|').filter(Boolean).map((h: string) => `<th class="px-3 py-2 text-left text-xs uppercase text-text-muted border-b border-border">${h.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map((row: string) =>
        '<tr>' + row.split('|').filter(Boolean).map((c: string) => `<td class="px-3 py-2 text-sm border-b border-border">${c.trim()}</td>`).join('') + '</tr>'
      ).join('');
      return `<table class="w-full border border-border rounded my-4 text-left"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Unordered lists
    .replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(l => {
        const content = l.replace(/^- /, '');
        if (content.startsWith('<li')) return content;
        return `<li class="ml-4 list-disc">${content}</li>`;
      }).join('');
      return `<ul class="my-3 space-y-1">${items}</ul>`;
    })
    // Ordered lists
    .replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(l =>
        `<li class="ml-4 list-decimal">${l.replace(/^\d+\. /, '')}</li>`
      ).join('');
      return `<ol class="my-3 space-y-1">${items}</ol>`;
    })
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-primary pl-4 text-text-muted italic my-3">$1</blockquote>')
    // Paragraphs (double newlines)
    .replace(/\n\n(?!<)/g, '</p><p class="mb-3">')
    // Single newlines inside paragraphs
    .replace(/\n(?!<)/g, '<br/>');

  return `<div class="prose prose-sm text-text"><p class="mb-3">${html}</p></div>`;
}

export default function MarkdownPreview() {
  const [md, setMd] = useState(DEFAULT_MD);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<'split' | 'preview'>('split');

  const html = markdownToHtml(md);

  const copyHtml = () => {
    navigator.clipboard.writeText(html).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-3">
      {/* Toolbar */}
      <div class="flex justify-between items-center flex-wrap gap-2">
        <div class="flex gap-2">
          <button
            onClick={() => setView('split')}
            class={`text-xs px-3 py-1.5 rounded border transition-colors ${view === 'split' ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary'}`}
          >
            Split
          </button>
          <button
            onClick={() => setView('preview')}
            class={`text-xs px-3 py-1.5 rounded border transition-colors ${view === 'preview' ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary'}`}
          >
            Preview only
          </button>
        </div>
        <div class="flex gap-2">
          <button
            onClick={copyHtml}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? '✓ HTML Copied!' : 'Copy as HTML'}
          </button>
          <button
            onClick={() => setMd('')}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div class={`grid gap-4 ${view === 'split' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
        {(view === 'split') && (
          <div>
            <p class="text-xs text-text-muted mb-1 font-medium">Markdown</p>
            <textarea
              class="w-full h-96 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
              value={md}
              onInput={(e) => setMd((e.target as HTMLTextAreaElement).value)}
              spellcheck={false}
            />
          </div>
        )}
        <div>
          <p class="text-xs text-text-muted mb-1 font-medium">Preview</p>
          <div
            class="w-full min-h-96 h-96 overflow-y-auto bg-bg-card border border-border rounded-lg p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {view === 'preview' && (
        <textarea
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          value={md}
          onInput={(e) => setMd((e.target as HTMLTextAreaElement).value)}
          placeholder="Type markdown here..."
          spellcheck={false}
        />
      )}
    </div>
  );
}
