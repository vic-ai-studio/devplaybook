import { useState, useRef } from 'preact/hooks';

type Tab = 'text' | 'image' | 'file';
type Mode = 'encode' | 'decode';

function encodeText(text: string, urlSafe = false): string {
  try {
    const b64 = btoa(unescape(encodeURIComponent(text)));
    return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') : b64;
  } catch { return 'Error: invalid input'; }
}

function decodeText(b64: string): string {
  try {
    const normalized = b64.trim().replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch { return 'Error: invalid Base64 string'; }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function Base64EncoderPro() {
  const [tab, setTab] = useState<Tab>('text');
  const [mode, setMode] = useState<Mode>('encode');
  const [textInput, setTextInput] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  // Image tab state
  const [imagePreview, setImagePreview] = useState('');
  const [imageDataUri, setImageDataUri] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageMime, setImageMime] = useState('');
  const [imageSize, setImageSize] = useState(0);
  const [imageCopied, setImageCopied] = useState(false);
  const [imageUriCopied, setImageUriCopied] = useState(false);

  // File tab state
  const [fileDataUri, setFileDataUri] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileMime, setFileMime] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileCopied, setFileCopied] = useState(false);
  const [fileDownloaded, setFileDownloaded] = useState(false);
  const [fileDecodeInput, setFileDecodeInput] = useState('');
  const [fileDecodeError, setFileDecodeError] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 1500);
    });
  };

  // Text tab
  const textOutput = (() => {
    if (!textInput.trim()) return '';
    return mode === 'encode' ? encodeText(textInput, urlSafe) : decodeText(textInput);
  })();

  const swapText = () => {
    const newMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    setTextInput(textOutput);
  };

  // Image tab
  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setImageName(file.name);
    setImageMime(file.type);
    setImageSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      setImageDataUri(dataUri);
      setImagePreview(dataUri);
    };
    reader.readAsDataURL(file);
  };

  const handleImageDrop = (e: DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageUpload(file);
  };

  const imageBase64Only = imageDataUri ? imageDataUri.split(',')[1] ?? '' : '';

  // File tab
  const handleFileUpload = (file: File) => {
    setFileName(file.name);
    setFileMime(file.type || 'application/octet-stream');
    setFileSize(file.size);
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileDataUri(e.target?.result as string);
      setFileDecodeError('');
    };
    reader.readAsDataURL(file);
  };

  const fileBase64Only = fileDataUri ? fileDataUri.split(',')[1] ?? '' : '';

  const downloadDecodedFile = () => {
    if (!fileDecodeInput.trim()) return;
    try {
      const normalized = fileDecodeInput.trim().replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'decoded-file';
      a.click();
      URL.revokeObjectURL(url);
      setFileDecodeError('');
      setFileDownloaded(true);
      setTimeout(() => setFileDownloaded(false), 2000);
    } catch {
      setFileDecodeError('Invalid Base64 string — cannot decode.');
    }
  };

  return (
    <div class="space-y-4">
      {/* Tab selector */}
      <div class="flex gap-2 flex-wrap">
        {([['text', 'Text'], ['image', 'Image'], ['file', 'File']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${tab === t ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── TEXT TAB ── */}
      {tab === 'text' && (
        <div class="space-y-4">
          <div class="flex gap-2 flex-wrap items-center">
            <button onClick={() => setMode('encode')} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === 'encode' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>Encode → Base64</button>
            <button onClick={() => setMode('decode')} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === 'decode' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>Decode ← Base64</button>
            {mode === 'encode' && (
              <label class="flex items-center gap-2 text-sm cursor-pointer select-none ml-auto text-text-muted">
                <input type="checkbox" checked={urlSafe} onChange={(e) => setUrlSafe((e.target as HTMLInputElement).checked)} class="accent-primary" />
                URL-safe (no <code class="font-mono text-xs">+/=</code>)
              </label>
            )}
          </div>

          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">{mode === 'encode' ? 'Plain text' : 'Base64 string'}</label>
            <textarea
              class="w-full h-36 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
              placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Paste Base64 to decode...'}
              value={textInput}
              onInput={(e) => setTextInput((e.target as HTMLTextAreaElement).value)}
            />
          </div>

          <div class="flex gap-2">
            <button onClick={swapText} class="px-4 py-2 rounded-lg bg-bg-card border border-border text-text-muted text-sm hover:border-primary hover:text-primary transition-colors">⇅ Use as input</button>
            <button onClick={() => setTextInput('')} class="px-4 py-2 rounded-lg bg-bg-card border border-border text-text-muted text-sm hover:border-primary hover:text-primary transition-colors">Clear</button>
          </div>

          {textOutput && (
            <div>
              <div class="flex justify-between items-center mb-2">
                <label class="text-sm font-medium text-text-muted">{mode === 'encode' ? `Base64${urlSafe ? ' (URL-safe)' : ''}` : 'Decoded text'}</label>
                <button onClick={() => copy(textOutput, setTextCopied)} class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                  {textCopied ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <textarea readOnly class="w-full h-36 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none" value={textOutput} />
              {!textOutput.startsWith('Error:') && (
                <p class="text-xs text-text-muted mt-1">Input: {textInput.length} chars → Output: {textOutput.length} chars</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── IMAGE TAB ── */}
      {tab === 'image' && (
        <div class="space-y-4">
          <div
            class="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
            onClick={() => imageInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleImageDrop}
          >
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              class="hidden"
              onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleImageUpload(f); }}
            />
            {imagePreview ? (
              <img src={imagePreview} alt="preview" class="max-h-40 mx-auto rounded mb-2 object-contain" />
            ) : (
              <div class="text-text-muted">
                <p class="text-2xl mb-2">🖼</p>
                <p class="text-sm">Click to upload or drag an image here</p>
                <p class="text-xs mt-1">PNG, JPG, GIF, WebP, SVG supported</p>
              </div>
            )}
          </div>

          {imageDataUri && (
            <>
              <div class="text-xs text-text-muted flex flex-wrap gap-4">
                <span>File: <strong class="text-text">{imageName}</strong></span>
                <span>Type: <strong class="text-text">{imageMime}</strong></span>
                <span>Size: <strong class="text-text">{formatBytes(imageSize)}</strong></span>
                <span>Base64 length: <strong class="text-text">{imageBase64Only.length} chars</strong></span>
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-medium text-text-muted">Base64 (raw, no prefix)</label>
                  <button onClick={() => copy(imageBase64Only, setImageCopied)} class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                    {imageCopied ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <textarea readOnly class="w-full h-28 bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text resize-none focus:outline-none break-all" value={imageBase64Only} />
              </div>

              <div>
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-medium text-text-muted">Data URI (ready for HTML/CSS <code class="font-mono text-xs">src</code>)</label>
                  <button onClick={() => copy(imageDataUri, setImageUriCopied)} class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                    {imageUriCopied ? '✓ Copied!' : 'Copy URI'}
                  </button>
                </div>
                <textarea readOnly class="w-full h-20 bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text resize-none focus:outline-none break-all" value={imageDataUri} />
                <p class="text-xs text-text-muted mt-1">Use as: <code class="font-mono">&lt;img src="{`${imageMime.split('/')[0] === 'image' ? 'data:...' : ''}`}" /&gt;</code> or <code class="font-mono">background-image: url(data:...)</code></p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── FILE TAB ── */}
      {tab === 'file' && (
        <div class="space-y-4">
          <div class="flex gap-2">
            <button onClick={() => setMode('encode')} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === 'encode' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>File → Base64</button>
            <button onClick={() => setMode('decode')} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === 'decode' ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>Base64 → File</button>
          </div>

          {mode === 'encode' && (
            <>
              <div
                class="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (f) handleFileUpload(f); }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  class="hidden"
                  onChange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) handleFileUpload(f); }}
                />
                <p class="text-2xl mb-2">📁</p>
                <p class="text-sm text-text-muted">Click to upload any file or drag it here</p>
                <p class="text-xs text-text-muted mt-1">Binary, PDF, ZIP, JSON, CSV, any format</p>
              </div>

              {fileDataUri && (
                <>
                  <div class="text-xs text-text-muted flex flex-wrap gap-4">
                    <span>File: <strong class="text-text">{fileName}</strong></span>
                    <span>Type: <strong class="text-text">{fileMime}</strong></span>
                    <span>Size: <strong class="text-text">{formatBytes(fileSize)}</strong></span>
                  </div>
                  <div>
                    <div class="flex justify-between items-center mb-2">
                      <label class="text-sm font-medium text-text-muted">Base64 output (raw)</label>
                      <button onClick={() => copy(fileBase64Only, setFileCopied)} class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                        {fileCopied ? '✓ Copied!' : 'Copy'}
                      </button>
                    </div>
                    <textarea readOnly class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text resize-none focus:outline-none break-all" value={fileBase64Only} />
                    <p class="text-xs text-text-muted mt-1">Base64 size: {fileBase64Only.length} chars ({formatBytes(fileBase64Only.length)} — ~33% larger than original)</p>
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'decode' && (
            <div class="space-y-3">
              <div>
                <label class="block text-sm font-medium text-text-muted mb-2">Paste Base64 string</label>
                <textarea
                  class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
                  placeholder="Paste your Base64-encoded file data here..."
                  value={fileDecodeInput}
                  onInput={(e) => { setFileDecodeInput((e.target as HTMLTextAreaElement).value); setFileDecodeError(''); }}
                />
              </div>
              {fileDecodeError && <p class="text-xs text-red-400">⚠ {fileDecodeError}</p>}
              <button
                onClick={downloadDecodedFile}
                disabled={!fileDecodeInput.trim()}
                class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {fileDownloaded ? '✓ Downloaded!' : '⬇ Decode & Download File'}
              </button>
              <p class="text-xs text-text-muted">The decoded file will be downloaded to your device. The browser will determine the filename.</p>
            </div>
          )}
        </div>
      )}

      <p class="text-xs text-text-muted text-center pt-2">All processing happens in your browser — no data is sent to any server.</p>
    </div>
  );
}
