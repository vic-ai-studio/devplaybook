import { useState, useMemo } from 'preact/hooks';

interface StatusCode {
  code: number;
  name: string;
  category: string;
  description: string;
  useCase: string;
  example: string;
  rfc?: string;
  cacheable?: boolean;
  retryable?: boolean;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: 'Continue', category: '1xx Informational', description: 'The server has received the request headers and the client should proceed to send the request body.', useCase: 'Sent after a 100-continue Expect header to confirm the server will accept the request body before the client sends it.', example: 'Client sends: Expect: 100-continue\nServer responds: 100 Continue\nClient sends body', cacheable: false, retryable: false },
  { code: 101, name: 'Switching Protocols', category: '1xx Informational', description: 'The server is switching to a different protocol as requested.', useCase: 'WebSocket handshake — client requests upgrade from HTTP/1.1 to WebSocket.', example: 'Upgrade: websocket\nConnection: Upgrade', cacheable: false, retryable: false },
  // 2xx
  { code: 200, name: 'OK', category: '2xx Success', description: 'The request succeeded. The response body contains the requested data.', useCase: 'Standard success for GET, POST, PUT, PATCH requests that return data.', example: 'GET /api/users/123 → 200 with user JSON', cacheable: true, retryable: false, rfc: 'RFC 9110' },
  { code: 201, name: 'Created', category: '2xx Success', description: 'A new resource was successfully created. The Location header should point to the new resource.', useCase: 'POST to create a resource — user signup, creating an order, uploading a file.', example: 'POST /api/orders → 201\nLocation: /api/orders/456', cacheable: false, retryable: false },
  { code: 202, name: 'Accepted', category: '2xx Success', description: 'The request has been accepted for processing, but processing has not been completed.', useCase: 'Async processing — sending an email, starting a background job, triggering a webhook.', example: 'POST /api/exports → 202\n{"jobId": "abc123"}', cacheable: false, retryable: false },
  { code: 204, name: 'No Content', category: '2xx Success', description: 'The request succeeded but there is no response body.', useCase: 'DELETE, or PATCH/PUT when no response data is needed. Preflight OPTIONS responses.', example: 'DELETE /api/users/123 → 204', cacheable: false, retryable: false },
  { code: 206, name: 'Partial Content', category: '2xx Success', description: 'The server is serving only part of the resource due to a Range header.', useCase: 'Video streaming, resumable file downloads, large file pagination.', example: 'Range: bytes=0-1023\n→ 206 Content-Range: bytes 0-1023/8192', cacheable: true, retryable: false },
  // 3xx
  { code: 301, name: 'Moved Permanently', category: '3xx Redirection', description: 'The resource has permanently moved to a new URL. Clients should update bookmarks.', useCase: 'URL restructuring, HTTP→HTTPS redirect, domain migration. Cached by default.', example: 'GET /old-url → 301\nLocation: https://example.com/new-url', cacheable: true, retryable: false },
  { code: 302, name: 'Found (Temporary Redirect)', category: '3xx Redirection', description: 'The resource is temporarily at a different URL. Use original URL for future requests.', useCase: 'Temporary maintenance page, A/B test redirect. Not cached by default.', example: 'GET /sale → 302\nLocation: /promo/summer-2026', cacheable: false, retryable: false },
  { code: 304, name: 'Not Modified', category: '3xx Redirection', description: 'The cached version of the resource is still valid. No body is returned.', useCase: 'Conditional GET with If-None-Match or If-Modified-Since — allows clients to reuse cache.', example: 'If-None-Match: "abc123" → 304 (no body)', cacheable: true, retryable: false },
  { code: 307, name: 'Temporary Redirect', category: '3xx Redirection', description: 'Same as 302 but guarantees the method is preserved (POST stays POST).', useCase: 'Redirect a POST request temporarily. 302 can change POST to GET; 307 does not.', example: 'POST /api/checkout → 307\nLocation: /api/v2/checkout', cacheable: false, retryable: true },
  { code: 308, name: 'Permanent Redirect', category: '3xx Redirection', description: 'Same as 301 but guarantees the method is preserved (POST stays POST).', useCase: 'Permanent URL restructuring that involves non-GET methods.', example: 'POST /api/v1/orders → 308\nLocation: /api/v2/orders', cacheable: true, retryable: false },
  // 4xx
  { code: 400, name: 'Bad Request', category: '4xx Client Error', description: 'The server cannot process the request due to a client error — malformed syntax, invalid parameters.', useCase: 'Invalid JSON body, missing required field, invalid query parameter format.', example: '{"error": "VALIDATION_ERROR", "details": [{"field": "email", "message": "Invalid format"}]}', cacheable: false, retryable: false, rfc: 'RFC 9110' },
  { code: 401, name: 'Unauthorized', category: '4xx Client Error', description: 'Authentication is required and has failed or not been provided.', useCase: 'Missing or invalid JWT/API key, expired session token.', example: 'WWW-Authenticate: Bearer realm="api"\n{"error": "UNAUTHORIZED"}', cacheable: false, retryable: true },
  { code: 403, name: 'Forbidden', category: '4xx Client Error', description: 'The server understood the request but refuses to authorize it. Authentication won\'t help.', useCase: 'Insufficient permissions — authenticated user trying to access another user\'s data or admin endpoint.', example: '{"error": "FORBIDDEN", "message": "Requires admin role"}', cacheable: false, retryable: false },
  { code: 404, name: 'Not Found', category: '4xx Client Error', description: 'The requested resource does not exist or the server is hiding its existence.', useCase: 'Missing resource, deleted record, or intentional obfuscation of private resources.', example: '{"error": "NOT_FOUND", "message": "User 999 not found"}', cacheable: true, retryable: false },
  { code: 405, name: 'Method Not Allowed', category: '4xx Client Error', description: 'The HTTP method is not allowed for this resource.', useCase: 'Sending a DELETE to an endpoint that only supports GET and POST.', example: 'Allow: GET, POST\n{"error": "METHOD_NOT_ALLOWED"}', cacheable: false, retryable: false },
  { code: 408, name: 'Request Timeout', category: '4xx Client Error', description: 'The server timed out waiting for the request from the client.', useCase: 'Slow network, client held connection open too long without sending data.', example: '{"error": "REQUEST_TIMEOUT"}', cacheable: false, retryable: true },
  { code: 409, name: 'Conflict', category: '4xx Client Error', description: 'The request conflicts with the current state of the target resource.', useCase: 'Duplicate resource (email already exists), optimistic lock conflict, version mismatch.', example: '{"error": "CONFLICT", "message": "Email already registered"}', cacheable: false, retryable: false },
  { code: 410, name: 'Gone', category: '4xx Client Error', description: 'The resource existed but has been permanently deleted. Unlike 404, this is definitive.', useCase: 'Deprecated API endpoint, permanently deleted content, expired links.', example: '{"error": "GONE", "message": "This endpoint was removed in v2"}', cacheable: true, retryable: false },
  { code: 413, name: 'Payload Too Large', category: '4xx Client Error', description: 'The request body exceeds the server\'s size limit.', useCase: 'File upload too large, JSON body too big, exceeds multipart size limit.', example: '{"error": "PAYLOAD_TOO_LARGE", "maxBytes": 10485760}', cacheable: false, retryable: false },
  { code: 415, name: 'Unsupported Media Type', category: '4xx Client Error', description: 'The server refuses to accept the request because the payload format is unsupported.', useCase: 'Sending XML when API only accepts JSON, wrong Content-Type header.', example: 'Accept: application/json\n{"error": "UNSUPPORTED_MEDIA_TYPE"}', cacheable: false, retryable: false },
  { code: 422, name: 'Unprocessable Entity', category: '4xx Client Error', description: 'The request is well-formed but contains semantic errors (usually validation failures).', useCase: 'Valid JSON but invalid values — email format wrong, date in the past, value out of range.', example: '{"error": "UNPROCESSABLE", "details": [{"field": "age", "message": "Must be ≥ 18"}]}', cacheable: false, retryable: false },
  { code: 429, name: 'Too Many Requests', category: '4xx Client Error', description: 'The user has sent too many requests in a given time window (rate limiting).', useCase: 'API rate limiting — include Retry-After header with seconds until reset.', example: 'Retry-After: 60\nX-RateLimit-Remaining: 0\n{"error": "RATE_LIMIT_EXCEEDED"}', cacheable: false, retryable: true },
  // 5xx
  { code: 500, name: 'Internal Server Error', category: '5xx Server Error', description: 'An unexpected condition was encountered by the server.', useCase: 'Unhandled exception, database connection failure, null pointer error. Never include stack traces in production.', example: '{"error": "INTERNAL_ERROR", "requestId": "req_abc123"}', cacheable: false, retryable: true, rfc: 'RFC 9110' },
  { code: 501, name: 'Not Implemented', category: '5xx Server Error', description: 'The server does not support the functionality required to fulfill the request.', useCase: 'Unimplemented HTTP method on server, future-proofing placeholders.', example: '{"error": "NOT_IMPLEMENTED", "message": "PATCH not yet supported"}', cacheable: false, retryable: false },
  { code: 502, name: 'Bad Gateway', category: '5xx Server Error', description: 'The server acting as a gateway received an invalid response from an upstream server.', useCase: 'Nginx received a 500 from Node.js backend, upstream API is down.', example: '502 Bad Gateway (nginx error page)', cacheable: false, retryable: true },
  { code: 503, name: 'Service Unavailable', category: '5xx Server Error', description: 'The server is not ready to handle the request — overloaded or down for maintenance.', useCase: 'Deployment in progress, database migration, traffic spike. Include Retry-After header.', example: 'Retry-After: 30\n{"error": "SERVICE_UNAVAILABLE", "maintenance": true}', cacheable: false, retryable: true },
  { code: 504, name: 'Gateway Timeout', category: '5xx Server Error', description: 'The server acting as a gateway did not receive a timely response from an upstream server.', useCase: 'Slow backend, LLM API timeout, downstream service overloaded.', example: '504 Gateway Timeout (nginx after 60s)', cacheable: false, retryable: true },
  { code: 508, name: 'Loop Detected', category: '5xx Server Error', description: 'The server detected an infinite loop while processing the request.', useCase: 'WebDAV redirect loops, circular proxy configurations.', example: '{"error": "LOOP_DETECTED"}', cacheable: false, retryable: false },
];

