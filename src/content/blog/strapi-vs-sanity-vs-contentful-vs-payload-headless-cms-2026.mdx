---
title: "Strapi vs Sanity vs Contentful vs Payload CMS: Headless CMS for Developers 2026"
description: "Comprehensive comparison of Strapi, Sanity, Contentful, and Payload CMS in 2026 — self-hosted vs cloud, content modeling, API types, pricing, developer experience, and which to choose for your project."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["strapi", "sanity", "contentful", "payload-cms", "headless-cms", "content-management", "api", "backend"]
readingTime: "16 min read"
---

The headless CMS market has matured dramatically. Where developers once debated whether to go headless at all, the conversation in 2026 is about which headless CMS fits their specific architecture — and the wrong choice creates real pain when you need custom fields, an API type your CMS does not support natively, or a content model that does not fit the defaults.

Four platforms dominate serious developer attention: **Strapi**, **Sanity**, **Contentful**, and **Payload CMS**. Each has a distinct philosophy, and each is the obvious best choice in specific scenarios.

---

## What "Headless" Actually Means in 2026

A headless CMS separates content management from content delivery. Your editors use a web interface to create and manage content. Your frontend — whether Next.js, Astro, a mobile app, or a digital signage system — fetches that content via API.

The four tools here differ in three critical dimensions:
1. **Where it runs** (your infrastructure vs. their cloud)
2. **How content is modeled** (code vs. GUI vs. schema files)
3. **How content is queried** (REST vs. GraphQL vs. custom query language)

---

## Feature Comparison at a Glance

| Feature | Strapi | Sanity | Contentful | Payload |
|---|---|---|---|---|
| Self-hosted | ✅ Free | ✅ Free | ❌ Cloud only | ✅ Free |
| Cloud hosting | ✅ Strapi Cloud | ✅ Sanity.io | ✅ Native | ✅ Payload Cloud |
| Open source | ✅ Full | ⚠️ Studio only | ❌ Closed | ✅ Full |
| REST API | ✅ Auto-generated | ✅ Via GROQ/HTTP | ✅ Full | ✅ Auto-generated |
| GraphQL API | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| Content modeling | GUI + Code | Code (schemas) | GUI + Code | Code (TypeScript) |
| Real-time collaboration | ❌ | ✅ | ✅ | ❌ |
| Built-in image transforms | ⚠️ Plugin | ✅ Sanity CDN | ✅ | ⚠️ Plugin |
| Typed content models | ⚠️ Generated | ⚠️ Generated | ⚠️ Generated | ✅ Native TypeScript |
| Version history | ✅ | ✅ | ✅ | ✅ |
| Localization | ✅ | ✅ | ✅ | ✅ |
| Free tier | ✅ Self-hosted | ✅ 3 users, 2 projects | ✅ 5 users limited | ✅ Self-hosted |
| Plugin ecosystem | ✅ Large | ✅ Large | ✅ Enterprise | ✅ Growing |

---

## Strapi: The Open Source API Generator

### The Strapi Philosophy

Strapi is a headless CMS that generates a full REST and GraphQL API from your content types. You define content through a GUI or through JSON schema files, and Strapi handles authentication, permissions, and API generation automatically.

It runs on Node.js and persists to PostgreSQL, MySQL, SQLite, or MongoDB. Self-hosting is free and unlimited.

### Getting Started

```bash
npx create-strapi-app@latest my-cms --quickstart
# Or with specific database
npx create-strapi-app@latest my-cms \
  --dbclient=postgres \
  --dbhost=localhost \
  --dbname=strapi_db
```

### Content Types via Code

You can define content types programmatically instead of using the GUI:

```javascript
// src/api/article/content-types/article/schema.json
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "singularName": "article",
    "pluralName": "articles",
    "displayName": "Article"
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true,
      "maxLength": 200
    },
    "content": {
      "type": "richtext"
    },
    "slug": {
      "type": "uid",
      "targetField": "title"
    },
    "publishedDate": {
      "type": "date"
    },
    "author": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::author.author",
      "inversedBy": "articles"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::tag.tag"
    }
  }
}
```

### Querying the Strapi API

