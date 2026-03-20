import { useState, useMemo } from 'preact/hooks';

interface StatusCode {
  code: number;
  name: string;
  desc: string;
  category: '1xx' | '2xx' | '3xx' | '4xx' | '5xx';
  useCase?: string;
}

const STATUS_CODES: StatusCode[] = [
  // 1xx
  { code: 100, name: 'Continue', desc: 'Server has received request headers and client should proceed to send the request body.', category: '1xx', useCase: 'Large file uploads where you want to check headers first.' },
  { code: 101, name: 'Switching Protocols', desc: 'Server agrees to switch protocols as requested by the client.', category: '1xx', useCase: 'WebSocket upgrade handshake.' },
  { code: 102, name: 'Processing', desc: 'Server has received and is processing the request, but no response is available yet.', category: '1xx', useCase: 'Long-running WebDAV operations.' },
  { code: 103, name: 'Early Hints', desc: 'Used with Link header to preload resources while the server prepares a response.', category: '1xx', useCase: 'Performance optimization — hint browser to prefetch CSS/JS.' },
  // 2xx
  { code: 200, name: 'OK', desc: 'Request succeeded. The meaning depends on the HTTP method used.', category: '2xx', useCase: 'Standard success response for GET, PUT, PATCH, DELETE.' },
  { code: 201, name: 'Created', desc: 'Request succeeded and a new resource was created as a result.', category: '2xx', useCase: 'POST endpoint that creates a new user, order, or record.' },
  { code: 202, name: 'Accepted', desc: 'Request accepted for processing, but processing has not been completed.', category: '2xx', useCase: 'Async jobs, background processing, queued tasks.' },
  { code: 204, name: 'No Content', desc: 'Request succeeded but there is no content to return.', category: '2xx', useCase: 'DELETE or PUT where you don\'t need to return the resource.' },
  { code: 206, name: 'Partial Content', desc: 'Server is delivering only part of the resource due to a Range header sent by the client.', category: '2xx', useCase: 'Video streaming, resumable file downloads.' },
  // 3xx
  { code: 301, name: 'Moved Permanently', desc: 'Resource has been permanently moved to the URL given in the Location header.', category: '3xx', useCase: 'URL redirects after site restructuring. Browsers cache this indefinitely.' },
  { code: 302, name: 'Found', desc: 'Resource temporarily located at a different URI. Client should use original URI for future requests.', category: '3xx', useCase: 'Temporary redirects, login flows.' },
  { code: 304, name: 'Not Modified', desc: 'Resource has not been modified since the version specified by If-Modified-Since or If-None-Match.', category: '3xx', useCase: 'Browser cache validation — avoids re-downloading unchanged assets.' },
  { code: 307, name: 'Temporary Redirect', desc: 'Request should be repeated at the new URI with the same method.', category: '3xx', useCase: 'Temp redirect that preserves POST method (unlike 302).' },
  { code: 308, name: 'Permanent Redirect', desc: 'Resource permanently at new URI; repeat with same method.', category: '3xx', useCase: 'Permanent redirect that preserves POST/PUT method (unlike 301).' },
  // 4xx
  { code: 400, name: 'Bad Request', desc: 'Server cannot process the request due to client error (malformed syntax, invalid params).', category: '4xx', useCase: 'Invalid JSON body, missing required fields, invalid query params.' },
  { code: 401, name: 'Unauthorized', desc: 'Request lacks valid authentication credentials for the target resource.', category: '4xx', useCase: 'Missing or invalid API key, expired JWT, unauthenticated user.' },
  { code: 403, name: 'Forbidden', desc: 'Server understood the request but refuses to authorize it.', category: '4xx', useCase: 'Authenticated user lacks permission (e.g., non-admin accessing admin routes).' },
  { code: 404, name: 'Not Found', desc: 'Server cannot find the requested resource.', category: '4xx', useCase: 'Resource doesn\'t exist, wrong URL, deleted record.' },
  { code: 405, name: 'Method Not Allowed', desc: 'HTTP method is not allowed for the requested resource.', category: '4xx', useCase: 'POST on a read-only endpoint, DELETE on a non-deletable resource.' },
  { code: 408, name: 'Request Timeout', desc: 'Server timed out waiting for the request.', category: '4xx', useCase: 'Client took too long to send the request body.' },
  { code: 409, name: 'Conflict', desc: 'Request conflicts with the current state of the target resource.', category: '4xx', useCase: 'Duplicate email on signup, concurrent edit conflicts, version mismatch.' },
  { code: 410, name: 'Gone', desc: 'Resource is no longer available and no forwarding address is known.', category: '4xx', useCase: 'Permanently deleted resources; tells crawlers to deindex.' },
  { code: 422, name: 'Unprocessable Entity', desc: 'Request is well-formed but contains semantic errors.', category: '4xx', useCase: 'Validation failures (correct JSON, but invalid field values).' },
  { code: 429, name: 'Too Many Requests', desc: 'User has sent too many requests in a given amount of time (rate limiting).', category: '4xx', useCase: 'API rate limiting. Include Retry-After header with wait time.' },
  { code: 451, name: 'Unavailable For Legal Reasons', desc: 'Resource access denied due to legal demands (censorship, court order).', category: '4xx', useCase: 'GDPR takedowns, geo-blocked content.' },
  // 5xx
  { code: 500, name: 'Internal Server Error', desc: 'Server encountered an unexpected condition that prevented it from fulfilling the request.', category: '5xx', useCase: 'Unhandled exception, bug in server code.' },
  { code: 501, name: 'Not Implemented', desc: 'Server does not support the functionality required to fulfill the request.', category: '5xx', useCase: 'Placeholder for unimplemented HTTP methods.' },
  { code: 502, name: 'Bad Gateway', desc: 'Server received an invalid response from an upstream server.', category: '5xx', useCase: 'Reverse proxy (nginx/Cloudflare) can\'t reach your backend.' },
  { code: 503, name: 'Service Unavailable', desc: 'Server is not ready to handle the request — down for maintenance or overloaded.', category: '5xx', useCase: 'Maintenance mode, server overload, circuit breaker open.' },
  { code: 504, name: 'Gateway Timeout', desc: 'Server acting as a gateway did not get a response in time from an upstream server.', category: '5xx', useCase: 'Database query taking too long, slow microservice call.' },
  { code: 507, name: 'Insufficient Storage', desc: 'Server unable to store the representation needed to complete the request (WebDAV).', category: '5xx', useCase: 'Disk full on file upload endpoints.' },
];

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  '1xx': { bg: 'bg-blue-950/30', border: 'border-blue-800', text: 'text-blue-300', badge: 'bg-blue-800 text-blue-100' },
  '2xx': { bg: 'bg-green-950/30', border: 'border-green-800', text: 'text-green-300', badge: 'bg-green-800 text-green-100' },
  '3xx': { bg: 'bg-yellow-950/30', border: 'border-yellow-800', text: 'text-yellow-300', badge: 'bg-yellow-800 text-yellow-100' },
  '4xx': { bg: 'bg-orange-950/30', border: 'border-orange-800', text: 'text-orange-300', badge: 'bg-orange-800 text-orange-100' },
  '5xx': { bg: 'bg-red-950/30', border: 'border-red-800', text: 'text-red-300', badge: 'bg-red-800 text-red-100' },
};

