import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://devplaybook.cc';

function buildUrl(url: string, changefreq: string, priority: string, lastmod: string) {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');

  // Sort by date descending
  posts.sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  const entries = [
    buildUrl(`${SITE}/blog`, 'daily', '0.8', new Date().toISOString().split('T')[0]),
    ...posts.map((post) => {
      const lastmod = post.data.updatedDate || post.data.date;
      return buildUrl(`${SITE}/blog/${post.id}`, 'monthly', '0.7', lastmod);
    }),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
