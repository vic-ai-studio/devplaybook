import { useState } from 'preact/hooks';

type Base = 'binary' | 'octal' | 'decimal' | 'hex';

const BASE_CONFIG: Record<Base, { label: string; radix: number; prefix: string; placeholder: string; chars: string }> = {
  binary:  { label: 'Binary',      radix: 2,  prefix: '0b', placeholder: '1010 1100', chars: '01' },
  octal:   { label: 'Octal',       radix: 8,  prefix: '0o', placeholder: '254',       chars: '0-7' },
  decimal: { label: 'Decimal',     radix: 10, prefix: '',   placeholder: '172',        chars: '0-9' },
  hex:     { label: 'Hexadecimal', radix: 16, prefix: '0x', placeholder: 'AC',         chars: '0-9, A-F' },
};

const BASES: Base[] = ['binary', 'octal', 'decimal', 'hex'];

function buildSteps(num: number, fromBase: Base): string[] {
  const steps: string[] = [];

  if (fromBase === 'binary') {
    const bin = num.toString(2);
    steps.push(`Convert binary ${bin} to decimal:`);
    const bits = bin.split('');
    const parts = bits.map((b, i) => {
      const exp = bits.length - 1 - i;
      const val = parseInt(b) * Math.pow(2, exp);
      return `${b}×2^${exp}=${val}`;
    });
    steps.push(parts.join(' + '));
    steps.push(`= ${num} (decimal)`);
    steps.push('');
    steps.push(`Decimal ${num} → Hex: ${num.toString(16).toUpperCase()}`);
    steps.push(`Decimal ${num} → Octal: ${num.toString(8)}`);
  } else if (fromBase === 'hex') {
    const hex = num.toString(16).toUpperCase();
    steps.push(`Convert hex ${hex} to decimal:`);
    const digits = hex.split('');
    const parts = digits.map((d, i) => {
      const exp = digits.length - 1 - i;
      const val = parseInt(d, 16) * Math.pow(16, exp);
      return `${d}(${parseInt(d,16)})×16^${exp}=${val}`;
    });
    steps.push(parts.join(' + '));
    steps.push(`= ${num} (decimal)`);
    steps.push('');
    steps.push(`Decimal ${num} → Binary: ${num.toString(2)}`);
    steps.push(`Decimal ${num} → Octal: ${num.toString(8)}`);
  } else if (fromBase === 'octal') {
    const oct = num.toString(8);
    steps.push(`Convert octal ${oct} to decimal:`);
    const digits = oct.split('');
    const parts = digits.map((d, i) => {
      const exp = digits.length - 1 - i;
      const val = parseInt(d) * Math.pow(8, exp);
      return `${d}×8^${exp}=${val}`;
    });
    steps.push(parts.join(' + '));
    steps.push(`= ${num} (decimal)`);
    steps.push('');
    steps.push(`Decimal ${num} → Binary: ${num.toString(2)}`);
    steps.push(`Decimal ${num} → Hex: ${num.toString(16).toUpperCase()}`);
  } else {
    // from decimal — show division by 2 for binary
    steps.push(`Convert decimal ${num} to binary (repeated division by 2):`);
    let n = num;
    const rows: string[] = [];
    while (n > 0) {
      rows.push(`${n} ÷ 2 = ${Math.floor(n / 2)} remainder ${n % 2}`);
      n = Math.floor(n / 2);
    }
    steps.push(...rows);
    steps.push(`Read remainders bottom-up → ${num.toString(2)}`);
    steps.push('');
    steps.push(`Decimal ${num} → Hex: ${num.toString(16).toUpperCase()}`);
    steps.push(`Decimal ${num} → Octal: ${num.toString(8)}`);
  }

  return steps;
}

