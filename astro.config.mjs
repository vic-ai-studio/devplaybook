// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { visit } from 'unist-util-visit';

/** Rehype plugin: auto-add loading="lazy" + decoding="async" to all markdown images.
 *  Skips images that already have loading="eager" or fetchpriority="high" (LCP candidates).
 *  Improves LCP by not blocking the main thread loading off-screen images.
 */
function rehypeImgLazy() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      const props = node.properties || {};
      if (props.loading === 'eager' || props.fetchpriority === 'high') return;
      props.loading = 'lazy';
      props.decoding = 'async';
      node.properties = props;
    });
  };
}

// https://astro.build/config
export default defineConfig({
  site: 'https://devplaybook.cc',
  compressHTML: true,
  markdown: {
    rehypePlugins: [rehypeImgLazy],
  },
  build: {
    inlineStylesheets: 'auto',
    assetFileNames: '_astro/[name].[hash][extname]',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        !page.includes('/api/') &&
        !page.includes('/pro-cancel') &&
        !page.includes('/pro-success') &&
        !page.includes('/pro-dashboard') &&
        !page.includes('/pro-waitlist-thanks') &&
        !page.includes('/signin') &&
        !page.includes('/admin/'),
      serialize(item) {
        const lastmod = new Date().toISOString().split('T')[0];
        // Home page
        if (item.url === 'https://devplaybook.cc/') {
          return { ...item, changefreq: 'daily', priority: 1.0, lastmod };
        }
        // Tool pages
        if (item.url.includes('/tools/')) {
          return { ...item, changefreq: 'monthly', priority: 0.9, lastmod };
        }
        // Product pages
        if (item.url.includes('/products/') || item.url.endsWith('/products')) {
          return { ...item, changefreq: 'weekly', priority: 0.8, lastmod };
        }
        // Blog articles
        if (item.url.includes('/blog/')) {
          return { ...item, changefreq: 'monthly', priority: 0.7, lastmod };
        }
        // Default
        return { ...item, changefreq: 'weekly', priority: 0.6, lastmod };
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
    build: {
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Split vendor chunks for better caching
          manualChunks(id) {
            if (id.includes('node_modules/preact')) return 'preact';
            if (id.includes('node_modules/web-vitals')) return 'web-vitals';
          }
        }
      }
    }
  }
});