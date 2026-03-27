import { useState } from 'preact/hooks';

type LicenseId =
  | 'MIT'
  | 'Apache-2.0'
  | 'GPL-2.0'
  | 'GPL-3.0'
  | 'LGPL-2.1'
  | 'LGPL-3.0'
  | 'BSD-2-Clause'
  | 'BSD-3-Clause'
  | 'MPL-2.0'
  | 'ISC'
  | 'AGPL-3.0'
  | 'CC0-1.0';

type Compatibility = 'compatible' | 'incompatible' | 'conditions';

interface LicenseMeta {
  label: string;
  type: 'permissive' | 'copyleft-weak' | 'copyleft-strong' | 'copyleft-network' | 'public-domain';
  typeLabel: string;
  description: string;
}

const LICENSES: Record<LicenseId, LicenseMeta> = {
  'MIT':         { label: 'MIT',          type: 'permissive',       typeLabel: 'Permissive',         description: 'Simple permissive licence — retain copyright notice.' },
  'Apache-2.0':  { label: 'Apache-2.0',   type: 'permissive',       typeLabel: 'Permissive',         description: 'Permissive with explicit patent grant and NOTICE file requirement.' },
  'GPL-2.0':     { label: 'GPL-2.0',      type: 'copyleft-strong',  typeLabel: 'Strong Copyleft',    description: 'Strong copyleft — all distributed derivative works must be GPL-2.0.' },
  'GPL-3.0':     { label: 'GPL-3.0',      type: 'copyleft-strong',  typeLabel: 'Strong Copyleft',    description: 'Strong copyleft with anti-tivoisation and patent termination clauses.' },
  'LGPL-2.1':    { label: 'LGPL-2.1',     type: 'copyleft-weak',    typeLabel: 'Weak Copyleft',      description: 'Allows linking from proprietary code; modifications to the library itself must be shared.' },
  'LGPL-3.0':    { label: 'LGPL-3.0',     type: 'copyleft-weak',    typeLabel: 'Weak Copyleft',      description: 'LGPL-2.1 + GPL-3.0 additional permissions. Linking allowed from proprietary code.' },
  'BSD-2-Clause':{ label: 'BSD-2-Clause', type: 'permissive',       typeLabel: 'Permissive',         description: 'Minimal permissive licence — attribution in docs and source.' },
  'BSD-3-Clause':{ label: 'BSD-3-Clause', type: 'permissive',       typeLabel: 'Permissive',         description: 'BSD-2-Clause + non-endorsement clause.' },
  'MPL-2.0':     { label: 'MPL-2.0',      type: 'copyleft-weak',    typeLabel: 'File-level Copyleft', description: 'File-level copyleft — modified MPL files must stay MPL; new files can be proprietary.' },
  'ISC':         { label: 'ISC',           type: 'permissive',       typeLabel: 'Permissive',         description: 'Functionally equivalent to MIT/BSD-2-Clause. Common in Node.js ecosystem.' },
  'AGPL-3.0':    { label: 'AGPL-3.0',     type: 'copyleft-network', typeLabel: 'Network Copyleft',   description: 'GPL-3.0 extended to network use — SaaS deployments must release source.' },
  'CC0-1.0':     { label: 'CC0-1.0',      type: 'public-domain',    typeLabel: 'Public Domain',      description: 'Maximum permissive — waives all copyright. No attribution required.' },
};

const ALL_IDS = Object.keys(LICENSES) as LicenseId[];

