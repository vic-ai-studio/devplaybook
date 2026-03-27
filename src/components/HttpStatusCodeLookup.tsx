import { useState, useMemo } from 'preact/hooks';

interface StatusCode {
  code: number;
  name: string;
  category: string;
  description: string;
  causes: string;
  usage: string;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: 'Continue', category: '1xx Informational', description: 'The server has received the request headers and the client should proceed to send the request body.', causes: 'Client sent Expect: 100-continue header before sending a large body.', usage: 'Used for large uploads to check if the server is ready before sending the body.' },
  { code: 101, name: 'Switching Protocols', category: '1xx Informational', description: 'The requester has asked the server to switch protocols and the server has agreed.', causes: 'Upgrade header sent by client (e.g., WebSocket handshake).', usage: 'WebSocket upgrades, HTTP/2 protocol switching.' },
  { code: 102, name: 'Processing', category: '1xx Informational', description: 'The server has received and is processing the request, but no response is available yet.', causes: 'Long-running request (e.g., WebDAV operations).', usage: 'WebDAV; signals the client not to timeout during long operations.' },
  // 2xx
  { code: 200, name: 'OK', category: '2xx Success', description: 'The request succeeded. The meaning depends on the HTTP method: GET returns the resource, POST returns the result of the action.', causes: 'Normal successful response.', usage: 'Standard success response for GET, POST, PUT, PATCH.' },
  { code: 201, name: 'Created', category: '2xx Success', description: 'The request succeeded and a new resource was created as a result.', causes: 'Successful POST or PUT that creates a new resource.', usage: 'Return after creating a resource. Include Location header pointing to the new resource.' },
  { code: 202, name: 'Accepted', category: '2xx Success', description: 'The request has been received but not yet acted upon. It is noncommittal — the server cannot guarantee when processing will complete.', causes: 'Async processing (queued jobs, background tasks).', usage: 'Return for async operations. Include a URL to check status.' },
  { code: 204, name: 'No Content', category: '2xx Success', description: 'There is no content to send for this request, but the headers may be useful.', causes: 'DELETE succeeded, or PUT/PATCH with no response body needed.', usage: 'DELETE responses, empty PATCH/PUT confirmations. Do not include a body.' },
  { code: 206, name: 'Partial Content', category: '2xx Success', description: 'The server is delivering only part of the resource due to a range request from the client.', causes: 'Client sent a Range header to resume a download or stream a file.', usage: 'Video streaming, resumable downloads, paginated file transfers.' },
  // 3xx
  { code: 301, name: 'Moved Permanently', category: '3xx Redirection', description: 'The URL of the requested resource has been changed permanently. The new URL is given in the response.', causes: 'Resource moved to a new permanent location.', usage: 'Permanent URL changes. Browsers and search engines update cached URLs.' },
  { code: 302, name: 'Found', category: '3xx Redirection', description: 'The URI of the requested resource has been changed temporarily.', causes: 'Temporary redirect (e.g., after login, A/B tests).', usage: 'Temporary redirects. Does not update cached URLs or search engine indexes.' },
  { code: 303, name: 'See Other', category: '3xx Redirection', description: 'The server sends this response to direct the client to get the requested resource at another URI with a GET request.', causes: 'POST/PUT processed; redirect to a result page.', usage: 'Post-form redirect (Post/Redirect/Get pattern) to prevent duplicate submissions.' },
  { code: 304, name: 'Not Modified', category: '3xx Redirection', description: 'This is used for caching purposes. It tells the client that the response has not been modified, so the client can continue to use the same cached version of the response.', causes: 'Client sent If-None-Match or If-Modified-Since; resource unchanged.', usage: 'ETag/Last-Modified cache validation. Saves bandwidth by avoiding re-download.' },
  { code: 307, name: 'Temporary Redirect', category: '3xx Redirection', description: 'The server sends this response to direct the client to get the requested resource at another URI with the same method that was used in the prior request.', causes: 'Temporary redirect that preserves HTTP method (unlike 302).', usage: 'Temporary redirects when POST must stay POST (e.g., API endpoint migrations).' },
  { code: 308, name: 'Permanent Redirect', category: '3xx Redirection', description: 'This means that the resource is now permanently located at another URI, specified by the Location response header. Preserves the request method.', causes: 'Permanent redirect that preserves HTTP method.', usage: 'Permanent redirects when POST must stay POST (API v1 → v2 migration).' },
  // 4xx
  { code: 400, name: 'Bad Request', category: '4xx Client Error', description: 'The server cannot or will not process the request due to something that is perceived to be a client error.', causes: 'Malformed request syntax, invalid request message framing, deceptive request routing, missing required fields, invalid JSON.', usage: 'Return for validation failures, malformed input, invalid query params.' },
  { code: 401, name: 'Unauthorized', category: '4xx Client Error', description: 'The client must authenticate itself to get the requested response. Include a WWW-Authenticate header.', causes: 'Missing, expired, or invalid authentication token or credentials.', usage: 'No or invalid auth token. Client should re-authenticate.' },
  { code: 403, name: 'Forbidden', category: '4xx Client Error', description: 'The client does not have access rights to the content. Unlike 401, the client\'s identity is known to the server.', causes: 'User authenticated but lacks permission (wrong role, blocked IP, quota exceeded).', usage: 'Authenticated but unauthorized. Don\'t expose whether the resource exists.' },
  { code: 404, name: 'Not Found', category: '4xx Client Error', description: 'The server cannot find the requested resource. The URL is not recognized or the resource does not exist.', causes: 'Resource deleted, wrong URL, typo in path, resource never existed.', usage: 'Resource not found. Safe to use even when resource exists but you want to hide it (security).' },
  { code: 405, name: 'Method Not Allowed', category: '4xx Client Error', description: 'The request method is known by the server but is not supported by the target resource.', causes: 'DELETE on a read-only endpoint, GET on a POST-only endpoint.', usage: 'Include Allow header listing supported methods.' },
  { code: 408, name: 'Request Timeout', category: '4xx Client Error', description: 'This response is sent on an idle connection by some servers, even without any previous request by the client.', causes: 'Client took too long to send the request.', usage: 'Server-side idle timeout. Client may retry.' },
  { code: 409, name: 'Conflict', category: '4xx Client Error', description: 'This response is sent when a request conflicts with the current state of the server.', causes: 'Duplicate resource creation, version conflict, optimistic locking failure.', usage: 'Use for optimistic concurrency failures, duplicate key violations, edit conflicts.' },
  { code: 410, name: 'Gone', category: '4xx Client Error', description: 'This response is sent when the requested content has been permanently deleted from the server, with no forwarding address.', causes: 'Resource intentionally and permanently removed.', usage: 'Preferred over 404 when resource is permanently gone (helps search engines de-index).' },
  { code: 422, name: 'Unprocessable Entity', category: '4xx Client Error', description: 'The request was well-formed but was unable to be followed due to semantic errors.', causes: 'Valid JSON but fails business logic validation (e.g., invalid email format, constraint violation).', usage: 'Semantic validation errors. Return a body describing which fields failed.' },
  { code: 423, name: 'Locked', category: '4xx Client Error', description: 'The resource that is being accessed is locked.', causes: 'Optimistic or pessimistic lock held by another user/process.', usage: 'WebDAV. Some APIs use for resource-level locks.' },
  { code: 429, name: 'Too Many Requests', category: '4xx Client Error', description: 'The user has sent too many requests in a given amount of time ("rate limiting").', causes: 'Rate limit exceeded. Client sending too many requests.', usage: 'Include Retry-After header. Client should back off and retry after the indicated delay.' },
  // 5xx
  { code: 500, name: 'Internal Server Error', category: '5xx Server Error', description: 'The server has encountered a situation it does not know how to handle — an unhandled exception or unexpected condition.', causes: 'Unhandled exception, null pointer, database error, bug in server code.', usage: 'Generic server error. Do not expose stack traces in production responses.' },
  { code: 501, name: 'Not Implemented', category: '5xx Server Error', description: 'The request method is not supported by the server and cannot be handled.', causes: 'Server does not recognize or cannot fulfill the request method.', usage: 'Future endpoints, planned features not yet built.' },
  { code: 502, name: 'Bad Gateway', category: '5xx Server Error', description: 'The server, while working as a gateway to get a response needed to handle the request, got an invalid response from an upstream server.', causes: 'Upstream service (backend, API) returned an invalid response to the proxy/gateway.', usage: 'Indicates a problem between your reverse proxy (nginx, load balancer) and backend.' },
  { code: 503, name: 'Service Unavailable', category: '5xx Server Error', description: 'The server is not ready to handle the request. Common causes are a server that is down for maintenance or that is overloaded.', causes: 'Server overloaded, maintenance window, deployment in progress.', usage: 'Include Retry-After header. Use during deployments or when shedding load.' },
  { code: 504, name: 'Gateway Timeout', category: '5xx Server Error', description: 'The server is acting as a gateway and cannot get a response in time from an upstream server.', causes: 'Upstream service too slow, database query timeout, network latency.', usage: 'Investigate upstream latency. Client may retry with exponential backoff.' },
  { code: 507, name: 'Insufficient Storage', category: '5xx Server Error', description: 'The method could not be performed on the resource because the server is unable to store the representation needed to successfully complete the request.', causes: 'Disk full, storage quota exceeded.', usage: 'WebDAV. File upload APIs when storage quota is exceeded.' },
  { code: 511, name: 'Network Authentication Required', category: '5xx Server Error', description: 'The client needs to authenticate to gain network access.', causes: 'Captive portal (hotel WiFi, public hotspot requiring login).', usage: 'Captive portal scenarios. Rarely used in regular APIs.' },
];

