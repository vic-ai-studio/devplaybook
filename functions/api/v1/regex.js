/**
 * POST /api/v1/regex
 * Body: { pattern: string, flags?: string, input: string, operation?: 'test'|'match'|'replace', replacement?: string }
 * Test a regex pattern against input text.
 */
import { authenticate, json, CORS_HEADERS } from './_shared.js';

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { pattern, flags = '', input = '', operation = 'match', replacement = '' } = body;

  if (!pattern || typeof pattern !== 'string') {
    return json({ error: '"pattern" field is required' }, 400);
  }

  // Safety: block catastrophic backtracking patterns (basic guard)
  if (pattern.length > 500) {
    return json({ error: 'Pattern too long (max 500 chars)' }, 400);
  }

  let regex;
  try {
    regex = new RegExp(pattern, flags.replace(/[^gimsuy]/g, ''));
  } catch (e) {
    return json({ valid: false, error: `Invalid regex: ${e.message}` }, 400);
  }

  let result;
  if (operation === 'test') {
    result = { matches: regex.test(input) };
  } else if (operation === 'replace') {
    result = { output: input.replace(regex, replacement) };
  } else {
    // match
    const matches = [];
    let m;
    const isGlobal = flags.includes('g');
    if (isGlobal) {
      while ((m = regex.exec(input)) !== null) {
        matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
        if (matches.length >= 100) { matches.push({ truncated: true }); break; }
      }
    } else {
      m = regex.exec(input);
      if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
    }
    result = { matchCount: matches.filter(m => !m.truncated).length, matches };
  }

  return json(
    { valid: true, pattern, flags, operation, ...result },
    200,
    {
      'X-RateLimit-Remaining': String(auth.remaining),
      'X-RateLimit-Limit': String(auth.limit),
      'X-RateLimit-Plan': auth.plan,
    }
  );
}
