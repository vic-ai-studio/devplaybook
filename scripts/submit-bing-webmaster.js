#!/usr/bin/env node
/**
 * Bing Webmaster Tools API - Sitemap + URL Submission
 * =====================================================
 * Prerequisites:
 *   1. Go to https://www.bing.com/webmasters
 *   2. Add devplaybook.cc as a site (verify via DNS TXT or HTML file)
 *   3. Go to Settings > API Access > Get API Key
 *   4. Set env var: BING_WEBMASTER_API_KEY=your-key-here
 *
 * Usage:
 *   BING_WEBMASTER_API_KEY=xxx node submit-bing-webmaster.js
 */

const https = require('https');
const { URL } = require('url');

const BING_API_KEY = process.env.BING_WEBMASTER_API_KEY;
const SITE_URL = 'https://devplaybook.cc/';
const SITEMAP_URL = 'https://devplaybook.cc/sitemap-index.xml';

const TOP_URLS = [
  'https://devplaybook.cc/',
  'https://devplaybook.cc/tools/',
  'https://devplaybook.cc/blog/',
  'https://devplaybook.cc/products/',
  'https://devplaybook.cc/pricing/',
  'https://devplaybook.cc/tools/json-formatter/',
  'https://devplaybook.cc/tools/base64/',
  'https://devplaybook.cc/blog/claude-code-vs-cursor-vs-copilot/',
  'https://devplaybook.cc/blog/developer-productivity-tools-2026/',
  'https://devplaybook.cc/blog/build-your-first-ai-agent/',
];

function bingRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const urlWithKey = `${path}${path.includes('?') ? '&' : '?'}apikey=${BING_API_KEY}`;
    const parsedUrl = new URL(`https://ssl.bing.com/webmaster/api.svc/json${urlWithKey}`);
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        console.log(`  HTTP ${res.statusCode}: ${responseData.substring(0, 200)}`);
        resolve({ status: res.statusCode, body: responseData });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function addSitemap() {
  console.log(`\n[1] Adding sitemap: ${SITEMAP_URL}`);
  await bingRequest('/AddSitemap', 'POST', {
    siteUrl: SITE_URL,
    sitemap: SITEMAP_URL,
  });
}

async function submitUrls() {
  console.log(`\n[2] Submitting ${TOP_URLS.length} priority URLs for indexing...`);
  await bingRequest('/SubmitUrlbatch', 'POST', {
    siteUrl: SITE_URL,
    urlList: TOP_URLS,
  });
}

async function main() {
  if (!BING_API_KEY) {
    console.error('❌ Missing BING_WEBMASTER_API_KEY env var');
    console.error('   Get your key: https://www.bing.com/webmasters → Settings → API Access');
    process.exit(1);
  }

  console.log('Bing Webmaster Tools Submission');
  console.log('================================');
  try {
    await addSitemap();
    await submitUrls();
    console.log('\n✅ Done! Bing will crawl these URLs within 24-48 hours.');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
