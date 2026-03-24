// @ts-check
import { defineConfig } from 'astro/config';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
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