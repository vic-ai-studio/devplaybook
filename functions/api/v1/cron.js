/**
 * GET /api/v1/cron?expression=0+9+*+*+*
 * Validate and describe a cron expression.
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

// Human-readable descriptions for common cron fields
function describeField(value, unit, names) {
  if (value === '*') return `every ${unit}`;
  if (value.startsWith('*/')) {
    const step = value.slice(2);
    return `every ${step} ${unit}s`;
  }
  if (value.includes(',')) {
    const parts = value.split(',').map(v => names ? names[parseInt(v)] || v : v);
    return `at ${parts.join(' and ')}`;
  }
  if (value.includes('-')) {
    const [start, end] = value.split('-');
    const s = names ? names[parseInt(start)] || start : start;
    const e = names ? names[parseInt(end)] || end : end;
    return `from ${s} to ${e}`;
  }
  const label = names ? names[parseInt(value)] || value : value;
  return `at ${label}`;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function parseCron(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return { valid: false, error: 'Cron expression must have exactly 5 fields: minute hour day month weekday' };
  }

  const [minute, hour, day, month, weekday] = parts;
  const descriptions = [
    describeField(minute, 'minute'),
    describeField(hour, 'hour'),
    describeField(day, 'day'),
    describeField(month, 'month', MONTHS),
    describeField(weekday, 'weekday', DAYS),
  ];

  // Build natural language summary
  let summary = `Run ${descriptions[0]}, ${descriptions[1]}, ${descriptions[2]}, ${descriptions[3]}, ${descriptions[4]}`;

  // Common patterns
  if (expr === '* * * * *') summary = 'Run every minute';
  else if (expr === '0 * * * *') summary = 'Run every hour at minute 0';
  else if (expr === '0 0 * * *') summary = 'Run every day at midnight';
  else if (expr === '0 9 * * 1-5') summary = 'Run at 9:00 AM, Monday through Friday';
  else if (expr === '0 0 * * 0') summary = 'Run every Sunday at midnight';
  else if (expr === '0 0 1 * *') summary = 'Run at midnight on the 1st of every month';
  else if (expr === '*/5 * * * *') summary = 'Run every 5 minutes';
  else if (expr === '*/15 * * * *') summary = 'Run every 15 minutes';
  else if (expr === '0 */6 * * *') summary = 'Run every 6 hours';
  else if (expr === '0 12 * * *') summary = 'Run every day at noon';

  return {
    valid: true,
    expression: expr,
    fields: { minute, hour, day, month, weekday },
    summary,
    nextRuns: null, // Would need full scheduler to compute
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  const url = new URL(request.url);
  const expression = url.searchParams.get('expression') || url.searchParams.get('expr') || '';

  if (!expression) {
    return json({ error: 'expression query param required. Example: ?expression=0+9+*+*+1-5' }, 400);
  }

  const result = parseCron(expression);

  return json(
    result,
    result.valid ? 200 : 400,
    {
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Limit': String(auth.limit),
      'X-RateLimit-Plan': auth.plan,
    }
  );
}
