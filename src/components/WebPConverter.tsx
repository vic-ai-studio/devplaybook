import { useState, useCallback, useRef } from 'preact/hooks';

interface ConvertedFile {
  originalName: string;
  originalSize: number;
  originalDataUrl: string;
  webpBlob: Blob;
  webpDataUrl: string;
  webpSize: number;
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function reductionPercent(original: number, converted: number): string {
  const delta = ((original - converted) / original) * 100;
  return delta > 0 ? `-${delta.toFixed(1)}%` : `+${Math.abs(delta).toFixed(1)}%`;
}

function reductionColor(original: number, converted: number): string {
  const delta = ((original - converted) / original) * 100;
  if (delta >= 20) return 'text-green-400';
  if (delta >= 0) return 'text-yellow-400';
  return 'text-red-400';
}

function convertFileToWebP(file: File, quality: number): Promise<ConvertedFile> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);

      // Check WebP support
      const testDataUrl = canvas.toDataURL('image/webp');
      if (!testDataUrl.startsWith('data:image/webp')) {
        reject(new Error('Your browser does not support WebP encoding via Canvas.'));
        return;
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Conversion failed — canvas.toBlob returned null.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            const originalReader = new FileReader();
            originalReader.onload = (oe) => {
              resolve({
                originalName: file.name,
                originalSize: file.size,
                originalDataUrl: oe.target?.result as string,
                webpBlob: blob,
                webpDataUrl: e.target?.result as string,
                webpSize: blob.size,
              });
            };
            originalReader.readAsDataURL(file);
          };
          reader.readAsDataURL(blob);
        },
        'image/webp',
        quality / 100
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not load image: ${file.name}`));
    };

    img.src = objectUrl;
  });
}

export default function WebPConverter() {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [quality, setQuality] = useState(80);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    setError(null);
    setProcessing(true);
    const accepted = Array.from(fileList).filter((f) =>
      ['image/png', 'image/jpeg', 'image/gif'].includes(f.type)
    );
    if (accepted.length === 0) {
      setError('No supported files selected. Please upload PNG, JPG, or GIF images.');
      setProcessing(false);
      return;
    }

    const results: ConvertedFile[] = [];
    for (const file of accepted) {
      try {
        const converted = await convertFileToWebP(file, quality);
        results.push(converted);
      } catch (err) {
        setError((err as Error).message);
        setProcessing(false);
        return;
      }
    }
    setFiles((prev) => [...prev, ...results]);
    setProcessing(false);
  };

  const onFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      processFiles(input.files);
      input.value = '';
    }
  };

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [quality]
  );

  const downloadFile = (converted: ConvertedFile) => {
    const baseName = converted.originalName.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(converted.webpBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.webp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    files.forEach(downloadFile);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setFiles([]);
    setError(null);
  };

  return (
    <div class="space-y-5">
      {/* Quality slider */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-gray-300">
            WebP Quality
          </label>
          <span class="text-sm font-bold text-indigo-400">{quality}</span>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={quality}
          onInput={(e) => setQuality(Number((e.target as HTMLInputElement).value))}
          class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div class="flex justify-between text-xs text-gray-500 mt-1">
          <span>10 — smaller file</span>
          <span>100 — best quality</span>
        </div>
        <p class="text-xs text-gray-500 mt-2">
          Quality 75–85 is a good balance for most use cases. Note: quality applies to new conversions only.
        </p>
      </div>

      {/* Drop zone */}
      <div
        class={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer select-none ${
          dragging
            ? 'border-indigo-500 bg-indigo-900/10'
            : 'border-gray-700 hover:border-gray-500'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div class="text-4xl mb-3">🖼️</div>
        <p class="text-gray-300 font-medium">
          {processing ? 'Converting…' : 'Drop images here or click to upload'}
        </p>
        <p class="text-gray-500 text-sm mt-1">PNG, JPG, GIF supported — multiple files OK</p>
        <input
          ref={inputRef}
          id="webp-upload"
          type="file"
          accept="image/png,image/jpeg,image/gif"
          multiple
          onChange={onFileChange}
          class="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-900/30 border border-red-700 rounded-xl p-4 text-sm text-red-300">
          <span class="font-medium">Error: </span>{error}
        </div>
      )}

      {/* Results */}
      {files.length > 0 && (
        <div class="space-y-4">
          {/* Bulk actions */}
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-400">
              {files.length} file{files.length > 1 ? 's' : ''} converted
            </p>
            <div class="flex gap-2">
              {files.length > 1 && (
                <button
                  onClick={downloadAll}
                  class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md transition-colors font-medium"
                >
                  Download All
                </button>
              )}
              <button
                onClick={clearAll}
                class="text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-1.5 rounded-md transition-colors font-medium"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* File cards */}
          {files.map((f, i) => (
            <div
              key={`${f.originalName}-${i}`}
              class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden"
            >
              <div class="p-4 flex flex-wrap gap-4 items-start">
                {/* Preview */}
                <div class="flex gap-3 shrink-0">
                  <div class="text-center">
                    <div class="text-xs text-gray-500 mb-1">Original</div>
                    <img
                      src={f.originalDataUrl}
                      alt="Original preview"
                      class="w-20 h-20 object-contain rounded-lg border border-gray-700 bg-[length:10px_10px] bg-[position:0_0,5px_5px] bg-gray-800"
                      style="background-image: linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%);"
                    />
                  </div>
                  <div class="text-center">
                    <div class="text-xs text-gray-500 mb-1">WebP</div>
                    <img
                      src={f.webpDataUrl}
                      alt="WebP preview"
                      class="w-20 h-20 object-contain rounded-lg border border-indigo-700 bg-gray-800"
                      style="background-image: linear-gradient(45deg, #374151 25%, transparent 25%), linear-gradient(-45deg, #374151 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #374151 75%), linear-gradient(-45deg, transparent 75%, #374151 75%); background-size: 10px 10px; background-position: 0 0, 5px 5px;"
                    />
                  </div>
                </div>

                {/* Info */}
                <div class="flex-1 min-w-0 space-y-1.5 text-sm">
                  <p class="font-semibold text-gray-100 truncate" title={f.originalName}>
                    {f.originalName}
                  </p>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <span class="text-gray-400">Original size</span>
                    <span class="text-gray-200">{formatBytes(f.originalSize)}</span>
                    <span class="text-gray-400">WebP size</span>
                    <span class="text-gray-200">{formatBytes(f.webpSize)}</span>
                    <span class="text-gray-400">Size change</span>
                    <span class={`font-semibold ${reductionColor(f.originalSize, f.webpSize)}`}>
                      {reductionPercent(f.originalSize, f.webpSize)}
                    </span>
                    <span class="text-gray-400">Quality used</span>
                    <span class="text-gray-200">{quality}</span>
                  </div>
                </div>

                {/* Actions */}
                <div class="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => downloadFile(f)}
                    class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md transition-colors font-medium whitespace-nowrap"
                  >
                    Download .webp
                  </button>
                  <button
                    onClick={() => removeFile(i)}
                    class="text-sm bg-gray-700 hover:bg-gray-600 text-gray-400 px-4 py-1.5 rounded-md transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">Why convert to WebP?</p>
        <ul class="list-disc list-inside space-y-1 text-xs">
          <li>WebP is typically 25–35% smaller than JPEG at equivalent quality</li>
          <li>WebP is typically 25–50% smaller than PNG for lossless images</li>
          <li>Supported in all modern browsers (Chrome, Firefox, Safari, Edge)</li>
          <li>Ideal for web images — use in &lt;img&gt; tags or CSS background-image</li>
          <li>GIF animations: static frame only (animated WebP not supported here)</li>
        </ul>
        <p class="text-xs mt-2 text-gray-600">
          All processing happens locally in your browser — no image data is sent to any server.
        </p>
      </div>
    </div>
  );
}
