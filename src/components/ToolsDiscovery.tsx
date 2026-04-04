import { useState, useMemo } from 'preact/hooks';

export interface Tool {
  name: string;
  desc: string;
  href: string;
  icon: string;
  featured?: boolean;
  pricing?: 'Free' | 'Paid' | 'Freemium';
}

export interface Category {
  name: string;
  icon: string;
  tools: Tool[];
}

interface Props {
  categories: Category[];
  featuredTools: Tool[];
}

// Fuzzy match: all query words must appear in the target string
function fuzzyMatch(target: string, words: string[]): boolean {
  const lower = target.toLowerCase();
  return words.every(w => lower.includes(w));
}

// Highlight matched words in text, returns array of JSX segments
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>;

  // Build a regex that matches any of the words (case-insensitive)
  const pattern = words
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} class="bg-primary/20 text-primary rounded px-0.5 font-medium not-italic">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

const PRICING_BADGE: Record<string, string> = {
  Free: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Paid: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  Freemium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

export default function ToolsDiscovery({ categories, featuredTools }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const queryWords = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );
  const isFiltering = queryWords.length > 0 || activeCategory !== null;

  // Build a flat list of tools with their category name for search results
  const allToolsWithCategory = useMemo(
    () =>
      categories.flatMap(cat =>
        cat.tools.map(tool => ({ ...tool, categoryName: cat.name, categoryIcon: cat.icon }))
      ),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => activeCategory === null || cat.name === activeCategory)
      .map(cat => ({
        ...cat,
        tools: queryWords.length > 0
          ? cat.tools.filter(t => fuzzyMatch(`${t.name} ${t.desc}`, queryWords))
          : cat.tools,
      }))
      .filter(cat => cat.tools.length > 0);
  }, [categories, queryWords, activeCategory]);

  const totalVisible = filteredCategories.reduce((s, c) => s + c.tools.length, 0);

  // When searching across all categories (no active category filter), show flat list with category badges
  const showFlatSearchResults = queryWords.length > 0 && activeCategory === null;
  const flatSearchResults = useMemo(() => {
    if (!showFlatSearchResults) return [];
    return allToolsWithCategory.filter(t =>
      fuzzyMatch(`${t.name} ${t.desc}`, queryWords)
    );
  }, [showFlatSearchResults, allToolsWithCategory, queryWords]);

  const displayCount = showFlatSearchResults ? flatSearchResults.length : totalVisible;

  return (
    <div>
      {/* Search bar */}
      <div class="flex gap-2 max-w-md mx-auto mb-3">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search 1000+ tools (JWT, regex, cron…)"
          class="flex-1 px-4 py-3 rounded-xl border border-border bg-bg-card text-text placeholder-text-muted focus:outline-none focus:border-primary text-sm"
          autocomplete="off"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            class="px-4 py-3 bg-bg-card border border-border hover:border-primary text-text-muted hover:text-text rounded-xl transition-colors text-sm"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Result count */}
      {isFiltering && (
        <p class="text-text-muted text-sm text-center mb-6">
          {displayCount === 0
            ? `No tools found for "${query}"`
            : `${displayCount} tool${displayCount !== 1 ? 's' : ''} found`}
          {activeCategory && <span class="ml-1">in <strong>{activeCategory}</strong></span>}
        </p>
      )}

      {/* Category filter pills */}
      <div class="flex flex-wrap gap-2 justify-center mb-10">
        <button
          onClick={() => setActiveCategory(null)}
          class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
            activeCategory === null
              ? 'bg-primary border-primary text-white'
              : 'bg-bg-card border-border hover:border-primary text-text'
          }`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(activeCategory === cat.name ? null : cat.name)}
            class={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat.name
                ? 'bg-primary border-primary text-white'
                : 'bg-bg-card border-border hover:border-primary text-text'
            }`}
          >
            {cat.icon} {cat.name}
            <span class={`ml-1.5 text-xs ${activeCategory === cat.name ? 'opacity-80' : 'text-text-muted'}`}>
              {cat.tools.length}
            </span>
          </button>
        ))}
      </div>

      {/* Featured tools — hide when filtering */}
      {!isFiltering && (
        <section class="mb-12">
          <div class="flex items-center gap-3 mb-5">
            <span class="text-2xl">⭐</span>
            <h2 class="text-2xl font-bold">Featured Tools</h2>
            <span class="text-sm text-text-muted bg-bg-card border border-border px-2 py-0.5 rounded-full">
              Most popular
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredTools.map(tool => (
              <a
                key={tool.href}
                href={tool.href}
                class="block bg-gradient-to-br from-primary/10 via-bg-card to-bg-card rounded-xl p-5 border border-primary/40 hover:border-primary hover:shadow-md transition-all group"
              >
                <div class="flex items-start gap-3">
                  <span class="text-3xl flex-shrink-0">{tool.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 class="text-base font-semibold group-hover:text-primary transition-colors truncate">
                        {tool.name}
                      </h3>
                      <span class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                        Featured
                      </span>
                      <span class={`text-xs border px-1.5 py-0.5 rounded-full shrink-0 ${PRICING_BADGE[tool.pricing ?? 'Free']}`}>
                        {tool.pricing ?? 'Free'}
                      </span>
                    </div>
                    <p class="text-text-muted text-sm line-clamp-2">{tool.desc}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Flat search results (cross-category search with category badges) */}
      {showFlatSearchResults && (
        flatSearchResults.length === 0 ? (
          <div class="text-center py-16 text-text-muted">
            <div class="text-5xl mb-4">🔍</div>
            <p class="text-lg font-medium mb-2">No tools match your search</p>
            <p class="text-sm">Try a different keyword — e.g. "base64", "regex", "jwt"</p>
          </div>
        ) : (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {flatSearchResults.map(tool => (
              <a
                key={tool.href}
                href={tool.href}
                class="block bg-bg-card rounded-xl p-5 border border-border hover:border-primary hover:shadow-md transition-all group"
              >
                <div class="flex items-start gap-3 mb-3">
                  <span class="text-2xl flex-shrink-0">{tool.icon}</span>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold group-hover:text-primary transition-colors leading-snug">
                      <Highlight text={tool.name} words={queryWords} />
                    </h3>
                  </div>
                </div>
                <p class="text-text-muted text-xs line-clamp-2 mb-3">
                  <Highlight text={tool.desc} words={queryWords} />
                </p>
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs bg-bg-card border border-border px-2 py-0.5 rounded-full text-text-muted">
                    {tool.categoryIcon} {tool.categoryName}
                  </span>
                  <span class={`text-xs border px-2 py-0.5 rounded-full ${PRICING_BADGE[tool.pricing ?? 'Free']}`}>
                    {tool.pricing ?? 'Free'}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )
      )}

      {/* Category sections (when category filter active or no query) */}
      {!showFlatSearchResults && (
        filteredCategories.length === 0 ? (
          <div class="text-center py-16 text-text-muted">
            <div class="text-5xl mb-4">🔍</div>
            <p class="text-lg font-medium mb-2">No tools match your search</p>
            <p class="text-sm">Try a different keyword — e.g. "base64", "regex", "jwt"</p>
          </div>
        ) : (
          filteredCategories.map(cat => (
            <section
              key={cat.name}
              id={cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
              class="mb-12"
            >
              <div class="flex items-center gap-3 mb-5">
                <span class="text-2xl">{cat.icon}</span>
                <h2 class="text-2xl font-bold">{cat.name}</h2>
                <span class="text-sm text-text-muted bg-bg-card border border-border px-2 py-0.5 rounded-full">
                  {cat.tools.length} tool{cat.tools.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {cat.tools.map(tool => (
                  <a
                    key={tool.href}
                    href={tool.href}
                    class="block bg-bg-card rounded-xl p-5 border border-border hover:border-primary hover:shadow-md transition-all group"
                  >
                    <div class="flex items-start gap-3 mb-3">
                      <span class="text-2xl flex-shrink-0">{tool.icon}</span>
                      <div class="flex-1 min-w-0">
                        <h3 class="text-sm font-semibold group-hover:text-primary transition-colors leading-snug">
                          {queryWords.length > 0
                            ? <Highlight text={tool.name} words={queryWords} />
                            : tool.name}
                        </h3>
                      </div>
                    </div>
                    <p class="text-text-muted text-xs line-clamp-2 mb-3">
                      {queryWords.length > 0
                        ? <Highlight text={tool.desc} words={queryWords} />
                        : tool.desc}
                    </p>
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                        {cat.icon} {cat.name}
                      </span>
                      <span class={`text-xs border px-2 py-0.5 rounded-full ${PRICING_BADGE[tool.pricing ?? 'Free']}`}>
                        {tool.pricing ?? 'Free'}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))
        )
      )}
    </div>
  );
}
