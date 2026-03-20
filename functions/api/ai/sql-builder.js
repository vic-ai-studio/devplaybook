/**
 * POST /api/ai/sql-builder
 * Pro-only: Natural language to SQL using Claude.
 *
 * Body: { prompt: string, schema?: string, dialect?: string }
 * Returns: { sql: string, explanation: string }
 *
 * Required env vars:
 *   AUTH_KV           - session store
 *   SUBSCRIBERS       - Pro subscriber store
 *   ANTHROPIC_API_KEY - Claude API key
 */

import { requirePro, CORS_HEADERS } from './_pro-auth.js';

const MAX_PROMPT_LENGTH = 2000;
const MAX_SCHEMA_LENGTH = 4000;
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

  const prompt = (body.prompt || '').trim();
  const schema = (body.schema || '').trim();
  const dialect = (body.dialect || 'PostgreSQL').trim().slice(0, 30);

  if (!prompt) {
    return new Response(
      JSON.stringify({ error: 'prompt is required' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} chars)` }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (schema.length > MAX_SCHEMA_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Schema too long (max ${MAX_SCHEMA_LENGTH} chars)` }),
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

  const systemPrompt = `You are an expert SQL developer. Convert natural language requests into correct, optimized ${dialect} SQL queries.

Always respond with valid JSON in this exact format:
{
  "sql": "the complete SQL query",
  "explanation": "brief explanation of what the query does and any important notes"
}

Rules:
- Generate only valid ${dialect} syntax
- Use proper quoting for identifiers if needed
- Add useful comments in the SQL for complex parts
- If the schema is provided, use the exact table/column names from it
- If the request is ambiguous, make reasonable assumptions and note them in the explanation
- Never include destructive operations (DROP, TRUNCATE) unless explicitly requested`;

  let userMessage = `Convert to ${dialect} SQL: ${prompt}`;
  if (schema) {
    userMessage += `\n\nDatabase schema:\n\`\`\`sql\n${schema}\n\`\`\``;
  }

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
    const text = result.content?.[0]?.text || '';

    // Parse the JSON response from Claude
    let parsed = { sql: '', explanation: '' };
    try {
      // Extract JSON from the response (Claude may wrap it in markdown code blocks)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = { sql: text, explanation: '' };
      }
    } catch {
      parsed = { sql: text, explanation: 'Query generated successfully.' };
    }

    return new Response(
      JSON.stringify({ sql: parsed.sql || '', explanation: parsed.explanation || '' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('SQL builder error:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected error — please try again' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
}
