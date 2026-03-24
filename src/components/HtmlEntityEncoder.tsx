import { useState, useEffect } from 'preact/hooks';
import { isProUser } from '../utils/pro';

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  '¢': '&cent;', '£': '&pound;', '¥': '&yen;', '€': '&euro;', '©': '&copy;',
  '®': '&reg;', '™': '&trade;', '°': '&deg;', '±': '&plusmn;', '×': '&times;',
  '÷': '&divide;', '½': '&frac12;', '¼': '&frac14;', '¾': '&frac34;',
  '–': '&ndash;', '—': '&mdash;', '…': '&hellip;', '·': '&middot;',
  '«': '&laquo;', '»': '&raquo;', '¡': '&iexcl;', '¿': '&iquest;',
  'À': '&Agrave;', 'Á': '&Aacute;', 'Â': '&Acirc;', 'Ã': '&Atilde;',
  'Ä': '&Auml;', 'Å': '&Aring;', 'Æ': '&AElig;', 'Ç': '&Ccedil;',
  'È': '&Egrave;', 'É': '&Eacute;', 'Ê': '&Ecirc;', 'Ë': '&Euml;',
  'Ì': '&Igrave;', 'Í': '&Iacute;', 'Î': '&Icirc;', 'Ï': '&Iuml;',
  'Ñ': '&Ntilde;', 'Ò': '&Ograve;', 'Ó': '&Oacute;', 'Ô': '&Ocirc;',
  'Õ': '&Otilde;', 'Ö': '&Ouml;', 'Ø': '&Oslash;', 'Ù': '&Ugrave;',
  'Ú': '&Uacute;', 'Û': '&Ucirc;', 'Ü': '&Uuml;', 'ß': '&szlig;',
};

const DECODE_ENTITIES: Record<string, string> = Object.fromEntries(
  Object.entries(HTML_ENTITIES).map(([k, v]) => [v, k])
);

function encodeHtmlEntities(text: string): string {
  return text.replace(/[&<>"'¢£¥€©®™°±×÷½¼¾–—…·«»¡¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜß]/g, (char) => HTML_ENTITIES[char] || char);
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&[a-zA-Z]+;|&#\d+;|&#x[0-9a-fA-F]+;/g, (entity) => {
      if (DECODE_ENTITIES[entity]) return DECODE_ENTITIES[entity];
      const numMatch = entity.match(/&#(\d+);/);
      if (numMatch) return String.fromCharCode(parseInt(numMatch[1], 10));
      const hexMatch = entity.match(/&#x([0-9a-fA-F]+);/);
      if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
      return entity;
    });
}

export default function HtmlEntityEncoder() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [copied, setCopied] = useState(false);
  const [pro, setPro] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchOutput, setBatchOutput] = useState('');
  const [batchCopied, setBatchCopied] = useState(false);

  useEffect(() => {
    setPro(isProUser());
  }, []);

  const output = input ? (mode === 'encode' ? encodeHtmlEntities(input) : decodeHtmlEntities(input)) : '';

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      <div class="flex gap-2">
        {(['encode', 'decode'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
          >
            {m === 'encode' ? 'Encode → Entities' : 'Decode ← Entities'}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Input</label>
          <textarea
            class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder={mode === 'encode' ? 'Enter text with < > & " characters...' : 'Enter HTML with &amp; &lt; &gt; entities...'}
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          />
          <div class="flex justify-between mt-1">
            <span class="text-xs text-text-muted">{input.length} chars</span>
            <button onClick={() => setInput('')} class="text-xs text-text-muted hover:text-primary transition-colors">Clear</button>
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">Output</label>
            <button
              onClick={copy}
              disabled={!output}
              class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            placeholder="Result appears here..."
            value={output}
          />
        </div>
      </div>

      {/* Batch Mode — Pro only */}
      <div class={`border rounded-xl p-4 space-y-3 ${pro ? 'border-border' : 'border-border/50'}`}>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-semibold text-sm">Batch {mode === 'encode' ? 'Encode' : 'Decode'}</h3>
            {!pro && (
              <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Pro</span>
            )}
          </div>
          {!pro && (
            <a href="/pro" class="text-xs text-primary hover:underline shrink-0 ml-2">Unlock with Pro →</a>
          )}
        </div>
        {pro ? (
          <div class="space-y-3">
            <textarea
              class="w-full h-28 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
              placeholder="Enter multiple strings, one per line..."
              value={batchInput}
              onInput={(e) => {
                const val = (e.target as HTMLTextAreaElement).value;
                setBatchInput(val);
                const result = val.split('\n').map(line => mode === 'encode' ? encodeHtmlEntities(line) : decodeHtmlEntities(line)).join('\n');
                setBatchOutput(result);
              }}
            />
            {batchOutput && (
              <div class="relative">
                <textarea readOnly class="w-full h-28 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none" value={batchOutput} />
                <button
                  onClick={() => navigator.clipboard.writeText(batchOutput).then(() => { setBatchCopied(true); setTimeout(() => setBatchCopied(false), 1500); })}
                  class="absolute top-2 right-2 text-xs bg-bg border border-border px-2 py-1 rounded hover:border-primary hover:text-primary transition-colors"
                >{batchCopied ? '✓ Copied' : 'Copy all'}</button>
              </div>
            )}
          </div>
        ) : (
          <p class="text-xs text-text-muted">{mode === 'encode' ? 'Encode' : 'Decode'} multiple strings at once — one per line. Available with Pro.</p>
        )}
      </div>

      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">Common HTML entities</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
            {[['<', '&lt;'], ['>', '&gt;'], ['&', '&amp;'], ['"', '&quot;'], ["'", '&#39;'], ['©', '&copy;'], ['®', '&reg;'], ['€', '&euro;']].map(([char, entity]) => (
              <span key={char} class="bg-bg rounded px-2 py-1">{char} = {entity}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
