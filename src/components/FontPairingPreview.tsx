import { useState, useEffect } from 'preact/hooks';

interface Pairing {
  id: number;
  heading: string;
  body: string;
  style: StyleFilter;
  label: string;
}

type StyleFilter = 'all' | 'serif-sans' | 'sans-sans' | 'serif-serif' | 'display-sans' | 'mono';

const PAIRINGS: Pairing[] = [
  { id: 1,  heading: 'Playfair Display',     body: 'Source Sans 3',    style: 'serif-sans',   label: 'Classic Editorial' },
  { id: 2,  heading: 'Montserrat',           body: 'Merriweather',     style: 'sans-serif',   label: 'Tech Editorial' } as any,
  { id: 3,  heading: 'Raleway',              body: 'Lato',             style: 'sans-sans',    label: 'Modern Clean' },
  { id: 4,  heading: 'Oswald',              body: 'Open Sans',        style: 'display-sans', label: 'Strong Headers' },
  { id: 5,  heading: 'Lora',                body: 'Open Sans',        style: 'serif-sans',   label: 'Warm Editorial' },
  { id: 6,  heading: 'Roboto Slab',         body: 'Roboto',           style: 'serif-sans',   label: 'Google House Style' },
  { id: 7,  heading: 'Libre Baskerville',   body: 'Source Sans 3',    style: 'serif-sans',   label: 'Newspaper' },
  { id: 8,  heading: 'Nunito',              body: 'Nunito Sans',      style: 'sans-sans',    label: 'Friendly Rounded' },
  { id: 9,  heading: 'Poppins',             body: 'Poppins',          style: 'sans-sans',    label: 'Minimal Single Family' },
  { id: 10, heading: 'EB Garamond',         body: 'Lato',             style: 'serif-sans',   label: 'Classical Modern' },
  { id: 11, heading: 'Josefin Sans',        body: 'Cardo',            style: 'display-sans', label: 'Fashion Editorial' },
  { id: 12, heading: 'Abril Fatface',       body: 'Lato',             style: 'display-sans', label: 'Bold Contrast' },
  { id: 13, heading: 'Cormorant Garamond',  body: 'Proza Libre',      style: 'serif-serif',  label: 'Luxury' },
  { id: 14, heading: 'Space Grotesk',       body: 'Inter',            style: 'sans-sans',    label: 'Tech Startup' },
  { id: 15, heading: 'DM Serif Display',    body: 'DM Sans',          style: 'serif-sans',   label: 'Neutral Editorial' },
  { id: 16, heading: 'Fraunces',            body: 'Manrope',          style: 'serif-sans',   label: 'Independent Studio' },
  { id: 17, heading: 'Syne',               body: 'Syne Mono',        style: 'mono',         label: 'Creative Agency' },
  { id: 18, heading: 'Playfair Display SC', body: 'Jost',             style: 'serif-sans',   label: 'Formal Clean' },
  { id: 19, heading: 'Unbounded',           body: 'Outfit',           style: 'sans-sans',    label: 'Geometric Tech' },
  { id: 20, heading: 'Crimson Pro',         body: 'Work Sans',        style: 'serif-sans',   label: 'News / Blog' },
];

// Normalize the style field (pairing 2 was typed incorrectly inline above — fix)
const PAIRINGS_FIXED: Pairing[] = PAIRINGS.map((p) => {
  if (p.id === 2) return { ...p, style: 'sans-sans' as StyleFilter };
  return p;
});

const STYLE_FILTERS: { value: StyleFilter; label: string }[] = [
  { value: 'all',         label: 'All Styles' },
  { value: 'serif-sans',  label: 'Serif / Sans' },
  { value: 'sans-sans',   label: 'Sans / Sans' },
  { value: 'serif-serif', label: 'Serif / Serif' },
  { value: 'display-sans',label: 'Display / Sans' },
  { value: 'mono',        label: 'Monospace' },
];

const LOREM =
  'Good typography is invisible. The best body text slides beneath the reader\'s attention, guiding them through ideas without friction. Space, rhythm, and contrast do the quiet work.';

function fontFamilyName(font: string) {
  return `'${font}', sans-serif`;
}