// Compatibility matrix: COMPAT[a][b] = how a is compatible when combined with b
// 'compatible'   = can freely combine/link/distribute together
// 'conditions'   = can combine under certain conditions
// 'incompatible' = cannot legally combine
const COMPAT: Record<LicenseId, Partial<Record<LicenseId, Compatibility>>> = {
  'MIT': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible', 'GPL-2.0': 'compatible',
    'GPL-3.0': 'compatible', 'LGPL-2.1': 'compatible', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible', 'AGPL-3.0': 'compatible', 'CC0-1.0': 'compatible',
  },
  'Apache-2.0': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible',
    'GPL-2.0': 'incompatible',  // patent clause conflicts with GPL-2.0
    'GPL-3.0': 'compatible',    // FSF confirmed compatible with GPL-3.0
    'LGPL-2.1': 'conditions',   // can combine but resulting work is GPL-2+ or later
    'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible',
    'AGPL-3.0': 'compatible',   // AGPL-3.0 is GPL-3.0 compatible
    'CC0-1.0': 'compatible',
  },
  'GPL-2.0': {
    'MIT': 'compatible', 'Apache-2.0': 'incompatible',
    'GPL-2.0': 'compatible',
    'GPL-3.0': 'incompatible',  // GPL-2.0 is NOT "or later" by default — versions are incompatible
    'LGPL-2.1': 'compatible',   // LGPL-2.1 can be upgraded to GPL-2.0
    'LGPL-3.0': 'incompatible', // LGPL-3.0 requires GPL-3.0
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'conditions',
    'ISC': 'compatible',
    'AGPL-3.0': 'incompatible', // AGPL-3.0 is GPL-3.0 based
    'CC0-1.0': 'compatible',
  },
  'GPL-3.0': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible',
    'GPL-2.0': 'incompatible',
    'GPL-3.0': 'compatible',
    'LGPL-2.1': 'conditions',   // LGPL-2.1 "or later" clause enables GPL-3.0 use
    'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible',
    'AGPL-3.0': 'conditions',   // both GPL-3.0 based; combined work becomes AGPL
    'CC0-1.0': 'compatible',
  },
  'LGPL-2.1': {
    'MIT': 'compatible', 'Apache-2.0': 'conditions',
    'GPL-2.0': 'compatible',
    'GPL-3.0': 'conditions',    // only if library carries "or later" clause
    'LGPL-2.1': 'compatible', 'LGPL-3.0': 'conditions',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'conditions',
    'ISC': 'compatible',
    'AGPL-3.0': 'incompatible',
    'CC0-1.0': 'compatible',
  },
  'LGPL-3.0': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible',
    'GPL-2.0': 'incompatible',
    'GPL-3.0': 'compatible',
    'LGPL-2.1': 'conditions', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible',
    'AGPL-3.0': 'conditions',
    'CC0-1.0': 'compatible',
  },
  'BSD-2-Clause': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible', 'GPL-2.0': 'compatible',
    'GPL-3.0': 'compatible', 'LGPL-2.1': 'compatible', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible', 'AGPL-3.0': 'compatible', 'CC0-1.0': 'compatible',
  },
  'BSD-3-Clause': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible', 'GPL-2.0': 'compatible',
    'GPL-3.0': 'compatible', 'LGPL-2.1': 'compatible', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible', 'AGPL-3.0': 'compatible', 'CC0-1.0': 'compatible',
  },
  'MPL-2.0': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible',
    'GPL-2.0': 'conditions',    // MPL 2.0 s. 3.3 — can be combined under GPL-2.0 if files are separate
    'GPL-3.0': 'compatible',
    'LGPL-2.1': 'conditions', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible',
    'AGPL-3.0': 'compatible',
    'CC0-1.0': 'compatible',
  },
  'ISC': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible', 'GPL-2.0': 'compatible',
    'GPL-3.0': 'compatible', 'LGPL-2.1': 'compatible', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible', 'AGPL-3.0': 'compatible', 'CC0-1.0': 'compatible',
  },
  'AGPL-3.0': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible',
    'GPL-2.0': 'incompatible',
    'GPL-3.0': 'conditions',    // combined work becomes AGPL
    'LGPL-2.1': 'incompatible',
    'LGPL-3.0': 'conditions',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible', 'AGPL-3.0': 'compatible', 'CC0-1.0': 'compatible',
  },
  'CC0-1.0': {
    'MIT': 'compatible', 'Apache-2.0': 'compatible', 'GPL-2.0': 'compatible',
    'GPL-3.0': 'compatible', 'LGPL-2.1': 'compatible', 'LGPL-3.0': 'compatible',
    'BSD-2-Clause': 'compatible', 'BSD-3-Clause': 'compatible', 'MPL-2.0': 'compatible',
    'ISC': 'compatible', 'AGPL-3.0': 'compatible', 'CC0-1.0': 'compatible',
  },
};

function getCompat(a: LicenseId, b: LicenseId): Compatibility {
  if (a === b) return 'compatible';
  return COMPAT[a]?.[b] ?? COMPAT[b]?.[a] ?? 'conditions';
}

const CELL_STYLES: Record<Compatibility, { bg: string; text: string; icon: string }> = {
  compatible:   { bg: 'bg-green-500/10',  text: 'text-green-400',  icon: '✓' },
  incompatible: { bg: 'bg-red-500/10',    text: 'text-red-400',    icon: '✗' },
  conditions:   { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: '⚠' },
};

