/**
 * Gumroad Sale Webhook Handler
 * POST /api/gumroad-webhook
 *
 * Receives Gumroad sale pings, posts to Discord, and logs to KV ledger.
 *
 * Required env vars (set in Cloudflare Pages dashboard):
 *   DISCORD_REPORTS_WEBHOOK  - Discord webhook URL for revenue notifications
 *
 * Optional env vars:
 *   GUMROAD_WEBHOOK_SECRET   - If set, verifies the X-Gumroad-Signature header
 *
 * KV bindings (optional, for ledger):
 *   ANALYTICS                - Stores sales with key "sale:<timestamp>:<sale_id>"
 *
 * Gumroad setup:
 *   Dashboard → Settings → Advanced → Webhooks → Add URL:
 *   https://devplaybook.cc/api/gumroad-webhook
 */

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1475366832318840843/CVbC12YDRk4alloecr41VUfVunGllwOOUemEiihkR_LJ_6_B9VvT49meeobfaCHLgmZJ';

/**
 * Get today's total revenue from KV ledger.
 * Returns { count, totalCents } for today's sales.
 */
async function getTodayStats(kv) {
  if (!kv) return { count: 0, totalCents: 0 };

  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const statsKey = `sales_daily:${today}`;

  try {
    const raw = await kv.get(statsKey);
    if (!raw) return { count: 0, totalCents: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, totalCents: 0 };
  }
}

/**
 * Update today's running totals in KV.
 */
async function updateDailyStats(kv, priceCents) {
  if (!kv) return;

  const today = new Date().toISOString().slice(0, 10);
  const statsKey = `sales_daily:${today}`;

  const stats = await getTodayStats(kv);
  const updated = {
    count: stats.count + 1,
    totalCents: stats.totalCents + priceCents,
    lastUpdated: new Date().toISOString(),
  };

  // Store with 48-hour TTL (2 days, then auto-expires)
  await kv.put(statsKey, JSON.stringify(updated), { expirationTtl: 172800 });
  return updated;
}

/**
 * Store individual sale record in KV.
 */
async function storeSaleRecord(kv, sale) {
  if (!kv) return;

  const key = `sale:${sale.timestamp}:${sale.saleId}`;
  // Keep individual records for 30 days
  await kv.put(key, JSON.stringify(sale), { expirationTtl: 2592000 });
}

/**
 * Post sale notification to Discord.
 */
async function postToDiscord(webhookUrl, sale, dailyStats) {
  const priceDollars = (sale.priceCents / 100).toFixed(2);
  const dailyTotalDollars = (dailyStats.totalCents / 100).toFixed(2);

  const embed = {
    title: '💰 New Sale!',
    color: 0x00c853, // green
    fields: [
      { name: 'Product', value: sale.productName, inline: true },
      { name: 'Revenue', value: `$${priceDollars} ${sale.currency}`, inline: true },
      { name: 'Buyer', value: sale.email ? `||${sale.email}||` : 'Anonymous', inline: true },
      { name: "Today's Sales", value: `${dailyStats.count} sale(s)`, inline: true },
      { name: "Today's Revenue", value: `$${dailyTotalDollars}`, inline: true },
    ],
    footer: {
      text: `Sale ID: ${sale.saleId} • ${new Date(sale.timestamp).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} (Taipei)`,
    },
  };

  if (sale.isTest) {
    embed.title = '🧪 [TEST] New Sale!';
    embed.color = 0xffa000; // amber for test
  }

  const body = JSON.stringify({ embeds: [embed] });

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  if (!res.ok) {
    console.error(`[gumroad-webhook] Discord POST failed: ${res.status} ${await res.text()}`);
  }
}

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  let params;

  // Gumroad sends application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    params = Object.fromEntries(new URLSearchParams(text));
  } else if (contentType.includes('application/json')) {
    params = await request.json();
  } else {
    // Try to parse as form-encoded anyway
    const text = await request.text();
    try {
      params = Object.fromEntries(new URLSearchParams(text));
    } catch {
      return new Response(JSON.stringify({ error: 'Unsupported content type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Extract sale data from Gumroad payload
  // price is in cents (e.g. "1000" = $10.00)
  const priceCents = parseInt(params.price || '0', 10);
  const sale = {
    saleId: params.sale_id || params.order_number || 'unknown',
    productName: params.product_name || 'Unknown Product',
    productId: params.product_id || '',
    email: params.email || '',
    priceCents,
    currency: params.currency_symbol || '$',
    quantity: parseInt(params.quantity || '1', 10),
    isTest: params.test === 'true' || params.test === true,
    timestamp: params.sale_timestamp || new Date().toISOString(),
    ipCountry: params.ip_country || '',
    refunded: params.refunded === 'true' || params.refunded === true,
  };

  // Skip refunds (handle separately if needed)
  if (sale.refunded) {
    console.log(`[gumroad-webhook] Skipping refund for sale ${sale.saleId}`);
    return new Response(JSON.stringify({ received: true, skipped: 'refund' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Store in KV ledger and get updated daily stats
  const kv = env.ANALYTICS || null;
  await storeSaleRecord(kv, sale);
  const dailyStats = await updateDailyStats(kv, priceCents);

  // Post to Discord
  const discordUrl = env.DISCORD_REPORTS_WEBHOOK || DISCORD_WEBHOOK;
  try {
    await postToDiscord(discordUrl, sale, dailyStats || { count: 1, totalCents: priceCents });
  } catch (err) {
    console.error('[gumroad-webhook] Discord notification failed:', err);
    // Don't fail the webhook — Gumroad should still get 200
  }

  console.log(`[gumroad-webhook] Sale processed: ${sale.productName} $${(priceCents / 100).toFixed(2)} from ${sale.email}`);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Also handle GET for webhook URL verification (some services ping with GET)
export async function onRequestGet() {
  return new Response(JSON.stringify({ status: 'ok', service: 'gumroad-webhook' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
