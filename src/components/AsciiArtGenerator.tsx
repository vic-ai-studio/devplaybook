import { useState, useRef, useCallback } from 'preact/hooks';

const DENSITY_SETS: Record<string, string> = {
  'Classic':  ' .:-=+*#%@',
  'Blocks':   ' ░▒▓█',
  'Simple':   ' .-*#',
  'Bold':     ' +*#@',
};

type DensityKey = keyof typeof DENSITY_SETS;

function textToAscii(text: string, style: DensityKey, fontSize: number): string {
  const density = DENSITY_SETS[style];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const charW = 5;
  const charH = 10;

  ctx.font = `bold ${fontSize}px monospace`;
  const measured = ctx.measureText(text);
  canvas.width = Math.min(Math.ceil(measured.width) + 10, 1400);
  canvas.height = Math.ceil(fontSize * 1.4) + 10;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, 4, fontSize);

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const cols = Math.floor(canvas.width / charW);
  const rows = Math.floor(canvas.height / charH);

  let result = '';
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let sum = 0;
      let count = 0;
      for (let py = 0; py < charH; py++) {
        for (let px = 0; px < charW; px++) {
          const x = col * charW + px;
          const y = row * charH + py;
          if (x < canvas.width && y < canvas.height) {
            const i = (y * canvas.width + x) * 4;
            sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
            count++;
          }
        }
      }
      const brightness = count ? sum / count : 255;
      const idx = Math.floor((1 - brightness / 255) * (density.length - 1));
      result += density[Math.max(0, Math.min(density.length - 1, idx))];
    }
    result += '\n';
  }
  return result.replace(/\n+$/, '');
}

export default function AsciiArtGenerator() {
  const [input, setInput] = useState('Hello World');
  const [style, setStyle] = useState<DensityKey>('Classic');
  const [fontSize, setFontSize] = useState(80);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generate = useCallback((text: string, s: DensityKey, size: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!text.trim()) { setOutput(''); setError(''); return; }
      if (text.length > 30) { setError('Keep text under 30 characters for best results.'); }
      else { setError(''); }
      try {
        const result = textToAscii(text.slice(0, 30), s, size);
        setOutput(result);
      } catch {
        setError('Failed to render. Try shorter text or different settings.');
      }
    }, 150);
  }, []);

  const handleInput = (text: string) => {
    setInput(text);
    generate(text, style, fontSize);
  };
  const handleStyle = (s: DensityKey) => {
    setStyle(s);
    generate(input, s, fontSize);
  };
  const handleSize = (size: number) => {
    setFontSize(size);
    generate(input, style, size);
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const share = () => {
    const url = `${window.location.origin}/tools/ascii-art-generator`;
    if (navigator.share) {
      navigator.share({ title: 'ASCII Art Generator', url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => alert('Link copied!'));
    }
  };

  // Generate on mount
  if (typeof window !== 'undefined' && !output && input) {
    // trigger after mount
    setTimeout(() => generate(input, style, fontSize), 0);
  }

  return (
    <div class="space-y-5">
      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Your text <span class="text-xs">(max 30 chars)</span>
        </label>
        <input
          type="text"
          maxLength={30}
          value={input}
          onInput={(e) => handleInput((e.target as HTMLInputElement).value)}
          placeholder="Type something..."
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-text text-base focus:outline-none focus:border-primary transition-colors font-mono"
        />
        <div class="flex justify-between mt-1">
          <span class="text-xs text-text-muted">{input.length}/30 characters</span>
          {error && <span class="text-xs text-yellow-400">{error}</span>}
        </div>
      </div>

      {/* Controls */}
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-40">
          <label class="block text-xs font-medium text-text-muted mb-2">Style</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(DENSITY_SETS) as DensityKey[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStyle(s)}
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  style === s
                    ? 'bg-primary text-white border-primary'
                    : 'bg-bg-card border-border hover:border-primary text-text-muted hover:text-text'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div class="min-w-48">
          <label class="block text-xs font-medium text-text-muted mb-2">
            Size: <span class="text-text">{fontSize}px</span>
          </label>
          <input
            type="range"
            min={40}
            max={120}
            step={10}
            value={fontSize}
            onInput={(e) => handleSize(Number((e.target as HTMLInputElement).value))}
            class="w-full accent-primary"
          />
          <div class="flex justify-between text-xs text-text-muted mt-1">
            <span>Small</span><span>Large</span>
          </div>
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">ASCII Art Output</label>
          <div class="flex gap-2">
            <button
              onClick={share}
              class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
            >
              Share Tool
            </button>
            <button
              onClick={copy}
              disabled={!output}
              class={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-bg-card border-border hover:border-primary hover:text-primary disabled:opacity-40'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div class="bg-bg-card border border-border rounded-xl p-4 overflow-x-auto">
          {output ? (
            <pre class="text-xs leading-tight text-text font-mono whitespace-pre select-all">{output}</pre>
          ) : (
            <p class="text-text-muted text-sm text-center py-8">
              Type text above to generate ASCII art instantly.
              <br />
              <span class="text-xs">Runs entirely in your browser — nothing sent to any server.</span>
            </p>
          )}
        </div>
      </div>

      {/* Tips */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="text-sm font-semibold mb-2 text-text">Tips</h3>
        <ul class="text-xs text-text-muted space-y-1">
          <li>• Use <strong class="text-text">UPPERCASE</strong> letters for bolder, cleaner output</li>
          <li>• <strong class="text-text">Blocks</strong> style works great in terminals with unicode support</li>
          <li>• <strong class="text-text">Classic</strong> is best for plain-text emails and README files</li>
          <li>• Short words (3–8 chars) produce the sharpest results</li>
        </ul>
      </div>
    </div>
  );
}
