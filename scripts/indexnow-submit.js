#!/usr/bin/env node
/**
 * indexnow-submit.js - Submit URLs to IndexNow (Bing/Yandex instant indexing)
 *
 * IndexNow key: 1c4ece75e8e5941ade2d87c650fffec0
 * Key file:     https://devplaybook.cc/1c4ece75e8e5941ade2d87c650fffec0.txt
 *
 * Usage: node scripts/indexnow-submit.js
 */

import https from 'https';

const INDEXNOW_KEY = '1c4ece75e8e5941ade2d87c650fffec0';
const HOST = 'devplaybook.cc';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

// URLs to submit - key pages + recent blog posts
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
      res.on('end', () => {
        resolve({ status: res.statusCode, body: responseData });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(data);
    req.end();
  });
}

async function submitToIndexNow(endpoint) {
  const payload = {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: URLS,
  };

  try {
    const result = await postJson(endpoint, '/indexnow', payload);
    const ok = result.status === 200 || result.status === 202;
    console.log(`  ${ok ? '✓' : '✗'} ${endpoint} → HTTP ${result.status}`);
    if (!ok && result.body) {
      console.log(`    Response: ${result.body.substring(0, 200)}`);
    }
    return ok;
  } catch (err) {
    console.log(`  ✗ ${endpoint} → ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('IndexNow URL Submission');
  console.log('=======================');
  console.log(`Key:  ${INDEXNOW_KEY}`);
  console.log(`URLs: ${URLS.length}`);
  console.log('');

  // Submit to IndexNow aggregator (distributes to Bing, Yandex, and others)
  await submitToIndexNow('api.indexnow.org');

  // Also submit directly to Bing IndexNow endpoint
  await submitToIndexNow('www.bing.com');

  console.log('');
  console.log('Done. Engines will index submitted URLs within minutes to hours.');
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