```javascript
// Fetch articles with filtering, sorting, and population
const response = await fetch(
  'https://your-strapi.com/api/articles?' +
  new URLSearchParams({
    'filters[publishedDate][$gte]': '2026-01-01',
    'populate': 'author,tags,cover',
    'sort': 'publishedDate:desc',
    'pagination[limit]': '10',
  })
);

const { data, meta } = await response.json();

// Or use the official SDK
import { createClient } from '@strapi/client';
const client = createClient({
  baseURL: 'https://your-strapi.com',
  auth: process.env.STRAPI_API_KEY,
});

const articles = await client.collection('articles').find({
  filters: { featured: true },
  populate: ['author', 'categories'],
});
```

### Strapi Limitations

Strapi's GUI-driven content type builder creates JSON files in your codebase, which can cause merge conflicts in teams. The migration story for content type changes in production is painful — schema changes require careful database migrations that Strapi generates but does not always get right.

The plugin ecosystem is large but inconsistency in quality is a real issue. Performance at scale requires careful configuration of caching and database indexes that are not obvious from the defaults.

---

## Sanity: Structured Content with Real-Time Collaboration

### The Sanity Philosophy

Sanity treats content as structured data, not documents. Your content schema is defined in JavaScript, version-controlled alongside your application code, and the Sanity Studio (the editing UI) is a React application you customize and deploy yourself.

The GROQ query language is unique to Sanity and more powerful than REST filtering for complex content graphs. Real-time collaboration is built in — multiple editors can work on the same document simultaneously.

### Defining Content Schemas

```javascript
// schemas/article.js
export default {
  name: 'article',
  title: 'Article',
  type: 'document',
  fields: [
    {
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: Rule => Rule.required().max(200)
    },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' }
    },
    {
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: 'author' }]
    },
    {
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        { type: 'block' }, // Rich text
        { type: 'image' },
        {
          type: 'object',
          name: 'codeBlock',
          fields: [
            { name: 'language', type: 'string' },
            { name: 'code', type: 'text' }
          ]
        }
      ]
    },
    {
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        { name: 'metaTitle', type: 'string' },
        { name: 'metaDescription', type: 'text' },
        { name: 'ogImage', type: 'image' }
      ]
    }
  ]
}
```

### Querying with GROQ

GROQ (Graph-Relational Object Queries) is Sanity's query language. It is more expressive than REST for complex content:

```javascript
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: 'production',
  useCdn: true,
  apiVersion: '2026-03-27',
});

// Fetch articles with nested references
const articles = await client.fetch(
  `*[_type == "article" && defined(slug.current)] | order(publishedDate desc) [0...10] {
    title,
    "slug": slug.current,
    publishedDate,
    "author": author-> {
      name,
      "avatar": image.asset->url
    },
    "categories": categories[]-> { title, slug },
    "mainImage": mainImage.asset->url,
    excerpt
  }`
);

// Conditional filtering with GROQ
const featuredAndRecent = await client.fetch(
  `*[_type == "article" && featured == true && dateTime(publishedDate) > dateTime(now()) - 60*60*24*30] {
    title,
    slug,
    publishedDate
  }`
);
```

### Sanity's Image Pipeline

Sanity's asset pipeline is a differentiator. You get URL-based image transformations at the CDN level:

```javascript
import imageUrlBuilder from '@sanity/image-url';

const builder = imageUrlBuilder(client);

function urlFor(source) {
  return builder.image(source);
}

// Transform images via URL parameters
const heroImage = urlFor(article.mainImage)
  .width(1200)
  .height(630)
  .format('webp')
  .quality(80)
  .url();

const thumbnail = urlFor(article.mainImage)
  .width(400)
  .height(300)
  .crop('center')
  .fit('crop')
  .url();
```

### Sanity Limitations

GROQ has a learning curve. If your team is familiar with GraphQL or SQL, GROQ requires re-learning query patterns. The real-time collaboration features require Sanity's hosted backend (no self-hosted real-time sync). Free tier is limited to 3 users and 2 projects.

---

## Contentful: The Enterprise Standard

### The Contentful Philosophy

Contentful is the most mature and enterprise-focused of the four. It has been running at scale since 2014 and has battle-tested infrastructure for high-traffic content delivery, complex multi-locale setups, and large editor teams.

