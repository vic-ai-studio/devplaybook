/**
 * POST /api/ai/test-generator
 * Pro-only: AI-powered unit test generator using Claude.
 *
 * Body: { code: string, language?: string, framework?: string }
 * Returns: { tests: string }
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
  const framework = (body.framework || 'auto').trim().slice(0, 50);

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

  const frameworkHint = framework === 'auto' ? '' : ` Use the ${framework} testing framework.`;

  const systemPrompt = `You are an expert software engineer specializing in writing thorough, production-quality unit tests.
Given code, generate comprehensive unit tests that cover:
- Happy path / normal cases
- Edge cases (empty input, null/undefined, boundary values)
- Error cases (exceptions, invalid input)
- Any async behavior if present

Format your response as runnable test code only — no explanations outside of inline comments.
Include import/require statements at the top.${frameworkHint}
Keep tests focused, readable, and with clear test descriptions (it/test names should describe the expected behavior).`;

  const userMessage = `Language: ${language}\n\nCode to test:\n\`\`\`\n${code}\n\`\`\`\n\nGenerate complete, runnable unit tests.`;

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
        max_tokens: 2000,
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
    const tests = result.content?.[0]?.text || '';

    return new Response(
      JSON.stringify({ tests }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Test generator error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error — please try again' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