export default function BinaryToDecimal() {
  const [activeBase, setActiveBase] = useState<Base>('binary');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<Base | null>(null);

  const clean = input.replace(/\s/g, '').toUpperCase();
  const { radix } = BASE_CONFIG[activeBase];
  const num = clean ? parseInt(clean, radix) : NaN;
  const valid = clean.length > 0 && !isNaN(num) && num >= 0;

  const results: Record<Base, string> = {
    binary:  valid ? num.toString(2) : '',
    octal:   valid ? num.toString(8) : '',
    decimal: valid ? num.toString(10) : '',
    hex:     valid ? num.toString(16).toUpperCase() : '',
  };

  const steps = valid ? buildSteps(num, activeBase) : [];

  const copy = (base: Base) => {
    navigator.clipboard.writeText(results[base]).then(() => {
      setCopied(base);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleBaseSwitch = (base: Base) => {
    setActiveBase(base);
    setInput('');
  };

  const isError = clean.length > 0 && !valid;

  return (
    <div class="space-y-5">
      {/* Base selector */}
      <div>
        <p class="text-sm text-text-muted mb-2">Input base:</p>
        <div class="flex flex-wrap gap-2">
          {BASES.map(base => (
            <button
              key={base}
              onClick={() => handleBaseSwitch(base)}
              class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeBase === base ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {BASE_CONFIG[base].label} (base {BASE_CONFIG[base].radix})
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">
          {BASE_CONFIG[activeBase].label} value <span class="text-xs opacity-60">({BASE_CONFIG[activeBase].chars})</span>
        </label>
        <div class="flex gap-2">
          {BASE_CONFIG[activeBase].prefix && (
            <span class="bg-bg-card border border-border text-text-muted text-sm px-3 py-2 rounded-l-lg font-mono flex items-center">
              {BASE_CONFIG[activeBase].prefix}
            </span>
          )}
          <input
            type="text"
            value={input}
            onInput={e => setInput((e.target as HTMLInputElement).value)}
            placeholder={BASE_CONFIG[activeBase].placeholder}
            class={`flex-1 bg-bg-card border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none transition-colors ${BASE_CONFIG[activeBase].prefix ? 'rounded-l-none' : ''} ${isError ? 'border-red-500 focus:border-red-400' : 'border-border focus:border-primary'}`}
            spellcheck={false}
          />
        </div>
        {isError && (
          <p class="text-xs text-red-400 mt-1">Invalid {BASE_CONFIG[activeBase].label} value — allowed chars: {BASE_CONFIG[activeBase].chars}</p>
        )}
      </div>

      {/* Outputs */}
      {valid && (
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BASES.map(base => (
            <div key={base} class={`bg-bg-card border rounded-lg p-3 ${base === activeBase ? 'border-primary/50' : 'border-border'}`}>
              <div class="flex justify-between items-center mb-1">
                <span class="text-xs text-text-muted">{BASE_CONFIG[base].label} (base {BASE_CONFIG[base].radix})</span>
                <button
                  onClick={() => copy(base)}
                  class="text-xs px-2 py-0.5 rounded bg-border hover:bg-primary hover:text-white transition-colors"
                >
                  {copied === base ? '✓' : 'Copy'}
                </button>
              </div>
              <div class="font-mono text-lg font-semibold break-all">
                <span class="text-text-muted text-sm">{BASE_CONFIG[base].prefix}</span>
                {results[base]}
              </div>
              {base === 'binary' && results[base].length > 4 && (
                <div class="text-xs text-text-muted mt-1 font-mono">
                  {results[base].replace(/(.{4})/g, '$1 ').trim()} <span class="opacity-50">(grouped)</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step-by-step */}
      {valid && steps.length > 0 && (
        <div class="bg-bg-card border border-border rounded-lg overflow-hidden">
          <div class="px-4 py-2 border-b border-border bg-border/30">
            <span class="text-sm font-medium">Step-by-step conversion</span>
          </div>
          <div class="p-4 font-mono text-sm space-y-1">
            {steps.map((line, i) => (
              <div key={i} class={`${line === '' ? 'h-2' : line.startsWith('Convert') || line.startsWith('Read') || line.startsWith('Decimal') ? 'text-text-muted' : line.startsWith('=') ? 'font-bold text-primary' : 'text-text'}`}>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick reference table */}
      <div class="bg-bg-card border border-border rounded-lg overflow-hidden">
        <div class="px-4 py-2 border-b border-border">
          <span class="text-sm font-medium text-text-muted">Quick Reference: 0–15</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr class="bg-border/20">
                <th class="text-left px-3 py-2 text-text-muted font-medium">Dec</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Bin</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Hex</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Oct</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Dec</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Bin</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Hex</th>
                <th class="text-left px-3 py-2 text-text-muted font-medium">Oct</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/50">
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i} class="hover:bg-border/20 transition-colors">
                  <td class="px-3 py-1.5 text-blue-400">{i}</td>
                  <td class="px-3 py-1.5 text-yellow-400">{i.toString(2).padStart(4, '0')}</td>
                  <td class="px-3 py-1.5 text-green-400">{i.toString(16).toUpperCase()}</td>
                  <td class="px-3 py-1.5 text-purple-400">{i.toString(8)}</td>
                  <td class="px-3 py-1.5 text-blue-400">{i + 8}</td>
                  <td class="px-3 py-1.5 text-yellow-400">{(i + 8).toString(2).padStart(4, '0')}</td>
                  <td class="px-3 py-1.5 text-green-400">{(i + 8).toString(16).toUpperCase()}</td>
                  <td class="px-3 py-1.5 text-purple-400">{(i + 8).toString(8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