const CATEGORIES = ['All', '1xx Informational', '2xx Success', '3xx Redirection', '4xx Client Error', '5xx Server Error'];

const CATEGORY_COLORS: Record<string, string> = {
  '1xx Informational': 'text-blue-400',
  '2xx Success': 'text-green-400',
  '3xx Redirection': 'text-yellow-400',
  '4xx Client Error': 'text-orange-400',
  '5xx Server Error': 'text-red-400',
};

const CATEGORY_BG: Record<string, string> = {
  '1xx Informational': 'bg-blue-900/20 border-blue-500/30',
  '2xx Success': 'bg-green-900/20 border-green-500/30',
  '3xx Redirection': 'bg-yellow-900/20 border-yellow-500/30',
  '4xx Client Error': 'bg-orange-900/20 border-orange-500/30',
  '5xx Server Error': 'bg-red-900/20 border-red-500/30',
};

export default function HttpStatusExplorer() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<StatusCode | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return STATUS_CODES.filter(s => {
      const matchCat = category === 'All' || s.category === category;
      if (!q) return matchCat;
      return matchCat && (
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.useCase.toLowerCase().includes(q)
      );
    });
  }, [search, category]);

  return (
    <div class="space-y-4">
      <div class="flex gap-3 flex-col sm:flex-row">
        <input
          type="text"
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search by code, name, or description…"
          class="flex-1 bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white placeholder-text-muted focus:outline-none focus:border-blue-500"
        />
        <select
          value={category}
          onChange={e => setCategory((e.target as HTMLSelectElement).value)}
          class="bg-[#1a1a2e] border border-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <p class="text-xs text-text-muted">{filtered.length} status code{filtered.length !== 1 ? 's' : ''}</p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filtered.map(s => (
          <button
            key={s.code}
            onClick={() => setSelected(s === selected ? null : s)}
            class={`text-left p-3 rounded border transition-colors ${selected?.code === s.code ? CATEGORY_BG[s.category] + ' border-2' : 'bg-surface border-border hover:border-border/80'}`}
          >
            <div class="flex items-center gap-2">
              <span class={`font-mono font-bold text-lg ${CATEGORY_COLORS[s.category]}`}>{s.code}</span>
              <span class="text-white text-sm font-medium">{s.name}</span>
              <div class="ml-auto flex gap-1">
                {s.cacheable && <span class="text-xs bg-green-900/30 text-green-400 border border-green-500/30 rounded px-1">cacheable</span>}
                {s.retryable && <span class="text-xs bg-blue-900/30 text-blue-400 border border-blue-500/30 rounded px-1">retryable</span>}
              </div>
            </div>
            <p class="text-xs text-text-muted mt-1 line-clamp-2">{s.description}</p>

            {selected?.code === s.code && (
              <div class="mt-3 pt-3 border-t border-border space-y-3" onClick={e => e.stopPropagation()}>
                <div>
                  <p class="text-xs font-semibold text-text-muted mb-1">When to use</p>
                  <p class="text-xs text-white">{s.useCase}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold text-text-muted mb-1">Example</p>
                  <pre class="text-xs font-mono text-green-300 whitespace-pre-wrap bg-[#1a1a2e] rounded p-2">{s.example}</pre>
                </div>
                <div class="flex gap-3 text-xs text-text-muted">
                  <span>Cacheable: <span class={s.cacheable ? 'text-green-400' : 'text-red-400'}>{s.cacheable ? 'Yes' : 'No'}</span></span>
                  <span>Retryable: <span class={s.retryable ? 'text-green-400' : 'text-red-400'}>{s.retryable ? 'Yes' : 'No'}</span></span>
                  {s.rfc && <span>Spec: <span class="text-white">{s.rfc}</span></span>}
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div class="text-center py-8 text-text-muted text-sm">
          No status codes match "{search}" in {category === 'All' ? 'any category' : category}.
        </div>
      )}
    </div>
  );
}
