import { useState, useMemo } from 'preact/hooks';

interface UnicodeInfo {
  char: string;
  codePoint: number;
  name: string;
  category: string;
  block: string;
  htmlEntity: string;
  htmlDecimal: string;
  htmlHex: string;
  cssEscape: string;
  jsEscape: string;
  utf8Bytes: string;
  utf16: string;
}

// Common Unicode blocks with sample characters for search
const COMMON_CHARS: Array<{ char: string; name: string; category: string }> = [
  // Latin supplement
  { char: 'À', name: 'LATIN CAPITAL LETTER A WITH GRAVE', category: 'Letter' },
  { char: 'é', name: 'LATIN SMALL LETTER E WITH ACUTE', category: 'Letter' },
  { char: 'ü', name: 'LATIN SMALL LETTER U WITH DIAERESIS', category: 'Letter' },
  // Math
  { char: '∞', name: 'INFINITY', category: 'Symbol' },
  { char: '≠', name: 'NOT EQUAL TO', category: 'Symbol' },
  { char: '≤', name: 'LESS-THAN OR EQUAL TO', category: 'Symbol' },
  { char: '≥', name: 'GREATER-THAN OR EQUAL TO', category: 'Symbol' },
  { char: '±', name: 'PLUS-MINUS SIGN', category: 'Symbol' },
  { char: '×', name: 'MULTIPLICATION SIGN', category: 'Symbol' },
  { char: '÷', name: 'DIVISION SIGN', category: 'Symbol' },
  { char: '√', name: 'SQUARE ROOT', category: 'Symbol' },
  { char: 'π', name: 'GREEK SMALL LETTER PI', category: 'Letter' },
  { char: 'Σ', name: 'GREEK CAPITAL LETTER SIGMA', category: 'Letter' },
  // Arrows
  { char: '→', name: 'RIGHTWARDS ARROW', category: 'Symbol' },
  { char: '←', name: 'LEFTWARDS ARROW', category: 'Symbol' },
  { char: '↑', name: 'UPWARDS ARROW', category: 'Symbol' },
  { char: '↓', name: 'DOWNWARDS ARROW', category: 'Symbol' },
  { char: '⇒', name: 'RIGHTWARDS DOUBLE ARROW', category: 'Symbol' },
  { char: '⟶', name: 'LONG RIGHTWARDS ARROW', category: 'Symbol' },
  // Typography
  { char: '—', name: 'EM DASH', category: 'Punctuation' },
  { char: '–', name: 'EN DASH', category: 'Punctuation' },
  { char: '…', name: 'HORIZONTAL ELLIPSIS', category: 'Punctuation' },
  { char: '\u201C', name: 'LEFT DOUBLE QUOTATION MARK', category: 'Punctuation' },
  { char: '\u201D', name: 'RIGHT DOUBLE QUOTATION MARK', category: 'Punctuation' },
  { char: '\u2018', name: 'LEFT SINGLE QUOTATION MARK', category: 'Punctuation' },
  { char: '\u2019', name: 'RIGHT SINGLE QUOTATION MARK', category: 'Punctuation' },
  { char: '«', name: 'LEFT-POINTING DOUBLE ANGLE QUOTATION MARK', category: 'Punctuation' },
  { char: '»', name: 'RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK', category: 'Punctuation' },
  // Currency
  { char: '€', name: 'EURO SIGN', category: 'Symbol' },
  { char: '£', name: 'POUND SIGN', category: 'Symbol' },
  { char: '¥', name: 'YEN SIGN', category: 'Symbol' },
  { char: '¢', name: 'CENT SIGN', category: 'Symbol' },
  { char: '₿', name: 'BITCOIN SIGN', category: 'Symbol' },
  // Misc symbols
  { char: '©', name: 'COPYRIGHT SIGN', category: 'Symbol' },
  { char: '®', name: 'REGISTERED SIGN', category: 'Symbol' },
  { char: '™', name: 'TRADE MARK SIGN', category: 'Symbol' },
  { char: '°', name: 'DEGREE SIGN', category: 'Symbol' },
  { char: '•', name: 'BULLET', category: 'Punctuation' },
  { char: '★', name: 'BLACK STAR', category: 'Symbol' },
  { char: '☆', name: 'WHITE STAR', category: 'Symbol' },
  { char: '♥', name: 'BLACK HEART SUIT', category: 'Symbol' },
  { char: '♦', name: 'BLACK DIAMOND SUIT', category: 'Symbol' },
  { char: '♣', name: 'BLACK CLUB SUIT', category: 'Symbol' },
  { char: '♠', name: 'BLACK SPADE SUIT', category: 'Symbol' },
  // Box drawing
  { char: '┌', name: 'BOX DRAWINGS LIGHT DOWN AND RIGHT', category: 'Symbol' },
  { char: '─', name: 'BOX DRAWINGS LIGHT HORIZONTAL', category: 'Symbol' },
  { char: '│', name: 'BOX DRAWINGS LIGHT VERTICAL', category: 'Symbol' },
  // Zero-width / special
  { char: '\u200B', name: 'ZERO WIDTH SPACE', category: 'Other' },
  { char: '\uFEFF', name: 'ZERO WIDTH NO-BREAK SPACE (BOM)', category: 'Other' },
  { char: '\u00A0', name: 'NO-BREAK SPACE', category: 'Separator' },
];

