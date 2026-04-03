import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.union([z.string(), z.date()]).optional(),
    pubDate: z.union([z.string(), z.date()]).optional(),
    author: z.string().default('DevPlaybook Team'),
    tags: z.array(z.string()).optional().default([]),
    readingTime: z.union([z.string(), z.number()]).optional(),
    updatedDate: z.union([z.string(), z.date()]).optional(),
    ogImage: z.string().optional(),
    category: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }).passthrough(),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    pricing: z.string(),
    pricingDetail: z.string().optional(),
    website: z.string(),
    github: z.string().optional(),
    tags: z.array(z.string()),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    date: z.string(),
  }),
});

export const collections = { blog, tools };
