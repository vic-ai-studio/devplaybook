#!/usr/bin/env node
/**
 * ping-sitemap.js - Ping search engines after deploy
 * Run: node scripts/ping-sitemap.js
 * Add to deploy pipeline: npm run build && node scripts/ping-sitemap.js
 */

import https from 'https';

const SITEMAP_URL = 'https://devplaybook.cc/sitemap-index.xml';

function ping(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      console.log(`  ✓ ${url.split('?')[0]} → HTTP ${res.statusCode}`);
      resolve(res.statusCode);
    });
    req.on('error', (err) => {
      console.warn(`  ✗ ${url.split('?')[0]} → ${err.message}`);
      resolve(null);
    });
    req.setTimeout(8000, () => {
      req.destroy();
      console.warn(`  ✗ timeout`);
      resolve(null);
    });
  });
}

async function main() {
  const encoded = encodeURIComponent(SITEMAP_URL);
  console.log('Pinging search engines with sitemap...');
  console.log(`Sitemap: ${SITEMAP_URL}\n`);

  await Promise.all([
    ping(`https://www.google.com/ping?sitemap=${encoded}`),
    ping(`https://www.bing.com/ping?sitemap=${encoded}`),
  ]);

  console.log('\nDone. Search engines will re-crawl sitemap within 24-48h.');
}

main();