It is cloud-only — there is no self-hosted option. Content modeling is done in the GUI or via the Migration API, and content is delivered via REST or GraphQL.

### Content Modeling via Migration API

```javascript
// migrations/001-create-article.cjs
module.exports = function(migration) {
  const article = migration.createContentType('article', {
    name: 'Article',
    displayField: 'title',
  });

  article.createField('title', {
    name: 'Title',
    type: 'Symbol',
    required: true,
    validations: [{ size: { max: 200 } }]
  });

  article.createField('slug', {
    name: 'Slug',
    type: 'Symbol',
    required: true,
    validations: [{ unique: true }]
  });

  article.createField('content', {
    name: 'Content',
    type: 'RichText',
    validations: [{
      nodes: {
        'embedded-asset-block': [],
        'embedded-entry-block': [
          { linkContentType: ['codeBlock', 'callout'] }
        ]
      }
    }]
  });

  article.createField('author', {
    name: 'Author',
    type: 'Link',
    linkType: 'Entry',
    validations: [{ linkContentType: ['author'] }]
  });
};
```

```bash
contentful space migration --space-id $SPACE_ID migrations/001-create-article.cjs
```

### Querying Contentful

```javascript
import contentful from 'contentful';

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN,
});

// Fetch with includes for nested entries
const articles = await client.getEntries({
  content_type: 'article',
  'fields.featured': true,
  order: '-fields.publishedDate',
  limit: 10,
  include: 2, // Resolve 2 levels of references
  select: 'fields.title,fields.slug,fields.author,fields.publishedDate'
});

// GraphQL alternative
const gqlResponse = await fetch(
  `https://graphql.contentful.com/content/v1/spaces/${SPACE_ID}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      query: `
        query {
          articleCollection(limit: 10, order: publishedDate_DESC) {
            items {
              title
              slug
              publishedDate
              author {
                name
                picture { url }
              }
            }
          }
        }
      `,
    }),
  }
);
```

### Contentful Limitations

Cost is the main barrier for small teams. The free tier is limited to 5 users and 25,000 API calls per month. Meaningful team usage starts at hundreds of dollars monthly. There is no path to self-hosting, which is a dealbreaker for some compliance requirements.

---

## Payload CMS: The TypeScript-First Option

### The Payload Philosophy

Payload is the newest of the four, launched in 2021 and reaching v3 in 2024. It is TypeScript-first — your content schema is TypeScript code, and types are generated automatically for all your collections and globals. It runs in your Node.js application, which means it can share your existing database and authentication system.

Payload v3 integrates directly with Next.js App Router, allowing you to run the CMS admin panel inside your Next.js application.

### Defining Collections

```typescript
// payload.config.ts
import { buildConfig } from 'payload';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { slateEditor } from '@payloadcms/richtext-slate';

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_URL,
  admin: {
    user: 'users',
  },
  editor: slateEditor({}),
  collections: [
    {
      slug: 'articles',
      admin: {
        useAsTitle: 'title',
        defaultColumns: ['title', 'author', 'status', 'publishedDate'],
      },
      access: {
        read: () => true,
        create: isAuthenticated,
        update: isAuthenticated,
        delete: isAdminOrAuthor,
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          maxLength: 200,
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'content',
          type: 'richText',
        },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: ['draft', 'published', 'archived'],
          defaultValue: 'draft',
          admin: { position: 'sidebar' },
        },
        {
          name: 'publishedDate',
          type: 'date',
          admin: {
            position: 'sidebar',
            date: { pickerAppearance: 'dayOnly' },
          },
        },
        {
          name: 'seo',
          type: 'group',
          fields: [
            { name: 'title', type: 'text' },
            { name: 'description', type: 'textarea' },
            { name: 'image', type: 'upload', relationTo: 'media' },
          ],
        },
      ],
    },
  ],
  db: mongooseAdapter({ url: process.env.MONGODB_URI }),
});
```

### Querying Payload

