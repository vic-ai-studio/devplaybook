---
title: "Astro 5 Content Layer API: Complete Guide to Content Collections 2026"
description: "Master Astro 5's Content Layer API and Content Collections. Learn type-safe frontmatter, data loaders, remote content, and migration from Astro 4 with practical examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["astro", "content-collections", "typescript", "static-site", "jamstack", "web-development", "ssg"]
readingTime: "12 min read"
---

Astro 5 introduced a completely redesigned Content Layer API that changes how you manage content in Astro projects. Whether you're pulling from local Markdown files, remote CMS APIs, or databases, the new Content Layer gives you a unified, type-safe way to handle it all.

This guide walks through everything you need to know: from migrating Astro 4 content collections to leveraging new loader patterns for remote data.

---

## What Changed in Astro 5 Content Collections

Astro 4 introduced content collections as a way to organize and type-check your Markdown/MDX files. Astro 5 takes this further with the **Content Layer API** — a more flexible system built around the concept of *loaders*.

The key changes:

- **Loaders replace the legacy `type: 'content'` and `type: 'data'` pattern** — any data source can now feed a collection
- **`defineCollection()` now accepts a `loader` field** instead of just a schema
- **Built-in loaders** for file globs, JSON/YAML, and a base loader you can extend
- **Full TypeScript inference** — your schema types flow through to your pages automatically
- **Incremental builds** — content is cached and only re-fetched when needed

---

## Setting Up Content Collections in Astro 5

### Project Structure

Astro 5 content lives in `src/content/` by default, but the Content Layer can load from anywhere:

```
src/
  content/
    config.ts        # Collection definitions
    blog/
      first-post.md
      second-post.md
    authors.json
```

### Defining Collections with the Content Layer API

The `src/content/config.ts` file is where all collection definitions live:

```typescript
import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default('Anonymous'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    image: z.object({
      src: z.string(),
      alt: z.string(),
    }).optional(),
  }),
});

const authors = defineCollection({
  loader: file('./src/content/authors.json'),
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string().url(),
    social: z.object({
      twitter: z.string().optional(),
      github: z.string().optional(),
    }),
  }),
});

export const collections = { blog, authors };
```

The `glob` loader scans your filesystem for matching files. The `file` loader reads a single JSON or YAML file where the top-level keys become entry IDs.

---

## Built-in Loaders

### Glob Loader

The most common loader — scans a directory for files matching a pattern:

```typescript
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/docs',
    // generateId: optional custom ID function
    generateId: ({ entry }) => entry.replace(/\.md$/, '').replace(/\//g, '-'),
  }),
  schema: z.object({
    title: z.string(),
    section: z.enum(['guides', 'reference', 'tutorials']),
  }),
});
```

### File Loader

Loads structured data from a single file:

```typescript
import { file } from 'astro/loaders';

// JSON array → each object becomes a collection entry
const products = defineCollection({
  loader: file('./src/data/products.json'),
  schema: z.object({
    name: z.string(),
    price: z.number(),
    sku: z.string(),
    inStock: z.boolean(),
  }),
});

// YAML files work too
const config = defineCollection({
  loader: file('./src/data/site-config.yaml'),
  schema: z.object({
    siteName: z.string(),
    tagline: z.string(),
    social: z.record(z.string()),
  }),
});
```

---

## Building a Custom Loader

The real power of the Content Layer is building loaders for any data source. Here's the loader interface:

```typescript
import type { Loader, LoaderContext } from 'astro/loaders';

function myCustomLoader(options: { apiUrl: string }): Loader {
  return {
    name: 'my-custom-loader',
    load: async ({ store, meta, logger }: LoaderContext) => {
      logger.info('Fetching data...');

      // `meta` persists between builds for incremental updates
      const lastModified = meta.get('lastModified');

      const response = await fetch(options.apiUrl, {
        headers: lastModified
          ? { 'If-Modified-Since': lastModified }
          : {},
      });

      if (response.status === 304) {
        logger.info('Content unchanged, skipping');
        return;
      }

      const data = await response.json();
      const newLastModified = response.headers.get('Last-Modified');

      // Clear and repopulate the store
      store.clear();
      for (const item of data.items) {
        store.set({
          id: item.slug,
          data: item,
          // For Markdown content, pass the raw string:
          // body: item.markdownContent,
        });
      }

      if (newLastModified) {
        meta.set('lastModified', newLastModified);
      }
    },
  };
}
```

