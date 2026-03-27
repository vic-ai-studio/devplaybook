import type { APIRoute } from 'astro';

const SITE = 'https://devplaybook.cc';
const TODAY = new Date().toISOString().split('T')[0];

// All tool page slugs (from src/pages/tools/*.astro)
const toolPages = import.meta.glob('./tools/*.astro', { eager: false });

function buildUrl(url: string, changefreq: string, priority: string, lastmod: string) {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = () => {
  const slugs = Object.keys(toolPages)
    .map((path) => path.replace('./tools/', '').replace('.astro', ''))
    .filter((slug) => slug !== 'index');

  const entries = [
    buildUrl(`${SITE}/tools`, 'weekly', '0.9', TODAY),
    ...slugs.map((slug) => buildUrl(`${SITE}/tools/${slug}`, 'monthly', '0.8', TODAY)),
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
