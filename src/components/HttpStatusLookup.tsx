import { useState, useMemo } from 'preact/hooks';

interface StatusCode {
  code: number;
  name: string;
  category: string;
  categoryColor: string;
  rfc: string;
  rfcUrl: string;
  description: string;
  useCases: string[];
  retryable?: boolean;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: 'Continue', category: '1xx Informational', categoryColor: 'text-blue-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.2.1', description: 'The server has received the request headers and the client should proceed to send the request body.', useCases: ['Large file uploads using Expect: 100-continue header', 'Checking server readiness before sending a big payload'] },
  { code: 101, name: 'Switching Protocols', category: '1xx Informational', categoryColor: 'text-blue-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.2.2', description: 'The server agrees to switch protocols as requested by the client via the Upgrade header.', useCases: ['WebSocket handshake upgrade from HTTP', 'HTTP/1.1 to HTTP/2 upgrade negotiation'] },
  { code: 102, name: 'Processing', category: '1xx Informational', categoryColor: 'text-blue-400', rfc: 'RFC 2518 (WebDAV)', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc2518#section-10.1', description: 'The server has received and is processing the request, but no response is available yet.', useCases: ['Long-running WebDAV operations', 'Preventing client timeouts during slow processing'] },
  { code: 103, name: 'Early Hints', category: '1xx Informational', categoryColor: 'text-blue-400', rfc: 'RFC 8297', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc8297', description: 'Used to return some response headers before final HTTP message while the server prepares a response.', useCases: ['Preloading CSS/JS resources before HTML is ready', 'Reducing page load time with resource hints'] },

  // 2xx
  { code: 200, name: 'OK', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.1', description: 'The request succeeded. The response body contains the requested resource or action result.', useCases: ['Successful GET returning resource data', 'Successful POST that processes without creating', 'Successful PUT/PATCH updates'] },
  { code: 201, name: 'Created', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.2', description: 'The request succeeded and a new resource was created. The Location header often points to the new resource.', useCases: ['POST /users returns 201 with Location: /users/42', 'File upload successfully creates a new record', 'New order placed in e-commerce'] },
  { code: 202, name: 'Accepted', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.3', description: 'The request has been accepted for processing, but processing has not been completed. Non-committal response.', useCases: ['Async job queued for background processing', 'Email send request accepted but not yet sent', 'Batch import started asynchronously'] },
  { code: 203, name: 'Non-Authoritative Information', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.4', description: 'The response is a transformation of the origin server\'s 200 OK response by a proxy or intermediary.', useCases: ['Proxy returns cached/modified response', 'CDN transforms content headers'] },
  { code: 204, name: 'No Content', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.5', description: 'The request succeeded but there is no content to send back. The client should not change its document view.', useCases: ['DELETE /resource — deletion confirmed', 'PUT with no body to return', 'Autosave ping acknowledged'] },
  { code: 205, name: 'Reset Content', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.6', description: 'The request succeeded. The client should reset the document view (e.g., clear a form).', useCases: ['Form submission: clear the form after success', 'Data entry reset after save'] },
  { code: 206, name: 'Partial Content', category: '2xx Success', categoryColor: 'text-green-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.3.7', description: 'The server fulfills a partial GET request for a range of bytes. Used for resumable downloads and streaming.', useCases: ['Video streaming with Range requests', 'Resumable file downloads', 'Pagination of large binary data'] },

  // 3xx
  { code: 301, name: 'Moved Permanently', category: '3xx Redirection', categoryColor: 'text-yellow-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4.2', description: 'The resource has permanently moved to a new URL. Browsers and search engines should update their links.', useCases: ['Domain migration (old.com → new.com)', 'URL restructuring with SEO preservation', 'HTTP → HTTPS redirect (use 308 for POST-safe)'] },
  { code: 302, name: 'Found', category: '3xx Redirection', categoryColor: 'text-yellow-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4.3', description: 'Temporary redirect. The resource is temporarily at a different URL. Method may change to GET.', useCases: ['Post/Redirect/Get pattern after form submit', 'Temporary maintenance page redirect', 'A/B testing redirect'] },
  { code: 303, name: 'See Other', category: '3xx Redirection', categoryColor: 'text-yellow-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4.4', description: 'Redirect after POST. Always redirects using GET to avoid form resubmission.', useCases: ['After successful form submission', 'Redirect to status page after triggering a job'] },
  { code: 304, name: 'Not Modified', category: '3xx Redirection', categoryColor: 'text-yellow-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4.5', description: 'The cached version is still valid. No body is returned. Client should use its cached copy.', useCases: ['Browser cache validation with If-None-Match / ETag', 'CDN cache revalidation', 'Conditional GET requests'] },
  { code: 307, name: 'Temporary Redirect', category: '3xx Redirection', categoryColor: 'text-yellow-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4.8', description: 'Temporary redirect that preserves the HTTP method. Unlike 302, POST stays POST.', useCases: ['Redirecting API POST/PUT requests temporarily', 'Load balancer failover preserving method'] },
  { code: 308, name: 'Permanent Redirect', category: '3xx Redirection', categoryColor: 'text-yellow-400', rfc: 'RFC 9308', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.4.9', description: 'Permanent redirect that preserves the HTTP method. Unlike 301, POST stays POST.', useCases: ['HTTP → HTTPS upgrade preserving method', 'Permanent API endpoint relocation'] },

  // 4xx
  { code: 400, name: 'Bad Request', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.1', description: 'The server cannot process the request due to malformed syntax, invalid parameters, or missing required data.', useCases: ['Invalid JSON body', 'Missing required query parameter', 'Invalid date format in request'] },
  { code: 401, name: 'Unauthorized', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.2', description: 'Authentication is required and has failed or not been provided. Despite the name, means "unauthenticated".', useCases: ['Missing or expired JWT/API key', 'Login required to access resource', 'Invalid credentials'], retryable: true },
  { code: 402, name: 'Payment Required', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.3', description: 'Reserved for future use. Used by some APIs for subscription/billing gates.', useCases: ['Paywalled API endpoint', 'Usage quota exceeded, billing required', 'SaaS feature behind paid plan'] },
  { code: 403, name: 'Forbidden', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.4', description: 'The server understood the request but refuses to authorize it. The client is authenticated but lacks permission.', useCases: ['User authenticated but lacks required role/scope', 'IP address blocked', 'CSRF token mismatch'] },
  { code: 404, name: 'Not Found', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.5', description: 'The server cannot find the requested resource. May also be used to hide existence of a resource (vs 403).', useCases: ['Requested URL/path does not exist', 'Resource was deleted', 'Hiding forbidden resources for security'] },
  { code: 405, name: 'Method Not Allowed', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.6', description: 'The HTTP method used is not supported for this endpoint. Response must include an Allow header.', useCases: ['DELETE on a read-only endpoint', 'GET on a POST-only action endpoint', 'Wrong verb for REST resource'] },
  { code: 406, name: 'Not Acceptable', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.7', description: 'The server cannot produce a response matching the Accept headers sent by the client.', useCases: ['Client requests XML but server only speaks JSON', 'Accept-Language mismatch'] },
  { code: 408, name: 'Request Timeout', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.9', description: 'The server timed out waiting for the request. The client may repeat the request.', useCases: ['Slow client upload timing out', 'Keep-alive connection idle too long'], retryable: true },
  { code: 409, name: 'Conflict', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.10', description: 'The request conflicts with the current state of the server resource.', useCases: ['Duplicate key violation', 'Optimistic concurrency conflict (edit collision)', 'Username already taken on registration'] },
  { code: 410, name: 'Gone', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.11', description: 'The resource is permanently gone and no forwarding address is known. Unlike 404, this is intentional and permanent.', useCases: ['Deleted resource that should be de-indexed by search engines', 'Retired API version', 'Deactivated account URL'] },
  { code: 411, name: 'Length Required', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.12', description: 'The server requires a Content-Length header but it was not provided.', useCases: ['POST without Content-Length to a server that requires it'] },
  { code: 412, name: 'Precondition Failed', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.13', description: 'One or more conditions in the request headers evaluated to false (If-Match, If-Unmodified-Since, etc.).', useCases: ['ETag mismatch on conditional PUT (optimistic locking)', 'If-None-Match failed on POST'] },
  { code: 413, name: 'Content Too Large', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.14', description: 'The request body exceeds the server\'s configured maximum size limit.', useCases: ['File upload exceeds server max size', 'Request body too large for API limit'] },
  { code: 414, name: 'URI Too Long', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.15', description: 'The request URI is longer than the server is willing to interpret.', useCases: ['GET request with extremely long query string', 'URL exceeds browser/server limit (~2048 chars)'] },
  { code: 415, name: 'Unsupported Media Type', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.16', description: 'The server refuses to accept the request because the content format is not supported.', useCases: ['Sending XML to a JSON-only endpoint', 'Wrong Content-Type header (text/plain instead of application/json)'] },
  { code: 416, name: 'Range Not Satisfiable', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.17', description: 'The server cannot provide the requested byte range — the range falls outside the resource size.', useCases: ['Resumable download with corrupt offset', 'Range header beyond file size'] },
  { code: 417, name: 'Expectation Failed', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.18', description: 'The server cannot meet the requirements of the Expect request header.', useCases: ['Server does not support Expect: 100-continue'] },
  { code: 418, name: "I'm a Teapot", category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 2324 (joke)', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc2324', description: 'Any attempt to brew coffee with a teapot should result in this error code. An April Fools\' joke from 1998 that became a permanent easter egg.', useCases: ['Easter egg in APIs', 'Rejecting non-sensical requests with humor', 'Google, Nginx, and many servers implement it'] },
  { code: 422, name: 'Unprocessable Content', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110 / WebDAV', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.21', description: 'The request is well-formed but contains semantic errors — valid syntax but fails business rules/validation.', useCases: ['Form validation failure (email format wrong)', 'Invalid enum value in JSON body', 'REST API input validation errors (FastAPI, Rails default)'] },
  { code: 423, name: 'Locked', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 4918 (WebDAV)', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc4918#section-11.3', description: 'The resource being accessed is locked.', useCases: ['WebDAV file locked for editing', 'Concurrent write lock on document'] },
  { code: 425, name: 'Too Early', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 8470', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc8470', description: 'The server is unwilling to risk processing a request that might be replayed (0-RTT early data in TLS 1.3).', useCases: ['TLS 1.3 early data replay protection'] },
  { code: 426, name: 'Upgrade Required', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.5.22', description: 'The server refuses to perform the request using the current protocol. The client must upgrade.', useCases: ['HTTP/1.0 → HTTP/1.1 upgrade required', 'Enforcing TLS upgrade'] },
  { code: 429, name: 'Too Many Requests', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 6585', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc6585#section-4', description: 'The client has sent too many requests in a given time window. Rate limiting is in effect.', useCases: ['API rate limit exceeded', 'DDoS protection triggering', 'Login brute-force protection'], retryable: true },
  { code: 451, name: 'Unavailable For Legal Reasons', category: '4xx Client Error', categoryColor: 'text-red-400', rfc: 'RFC 7725', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc7725', description: 'Access denied for legal reasons (DMCA takedown, court order, government censorship).', useCases: ['GDPR/copyright takedown', 'Government-ordered content blocking', 'DMCA compliance'] },

  // 5xx
  { code: 500, name: 'Internal Server Error', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.6.1', description: 'A generic server error indicating something went wrong on the server side. The request may be valid.', useCases: ['Unhandled exception in application code', 'Database query failure', 'Bug in business logic'], retryable: true },
  { code: 501, name: 'Not Implemented', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.6.2', description: 'The server does not support the HTTP method or feature required to fulfill the request.', useCases: ['PATCH not implemented on a REST endpoint', 'Feature placeholder in API stub'] },
  { code: 502, name: 'Bad Gateway', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.6.3', description: 'The gateway or proxy received an invalid response from an upstream server.', useCases: ['Nginx can\'t reach the backend app server', 'Upstream microservice crashed', 'API gateway → backend timeout'], retryable: true },
  { code: 503, name: 'Service Unavailable', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.6.4', description: 'The server is temporarily unavailable due to overload or maintenance. The Retry-After header may indicate recovery time.', useCases: ['Server maintenance window', 'Auto-scaling: traffic spike before new instances are ready', 'Circuit breaker open'], retryable: true },
  { code: 504, name: 'Gateway Timeout', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.6.5', description: 'The gateway did not receive a timely response from an upstream server.', useCases: ['Slow database query exceeds proxy timeout', 'Upstream API taking too long', 'Long-running serverless function timeout'], retryable: true },
  { code: 505, name: 'HTTP Version Not Supported', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 9110', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc9110#section-15.6.6', description: 'The server does not support the HTTP protocol version used in the request.', useCases: ['HTTP/3 request to HTTP/1.1 only server'] },
  { code: 507, name: 'Insufficient Storage', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 4918 (WebDAV)', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc4918#section-11.5', description: 'The server is unable to store the representation needed to complete the request.', useCases: ['Disk full on server', 'Database storage quota exceeded', 'File system write failure'] },
  { code: 508, name: 'Loop Detected', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 5842 (WebDAV)', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc5842', description: 'The server detected an infinite loop while processing a WebDAV request.', useCases: ['WebDAV infinite loop in collection traversal'] },
  { code: 511, name: 'Network Authentication Required', category: '5xx Server Error', categoryColor: 'text-orange-400', rfc: 'RFC 6585', rfcUrl: 'https://www.rfc-editor.org/rfc/rfc6585#section-6', description: 'The client needs to authenticate to gain network access (e.g., captive portal on public Wi-Fi).', useCases: ['Hotel / airport Wi-Fi login portal', 'Corporate network captive portal'] },
];

const CATEGORIES = ['All', '1xx Informational', '2xx Success', '3xx Redirection', '4xx Client Error', '5xx Server Error'];

export default function HttpStatusLookup() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedCode, setExpandedCode] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return STATUS_CODES.filter(s => {
      const catMatch = selectedCategory === 'All' || s.category === selectedCategory;
      if (!q) return catMatch;
      return catMatch && (
        s.code.toString().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.useCases.some(u => u.toLowerCase().includes(q))
      );
    });
  }, [search, selectedCategory]);

  const categoryBadge: Record<string, string> = {
    '1xx Informational': 'bg-blue-900/40 text-blue-300 border-blue-700',
    '2xx Success':       'bg-green-900/40 text-green-300 border-green-700',
    '3xx Redirection':   'bg-yellow-900/40 text-yellow-300 border-yellow-700',
    '4xx Client Error':  'bg-red-900/40 text-red-300 border-red-700',
    '5xx Server Error':  'bg-orange-900/40 text-orange-300 border-orange-700',
  };

  return (
    <div class="space-y-4">
      {/* Search + Filter */}
      <div class="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by code, name, or keyword (e.g. 404, redirect, rate limit)…"
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
          class="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory((e.target as HTMLSelectElement).value)}
          class="bg-surface border border-border rounded px-3 py-2 text-sm focus:outline-none focus:border-accent"
        >
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Result count */}
      <p class="text-xs text-text-muted">{filtered.length} status code{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Results */}
      <div class="space-y-2">
        {filtered.length === 0 && (
          <div class="text-text-muted text-sm py-6 text-center">No matching status codes found.</div>
        )}
        {filtered.map(s => (
          <div
            key={s.code}
            class="border border-border rounded-lg overflow-hidden"
          >
            <button
              class="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-surface-hover transition-colors"
              onClick={() => setExpandedCode(expandedCode === s.code ? null : s.code)}
            >
              <span class={`font-mono font-bold text-lg w-14 shrink-0 ${s.categoryColor}`}>{s.code}</span>
              <span class="font-semibold text-sm flex-1">{s.name}</span>
              <span class={`hidden sm:inline text-xs px-2 py-0.5 rounded border ${categoryBadge[s.category] || ''}`}>
                {s.category}
              </span>
              {s.retryable && (
                <span class="text-xs px-2 py-0.5 rounded border bg-cyan-900/30 text-cyan-300 border-cyan-700">retryable</span>
              )}
              <span class="text-text-muted text-xs ml-2">{expandedCode === s.code ? '▲' : '▼'}</span>
            </button>

            {expandedCode === s.code && (
              <div class="px-4 pb-4 pt-1 border-t border-border bg-surface/40 space-y-3 text-sm">
                <p class="text-text">{s.description}</p>

                <div>
                  <p class="text-text-muted text-xs font-semibold uppercase tracking-wide mb-1">Common use cases</p>
                  <ul class="space-y-1">
                    {s.useCases.map(u => (
                      <li key={u} class="flex items-start gap-2 text-text-muted">
                        <span class="text-accent mt-0.5 shrink-0">›</span>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                  <span class="text-xs text-text-muted">Reference:</span>
                  <span class="text-xs font-mono text-accent">{s.rfc}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