function buildImportUrl(heading: string, body: string) {
  const families = [heading, body]
    .filter((v, i, arr) => arr.indexOf(v) === i) // dedupe for single-family pairs
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;600;700`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

function buildCss(heading: string, body: string) {
  const importUrl = buildImportUrl(heading, body);
  const isSingle = heading === body;
  if (isSingle) {
    return `@import url('${importUrl}');

:root {
  --font-heading: '${heading}', sans-serif;
  --font-body: '${heading}', sans-serif;
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 700;
}

body, p {
  font-family: var(--font-body);
  font-weight: 400;
}`;
  }
  return `@import url('${importUrl}');

:root {
  --font-heading: '${heading}', serif;
  --font-body: '${body}', sans-serif;
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 700;
}

body, p {
  font-family: var(--font-body);
  font-weight: 400;
}`;
}

export default function FontPairingPreview() {
  const [styleFilter, setStyleFilter] = useState<StyleFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  // Inject Google Fonts link tags dynamically
  const loadFont = (heading: string, body: string) => {
    const key = `${heading}||${body}`;
    if (loadedFonts.has(key)) return;
    const url = buildImportUrl(heading, body);
    const existing = document.querySelector(`link[href="${url}"]`);
    if (!existing) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    }
    setLoadedFonts((prev) => new Set([...prev, key]));
  };

  // Preload all visible fonts whenever filter/search changes
  const visiblePairings = PAIRINGS_FIXED.filter((p) => {
    const matchStyle = styleFilter === 'all' || p.style === styleFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.heading.toLowerCase().includes(q) ||
      p.body.toLowerCase().includes(q) ||
      p.label.toLowerCase().includes(q);
    return matchStyle && matchSearch;
  });

  useEffect(() => {
    visiblePairings.forEach((p) => loadFont(p.heading, p.body));
  }, [styleFilter, search]);

  const copy = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filterBtnClass = (v: StyleFilter) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      styleFilter === v
        ? 'bg-primary text-white'
        : 'bg-surface border border-border text-text-muted hover:text-text'
    }`;

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <div class="flex flex-wrap gap-2">
          {STYLE_FILTERS.map((f) => (
            <button key={f.value} class={filterBtnClass(f.value)} onClick={() => setStyleFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search by font name or style…"
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          class="w-full px-3 py-2 bg-surface border border-border rounded-md text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Count */}
      <p class="text-sm text-text-muted">
        Showing <span class="font-semibold text-text">{visiblePairings.length}</span> pairings
      </p>

      {/* Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visiblePairings.map((p) => {
          const isExpanded = expandedId === p.id;
          const css = buildCss(p.heading, p.body);
          const isCopied = copiedId === p.id;

          return (
            <div
              key={p.id}
              class="bg-bg-card border border-border rounded-lg overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Preview area */}
              <div class="p-5 space-y-3 min-h-[160px]">
                <div
                  style={{ fontFamily: fontFamilyName(p.heading), fontWeight: 700, fontSize: '1.5rem', lineHeight: 1.25 }}
                  class="text-text"
                >
                  The Quick Brown Fox
                </div>
                <div
                  style={{ fontFamily: fontFamilyName(p.body), fontWeight: 400, fontSize: '0.875rem', lineHeight: 1.65 }}
                  class="text-text-muted"
                >
                  {LOREM}
                </div>
              </div>

              {/* Footer */}
              <div class="px-5 pb-4 space-y-3">
                <div class="border-t border-border pt-3 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div class="text-xs text-text-muted">
                      <span class="font-medium text-text">{p.heading}</span>
                      {p.heading !== p.body && (
                        <> / <span class="font-medium text-text">{p.body}</span></>
                      )}
                    </div>
                    <div class="text-xs text-text-muted mt-0.5">{p.label}</div>
                  </div>
                  <button
                    onClick={() => {
                      const next = isExpanded ? null : p.id;
                      setExpandedId(next);
                      if (next !== null) loadFont(p.heading, p.body);
                    }}
                    class="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs rounded-md font-medium transition-colors shrink-0"
                  >
                    {isExpanded ? 'Hide CSS' : 'Use This Pair'}
                  </button>
                </div>

                {/* Expanded CSS panel */}
                {isExpanded && (
                  <div class="space-y-2">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-medium text-text-muted">CSS @import code</span>
                      <button
                        onClick={() => copy(css, p.id)}
                        class="px-2.5 py-1 bg-surface border border-border text-xs rounded-md text-text-muted hover:text-text transition-colors"
                      >
                        {isCopied ? 'Copied!' : 'Copy CSS'}
                      </button>
                    </div>
                    <pre class="bg-surface border border-border rounded-md p-3 text-xs font-mono text-text overflow-x-auto whitespace-pre">
                      {css}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {visiblePairings.length === 0 && (
        <div class="bg-bg-card border border-border rounded-lg p-10 text-center text-text-muted text-sm">
          No pairings match your filter. Try a different style or clear the search.
        </div>
      )}
    </div>
  );
}
