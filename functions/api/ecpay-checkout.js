/**
 * ECPay (綠界科技) Checkout endpoint
 * POST /api/ecpay-checkout
 *
 * Creates an ECPay payment form and returns the HTML form to auto-submit.
 * Supports: Credit Card, ATM, CVS (convenience store), Barcode
 *
 * Required env vars (set in Cloudflare Pages dashboard):
 *   ECPAY_MERCHANT_ID   - 商店代號
 *   ECPAY_HASH_KEY      - HashKey
 *   ECPAY_HASH_IV       - HashIV
 *
 * Request body:
 *   { productSlug, productName, price, email?, paymentMethod? }
 *
 * paymentMethod options: "ALL", "Credit", "ATM", "CVS", "Barcode"
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const ECPAY_API_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';

/**
 * Generate ECPay CheckMacValue (SHA256)
 * Spec: https://developers.ecpay.com.tw/?p=2902
 */
async function generateCheckMacValue(params, hashKey, hashIV) {
  // Step 1: Sort params alphabetically by key
  const sorted = Object.keys(params)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(k => `${k}=${params[k]}`)
    .join('&');

  // Step 2: Prepend HashKey, append HashIV
  const raw = `HashKey=${hashKey}&${sorted}&HashIV=${hashIV}`;

  // Step 3: URL encode (lowercase)
  const encoded = encodeURIComponent(raw).toLowerCase();

  // Step 4: ECPay-specific encoding replacements
  const ecpayEncoded = encoded
    .replace(/%2d/g, '-')
    .replace(/%5f/g, '_')
    .replace(/%2e/g, '.')
    .replace(/%21/g, '!')
    .replace(/%2a/g, '*')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%20/g, '+');

  // Step 5: SHA256 hash → uppercase
  const msgBuffer = new TextEncoder().encode(ecpayEncoded);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Generate unique trade number (max 20 chars)
 */
function generateTradeNo() {
  const now = new Date();
  const ts = now.toISOString().replace(/[-T:.Z]/g, '').slice(2, 14); // YYMMDDHHmmss (12 chars)
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase(); // 8 chars
  return (ts + rand).slice(0, 20);
}

/**
 * Format date for ECPay: yyyy/MM/dd HH:mm:ss
 */
function formatDate(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const merchantId = env.ECPAY_MERCHANT_ID;
  const hashKey = env.ECPAY_HASH_KEY;
  const hashIV = env.ECPAY_HASH_IV;

  if (!merchantId || !hashKey || !hashIV) {
    return new Response(JSON.stringify({ error: 'ECPay not configured' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { productSlug, productName, price, email, paymentMethod } = body;

  if (!productName || !price || price < 1) {
    return new Response(JSON.stringify({ error: 'Missing productName or price' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const tradeNo = generateTradeNo();
  const now = new Date(Date.now() + 8 * 3600 * 1000); // UTC+8 for Taiwan

  // Choose payment type
  let choosePayment = paymentMethod || 'ALL';
  const validPayments = ['ALL', 'Credit', 'ATM', 'CVS', 'Barcode'];
  if (!validPayments.includes(choosePayment)) {
    choosePayment = 'ALL';
  }

  // Build ECPay params
  const params = {
    MerchantID: merchantId,
    MerchantTradeNo: tradeNo,
    MerchantTradeDate: formatDate(now),
    PaymentType: 'aio',
    TotalAmount: String(Math.round(price)),
    TradeDesc: 'DevPlaybook Digital Product',
    ItemName: productName.slice(0, 200),
    ReturnURL: `${origin}/api/ecpay-callback`,
    OrderResultURL: `${origin}/payment-result?trade=${tradeNo}`,
    ChoosePayment: choosePayment,
    EncryptType: '1',
    ClientBackURL: `${origin}/products/${productSlug || ''}`,
  };

  // Add email for notification if provided
  if (email && email.includes('@')) {
    params.Email = email.trim().slice(0, 200);
  }

  // Generate CheckMacValue
  params.CheckMacValue = await generateCheckMacValue(params, hashKey, hashIV);

  // Build auto-submit HTML form
  const formFields = Object.entries(params)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeHtml(v)}">`)
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Redirecting to ECPay...</title></head>
<body>
  <form id="ecpay-form" method="POST" action="${ECPAY_API_URL}">
    ${formFields}
  </form>
  <p style="text-align:center;margin-top:50px;font-family:sans-serif;">Redirecting to payment...</p>
  <script>document.getElementById('ecpay-form').submit();</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