const TYPE_COLORS: Record<LicenseMeta['type'], string> = {
  'permissive':        'text-green-400',
  'copyleft-weak':     'text-yellow-400',
  'copyleft-strong':   'text-orange-400',
  'copyleft-network':  'text-red-400',
  'public-domain':     'text-blue-400',
};

function overallVerdict(selected: LicenseId[]): { status: Compatibility; message: string } {
  if (selected.length < 2) return { status: 'compatible', message: 'Select at least 2 licences to see a verdict.' };
  let hasIncompat = false;
  let hasConditions = false;
  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const c = getCompat(selected[i], selected[j]);
      if (c === 'incompatible') hasIncompat = true;
      if (c === 'conditions') hasConditions = true;
    }
  }
  if (hasIncompat) return {
    status: 'incompatible',
    message: 'One or more licence pairs are incompatible. Distributing these licences together in a single project may not be legally possible without re-licensing.',
  };
  if (hasConditions) return {
    status: 'conditions',
    message: 'Some licence pairs can be combined under conditions. Review the specific requirements (e.g., file separation, "or later" clauses, patent notices) before distributing.',
  };
  return {
    status: 'compatible',
    message: 'All selected licences are mutually compatible. You can combine and distribute them together.',
  };
}

export default function LicenseCompatibilityChecker() {
  const [selected, setSelected] = useState<LicenseId[]>([]);

  const toggle = (id: LicenseId) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const verdict = overallVerdict(selected);

  return (
    <div class="space-y-5">
      {/* Licence checkboxes */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-3">
          Select licences in your project
          {selected.length > 0 && <span class="ml-2 text-accent font-semibold">{selected.length} selected</span>}
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_IDS.map(id => {
            const meta = LICENSES[id];
            const isSelected = selected.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggle(id)}
                class={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-surface hover:border-accent/50'
                }`}
              >
                <div class="flex items-start gap-2">
                  <span class={`mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center text-xs ${
                    isSelected ? 'bg-accent border-accent text-white' : 'border-border'
                  }`}>
                    {isSelected && '✓'}
                  </span>
                  <div>
                    <span class={`font-mono font-semibold text-sm ${isSelected ? 'text-accent' : 'text-text'}`}>{meta.label}</span>
                    <span class={`ml-2 text-xs font-medium ${TYPE_COLORS[meta.type]}`}>{meta.typeLabel}</span>
                    <p class="text-xs text-text-muted mt-0.5 leading-snug">{meta.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selected.length >= 2 && (
        <>
          {/* Overall verdict */}
          <div class={`rounded-lg border px-4 py-3 ${
            verdict.status === 'compatible'   ? 'bg-green-500/10 border-green-500/30' :
            verdict.status === 'incompatible' ? 'bg-red-500/10 border-red-500/30' :
                                                'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <div class={`font-semibold text-sm mb-1 ${
              verdict.status === 'compatible'   ? 'text-green-400' :
              verdict.status === 'incompatible' ? 'text-red-400' : 'text-yellow-400'
            }`}>
              {verdict.status === 'compatible'   ? '✓ Compatible — these licences can coexist' :
               verdict.status === 'incompatible' ? '✗ Incompatible licence pair detected' :
                                                   '⚠ Compatible under conditions'}
            </div>
            <p class="text-xs text-text-muted">{verdict.message}</p>
          </div>

          {/* Licence classification row */}
          <div class="flex flex-wrap gap-2">
            {selected.map(id => {
              const meta = LICENSES[id];
              return (
                <span key={id} class={`text-xs px-2 py-1 rounded border border-border bg-surface font-mono`}>
                  <span class="text-text">{meta.label}</span>
                  <span class={`ml-1 ${TYPE_COLORS[meta.type]}`}>({meta.typeLabel})</span>
                </span>
              );
            })}
          </div>

          {/* Compatibility matrix */}
          <div>
            <p class="text-sm font-medium text-text-muted mb-2">Compatibility Matrix</p>
            <div class="overflow-x-auto rounded-lg border border-border">
              <table class="text-xs w-full">
                <thead>
                  <tr class="bg-surface border-b border-border">
                    <th class="px-3 py-2 text-text-muted font-medium text-left min-w-[100px]">↓ A \ B →</th>
                    {selected.map(id => (
                      <th key={id} class="px-3 py-2 text-center font-mono text-text font-semibold min-w-[80px]">{id}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.map((rowId, ri) => (
                    <tr key={rowId} class={`border-b border-border last:border-0 ${ri % 2 === 0 ? '' : 'bg-surface/40'}`}>
                      <td class="px-3 py-2 font-mono font-semibold text-text">{rowId}</td>
                      {selected.map(colId => {
                        if (rowId === colId) {
                          return (
                            <td key={colId} class="px-3 py-2 text-center bg-surface/80">
                              <span class="text-text-muted">—</span>
                            </td>
                          );
                        }
                        const c = getCompat(rowId, colId);
                        const style = CELL_STYLES[c];
                        return (
                          <td key={colId} class={`px-3 py-2 text-center ${style.bg}`}>
                            <span class={`font-semibold ${style.text}`} title={c}>{style.icon}</span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs text-text-muted">
              <span><span class="text-green-400 font-semibold">✓</span> Compatible</span>
              <span><span class="text-red-400 font-semibold">✗</span> Incompatible</span>
              <span><span class="text-yellow-400 font-semibold">⚠</span> Conditions apply</span>
            </div>
          </div>

          {/* Pair breakdown */}
          <div>
            <p class="text-sm font-medium text-text-muted mb-2">Pair Details</p>
            <div class="space-y-2">
              {selected.flatMap((a, i) =>
                selected.slice(i + 1).map(b => {
                  const c = getCompat(a, b);
                  const style = CELL_STYLES[c];
                  const notes: Record<string, string> = {
                    'Apache-2.0+GPL-2.0': 'Apache 2.0 includes a patent termination clause that conflicts with GPL-2.0\'s distribution terms. Cannot combine in a single distributed work.',
                    'GPL-2.0+GPL-3.0': 'GPL-2.0 (without "or later") and GPL-3.0 are mutually incompatible versions. Works under these licences cannot be merged.',
                    'GPL-2.0+LGPL-3.0': 'LGPL-3.0 is built on GPL-3.0, making it incompatible with GPL-2.0 only works.',
                    'GPL-2.0+AGPL-3.0': 'AGPL-3.0 is based on GPL-3.0 and is incompatible with GPL-2.0 only works.',
                    'LGPL-2.1+AGPL-3.0': 'LGPL-2.1 (without "or later") cannot be upgraded to AGPL-3.0.',
                    'GPL-3.0+AGPL-3.0': 'Both are GPL-3.0 compatible. Combined works are governed by AGPL-3.0 (stricter). Allowed with conditions.',
                    'Apache-2.0+LGPL-2.1': 'Possible under LGPL-2.1 "or later" clause, resulting in a GPL-2.0+ combined work.',
                    'GPL-2.0+MPL-2.0': 'MPL-2.0 section 3.3 allows combination with GPL-2.0 if files remain separate.',
                    'GPL-3.0+LGPL-2.1': 'Only if the LGPL-2.1 code carries an "or later" clause — not all LGPL-2.1 code does.',
                  };
                  const key1 = `${a}+${b}`;
                  const key2 = `${b}+${a}`;
                  const note = notes[key1] || notes[key2];
                  return (
                    <div key={`${a}+${b}`} class={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${style.bg} border-current/20`}>
                      <span class={`text-base leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                      <div>
                        <span class={`font-mono text-sm font-semibold ${style.text}`}>{a}</span>
                        <span class="text-text-muted text-sm mx-1">+</span>
                        <span class={`font-mono text-sm font-semibold ${style.text}`}>{b}</span>
                        <span class={`ml-2 text-xs capitalize ${style.text}`}>{c === 'conditions' ? 'Conditions apply' : c}</span>
                        {note && <p class="text-xs text-text-muted mt-1 leading-snug">{note}</p>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {selected.length === 0 && (
        <div class="bg-surface border border-border rounded-lg px-4 py-6 text-center text-sm text-text-muted">
          Select two or more licences above to see the compatibility matrix.
        </div>
      )}

      {selected.length === 1 && (
        <div class="bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-muted">
          Select at least one more licence to compare.
        </div>
      )}

      {/* Reference note */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted space-y-1">
        <p class="font-medium text-text mb-1">Disclaimer</p>
        <p>This tool provides an educational overview based on community consensus and FSF/OSI guidance. Licence compatibility is a nuanced legal topic — edge cases exist (dual-licensing, "or later" clauses, static vs dynamic linking). For commercial projects or legal certainty, consult a lawyer familiar with open-source licences.</p>
      </div>
    </div>
  );
}
