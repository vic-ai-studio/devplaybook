import { useState, useCallback, useMemo } from 'preact/hooks';

function sanitizeSvg(input: string): string {
  // Remove <script> tags and their contents
  let svg = input.replace(/<script[\s\S]*?<\/script\s*>/gi, '');
  // Remove self-closing <script> tags
  svg = svg.replace(/<script[^>]*\/>/gi, '');
  // Remove event handler attributes (on*)
  svg = svg.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
  // Remove javascript: URLs in attributes
  svg = svg.replace(/(href|xlink:href)\s*=\s*"javascript:[^"]*"/gi, '$1=""');
  svg = svg.replace(/(href|xlink:href)\s*=\s*'javascript:[^']*'/gi, "$1=''");
  return svg;
}

const SAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">
  <!-- A simple smiley face -->
  <circle cx="50" cy="50" r="45" fill="#FFD700" stroke="#333" stroke-width="2"/>
  <circle cx="35" cy="40" r="5" fill="#333"/>
  <circle cx="65" cy="40" r="5" fill="#333"/>
  <path d="M 30 65 Q 50 80 70 65" stroke="#333" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

function optimizeSvg(input: string): { output: string; saved: number } {
  let svg = input;

  // Remove XML declaration
  svg = svg.replace(/<\?xml[^>]*\?>\s*/g, '');

  // Remove comments
  svg = svg.replace(/<!--[\s\S]*?-->/g, '');

  // Remove unnecessary whitespace between tags
  svg = svg.replace(/>\s+</g, '><');

  // Collapse multiple spaces to one inside attribute values (NOT in content)
  svg = svg.replace(/\s{2,}/g, ' ');

  // Remove whitespace at start and end of attribute values
  svg = svg.replace(/="\s+/g, '="');
  svg = svg.replace(/\s+"/g, '"');

  // Remove default attribute values
  svg = svg.replace(/\s+fill="black"/g, '');
  svg = svg.replace(/\s+stroke="none"/g, '');
  svg = svg.replace(/\s+opacity="1"/g, '');
  svg = svg.replace(/\s+stroke-width="1"/g, '');
  svg = svg.replace(/\s+x="0"\s+y="0"/g, '');

  // Convert hex colors: #ffffff → #fff, #000000 → #000
  svg = svg.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, '#$1$2$3');

  // Remove unnecessary decimal zeros: 1.0 → 1, 0.5 → .5
  svg = svg.replace(/(\d)\.0+(?!\d)/g, '$1');
  svg = svg.replace(/\b0\.(\d)/g, '.$1');

  // Trim
  svg = svg.trim();

  const originalBytes = new TextEncoder().encode(input).length;
  const optimizedBytes = new TextEncoder().encode(svg).length;
  const saved = Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100);

  return { output: svg, saved: Math.max(0, saved) };
}

function formatSvg(input: string): string {
  // Simple formatter: add newlines and indentation
  try {
    let result = input
      .replace(/></g, '>\n<')
      .replace(/^\s+|\s+$/gm, '');

    const lines = result.split('\n');
    let indent = 0;
    const formatted: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Decrease indent for closing tags
      if (line.startsWith('</') || line.startsWith('/>') || line === '/>') {
        indent = Math.max(0, indent - 1);
      }

      formatted.push('  '.repeat(indent) + line);

      // Increase indent after opening tags (not self-closing)
      if (line.startsWith('<') && !line.startsWith('</') && !line.startsWith('<!') && !line.endsWith('/>') && !line.startsWith('<?')) {
        indent++;
      }
    }

    return formatted.join('\n');
  } catch {
    return input;
  }
}

