/**
 * POST /api/ai/doc-generator
 * Pro-only: AI documentation generator using Claude.
 *
 * Body: { code: string, format?: 'jsdoc' | 'markdown' | 'openapi' | 'inline' }
 * Returns: { docs: string }
 *
 * Required env vars:
 *   AUTH_KV           - session store
 *   SUBSCRIBERS       - Pro subscriber store
 *   ANTHROPIC_API_KEY - Claude API key
 */

import { requirePro, CORS_HEADERS } from './_pro-auth.js';

const MAX_CODE_LENGTH = 8000;
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

const FORMAT_INSTRUCTIONS = {
  jsdoc: 'Generate JSDoc comments for each function/class/type. Output only the commented code.',
  markdown: 'Generate a complete Markdown README documentation file for this code. Include: Overview, Installation (if applicable), API reference with parameters and return types, and Examples.',
  openapi: 'Generate an OpenAPI 3.0 YAML specification for the API endpoints defined in this code.',
  inline: 'Add clear inline comments explaining what each important block of code does. Output the full commented code.',
};

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
  const format = (body.format || 'markdown').toLowerCase();

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

  const formatInstruction = FORMAT_INSTRUCTIONS[format] || FORMAT_INSTRUCTIONS.markdown;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'AI service not configured' }),
      { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const systemPrompt = `You are a technical documentation expert. Generate high-quality documentation for the provided code.

${formatInstruction}

Be thorough but concise. Focus on accuracy and developer utility.`;

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
        messages: [{ role: 'user', content: `Generate documentation for this code:\n\n\`\`\`\n${code}\n\`\`\`` }],
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
    const docs = result.content?.[0]?.text || '';

    return new Response(
      JSON.stringify({ docs }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Doc generator error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error — please try again' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
