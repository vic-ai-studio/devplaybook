import { useState, useRef } from 'preact/hooks';

type Tab = 'encode' | 'decode';

export default function Base64ImageConverter() {
  const [tab, setTab] = useState<Tab>('encode');

  // Encode state
  const [encodedResult, setEncodedResult] = useState('');
  const [encodePreview, setEncodePreview] = useState('');
  const [encodeFilename, setEncodeFilename] = useState('');
  const [encodeSize, setEncodeSize] = useState('');
  const [encodeMime, setEncodeMime] = useState('');
  const [encodeCopied, setEncodeCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Decode state
  const [decodeInput, setDecodeInput] = useState('');
  const [decodePreview, setDecodePreview] = useState('');
  const [decodeError, setDecodeError] = useState('');
  const [decodeMime, setDecodeMime] = useState('');
  const [decodeSize, setDecodeSize] = useState('');
  const [decodeCopied, setDecodeCopied] = useState(false);

  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) encodeFile(file);
  }

  function handleFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) encodeFile(file);
  }

  function encodeFile(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, WebP, SVG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setEncodedResult(base64);
      setEncodePreview(dataUrl);
      setEncodeFilename(file.name);
      setEncodeMime(file.type);
      setEncodeSize(formatBytes(file.size));
    };
    reader.readAsDataURL(file);
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Decode logic
  function handleDecode() {
    setDecodeError('');
    setDecodePreview('');
    setDecodeMime('');
    setDecodeSize('');

    let input = decodeInput.trim();
    if (!input) { setDecodeError('Paste a Base64 string or data URI first.'); return; }

    let mimeType = 'image/png';
    let base64Data = input;

    if (input.startsWith('data:')) {
      const match = input.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) { setDecodeError('Invalid data URI format. Expected: data:image/...;base64,...'); return; }
      mimeType = match[1];
      base64Data = match[2];
    }

    // Validate base64
    try {
      const clean = base64Data.replace(/\s/g, '');
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean)) {
        setDecodeError('Invalid Base64 characters detected. Ensure the input is valid Base64.');
        return;
      }
      const binary = atob(clean);
      const bytes = binary.length;
      const dataUri = `data:${mimeType};base64,${clean}`;
      setDecodePreview(dataUri);
      setDecodeMime(mimeType);
      setDecodeSize(formatBytes(bytes));
    } catch {
      setDecodeError('Failed to decode Base64. The string may be corrupted or incomplete.');
    }
  }

  const dataUri = encodedResult ? `data:${encodeMime};base64,${encodedResult}` : '';

  return (
    <div class="space-y-4">
      {/* Tab switcher */}
      <div class="flex gap-1 p-1 bg-bg-card border border-border rounded-xl w-fit">
        {(['encode', 'decode'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            class={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'encode' ? 'Image → Base64' : 'Base64 → Image'}
          </button>
        ))}
      </div>

      {tab === 'encode' && (
        <div class="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            class="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors"
          >
            <div class="text-4xl mb-3">🖼️</div>
            <div class="font-semibold mb-1">Drop an image here</div>
            <div class="text-sm text-text-muted">or click to select — PNG, JPG, GIF, WebP, SVG, ICO</div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              class="hidden"
            />
          </div>

          {encodePreview && (
            <>
              {/* Preview */}
              <div class="bg-bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                <img src={encodePreview} alt="preview" class="w-20 h-20 object-contain rounded-lg border border-border bg-bg" />
                <div class="text-sm">
                  <div class="font-semibold">{encodeFilename}</div>
                  <div class="text-text-muted">{encodeMime} · {encodeSize}</div>
                  <div class="text-text-muted">Base64 length: {encodedResult.length.toLocaleString()} chars</div>
                </div>
              </div>

              {/* Output options */}
              <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 class="font-semibold text-sm">Output Formats</h3>

                {/* Raw Base64 */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-xs text-text-muted font-medium">Raw Base64</label>
                    <button
                      onClick={() => copyToClipboard(encodedResult, setEncodeCopied)}
                      class="text-xs text-primary hover:underline"
                    >
                      {encodeCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={encodedResult}
                    rows={3}
                    class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none"
                  />
                </div>

                {/* Data URI */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-xs text-text-muted font-medium">Data URI</label>
                    <button
                      onClick={() => copyToClipboard(dataUri, setEncodeCopied)}
                      class="text-xs text-primary hover:underline"
                    >
                      {encodeCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={dataUri}
                    rows={3}
                    class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none"
                  />
                </div>

                {/* CSS background */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-xs text-text-muted font-medium">CSS background-image</label>
                    <button
                      onClick={() => copyToClipboard(`background-image: url("${dataUri}");`, setEncodeCopied)}
                      class="text-xs text-primary hover:underline"
                    >
                      {encodeCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <code class="block text-xs font-mono bg-bg border border-border rounded-lg px-3 py-2 text-text-muted break-all">
                    {`background-image: url("${dataUri.slice(0, 60)}...");`}
                  </code>
                </div>

                {/* HTML img tag */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class="text-xs text-text-muted font-medium">HTML &lt;img&gt; tag</label>
                    <button
                      onClick={() => copyToClipboard(`<img src="${dataUri}" alt="" />`, setEncodeCopied)}
                      class="text-xs text-primary hover:underline"
                    >
                      {encodeCopied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <code class="block text-xs font-mono bg-bg border border-border rounded-lg px-3 py-2 text-text-muted break-all">
                    {`<img src="data:${encodeMime};base64,..." alt="" />`}
                  </code>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'decode' && (
        <div class="space-y-4">
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <label class="text-sm font-semibold block mb-2">Paste Base64 or Data URI</label>
            <p class="text-xs text-text-muted mb-3">
              Accepts raw Base64 or full data URI format: <code class="font-mono bg-bg px-1 rounded">data:image/png;base64,iVBOR...</code>
            </p>
            <textarea
              value={decodeInput}
              onInput={(e) => setDecodeInput((e.target as HTMLTextAreaElement).value)}
              rows={5}
              placeholder="iVBORw0KGgoAAAANSUhEUgAA... or data:image/png;base64,..."
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              onClick={handleDecode}
              class="mt-3 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-primary/80 transition-colors"
            >
              Decode to Image
            </button>
          </div>

          {decodeError && (
            <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {decodeError}
            </div>
          )}

          {decodePreview && (
            <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
              <div class="flex items-start gap-4">
                <img
                  src={decodePreview}
                  alt="decoded"
                  class="max-w-[200px] max-h-[200px] object-contain rounded-lg border border-border bg-bg"
                />
                <div class="text-sm">
                  <div class="font-semibold mb-1">Decoded successfully</div>
                  <div class="text-text-muted">Type: {decodeMime}</div>
                  <div class="text-text-muted">Size: ~{decodeSize}</div>
                  <a
                    href={decodePreview}
                    download="decoded-image"
                    class="inline-block mt-3 bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
                  >
                    ↓ Download Image
                  </a>
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-xs text-text-muted font-medium">Data URI</label>
                  <button
                    onClick={() => copyToClipboard(decodePreview, setDecodeCopied)}
                    class="text-xs text-primary hover:underline"
                  >
                    {decodeCopied ? '✓ Copied' : 'Copy URI'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={decodePreview}
                  rows={2}
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-xs font-mono resize-none focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