function getStats(svg: string) {
  const bytes = new TextEncoder().encode(svg).length;
  const elements = (svg.match(/<[a-zA-Z]/g) || []).length;
  const attrs = (svg.match(/\s[a-zA-Z-]+=["']/g) || []).length;
  return { bytes, elements, attrs };
}

export default function SvgEditor() {
  const [code, setCode] = useState(SAMPLE_SVG);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedDataUri, setCopiedDataUri] = useState(false);
  const [tab, setTab] = useState<'preview' | 'datauri'>('preview');

  const isValid = useMemo(() => {
    if (!code.trim()) return false;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'image/svg+xml');
      const pe = doc.querySelector('parsererror');
      if (pe) { setError(pe.textContent?.slice(0, 120) ?? 'Invalid SVG'); return false; }
      setError('');
      return true;
    } catch {
      setError('Parse error');
      return false;
    }
  }, [code]);

  const optimized = useMemo(() => optimizeSvg(code), [code]);
  const stats = useMemo(() => getStats(code), [code]);
  const dataUri = useMemo(() => {
    if (!isValid) return '';
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(code)));
  }, [code, isValid]);

  const handleOptimize = useCallback(() => { setCode(optimized.output); }, [optimized]);
  const handleFormat = useCallback(() => { setCode(formatSvg(code)); }, [code]);

  const copyCode = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [code]);

  const copyDataUri = useCallback(async () => {
    await navigator.clipboard.writeText(dataUri);
    setCopiedDataUri(true);
    setTimeout(() => setCopiedDataUri(false), 2000);
  }, [dataUri]);

  const downloadSvg = useCallback(() => {
    const blob = new Blob([code], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'image.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [code]);

  return (
    <div class="space-y-4">
      {/* Stats bar */}
      <div class="flex flex-wrap items-center gap-4 text-xs text-text-muted">
        <span>{stats.bytes} bytes</span>
        <span>{stats.elements} elements</span>
        <span>{stats.attrs} attributes</span>
        {isValid
          ? <span class="text-green-400">✓ Valid SVG</span>
          : <span class="text-red-400">✗ Invalid SVG</span>}
      </div>

      {/* Main layout */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">SVG Code</span>
            <div class="flex gap-2">
              <button onClick={handleFormat} class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors">Format</button>
              <button
                onClick={handleOptimize}
                class="text-xs bg-accent/10 border border-accent/30 text-accent rounded px-2 py-1 hover:bg-accent/20 transition-colors"
              >
                Optimize {optimized.saved > 0 ? `(−${optimized.saved}%)` : ''}
              </button>
            </div>
          </div>
          <textarea
            value={code}
            onInput={e => setCode((e.target as HTMLTextAreaElement).value)}
            class="w-full h-72 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
            spellcheck={false}
            placeholder="Paste SVG code here..."
          />
          {error && <p class="text-xs text-red-400 font-mono">{error}</p>}
        </div>

        {/* Preview + actions */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex gap-1 bg-surface border border-border rounded p-1">
              <button onClick={() => setTab('preview')} class={`px-2 py-0.5 text-xs rounded transition-colors ${tab === 'preview' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}>Preview</button>
              <button onClick={() => setTab('datauri')} class={`px-2 py-0.5 text-xs rounded transition-colors ${tab === 'datauri' ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}>Data URI</button>
            </div>
            <div class="flex gap-2">
              <button onClick={copyCode} class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors">{copiedCode ? '✓ Copied' : 'Copy SVG'}</button>
              <button onClick={downloadSvg} disabled={!isValid} class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors disabled:opacity-40">Download</button>
            </div>
          </div>

          {tab === 'preview' ? (
            <div class="h-72 bg-[#0d1117] border border-border rounded-lg flex items-center justify-center overflow-hidden">
              {isValid ? (
                <div
                  class="max-w-full max-h-full p-4"
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{ __html: sanitizeSvg(code) }}
                />
              ) : (
                <span class="text-text-muted text-sm">Fix SVG errors to see preview</span>
              )}
            </div>
          ) : (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-muted">Base64 data URI (for use in CSS/HTML img src)</span>
                <button onClick={copyDataUri} disabled={!isValid} class="text-xs bg-surface border border-border rounded px-2 py-1 hover:border-accent transition-colors disabled:opacity-40">{copiedDataUri ? '✓ Copied' : 'Copy'}</button>
              </div>
              <textarea
                readOnly
                value={isValid ? dataUri : ''}
                placeholder="Valid SVG required"
                class="w-full h-64 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text/70"
              />
            </div>
          )}
        </div>
      </div>

      {/* Load sample */}
      <button onClick={() => setCode(SAMPLE_SVG)} class="text-xs text-text-muted hover:text-accent transition-colors">
        Load sample SVG
      </button>
    </div>
  );
}
