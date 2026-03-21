#!/usr/bin/env node
/**
 * export-subscribers.js
 * Exports newsletter subscribers from Cloudflare KV to data/email-signups.json
 *
 * Required env vars:
 *   CF_ACCOUNT_ID   — Cloudflare account ID
 *   CF_API_TOKEN    — API token with Workers KV Storage:Read permission
 *   CF_KV_NS_ID     — KV namespace ID for NEWSLETTER_KV
 *                     (from wrangler.toml: id = "1ca6a0dc6080480da7c8bc70298dd5f9")
 *
 * Usage:
 *   CF_ACCOUNT_ID=xxx CF_API_TOKEN=yyy CF_KV_NS_ID=zzz node scripts/export-subscribers.js
 *
 * Output:
 *   data/email-signups.json — array of subscriber objects
 *
 * Run this periodically (e.g., daily via cron) to keep local backup in sync.
 * When Buttondown API key arrives, run sync-buttondown.js to push these to Buttondown.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
const CF_API_TOKEN = process.env.CF_API_TOKEN || '';
const CF_KV_NS_ID = process.env.CF_KV_NS_ID || '1ca6a0dc6080480da7c8bc70298dd5f9';

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('ERROR: CF_ACCOUNT_ID and CF_API_TOKEN env vars required.');
  console.error('  export CF_ACCOUNT_ID=your_account_id');
  console.error('  export CF_API_TOKEN=your_api_token');
  process.exit(1);
}

function cfRequest(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path,
      method: opts.method || 'GET',
      headers: {
        Authorization: `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

async function listKeys(prefix = 'subscriber:') {
  const keys = [];
  let cursor = null;

  do {
    const qs = new URLSearchParams({ prefix, limit: '1000' });
    if (cursor) qs.set('cursor', cursor);
    const url = `/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS_ID}/keys?${qs}`;
    const res = await cfRequest(url);

    if (!res.body.success) {
      throw new Error(`KV list failed: ${JSON.stringify(res.body.errors)}`);
    }

    keys.push(...res.body.result.map((k) => k.name));
    cursor = res.body.result_info?.cursor || null;
  } while (cursor);

  return keys;
}

async function getValue(key) {
  const url = `/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS_ID}/values/${encodeURIComponent(key)}`;
  const res = await cfRequest(url);
  if (res.status !== 200) return null;
  if (typeof res.body === 'object') return res.body;
  try { return JSON.parse(res.body); } catch { return res.body; }
}

async function main() {
  console.log('Fetching subscriber keys from Cloudflare KV...');
  const keys = await listKeys('subscriber:');
  console.log(`Found ${keys.length} subscriber keys`);

  const subscribers = [];
  for (const key of keys) {
    const value = await getValue(key);
    if (value && value.email) {
      subscribers.push(value);
    }
  }

  subscribers.sort((a, b) => new Date(a.subscribedAt) - new Date(b.subscribedAt));

  const outputDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'email-signups.json');
  fs.writeFileSync(outputPath, JSON.stringify({ exportedAt: new Date().toISOString(), count: subscribers.length, subscribers }, null, 2));

  console.log(`✓ Exported ${subscribers.length} subscribers → ${outputPath}`);

  // Summary
  const sources = {};
  for (const s of subscribers) {
    sources[s.source || 'unknown'] = (sources[s.source || 'unknown'] || 0) + 1;
  }
  console.log('By source:', sources);
}

main().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
