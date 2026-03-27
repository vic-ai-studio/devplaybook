import { useState } from 'preact/hooks';

const SAMPLE_SAML_B64 = 'fZBNT8MwDIbv/IrId2faFgRpV8QkEJc9gNjNNKkaBedDcbvx70lXBkKCS2T7ed/Hsf8AX4PHfW+UxgAnzWAnPZjDpT1JyS0q7YEOXAqlV4skhHFwBJfQaZ1z2Z8ADmRXnJHMJzqCeXLWpfEXIIjLWXbDsyGgJAJDdXTMBPpG7IJTb3P+oO6PlyS7yjJ4b5DkEDmELVcvR0rPV4VGrR0KZIjb8Wb';

function tryDecode(input: string): { xml: string; error?: string } {
  try {
    const trimmed = input.trim();
    // Try URL-decode first
    let decoded = trimmed;
    try { decoded = decodeURIComponent(trimmed); } catch { /* ignore */ }
    // Base64 decode
    const binary = atob(decoded);
    return { xml: binary };
  } catch {
    try {
      // Maybe it's already XML
      if (input.trim().startsWith('<')) return { xml: input.trim() };
      return { xml: '', error: 'Could not decode. Ensure input is Base64-encoded SAML.' };
    } catch {
      return { xml: '', error: 'Failed to decode.' };
    }
  }
}

function parseAttributes(xml: string): { key: string; value: string; type?: string }[] {
  const attrs: { key: string; value: string; type?: string }[] = [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const parseErr = doc.querySelector('parsererror');
    if (parseErr) return [];

    // SAML2 attributes
    doc.querySelectorAll('Attribute, saml\\:Attribute, saml2\\:Attribute').forEach(attr => {
      const name = attr.getAttribute('Name') || attr.getAttribute('name') || '';
      const format = attr.getAttribute('NameFormat') || '';
      const values: string[] = [];
      attr.querySelectorAll('AttributeValue, saml\\:AttributeValue, saml2\\:AttributeValue').forEach(v => {
        values.push(v.textContent || '');
      });
      if (name) attrs.push({ key: name, value: values.join(', '), type: format });
    });

    // NameID
    const nameId = doc.querySelector('NameID, saml\\:NameID, saml2\\:NameID');
    if (nameId?.textContent) {
      attrs.unshift({ key: 'NameID', value: nameId.textContent, type: nameId.getAttribute('Format') || '' });
    }
  } catch { /* ignore */ }
  return attrs;
}

function extractMeta(xml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return meta;

    const root = doc.documentElement;
    const tagName = root.localName;
    meta['Type'] = tagName.includes('Response') ? 'SAML Response' : tagName.includes('AuthnRequest') ? 'SAML AuthnRequest' : tagName.includes('LogoutRequest') ? 'SAML LogoutRequest' : tagName;

    // Issuer
    const issuer = doc.querySelector('Issuer, saml\\:Issuer, saml2\\:Issuer');
    if (issuer?.textContent) meta['Issuer'] = issuer.textContent.trim();

    // Destination
    const dest = root.getAttribute('Destination') || root.getAttribute('destination');
    if (dest) meta['Destination'] = dest;

    // IssueInstant
    const issued = root.getAttribute('IssueInstant') || root.getAttribute('issueInstant');
    if (issued) meta['IssueInstant'] = issued;

    // ID
    const id = root.getAttribute('ID') || root.getAttribute('Id');
    if (id) meta['ID'] = id;

    // InResponseTo
    const irt = root.getAttribute('InResponseTo');
    if (irt) meta['InResponseTo'] = irt;

    // Status
    const status = doc.querySelector('StatusCode');
    if (status) meta['Status'] = status.getAttribute('Value')?.split(':').pop() || '';

    // Conditions
    const cond = doc.querySelector('Conditions');
    if (cond) {
      const nb = cond.getAttribute('NotBefore');
      const na = cond.getAttribute('NotOnOrAfter');
      if (nb) meta['Valid From'] = nb;
      if (na) meta['Valid Until'] = na;

      // Check expiry
      if (na) {
        const exp = new Date(na);
        const now = new Date();
        meta['Expired'] = exp < now ? '⚠️ Yes' : '✓ No';
      }
    }

    // AssertionConsumerService for AuthnRequest
    const acs = root.getAttribute('AssertionConsumerServiceURL');
    if (acs) meta['ACS URL'] = acs;

  } catch { /* ignore */ }
  return meta;
}

