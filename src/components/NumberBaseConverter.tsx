import { useState } from 'preact/hooks';

type Base = 'binary' | 'octal' | 'decimal' | 'hex';

const BASE_CONFIG: Record<Base, { label: string; radix: number; prefix: string; placeholder: string }> = {
  binary:  { label: 'Binary (Base 2)',      radix: 2,  prefix: '0b', placeholder: '1010 1111' },
  octal:   { label: 'Octal (Base 8)',       radix: 8,  prefix: '0o', placeholder: '257' },
  decimal: { label: 'Decimal (Base 10)',    radix: 10, prefix: '',   placeholder: '255' },
  hex:     { label: 'Hexadecimal (Base 16)',radix: 16, prefix: '0x', placeholder: 'FF' },
};

const BASES: Base[] = ['binary', 'octal', 'decimal', 'hex'];

function formatBinary(s: string): string {
  // Group binary in 4s
  return s.replace(/(.{4})/g, '$1 ').trim();
}

export default function NumberBaseConverter() {
  const [values, setValues] = useState<Record<Base, string>>({
    binary: '', octal: '', decimal: '', hex: '',
  });
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<Base | null>(null);

  const handleInput = (base: Base, raw: string) => {
    const clean = raw.replace(/\s/g, '');
    if (clean === '') {
      setValues({ binary: '', octal: '', decimal: '', hex: '' });
      setError('');
      return;
    }

    const { radix } = BASE_CONFIG[base];
    const num = parseInt(clean, radix);
    if (isNaN(num) || num < 0) {
      setError(`Invalid ${BASE_CONFIG[base].label} value`);
      setValues(prev => ({ ...prev, [base]: raw }));
      return;
    }

    setError('');
    setValues({
      binary:  formatBinary(num.toString(2)),
      octal:   num.toString(8),
      decimal: num.toString(10),
      hex:     num.toString(16).toUpperCase(),
    });
  };

  const copy = (base: Base) => {
    navigator.clipboard.writeText(values[base].replace(/\s/g, '')).then(() => {
      setCopied(base);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Quick lookup table for 0-15
  const nibble = Array.from({ length: 16 }, (_, i) => ({
    dec: i,
    hex: i.toString(16).toUpperCase(),
    bin: i.toString(2).padStart(4, '0'),
  }));

  return (
    <div class="space-y-5">
      {/* Converter */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <p class="text-sm text-gray-400">Enter a value in any base — all others update instantly.</p>
        {BASES.map(base => {
          const { label, prefix, placeholder } = BASE_CONFIG[base];
          return (
            <div key={base}>
              <label class="block text-sm font-medium text-gray-300 mb-1">{label}</label>
              <div class="flex gap-2">
                {prefix && (
                  <span class="bg-gray-800 border border-gray-700 text-gray-500 text-sm px-3 py-2 rounded-l-lg font-mono -mr-1">
                    {prefix}
                  </span>
                )}
                <input
                  type="text"
                  value={values[base]}
                  onInput={e => handleInput(base, (e.target as HTMLInputElement).value)}
                  placeholder={placeholder}
                  class={`flex-1 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 ${prefix ? 'rounded-l-none' : ''}`}
                  spellcheck={false}
                />
                <button onClick={() => copy(base)} disabled={!values[base]}
                  class="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition-colors whitespace-nowrap">
                  {copied === base ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
          );
        })}
        {error && <p class="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Nibble reference */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="px-4 py-2 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">Quick Reference: 0–15 (one nibble)</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs font-mono">
            <thead>
              <tr class="bg-gray-800">
                <th class="text-left px-3 py-2 text-gray-400 font-medium">Dec</th>
                <th class="text-left px-3 py-2 text-gray-400 font-medium">Hex</th>
                <th class="text-left px-3 py-2 text-gray-400 font-medium">Binary</th>
                <th class="text-left px-3 py-2 text-gray-400 font-medium">Dec</th>
                <th class="text-left px-3 py-2 text-gray-400 font-medium">Hex</th>
                <th class="text-left px-3 py-2 text-gray-400 font-medium">Binary</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              {Array.from({ length: 8 }, (_, i) => (
                <tr key={i} class="hover:bg-gray-800/40">
                  <td class="px-3 py-1.5 text-indigo-300">{nibble[i].dec}</td>
                  <td class="px-3 py-1.5 text-green-300">{nibble[i].hex}</td>
                  <td class="px-3 py-1.5 text-yellow-300">{nibble[i].bin}</td>
                  <td class="px-3 py-1.5 text-indigo-300">{nibble[i + 8].dec}</td>
                  <td class="px-3 py-1.5 text-green-300">{nibble[i + 8].hex}</td>
                  <td class="px-3 py-1.5 text-yellow-300">{nibble[i + 8].bin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
