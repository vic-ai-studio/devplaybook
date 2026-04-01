import { useState } from 'preact/hooks';

const WASM_MAGIC = '0061736d';
const WASM_VERSION = '01000000';

const SECTION_IDS: Record<number, { name: string; desc: string }> = {
  0: { name: 'Custom', desc: 'Custom / debug info' },
  1: { name: 'Type', desc: 'Function type signatures' },
  2: { name: 'Import', desc: 'Imported functions, tables, memories, globals' },
  3: { name: 'Function', desc: 'Function index → type index mapping' },
  4: { name: 'Table', desc: 'Table definitions (funcref, externref)' },
  5: { name: 'Memory', desc: 'Linear memory definitions' },
  6: { name: 'Global', desc: 'Global variable definitions' },
  7: { name: 'Export', desc: 'Exported functions, tables, memories, globals' },
  8: { name: 'Start', desc: 'Start function index' },
  9: { name: 'Element', desc: 'Table element segments' },
  10: { name: 'Code', desc: 'Function bodies' },
  11: { name: 'Data', desc: 'Memory data segments' },
  12: { name: 'DataCount', desc: 'Count of data segments (MVP extension)' },
};

const EXAMPLE_HEX =
  '00 61 73 6d 01 00 00 00 01 07 01 60 02 7f 7f 01 7f 03 02 01 00 07 07 01 03 61 64 64 00 00 0a 09 01 07 00 20 00 20 01 6a 0b';

interface Section {
  id: number;
  name: string;
  desc: string;
  offset: number;
  size: number;
  payloadHex: string;
}

interface ParseResult {
  valid: boolean;
  magic: string;
  version: string;
  sections: Section[];
  imports: string[];
  exports: string[];
  error?: string;
}

function parseHexToBytes(hex: string): Uint8Array | null {
  const clean = hex.replace(/\s+/g, '');
  if (clean.length % 2 !== 0) return null;
  try {
    const arr = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      arr[i / 2] = parseInt(clean.substring(i, i + 2), 16);
    }
    return arr;
  } catch {
    return null;
  }
}

function readLEB128(bytes: Uint8Array, offset: number): { value: number; bytesRead: number } {
  let result = 0;
  let shift = 0;
  let bytesRead = 0;
  while (offset + bytesRead < bytes.length) {
    const byte = bytes[offset + bytesRead];
    bytesRead++;
    result |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
    if (shift >= 35) break;
  }
  return { value: result, bytesRead };
}

function bytesToHex(bytes: Uint8Array, limit = 16): string {
  const slice = bytes.slice(0, limit);
  return Array.from(slice).map(b => b.toString(16).padStart(2, '0')).join(' ') + (bytes.length > limit ? ' ...' : '');
}

