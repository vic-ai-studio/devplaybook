// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://devplaybook.cc',
  integrations: [
    preact(),
    sitemap({
      filter: (page) =>
        !page.includes('/api/') &&
        !page.endsWith('/pro-cancel') &&
        !page.endsWith('/pro-success'),
      serialize(item) {
        // Home page
        if (item.url === 'https://devplaybook.cc/') {
          return { ...item, changefreq: 'daily', priority: 1.0 };
        }
        // Tool pages
        if (item.url.includes('/tools/')) {
          return { ...item, changefreq: 'monthly', priority: 0.9 };
        }
        // Product pages
        if (item.url.includes('/products/') || item.url.endsWith('/products')) {
          return { ...item, changefreq: 'weekly', priority: 0.8 };
        }
        // Blog articles
        if (item.url.includes('/blog/')) {
          return { ...item, changefreq: 'monthly', priority: 0.7 };
        }
        // Default
        return { ...item, changefreq: 'weekly', priority: 0.6 };
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