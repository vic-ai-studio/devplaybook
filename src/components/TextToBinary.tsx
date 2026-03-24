import { useState } from 'preact/hooks';

type Mode = 'text2bin' | 'bin2text' | 'text2hex' | 'hex2text';

function textToBin(text: string, sep: string): string {
  return Array.from(text).map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(sep);
}
function binToText(bin: string): { ok: boolean; result?: string; error?: string } {
  const clean = bin.replace(/\s+/g, '');
  if (!/^[01]+$/.test(clean)) return { ok: false, error: 'Input contains characters other than 0 and 1' };
  if (clean.length % 8 !== 0) return { ok: false, error: `Binary length (${clean.length}) must be a multiple of 8` };
  const chars = [];
  for (let i = 0; i < clean.length; i += 8) chars.push(String.fromCharCode(parseInt(clean.slice(i, i + 8), 2)));
  return { ok: true, result: chars.join('') };
}
function textToHex(text: string, sep: string): string {
  return Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(sep);
}
function hexToText(hex: string): { ok: boolean; result?: string; error?: string } {
  const clean = hex.replace(/\s+/g, '').replace(/0x/gi, '');
  if (!/^[0-9a-fA-F]+$/.test(clean)) return { ok: false, error: 'Input contains invalid hex characters' };
  if (clean.length % 2 !== 0) return { ok: false, error: 'Hex string length must be even' };
  const chars = [];
  for (let i = 0; i < clean.length; i += 2) chars.push(String.fromCharCode(parseInt(clean.slice(i, i + 2), 16)));
  return { ok: true, result: chars.join('') };
}

const MODES: Array<{ value: Mode; label: string }> = [
  { value: 'text2bin', label: 'Text → Binary' },
  { value: 'bin2text', label: 'Binary → Text' },
  { value: 'text2hex', label: 'Text → Hex' },
  { value: 'hex2text', label: 'Hex → Text' },
];

export default function TextToBinary() {
  const [mode, setMode] = useState<Mode>('text2bin');
  const [input, setInput] = useState('');
  const [sep, setSep] = useState(' ');
  const [copied, setCopied] = useState(false);

  const getResult = (): { ok: boolean; result?: string; error?: string } | null => {
    if (!input.trim()) return null;
    if (mode === 'text2bin') return { ok: true, result: textToBin(input, sep) };
    if (mode === 'bin2text') return binToText(input);
    if (mode === 'text2hex') return { ok: true, result: textToHex(input, sep) };
    return hexToText(input);
  };

  const result = getResult();

  const copy = () => {
    if (!result?.result) return;
    navigator.clipboard.writeText(result.result).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const isTextInput = mode === 'text2bin' || mode === 'text2hex';

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        {MODES.map(m => (
          <button key={m.value} onClick={() => { setMode(m.value); setInput(''); }} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${mode === m.value ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {isTextInput && (
        <div class="flex gap-2 items-center">
          <label class="text-sm text-text-muted">Separator:</label>
          {[{ v: ' ', l: 'Space' }, { v: '', l: 'None' }, { v: '-', l: 'Dash' }].map(({ v, l }) => (
            <button key={l} onClick={() => setSep(v)} class={`px-3 py-1 text-xs rounded transition-colors ${sep === v ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>{l}</button>
          ))}
        </div>
      )}

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          {mode === 'text2bin' || mode === 'text2hex' ? 'Text Input' : mode === 'bin2text' ? 'Binary Input' : 'Hex Input'}
        </label>
        <textarea
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={mode === 'text2bin' ? 'Hello World' : mode === 'bin2text' ? '01001000 01100101 01101100 01101100 01101111' : mode === 'text2hex' ? 'Hello World' : '48 65 6c 6c 6f'}
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {result && (
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">{result.ok ? 'Output' : 'Error'}</label>
            {result.ok && <button onClick={copy} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">{copied ? '✓ Copied!' : 'Copy'}</button>}
          </div>
          {result.ok
            ? <textarea readOnly class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none" value={result.result} />
            : <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{result.error}</div>
          }
          {result.ok && <p class="text-xs text-text-muted mt-1">{input.length} chars → {result.result?.length} chars output</p>}
        </div>
      )}
    </div>
  );
}
