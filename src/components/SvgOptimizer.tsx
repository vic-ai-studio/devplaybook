import { useState, useMemo } from 'preact/hooks';

// Client-side SVG optimization without SVGO (100% in-browser)
function optimizeSvg(input: string, opts: OptOptions): string {
  let svg = input.trim();
  if (!svg) return '';

  // Remove XML declaration
  if (opts.removeXmlDecl) {
    svg = svg.replace(/<\?xml[^?]*\?>/gi, '');
  }

  // Remove comments
  if (opts.removeComments) {
    svg = svg.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Remove metadata elements
  if (opts.removeMetadata) {
    svg = svg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    svg = svg.replace(/<title[\s\S]*?<\/title>/gi, '');
    svg = svg.replace(/<desc[\s\S]*?<\/desc>/gi, '');
  }

  // Remove editor data (Inkscape, Illustrator, etc.)
  if (opts.removeEditorData) {
    svg = svg.replace(/\s+inkscape:[a-z-]+="[^"]*"/gi, '');
    svg = svg.replace(/\s+sodipodi:[a-z-]+="[^"]*"/gi, '');
    svg = svg.replace(/\s+xmlns:inkscape="[^"]*"/gi, '');
    svg = svg.replace(/\s+xmlns:sodipodi="[^"]*"/gi, '');
    svg = svg.replace(/\s+xmlns:xlink="[^"]*"/gi, '');
    svg = svg.replace(/<sodipodi:[^>]*\/>/gi, '');
    svg = svg.replace(/<inkscape:[^>]*\/>/gi, '');
    svg = svg.replace(/<namedview[\s\S]*?<\/namedview>/gi, '');
  }

  // Remove empty attributes
  if (opts.removeEmptyAttrs) {
    svg = svg.replace(/\s+[a-z-]+=""/gi, '');
  }

  // Remove default values
  if (opts.removeDefaults) {
    svg = svg.replace(/\s+display="inline"/gi, '');
    svg = svg.replace(/\s+visibility="visible"/gi, '');
    svg = svg.replace(/\s+overflow="visible"/gi, '');
    svg = svg.replace(/\s+fill-opacity="1"/gi, '');
    svg = svg.replace(/\s+stroke-opacity="1"/gi, '');
  }

  // Collapse whitespace
  if (opts.collapseWhitespace) {
    // Normalize whitespace in attributes
    svg = svg.replace(/\s{2,}/g, ' ');
    // Remove whitespace between tags
    svg = svg.replace(/>\s+</g, '><');
    // Trim
    svg = svg.trim();
  }

  // Shorten color values
  if (opts.shortenColors) {
    // #rrggbb → #rgb where possible
    svg = svg.replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/gi, '#$1$2$3');
    // rgb(255,255,255) → #fff
    svg = svg.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/gi, (_, r, g, b) => {
      const hex = (n: number) => parseInt(n).toString(16).padStart(2, '0');
      return `#${hex(r)}${hex(g)}${hex(b)}`;
    });
    // Named colors
    svg = svg.replace(/="white"/gi, '="#fff"');
    svg = svg.replace(/="black"/gi, '="#000"');
  }

  return svg.trim();
}

interface OptOptions {
  removeXmlDecl: boolean;
  removeComments: boolean;
  removeMetadata: boolean;
  removeEditorData: boolean;
  removeEmptyAttrs: boolean;
  removeDefaults: boolean;
  collapseWhitespace: boolean;
  shortenColors: boolean;
}

const DEFAULT_OPTS: OptOptions = {
  removeXmlDecl: true,
  removeComments: true,
  removeMetadata: true,
  removeEditorData: true,
  removeEmptyAttrs: true,
  removeDefaults: true,
  collapseWhitespace: true,
  shortenColors: true,
};

const SAMPLE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Created with Inkscape -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="100" height="100" viewBox="0 0 100 100">
  <title>Sample Circle</title>
  <desc>A simple red circle</desc>
  <metadata>Sample metadata</metadata>
  <circle cx="50" cy="50" r="40" fill="red" fill-opacity="1" stroke="black" stroke-width="2" display="inline" />
</svg>`;

export default function SvgOptimizer() {
  const [input, setInput] = useState('');
  const [opts, setOpts] = useState<OptOptions>(DEFAULT_OPTS);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => input.trim() ? optimizeSvg(input, opts) : '', [input, opts]);

  const inputSize = new Blob([input]).size;
  const outputSize = new Blob([output]).size;
  const savings = inputSize > 0 ? Math.round((1 - outputSize / inputSize) * 100) : 0;

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggle = (key: keyof OptOptions) => {
    setOpts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const OPTIONS: { key: keyof OptOptions; label: string }[] = [
    { key: 'removeXmlDecl', label: 'Remove XML declaration' },
    { key: 'removeComments', label: 'Remove comments' },
    { key: 'removeMetadata', label: 'Remove metadata/title/desc' },
    { key: 'removeEditorData', label: 'Remove editor data (Inkscape, etc.)' },
    { key: 'removeEmptyAttrs', label: 'Remove empty attributes' },
    { key: 'removeDefaults', label: 'Remove default values' },
    { key: 'collapseWhitespace', label: 'Collapse whitespace' },
    { key: 'shortenColors', label: 'Shorten color values' },
  ];

  return (
    <div class="space-y-5">
      {/* Options */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-3">Optimization Options</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {OPTIONS.map(({ key, label }) => (
            <label key={key} class="flex items-center gap-2 cursor-pointer text-sm text-text-muted hover:text-white transition-colors">
              <input
                type="checkbox"
                checked={opts[key]}
                onChange={() => toggle(key)}
                class="rounded border-border text-primary focus:ring-primary"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Input SVG</h2>
          <div class="flex gap-2">
            <button
              onClick={() => setInput(SAMPLE_SVG)}
              class="text-xs px-3 py-1 rounded border border-border text-text-muted hover:text-white hover:border-primary transition-colors"
            >
              Load Sample
            </button>
            <button
              onClick={() => setInput('')}
              class="text-xs px-3 py-1 rounded border border-border text-text-muted hover:text-white hover:border-primary transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={(e: any) => setInput(e.target.value)}
          placeholder="Paste your SVG code here..."
          rows={10}
          class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-green-400 font-mono focus:outline-none focus:border-primary resize-none"
        />
        {inputSize > 0 && <p class="text-xs text-text-muted mt-1">{inputSize} bytes</p>}
      </div>

      {/* Output */}
      {output && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <h2 class="text-base font-semibold">Optimized SVG</h2>
              {savings > 0 && (
                <span class="text-xs font-semibold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full">
                  -{savings}% ({(inputSize - outputSize).toLocaleString()} bytes saved)
                </span>
              )}
            </div>
            <button
              onClick={copy}
              class="text-xs px-3 py-1 rounded border border-border text-text-muted hover:text-white hover:border-primary transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="bg-bg text-green-400 text-sm font-mono rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">{output}</pre>
          <p class="text-xs text-text-muted mt-2">{outputSize} bytes</p>
        </div>
      )}

      {/* Preview */}
      {output && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="text-base font-semibold mb-3">Preview</h2>
          <div
            class="bg-white rounded-lg p-6 flex items-center justify-center min-h-32"
            dangerouslySetInnerHTML={{ __html: output }}
          />
        </div>
      )}
    </div>
  );
}
