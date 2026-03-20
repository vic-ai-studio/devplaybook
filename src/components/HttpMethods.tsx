import { useState } from 'preact/hooks';

interface Method {
  name: string;
  color: string;
  safe: boolean;
  idempotent: boolean;
  body: boolean;
  cacheable: boolean;
  summary: string;
  useCase: string;
  example: string;
}

const METHODS: Method[] = [
  {
    name: 'GET',
    color: 'text-green-400',
    safe: true, idempotent: true, body: false, cacheable: true,
    summary: 'Retrieve a resource or collection.',
    useCase: 'Fetching data — user profiles, product lists, article content.',
    example: 'GET /api/users/42',
  },
  {
    name: 'POST',
    color: 'text-yellow-400',
    safe: false, idempotent: false, body: true, cacheable: false,
    summary: 'Create a new resource or submit data.',
    useCase: 'Creating records, submitting forms, triggering actions.',
    example: 'POST /api/users  Body: { "name": "Alice" }',
  },
  {
    name: 'PUT',
    color: 'text-blue-400',
    safe: false, idempotent: true, body: true, cacheable: false,
    summary: 'Replace a resource entirely.',
    useCase: 'Full updates — replaces all fields with the request body.',
    example: 'PUT /api/users/42  Body: { "name": "Alice", "email": "a@b.com" }',
  },
  {
    name: 'PATCH',
    color: 'text-purple-400',
    safe: false, idempotent: false, body: true, cacheable: false,
    summary: 'Partially update a resource.',
    useCase: 'Updating only specific fields without sending the full object.',
    example: 'PATCH /api/users/42  Body: { "email": "new@b.com" }',
  },
  {
    name: 'DELETE',
    color: 'text-red-400',
    safe: false, idempotent: true, body: false, cacheable: false,
    summary: 'Remove a resource.',
    useCase: 'Deleting a record by ID.',
    example: 'DELETE /api/users/42',
  },
  {
    name: 'HEAD',
    color: 'text-cyan-400',
    safe: true, idempotent: true, body: false, cacheable: true,
    summary: 'Same as GET but returns headers only.',
    useCase: 'Checking resource existence, getting metadata without downloading the body.',
    example: 'HEAD /api/files/report.pdf',
  },
  {
    name: 'OPTIONS',
    color: 'text-orange-400',
    safe: true, idempotent: true, body: false, cacheable: false,
    summary: 'Describe the communication options for the target resource.',
    useCase: 'CORS preflight requests — browser asks server what methods/headers are allowed.',
    example: 'OPTIONS /api/users  → Allow: GET, POST, OPTIONS',
  },
  {
    name: 'CONNECT',
    color: 'text-gray-400',
    safe: false, idempotent: false, body: false, cacheable: false,
    summary: 'Establish a tunnel (typically for HTTPS via proxy).',
    useCase: 'Used by HTTP proxies to create SSL tunnels.',
    example: 'CONNECT example.com:443 HTTP/1.1',
  },
  {
    name: 'TRACE',
    color: 'text-gray-400',
    safe: true, idempotent: true, body: false, cacheable: false,
    summary: 'Echo the received request back to the client.',
    useCase: 'Diagnostic / loopback testing. Rarely used in production (security risk).',
    example: 'TRACE /path HTTP/1.1',
  },
];

function Badge({ yes, trueLabel = 'Yes', falseLabel = 'No' }: { yes: boolean; trueLabel?: string; falseLabel?: string }) {
  return (
    <span class={`text-xs font-medium px-2 py-0.5 rounded-full ${yes ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
      {yes ? trueLabel : falseLabel}
    </span>
  );
}

export default function HttpMethods() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div class="space-y-5">
      {/* Overview table */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="px-5 py-3 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">HTTP Methods Quick Reference</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th class="text-left px-4 py-2">Method</th>
                <th class="text-left px-4 py-2">Safe</th>
                <th class="text-left px-4 py-2">Idempotent</th>
                <th class="text-left px-4 py-2">Body</th>
                <th class="text-left px-4 py-2">Cacheable</th>
                <th class="text-left px-4 py-2 hidden md:table-cell">Summary</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              {METHODS.map(m => (
                <tr key={m.name}
                  class={`cursor-pointer hover:bg-gray-800/50 transition-colors ${active === m.name ? 'bg-gray-800' : ''}`}
                  onClick={() => setActive(active === m.name ? null : m.name)}>
                  <td class="px-4 py-2.5">
                    <span class={`font-mono font-bold ${m.color}`}>{m.name}</span>
                  </td>
                  <td class="px-4 py-2.5"><Badge yes={m.safe} /></td>
                  <td class="px-4 py-2.5"><Badge yes={m.idempotent} /></td>
                  <td class="px-4 py-2.5"><Badge yes={m.body} trueLabel="Yes" falseLabel="No" /></td>
                  <td class="px-4 py-2.5"><Badge yes={m.cacheable} /></td>
                  <td class="px-4 py-2.5 hidden md:table-cell text-gray-400 text-xs">{m.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="text-xs text-gray-600 px-4 py-2 border-t border-gray-800">Click a row for details.</p>
      </div>

      {/* Detail panel */}
      {active && (() => {
        const m = METHODS.find(x => x.name === active)!;
        return (
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
            <div class="flex items-center gap-3">
              <span class={`font-mono text-2xl font-bold ${m.color}`}>{m.name}</span>
              <div class="flex gap-2 flex-wrap">
                {m.safe && <span class="text-xs bg-green-900/40 text-green-300 border border-green-700/40 rounded-full px-2 py-0.5">Safe</span>}
                {m.idempotent && <span class="text-xs bg-blue-900/40 text-blue-300 border border-blue-700/40 rounded-full px-2 py-0.5">Idempotent</span>}
                {m.cacheable && <span class="text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-700/40 rounded-full px-2 py-0.5">Cacheable</span>}
              </div>
            </div>
            <p class="text-gray-300 text-sm">{m.summary}</p>
            <div>
              <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Use Case</p>
              <p class="text-gray-300 text-sm">{m.useCase}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider">Example</p>
              <code class="block bg-gray-800 rounded-lg px-4 py-2 text-green-300 text-sm font-mono">{m.example}</code>
            </div>
          </div>
        );
      })()}

      {/* Concepts */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-2">
        <p class="font-medium text-gray-300">Key Concepts</p>
        <p><strong class="text-gray-300">Safe</strong> — The request does not modify server state (read-only). GET, HEAD, OPTIONS, TRACE are safe.</p>
        <p><strong class="text-gray-300">Idempotent</strong> — Calling the same request multiple times produces the same result. GET, PUT, DELETE are idempotent.</p>
        <p><strong class="text-gray-300">Cacheable</strong> — Responses can be stored and reused. GET and HEAD are commonly cached.</p>
      </div>
    </div>
  );
}
