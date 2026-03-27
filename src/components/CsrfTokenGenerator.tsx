import { useState } from 'preact/hooks';

type TokenLength = 16 | 32 | 64;
type TokenFormat = 'hex' | 'base64' | 'base64url';
type FrameworkTab = 'express' | 'django' | 'rails' | 'fastapi';

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64(buf: Uint8Array): string {
  const binary = String.fromCharCode(...buf);
  return btoa(binary);
}

function toBase64Url(buf: Uint8Array): string {
  return toBase64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateToken(length: TokenLength, format: TokenFormat): string {
  const buf = randomBytes(length);
  if (format === 'hex') return toHex(buf);
  if (format === 'base64') return toBase64(buf);
  return toBase64Url(buf);
}

const FRAMEWORK_EXAMPLES: Record<FrameworkTab, { label: string; language: string; code: (token: string) => string }> = {
  express: {
    label: 'Express.js',
    language: 'javascript',
    code: (token) => `// Option 1: Manual CSRF middleware (no extra package)
const crypto = require('crypto');

// Store token in session (use express-session)
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// Validate on state-changing requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const token = req.body._csrf || req.headers['x-csrf-token'];
    if (token !== req.session.csrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
});

// In your HTML form:
// <input type="hidden" name="_csrf" value="<%= csrfToken %>" />

// Option 2: Using csrf package (npm install csrf)
const Tokens = require('csrf');
const tokens = new Tokens();
const secret = await tokens.secret();
const csrfToken = tokens.create(secret);
// Example generated token: ${token}`,
  },
  django: {
    label: 'Django',
    language: 'python',
    code: (_token) => `# Django includes CSRF protection out of the box.
# settings.py — ensure middleware is enabled (default):
MIDDLEWARE = [
    # ...
    'django.middleware.csrf.CsrfViewMiddleware',
    # ...
]

# In your HTML template:
# <form method="post">
#   {% csrf_token %}
#   ...
# </form>

# Django renders:
# <input type="hidden" name="csrfmiddlewaretoken"
#        value="RANDOM_TOKEN_HERE">

# For AJAX requests, read the token from the cookie:
# document.cookie.match(/csrftoken=([^;]+)/)?.[1]
# Then send as header: X-CSRFToken: <token>

# Exempt a specific view (use carefully):
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def my_webhook(request):
    # This view skips CSRF checks — only for trusted sources
    ...

# Custom CSRF failure view:
def csrf_failure(request, reason=''):
    return HttpResponse('CSRF check failed: ' + reason, status=403)`,
  },
  rails: {
    label: 'Rails',
    language: 'ruby',
    code: (_token) => `# Rails includes CSRF protection via ActionController.
# In ApplicationController (enabled by default):
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception
end

# In your ERB layout, add this to <head>:
# <%= csrf_meta_tags %>
# Outputs:
# <meta name="csrf-param" content="authenticity_token">
# <meta name="csrf-token" content="RANDOM_TOKEN">

# Rails form helpers include the token automatically:
# <%= form_with url: "/submit" do |f| %>
#   ...
# <% end %>

# For API-only controllers, disable CSRF or use token auth:
class Api::BaseController < ActionController::API
  # ActionController::API skips CSRF by default
end

# Fetch token in JavaScript:
# const token = document.querySelector('meta[name="csrf-token"]').content;
# fetch('/api/data', {
#   method: 'POST',
#   headers: { 'X-CSRF-Token': token, 'Content-Type': 'application/json' },
#   body: JSON.stringify(data)
# });`,
  },
  fastapi: {
    label: 'FastAPI',
    language: 'python',
    code: (token) => `# FastAPI does not include CSRF protection by default.
# Implement a double-submit cookie pattern:

import secrets
from fastapi import FastAPI, Cookie, Header, HTTPException, Response

app = FastAPI()

def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)
    # Example: ${token}

@app.get("/csrf-token")
def get_csrf_token(response: Response):
    token = generate_csrf_token()
    # Set as HttpOnly=False so JS can read it
    response.set_cookie(
        key="csrftoken",
        value=token,
        httponly=False,
        samesite="strict",
        secure=True,
    )
    return {"csrfToken": token}

def verify_csrf(
    csrf_cookie: str = Cookie(default=None),
    x_csrf_token: str = Header(default=None),
):
    if not csrf_cookie or csrf_cookie != x_csrf_token:
        raise HTTPException(status_code=403, detail="CSRF token mismatch")
    return csrf_cookie

@app.post("/submit")
def submit_form(csrf: str = Depends(verify_csrf)):
    return {"status": "ok"}

# In your frontend, read cookie and send header:
# const token = document.cookie.match(/csrftoken=([^;]+)/)?.[1];
# fetch('/submit', { method: 'POST', headers: { 'X-CSRF-Token': token } })`,
  },
};

export default function CsrfTokenGenerator() {
  const [length, setLength] = useState<TokenLength>(32);
  const [format, setFormat] = useState<TokenFormat>('hex');
  const [tokens, setTokens] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<FrameworkTab>('express');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const generate = () => {
    const newTokens = Array.from({ length: 5 }, () => generateToken(length, format));
    setTokens(newTokens);
    setCopiedIdx(null);
  };

  const copyToken = async (token: string, idx: number) => {
    await navigator.clipboard.writeText(token);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyCode = async () => {
    const example = FRAMEWORK_EXAMPLES[activeTab];
    const sampleToken = tokens[0] || generateToken(length, format);
    await navigator.clipboard.writeText(example.code(sampleToken));
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const displayToken = tokens[0] || '';

  return (
    <div class="space-y-6">
      {/* Config */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Token Length (bytes)</label>
          <div class="flex gap-2">
            {([16, 32, 64] as TokenLength[]).map(l => (
              <button
                key={l}
                onClick={() => { setLength(l); setTokens([]); }}
                class={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  length === l
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-primary/50'
                }`}
              >
                {l} bytes
                <div class="text-xs font-normal opacity-70">{l === 16 ? '128-bit' : l === 32 ? '256-bit' : '512-bit'}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Output Format</label>
          <div class="flex gap-2">
            {(['hex', 'base64', 'base64url'] as TokenFormat[]).map(f => (
              <button
                key={f}
                onClick={() => { setFormat(f); setTokens([]); }}
                class={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  format === f
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-primary/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        class="w-full py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition-colors"
      >
        Generate 5 CSRF Tokens
      </button>

      {/* Token batch output */}
      {tokens.length > 0 && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-muted">Generated Tokens ({length * 2} hex chars / {Math.ceil(length * 4 / 3)} base64 chars)</span>
          </div>
          <div class="space-y-2">
            {tokens.map((token, i) => (
              <div key={i} class="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
                <code class="flex-1 font-mono text-sm text-text break-all">{token}</code>
                <button
                  onClick={() => copyToken(token, i)}
                  class={`shrink-0 text-xs px-2 py-1 rounded border transition-colors ${
                    copiedIdx === i
                      ? 'border-green-500 text-green-400 bg-green-500/10'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  {copiedIdx === i ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Framework examples */}
      <div class="border border-border rounded-lg overflow-hidden">
        <div class="flex border-b border-border bg-surface">
          {(Object.keys(FRAMEWORK_EXAMPLES) as FrameworkTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary bg-bg'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {FRAMEWORK_EXAMPLES[tab].label}
            </button>
          ))}
        </div>
        <div class="relative">
          <pre class="p-4 text-xs font-mono text-text bg-bg overflow-x-auto whitespace-pre leading-relaxed max-h-96 overflow-y-auto">
            {FRAMEWORK_EXAMPLES[activeTab].code(displayToken || generateToken(length, format))}
          </pre>
          <button
            onClick={copyCode}
            class={`absolute top-3 right-3 text-xs px-2 py-1 rounded border transition-colors ${
              copiedCode
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-border bg-surface hover:border-primary text-text-muted'
            }`}
          >
            {copiedCode ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Security notes */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3 text-sm">
        <p class="font-medium text-text">Security notes</p>
        <ul class="space-y-2 text-text-muted text-xs list-none">
          <li class="flex gap-2"><span class="text-primary shrink-0">✓</span><span>Tokens are generated using <code class="font-mono bg-bg px-1 rounded">crypto.getRandomValues()</code> — cryptographically secure and entirely in your browser.</span></li>
          <li class="flex gap-2"><span class="text-primary shrink-0">✓</span><span>Use 32 bytes (256-bit) or higher for production CSRF tokens. 16 bytes is acceptable for low-risk scenarios.</span></li>
          <li class="flex gap-2"><span class="text-primary shrink-0">✓</span><span>Always validate CSRF tokens on server-side for state-changing requests (POST, PUT, PATCH, DELETE).</span></li>
          <li class="flex gap-2"><span class="text-primary shrink-0">✓</span><span>Tie tokens to the user session — do not reuse the same token across sessions or users.</span></li>
          <li class="flex gap-2"><span class="text-yellow-400 shrink-0">!</span><span>CSRF protection is not needed for APIs that use Authorization headers (Bearer tokens), because cross-origin requests cannot set custom headers without CORS preflight.</span></li>
          <li class="flex gap-2"><span class="text-yellow-400 shrink-0">!</span><span>SameSite=Strict or SameSite=Lax cookies reduce CSRF risk but do not replace proper token validation — browser support varies.</span></li>
        </ul>
      </div>
    </div>
  );
}
