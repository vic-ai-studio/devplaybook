import { useState } from 'preact/hooks';

const DEFAULT_ENDPOINT = 'https://countries.trevorblades.com/graphql';

const DEFAULT_QUERY = `query GetCountries {
  countries(filter: { continent: { eq: "EU" } }) {
    code
    name
    capital
    currency
    emoji
    languages {
      name
    }
  }
}`;

const DEFAULT_VARIABLES = `{}`;

const EXAMPLE_QUERIES = [
  {
    name: 'EU Countries',
    endpoint: 'https://countries.trevorblades.com/graphql',
    query: `query GetCountries {
  countries(filter: { continent: { eq: "EU" } }) {
    code
    name
    capital
    emoji
  }
}`,
    variables: '{}',
  },
  {
    name: 'Country by Code',
    endpoint: 'https://countries.trevorblades.com/graphql',
    query: `query GetCountry($code: ID!) {
  country(code: $code) {
    name
    capital
    currency
    emoji
    languages {
      name
      native
    }
    continent {
      name
    }
  }
}`,
    variables: `{ "code": "US" }`,
  },
  {
    name: 'Continents',
    endpoint: 'https://countries.trevorblades.com/graphql',
    query: `query GetContinents {
  continents {
    code
    name
    countries {
      code
      name
    }
  }
}`,
    variables: '{}',
  },
];

function syntaxHighlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'text-blue-400'; // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'text-purple-400'; // key
          } else {
            cls = 'text-green-400'; // string
          }
        } else if (/true|false/.test(match)) {
          cls = 'text-yellow-400'; // boolean
        } else if (/null/.test(match)) {
          cls = 'text-red-400'; // null
        }
        return `<span class="${cls}">${match}</span>`;
      }
    );
}

export default function GraphQLPlayground() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [variables, setVariables] = useState(DEFAULT_VARIABLES);
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'query' | 'variables'>('query');
  const [copied, setCopied] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);
    setDuration(null);
    const start = performance.now();

    try {
      let parsedVars = {};
      if (variables.trim()) {
        try {
          parsedVars = JSON.parse(variables);
        } catch {
          setError('Variables must be valid JSON.');
          setLoading(false);
          return;
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables: parsedVars }),
      });

      const elapsed = Math.round(performance.now() - start);
      setDuration(elapsed);

      if (!res.ok) {
        setError(`HTTP ${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setDuration(Math.round(performance.now() - start));
      setError(err.message || 'Network error. Check the endpoint and CORS settings.');
    } finally {
      setLoading(false);
    }
  };

  const loadExample = (ex: (typeof EXAMPLE_QUERIES)[number]) => {
    setEndpoint(ex.endpoint);
    setQuery(ex.query);
    setVariables(ex.variables);
    setResponse(null);
    setError(null);
    setDuration(null);
  };

  const handleCopy = () => {
    if (response) {
      navigator.clipboard.writeText(response);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const textareaClass =
    'w-full bg-gray-950 text-green-300 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed';

  return (
    <div class="space-y-4">
      {/* Endpoint bar */}
      <div class="flex gap-2">
        <div class="flex-1 flex items-center bg-bg-secondary border border-border rounded-lg overflow-hidden">
          <span class="text-xs font-semibold text-text-muted px-3 py-2 border-r border-border bg-bg-secondary">POST</span>
          <input
            type="url"
            value={endpoint}
            onInput={(e) => setEndpoint((e.target as HTMLInputElement).value)}
            class="flex-1 bg-transparent px-3 py-2 text-sm font-mono text-text focus:outline-none"
            placeholder="https://your-graphql-endpoint.com/graphql"
          />
        </div>
        <button
          onClick={runQuery}
          disabled={loading || !endpoint.trim() || !query.trim()}
          class="px-5 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-2"
        >
          {loading ? (
            <>
              <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Running…
            </>
          ) : (
            <>▶ Run</>
          )}
        </button>
      </div>

      {/* Example queries */}
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-text-muted">Examples:</span>
        {EXAMPLE_QUERIES.map((ex) => (
          <button
            key={ex.name}
            onClick={() => loadExample(ex)}
            class="text-xs px-3 py-1.5 rounded-lg bg-bg-secondary border border-border text-text-muted hover:text-text transition-colors"
          >
            {ex.name}
          </button>
        ))}
      </div>

      {/* Main split */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" style="height: 480px;">
        {/* Left: Editor */}
        <div class="flex flex-col rounded-lg overflow-hidden border border-border">
          {/* Tabs */}
          <div class="flex bg-gray-900">
            <button
              onClick={() => setActiveTab('query')}
              class={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'query'
                  ? 'text-white border-b-2 border-accent'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Query
            </button>
            <button
              onClick={() => setActiveTab('variables')}
              class={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === 'variables'
                  ? 'text-white border-b-2 border-accent'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Variables
            </button>
          </div>

          {activeTab === 'query' ? (
            <textarea
              value={query}
              onInput={(e) => setQuery((e.target as HTMLTextAreaElement).value)}
              class={`${textareaClass} flex-1`}
              spellcheck={false}
              placeholder="# Write your GraphQL query here"
            />
          ) : (
            <textarea
              value={variables}
              onInput={(e) => setVariables((e.target as HTMLTextAreaElement).value)}
              class={`${textareaClass} flex-1`}
              spellcheck={false}
              placeholder='{ "key": "value" }'
            />
          )}
        </div>

        {/* Right: Response */}
        <div class="flex flex-col rounded-lg overflow-hidden border border-border">
          <div class="flex items-center justify-between bg-gray-900 px-4 py-2">
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-gray-400">Response</span>
              {duration !== null && (
                <span class="text-xs text-green-400 font-mono">{duration}ms</span>
              )}
              {error && <span class="text-xs text-red-400">Error</span>}
            </div>
            {response && (
              <button
                onClick={handleCopy}
                class="text-xs px-2 py-1 rounded bg-accent text-white hover:opacity-90 transition-opacity"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
          </div>

          <div class="flex-1 overflow-auto bg-gray-950 p-4">
            {loading && (
              <div class="flex items-center justify-center h-full">
                <div class="text-center space-y-2">
                  <div class="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <p class="text-xs text-gray-500">Executing query…</p>
                </div>
              </div>
            )}

            {!loading && !response && !error && (
              <div class="flex items-center justify-center h-full">
                <p class="text-xs text-gray-600">
                  Press <strong class="text-gray-400">▶ Run</strong> to execute the query
                </p>
              </div>
            )}

            {!loading && error && (
              <div class="text-red-400 text-xs font-mono">
                <p class="text-red-500 font-semibold mb-2">Error</p>
                <p>{error}</p>
                {endpoint.includes('localhost') && (
                  <p class="mt-3 text-gray-500">
                    Tip: Local servers may have CORS issues. Enable CORS or use a public GraphQL API.
                  </p>
                )}
              </div>
            )}

            {!loading && response && (
              <pre
                class="text-xs font-mono leading-relaxed text-gray-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: syntaxHighlight(response) }}
              />
            )}
          </div>
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Default endpoint: Countries GraphQL API by Trevor Blades. Queries execute client-side — your endpoint must allow CORS.
      </p>
    </div>
  );
}