The `LoaderContext` provides:
- `store` — add/update/delete/clear entries
- `meta` — key-value store persisted between builds (great for ETags, cursors)
- `logger` — Astro's build logger
- `config` — the full Astro config
- `parseData` — validate data against your schema
- `generateDigest` — hash strings for change detection

---

## Remote Content: CMS Integration

### Fetching from a Headless CMS

Here's a real-world example using a generic CMS API:

```typescript
// src/loaders/contentful-loader.ts
import type { Loader } from 'astro/loaders';

interface ContentfulOptions {
  spaceId: string;
  accessToken: string;
  contentType: string;
}

export function contentfulLoader(options: ContentfulOptions): Loader {
  const baseUrl = `https://cdn.contentful.com/spaces/${options.spaceId}`;

  return {
    name: `contentful-${options.contentType}`,
    load: async ({ store, meta, logger }) => {
      const etag = meta.get('etag');

      const res = await fetch(
        `${baseUrl}/entries?content_type=${options.contentType}&include=2`,
        {
          headers: {
            Authorization: `Bearer ${options.accessToken}`,
            ...(etag && { 'If-None-Match': etag }),
          },
        }
      );

      if (res.status === 304) {
        logger.info(`${options.contentType}: no changes`);
        return;
      }

      const newEtag = res.headers.get('etag');
      if (newEtag) meta.set('etag', newEtag);

      const json = await res.json();

      store.clear();
      for (const entry of json.items) {
        store.set({
          id: entry.sys.id,
          data: {
            title: entry.fields.title,
            slug: entry.fields.slug,
            body: entry.fields.body,
            publishedAt: entry.sys.createdAt,
          },
        });
      }

      logger.info(`Loaded ${json.items.length} ${options.contentType} entries`);
    },
  };
}
```

Then register it:

```typescript
// src/content/config.ts
import { contentfulLoader } from '../loaders/contentful-loader';

const posts = defineCollection({
  loader: contentfulLoader({
    spaceId: import.meta.env.CONTENTFUL_SPACE_ID,
    accessToken: import.meta.env.CONTENTFUL_ACCESS_TOKEN,
    contentType: 'blogPost',
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    body: z.string(),
    publishedAt: z.coerce.date(),
  }),
});
```

---

## Querying Collections in Pages

### Basic Queries

```typescript
---
import { getCollection, getEntry } from 'astro:content';

// Get all entries (with optional filter)
const allPosts = await getCollection('blog');
const publishedPosts = await getCollection('blog', ({ data }) => !data.draft);

// Sort by date
const sortedPosts = publishedPosts.sort(
  (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
);

// Get a single entry by ID
const post = await getEntry('blog', 'my-post-slug');
---
```

### Dynamic Routes

```typescript
---
// src/pages/blog/[slug].astro
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);

  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, headings, remarkPluginFrontmatter } = await render(post);
---

<article>
  <h1>{post.data.title}</h1>
  <time>{post.data.date.toLocaleDateString()}</time>
  <Content />
</article>
```

Note: In Astro 5, use `render()` instead of the old `post.render()` method.

### Joining Collections

Astro doesn't have foreign key joins built-in, but you can do them manually:

```typescript
---
import { getCollection, getEntry } from 'astro:content';

const posts = await getCollection('blog');

