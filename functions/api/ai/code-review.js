/**
 * POST /api/ai/code-review
 * Pro-only: AI-powered code review using Claude.
 *
 * Body: { code: string, language?: string }
 * Returns: { review: string }
 *
 * Required env vars:
 *   AUTH_KV           - session store
 *   SUBSCRIBERS       - Pro subscriber store
 *   ANTHROPIC_API_KEY - Claude API key
 */

import { requirePro, CORS_HEADERS } from './_pro-auth.js';

const MAX_CODE_LENGTH = 8000;
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  // Pro auth check
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

  const code = (body.code || '').trim();
  const language = (body.language || 'auto-detect').trim().slice(0, 50);

  if (!code) {
    return new Response(
      JSON.stringify({ error: 'code is required' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (code.length > MAX_CODE_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Code too long (max ${MAX_CODE_LENGTH} chars)` }),
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

  const systemPrompt = `You are an expert code reviewer. Review the provided code and give actionable, structured feedback.

Format your response in markdown with these sections:
## Summary
One paragraph overview of the code quality.

## Issues Found
List each issue with severity (🔴 Critical / 🟡 Warning / 🔵 Suggestion) and a short fix.

## Strengths
What the code does well.

## Quick Wins
Top 3 specific improvements to make right now.

Be concise, practical, and developer-friendly. No fluff.`;

  const userMessage = `Language: ${language}\n\nCode to review:\n\`\`\`\n${code}\n\`\`\``;

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
    const review = result.content?.[0]?.text || '';

    return new Response(
      JSON.stringify({ review }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Code review error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error — please try again' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
