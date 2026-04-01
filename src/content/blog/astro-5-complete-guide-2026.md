---
title: "Astro 5 Complete Guide 2026: Content Layer, Server Islands & Performance"
description: "Complete Astro 5 guide for 2026: Content Layer API, Server Islands architecture, View Transitions, Actions, performance optimization, and deployment. Build faster websites with less JavaScript."
date: "2026-04-01"
tags: [astro, javascript, web-framework, performance, static-site]
readingTime: "13 min read"
---

# Astro 5 Complete Guide 2026: Content Layer, Server Islands & Performance

Astro 5 has cemented Astro's position as the framework of choice for content-heavy websites in 2026. While other frameworks defaulted to shipping more JavaScript, Astro defaulted to shipping none — and the performance results are undeniable. The Content Layer API and Server Islands architecture make Astro competitive not just for blogs but for complex, dynamic sites.

This guide covers Astro 5's major features, practical patterns, and production deployment.

## Why Astro in 2026?

**Zero JavaScript by default.** An Astro page with no interactive components sends zero kilobytes of JavaScript to the browser. The HTML is pre-rendered at build time.

**Core Web Vitals.** Astro sites consistently score 95–100 on Lighthouse because there's no hydration cost, no layout shift from deferred JS, and minimal client-side work.

**Island Architecture.** When you do need interactivity, Astro hydrates only the specific component that needs it — not the entire page tree. You can even mix React, Vue, and Svelte on the same page.

**Content Layer.** Astro 5's unified API for all content sources: local Markdown, remote APIs, CMSs, databases — all with full TypeScript types.

## Project Setup

```bash
# Create Astro 5 project
npm create astro@latest my-site

# Choose: Blog template, TypeScript, install dependencies

# Start dev server
npm run dev
```

```
my-site/
├── src/
│   ├── components/        # Astro/React/Vue/Svelte components
│   ├── content/           # Content collections
│   │   └── config.ts      # Collection schemas
│   ├── layouts/           # Page layout templates
│   ├── pages/             # File-based routing (.astro, .md, .ts)
│   └── styles/            # Global CSS
├── public/                # Static assets (images, fonts, etc.)
├── astro.config.mjs       # Astro configuration
└── tsconfig.json
```

## The Content Layer API

The Content Layer in Astro 5 is the most important new feature. It replaces the old `getCollection()` API with a unified, type-safe system that handles any content source.

### Defining Collections

```typescript
// src/content/config.ts
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Local Markdown blog posts
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Team"),
    image: z.object({
      src: z.string(),
      alt: z.string(),
    }).optional(),
    draft: z.boolean().default(false),
  }),
});

// Remote CMS content (Contentful, Sanity, etc.)
const products = defineCollection({
  loader: async () => {
    const response = await fetch("https://api.my-cms.com/products?status=published");
    const data = await response.json();
    return data.items.map((item: any) => ({
      id: item.slug,
      ...item,
    }));
  },
  schema: z.object({
    name: z.string(),
    price: z.number(),
    description: z.string(),
    category: z.string(),
    images: z.array(z.string()),
  }),
});

// Documentation from Git repository
const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./docs" }),
  schema: z.object({
    title: z.string(),
    section: z.string(),
    order: z.number().default(99),
  }),
});

export const collections = { blog, products, docs };
```

### Querying Collections

```astro
---
// src/pages/blog/index.astro
import { getCollection } from "astro:content";
import BaseLayout from "@/layouts/BaseLayout.astro";
import BlogCard from "@/components/BlogCard.astro";

// Type-safe — TypeScript knows all field names and types
const posts = await getCollection("blog", ({ data }) => {
  return !data.draft; // Filter out drafts
});

// Sort by date descending
const sortedPosts = posts.sort(
  (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
);
---

<BaseLayout title="Blog">
  <h1>All Posts</h1>
  <div class="grid">
    {sortedPosts.map(post => (
      <BlogCard
        title={post.data.title}
        description={post.data.description}
        date={post.data.pubDate}
        slug={post.id}
        tags={post.data.tags}
      />
    ))}
  </div>
</BaseLayout>
```

### Dynamic Routes from Collections

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection } from "astro:content";
import { render } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  return posts.map(post => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.pubDate.toLocaleDateString()}</time>
  <Content />