function formatXml(xml: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return xml;
    const ser = new XMLSerializer();
    let str = ser.serializeToString(doc);
    // Simple indent
    let indent = 0;
    return str.replace(/></g, '>\n<').split('\n').map(line => {
      if (line.match(/^<\/[^>]+>/)) indent = Math.max(0, indent - 2);
      const result = ' '.repeat(indent) + line;
      if (line.match(/^<[^/!][^>]*[^/]>$/) && !line.match(/<.*>.*<\/.*>/)) indent += 2;
      return result;
    }).join('\n');
  } catch {
    return xml;
  }
}

type Tab = 'meta' | 'attributes' | 'raw';

export default function SamlRequestDecoder() {
  const [input, setInput] = useState('');
  const [decoded, setDecoded] = useState<{ xml: string; error?: string } | null>(null);
  const [tab, setTab] = useState<Tab>('meta');
  const [copied, setCopied] = useState(false);

  function decode() {
    const result = tryDecode(input || SAMPLE_SAML_B64);
    setDecoded(result);
    setTab('meta');
  }

  function loadSample() {
    setInput(SAMPLE_SAML_B64);
  }

  const meta = decoded?.xml ? extractMeta(decoded.xml) : {};
  const attrs = decoded?.xml ? parseAttributes(decoded.xml) : [];
  const formatted = decoded?.xml ? formatXml(decoded.xml) : '';

  function copy() {
    const text = tab === 'raw' ? formatted : tab === 'meta' ? Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join('\n') : attrs.map(a => `${a.key}: ${a.value}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const STATUS_COLORS: Record<string, string> = {
    Success: 'text-green-400',
    Failure: 'text-red-400',
    NoAuthnContext: 'text-yellow-400',
    RequestDenied: 'text-red-400',
  };

  return (
    <div class="space-y-6">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium">Base64-encoded SAML Request or Response</label>
          <button onClick={loadSample} class="text-xs text-primary hover:underline">Load sample</button>
        </div>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={5}
          placeholder="Paste Base64-encoded SAML here (e.g. from SAMLRequest= URL param or SAML POST body)"
          class="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono resize-y"
        />
        <p class="text-xs text-text-muted mt-1">Accepts: Base64, URL-encoded Base64, or raw XML</p>
      </div>

      <button
        onClick={decode}
        class="w-full py-3 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors"
      >
        Decode & Inspect
      </button>

      {decoded && (
        decoded.error ? (
          <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{decoded.error}</div>
        ) : (
          <div class="space-y-4">
            {/* Tabs */}
            <div class="flex gap-2 border-b border-border pb-2">
              {(['meta', 'attributes', 'raw'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  class={`px-4 py-1.5 rounded-t text-sm font-medium transition-colors ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
                >
                  {t === 'meta' ? 'Metadata' : t === 'attributes' ? `Attributes (${attrs.length})` : 'Raw XML'}
                </button>
              ))}
              <button onClick={copy} class="ml-auto text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>

            {tab === 'meta' && (
              <div class="space-y-2">
                {Object.entries(meta).length === 0 ? (
                  <p class="text-text-muted text-sm">No metadata found. Input may not be valid SAML XML.</p>
                ) : Object.entries(meta).map(([key, val]) => (
                  <div key={key} class="flex gap-3 p-3 rounded-lg bg-bg border border-border">
                    <span class="text-sm font-medium text-text-muted w-28 shrink-0">{key}</span>
                    <span class={`text-sm font-mono break-all ${STATUS_COLORS[val] || 'text-text'}`}>{val}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'attributes' && (
              <div class="space-y-2">
                {attrs.length === 0 ? (
                  <p class="text-text-muted text-sm">No SAML attributes found in this message.</p>
                ) : attrs.map((attr, i) => (
                  <div key={i} class="p-3 rounded-lg bg-bg border border-border">
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-sm font-medium text-primary break-all">{attr.key}</span>
                      {attr.type && <span class="text-xs text-text-muted shrink-0">{attr.type.split('/').pop()}</span>}
                    </div>
                    <code class="text-sm font-mono text-text break-all">{attr.value}</code>
                  </div>
                ))}
              </div>
            )}

            {tab === 'raw' && (
              <pre class="p-4 rounded-xl bg-bg border border-border text-xs font-mono overflow-x-auto whitespace-pre max-h-96">{formatted}</pre>
            )}
          </div>
        )
      )}

      {/* Guide */}
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p class="font-medium mb-2">Where to find SAML data</p>
        <ul class="text-text-muted space-y-1 text-xs">
          <li>• Browser DevTools → Network → Filter "saml" → look for SAMLRequest / SAMLResponse form fields</li>
          <li>• URL params: ?SAMLRequest=BASE64... or ?SAMLResponse=BASE64...</li>
          <li>• Chrome SAML extension or Firefox SAML DevTools extension</li>
        </ul>
      </div>
    </div>
  );
}
