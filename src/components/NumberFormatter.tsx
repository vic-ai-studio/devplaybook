import { useState } from 'preact/hooks';

function numToWords(n: number): string {
  if (n === 0) return 'zero';
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  function below1000(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? '-' + ones[n%10] : '');
    return ones[Math.floor(n/100)] + ' hundred' + (n%100 ? ' ' + below1000(n%100) : '');
  }
  const neg = n < 0;
  n = Math.abs(Math.floor(n));
  if (n > 999_999_999_999) return 'number too large';
  const parts: string[] = [];
  if (n >= 1_000_000_000) { parts.push(below1000(Math.floor(n/1_000_000_000)) + ' billion'); n %= 1_000_000_000; }
  if (n >= 1_000_000) { parts.push(below1000(Math.floor(n/1_000_000)) + ' million'); n %= 1_000_000; }
  if (n >= 1_000) { parts.push(below1000(Math.floor(n/1_000)) + ' thousand'); n %= 1_000; }
  if (n > 0) parts.push(below1000(n));
  return (neg ? 'negative ' : '') + parts.join(', ');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024**2) return `${(bytes/1024).toFixed(2)} KB`;
  if (bytes < 1024**3) return `${(bytes/1024**2).toFixed(2)} MB`;
  return `${(bytes/1024**3).toFixed(2)} GB`;
}

export default function NumberFormatter() {
  const [input, setInput] = useState('1234567.89');
  const [copied, setCopied] = useState<string | null>(null);

  const n = parseFloat(input.replace(/,/g, ''));
  const isValid = !isNaN(n) && isFinite(n);

  const copy = (text: string, key: string) => navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1500); });

  const rows = isValid ? [
    ['Standard (US)', n.toLocaleString('en-US')],
    ['German/EU', n.toLocaleString('de-DE')],
    ['Scientific', n.toExponential()],
    ['Percentage', n.toLocaleString('en-US', { style: 'percent', minimumFractionDigits: 2 })],
    ['USD', n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })],
    ['EUR', n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })],
    ['GBP', n.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })],
    ['JPY', n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })],
    ['Binary', Number.isInteger(n) && n >= 0 ? '0b' + Math.floor(n).toString(2) : 'N/A (integers only)'],
    ['Octal', Number.isInteger(n) && n >= 0 ? '0o' + Math.floor(n).toString(8) : 'N/A (integers only)'],
    ['Hexadecimal', Number.isInteger(n) && n >= 0 ? '0x' + Math.floor(n).toString(16).toUpperCase() : 'N/A (integers only)'],
    ['Words', numToWords(n)],
    ['File size', Number.isInteger(n) && n >= 0 ? formatFileSize(n) : 'N/A (integers only)'],
    ['Fixed 2 decimals', n.toFixed(2)],
    ['Fixed 4 decimals', n.toFixed(4)],
  ] : [];

  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Enter a Number</label>
        <input
          type="text"
          value={input}
          onInput={e => setInput((e.target as HTMLInputElement).value)}
          placeholder="e.g. 1234567.89"
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 font-mono text-xl text-text focus:outline-none focus:border-primary transition-colors"
        />
        {!isValid && input.trim() && <p class="text-xs text-red-400 mt-1">Invalid number</p>}
      </div>

      {isValid && rows.length > 0 && (
        <div class="overflow-x-auto rounded-lg border border-border">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-bg-card border-b border-border">
                <th class="text-left px-4 py-2 text-text-muted font-medium">Format</th>
                <th class="text-left px-4 py-2 text-text-muted font-medium">Value</th>
                <th class="px-4 py-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, val], i) => (
                <tr key={i} class={i % 2 === 0 ? 'bg-bg' : 'bg-bg-card'}>
                  <td class="px-4 py-2 text-text-muted">{label}</td>
                  <td class="px-4 py-2 font-mono text-text">{val}</td>
                  <td class="px-4 py-2">
                    <button onClick={() => copy(val, label)} class="text-xs text-text-muted hover:text-primary transition-colors">{copied === label ? '✓' : 'Copy'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