const CATEGORY_LABELS: Record<string, string> = {
  '1xx': '1xx Informational',
  '2xx': '2xx Success',
  '3xx': '3xx Redirection',
  '4xx': '4xx Client Error',
  '5xx': '5xx Server Error',
};

export default function HttpStatusReference() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<number | null>(null);

  const filtered = useMemo(() => {
    return STATUS_CODES.filter(s => {
      const matchCat = filter === 'all' || s.category === filter;
      const q = query.toLowerCase();
      const matchQ = !q || String(s.code).includes(q) || s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, filter]);

  const grouped = useMemo(() => {
    const g: Record<string, StatusCode[]> = {};
    for (const s of filtered) {
      if (!g[s.category]) g[s.category] = [];
      g[s.category].push(s);
    }
    return g;
  }, [filtered]);

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <input
          type="text"
          value={query}
          onInput={e => setQuery((e.target as HTMLInputElement).value)}
          placeholder="Search by code, name, or description... (e.g. 404, rate limit, redirect)"
          class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 placeholder-gray-600"
        />
        <div class="flex flex-wrap gap-2">
          {['all', '1xx', '2xx', '3xx', '4xx', '5xx'].map(cat => (
            <button key={cat} onClick={() => setFilter(cat)}
              class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                filter === cat
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
              }`}>
              {cat === 'all' ? 'All Codes' : cat}
            </button>
          ))}
          <span class="text-xs text-gray-500 self-center ml-auto">{filtered.length} codes</span>
        </div>
      </div>

      {/* Results */}
      {Object.entries(grouped).map(([cat, codes]) => {
        const col = CATEGORY_COLORS[cat];
        return (
          <div key={cat}>
            <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">{CATEGORY_LABELS[cat]}</h2>
            <div class="space-y-2">
              {codes.map(s => (
                <div key={s.code}
                  class={`rounded-xl border ${col.border} ${col.bg} cursor-pointer transition-colors hover:opacity-90`}
                  onClick={() => setExpanded(expanded === s.code ? null : s.code)}>
                  <div class="flex items-start gap-4 px-5 py-3.5">
                    <span class={`font-mono font-bold text-lg ${col.text} w-14 shrink-0`}>{s.code}</span>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-gray-100 text-sm">{s.name}</p>
                      <p class="text-gray-400 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                      {expanded === s.code && s.useCase && (
                        <div class="mt-3 pt-3 border-t border-gray-700">
                          <p class="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Common Use Case</p>
                          <p class="text-xs text-gray-300 leading-relaxed">{s.useCase}</p>
                        </div>
                      )}
                    </div>
                    <span class={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${col.badge}`}>{cat}</span>
                    <span class="text-gray-600 text-xs shrink-0 self-center">{expanded === s.code ? '▲' : '▼'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div class="text-center py-12 text-gray-500">
          No status codes match <strong class="text-gray-400">"{query}"</strong>. Try a code number or keyword.
        </div>
      )}
    </div>
  );
}