const CATEGORIES = ['All', '1xx Informational', '2xx Success', '3xx Redirection', '4xx Client Error', '5xx Server Error'];

const CATEGORY_COLORS: Record<string, string> = {
  '1xx Informational': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  '2xx Success': 'text-green-400 bg-green-400/10 border-green-400/30',
  '3xx Redirection': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  '4xx Client Error': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  '5xx Server Error': 'text-red-400 bg-red-400/10 border-red-400/30',
};

export default function HttpStatusCodeLookup() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<StatusCode | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STATUS_CODES.filter(s => {
      const catMatch = category === 'All' || s.category === category;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        String(s.code).includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.causes.toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  function getCatColor(cat: string) {
    return CATEGORY_COLORS[cat] || 'text-text-muted bg-surface border-border';
  }

  return (
    <div class="space-y-4">
      {/* Search + filter */}
      <div class="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onInput={e => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search by code, name, or description…"
          class="flex-1 px-3 py-2 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={category}
          onChange={e => setCategory((e.target as HTMLSelectElement).value)}
          class="px-3 py-2 rounded border border-border bg-surface text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Count */}
      <div class="text-xs text-text-muted">{filtered.length} status code{filtered.length !== 1 ? 's' : ''}</div>

      {/* List */}
      <div class="space-y-1">
        {filtered.map(s => (
          <button
            key={s.code}
            onClick={() => setSelected(prev => prev?.code === s.code ? null : s)}
            class={`w-full text-left rounded border transition-colors ${
              selected?.code === s.code ? 'border-primary bg-primary/5' : 'border-border bg-surface hover:border-primary/50'
            }`}
          >
            <div class="flex items-center gap-3 px-4 py-3">
              <span class={`text-base font-bold font-mono min-w-[3.5rem] ${getCatColor(s.category).split(' ')[0]}`}>
                {s.code}
              </span>
              <span class="font-medium text-sm flex-1">{s.name}</span>
              <span class={`text-xs px-2 py-0.5 rounded border font-medium hidden sm:inline-block ${getCatColor(s.category)}`}>
                {s.category}
              </span>
            </div>

            {selected?.code === s.code && (
              <div class="px-4 pb-4 pt-0 border-t border-border/50 text-sm space-y-3">
                <div>
                  <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Description</div>
                  <p class="text-text">{s.description}</p>
                </div>
                <div>
                  <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Common Causes</div>
                  <p class="text-text">{s.causes}</p>
                </div>
                <div>
                  <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">When to Use</div>
                  <p class="text-text">{s.usage}</p>
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div class="text-center text-text-muted py-8">No status codes match your search.</div>
      )}
    </div>
  );
}