</article>
```

## Server Islands

Server Islands are Astro 5's answer to partial hydration from the server side. They let you embed dynamic server-rendered content inside a statically generated page — without making the whole page dynamic.

```
Static HTML (cached at CDN)
├── Header (static)
├── Hero (static)
├── 🏝️ PersonalizedRecommendations (server island — renders per-user)
├── Product Grid (static, cached)
└── 🏝️ ShoppingCart (server island — renders per-user)
```

```astro
---
// src/components/PersonalizedRecommendations.astro
// server:defer makes this a Server Island
import { getRecommendations } from "@/lib/recommendations";

const { userId } = Astro.props;
const recommendations = await getRecommendations(userId);
---

<section class="recommendations">
  <h2>Recommended for You</h2>
  {recommendations.map(item => (
    <a href={`/products/${item.slug}`}>
      <img src={item.image} alt={item.name} />
      <span>{item.name}</span>
    </a>
  ))}
</section>
```

```astro
---
// src/pages/home.astro
import PersonalizedRecommendations from "@/components/PersonalizedRecommendations.astro";

const userId = Astro.cookies.get("userId")?.value;
---

<!-- Static content — served from CDN cache -->
<main>
  <StaticHero />
  <FeaturedProducts />

  <!-- Server Island — fetched dynamically per-user -->
  <PersonalizedRecommendations server:defer userId={userId}>
    <!-- Fallback shown while server island loads -->
    <div slot="fallback" class="skeleton-grid">
      Loading recommendations...
    </div>
  </PersonalizedRecommendations>
</main>
```

The static parts serve from CDN at full speed. The server island loads from your origin, but in parallel — not blocking the initial render.

## Island Architecture with UI Frameworks

Astro lets you use React, Vue, Svelte, Solid, or any framework for interactive components:

```bash
# Add React integration
npx astro add react

# Add Vue integration
npx astro add vue

# Add Svelte integration
npx astro add svelte
```

```astro
---
// src/pages/products/[id].astro
// Mix static Astro with interactive React and Svelte

import ProductGallery from "@/components/ProductGallery.jsx"; // React
import ReviewForm from "@/components/ReviewForm.svelte";       // Svelte
import { getProduct } from "@/lib/products";

const product = await getProduct(Astro.params.id);
---

<!-- Static: zero JS, rendered at build time -->
<div class="product-info">
  <h1>{product.name}</h1>
  <p>{product.description}</p>
  <span>${product.price}</span>
</div>

<!-- Interactive: React hydrated only when visible -->
<ProductGallery
  images={product.images}
  client:visible
/>

<!-- Interactive: Svelte hydrated only when component is idle -->
<ReviewForm productId={product.id} client:idle />
```

### Hydration Directives

| Directive | When it hydrates | Use case |
|-----------|-----------------|----------|
| `client:load` | Immediately on page load | Critical interactive UI |
| `client:idle` | When browser is idle | Below the fold, non-critical |
| `client:visible` | When component enters viewport | Images, galleries |
| `client:media="(max-width: 768px)"` | When media query matches | Mobile-only components |
| `client:only="react"` | Always (skip SSR) | Components that can't SSR |

## Astro Actions

Astro Actions (introduced in Astro 4, matured in 5) handle server-side form mutations with full type safety:

```typescript
// src/actions/index.ts
import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { db } from "@/lib/db";

export const server = {
  subscribe: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
      name: z.string().min(1),
    }),
    handler: async ({ email, name }) => {
      await db.subscribers.create({ data: { email, name } });
      return { success: true, message: `Welcome, ${name}!` };
    },
  }),

  addToCart: defineAction({
    accept: "json",
    input: z.object({
      productId: z.string(),
      quantity: z.number().int().min(1).max(99),
    }),
    handler: async ({ productId, quantity }, context) => {
      const userId = context.cookies.get("userId")?.value;
      await db.cart.upsert({
        where: { userId_productId: { userId, productId } },
        update: { quantity },
        create: { userId, productId, quantity },
      });
      return { cartCount: await db.cart.count({ where: { userId } }) };
    },
  }),
};
```

```astro
---
// src/pages/newsletter.astro
import { actions } from "astro:actions";
---

<form method="POST" action={actions.subscribe}>
  <input type="text" name="name" placeholder="Your name" required />
  <input type="email" name="email" placeholder="Your email" required />
  <button type="submit">Subscribe</button>
</form>

