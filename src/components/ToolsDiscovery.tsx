import { useState, useMemo } from 'preact/hooks';

export interface Tool {
  name: string;
  desc: string;
  href: string;
  icon: string;
  featured?: boolean;
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

export default function ToolsDiscovery({ categories, featuredTools }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    return categories
      .filter(cat => activeCategory === null || cat.name === activeCategory)
      .map(cat => ({
        ...cat,
        tools: normalizedQuery
          ? cat.tools.filter(t =>
              `${t.name} ${t.desc}`.toLowerCase().includes(normalizedQuery)
            )
          : cat.tools,
      }))
      .filter(cat => cat.tools.length > 0);
  }, [categories, normalizedQuery, activeCategory]);

  const totalVisible = filteredCategories.reduce((s, c) => s + c.tools.length, 0);
  const isFiltering = normalizedQuery.length > 0 || activeCategory !== null;

  return (
    <div>
      {/* Search bar */}
      <div class="flex gap-2 max-w-md mx-auto mb-3">
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search 200+ tools (JWT, regex, cron…)"
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
          {totalVisible === 0
            ? `No tools found for "${query}"`
            : `${totalVisible} tool${totalVisible !== 1 ? 's' : ''} found`}
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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredTools.map(tool => (
              <a
                key={tool.href}
                href={tool.href}
                class="block bg-gradient-to-br from-primary/10 via-bg-card to-bg-card rounded-xl p-6 border border-primary/40 hover:border-primary transition-colors group"
              >
                <div class="flex items-start gap-3">
                  <span class="text-3xl">{tool.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="text-base font-semibold group-hover:text-primary transition-colors truncate">
                        {tool.name}
                      </h3>
                      <span class="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                        Featured
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

      {/* Category sections */}
      {filteredCategories.length === 0 ? (
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {cat.tools.map(tool => (
                <a
                  key={tool.href}
                  href={tool.href}
                  class="block bg-bg-card rounded-xl p-6 border border-border hover:border-primary transition-colors group"
                >
                  <div class="text-3xl mb-3">{tool.icon}</div>
                  <h3 class="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                    {tool.name}
                  </h3>
                  <p class="text-text-muted text-sm">{tool.desc}</p>
                </a>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