function parseWasm(bytes: Uint8Array): ParseResult {
  if (bytes.length < 8) return { valid: false, magic: '', version: '', sections: [], imports: [], exports: [], error: 'Too short — minimum 8 bytes required' };

  const magicBytes = Array.from(bytes.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
  if (magicBytes !== WASM_MAGIC) {
    return {
      valid: false,
      magic: magicBytes,
      version: '',
      sections: [],
      imports: [],
      exports: [],
      error: `Invalid magic bytes: 0x${magicBytes} (expected 0x0061736d = \\0asm)`,
    };
  }

  const versionBytes = Array.from(bytes.slice(4, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
  const version = bytes[4] + (bytes[5] << 8) + (bytes[6] << 16) + (bytes[7] << 24);

  const sections: Section[] = [];
  const imports: string[] = [];
  const exports: string[] = [];

  let cursor = 8;
  while (cursor < bytes.length) {
    if (cursor >= bytes.length) break;
    const sectionId = bytes[cursor];
    cursor++;

    const { value: sectionSize, bytesRead } = readLEB128(bytes, cursor);
    cursor += bytesRead;

    const payloadStart = cursor;
    const payloadEnd = Math.min(payloadStart + sectionSize, bytes.length);
    const payload = bytes.slice(payloadStart, payloadEnd);

    const info = SECTION_IDS[sectionId] || { name: `Unknown(${sectionId})`, desc: 'Unknown section' };
    sections.push({
      id: sectionId,
      name: info.name,
      desc: info.desc,
      offset: payloadStart - bytesRead - 1,
      size: sectionSize,
      payloadHex: bytesToHex(payload),
    });

    // Parse imports section (id=2)
    if (sectionId === 2 && payload.length > 0) {
      try {
        let p = 0;
        const { value: count, bytesRead: cr } = readLEB128(payload, p);
        p += cr;
        for (let i = 0; i < count && p < payload.length; i++) {
          const { value: modLen, bytesRead: ml } = readLEB128(payload, p);
          p += ml;
          const modName = new TextDecoder().decode(payload.slice(p, p + modLen));
          p += modLen;
          const { value: nameLen, bytesRead: nl } = readLEB128(payload, p);
          p += nl;
          const name = new TextDecoder().decode(payload.slice(p, p + nameLen));
          p += nameLen;
          const importType = payload[p] || 0;
          p++;
          const typeStr = ['func', 'table', 'mem', 'global'][importType] || 'unknown';
          imports.push(`${modName}.${name} (${typeStr})`);
          if (importType === 0) {
            const { bytesRead: ib } = readLEB128(payload, p);
            p += ib;
          } else {
            p += 1;
          }
        }
      } catch {}
    }

    // Parse exports section (id=7)
    if (sectionId === 7 && payload.length > 0) {
      try {
        let p = 0;
        const { value: count, bytesRead: cr } = readLEB128(payload, p);
        p += cr;
        for (let i = 0; i < count && p < payload.length; i++) {
          const { value: nameLen, bytesRead: nl } = readLEB128(payload, p);
          p += nl;
          const name = new TextDecoder().decode(payload.slice(p, p + nameLen));
          p += nameLen;
          const exportType = payload[p] || 0;
          p++;
          const { bytesRead: ib } = readLEB128(payload, p);
          p += ib;
          const typeStr = ['func', 'table', 'mem', 'global'][exportType] || 'unknown';
          exports.push(`${name} (${typeStr})`);
        }
      } catch {}
    }

    cursor = payloadEnd;
  }

  return { valid: true, magic: magicBytes, version: version.toString(), sections, imports, exports };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-bg border border-border text-text-muted hover:border-primary hover:text-primary'}`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function WasmBinaryInspector() {
  const [input, setInput] = useState(EXAMPLE_HEX);
  const [inputMode, setInputMode] = useState<'hex' | 'base64'>('hex');
  const [result, setResult] = useState<ParseResult | null>(null);

  const inspect = () => {
    let bytes: Uint8Array | null = null;
    if (inputMode === 'hex') {
      bytes = parseHexToBytes(input);
      if (!bytes) {
        setResult({ valid: false, magic: '', version: '', sections: [], imports: [], exports: [], error: 'Invalid hex input — ensure pairs of hex digits (e.g. "00 61 73 6d ...")' });
        return;
      }
    } else {
      try {
        const bin = atob(input.trim());
        bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      } catch {
        setResult({ valid: false, magic: '', version: '', sections: [], imports: [], exports: [], error: 'Invalid Base64 input' });
        return;
      }
    }
    setResult(parseWasm(bytes));
  };

  const loadExample = () => {
    setInput(EXAMPLE_HEX);
    setInputMode('hex');
  };

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold">WASM Binary Input</h2>
          <div class="flex items-center gap-2">
            <div class="flex rounded-lg border border-border overflow-hidden text-xs">
              <button
                onClick={() => setInputMode('hex')}
                class={`px-3 py-1.5 transition-colors ${inputMode === 'hex' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
              >
                Hex Bytes
              </button>
              <button
                onClick={() => setInputMode('base64')}
                class={`px-3 py-1.5 transition-colors ${inputMode === 'base64' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
              >
                Base64
              </button>
            </div>
            <button onClick={loadExample} class="text-xs px-3 py-1.5 border border-border rounded-lg text-text-muted hover:border-primary hover:text-primary transition-colors">
              Load Example
            </button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={(e: any) => setInput(e.target.value)}
          rows={5}
          placeholder={inputMode === 'hex' ? '00 61 73 6d 01 00 00 00 ...' : 'AGFzbQEAAAA...'}
          class="w-full bg-bg border border-border rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-primary resize-none"
          spellcheck={false}
        />
        <p class="text-xs text-text-muted mt-2">
          {inputMode === 'hex'
            ? 'Space-separated or compact hex: "00 61 73 6d" or "0061736d"'
            : 'Paste Base64-encoded .wasm file content'}
        </p>
        <button
          onClick={inspect}
          class="mt-3 w-full py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/80 transition-colors font-medium"
        >
          Inspect Binary
        </button>
      </div>

      {/* Result */}
      {result && (
        <div class="space-y-4">
          {/* Magic + validity */}
          <div class={`border rounded-xl p-5 ${result.valid ? 'bg-green-950/20 border-green-800/40' : 'bg-red-950/20 border-red-800/40'}`}>
            <div class="flex items-center gap-3 mb-3">
              <span class={`text-lg ${result.valid ? 'text-green-400' : 'text-red-400'}`}>{result.valid ? '✓' : '✕'}</span>
              <span class={`font-semibold ${result.valid ? 'text-green-300' : 'text-red-300'}`}>
                {result.valid ? 'Valid WASM Binary' : 'Invalid WASM Binary'}
              </span>
            </div>
            {result.error && <p class="text-xs text-red-300 font-mono">{result.error}</p>}
            {result.valid && (
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span class="text-text-muted">Magic bytes:</span>
                  <span class="font-mono text-green-300 ml-2">0x{result.magic}</span>
                  <span class="text-text-muted ml-1">(= \0asm)</span>
                </div>
                <div>
                  <span class="text-text-muted">Version:</span>
                  <span class="font-mono text-green-300 ml-2">{result.version}</span>
                  <span class="text-text-muted ml-1">(MVP = 1)</span>
                </div>
              </div>
            )}
          </div>

          {/* Sections table */}
          {result.sections.length > 0 && (
            <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
              <div class="px-5 py-3 border-b border-border flex items-center justify-between">
                <h2 class="text-sm font-semibold">Section Breakdown</h2>
                <span class="text-xs text-text-muted">{result.sections.length} section{result.sections.length !== 1 ? 's' : ''}</span>
              </div>
              <div class="overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="text-text-muted border-b border-border bg-bg">
                      <th class="text-left px-4 py-2 font-medium">ID</th>
                      <th class="text-left px-4 py-2 font-medium">Section</th>
                      <th class="text-left px-4 py-2 font-medium">Description</th>
                      <th class="text-right px-4 py-2 font-medium">Offset</th>
                      <th class="text-right px-4 py-2 font-medium">Size</th>
                      <th class="text-left px-4 py-2 font-medium">Payload preview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sections.map((s, i) => (
                      <tr key={i} class={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-bg/40'}`}>
                        <td class="px-4 py-2 font-mono text-primary">{s.id}</td>
                        <td class="px-4 py-2 font-semibold text-text">{s.name}</td>
                        <td class="px-4 py-2 text-text-muted">{s.desc}</td>
                        <td class="px-4 py-2 font-mono text-right text-text-muted">0x{s.offset.toString(16).padStart(4, '0')}</td>
                        <td class="px-4 py-2 font-mono text-right text-text">{s.size} B</td>
                        <td class="px-4 py-2 font-mono text-text-muted text-xs max-w-xs truncate">{s.payloadHex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Imports / Exports */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-bg-card border border-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold">Imports</h3>
                <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{result.imports.length}</span>
              </div>
              {result.imports.length === 0 ? (
                <p class="text-xs text-text-muted">No imports found</p>
              ) : (
                <ul class="space-y-1">
                  {result.imports.map((imp, i) => (
                    <li key={i} class="text-xs font-mono text-text flex items-center gap-2">
                      <span class="text-blue-400">↓</span> {imp}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div class="bg-bg-card border border-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold">Exports</h3>
                <span class="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{result.exports.length}</span>
              </div>
              {result.exports.length === 0 ? (
                <p class="text-xs text-text-muted">No exports found</p>
              ) : (
                <ul class="space-y-1">
                  {result.exports.map((exp, i) => (
                    <li key={i} class="text-xs font-mono text-text flex items-center gap-2">
                      <span class="text-green-400">↑</span> {exp}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Reference */}
          <div class="bg-blue-950/20 border border-blue-800/30 rounded-xl p-4 text-xs text-blue-300/80 space-y-1">
            <div class="font-medium text-blue-300">WASM Binary Format Reference</div>
            <ul class="space-y-0.5 mt-1">
              <li><code class="font-mono bg-blue-950/40 px-1 rounded">00 61 73 6d</code> — Magic bytes (\0asm)</li>
              <li><code class="font-mono bg-blue-950/40 px-1 rounded">01 00 00 00</code> — Version (little-endian, MVP = 1)</li>
              <li>Sections follow: [section_id (1B)] [size (LEB128)] [payload]</li>
              <li>All integers use unsigned LEB128 encoding (variable length)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
