import type { APIRoute } from 'astro';

const SITE = 'https://devplaybook.cc';
const TODAY = new Date().toISOString().split('T')[0];

// Indexable static pages (excludes noindex pages: 404, affiliate, analytics,
// payment-result, pro-cancel, pro-dashboard, pro-success, pro-waitlist-thanks, signin)
const staticPages: Array<{ slug: string; changefreq: string; priority: string }> = [
  { slug: '',               changefreq: 'daily',   priority: '1.0' }, // homepage
  { slug: 'about',          changefreq: 'monthly', priority: '0.6' },
  { slug: 'pricing',        changefreq: 'weekly',  priority: '0.8' },
  { slug: 'pro',            changefreq: 'weekly',  priority: '0.8' },
  { slug: 'resources',      changefreq: 'weekly',  priority: '0.7' },
  { slug: 'ai-tools',       changefreq: 'weekly',  priority: '0.7' },
  { slug: 'ai-writing-tools', changefreq: 'weekly', priority: '0.7' },
  { slug: 'ai-writing-prompt-generator', changefreq: 'weekly', priority: '0.7' },
  { slug: 'deals',          changefreq: 'weekly',  priority: '0.7' },
  { slug: 'bundles',        changefreq: 'weekly',  priority: '0.7' },
  { slug: 'daily-challenge', changefreq: 'daily',  priority: '0.6' },
  { slug: 'free-checklist', changefreq: 'monthly', priority: '0.6' },
  { slug: 'newsletter',     changefreq: 'monthly', priority: '0.5' },
  { slug: 'api-docs',       changefreq: 'monthly', priority: '0.5' },
  { slug: 'my-dev-setup',   changefreq: 'monthly', priority: '0.5' },
  { slug: 'uses',           changefreq: 'monthly', priority: '0.5' },
  { slug: 'sponsors',       changefreq: 'monthly', priority: '0.4' },
  { slug: 'advertise',      changefreq: 'monthly', priority: '0.4' },
  { slug: 'pro-waitlist',   changefreq: 'monthly', priority: '0.5' },
];

function buildUrl(url: string, changefreq: string, priority: string, lastmod: string) {
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const GET: APIRoute = () => {
  const entries = staticPages
    .map(({ slug, changefreq, priority }) => {
      const loc = slug ? `${SITE}/${slug}/` : `${SITE}/`;
      return buildUrl(loc, changefreq, priority, TODAY);
    })
    .join('\n');

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
