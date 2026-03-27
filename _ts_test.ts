
  // ── Utilities ─────────────────────────────────────────────────────────────
  function escHtml(s: string): string {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatBytes(n: number): string {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── JSON syntax highlighter ───────────────────────────────────────────────
  function highlightJson(json: string): string {
    // Tokenize and colorize JSON
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = 'json-num';
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-str';
        } else if (/true|false/.test(match)) {
          cls = 'json-bool';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${escHtml(match)}</span>`;
      }
    );
  }

  // ── Basic query formatter ─────────────────────────────────────────────────
  function formatGraphQL(query: string): string {
    let indent = 0;
    let result = '';
    let i = 0;
    query = query.trim();
    while (i < query.length) {
      const ch = query[i];
      if (ch === '{') {
        result += ' {\n' + '  '.repeat(++indent);
      } else if (ch === '}') {
        indent = Math.max(0, indent - 1);
        result = result.trimEnd() + '\n' + '  '.repeat(indent) + '}\n' + '  '.repeat(indent);
      } else if (ch === ',') {
        result += '\n' + '  '.repeat(indent);
      } else if (ch === '\n' || ch === '\r') {
        if (result.length > 0 && result[result.length - 1] !== '\n') {
          result += '\n' + '  '.repeat(indent);
        }
      } else {
        result += ch;
      }
      i++;
    }
    // Collapse excessive blank lines
    return result.replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── History helpers ───────────────────────────────────────────────────────
  const HISTORY_KEY = 'devplaybook_gql_history';

  function loadHistory(): Array<{ endpoint: string; query: string; ts: number }> {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
  }

  function saveHistory(item: { endpoint: string; query: string; ts: number }) {
    const hist = loadHistory().filter(h => h.query.trim() !== item.query.trim());
    hist.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(hist.slice(0, 5)));
  }

  function renderHistory() {
    const hist = loadHistory();
    const listEl = document.getElementById('history-list') as HTMLElement;
    const emptyEl = document.getElementById('history-empty') as HTMLElement;
    listEl.innerHTML = '';
    if (hist.length === 0) {
      emptyEl.classList.remove('hidden');
      return;
    }
    emptyEl.classList.add('hidden');
    hist.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      const date = new Date(item.ts).toLocaleTimeString();
      el.innerHTML = `
        <div class="text-xs text-text-muted mb-1">${escHtml(item.endpoint)} <span class="float-right">${date}</span></div>
        <pre class="text-xs font-mono text-text truncate whitespace-nowrap overflow-hidden">${escHtml(item.query.slice(0, 120))}${item.query.length > 120 ? '…' : ''}</pre>
      `;
      el.addEventListener('click', () => {
        (document.getElementById('endpoint-input') as HTMLInputElement).value = item.endpoint;
        (document.getElementById('query-editor') as HTMLTextAreaElement).value = item.query;
        switchTab('response');
      });
      listEl.appendChild(el);
    });
  }

  // ── Tab switcher ──────────────────────────────────────────────────────────
  type TabName = 'response' | 'schema' | 'history';

  function switchTab(tab: TabName) {
    const tabs: TabName[] = ['response', 'schema', 'history'];
    tabs.forEach(t => {
      document.getElementById(`tab-${t}`)?.classList.toggle('active', t === tab);
      const panel = document.getElementById(`panel-${t}`);
      if (panel) panel.classList.toggle('hidden', t !== tab);
    });
    if (tab === 'history') renderHistory();
  }

  // ── Headers management ────────────────────────────────────────────────────
  let headerRows: Array<{ key: string; value: string }> = [];

  function renderHeaders() {
    const listEl = document.getElementById('headers-list') as HTMLElement;
    const countEl = document.getElementById('header-count') as HTMLElement;
    listEl.innerHTML = '';
    headerRows.forEach((row, idx) => {
      const div = document.createElement('div');
      div.className = 'flex gap-2 items-center';
      div.innerHTML = `
        <input type="text" placeholder="Key (e.g. Authorization)" value="${escHtml(row.key)}"
          class="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
          data-idx="${idx}" data-field="key" />
        <input type="text" placeholder="Value (e.g. Bearer token)" value="${escHtml(row.value)}"
          class="flex-1 bg-bg border border-border rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-primary"
          data-idx="${idx}" data-field="value" />
        <button class="remove-header-btn text-red-400 hover:text-red-300 text-xs px-2 py-1.5 transition-colors" data-idx="${idx}">✕</button>
      `;
      listEl.appendChild(div);
    });
    // Bind input changes
    listEl.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = Number((inp as HTMLElement).dataset.idx);
        const field = (inp as HTMLElement).dataset.field as 'key' | 'value';
        headerRows[idx][field] = inp.value;
        const active = headerRows.filter(r => r.key.trim()).length;
        countEl.textContent = `(${active})`;
      });
    });
    listEl.querySelectorAll('.remove-header-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        headerRows.splice(Number((btn as HTMLElement).dataset.idx), 1);
        renderHeaders();
      });
    });
    const active = headerRows.filter(r => r.key.trim()).length;
    countEl.textContent = `(${active})`;
  }

  function buildHeaders(): Record<string, string> {
    const out: Record<string, string> = { 'Content-Type': 'application/json' };
    headerRows.forEach(({ key, value }) => {
      if (key.trim()) out[key.trim()] = value;
    });
    return out;
  }

  // ── Execute query ─────────────────────────────────────────────────────────
  async function executeQuery(queryOverride?: string) {
    const endpoint = (document.getElementById('endpoint-input') as HTMLInputElement).value.trim();
    const query = queryOverride ?? (document.getElementById('query-editor') as HTMLTextAreaElement).value.trim();
    const varsRaw = (document.getElementById('variables-editor') as HTMLTextAreaElement).value.trim();
    const varsError = document.getElementById('vars-error') as HTMLElement;
    const executeBtn = document.getElementById('execute-btn') as HTMLButtonElement;
    const executeLabel = document.getElementById('execute-label') as HTMLElement;
    const executeSpinner = document.getElementById('execute-spinner') as HTMLElement;

    if (!endpoint) { showError('Please enter a GraphQL endpoint URL.'); return; }
    if (!query) { showError('Please enter a GraphQL query.'); return; }

    // Validate variables JSON
    let variables: unknown = undefined;
    if (varsRaw) {
      try {
        variables = JSON.parse(varsRaw);
        varsError.classList.add('hidden');
      } catch {
        varsError.classList.remove('hidden');
        return;
      }
    }

    // Show loading
    executeBtn.disabled = true;
    executeLabel.textContent = 'Running…';
    executeSpinner.classList.remove('hidden');
    switchTab('response');
    document.getElementById('response-placeholder')?.classList.add('hidden');
    document.getElementById('response-loading')?.classList.remove('hidden');
    document.getElementById('response-output')?.classList.add('hidden');
    document.getElementById('response-error')?.classList.add('hidden');
    document.getElementById('graphql-errors')?.classList.add('hidden');
    document.getElementById('response-meta')?.classList.add('hidden');
    document.getElementById('copy-response-btn')?.classList.add('hidden');

    const t0 = performance.now();
    try {
      const body: Record<string, unknown> = { query };
      if (variables !== undefined) body.variables = variables;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify(body),
      });

      const elapsed = Math.round(performance.now() - t0);
      const raw = await res.text();
      const size = new TextEncoder().encode(raw).length;

      const metaEl = document.getElementById('response-meta') as HTMLElement;
      metaEl.textContent = `${elapsed}ms · ${formatBytes(size)} · HTTP ${res.status}`;
      metaEl.classList.remove('hidden');

      if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
        showError(`HTTP ${res.status} ${res.statusText}\n\n${raw.slice(0, 400)}`);
        return;
      }

      let data: unknown;
      try { data = JSON.parse(raw); } catch { showError(`Non-JSON response (HTTP ${res.status}):\n${raw.slice(0, 600)}`); return; }

      // Show pretty JSON
      const prettyJson = JSON.stringify(data, null, 2);
      const outputEl = document.getElementById('response-output') as HTMLElement;
      document.getElementById('response-loading')?.classList.add('hidden');
      outputEl.innerHTML = highlightJson(escHtml(prettyJson));
      outputEl.classList.remove('hidden');

      // GraphQL errors array
      if (data && typeof data === 'object' && 'errors' in data && Array.isArray((data as any).errors)) {
        const errList = document.getElementById('graphql-errors-list') as HTMLElement;
        errList.innerHTML = (data as any).errors.map((e: any) => `<div>${escHtml(e.message || JSON.stringify(e))}</div>`).join('');
        document.getElementById('graphql-errors')?.classList.remove('hidden');
      }

      const copyBtn = document.getElementById('copy-response-btn') as HTMLElement;
      copyBtn.classList.remove('hidden');
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(prettyJson).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1800);
        });
      };

      // Save to history
      saveHistory({ endpoint, query, ts: Date.now() });

    } catch (err: any) {
      document.getElementById('response-loading')?.classList.add('hidden');
      showError(err?.message || 'Network error. Check the endpoint URL and CORS settings.');
    } finally {
      executeBtn.disabled = false;
      executeLabel.textContent = 'Run Query';
      executeSpinner.classList.add('hidden');
    }
  }

  function showError(msg: string) {
    document.getElementById('response-loading')?.classList.add('hidden');
    document.getElementById('response-placeholder')?.classList.add('hidden');
    const errEl = document.getElementById('response-error') as HTMLElement;
    const errMsg = document.getElementById('response-error-msg') as HTMLElement;
    errMsg.textContent = msg;
    errEl.classList.remove('hidden');
  }

  // ── Introspect schema ─────────────────────────────────────────────────────
  const INTROSPECTION_QUERY = `{
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      kind
      description
      fields {
        name
        type { name kind ofType { name kind } }
      }
    }
  }
}`;

  async function introspectSchema() {
    const endpoint = (document.getElementById('endpoint-input') as HTMLInputElement).value.trim();
    if (!endpoint) { showError('Please enter a GraphQL endpoint URL.'); return; }

    const btn = document.getElementById('introspect-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Loading…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders(),
        body: JSON.stringify({ query: INTROSPECTION_QUERY }),
      });
      const data = await res.json() as any;
      const schema = data?.data?.__schema;
      if (!schema) {
        showError('Introspection failed. The API may have introspection disabled.');
        switchTab('response');
        return;
      }

      const typesEl = document.getElementById('schema-types') as HTMLElement;
      const schemaTab = document.getElementById('tab-schema') as HTMLElement;
      schemaTab.classList.remove('hidden');

      const userTypes = (schema.types as any[]).filter(t => !t.name.startsWith('__') && t.kind !== 'SCALAR' && t.kind !== 'ENUM');
      typesEl.innerHTML = userTypes.map(t => {
        const fields = (t.fields || []).map((f: any) => {
          const typeName = f.type?.name || f.type?.ofType?.name || f.type?.kind || '';
          return `  <span class="text-text-muted ml-4">  ${escHtml(f.name)}</span><span class="text-text-muted">: </span><span style="color:#fdba74">${escHtml(typeName)}</span>`;
        }).join('\n');
        return `<div class="mb-3"><span class="text-xs text-text-muted uppercase mr-1">${escHtml(t.kind)}</span><span style="color:#93c5fd" class="font-semibold">${escHtml(t.name)}</span>${fields ? '\n' + fields : ''}</div>`;
      }).join('');

      switchTab('schema');
    } catch (err: any) {
      showError('Introspection request failed: ' + (err?.message || 'Network error'));
      switchTab('response');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Introspect';
    }
  }

  // ── Example queries ───────────────────────────────────────────────────────
  const EXAMPLES: Record<string, { endpoint?: string; query: string; variables?: string }> = {
    hello: {
      endpoint: 'https://countries.trevorblades.com/',
      query: `{
  countries {
    code
    name
    emoji
    capital
    currency
    continent {
      name
    }
  }
}`,
    },
    country: {
      endpoint: 'https://countries.trevorblades.com/',
      query: `query GetCountry($code: ID!) {
  country(code: $code) {
    name
    native
    capital
    emoji
    currency
    languages {
      code
      name
    }
  }
}`,
      variables: '{ "code": "US" }',
    },
    custom: {
      query: `mutation CreateItem($input: CreateItemInput!) {
  createItem(input: $input) {
    id
    name
    createdAt
  }
}`,
      variables: '{ "input": { "name": "My item" } }',
    },
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Default header row
    headerRows.push({ key: '', value: '' });
    renderHeaders();

    // Add header
    document.getElementById('add-header-btn')?.addEventListener('click', () => {
      headerRows.push({ key: '', value: '' });
      renderHeaders();
      (document.getElementById('headers-section') as HTMLDetailsElement).open = true;
    });

    // Execute button
    document.getElementById('execute-btn')?.addEventListener('click', () => executeQuery());

    // Introspect button
    document.getElementById('introspect-btn')?.addEventListener('click', introspectSchema);

    // Ctrl+Enter in query editor
    document.getElementById('query-editor')?.addEventListener('keydown', (e) => {
      const ke = e as KeyboardEvent;
      if (ke.ctrlKey && ke.key === 'Enter') { ke.preventDefault(); executeQuery(); }
      if (ke.ctrlKey && ke.shiftKey && ke.key === 'F') { ke.preventDefault(); formatQuery(); }
    });

    // Format button
    document.getElementById('format-btn')?.addEventListener('click', formatQuery);

    function formatQuery() {
      const ta = document.getElementById('query-editor') as HTMLTextAreaElement;
      try { ta.value = formatGraphQL(ta.value); } catch { /* ignore */ }
    }

    // Example dropdown
    document.getElementById('example-select')?.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (!val || !EXAMPLES[val]) return;
      const ex = EXAMPLES[val];
      if (ex.endpoint) (document.getElementById('endpoint-input') as HTMLInputElement).value = ex.endpoint;
      (document.getElementById('query-editor') as HTMLTextAreaElement).value = ex.query;
      (document.getElementById('variables-editor') as HTMLTextAreaElement).value = ex.variables || '';
      if (ex.variables) (document.getElementById('variables-section') as HTMLDetailsElement).open = true;
      (e.target as HTMLSelectElement).value = '';
    });

    // Tabs
    document.getElementById('tab-response')?.addEventListener('click', () => switchTab('response'));
    document.getElementById('tab-schema')?.addEventListener('click', () => switchTab('schema'));
    document.getElementById('tab-history')?.addEventListener('click', () => switchTab('history'));

    // Clear history
    document.getElementById('clear-history-btn')?.addEventListener('click', () => {
      localStorage.removeItem(HISTORY_KEY);
      renderHistory();
    });

    // Init tabs
    switchTab('response');
  });
