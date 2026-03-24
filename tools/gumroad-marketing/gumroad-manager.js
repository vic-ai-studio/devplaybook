#!/usr/bin/env node
/**
 * Gumroad Product Manager
 * Batch management for DevPlaybook Gumroad products via API
 *
 * Usage:
 *   node gumroad-manager.js list-products
 *   node gumroad-manager.js list-offers
 *   node gumroad-manager.js create-offer --name LAUNCH20 --discount 20 --type percent
 *   node gumroad-manager.js create-offer --name BUNDLE30 --discount 30 --type percent --max-uses 100
 *   node gumroad-manager.js update-prices --increase 10  # increase all prices by $10
 *
 * Requires: GUMROAD_ACCESS_TOKEN in environment or .env file
 */

const https = require('https');
const { execSync } = require('child_process');

// Load .env if present
try {
  const fs = require('fs');
  const envPath = require('path').join(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const [key, ...vals] = line.split('=');
      if (key && !key.startsWith('#')) {
        process.env[key.trim()] = vals.join('=').trim();
      }
    }
  }
} catch (e) {
  // .env not found, rely on process.env
}

const TOKEN = process.env.GUMROAD_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Error: GUMROAD_ACCESS_TOKEN not set');
  console.error('Set it in .env or as an environment variable');
  process.exit(1);
}

const BASE_URL = 'https://api.gumroad.com/v2';

/**
 * Make an authenticated Gumroad API request
 */
function gumroadRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.success) {
            reject(new Error(parsed.message || 'Gumroad API error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);

    if (body) {
      const encoded = Object.entries(body)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      req.write(encoded);
    }

    req.end();
  });
}

/**
 * List all products
 */
async function listProducts() {
  const data = await gumroadRequest('GET', '/products');
  const products = data.products || [];
  console.log(`\n=== Gumroad Products (${products.length}) ===\n`);
  for (const p of products) {
    console.log(`[${p.id}] ${p.name}`);
    console.log(`  Price: $${p.price / 100} USD`);
    console.log(`  Sales: ${p.sales_count || 0}`);
    console.log(`  URL: ${p.short_url}`);
    console.log();
  }
  return products;
}

/**
 * List all offer codes (discount codes) for each product
 */
async function listOffers() {
  const { products } = await gumroadRequest('GET', '/products');
  console.log(`\n=== Offer Codes ===\n`);
  for (const p of products) {
    try {
      const data = await gumroadRequest('GET', `/products/${p.id}/offer_codes`);
      const offers = data.offer_codes || [];
      if (offers.length > 0) {
        console.log(`${p.name}:`);
        for (const o of offers) {
          const amount = o.offer_type === 'percent'
            ? `${o.amount_off}% off`
            : `$${o.amount_off / 100} off`;
          const uses = o.max_purchase_count ? `${o.times_used}/${o.max_purchase_count} uses` : `${o.times_used || 0} uses`;
          console.log(`  ${o.name}: ${amount} (${uses})`);
        }
        console.log();
      }
    } catch (e) {
      // Skip products with no offer code access
    }
  }
}

/**
 * Create an offer code for all products
 */
async function createOfferForAllProducts(name, discount, type = 'percent', maxUses = null) {
  const { products } = await gumroadRequest('GET', '/products');
  console.log(`\nCreating offer code "${name}" (${discount}% off) for ${products.length} products...\n`);

  let success = 0, failed = 0;

  for (const p of products) {
    try {
      const body = {
        name,
        amount_off: discount,
        offer_type: type,
      };
      if (maxUses) body.max_purchase_count = maxUses;

      await gumroadRequest('POST', `/products/${p.id}/offer_codes`, body);
      console.log(`✓ ${p.name}`);
      success++;
    } catch (e) {
      console.log(`✗ ${p.name}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${success} created, ${failed} failed`);
}

/**
 * Get sales summary for all products
 */
async function salesSummary() {
  const { products } = await gumroadRequest('GET', '/products');
  const sortedBySales = products
    .map(p => ({ name: p.name, price: p.price / 100, sales: p.sales_count || 0, revenue: (p.sales_count || 0) * (p.price / 100) }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sortedBySales.reduce((s, p) => s + p.revenue, 0);
  const totalSales = sortedBySales.reduce((s, p) => s + p.sales, 0);

  console.log('\n=== Sales Summary ===\n');
  console.log(`Total sales: ${totalSales}  |  Total revenue estimate: $${totalRevenue.toFixed(2)}\n`);

  for (const p of sortedBySales) {
    const bar = '█'.repeat(Math.min(Math.round(p.revenue / 10), 30));
    console.log(`${p.name.padEnd(45)} $${String(p.revenue.toFixed(0)).padStart(6)}  ${bar}`);
  }
}

// CLI entry point
const args = process.argv.slice(2);
const command = args[0];

const commands = {
  'list-products': listProducts,
  'list-offers': listOffers,
  'sales-summary': salesSummary,
  'create-offer': async () => {
    const name = args[args.indexOf('--name') + 1];
    const discount = parseInt(args[args.indexOf('--discount') + 1]);
    const type = args.indexOf('--type') !== -1 ? args[args.indexOf('--type') + 1] : 'percent';
    const maxUsesIdx = args.indexOf('--max-uses');
    const maxUses = maxUsesIdx !== -1 ? parseInt(args[maxUsesIdx + 1]) : null;

    if (!name || isNaN(discount)) {
      console.error('Usage: create-offer --name CODE --discount 20 [--type percent|fixed] [--max-uses 100]');
      process.exit(1);
    }
    await createOfferForAllProducts(name, discount, type, maxUses);
  },
};

if (!command || !commands[command]) {
  console.log('Gumroad Manager — Available commands:');
  Object.keys(commands).forEach(c => console.log(`  node gumroad-manager.js ${c}`));
  console.log('\nExamples:');
  console.log('  node gumroad-manager.js list-products');
  console.log('  node gumroad-manager.js create-offer --name LAUNCH20 --discount 20');
  console.log('  node gumroad-manager.js create-offer --name BUNDLE30 --discount 30 --max-uses 50');
  console.log('  node gumroad-manager.js sales-summary');
  process.exit(0);
}

commands[command]().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
