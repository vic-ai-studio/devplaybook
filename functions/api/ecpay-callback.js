/**
 * ECPay (綠界科技) Payment Callback
 * POST /api/ecpay-callback
 *
 * ECPay sends payment result here (server-to-server).
 * Must return "1|OK" to acknowledge receipt.
 *
 * Required env vars:
 *   ECPAY_MERCHANT_ID, ECPAY_HASH_KEY, ECPAY_HASH_IV
 *   DISCORD_REPORTS_WEBHOOK (optional)
 *
 * KV bindings (optional):
 *   ANALYTICS - for storing sale records
 */

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1475366832318840843/CVbC12YDRk4alloecr41VUfVunGllwOOUemEiihkR_LJ_6_B9VvT49meeobfaCHLgmZJ';

/**
 * Verify ECPay CheckMacValue
 */
async function verifyCheckMacValue(params, hashKey, hashIV) {
  const received = params.CheckMacValue;
  if (!received) return false;

  // Remove CheckMacValue from params for calculation
  const calcParams = { ...params };
  delete calcParams.CheckMacValue;

  const sorted = Object.keys(calcParams)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(k => `${k}=${calcParams[k]}`)
    .join('&');

  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;
  const encoded = encodeURIComponent(raw).toLowerCase();

  const ecpayEncoded = encoded
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  const msgBuffer = new TextEncoder().encode(ecpayEncoded);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const calculated = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  return calculated === received.toUpperCase();
}

/**
 * Post sale notification to Discord
 */
async function postToDiscord(webhookUrl, sale) {
  const embed = {
    title: sale.success ? '💰 ECPay 收款成功！' : '❌ ECPay 付款失敗',
    color: sale.success ? 0x00c853 : 0xff1744,
    fields: [
      { name: '商品', value: sale.itemName || 'Unknown', inline: true },
      { name: '金額', value: `NT$${sale.amount}`, inline: true },
      { name: '付款方式', value: sale.paymentType || 'N/A', inline: true },
      { name: '交易編號', value: sale.tradeNo || 'N/A', inline: true },
      { name: '綠界交易號', value: sale.ecpayTradeNo || 'N/A', inline: true },
    ],
    footer: {
      text: `${sale.tradeDate || new Date().toISOString()} (Taipei)`,
    },
  };

  if (!sale.success) {
    embed.fields.push({ name: '錯誤', value: sale.errorMessage || 'Unknown error', inline: false });
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error('[ecpay-callback] Discord notification failed:', err);
  }
}

/**
 * Store sale record in KV
 */
async function storeSale(kv, sale) {
  if (!kv) return;

  const key = `ecpay_sale:${sale.tradeDate?.slice(0, 10) || 'unknown'}:${sale.tradeNo}`;
  await kv.put(key, JSON.stringify(sale), { expirationTtl: 2592000 }); // 30 days

  // Update daily stats
  const today = new Date().toISOString().slice(0, 10);
  const statsKey = `ecpay_daily:${today}`;
  let stats = { count: 0, totalNTD: 0 };
  try {
    const raw = await kv.get(statsKey);
    if (raw) stats = JSON.parse(raw);
  } catch {}

  if (sale.success) {
    stats.count += 1;
    stats.totalNTD += parseInt(sale.amount) || 0;
    stats.lastUpdated = new Date().toISOString();
    await kv.put(statsKey, JSON.stringify(stats), { expirationTtl: 172800 });
  }
}

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get('content-type') || '';
  let params;

  // ECPay sends application/x-www-form-urlencoded
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await request.text();
    params = Object.fromEntries(new URLSearchParams(text));
  } else {
    const text = await request.text();
    try {
      params = Object.fromEntries(new URLSearchParams(text));
    } catch {
      return new Response('0|Error: Invalid content type', { status: 400 });
    }
  }

  // Verify CheckMacValue
  const hashKey = env.ECPAY_HASH_KEY;
  const hashIV = env.ECPAY_HASH_IV;
  const merchantId = env.ECPAY_MERCHANT_ID;

  if (!hashKey || !hashIV) {
    console.error('[ecpay-callback] Missing ECPAY_HASH_KEY or ECPAY_HASH_IV');
    return new Response('0|Error: Server config error', { status: 500 });
  }

  const isValid = await verifyCheckMacValue(params, hashKey, hashIV);
  if (!isValid) {
    console.error('[ecpay-callback] CheckMacValue verification failed');
    return new Response('0|Error: CheckMacValue mismatch', { status: 400 });
  }

  // Verify MerchantID matches
  if (params.MerchantID !== merchantId) {
    console.error(`[ecpay-callback] MerchantID mismatch: ${params.MerchantID} vs ${merchantId}`);
    return new Response('0|Error: MerchantID mismatch', { status: 400 });
  }

  // Parse payment result
  // RtnCode = 1 means success
  const success = params.RtnCode === '1';

  const sale = {
    success,
    tradeNo: params.MerchantTradeNo || '',
    ecpayTradeNo: params.TradeNo || '',
    amount: params.TradeAmt || '0',
    itemName: params.ItemName || '',
    paymentType: params.PaymentType || '',
    paymentDate: params.PaymentDate || '',
    tradeDate: params.MerchantTradeDate || '',
    errorMessage: success ? null : (params.RtnMsg || 'Payment failed'),
    rtnCode: params.RtnCode,
    rtnMsg: params.RtnMsg,
    timestamp: new Date().toISOString(),
  };

  console.log(`[ecpay-callback] ${success ? 'SUCCESS' : 'FAILED'}: ${sale.itemName} NT$${sale.amount} (${sale.tradeNo})`);

  // Store in KV
  const kv = env.ANALYTICS || null;
  await storeSale(kv, sale);

  // Discord notification
  const discordUrl = env.DISCORD_REPORTS_WEBHOOK || DISCORD_WEBHOOK;
  await postToDiscord(discordUrl, sale);

  // ECPay requires "1|OK" response to acknowledge
  return new Response('1|OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// GET handler for testing
export async function onRequestGet() {
  return new Response(JSON.stringify({ status: 'ok', service: 'ecpay-callback' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