function toUtf8Bytes(codePoint: number): string {
  const bytes: number[] = [];
  if (codePoint < 0x80) {
    bytes.push(codePoint);
  } else if (codePoint < 0x800) {
    bytes.push(0xC0 | (codePoint >> 6));
    bytes.push(0x80 | (codePoint & 0x3F));
  } else if (codePoint < 0x10000) {
    bytes.push(0xE0 | (codePoint >> 12));
    bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
    bytes.push(0x80 | (codePoint & 0x3F));
  } else {
    bytes.push(0xF0 | (codePoint >> 18));
    bytes.push(0x80 | ((codePoint >> 12) & 0x3F));
    bytes.push(0x80 | ((codePoint >> 6) & 0x3F));
    bytes.push(0x80 | (codePoint & 0x3F));
  }
  return bytes.map(b => '0x' + b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
}

function toUtf16(codePoint: number): string {
  if (codePoint < 0x10000) {
    return '0x' + codePoint.toString(16).toUpperCase().padStart(4, '0');
  }
  const adjusted = codePoint - 0x10000;
  const high = 0xD800 + (adjusted >> 10);
  const low = 0xDC00 + (adjusted & 0x3FF);
  return `0x${high.toString(16).toUpperCase()} 0x${low.toString(16).toUpperCase()} (surrogate pair)`;
}

function getUnicodeBlock(cp: number): string {
  if (cp < 0x80) return 'Basic Latin';
  if (cp < 0x100) return 'Latin-1 Supplement';
  if (cp < 0x180) return 'Latin Extended-A';
  if (cp < 0x250) return 'Latin Extended-B';
  if (cp < 0x2C0) return 'IPA Extensions';
  if (cp < 0x370) return 'Spacing Modifier Letters';
  if (cp < 0x400) return 'Greek and Coptic';
  if (cp < 0x500) return 'Cyrillic';
  if (cp < 0x600) return 'Armenian / Hebrew';
  if (cp < 0x700) return 'Arabic';
  if (cp < 0x900) return 'Syriac / Thaana';
  if (cp < 0x980) return 'Devanagari';
  if (cp < 0x2000) return 'Various Scripts';
  if (cp < 0x2070) return 'General Punctuation';
  if (cp < 0x20A0) return 'Superscripts and Subscripts';
  if (cp < 0x2100) return 'Currency Symbols';
  if (cp < 0x2150) return 'Letterlike Symbols';
  if (cp < 0x2190) return 'Number Forms';
  if (cp < 0x2200) return 'Arrows';
  if (cp < 0x2300) return 'Mathematical Operators';
  if (cp < 0x2400) return 'Miscellaneous Technical';
  if (cp < 0x2440) return 'Control Pictures';
  if (cp < 0x2460) return 'Optical Character Recognition';
  if (cp < 0x2500) return 'Enclosed Alphanumerics';
  if (cp < 0x2580) return 'Box Drawing';
  if (cp < 0x25A0) return 'Block Elements';
  if (cp < 0x2600) return 'Geometric Shapes';
  if (cp < 0x2700) return 'Miscellaneous Symbols';
  if (cp < 0x27C0) return 'Dingbats';
  if (cp < 0x3000) return 'Mathematical Symbols';
  if (cp < 0x3040) return 'CJK Symbols and Punctuation';
  if (cp < 0x30A0) return 'Hiragana';
  if (cp < 0x3100) return 'Katakana';
  if (cp < 0x4E00) return 'Various CJK';
  if (cp < 0xA000) return 'CJK Unified Ideographs';
  if (cp < 0xD800) return 'Yi / Other';
  if (cp < 0xE000) return 'Surrogate Area';
  if (cp < 0xF900) return 'Private Use Area';
  if (cp < 0x10000) return 'Compatibility Forms';
  if (cp < 0x1F000) return 'Supplementary Planes';
  if (cp < 0x1F200) return 'Mahjong / Domino';
  if (cp < 0x1F600) return 'Enclosed Alphanumeric Supplement';
  if (cp < 0x1F650) return 'Emoji / Faces';
  if (cp < 0x1FA00) return 'Miscellaneous Symbols and Pictographs';
  return 'Supplementary Multilingual Plane';
}

function buildUnicodeInfo(char: string): UnicodeInfo | null {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return null;
  const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');

  // Find name from our list
  const known = COMMON_CHARS.find(c => c.char === char);

  return {
    char,
    codePoint,
    name: known?.name || `U+${hex}`,
    category: known?.category || 'Unknown',
    block: getUnicodeBlock(codePoint),
    htmlEntity: `&#${codePoint};`,
    htmlDecimal: `&#${codePoint};`,
    htmlHex: `&#x${hex};`,
    cssEscape: `\\${hex}`,
    jsEscape: codePoint > 0xFFFF ? `\\u{${hex}}` : `\\u${hex}`,
    utf8Bytes: toUtf8Bytes(codePoint),
    utf16: toUtf16(codePoint),
  };
}

export default function UnicodeLookup() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [copiedField, setCopiedField] = useState('');

  const copy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 1500);
    });
  };

  // Parse input: single char, U+XXXX code point, or hex number
  const parsedChar = useMemo((): string | null => {
    if (!input.trim()) return null;
    const trim = input.trim();

    // U+XXXX or 0xXXXX format
    const hexMatch = trim.match(/^(?:U\+|0x)([0-9a-fA-F]+)$/i);
    if (hexMatch) {
      const cp = parseInt(hexMatch[1], 16);
      if (cp >= 0 && cp <= 0x10FFFF) return String.fromCodePoint(cp);
    }

    // Decimal number
    const decMatch = trim.match(/^(\d+)$/);
    if (decMatch) {
      const cp = parseInt(decMatch[1], 10);
      if (cp >= 0 && cp <= 0x10FFFF) return String.fromCodePoint(cp);
    }

    // HTML entity like &#9829; or &#x2665;
    const htmlDec = trim.match(/^&#(\d+);?$/);
    if (htmlDec) return String.fromCodePoint(parseInt(htmlDec[1], 10));
    const htmlHex = trim.match(/^&#x([0-9a-fA-F]+);?$/i);
    if (htmlHex) return String.fromCodePoint(parseInt(htmlHex[1], 16));

    // Just use first character of input
    return trim[0];
  }, [input]);

  const info = parsedChar ? buildUnicodeInfo(parsedChar) : null;

  // Search common chars
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return COMMON_CHARS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.char === q
    ).slice(0, 20);
  }, [query]);

  const fields = info ? [
    { label: 'Code Point', value: `U+${info.codePoint.toString(16).toUpperCase().padStart(4, '0')}` },
    { label: 'HTML Decimal', value: info.htmlDecimal },
    { label: 'HTML Hex', value: info.htmlHex },
    { label: 'CSS Escape', value: info.cssEscape },
    { label: 'JS Escape', value: info.jsEscape },
    { label: 'UTF-8 Bytes', value: info.utf8Bytes },
    { label: 'UTF-16', value: info.utf16 },
  ] : [];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Character or Code Point</label>
          <input
            type="text"
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
            placeholder="Type a character, U+2665, &#9829; or 9829"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
          />
          <p class="text-xs text-text-muted mt-1">Accepts: character, U+XXXX, 0xXXXX, decimal, HTML entity</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Search by Name</label>
          <input
            type="text"
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary transition-colors"
            placeholder="e.g. arrow, copyright, euro..."
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      {/* Character Detail */}
      {info && (
        <div class="bg-bg-card border border-border rounded-xl p-6">
          <div class="flex items-start gap-6">
            <div class="text-7xl font-mono leading-none select-all" title={info.name}>
              {info.char === '\u200B' || info.char === '\uFEFF' ? '(invisible)' : info.char}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-lg font-semibold text-text">{info.name}</p>
              <div class="flex gap-3 mt-1">
                <span class="text-sm text-text-muted">{info.category}</span>
                <span class="text-sm text-text-muted">·</span>
                <span class="text-sm text-text-muted">{info.block}</span>
              </div>
            </div>
          </div>

          <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {fields.map(({ label, value }) => (
              <div key={label} class="flex items-center justify-between bg-bg rounded-lg px-3 py-2 gap-3">
                <span class="text-xs text-text-muted shrink-0 w-28">{label}</span>
                <span class="font-mono text-sm text-text truncate flex-1">{value}</span>
                <button
                  onClick={() => copy(value, label)}
                  class="text-xs text-text-muted hover:text-primary transition-colors shrink-0"
                >
                  {copiedField === label ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {searchResults.length > 0 && (
        <div>
          <p class="text-sm font-medium text-text-muted mb-3">Search Results</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {searchResults.map((c) => (
              <button
                key={c.char + c.name}
                onClick={() => { setInput(c.char); setQuery(''); }}
                class="flex items-center gap-3 bg-bg-card border border-border rounded-lg px-3 py-2.5 hover:border-primary hover:text-primary transition-colors text-left"
              >
                <span class="text-xl font-mono w-8 text-center">{c.char}</span>
                <div class="min-w-0">
                  <p class="text-xs text-text truncate">{c.name.replace(/^.* /, '')}</p>
                  <p class="text-xs text-text-muted">{c.category}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Common characters palette */}
      {!input && !query && (
        <div>
          <p class="text-sm font-medium text-text-muted mb-3">Common Characters</p>
          <div class="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
            {COMMON_CHARS.filter(c => c.char !== '\u200B' && c.char !== '\uFEFF' && c.char !== '\u00A0').map((c) => (
              <button
                key={c.char + c.name}
                title={c.name}
                onClick={() => setInput(c.char)}
                class="aspect-square flex items-center justify-center text-lg bg-bg-card border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {c.char}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
