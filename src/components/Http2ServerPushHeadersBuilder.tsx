import { useState, useCallback } from 'preact/hooks';

type ResourceType = 'style' | 'script' | 'font' | 'image' | 'fetch';
type CrossOrigin = 'none' | 'anonymous' | 'use-credentials';

interface Resource {
  id: number;
  url: string;
  type: ResourceType;
  crossorigin: CrossOrigin;
}

interface CopiedState {
  link: boolean;
  nginx: boolean;
  apache: boolean;
  caddy: boolean;
}

let nextId = 4;

const emptyResource = (id: number): Resource => ({
  id,
  url: '',
  type: 'style',
  crossorigin: 'none',
});

const initialResources: Resource[] = [
  { id: 1, url: '', type: 'style', crossorigin: 'none' },
  { id: 2, url: '', type: 'script', crossorigin: 'none' },
  { id: 3, url: '', type: 'font', crossorigin: 'anonymous' },
];

function buildLinkHeader(resources: Resource[]): string {
  return resources
    .filter((r) => r.url.trim() !== '')
    .map((r) => {
      let part = `<${r.url.trim()}>; rel=preload; as=${r.type}`;
      if (r.crossorigin !== 'none') {
        part += `; crossorigin=${r.crossorigin}`;
      }
      return part;
    })
    .join(', ');
}

export default function Http2ServerPushHeadersBuilder() {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [copied, setCopied] = useState<CopiedState>({
    link: false,
    nginx: false,
    apache: false,
    caddy: false,
  });

  const addResource = useCallback(() => {
    setResources((prev) => [...prev, emptyResource(nextId++)]);
  }, []);

  const removeResource = useCallback((id: number) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateResource = useCallback(
    (id: number, field: keyof Resource, value: string) => {
      setResources((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const linkHeader = buildLinkHeader(resources);
  const nginxSnippet = linkHeader ? `add_header Link "${linkHeader}";` : '';
  const apacheSnippet = linkHeader ? `Header add Link "${linkHeader}"` : '';
  const caddySnippet = linkHeader ? `header Link "${linkHeader}"` : '';

  const validResources = resources.filter((r) => r.url.trim() !== '');
  const warnings = resources.filter(
    (r) => r.url.trim() !== '' && !r.url.trim().startsWith('/')
  );

  const copyToClipboard = useCallback(
    async (key: keyof CopiedState, text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopied((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopied((prev) => ({ ...prev, [key]: false }));
        }, 2000);
      } catch {
        // fallback
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied((prev) => ({ ...prev, [key]: true }));
        setTimeout(() => {
          setCopied((prev) => ({ ...prev, [key]: false }));
        }, 2000);
      }
    },
    []
  );

  return (
    <div class="bg-background border border-border rounded-xl p-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div class="flex flex-col gap-4">
          <div>
            <p class="text-sm font-medium text-text-muted mb-3">Resources</p>
            <div class="flex flex-col gap-3">
              {resources.map((r) => (
                <div
                  key={r.id}
                  class="bg-surface border border-border rounded-lg p-3 flex flex-col gap-2"
                >
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="/path/to/resource.css"
                      value={r.url}
                      onInput={(e) =>
                        updateResource(r.id, 'url', (e.target as HTMLInputElement).value)
                      }
                      class="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => removeResource(r.id)}
                      class="px-2 py-2 rounded-lg text-xs text-text-muted hover:text-red-400 hover:border-red-400/50 border border-border transition-colors"
                      title="Remove resource"
                    >
                      ✕
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="flex flex-col gap-0.5 flex-1">
                      <label class="text-xs text-text-muted">Type</label>
                      <select
                        value={r.type}
                        onChange={(e) =>
                          updateResource(r.id, 'type', (e.target as HTMLSelectElement).value)
                        }
                        class="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                      >
                        <option value="style">style</option>
                        <option value="script">script</option>
                        <option value="font">font</option>
                        <option value="image">image</option>
                        <option value="fetch">fetch</option>
                      </select>
                    </div>
                    <div class="flex flex-col gap-0.5 flex-1">
                      <label class="text-xs text-text-muted">crossorigin</label>
                      <select
                        value={r.crossorigin}
                        onChange={(e) =>
                          updateResource(
                            r.id,
                            'crossorigin',
                            (e.target as HTMLSelectElement).value
                          )
                        }
                        class="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
                      >
                        <option value="none">none</option>
                        <option value="anonymous">anonymous</option>
                        <option value="use-credentials">use-credentials</option>
                      </select>
                    </div>
                  </div>
                  {r.url.trim() !== '' && !r.url.trim().startsWith('/') && (
                    <p class="text-xs text-yellow-400">
                      ⚠ URL should start with <span class="font-mono">/</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addResource}
              class="mt-3 px-3 py-1.5 rounded-lg text-xs bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              + Add Resource
            </button>
          </div>

          {warnings.length > 0 && (
            <div class="bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-3 py-2">
              <p class="text-xs text-yellow-400 font-medium">
                {warnings.length} resource{warnings.length > 1 ? 's' : ''} with URL not starting
                with <span class="font-mono">/</span> — server push requires absolute paths.
              </p>
            </div>
          )}

          {validResources.length === 0 && (
            <div class="bg-surface border border-border rounded-lg px-3 py-2">
              <p class="text-xs text-text-muted">
                Add at least one resource URL to generate the header.
              </p>
            </div>
          )}
        </div>

        {/* Right: Output */}
        <div class="flex flex-col gap-4">
          {/* Link Header */}
          <div>
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium text-text-muted">Link Header Value</p>
              <button
                onClick={() => copyToClipboard('link', linkHeader)}
                disabled={!linkHeader}
                class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied.link ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all min-h-[3rem]">
              {linkHeader || <span class="text-text-muted italic">— fill in resources above —</span>}
            </pre>
          </div>

          {/* nginx */}
          <div>
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium text-text-muted">nginx</p>
              <button
                onClick={() => copyToClipboard('nginx', nginxSnippet)}
                disabled={!nginxSnippet}
                class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied.nginx ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all min-h-[3rem]">
              {nginxSnippet || (
                <span class="text-text-muted italic">— fill in resources above —</span>
              )}
            </pre>
          </div>

          {/* Apache */}
          <div>
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium text-text-muted">Apache</p>
              <button
                onClick={() => copyToClipboard('apache', apacheSnippet)}
                disabled={!apacheSnippet}
                class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied.apache ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all min-h-[3rem]">
              {apacheSnippet || (
                <span class="text-text-muted italic">— fill in resources above —</span>
              )}
            </pre>
          </div>

          {/* Caddy */}
          <div>
            <div class="flex items-center justify-between mb-1">
              <p class="text-sm font-medium text-text-muted">Caddy</p>
              <button
                onClick={() => copyToClipboard('caddy', caddySnippet)}
                disabled={!caddySnippet}
                class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {copied.caddy ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface rounded-lg border border-border p-3 text-xs font-mono text-green-400 overflow-x-auto whitespace-pre-wrap break-all min-h-[3rem]">
              {caddySnippet || (
                <span class="text-text-muted italic">— fill in resources above —</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
