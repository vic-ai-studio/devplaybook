import { useState } from 'preact/hooks';

// ─── Formatter ────────────────────────────────────────────────────────────────

/**
 * Pure-JS GraphQL formatter — no external libraries.
 * Strategy: tokenise the input into "atoms", then rebuild with indentation.
 */

type Token =
  | { kind: 'brace_open' }
  | { kind: 'brace_close' }
  | { kind: 'paren_open' }
  | { kind: 'paren_close' }
  | { kind: 'colon' }
  | { kind: 'comma' }
  | { kind: 'at' }           // directives (@skip, @include …)
  | { kind: 'ellipsis' }     // ...
  | { kind: 'dollar' }       // $
  | { kind: 'bang' }         // !
  | { kind: 'eq' }           // =
  | { kind: 'pipe' }         // |  (union types)
  | { kind: 'amp' }          // &  (interface impl)
  | { kind: 'string'; value: string }
  | { kind: 'blockstring'; value: string }
  | { kind: 'comment'; value: string }
  | { kind: 'word'; value: string }
  | { kind: 'ws' };

function tokenizeGql(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    // Whitespace
    if (/\s/.test(ch)) {
      while (i < src.length && /\s/.test(src[i])) i++;
      tokens.push({ kind: 'ws' });
      continue;
    }

    // Comment
    if (ch === '#') {
      let j = i + 1;
      while (j < src.length && src[j] !== '\n') j++;
      tokens.push({ kind: 'comment', value: src.slice(i, j) });
      i = j;
      continue;
    }

    // Block string """
    if (src.slice(i, i + 3) === '"""') {
      let j = i + 3;
      while (j < src.length && src.slice(j, j + 3) !== '"""') j++;
      tokens.push({ kind: 'blockstring', value: src.slice(i, j + 3) });
      i = j + 3;
      continue;
    }

    // String "
    if (ch === '"') {
      let j = i + 1;
      while (j < src.length && (src[j] !== '"' || src[j - 1] === '\\')) j++;
      tokens.push({ kind: 'string', value: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Ellipsis ...
    if (src.slice(i, i + 3) === '...') { tokens.push({ kind: 'ellipsis' }); i += 3; continue; }

    // Single-char punctuation
    if (ch === '{') { tokens.push({ kind: 'brace_open' }); i++; continue; }
    if (ch === '}') { tokens.push({ kind: 'brace_close' }); i++; continue; }
    if (ch === '(') { tokens.push({ kind: 'paren_open' }); i++; continue; }
    if (ch === ')') { tokens.push({ kind: 'paren_close' }); i++; continue; }
    if (ch === ':') { tokens.push({ kind: 'colon' }); i++; continue; }
    if (ch === ',') { tokens.push({ kind: 'comma' }); i++; continue; }
    if (ch === '@') { tokens.push({ kind: 'at' }); i++; continue; }
    if (ch === '$') { tokens.push({ kind: 'dollar' }); i++; continue; }
    if (ch === '!') { tokens.push({ kind: 'bang' }); i++; continue; }
    if (ch === '=') { tokens.push({ kind: 'eq' }); i++; continue; }
    if (ch === '|') { tokens.push({ kind: 'pipe' }); i++; continue; }
    if (ch === '&') { tokens.push({ kind: 'amp' }); i++; continue; }

    // Word / number / identifier
    let j = i;
    while (j < src.length && /[^\s{}(),:@$!="'|&.#]/.test(src[j])) j++;
    if (j > i) { tokens.push({ kind: 'word', value: src.slice(i, j) }); i = j; continue; }

    // Fallback — skip unknown char
    i++;
  }

  return tokens.filter(t => t.kind !== 'ws');
}

// Keywords that get syntax colour classes
const OPERATION_KW = new Set(['query', 'mutation', 'subscription', 'fragment']);
const MODIFIER_KW  = new Set(['on', 'true', 'false', 'null']);
const TYPE_KW      = new Set(['type', 'input', 'interface', 'union', 'enum', 'scalar', 'schema', 'directive', 'extend', 'implements']);

function classifyWord(w: string): 'operation' | 'modifier' | 'type-kw' | 'none' {
  if (OPERATION_KW.has(w)) return 'operation';
  if (MODIFIER_KW.has(w))  return 'modifier';
  if (TYPE_KW.has(w))      return 'type-kw';
  return 'none';
}

// ── Validation ────────────────────────────────────────────────────────────────

interface FormatResult {
  ok: boolean;
  output: string;
  error?: string;
}

function formatGql(src: string): FormatResult {
  const trimmed = src.trim();
  if (!trimmed) return { ok: true, output: '' };

  // Check for obviously invalid: unmatched braces
  let depth = 0;
  for (const ch of trimmed) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return { ok: false, output: '', error: 'Unmatched closing brace "}".' };
  }
  if (depth !== 0) return { ok: false, output: '', error: `Unmatched opening brace "{" — ${depth} brace(s) not closed.` };

  // Must start with a recognised structure or shorthand selection set
  const firstWord = trimmed.match(/^([a-zA-Z_]\w*)/)?.[1] ?? '';
  if (
    firstWord &&
    !OPERATION_KW.has(firstWord) &&
    !TYPE_KW.has(firstWord) &&
    trimmed[0] !== '{'  // shorthand query
  ) {
    return { ok: false, output: '', error: `Unexpected token "${firstWord}". Expected query, mutation, subscription, fragment, or a SDL type keyword.` };
  }

  const tokens = tokenizeGql(trimmed);
  const INDENT = '  ';
  let out = '';
  let indentLevel = 0;
  let needNewline = false; // after { we want a newline before next token

  // Helper: current indent string
  const pad = () => INDENT.repeat(indentLevel);

  // We process tokens linearly and emit formatted output
  for (let ti = 0; ti < tokens.length; ti++) {
    const tok = tokens[ti];
    const next = tokens[ti + 1];

    switch (tok.kind) {
      case 'brace_open': {
        // Put { at end of current line (after a space if needed)
        if (out.length > 0 && !out.endsWith(' ') && !out.endsWith('\n')) out += ' ';
        out += '{';
        indentLevel++;
        // Next real token will be on new indented line
        out += '\n' + pad();
        needNewline = false;
        break;
      }
      case 'brace_close': {
        indentLevel = Math.max(0, indentLevel - 1);
        // Remove trailing spaces from last line, then newline + close
        out = out.trimEnd();
        out += '\n' + pad() + '}';
        // After }, next token starts on a new line (sibling field or outer })
        if (next && next.kind !== 'brace_close') out += '\n' + pad();
        needNewline = false;
        break;
      }
      case 'paren_open': {
        // Arguments — keep opening paren attached to previous token
        out += '(';
        // Collect everything until matching ) — inline for simple args, multiline for complex
        // Peek ahead to decide: if more than ~60 chars worth, go multiline
        const argTokens: Token[] = [];
        let depth2 = 1;
        let tj = ti + 1;
        while (tj < tokens.length && depth2 > 0) {
          const t2 = tokens[tj];
          if (t2.kind === 'paren_open') depth2++;
          if (t2.kind === 'paren_close') depth2--;
          if (depth2 > 0) argTokens.push(t2);
          tj++;
        }
        ti = tj - 1; // skip past the closing )

        // Render args inline
        const argStr = renderArgsInline(argTokens);
        if (argStr.length <= 60) {
          out += argStr + ')';
        } else {
          // Multiline args
          indentLevel++;
          out += '\n' + pad();
          out += renderArgsMultiline(argTokens, pad);
          indentLevel--;
          out += '\n' + pad() + ')';
        }
        break;
      }
      case 'paren_close': {
        // Should already be consumed by paren_open handler — safety fallback
        out += ')';
        break;
      }
      case 'colon': {
        out += ': ';
        break;
      }
      case 'comma': {
        // In top-level context commas separate fields — treat as newline
        out = out.trimEnd();
        out += '\n' + pad();
        break;
      }
      case 'ellipsis': {
        // Spread / inline fragment: ...on or ...FragName
        out += '...';
        break;
      }
      case 'at': {
        // Directive: @word
        out += '@';
        break;
      }
      case 'dollar': {
        out += '$';
        break;
      }
      case 'bang': {
        // Non-null type modifier — attach to previous without space
        out = out.trimEnd();
        out += '!';
        break;
      }
      case 'eq': {
        out += ' = ';
        break;
      }
      case 'pipe': {
        out += ' | ';
        break;
      }
      case 'amp': {
        out += ' & ';
        break;
      }
      case 'comment': {
        out = out.trimEnd();
        out += '\n' + pad() + tok.value + '\n' + pad();
        break;
      }
      case 'string':
      case 'blockstring': {
        out += tok.value;
        if (next && next.kind !== 'brace_close' && next.kind !== 'paren_close' && next.kind !== 'comma') {
          out += '\n' + pad();
        }
        break;
      }
      case 'word': {
        // If the previous non-whitespace output ends with a letter/digit/_ we need a space
        const lastChar = out.trimEnd().slice(-1);
        if (lastChar && /[\w$!]/.test(lastChar)) out += ' ';
        out += tok.value;
        // After a keyword that opens a block (e.g. "on TypeName {"), keep on same line
        break;
      }
    }
  }

  // Clean up: collapse multiple blank lines, trim trailing whitespace per line
  let result = out
    .split('\n')
    .map(l => l.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { ok: true, output: result };
}

// Render argument tokens as an inline string (no newlines)
function renderArgsInline(tokens: Token[]): string {
  let s = '';
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = tokens[i - 1];
    switch (tok.kind) {
      case 'colon': s += ': '; break;
      case 'comma': s += ', '; break;
      case 'eq':    s += ' = '; break;
      case 'bang':  s = s.trimEnd() + '!'; break;
      case 'dollar': s += '$'; break;
      case 'at':    s += '@'; break;
      case 'paren_open':  s += '('; break;
      case 'paren_close': s += ')'; break;
      case 'brace_open':  s += '{'; break;
      case 'brace_close': s += '}'; break;
      case 'pipe':  s += ' | '; break;
      case 'amp':   s += ' & '; break;
      case 'ellipsis': s += '...'; break;
      case 'word':
      case 'string':
      case 'blockstring': {
        const val = tok.kind === 'word' ? tok.value : tok.value;
        const lastCh = s.trimEnd().slice(-1);
        if (lastCh && /[\w$!"]/.test(lastCh) && tok.kind === 'word') s += ' ';
        s += val;
        break;
      }
    }
  }
  return s;
}

// Render argument tokens multiline (one arg per line)
function renderArgsMultiline(tokens: Token[], pad: () => string): string {
  // Split by top-level commas
  const groups: Token[][] = [[]];
  let d = 0;
  for (const tok of tokens) {
    if (tok.kind === 'paren_open' || tok.kind === 'brace_open') d++;
    else if (tok.kind === 'paren_close' || tok.kind === 'brace_close') d--;
    if (tok.kind === 'comma' && d === 0) { groups.push([]); continue; }
    groups[groups.length - 1].push(tok);
  }
  return groups.map(g => pad() + renderArgsInline(g)).join('\n');
}

// ── Syntax highlighter ────────────────────────────────────────────────────────

// Colour palette (GitHub dark theme inspired)
const COLOURS = {
  operation: '#ff7b72',  // red-ish — query/mutation/subscription/fragment
  modifier:  '#79c0ff',  // blue — on / true / false / null
  typeKw:    '#d2a8ff',  // purple — type/input/interface/enum…
  directive: '#ffa657',  // orange — @directive
  variable:  '#ffa657',  // orange — $var
  string:    '#a5d6ff',  // light blue — strings
  comment:   '#8b949e',  // grey — comments
  field:     '#e6edf3',  // default — field names
  punctuation:'#6e7681', // dim — { } ( ) : ,
  number:    '#79c0ff',  // blue — numbers
};

interface Span { text: string; color: string }

function highlightGql(formatted: string): Span[] {
  if (!formatted) return [];

  const spans: Span[] = [];
  let i = 0;
  const src = formatted;

  while (i < src.length) {
    // Comment
    if (src[i] === '#') {
      let j = i;
      while (j < src.length && src[j] !== '\n') j++;
      spans.push({ text: src.slice(i, j), color: COLOURS.comment });
      i = j;
      continue;
    }
    // Block string
    if (src.slice(i, i + 3) === '"""') {
      let j = i + 3;
      while (j < src.length && src.slice(j, j + 3) !== '"""') j++;
      spans.push({ text: src.slice(i, j + 3), color: COLOURS.string });
      i = j + 3;
      continue;
    }
    // String
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length && (src[j] !== '"' || src[j - 1] === '\\')) j++;
      spans.push({ text: src.slice(i, j + 1), color: COLOURS.string });
      i = j + 1;
      continue;
    }
    // Directive @ — colour the @ and the following word
    if (src[i] === '@') {
      let j = i + 1;
      while (j < src.length && /\w/.test(src[j])) j++;
      spans.push({ text: src.slice(i, j), color: COLOURS.directive });
      i = j;
      continue;
    }
    // Variable $ — colour the $ and the following word
    if (src[i] === '$') {
      let j = i + 1;
      while (j < src.length && /\w/.test(src[j])) j++;
      spans.push({ text: src.slice(i, j), color: COLOURS.variable });
      i = j;
      continue;
    }
    // Punctuation
    if ('{}():,!|&='.includes(src[i])) {
      spans.push({ text: src[i], color: COLOURS.punctuation });
      i++;
      continue;
    }
    // Ellipsis
    if (src.slice(i, i + 3) === '...') {
      spans.push({ text: '...', color: COLOURS.punctuation });
      i += 3;
      continue;
    }
    // Word / keyword / number
    if (/[a-zA-Z_0-9]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[a-zA-Z_0-9]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const cls = classifyWord(word);
      const color =
        cls === 'operation' ? COLOURS.operation :
        cls === 'modifier'  ? COLOURS.modifier  :
        cls === 'type-kw'   ? COLOURS.typeKw    :
        /^\d/.test(word)    ? COLOURS.number     :
        COLOURS.field;
      spans.push({ text: word, color });
      i = j;
      continue;
    }
    // Whitespace / newlines — keep as-is (no colour)
    if (/\s/.test(src[i])) {
      let j = i;
      while (j < src.length && /\s/.test(src[j]) && src[j] !== '\n') j++;
      if (j > i) spans.push({ text: src.slice(i, j), color: '' });
      if (src[j] === '\n') { spans.push({ text: '\n', color: '' }); j++; }
      i = j;
      continue;
    }
    // Space char that didn't match above
    spans.push({ text: src[i], color: '' });
    i++;
  }

  return spans;
}

// ── Component ─────────────────────────────────────────────────────────────────

const PLACEHOLDER = `# Paste your GraphQL here
query GetUser($id: ID!) {
user(id: $id) { id name email posts { title } }
}`;

export default function GraphqlQueryFormatter() {
  const [input, setInput]   = useState('');
  const [result, setResult] = useState<FormatResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFormat = () => {
    if (!input.trim()) return;
    setResult(formatGql(input));
    setCopied(false);
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!result?.ok || !result.output) return;
    navigator.clipboard.writeText(result.output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const spans = result?.ok ? highlightGql(result.output) : [];
  const charCount = input.length;

  return (
    <div class="space-y-5">

      {/* Input area */}
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <label class="text-sm font-medium text-text-muted">Input GraphQL</label>
          <div class="flex items-center gap-3">
            <span class="text-xs text-text-muted">{charCount} chars</span>
            <button
              onClick={handleClear}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          class="w-full h-52 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted/50"
          placeholder={PLACEHOLDER}
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
      </div>

      {/* Action row */}
      <div class="flex items-center gap-3">
        <button
          onClick={handleFormat}
          disabled={!input.trim()}
          class="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Format GraphQL
        </button>
        {result?.ok && result.output && (
          <button
            onClick={handleCopy}
            class="text-xs bg-bg border border-border px-3 py-2 rounded hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        )}
      </div>

      {/* Error banner */}
      {result && !result.ok && (
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm font-mono">
          <span class="font-semibold text-red-300">Parse error: </span>{result.error}
        </div>
      )}

      {/* Output area */}
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <label class="text-sm font-medium text-text-muted">Formatted GraphQL</label>
          {result?.ok && result.output && (
            <span class="text-xs text-text-muted">{result.output.length} chars</span>
          )}
        </div>
        <pre
          class={`w-full min-h-52 bg-[#0d1117] border border-border rounded-lg p-4 font-mono text-sm overflow-x-auto whitespace-pre leading-relaxed ${!result ? 'text-[#6e7681]' : ''}`}
          aria-label="Formatted GraphQL output"
        >
          {(!result || (result.ok && !result.output)) ? (
            <span style={{ color: '#6e7681' }}>Formatted output will appear here...</span>
          ) : result.ok ? (
            spans.map((s, idx) =>
              s.color
                ? <span key={idx} style={{ color: s.color }}>{s.text}</span>
                : s.text
            )
          ) : (
            <span style={{ color: '#6e7681' }}>Fix the error above and try again.</span>
          )}
        </pre>
      </div>

      {/* Reference card — shown when empty */}
      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">Supported GraphQL syntax</p>
          <ul class="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>Operations: <code class="text-[#ff7b72]">query</code>, <code class="text-[#ff7b72]">mutation</code>, <code class="text-[#ff7b72]">subscription</code></li>
            <li>Fragments: <code class="text-[#ff7b72]">fragment</code> Name <code class="text-[#79c0ff]">on</code> Type &amp; inline spreads <code class="text-text">...on TypeName</code></li>
            <li>Variables (<code class="text-[#ffa657]">$var: Type!</code>), arguments, aliases (<code class="text-text">alias: field</code>)</li>
            <li>Directives (<code class="text-[#ffa657]">@skip</code>, <code class="text-[#ffa657]">@include</code>, …) and SDL type definitions</li>
            <li>Detects unmatched braces and invalid operation keywords</li>
          </ul>
          <div class="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { label: 'Operations', color: '#ff7b72', sample: 'query mutation' },
              { label: 'Keywords',   color: '#79c0ff', sample: 'on true false' },
              { label: 'SDL types',  color: '#d2a8ff', sample: 'type input enum' },
              { label: 'Directives', color: '#ffa657', sample: '@skip $variable' },
            ].map(({ label, color, sample }) => (
              <div key={label} class="flex items-start gap-1.5">
                <span class="mt-0.5 inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div>
                  <div class="text-text font-medium">{label}</div>
                  <div class="text-text-muted">{sample}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
