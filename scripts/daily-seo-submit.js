#!/usr/bin/env node
/**
 * daily-seo-submit.js - Daily SEO submission runner
 *
 * Runs:
 *   1. Sitemap ping (Google + Bing)
 *   2. IndexNow URL submission (Bing + Yandex via api.indexnow.org)
 *
 * Scheduled via PM2 cron: runs daily at 06:00 UTC
 * Usage: node scripts/daily-seo-submit.js
 */

import https from 'https';

const SITEMAP_URL = 'https://devplaybook.cc/sitemap-index.xml';
const INDEXNOW_KEY = '1c4ece75e8e5941ade2d87c650fffec0';
const HOST = 'devplaybook.cc';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

const URLS = [
  'https://devplaybook.cc/',
  'https://devplaybook.cc/tools/',
  'https://devplaybook.cc/blog/',
  'https://devplaybook.cc/products/',
  'https://devplaybook.cc/my-dev-setup/',
  'https://devplaybook.cc/free-checklist/',
  'https://devplaybook.cc/tools/json-formatter/',
  'https://devplaybook.cc/tools/base64/',
  'https://devplaybook.cc/tools/regex-tester/',
  'https://devplaybook.cc/tools/url-encoder/',
  'https://devplaybook.cc/tools/markdown-preview/',
  'https://devplaybook.cc/tools/color-picker/',
  'https://devplaybook.cc/tools/timestamp-converter/',
  'https://devplaybook.cc/tools/jwt-decoder/',
  'https://devplaybook.cc/blog/claude-code-vs-cursor-vs-copilot/',
  'https://devplaybook.cc/blog/build-your-first-ai-agent/',
  'https://devplaybook.cc/blog/developer-productivity-tools-2026/',
  'https://devplaybook.cc/blog/api-design-checklist/',
];

function httpGet(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      console.log(`  ✓ ${url.split('?')[0]} → HTTP ${res.statusCode}`);
      resolve(res.statusCode);
    });
    req.on('error', (err) => {
      console.warn(`  ✗ ${url.split('?')[0]} → ${err.message}`);
      resolve(null);
    });
    req.setTimeout(10000, () => {
      req.destroy();
      console.warn(`  ✗ timeout`);
      resolve(null);
    });
  });
}

function postJson(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(data);
    req.end();
  });
}

async function pingSitemaps() {
  console.log('\n[1] Sitemap ping (Google + Bing)');
  const encoded = encodeURIComponent(SITEMAP_URL);
  await Promise.all([
    httpGet(`https://www.google.com/ping?sitemap=${encoded}`),
    httpGet(`https://www.bing.com/ping?sitemap=${encoded}`),
  ]);
}

async function submitIndexNow(endpoint) {
  const payload = { host: HOST, key: INDEXNOW_KEY, keyLocation: KEY_LOCATION, urlList: URLS };
  try {
    const result = await postJson(endpoint, '/indexnow', payload);
    const ok = result.status === 200 || result.status === 202;
    console.log(`  ${ok ? '✓' : '✗'} ${endpoint} → HTTP ${result.status}`);
  } catch (err) {
    console.log(`  ✗ ${endpoint} → ${err.message}`);
  }
}

async function main() {
  const now = new Date().toISOString();
  console.log(`DevPlaybook Daily SEO Submit — ${now}`);
  console.log('='.repeat(50));

  await pingSitemaps();

  console.log(`\n[2] IndexNow submission (${URLS.length} URLs)`);
  await submitIndexNow('api.indexnow.org');
  await submitIndexNow('www.bing.com');

  console.log('\n✅ Done. Next run: tomorrow 06:00 UTC');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
