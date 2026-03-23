import { useState, useMemo, useCallback } from 'preact/hooks';

type DiffType = 'removed' | 'added' | 'unchanged';
type ViewMode = 'unified' | 'split';
type Language = 'auto' | 'js' | 'ts' | 'python' | 'rust' | 'go' | 'css' | 'html' | 'json' | 'yaml' | 'sql' | 'text';

interface DiffLine {
  type: DiffType;
  text: string;
  leftLineNo: number | null;
  rightLineNo: number | null;
  charDiff?: CharSpan[];
}

interface CharSpan { text: string; changed: boolean; }

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const left = original.split('\n');
  const right = modified.split('\n');
  const dp = computeLCS(left, right);
  const result: DiffLine[] = [];
  let i = left.length, j = right.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      result.unshift({ type: 'unchanged', text: left[i - 1], leftLineNo: i, rightLineNo: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: right[j - 1], leftLineNo: null, rightLineNo: j });
      j--;
    } else {
      result.unshift({ type: 'removed', text: left[i - 1], leftLineNo: i, rightLineNo: null });
      i--;
    }
  }

  // Inline char diff for adjacent removed/added pairs
  const enhanced: DiffLine[] = [];
  let k = 0;
  while (k < result.length) {
    const cur = result[k];
    if (cur.type === 'removed' && k + 1 < result.length && result[k + 1].type === 'added') {
      const next = result[k + 1];
      const [rc, ac] = inlineCharDiff(cur.text, next.text);
      enhanced.push({ ...cur, charDiff: rc });
      enhanced.push({ ...next, charDiff: ac });
      k += 2;
    } else {
      enhanced.push(cur);
      k++;
    }
  }
  return enhanced;
}

function inlineCharDiff(a: string, b: string): [CharSpan[], CharSpan[]] {
  // Simple char LCS for short lines (≤200 chars each)
  if (a.length > 200 || b.length > 200) {
    return [[{ text: a, changed: true }], [{ text: b, changed: true }]];
  }
  const ac = a.split(''), bc = b.split('');
  const dp = computeLCS(ac, bc);
  const ra: CharSpan[] = [], rb: CharSpan[] = [];
  let i = ac.length, j = bc.length;
  const seqA: { text: string; changed: boolean }[] = [];
  const seqB: { text: string; changed: boolean }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ac[i - 1] === bc[j - 1]) {
      seqA.unshift({ text: ac[i - 1], changed: false });
      seqB.unshift({ text: bc[j - 1], changed: false });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      seqB.unshift({ text: bc[j - 1], changed: true });
      j--;
    } else {
      seqA.unshift({ text: ac[i - 1], changed: true });
      i--;
    }
  }

  // Merge consecutive same-changed spans
  function merge(seq: typeof seqA): CharSpan[] {
    const out: CharSpan[] = [];
    for (const s of seq) {
      if (out.length && out[out.length - 1].changed === s.changed) {
        out[out.length - 1] = { ...out[out.length - 1], text: out[out.length - 1].text + s.text };
      } else { out.push({ ...s }); }
    }
    return out;
  }

  return [merge(seqA), merge(seqB)];
}

// ── Syntax highlighter ──────────────────────────────────────────────────────

const KEYWORDS: Record<string, string[]> = {
  js: ['function','const','let','var','return','if','else','for','while','class','import','export','default','from','async','await','try','catch','throw','new','this','typeof','instanceof','of','in','true','false','null','undefined','void','delete','switch','case','break','continue','yield','static','extends','super','get','set'],
  ts: ['function','const','let','var','return','if','else','for','while','class','import','export','default','from','async','await','try','catch','throw','new','this','typeof','instanceof','of','in','true','false','null','undefined','void','delete','switch','case','break','continue','yield','static','extends','super','get','set','interface','type','enum','implements','declare','abstract','readonly','public','private','protected','namespace','module','as','is','keyof','infer','never','any','unknown','string','number','boolean','object'],
  python: ['def','class','import','from','return','if','elif','else','for','while','try','except','finally','with','as','pass','break','continue','raise','yield','lambda','in','not','and','or','is','None','True','False','async','await','global','nonlocal','del','assert','print','self'],
  rust: ['fn','let','mut','use','mod','pub','struct','enum','impl','trait','for','while','loop','if','else','match','return','break','continue','true','false','None','Some','Ok','Err','self','super','crate','as','in','where','type','const','static','move','ref','Box','Vec','String','Option','Result'],
  go: ['func','var','const','type','struct','interface','map','chan','import','package','return','if','else','for','range','switch','case','break','continue','goto','fallthrough','defer','go','select','nil','true','false','make','new','append','len','cap','close','delete','copy','panic','recover','println','print'],
  css: ['body','html','div','span','a','p','h1','h2','h3','h4','h5','h6','color','background','margin','padding','display','flex','grid','position','absolute','relative','fixed','static','sticky','width','height','border','font','text','align','justify','content','items','center','none','block','inline','inherit','auto','normal','bold','solid','dashed','dotted'],
  sql: ['SELECT','FROM','WHERE','INSERT','UPDATE','DELETE','CREATE','DROP','ALTER','TABLE','INDEX','JOIN','LEFT','RIGHT','INNER','OUTER','ON','AND','OR','NOT','IN','IS','NULL','AS','DISTINCT','GROUP','BY','ORDER','HAVING','LIMIT','OFFSET','UNION','ALL','EXISTS','CASE','WHEN','THEN','ELSE','END','SET','VALUES','INTO','PRIMARY','KEY','FOREIGN','REFERENCES','CONSTRAINT','DEFAULT','UNIQUE','AUTO_INCREMENT'],
};
KEYWORDS['auto'] = [...new Set([...KEYWORDS.js, ...KEYWORDS.ts, ...KEYWORDS.python])];