```typescript
// In your Next.js app (server component)
import { getPayloadClient } from '../payload/payloadClient';

const payload = await getPayloadClient();

const { docs: articles } = await payload.find({
  collection: 'articles',
  where: {
    status: { equals: 'published' },
    publishedDate: { less_than_equal: new Date().toISOString() },
  },
  sort: '-publishedDate',
  limit: 10,
  depth: 2, // Resolve relationships
});

// Full TypeScript types generated from your schema
// articles[0].title is typed as string
// articles[0].author is typed as User (resolved)
```

### Next.js Integration

Payload v3's Next.js integration is a significant differentiator:

```typescript
// next.config.mjs
import { withPayload } from '@payloadcms/next/withPayload';

export default withPayload({
  // Your existing Next.js config
});
```

The admin panel lives at `/admin` in your Next.js app. No separate server to deploy.

### Payload Limitations

Payload is the youngest platform — the ecosystem is smaller than Strapi or Contentful. The rich text editor (Slate-based in v2, Lexical in v3) is less polished than Sanity's block content or Contentful's embedded entries. Real-time collaboration is not built in.

---

## Migration Guide Pointers

**Contentful → Strapi:** Use the Contentful Management API to export entries, then write a migration script to POST them to Strapi's REST API. Content types need manual recreation. Budget 1-2 weeks for a medium-sized content library.

**Strapi → Sanity:** Strapi's export tool generates JSON. Write GROQ mutations to import into Sanity using `sanity dataset import`. Rich text migration is the hardest part — Strapi's Markdown and Sanity's Portable Text are structurally different.

**Any CMS → Payload:** Since Payload uses a standard database, you can write a migration script using any language that connects to MongoDB or PostgreSQL. The main work is mapping content type fields to Payload collection fields.

---

## Pricing Summary (2026)

| Plan | Strapi | Sanity | Contentful | Payload |
|---|---|---|---|---|
| Free | Self-hosted unlimited | 3 users, 500K API req/month | 5 users, 25K req/month | Self-hosted unlimited |
| Small team | $29/month (Cloud) | $15/seat/month | $300/month | $19/month (Cloud) |
| Scale | $99/month | Custom | Custom | Custom |
| Self-hosted | Always free | Free (no real-time) | Not available | Always free |

---

## Which CMS to Choose

### Choose Strapi when:
- You need a self-hosted, open source solution with no ongoing licensing costs
- Your team is comfortable with Node.js and wants to customize the admin panel
- You need a full REST and GraphQL API generated automatically from your content model
- You are migrating from WordPress and need a familiar concept of posts, pages, and categories

### Choose Sanity when:
- Real-time collaboration between editors is a requirement
- You have complex content models with custom block types (think interactive embeds, code blocks, complex media)
- Your team can adopt GROQ and benefit from its expressive querying
- You need powerful image transformation at the CDN level

### Choose Contentful when:
- You are at enterprise scale with large editor teams and complex multi-locale requirements
- Budget is not the primary constraint and you need SLA guarantees
- Your content operations team needs a polished, stable UI with excellent localization workflows
- You are integrating with enterprise systems (Salesforce, SAP) that already have Contentful connectors

### Choose Payload when:
- You are building a Next.js App Router application and want CMS + app in one deployment
- TypeScript-first development is important to your team
- You want full ownership of your data without vendor lock-in
- You need authentication and content management in the same system (Payload handles both)

---

## The Bottom Line

In 2026, there is no wrong choice among these four — only wrong choices for your specific context.

**Strapi** is the safest default for teams that want open source, self-hosted, and a familiar CMS experience. Its rough edges are known and the community is large enough that most problems have Stack Overflow answers.

**Sanity** is the best choice for content-heavy products where editors collaborate intensively and content models need to evolve rapidly. The developer experience is excellent once you invest in learning GROQ.

**Contentful** is the choice when you need enterprise guarantees and can afford enterprise pricing. For startups and small teams, the cost is hard to justify when free alternatives are this capable.

**Payload** is the most exciting option for 2026, particularly for teams building Next.js applications. TypeScript-first content modeling and first-class App Router integration make it the most ergonomic choice for modern full-stack development.

Start with what fits your deployment model: if you want cloud with zero ops, Sanity or Contentful. If you want self-hosted with TypeScript, Payload. If you want self-hosted with a large ecosystem and GUI-first tooling, Strapi.
