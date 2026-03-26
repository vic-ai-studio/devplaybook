import { useState, useRef, useCallback } from 'preact/hooks';

const EXAMPLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="45" fill="#6366f1" opacity="0.9"/>
  <text x="50" y="55" text-anchor="middle" font-size="28" font-family="Arial,sans-serif" fill="white" font-weight="bold">SVG</text>
</svg>`;

function getSvgDimensions(svgText: string): { w: number; h: number } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return { w: 300, h: 300 };

    const vb = svg.getAttribute('viewBox');
    const w = parseFloat(svg.getAttribute('width') || (vb ? vb.split(/\s+/)[2] : '300') || '300');
    const h = parseFloat(svg.getAttribute('height') || (vb ? vb.split(/\s+/)[3] : '300') || '300');
    return { w: isNaN(w) ? 300 : w, h: isNaN(h) ? 300 : h };
  } catch {
    return { w: 300, h: 300 };
  }
}

export default function SvgToPng() {
  const [svgInput, setSvgInput] = useState(EXAMPLE_SVG);
  const [scale, setScale] = useState(2);
  const [bgColor, setBgColor] = useState('transparent');
  const [status, setStatus] = useState<'idle' | 'converting' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [outputSize, setOutputSize] = useState({ w: 0, h: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convert = useCallback(() => {
    const text = svgInput.trim();
    if (!text) { setError('Paste or upload an SVG first.'); setStatus('error'); return; }

    setStatus('converting');
    setError('');

    try {
      const dims = getSvgDimensions(text);
      const w = Math.round(dims.w * scale);
      const h = Math.round(dims.h * scale);
      setOutputSize({ w, h });

      const canvas = canvasRef.current!;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      // Background
      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.clearRect(0, 0, w, h);
      }

      const blob = new Blob([text], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const pngUrl = canvas.toDataURL('image/png');
        setPreviewUrl(pngUrl);
        setStatus('done');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        setError('Failed to render SVG. Check for syntax errors.');
        setStatus('error');
      };

      img.src = url;
    } catch (e: any) {
      setError(e.message);
      setStatus('error');
    }
  }, [svgInput, scale, bgColor]);

  const download = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `image-${scale}x.png`;
    a.click();
  };

  const handleFile = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setSvgInput(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file && file.type.includes('svg')) {
      const reader = new FileReader();
      reader.onload = ev => setSvgInput(ev.target?.result as string ?? '');
      reader.readAsText(file);
    }
  };

  const dims = getSvgDimensions(svgInput);

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="flex flex-wrap gap-4 items-center">
        <div class="flex gap-2 items-center">
          <span class="text-sm text-text-muted">Output scale:</span>
          {[1, 2, 4].map(s => (
            <button key={s} onClick={() => setScale(s)} class={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${scale === s ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
              {s}x
            </button>
          ))}
        </div>
        <div class="flex gap-2 items-center">
          <span class="text-sm text-text-muted">Background:</span>
          {['transparent', '#ffffff', '#000000'].map(c => (
            <button key={c} onClick={() => setBgColor(c)} class={`px-3 py-1.5 text-xs rounded-lg transition-colors ${bgColor === c ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
              {c === 'transparent' ? 'None' : c === '#ffffff' ? 'White' : 'Black'}
            </button>
          ))}
        </div>
        <button onClick={() => fileInputRef.current?.click()} class="text-xs text-accent hover:underline">
          Upload SVG file
        </button>
        <input ref={fileInputRef} type="file" accept=".svg,image/svg+xml" class="hidden" onChange={handleFile} />
        <button onClick={() => { setSvgInput(EXAMPLE_SVG); setStatus('idle'); setPreviewUrl(''); }} class="text-xs text-text-muted hover:text-text">
          Load example
        </button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SVG Input */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text">SVG Input</label>
            {svgInput.trim() && (
              <span class="text-xs text-text-muted">{dims.w}×{dims.h}px source</span>
            )}
          </div>
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            class="relative"
          >
            <textarea
              value={svgInput}
              onInput={e => { setSvgInput((e.target as HTMLTextAreaElement).value); setStatus('idle'); setPreviewUrl(''); }}
              placeholder="Paste SVG code here, or drag and drop an .svg file..."
              rows={16}
              class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
              spellcheck={false}
            />
          </div>
        </div>

        {/* Preview / Output */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text">PNG Preview</label>
            {status === 'done' && (
              <span class="text-xs text-green-500">{outputSize.w}×{outputSize.h}px output</span>
            )}
          </div>
          <div class="bg-bg-card border border-border rounded-lg h-64 flex items-center justify-center overflow-hidden"
            style="background-image: repeating-linear-gradient(45deg, #3333 25%, transparent 25%, transparent 75%, #3333 75%, #3333), repeating-linear-gradient(45deg, #3333 25%, transparent 25%, transparent 75%, #3333 75%, #3333); background-position: 0 0, 8px 8px; background-size: 16px 16px;">
            {status === 'idle' && <p class="text-text-muted text-sm">Click "Convert to PNG" to preview</p>}
            {status === 'converting' && <p class="text-text-muted text-sm">Converting...</p>}
            {status === 'error' && <p class="text-red-400 text-sm px-4 text-center">⚠ {error}</p>}
            {status === 'done' && previewUrl && (
              <img src={previewUrl} alt="PNG preview" class="max-w-full max-h-full object-contain" />
            )}
          </div>
        </div>
      </div>

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} class="hidden" />

      <div class="flex gap-3 flex-wrap">
        <button
          onClick={convert}
          disabled={!svgInput.trim() || status === 'converting'}
          class="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'converting' ? 'Converting...' : '⚡ Convert to PNG'}
        </button>
        {status === 'done' && (
          <button
            onClick={download}
            class="flex items-center gap-2 px-4 py-2 bg-bg-card border border-border text-text rounded-lg text-sm hover:border-primary transition-colors"
          >
            ⬇ Download PNG
          </button>
        )}
      </div>

      <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted space-y-1">
        <p class="font-medium text-text">How it works:</p>
        <ul class="list-disc list-inside space-y-0.5 ml-2">
          <li>Renders SVG using the browser's native SVG engine via Canvas API</li>
          <li>1x = original SVG size, 2x = double (recommended for Retina), 4x = high-res</li>
          <li>Drag and drop an <code class="font-mono text-xs">.svg</code> file directly onto the input</li>
          <li>Runs entirely in your browser — no upload to any server</li>
        </ul>
      </div>
    </div>
  );
}
