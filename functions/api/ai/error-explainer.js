/**
 * POST /api/ai/error-explainer
 * Pro-only: AI-powered stack trace and error explainer using Claude.
 *
 * Body: { error: string, language?: string, context?: string }
 * Returns: { explanation: string }
 *
 * Required env vars:
 *   AUTH_KV           - session store
 *   SUBSCRIBERS       - Pro subscriber store
 *   ANTHROPIC_API_KEY - Claude API key
 */

import { requirePro, CORS_HEADERS } from './_pro-auth.js';

const MAX_ERROR_LENGTH = 6000;
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

  const errorText = (body.error || '').trim();
  const language = (body.language || 'auto-detect').trim().slice(0, 50);
  const context = (body.context || '').trim().slice(0, 1000);

  if (!errorText) {
    return new Response(
      JSON.stringify({ error: 'error is required' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (errorText.length > MAX_ERROR_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Error text too long (max ${MAX_ERROR_LENGTH} chars)` }),
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

  const systemPrompt = `You are an expert debugging assistant. When given an error message, exception, or stack trace, explain it clearly and provide actionable fixes.

Format your response in markdown with these sections:

## What Happened
Plain-English explanation of what went wrong (1-2 sentences, no jargon).

## Root Cause
The technical reason this error occurred.

## How to Fix
Step-by-step fix instructions. Include code snippets where helpful.

## Common Causes
Bullet list of the most frequent reasons this error appears.

## Prevention
How to avoid this error in the future.

Be concise, developer-friendly, and assume the reader is a competent programmer who just wants a clear answer.`;

  const contextLine = context ? `\n\nAdditional context from the developer: ${context}` : '';
  const userMessage = `Language/Runtime: ${language}\n\nError / Stack trace:\n\`\`\`\n${errorText}\n\`\`\`${contextLine}`;

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
    console.error('Error explainer error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error — please try again' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