function detectLanguage(code: string): Language {
  if (code.includes('import React') || /const \w+ = \(/.test(code) || /=>\s*{/.test(code)) return 'js';
  if (/: \w+\s*[=;,)]/.test(code) || /interface \w+/.test(code) || /<\w+>/.test(code)) return 'ts';
  if (/def \w+\(/.test(code) || /import \w+\n/.test(code) || /:\s*$/.test(code)) return 'python';
  if (/fn \w+\(/.test(code) || /let mut/.test(code)) return 'rust';
  if (/func \w+\(/.test(code) || /package \w+/.test(code)) return 'go';
  if (/^[{[]/.test(code.trim())) return 'json';
  if (/^\s*---/.test(code) || /^\w+:\s/m.test(code)) return 'yaml';
  if (/SELECT|INSERT|CREATE TABLE/i.test(code)) return 'sql';
  if (/[{}\[\]]/.test(code) && /:/.test(code)) return 'css';
  return 'text';
}

function highlightLine(text: string, lang: Language): { __html: string } {
  if (lang === 'text' || !text) return { __html: text ? escHtml(text) : '&nbsp;' };

  let s = escHtml(text);
  const kws = KEYWORDS[lang] || KEYWORDS.js;

  // Strings (double/single/backtick)
  s = s.replace(/(&quot;)(.*?)(&quot;)/g, '<span class="hl-str">$1$2$3</span>');
  s = s.replace(/(&#039;)(.*?)(&#039;)/g, '<span class="hl-str">$1$2$3</span>');
  s = s.replace(/(`)([^`]*?)(`)/g, '<span class="hl-str">$1$2$3</span>');

  // Comments
  s = s.replace(/(\/\/.*$)/g, '<span class="hl-cmt">$1</span>');
  s = s.replace(/(#.*$)/g, '<span class="hl-cmt">$1</span>');
  s = s.replace(/(--.*$)/g, '<span class="hl-cmt">$1</span>');

  // Numbers
  s = s.replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>');

  // Keywords
  const kwPattern = new RegExp(`\\b(${kws.join('|')})\\b`, 'g');
  s = s.replace(kwPattern, '<span class="hl-kw">$1</span>');

  return { __html: s || '&nbsp;' };
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ── Samples ──────────────────────────────────────────────────────────────────

const SAMPLE_BEFORE = `async function fetchUser(id) {
  return fetch('/api/users/' + id)
    .then(res => res.json())
    .then(data => {
      console.log(data);
      return data;
    });
}

const cache = {};

function getUser(id) {
  if (cache[id]) return Promise.resolve(cache[id]);
  return fetchUser(id).then(user => {
    cache[id] = user;
    return user;
  });
}`;

const SAMPLE_AFTER = `async function fetchUser(id: string): Promise<User> {
  const res = await fetch(\`/api/users/\${id}\`);
  if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
  return res.json();
}

const cache = new Map<string, User>();

async function getUser(id: string): Promise<User> {
  if (cache.has(id)) return cache.get(id)!;
  const user = await fetchUser(id);
  cache.set(id, user);
  return user;
}`;

// ── Component ────────────────────────────────────────────────────────────────

export default function DiffCheckerV2() {
  const [before, setBefore] = useState(SAMPLE_BEFORE);
  const [after, setAfter] = useState(SAMPLE_AFTER);
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [showUnchanged, setShowUnchanged] = useState(true);
  const [langOverride, setLangOverride] = useState<Language>('auto');
  const [syntaxOn, setSyntaxOn] = useState(true);
  const [copied, setCopied] = useState(false);

  const lang: Language = useMemo(() => {
    if (langOverride !== 'auto') return langOverride;
    return detectLanguage(before + '\n' + after);
  }, [before, after, langOverride]);

  const diff = useMemo(() => computeDiff(before, after), [before, after]);

  const stats = useMemo(() => ({
    added: diff.filter(l => l.type === 'added').length,
    removed: diff.filter(l => l.type === 'removed').length,
    unchanged: diff.filter(l => l.type === 'unchanged').length,
  }), [diff]);

  const visibleDiff = useMemo(() => {
    if (showUnchanged) return diff;
    const changed = new Set<number>();
    diff.forEach((l, i) => { if (l.type !== 'unchanged') { for (let c = Math.max(0, i - 2); c <= Math.min(diff.length - 1, i + 2); c++) changed.add(c); } });
    const result: (DiffLine | null)[] = [];
    let prevIncluded = true;
    diff.forEach((l, i) => {
      if (changed.has(i)) { result.push(l); prevIncluded = true; }
      else if (prevIncluded && i < diff.length - 1 && changed.has(i + 1)) { result.push(l); }
      else { if (prevIncluded) result.push(null); prevIncluded = false; }
    });
    return result;
  }, [diff, showUnchanged]);

  const copyDiff = useCallback(async () => {
    const text = diff.map(l => {
      const prefix = l.type === 'added' ? '+ ' : l.type === 'removed' ? '- ' : '  ';
      return prefix + l.text;
    }).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diff]);

  const bgColor: Record<DiffType, string> = {
    added: 'bg-green-950/60 border-l-2 border-green-600',
    removed: 'bg-red-950/60 border-l-2 border-red-600',
    unchanged: '',
  };

  function renderHighlightedLine(line: DiffLine) {
    if (line.charDiff && line.charDiff.length) {
      // Inline char-diff rendering
      const spanClass = line.type === 'added'
        ? (changed: boolean) => changed ? 'bg-green-700/70 rounded-sm' : ''
        : (changed: boolean) => changed ? 'bg-red-700/70 rounded-sm' : '';
      return (
        <span class="py-0.5 pr-3 whitespace-pre font-mono text-xs">
          {line.charDiff.map((span, i) => (
            <span key={i} class={spanClass(span.changed)}>{span.text || ' '}</span>
          ))}
        </span>
      );
    }
    if (syntaxOn) {
      const hl = highlightLine(line.text, lang);
      return <span class="py-0.5 pr-3 whitespace-pre font-mono text-xs" dangerouslySetInnerHTML={hl} />;
    }
    return <span class="py-0.5 pr-3 whitespace-pre font-mono text-xs">{line.text || ' '}</span>;
  }

  function renderLineNo(n: number | null) {
    return <span class="select-none w-10 text-right pr-2 text-text-muted/40 shrink-0 py-0.5 px-1 text-xs">{n ?? ''}</span>;
  }

  const prefix: Record<DiffType, string> = { added: '+', removed: '-', unchanged: ' ' };
  const prefixColor: Record<DiffType, string> = { added: 'text-green-500', removed: 'text-red-500', unchanged: 'text-text-muted/30' };

  return (
    <div class="space-y-4">
      {/* Syntax highlight styles */}
      <style>{`
        .hl-kw { color: #c792ea; }
        .hl-str { color: #c3e88d; }
        .hl-num { color: #f78c6c; }
        .hl-cmt { color: #546e7a; font-style: italic; }
      `}</style>

      {/* Controls */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-1 bg-surface border border-border rounded-lg p-1">
          {(['unified', 'split'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              class={`px-3 py-1 text-sm rounded capitalize transition-colors ${viewMode === m ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`}>
              {m}
            </button>
          ))}
        </div>
        <select value={langOverride} onChange={e => setLangOverride((e.target as HTMLSelectElement).value as Language)}
          class="bg-surface border border-border rounded px-2 py-1 text-xs text-text-muted focus:outline-none focus:border-accent">
          {(['auto','js','ts','python','rust','go','css','html','json','yaml','sql','text'] as Language[]).map(l => (
            <option key={l} value={l}>{l === 'auto' ? `auto (${lang})` : l}</option>
          ))}
        </select>
        <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
          <input type="checkbox" checked={syntaxOn} onChange={e => setSyntaxOn((e.target as HTMLInputElement).checked)} class="accent-accent" />
          Syntax
        </label>
        <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
          <input type="checkbox" checked={showUnchanged} onChange={e => setShowUnchanged((e.target as HTMLInputElement).checked)} class="accent-accent" />
          Show unchanged
        </label>
        {(stats.added > 0 || stats.removed > 0) && (
          <div class="flex gap-3 text-sm ml-auto">
            <span class="text-green-400 font-mono">+{stats.added}</span>
            <span class="text-red-400 font-mono">-{stats.removed}</span>
            <span class="text-text-muted font-mono">{stats.unchanged} unchanged</span>
          </div>
        )}
        <button onClick={copyDiff} class="text-sm bg-surface border border-border rounded px-3 py-1 hover:border-accent transition-colors">
          {copied ? '✓ Copied' : 'Copy diff'}
        </button>
      </div>

      {/* Input panels */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-red-400">Before</label>
            <span class="text-xs text-text-muted">{before.split('\n').length} lines</span>
          </div>
          <textarea
            value={before}
            onInput={e => setBefore((e.target as HTMLTextAreaElement).value)}
            class="w-full h-52 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-red-600 text-text"
            spellcheck={false}
          />
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-green-400">After</label>
            <span class="text-xs text-text-muted">{after.split('\n').length} lines</span>
          </div>
          <textarea
            value={after}
            onInput={e => setAfter((e.target as HTMLTextAreaElement).value)}
            class="w-full h-52 bg-surface border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-green-600 text-text"
            spellcheck={false}
          />
        </div>
      </div>

      {/* Diff output */}
      {(stats.added > 0 || stats.removed > 0) && (
        <div class="border border-border rounded-lg overflow-hidden">
          <div class="bg-surface/80 px-3 py-2 text-xs text-text-muted border-b border-border flex items-center gap-2">
            <span>Diff output</span>
            {!showUnchanged && <span class="text-accent">· changed lines only</span>}
            <span class="ml-auto">{lang}</span>
          </div>

          {viewMode === 'unified' ? (
            <div class="overflow-auto max-h-[32rem] bg-[#0d1117]">
              {visibleDiff.map((line, i) => {
                if (line === null) return <div key={i} class="px-3 py-0.5 text-text-muted/50 select-none text-xs font-mono">···</div>;
                return (
                  <div key={i} class={`flex items-baseline px-0 py-0 ${bgColor[line.type]}`}>
                    {renderLineNo(line.type !== 'added' ? line.leftLineNo : null)}
                    {renderLineNo(line.type !== 'removed' ? line.rightLineNo : null)}
                    <span class={`select-none pr-2 py-0.5 text-xs font-mono ${prefixColor[line.type]}`}>{prefix[line.type]}</span>
                    {renderHighlightedLine(line)}
                  </div>
                );
              })}
            </div>
          ) : (
            <div class="overflow-auto max-h-[32rem] bg-[#0d1117]">
              <div class="grid grid-cols-2 divide-x divide-border min-w-0">
                <div>
                  {visibleDiff.map((line, i) => {
                    if (line === null) return <div key={i} class="px-2 py-0.5 text-text-muted/50 select-none text-xs font-mono">···</div>;
                    if (line.type === 'added') return <div key={i} class="py-0.5 opacity-0 select-none text-xs">&nbsp;</div>;
                    return (
                      <div key={i} class={`flex items-baseline ${bgColor[line.type]}`}>
                        {renderLineNo(line.leftLineNo)}
                        {renderHighlightedLine(line)}
                      </div>
                    );
                  })}
                </div>
                <div>
                  {visibleDiff.map((line, i) => {
                    if (line === null) return <div key={i} class="px-2 py-0.5 text-text-muted/50 select-none text-xs font-mono">···</div>;
                    if (line.type === 'removed') return <div key={i} class="py-0.5 opacity-0 select-none text-xs">&nbsp;</div>;
                    return (
                      <div key={i} class={`flex items-baseline ${bgColor[line.type]}`}>
                        {renderLineNo(line.rightLineNo)}
                        {renderHighlightedLine(line)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {stats.added === 0 && stats.removed === 0 && before && after && (
        <div class="text-center text-text-muted text-sm py-6 border border-dashed border-border rounded-lg">
          ✓ No differences found — the two versions are identical.
        </div>
      )}
    </div>
  );
}
