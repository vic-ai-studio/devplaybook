import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://devplaybook.cc';
const FEED_TITLE = 'DevPlaybook — Developer Productivity Blog';
const FEED_DESCRIPTION =
  'Tutorials, tools, and tips to help developers ship faster. Free tools, AI workflows, and productivity guides.';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog');

  // Sort newest first, take top 20
  const latest = posts
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime())
    .slice(0, 20);

  const items = latest
    .map((post) => {
      const url = `${SITE}/blog/${post.id}/`;
      const pubDate = new Date(post.data.date).toUTCString();
      const tags = post.data.tags.map((t) => `<category>${escapeXml(t)}</category>`).join('\n      ');
      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(post.data.description)}</description>
      <author>noreply@devplaybook.cc (${escapeXml(post.data.author)})</author>
      ${tags}
    </item>`;
    })
    .join('\n');

  const buildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE}/blog/</link>
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${SITE}/og-blog.png</url>
      <title>${escapeXml(FEED_TITLE)}</title>
      <link>${SITE}/blog/</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
