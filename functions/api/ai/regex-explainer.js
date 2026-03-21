/**
 * POST /api/ai/regex-explainer
 * Pro-only: AI-powered regex pattern explainer using Claude.
 *
 * Body: { pattern: string, flags?: string }
 * Returns: { explanation: string }
 *
 * Required env vars:
 *   AUTH_KV           - session store
 *   SUBSCRIBERS       - Pro subscriber store
 *   ANTHROPIC_API_KEY - Claude API key
 */

import { requirePro, CORS_HEADERS } from './_pro-auth.js';

const MAX_PATTERN_LENGTH = 2000;
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const auth = await requirePro(request, env);
  if (!auth.ok) return auth.response;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const pattern = (body.pattern || '').trim();
  const flags = (body.flags || '').trim().slice(0, 10);

  if (!pattern) {
    return new Response(
      JSON.stringify({ error: 'pattern is required' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (pattern.length > MAX_PATTERN_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Pattern too long (max ${MAX_PATTERN_LENGTH} chars)` }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'AI service not configured' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = `You are an expert in regular expressions. When given a regex pattern, explain it clearly and provide helpful examples.

Format your response in markdown with these sections:

## Plain English Summary
One sentence describing what this regex matches, in plain English (no regex jargon).

## Part-by-Part Breakdown
Break the regex into its components. For each part, show the component and explain what it does.
Format as a table or a clear annotated list.

## Flags
If flags are provided, explain what each flag does.

## Match Examples
Show 3-5 example strings that MATCH this pattern (in a code block).

## Non-Match Examples
Show 3 example strings that do NOT match, and briefly explain why.

## Common Use Cases
When would a developer typically use this pattern?

## Potential Gotchas
Any edge cases, performance concerns (catastrophic backtracking), or common mistakes with this pattern.

Be concise and educational. Assume the reader understands basic programming but may not be a regex expert.`;

  const flagsLine = flags ? ` with flags: ${flags}` : '';
  const userMessage = `Regex pattern: \`${pattern}\`${flagsLine}\n\nPlease explain this regex pattern comprehensively.`;

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return new Response(
        JSON.stringify({ error: 'AI service error — please try again' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const result = await anthropicRes.json();
    const explanation = result.content?.[0]?.text || '';

    return new Response(
      JSON.stringify({ explanation }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Regex explainer error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error — please try again' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
