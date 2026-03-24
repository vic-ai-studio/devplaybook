import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    author: z.string().default('DevPlaybook Team'),
    tags: z.array(z.string()),
    readingTime: z.string(),
    updatedDate: z.string().optional(),
    ogImage: z.string().optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string(),
    })).optional(),
  }),
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
