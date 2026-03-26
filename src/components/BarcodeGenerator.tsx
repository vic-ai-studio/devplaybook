import { useState, useEffect, useRef } from 'preact/hooks';

type BarcodeFormat = 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';

const FORMAT_INFO: Record<BarcodeFormat, { label: string; example: string; hint: string }> = {
  CODE128: { label: 'Code 128', example: 'DevPlaybook-2024', hint: 'Any ASCII text, variable length' },
  EAN13: { label: 'EAN-13', example: '5901234123457', hint: '13 digits (last digit is checksum)' },
  UPC: { label: 'UPC-A', example: '012345678905', hint: '12 digits (last digit is checksum)' },
  CODE39: { label: 'Code 39', example: 'HELLO WORLD', hint: 'A-Z, 0-9, space and - . $ / + %' },
};

function loadJsBarcode(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).JsBarcode) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JsBarcode'));
    document.head.appendChild(script);
  });
}

export default function BarcodeGenerator() {
  const [format, setFormat] = useState<BarcodeFormat>('CODE128');
  const [value, setValue] = useState('');
  const [color, setColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [showText, setShowText] = useState(true);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    loadJsBarcode().then(() => setLoaded(true)).catch(() => setError('Failed to load barcode library'));
  }, []);

  useEffect(() => {
    if (!loaded || !value.trim() || !svgRef.current) return;
    setError('');
    try {
      (window as any).JsBarcode(svgRef.current, value.trim(), {
        format,
        lineColor: color,
        background: bgColor,
        displayValue: showText,
        fontSize: 14,
        margin: 10,
        valid: (valid: boolean) => {
          if (!valid) setError(`"${value}" is not valid for ${FORMAT_INFO[format].label}`);
        },
      });
    } catch (e: any) {
      setError(e.message || 'Invalid barcode value');
    }
  }, [value, format, color, bgColor, showText, loaded]);

  const downloadSVG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barcode-${format.toLowerCase()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPNG = () => {
    if (!svgRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `barcode-${format.toLowerCase()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const info = FORMAT_INFO[format];

  return (
    <div class="space-y-5">
      {/* Format selector */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Barcode Format</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(FORMAT_INFO) as BarcodeFormat[]).map(f => (
            <button
              key={f}
              onClick={() => { setFormat(f); setValue(''); setError(''); }}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${format === f ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {FORMAT_INFO[f].label}
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-1.5">{info.hint}</p>
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Barcode Value</label>
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
            placeholder={`e.g. ${info.example}`}
            value={value}
            onInput={e => { setValue((e.target as HTMLInputElement).value); setError(''); }}
          />
          <button
            onClick={() => { setValue(info.example); setError(''); }}
            class="text-xs bg-bg-card border border-border px-3 py-2 rounded-lg hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
          >
            Use Example
          </button>
        </div>
      </div>

      {/* Options */}
      <div class="flex flex-wrap gap-4 items-center">
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <span>Bar color:</span>
          <input type="color" value={color} onInput={e => setColor((e.target as HTMLInputElement).value)} class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
          <span class="font-mono text-xs">{color}</span>
        </label>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <span>Background:</span>
          <input type="color" value={bgColor} onInput={e => setBgColor((e.target as HTMLInputElement).value)} class="w-8 h-8 rounded cursor-pointer border-0 bg-transparent" />
          <span class="font-mono text-xs">{bgColor}</span>
        </label>
        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
          <input type="checkbox" checked={showText} onChange={e => setShowText((e.target as HTMLInputElement).checked)} class="w-4 h-4" />
          Show text below
        </label>
      </div>

      {/* Preview */}
      <div class="border border-border rounded-xl p-4 bg-bg-card">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-text-muted">Preview</span>
          {value.trim() && !error && (
            <div class="flex gap-2">
              <button onClick={downloadSVG} class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors">↓ SVG</button>
              <button onClick={downloadPNG} class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors">↓ PNG</button>
            </div>
          )}
        </div>

        {error ? (
          <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">{error}</div>
        ) : value.trim() ? (
          <div class="flex justify-center overflow-x-auto py-2" style={{ background: bgColor }}>
            <svg ref={svgRef} />
          </div>
        ) : (
          <div class="text-center text-text-muted text-sm py-8">
            Enter a value above to generate barcode
          </div>
        )}
      </div>

      {/* Reference table */}
      {!value.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm">
          <p class="font-medium text-text mb-3">Format reference</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs text-text-muted">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-1.5 pr-4 font-medium">Format</th>
                  <th class="text-left py-1.5 pr-4 font-medium">Characters</th>
                  <th class="text-left py-1.5 font-medium">Common use</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/50">
                <tr><td class="py-1.5 pr-4 font-mono">Code 128</td><td class="pr-4">Full ASCII</td><td>Shipping, inventory</td></tr>
                <tr><td class="py-1.5 pr-4 font-mono">EAN-13</td><td class="pr-4">13 digits</td><td>Retail products (Europe)</td></tr>
                <tr><td class="py-1.5 pr-4 font-mono">UPC-A</td><td class="pr-4">12 digits</td><td>Retail products (US)</td></tr>
                <tr><td class="py-1.5 pr-4 font-mono">Code 39</td><td class="pr-4">A-Z, 0-9, symbols</td><td>Industrial, automotive</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
