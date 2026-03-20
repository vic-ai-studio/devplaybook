import { useState, useEffect } from 'preact/hooks';

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'rust', 'go', 'java',
  'c', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin',
  'bash', 'sql', 'html', 'css', 'json', 'yaml', 'toml', 'markdown',
];

interface SnippetData {
  code: string;
  lang: string;
  title: string;
}

function encode(data: SnippetData): string {
  const json = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(json)));
}

function decode(hash: string): SnippetData | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function CodeSnippetShare() {
  const [code, setCode] = useState('');
  const [lang, setLang] = useState('javascript');
  const [title, setTitle] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadedFromUrl, setLoadedFromUrl] = useState(false);
  const [lineNumbers, setLineNumbers] = useState(true);

  // Load from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const data = decode(hash);
      if (data) {
        setCode(data.code);
        setLang(data.lang || 'javascript');
        setTitle(data.title || '');
        setLoadedFromUrl(true);
      }
    }
  }, []);

  const handleGenerate = () => {
    if (!code.trim()) return;
    const data: SnippetData = { code, lang, title };
    const hash = encode(data);
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;
    setShareUrl(url);
    window.history.replaceState(null, '', `#${hash}`);
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCode('');
    setTitle('');
    setLang('javascript');
    setShareUrl('');
    setLoadedFromUrl(false);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const lines = code.split('\n');

  return (
    <div class="space-y-6">
      {loadedFromUrl && (
        <div class="bg-accent/10 border border-accent/30 rounded-lg p-3 flex items-center justify-between">
          <span class="text-sm text-accent">📎 Snippet loaded from shared URL</span>
          <button onClick={handleReset} class="text-xs text-text-muted hover:text-text underline">Create new</button>
        </div>
      )}

      {/* Controls */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold mb-1">Title <span class="text-text-muted font-normal">(optional)</span></label>
          <input
            type="text"
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            placeholder="My awesome snippet"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
          />
        </div>
        <div>
          <label class="block text-sm font-semibold mb-1">Language</label>
          <select
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={lang}
            onChange={(e) => setLang((e.target as HTMLSelectElement).value)}
          >
            {LANGUAGES.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Code input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Code</label>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={lineNumbers}
                onChange={() => setLineNumbers(!lineNumbers)}
                class="accent-accent"
              />
              Line numbers
            </label>
            <span class="text-xs text-text-muted">{lines.length} lines</span>
          </div>
        </div>
        <div class="relative">
          {lineNumbers && (
            <div class="absolute left-0 top-0 bottom-0 w-10 bg-surface/80 border-r border-border rounded-l-lg flex flex-col items-end pr-2 pt-3 pointer-events-none overflow-hidden">
              {lines.map((_, i) => (
                <span key={i} class="text-xs text-text-muted/50 leading-5">{i + 1}</span>
              ))}
            </div>
          )}
          <textarea
            class={`w-full h-72 bg-surface border border-border rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:border-accent leading-5 ${lineNumbers ? 'pl-12' : ''}`}
            placeholder="// Paste your code here..."
            value={code}
            onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
          />
        </div>
      </div>

      {/* Actions */}
      <div class="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={!code.trim()}
          class="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Generate Share URL
        </button>
        {code && (
          <button
            onClick={handleCopyCode}
            class="px-4 py-2 bg-surface border border-border hover:border-accent/50 text-text rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>
        )}
      </div>

      {/* Share URL */}
      {shareUrl && (
        <div class="space-y-2">
          <label class="text-sm font-semibold">Shareable URL</label>
          <div class="flex gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              class="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text-muted focus:outline-none truncate"
            />
            <button
              onClick={handleCopyUrl}
              class="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              {copied ? '✓ Copied!' : 'Copy URL'}
            </button>
          </div>
          <p class="text-xs text-text-muted">
            The snippet is encoded in the URL — no server, no database, no expiry. Share it anywhere.
          </p>
        </div>
      )}

      {/* Preview */}
      {loadedFromUrl && code && (
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold">
              {title ? `"${title}"` : 'Snippet'} <span class="text-text-muted font-normal text-xs ml-1">{lang}</span>
            </label>
            <button onClick={handleCopyCode} class="text-xs text-accent hover:underline">Copy code</button>
          </div>
          <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono overflow-auto max-h-96 whitespace-pre">
            {code}
          </pre>
        </div>
      )}
    </div>
  );
}