{/* Handle result */}
{Astro.getActionResult(actions.subscribe)?.data?.success && (
  <p class="success">
    {Astro.getActionResult(actions.subscribe)?.data?.message}
  </p>
)}
```

## View Transitions

Astro's built-in View Transitions API enables SPA-like page transitions without JavaScript:

```astro
---
// src/layouts/BaseLayout.astro
import { ViewTransitions } from "astro:transitions";
---

<html>
  <head>
    <ViewTransitions />
  </head>
  <body>
    <slot />
  </body>
</html>
```

```astro
<!-- Named transitions for specific elements -->
<img
  src={post.image}
  alt={post.title}
  transition:name={`post-image-${post.id}`}
/>
```

```astro
<!-- Target page uses same transition name for smooth morph effect -->
<img
  src={post.image}
  alt={post.title}
  transition:name={`post-image-${post.id}`}
/>
```

The browser smoothly morphs elements between pages using the CSS View Transitions API — zero JavaScript required.

## Performance Patterns

### Image Optimization

```astro
---
import { Image, Picture } from "astro:assets";
import heroImage from "@/assets/hero.jpg";
---

<!-- Automatically optimized: WebP conversion, lazy loading, size attrs -->
<Image
  src={heroImage}
  alt="Hero"
  width={1200}
  height={600}
  format="webp"
  quality={85}
  loading="eager"  <!-- Above the fold: eager -->
/>

<!-- Responsive: generates srcset automatically -->
<Picture
  src={heroImage}
  alt="Hero"
  widths={[400, 800, 1200]}
  formats={["avif", "webp"]}
/>
```

### Font Optimization

```astro
---
// Layout.astro
---
<head>
  <!-- Astro automatically handles font preloading and display=swap -->
  <link
    rel="preload"
    as="font"
    type="font/woff2"
    href="/fonts/inter.woff2"
    crossorigin
  />
  <style>
    @font-face {
      font-family: "Inter";
      src: url("/fonts/inter.woff2") format("woff2");
      font-display: swap;
    }
  </style>
</head>
```

### Critical CSS Inlining

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import critters from "astro-critters"; // Inlines critical CSS

export default defineConfig({
  integrations: [critters()],
});
```

## Deployment

### Cloudflare Pages (Static)

```bash
npx astro add cloudflare
```

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server", // or "hybrid" for mixed SSG + SSR
  adapter: cloudflare({
    mode: "directory",
    platformProxy: { enabled: true },
  }),
});
```

### Vercel

```bash
npx astro add vercel
```

```javascript
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  output: "server",
  adapter: vercel({
    edgeMiddleware: true,
    imageService: true, // Use Vercel's image optimization
  }),
});
```

### Static Output (CDN)

```javascript
// astro.config.mjs
export default defineConfig({
  output: "static", // Default: pre-renders everything
  build: {
    assets: "_static", // Asset directory
    inlineStylesheets: "auto", // Auto-inline small stylesheets
  },
});
```

## Astro vs Next.js vs SvelteKit in 2026

| Feature | Astro 5 | Next.js 15 | SvelteKit 2 |
|---------|---------|-----------|------------|
| Default JS | 0KB | ~90KB | ~15KB |
| Content sites | ✅ Best | Possible | Possible |
| Full-stack apps | Limited | ✅ Best | ✅ Great |
| CMS integration | ✅ Native (Content Layer) | Good | Good |
| Island architecture | ✅ Native | Partial (RSC) | ❌ |
| Multi-framework | ✅ React+Vue+Svelte | React only | Svelte only |
| Lighthouse score | 95–100 | 85–95 | 90–98 |
| Build speed | Fast | Fast | Fast |

**Choose Astro when**: content-heavy site, blog, documentation, marketing site, e-commerce with mostly static content.

**Choose Next.js when**: full-stack React app, team already knows React, complex client-side state.

**Choose SvelteKit when**: full-stack with performance focus, team wants Svelte's simplicity.

## Conclusion

Astro 5 is the clearest answer to "how do I build a fast website" in 2026. The Content Layer handles every content source uniformly. Server Islands let you add personalization without sacrificing CDN caching. Zero-JS-by-default means Lighthouse 100 is achievable without heroic optimization effort.

For content sites, documentation, e-commerce storefronts, and marketing sites — Astro is the right tool. The islands architecture means you never have to choose between performance and interactivity.

---

*Related: [SvelteKit 2 Production Guide](/blog/sveltekit-2-production-guide-2026), [Web Performance 2026](/blog/web-performance-core-vitals-2026), [Edge Computing Guide](/blog/edge-computing-development-guide-2026)*
