// @ts-check
import { defineConfig } from 'astro/config';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import { visit } from 'unist-util-visit';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Remark plugin: auto-link first occurrence of tool keywords in article text.
 *  - Skips headings, code blocks, and already-linked text.
 *  - Links each keyword at most once per article.
 *  - Only inserts links for keywords with word-boundary matches.
 */
function remarkToolAutoLink() {
  let toolMap;
  try {
    const mapPath = join(__dirname, 'src/data/tool-keyword-map.json');
    toolMap = JSON.parse(readFileSync(mapPath, 'utf-8'));
  } catch {
    return () => {};
  }

  // Build sorted keyword → path lookup (longest first to avoid partial matches)
  const entries = [];
  for (const [slug, tool] of Object.entries(toolMap)) {
    for (const kw of (tool.keywords || [])) {
      if (kw && kw.length >= 6) {
        entries.push({ kw: kw.toLowerCase(), path: tool.path, title: tool.title });
      }
    }
  }
  entries.sort((a, b) => b.kw.length - a.kw.length);

  return (tree) => {
    const usedPaths = new Set();

    visit(tree, 'text', (node, index, parent) => {
      // Skip if inside heading, link, code, or inlineCode
      if (!parent) return;
      const parentType = parent.type;
      if (parentType === 'link' || parentType === 'heading' || parentType === 'code' || parentType === 'inlineCode') return;

      const text = node.value;
      const lowerText = text.toLowerCase();

      for (const { kw, path, title } of entries) {
        if (usedPaths.has(path)) continue;
        const idx = lowerText.indexOf(kw);
        if (idx === -1) continue;

        // Word-boundary check
        const before = idx === 0 ? '' : text[idx - 1];
        const after = idx + kw.length >= text.length ? '' : text[idx + kw.length];
        const wordBefore = !before || /\W/.test(before);
        const wordAfter = !after || /\W/.test(after);
        if (!wordBefore || !wordAfter) continue;

        usedPaths.add(path);

        // Split node into [before-text, link, after-text]
        const beforeText = text.slice(0, idx);
        const matchText = text.slice(idx, idx + kw.length);
        const afterText = text.slice(idx + kw.length);

        const newNodes = [];
        if (beforeText) newNodes.push({ type: 'text', value: beforeText });
        newNodes.push({
          type: 'link',
          url: path,
          title: title,
          children: [{ type: 'text', value: matchText }],
        });
        if (afterText) newNodes.push({ type: 'text', value: afterText });

        parent.children.splice(index, 1, ...newNodes);
        return; // one link per text node
      }
    });
  };
}

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
    remarkPlugins: [remarkToolAutoLink],
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