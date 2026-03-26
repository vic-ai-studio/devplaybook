import { useState, useCallback } from 'preact/hooks';

type Unit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';
type Mode = 'binary' | 'decimal';

const UNITS: Unit[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

const COMMON_SIZES: { label: string; bytes: number; icon: string }[] = [
  { label: 'SMS text message', bytes: 160, icon: '💬' },
  { label: 'Typical email', bytes: 75 * 1024, icon: '📧' },
  { label: 'MP3 song (4 min)', bytes: 4 * 1024 * 1024, icon: '🎵' },
  { label: 'JPEG photo', bytes: 3 * 1024 * 1024, icon: '📷' },
  { label: 'HD movie (2h)', bytes: 4 * 1024 * 1024 * 1024, icon: '🎬' },
  { label: 'Ubuntu ISO', bytes: 1.2 * 1024 * 1024 * 1024, icon: '💿' },
  { label: 'Blu-ray movie', bytes: 25 * 1024 * 1024 * 1024, icon: '📀' },
  { label: 'HDD (1 TB)', bytes: 1000 * 1000 * 1000 * 1000, icon: '💾' },
];

function getMultiplier(mode: Mode): number {
  return mode === 'binary' ? 1024 : 1000;
}

function toBytes(value: number, unit: Unit, mode: Mode): number {
  const m = getMultiplier(mode);
  const exp = UNITS.indexOf(unit);
  return value * Math.pow(m, exp);
}

function fromBytes(bytes: number, unit: Unit, mode: Mode): number {
  const m = getMultiplier(mode);
  const exp = UNITS.indexOf(unit);
  return bytes / Math.pow(m, exp);
}

function formatValue(v: number): string {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1e15 || (Math.abs(v) < 0.0001 && v !== 0)) {
    return v.toExponential(4);
  }
  // Show up to 8 significant digits
  const str = v.toPrecision(8);
  // Remove trailing zeros after decimal
  return parseFloat(str).toString();
}

export default function DataSizeConverter() {
  const [inputValue, setInputValue] = useState('1');
  const [fromUnit, setFromUnit] = useState<Unit>('GB');
  const [mode, setMode] = useState<Mode>('binary');
  const [copied, setCopied] = useState<string | null>(null);

  const numericInput = parseFloat(inputValue) || 0;
  const bytes = toBytes(numericInput, fromUnit, mode);

  const conversions = UNITS.map(unit => ({
    unit,
    value: fromBytes(bytes, unit, mode),
  }));

  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }, []);

  const loadSample = (sampleBytes: number) => {
    const gb = fromBytes(sampleBytes, 'GB', mode);
    if (gb >= 1) {
      setFromUnit('GB');
      setInputValue(formatValue(gb));
    } else {
      const mb = fromBytes(sampleBytes, 'MB', mode);
      if (mb >= 1) {
        setFromUnit('MB');
        setInputValue(formatValue(mb));
      } else {
        const kb = fromBytes(sampleBytes, 'KB', mode);
        if (kb >= 1) {
          setFromUnit('KB');
          setInputValue(formatValue(kb));
        } else {
          setFromUnit('B');
          setInputValue(String(sampleBytes));
        }
      }
    }
  };

  const unitLabel = (unit: Unit): string => {
    if (unit === 'B') return 'B (Bytes)';
    const suffix = mode === 'binary' ? 'iB' : 'B';
    const prefix = unit[0];
    return `${unit} (${prefix}${suffix === 'iB' ? 'i' : ''}B)`;
  };

  return (
    <div class="space-y-6">
      {/* Mode toggle */}
      <div class="flex items-center gap-2 text-sm">
        <span class="text-text-muted font-medium">Mode:</span>
        <div class="flex rounded-lg overflow-hidden border border-border">
          <button
            onClick={() => setMode('binary')}
            class={`px-4 py-1.5 font-medium transition-colors ${mode === 'binary' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-hover text-text-muted'}`}
          >
            Binary (1024)
          </button>
          <button
            onClick={() => setMode('decimal')}
            class={`px-4 py-1.5 font-medium transition-colors ${mode === 'decimal' ? 'bg-accent text-white' : 'bg-surface hover:bg-surface-hover text-text-muted'}`}
          >
            Decimal (1000)
          </button>
        </div>
        <span class="text-text-muted text-xs">
          {mode === 'binary' ? '1 KB = 1,024 B (IEC standard)' : '1 KB = 1,000 B (SI standard)'}
        </span>
      </div>

      {/* Input */}
      <div class="flex gap-3 items-end">
        <div class="flex-1">
          <label class="block text-sm font-medium text-text-muted mb-1">Value</label>
          <input
            type="number"
            value={inputValue}
            onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
            placeholder="Enter a number..."
            class="w-full px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm focus:outline-none focus:border-accent"
            min="0"
            step="any"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">From Unit</label>
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit((e.target as HTMLSelectElement).value as Unit)}
            class="px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-accent"
          >
            {UNITS.map(u => <option value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      {/* Conversion results */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {conversions.map(({ unit, value }) => {
          const display = formatValue(value);
          const key = unit;
          const isSource = unit === fromUnit;
          return (
            <div
              key={unit}
              class={`flex items-center justify-between px-3 py-2 rounded-lg border ${isSource ? 'border-accent/50 bg-accent/5' : 'border-border bg-surface'}`}
            >
              <div>
                <span class="text-xs font-medium text-text-muted block">{unitLabel(unit)}</span>
                <span class="font-mono text-sm font-semibold">{display}</span>
              </div>
              <button
                onClick={() => copy(`${display} ${unit}`, key)}
                class="ml-2 text-xs px-2 py-1 rounded bg-surface-hover hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
              >
                {copied === key ? '✓' : 'Copy'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bytes raw */}
      {numericInput > 0 && (
        <div class="flex items-center gap-2 p-3 bg-surface border border-border rounded-lg text-sm">
          <span class="text-text-muted">Raw bytes:</span>
          <span class="font-mono font-bold flex-1">{bytes.toLocaleString()} B</span>
          <button
            onClick={() => copy(bytes.toLocaleString(), 'raw')}
            class="text-xs px-2 py-1 rounded bg-surface-hover hover:bg-accent/10 text-text-muted hover:text-accent transition-colors"
          >
            {copied === 'raw' ? '✓' : 'Copy'}
          </button>
        </div>
      )}

      {/* Common size references */}
      <div>
        <p class="text-sm font-medium text-text-muted mb-2">Common size references:</p>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {COMMON_SIZES.map(s => (
            <button
              key={s.label}
              onClick={() => loadSample(s.bytes)}
              class="flex flex-col items-start p-2 rounded-lg border border-border bg-surface hover:border-accent/50 hover:bg-accent/5 transition-colors text-left"
            >
              <span class="text-lg mb-1">{s.icon}</span>
              <span class="text-xs text-text-muted leading-tight">{s.label}</span>
              <span class="text-xs font-mono text-accent mt-0.5">
                {formatValue(fromBytes(s.bytes, 'MB', mode))} MB
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
