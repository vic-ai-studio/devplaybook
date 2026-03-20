import { useState, useCallback } from 'preact/hooks';

export default function ImageToBase64() {
  const [result, setResult] = useState<{ base64: string; dataUrl: string; mimeType: string; size: number; fileName: string } | null>(null);
  const [copied, setCopied] = useState<'base64' | 'dataurl' | 'cssurl' | null>(null);
  const [dragging, setDragging] = useState(false);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setResult({ base64, dataUrl, mimeType: file.type, size: file.size, fileName: file.name });
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) processFile(file);
  };

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer?.files[0];
    if (file) processFile(file);
  }, []);

  const copy = (text: string, type: 'base64' | 'dataurl' | 'cssurl') => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div class="space-y-5">
      {/* Drop zone */}
      <div
        class={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragging ? 'border-indigo-500 bg-indigo-900/10' : 'border-gray-700 hover:border-gray-500'}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => (document.getElementById('img-upload') as HTMLInputElement)?.click()}
      >
        <div class="text-4xl mb-3">🖼️</div>
        <p class="text-gray-300 font-medium">Drop an image here or click to upload</p>
        <p class="text-gray-500 text-sm mt-1">PNG, JPG, GIF, SVG, WebP — all major formats supported</p>
        <input id="img-upload" type="file" accept="image/*" onChange={onFileChange} class="hidden" />
      </div>

      {/* Results */}
      {result && (
        <div class="space-y-4">
          {/* Preview + info */}
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 flex flex-wrap gap-5 items-start">
            <img src={result.dataUrl} alt="Preview"
              class="max-w-[120px] max-h-[120px] rounded-lg border border-gray-700 object-contain bg-checkerboard" />
            <div class="space-y-1 text-sm">
              <p class="font-semibold text-gray-100">{result.fileName}</p>
              <p class="text-gray-400">Type: <span class="text-gray-200">{result.mimeType}</span></p>
              <p class="text-gray-400">Original size: <span class="text-gray-200">{formatBytes(result.size)}</span></p>
              <p class="text-gray-400">Base64 size: <span class="text-gray-200">{formatBytes(result.base64.length)}</span></p>
              <p class="text-gray-400">Overhead: <span class="text-yellow-300">{Math.round((result.base64.length / result.size - 1) * 100)}% larger</span></p>
            </div>
          </div>

          {/* Output options */}
          {[
            {
              label: 'Base64 String (raw)',
              value: result.base64,
              type: 'base64' as const,
              preview: result.base64.slice(0, 60) + '…',
            },
            {
              label: 'Data URL',
              value: result.dataUrl,
              type: 'dataurl' as const,
              preview: result.dataUrl.slice(0, 60) + '…',
            },
            {
              label: 'CSS background-image',
              value: `background-image: url('${result.dataUrl}');`,
              type: 'cssurl' as const,
              preview: `background-image: url('${result.dataUrl.slice(0, 30)}…');`,
            },
          ].map(item => (
            <div key={item.type} class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
              <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
                <span class="text-sm font-medium text-gray-300">{item.label}</span>
                <button onClick={() => copy(item.value, item.type)}
                  class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md transition-colors font-medium">
                  {copied === item.type ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div class="px-4 py-3">
                <code class="text-xs font-mono text-green-300 break-all">{item.preview}</code>
              </div>
            </div>
          ))}
        </div>
      )}

      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">When to use Base64 images</p>
        <ul class="list-disc list-inside space-y-1 text-xs">
          <li>Small icons or inline SVGs in CSS/HTML</li>
          <li>Embedding images in email HTML templates</li>
          <li>JSON APIs where binary is not supported</li>
          <li>Note: Base64 increases file size ~33% — avoid for large images</li>
        </ul>
        <p class="text-xs mt-2 text-gray-600">All processing is done locally in your browser — no image data is uploaded.</p>
      </div>
    </div>
  );
}
