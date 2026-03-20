import { useState, useEffect, useRef } from 'preact/hooks';

// Minimal QR Code generator — uses the browser's built-in canvas to render
// via a simple external library loaded dynamically to keep bundle size small.
// Falls back gracefully with a helpful message if unavailable.

// We use the qrcode library via dynamic script injection
let qrLib: any = null;

async function loadQR(): Promise<any> {
  if (qrLib) return qrLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    // Using jsDelivr CDN for qrcode.js
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';
    script.onload = () => { qrLib = (window as any).QRCode; resolve(qrLib); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const PRESETS = [
  { label: 'URL', value: 'https://devplaybook.cc' },
  { label: 'Email', value: 'mailto:hello@example.com' },
  { label: 'Phone', value: 'tel:+1234567890' },
  { label: 'WiFi', value: 'WIFI:T:WPA;S:MyNetwork;P:password123;;' },
  { label: 'SMS', value: 'sms:+1234567890?body=Hello' },
];

type ErrorLevel = 'L' | 'M' | 'Q' | 'H';

export default function QrCodeGenerator() {
  const [text, setText] = useState('https://devplaybook.cc');
  const [size, setSize] = useState(256);
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#1f2937');
  const [level, setLevel] = useState<ErrorLevel>('M');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [dataUrl, setDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = async () => {
    if (!text.trim()) return;
    setStatus('loading');
    try {
      const QRCode = await loadQR();
      const canvas = canvasRef.current!;
      await QRCode.toCanvas(canvas, text.trim(), {
        width: size,
        errorCorrectionLevel: level,
        color: { dark: fg, light: bg },
        margin: 2,
      });
      setDataUrl(canvas.toDataURL('image/png'));
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => { generate(); }, [text, size, fg, bg, level]);

  const download = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'qrcode.png';
    a.click();
  };

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Content</label>
          <textarea
            value={text}
            onInput={e => setText((e.target as HTMLTextAreaElement).value)}
            rows={3}
            placeholder="URL, text, email, phone number…"
            class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          <div class="flex flex-wrap gap-2 mt-2">
            {PRESETS.map(p => (
              <button key={p.label} onClick={() => setText(p.value)}
                class="text-xs px-3 py-1 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500 rounded-md transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div class="flex flex-wrap gap-4">
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Size (px)</label>
            <div class="flex gap-2">
              {[128, 256, 512].map(s => (
                <button key={s} onClick={() => setSize(s)}
                  class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${size === s ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {s}px
                </button>
              ))}
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1.5">Error Correction</label>
            <div class="flex gap-2">
              {(['L', 'M', 'Q', 'H'] as ErrorLevel[]).map(l => (
                <button key={l} onClick={() => setLevel(l)}
                  class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${level === l ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div class="flex gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">Foreground</label>
              <input type="color" value={fg} onInput={e => setFg((e.target as HTMLInputElement).value)}
                class="w-10 h-9 rounded-md cursor-pointer bg-gray-800 border border-gray-700 p-0.5" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1.5">Background</label>
              <input type="color" value={bg} onInput={e => setBg((e.target as HTMLInputElement).value)}
                class="w-10 h-9 rounded-md cursor-pointer bg-gray-800 border border-gray-700 p-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Canvas preview */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 flex flex-col items-center gap-4">
        <canvas ref={canvasRef} class={`rounded-xl max-w-full ${status === 'loading' ? 'opacity-50' : ''}`} />
        {status === 'error' && (
          <p class="text-red-400 text-sm">Could not load QR library. Check your internet connection.</p>
        )}
        {status === 'done' && (
          <button onClick={download}
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm">
            Download PNG
          </button>
        )}
      </div>

      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">Error Correction Levels</p>
        <ul class="text-xs space-y-1">
          <li><strong class="text-gray-300">L (Low)</strong> — 7% data recovery. Smallest QR.</li>
          <li><strong class="text-gray-300">M (Medium)</strong> — 15% data recovery. Good balance.</li>
          <li><strong class="text-gray-300">Q (Quartile)</strong> — 25% data recovery. Better for printed materials.</li>
          <li><strong class="text-gray-300">H (High)</strong> — 30% data recovery. Best for damaged/logo QR codes.</li>
        </ul>
      </div>
    </div>
  );
}
