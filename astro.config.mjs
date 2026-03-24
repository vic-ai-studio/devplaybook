// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://devplaybook.cc',
  compressHTML: true,
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