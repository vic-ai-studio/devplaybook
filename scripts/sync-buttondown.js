#!/usr/bin/env node
/**
 * sync-buttondown.js
 * Syncs stored email subscribers to Buttondown when API key is available.
 *
 * Sources (checked in order):
 *   1. data/email-signups.json  (local KV export — run export-subscribers.js first)
 *   2. Live Cloudflare KV (if CF_ACCOUNT_ID + CF_API_TOKEN set)
 *
 * Required env vars:
 *   BUTTONDOWN_API_KEY — Buttondown API key (get from buttondown.email/settings/api)
 *
 * Optional env vars (for live KV fetch):
 *   CF_ACCOUNT_ID
 *   CF_API_TOKEN
 *   CF_KV_NS_ID  (defaults to newsletter KV namespace)
 *
 * Usage:
 *   BUTTONDOWN_API_KEY=xxx node scripts/sync-buttondown.js
 *   BUTTONDOWN_API_KEY=xxx node scripts/sync-buttondown.js --dry-run
 *
 * Idempotent: subscribers already in Buttondown are skipped (409 = already exists).
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const BUTTONDOWN_API_KEY = process.env.BUTTONDOWN_API_KEY || '';
const DRY_RUN = process.argv.includes('--dry-run');
const CF_KV_NS_ID = process.env.CF_KV_NS_ID || '1ca6a0dc6080480da7c8bc70298dd5f9';

if (!BUTTONDOWN_API_KEY) {
  console.error('ERROR: BUTTONDOWN_API_KEY env var required.');
  console.error('Get your API key at: https://buttondown.email/settings/api');
  process.exit(1);
}

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = typeof body === 'string' ? body : JSON.stringify(body);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', (chunk) => (d += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

async function cfGet(path) {
  const CF_API_TOKEN = process.env.CF_API_TOKEN || '';
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) return null;

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path,
      method: 'GET',
      headers: { Authorization: `Bearer ${CF_API_TOKEN}` },
    };
    const req = https.request(options, (res) => {
      let d = '';
      res.on('data', (chunk) => (d += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function loadSubscribersFromJson() {
  const filePath = path.join(__dirname, '..', 'data', 'email-signups.json');
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data.subscribers || [];
}

async function loadSubscribersFromKV() {
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
  if (!CF_ACCOUNT_ID) return null;

  console.log('Fetching subscribers from Cloudflare KV...');
  const qs = new URLSearchParams({ prefix: 'subscriber:', limit: '1000' });
  const keysRes = await cfGet(
    `/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS_ID}/keys?${qs}`
  );
  if (!keysRes?.success) return null;

  const subscribers = [];
  for (const { name } of keysRes.result) {
    const valRes = await cfGet(
      `/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NS_ID}/values/${encodeURIComponent(name)}`
    );
    if (valRes?.email) subscribers.push(valRes);
  }
  return subscribers;
}

async function subscribeToButtondown(email, source) {
  if (DRY_RUN) {
    console.log(`  [dry-run] Would subscribe: ${email}`);
    return 'dry-run';
  }
  const res = await httpsPost(
    'api.buttondown.email',
    '/v1/subscribers',
    { Authorization: `Token ${BUTTONDOWN_API_KEY}` },
    { email, tags: [source || 'website'] }
  );
  if (res.status === 201) return 'created';
  if (res.status === 409) return 'exists';
  return `error:${res.status}`;
}

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN MODE (no changes will be made) ---\n');

  // Load subscribers: prefer local JSON, fall back to live KV
  let subscribers = await loadSubscribersFromJson();
  if (subscribers) {
    console.log(`Loaded ${subscribers.length} subscribers from data/email-signups.json`);
  } else {
    subscribers = await loadSubscribersFromKV();
    if (!subscribers) {
      console.error('No subscriber source found. Run export-subscribers.js first or set CF env vars.');
      process.exit(1);
    }
    console.log(`Loaded ${subscribers.length} subscribers from Cloudflare KV`);
  }

  if (subscribers.length === 0) {
    console.log('No subscribers to sync.');
    return;
  }

  const stats = { created: 0, exists: 0, errors: 0, dryRun: 0 };
  for (const sub of subscribers) {
    const result = await subscribeToButtondown(sub.email, sub.source);
    if (result === 'created') { stats.created++; console.log(`  ✓ added: ${sub.email}`); }
    else if (result === 'exists') { stats.exists++; }
    else if (result === 'dry-run') { stats.dryRun++; }
    else { stats.errors++; console.warn(`  ✗ error (${result}): ${sub.email}`); }

    // Rate limit: Buttondown allows ~100 req/min
    await new Promise((r) => setTimeout(r, 650));
  }

  console.log('\n--- Sync complete ---');
  console.log(`  Added:    ${stats.created}`);
  console.log(`  Existing: ${stats.exists}`);
  console.log(`  Errors:   ${stats.errors}`);
  if (DRY_RUN) console.log(`  Dry-run:  ${stats.dryRun}`);
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
