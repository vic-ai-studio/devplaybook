import { useState } from 'preact/hooks';

type Perms = { r: boolean; w: boolean; x: boolean };
type PermSet = { owner: Perms; group: Perms; others: Perms };

function toOctal(p: Perms) { return (p.r ? 4 : 0) + (p.w ? 2 : 0) + (p.x ? 1 : 0); }
function toSym(p: Perms) { return `${p.r ? 'r' : '-'}${p.w ? 'w' : '-'}${p.x ? 'x' : '-'}`; }

function fromOctal(n: number): PermSet {
  const from = (d: number): Perms => ({ r: !!(d & 4), w: !!(d & 2), x: !!(d & 1) });
  return { owner: from(Math.floor(n / 100) % 10), group: from(Math.floor(n / 10) % 10), others: from(n % 10) };
}

export default function ChmodCalculator() {
  const [perms, setPerms] = useState<PermSet>({ owner: { r: true, w: true, x: true }, group: { r: true, w: false, x: true }, others: { r: true, w: false, x: true } });
  const [octalInput, setOctalInput] = useState('755');

  const toggle = (who: keyof PermSet, bit: keyof Perms) => {
    setPerms(p => {
      const next = { ...p, [who]: { ...p[who], [bit]: !p[who][bit] } };
      setOctalInput(`${toOctal(next.owner)}${toOctal(next.group)}${toOctal(next.others)}`);
      return next;
    });
  };

  const onOctalChange = (val: string) => {
    setOctalInput(val);
    const n = parseInt(val, 10);
    if (/^\d{3}$/.test(val) && val.split('').every(d => parseInt(d) <= 7)) {
      setPerms(fromOctal(n));
    }
  };

  const octal = `${toOctal(perms.owner)}${toOctal(perms.group)}${toOctal(perms.others)}`;
  const symbolic = `${toSym(perms.owner)}${toSym(perms.group)}${toSym(perms.others)}`;
  const [copied, setCopied] = useState(false);
  const cmd = `chmod ${octal} filename`;
  const copy = () => navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });

  const ROWS: Array<{ who: keyof PermSet; label: string }> = [
    { who: 'owner', label: 'Owner (u)' },
    { who: 'group', label: 'Group (g)' },
    { who: 'others', label: 'Others (o)' },
  ];

  return (
    <div class="space-y-6">
      {/* Permission grid */}
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-text-muted">
              <th class="text-left pb-3 pr-4">Entity</th>
              <th class="text-center pb-3 px-4">Read (r)</th>
              <th class="text-center pb-3 px-4">Write (w)</th>
              <th class="text-center pb-3 px-4">Execute (x)</th>
              <th class="text-center pb-3 px-4">Octal</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(({ who, label }) => (
              <tr key={who} class="border-t border-border">
                <td class="py-3 pr-4 font-medium text-text">{label}</td>
                {(['r', 'w', 'x'] as const).map(bit => (
                  <td key={bit} class="text-center py-3 px-4">
                    <input
                      type="checkbox"
                      checked={perms[who][bit]}
                      onChange={() => toggle(who, bit)}
                      class="w-5 h-5 accent-primary cursor-pointer"
                    />
                  </td>
                ))}
                <td class="text-center py-3 px-4 font-mono text-lg font-bold text-primary">{toOctal(perms[who])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Result */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-bg-card border border-border rounded-lg p-4">
          <p class="text-xs text-text-muted mb-1">Octal notation</p>
          <div class="flex items-center gap-2">
            <input
              type="text"
              value={octalInput}
              onInput={e => onOctalChange((e.target as HTMLInputElement).value)}
              maxLength={3}
              class="w-16 bg-transparent border-b border-border font-mono text-2xl font-bold text-primary focus:outline-none focus:border-primary"
            />
            <span class="text-text-muted text-sm">octal</span>
          </div>
        </div>
        <div class="bg-bg-card border border-border rounded-lg p-4">
          <p class="text-xs text-text-muted mb-1">Symbolic notation</p>
          <p class="font-mono text-2xl font-bold text-text">{symbolic}</p>
        </div>
        <div class="bg-bg-card border border-border rounded-lg p-4">
          <p class="text-xs text-text-muted mb-1">chmod command</p>
          <div class="flex items-center gap-2">
            <code class="font-mono text-sm text-text flex-1">{cmd}</code>
            <button onClick={copy} class="text-xs bg-bg border border-border px-2 py-1 rounded hover:border-primary hover:text-primary transition-colors shrink-0">
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Common presets */}
      <div>
        <p class="text-sm font-medium text-text-muted mb-2">Common presets</p>
        <div class="flex flex-wrap gap-2">
          {[['755', 'rwxr-xr-x', 'Web files'], ['644', 'rw-r--r--', 'Static files'], ['700', 'rwx------', 'Private scripts'], ['777', 'rwxrwxrwx', 'World writable'], ['600', 'rw-------', 'Private keys'], ['664', 'rw-rw-r--', 'Shared group']].map(([oct, sym, label]) => (
            <button key={oct} onClick={() => { setOctalInput(oct); setPerms(fromOctal(parseInt(oct, 10))); }}
              class="px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary hover:text-primary transition-colors">
              <span class="font-mono font-bold">{oct}</span> <span class="text-text-muted">({label})</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