// Enrich posts with author data
const enrichedPosts = await Promise.all(
  posts.map(async (post) => {
    const author = post.data.authorId
      ? await getEntry('authors', post.data.authorId)
      : null;
    return { ...post, author };
  })
);
---
```

---

## Migrating from Astro 4 Content Collections

The legacy Astro 4 collections API still works in Astro 5 (via a compatibility shim), but migration is straightforward:

**Before (Astro 4):**
```typescript
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});
```

**After (Astro 5):**
```typescript
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});
```

The main changes:
1. Replace `type: 'content'` with `loader: glob({...})`
2. Replace `type: 'data'` with `loader: file({...})` or a custom loader
3. Update any `post.render()` calls to the standalone `render(post)` function
4. Update import references from `astro:content` (most stay the same)

---

## Advanced Patterns

### Incremental Loading with Digests

For large collections, use content digests to skip unchanged entries:

```typescript
load: async ({ store, generateDigest }) => {
  const items = await fetchItems();

  for (const item of items) {
    const digest = generateDigest(JSON.stringify(item));
    const existing = store.get(item.id);

    if (existing?.digest === digest) continue; // skip unchanged

    store.set({
      id: item.id,
      data: item,
      digest,
    });
  }
}
```

### Rendered Content from Remote Sources

If your CMS returns HTML or Markdown strings, you can inject rendered content:

```typescript
store.set({
  id: entry.id,
  data: entry.fields,
  body: entry.fields.markdownContent, // raw Markdown
  rendered: {
    html: entry.fields.htmlContent, // pre-rendered HTML
    metadata: {
      headings: [], // optional heading extraction
    },
  },
});
```

### Schema Transformations

Zod's `.transform()` lets you shape incoming data:

```typescript
schema: z.object({
  title: z.string(),
  publishedAt: z.string().transform((str) => new Date(str)),
  tags: z.union([
    z.array(z.string()),
    z.string().transform((s) => s.split(',').map((t) => t.trim())),
  ]),
  readingTime: z.number().transform((minutes) => `${minutes} min read`),
}),
```

---

## Performance: The Content Layer Advantage

The Content Layer's build performance improvements over Astro 4:

- **Persistent store** — `store` and `meta` survive between builds. Your loader only re-fetches changed content.
- **Parallel loading** — all loaders run concurrently during build
- **Dev mode caching** — in `astro dev`, content is cached and only invalidated when files change
- **Type generation is incremental** — `.astro/content.d.ts` only regenerates when schemas change

For a blog with 500 posts, this typically cuts content-related build time by 60–80% after the first build.

---

## TypeScript Integration

The Content Layer generates types automatically. After running `astro dev` or `astro build`, you get:

```typescript
// .astro/content.d.ts (auto-generated, commit to .gitignore or not — your choice)
declare module 'astro:content' {
  interface Register {
    content: typeof import('../src/content/config')['collections'];
  }
}
```

This means `getCollection('blog')` returns `CollectionEntry<'blog'>[]` with your exact schema types — no manual type casting required.

---

## Common Pitfalls

**1. Forgetting `export const collections`**
Your `config.ts` must export a `collections` object. If you define a collection but don't export it, Astro won't register it.

**2. Schema/data mismatch in production**
Development builds may be more lenient. Always run `astro build` before deploying to catch schema validation errors across all entries.

**3. Absolute vs relative paths in loaders**
`glob` and `file` resolve paths relative to the project root, not `src/content/config.ts`. Use `./src/content/...` not `../content/...`.

**4. Remote data in `getStaticPaths`**
If you're fetching remote data, make sure your loader handles network failures gracefully — a failed `fetch()` will break your entire build.

---

## Quick Reference

| Task | Astro 4 | Astro 5 |
|------|---------|---------|
| Define local MD collection | `type: 'content'` | `loader: glob({...})` |
| Define JSON/YAML collection | `type: 'data'` | `loader: file({...})` |
| Remote data | Not built-in | Custom loader |
| Render entry | `entry.render()` | `render(entry)` |
| Get collection | `getCollection('blog')` | Same |
| Entry type | `CollectionEntry<'blog'>` | Same |

---

## Summary

Astro 5's Content Layer API is a significant upgrade from the file-based collections in Astro 4. The loader pattern gives you a clean abstraction for any data source — local files, remote APIs, databases — with full TypeScript support and incremental build caching built-in.

Start with the built-in `glob` and `file` loaders for local content, then build custom loaders as your needs grow. The API is designed to be minimal while remaining composable — a good fit for both personal blogs and large-scale content sites.
