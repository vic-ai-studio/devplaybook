import { useState, useEffect, useRef } from 'preact/hooks';

const SAMPLE_TEMPLATES: Record<string, string> = {
  newsletter: `<mjml>
  <mj-head>
    <mj-title>Monthly Newsletter</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
      <mj-text font-size="14px" color="#333333" line-height="1.6" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section background-color="#1a73e8" padding="20px">
      <mj-column>
        <mj-text color="#ffffff" font-size="24px" font-weight="bold" align="center">
          Monthly Newsletter
        </mj-text>
        <mj-text color="#e8f0fe" font-size="13px" align="center">
          March 2025 Edition
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="20px 30px">
      <mj-column>
        <mj-text font-size="20px" font-weight="bold" color="#1a73e8">
          This Month's Highlights
        </mj-text>
        <mj-divider border-color="#e0e0e0" />
        <mj-text>
          Hello there! Here's what happened this month. We've been busy shipping new
          features, writing guides, and building things you'll love.
        </mj-text>
        <mj-button background-color="#1a73e8" href="#" border-radius="4px">
          Read More →
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section background-color="#f4f4f4" padding="10px 30px">
      <mj-column>
        <mj-text font-size="11px" color="#999999" align="center">
          You're receiving this because you subscribed at example.com<br/>
          <a href="#" style="color:#1a73e8;">Unsubscribe</a> · <a href="#" style="color:#1a73e8;">Privacy Policy</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,

  transactional: `<mjml>
  <mj-head>
    <mj-title>Order Confirmation</mj-title>
    <mj-attributes>
      <mj-all font-family="Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f9f9f9">
    <mj-section background-color="#ffffff" padding="30px">
      <mj-column>
        <mj-text font-size="22px" font-weight="bold" color="#2d2d2d">
          ✅ Order Confirmed
        </mj-text>
        <mj-text color="#555555">
          Thanks for your purchase! Your order <strong>#ORD-20250312</strong> has been confirmed.
        </mj-text>
        <mj-divider border-color="#eeeeee" />
        <mj-text font-weight="bold">Order Summary</mj-text>
        <mj-table>
          <tr style="background:#f5f5f5;">
            <td style="padding:8px;font-size:13px;">Item</td>
            <td style="padding:8px;font-size:13px;text-align:right;">Price</td>
          </tr>
          <tr>
            <td style="padding:8px;font-size:13px;">DevPlaybook Pro Plan</td>
            <td style="padding:8px;font-size:13px;text-align:right;">$9.00</td>
          </tr>
          <tr style="font-weight:bold;">
            <td style="padding:8px;font-size:13px;">Total</td>
            <td style="padding:8px;font-size:13px;text-align:right;">$9.00</td>
          </tr>
        </mj-table>
        <mj-button background-color="#34a853" href="#" border-radius="4px">
          View Order Details
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,

  promotional: `<mjml>
  <mj-head>
    <mj-title>Special Offer — 30% Off</mj-title>
  </mj-head>
  <mj-body background-color="#0d1117">
    <mj-section background-color="#238636" padding="30px">
      <mj-column>
        <mj-text color="#ffffff" font-size="28px" font-weight="bold" align="center" font-family="Arial, sans-serif">
          🎉 30% OFF — This Weekend Only
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#161b22" padding="30px">
      <mj-column>
        <mj-text color="#e6edf3" font-family="Arial, sans-serif" font-size="15px">
          Don't miss our biggest sale of the quarter. Use code <strong style="color:#f78166;">SAVE30</strong> at checkout.
        </mj-text>
        <mj-text color="#8b949e" font-family="Arial, sans-serif" font-size="13px">
          Offer valid until March 15, 2025. Limited time only.
        </mj-text>
        <mj-button background-color="#238636" href="#" border-radius="6px" font-family="Arial, sans-serif">
          Shop Now — Save 30%
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section background-color="#0d1117" padding="10px">
      <mj-column>
        <mj-text color="#484f58" font-size="11px" align="center" font-family="Arial, sans-serif">
          <a href="#" style="color:#58a6ff;">Unsubscribe</a> · example.com
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>`,
};

type Viewport = 'mobile' | 'desktop';
type Tab = 'editor' | 'html';

function mjmlToHtml(mjml: string): { html: string; errors: string[] } {
  // Parse MJML to basic HTML - simplified renderer
  const errors: string[] = [];

  try {
    // Extract title
    const titleMatch = mjml.match(/<mj-title>([\s\S]*?)<\/mj-title>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Email Preview';

    // Extract background color from mj-body
    const bodyBgMatch = mjml.match(/<mj-body[^>]*background-color="([^"]+)"/);
    const bodyBg = bodyBgMatch ? bodyBgMatch[1] : '#ffffff';

    // Parse sections
    const sectionRegex = /<mj-section([^>]*)>([\s\S]*?)<\/mj-section>/g;
    let sectionsHtml = '';
    let sectionMatch;

    while ((sectionMatch = sectionRegex.exec(mjml)) !== null) {
      const attrs = sectionMatch[1];
      const content = sectionMatch[2];

      const bgMatch = attrs.match(/background-color="([^"]+)"/);
      const paddingMatch = attrs.match(/padding="([^"]+)"/);
      const bg = bgMatch ? bgMatch[1] : 'transparent';
      const padding = paddingMatch ? paddingMatch[1] : '20px';

      // Parse columns
      const colRegex = /<mj-column([^>]*)>([\s\S]*?)<\/mj-column>/g;
      let colsHtml = '';
      let colMatch;
      const cols: string[] = [];

      while ((colMatch = colRegex.exec(content)) !== null) {
        const colContent = colMatch[2];
        cols.push(renderColumnContent(colContent));
      }

      const colWidth = cols.length > 0 ? `${100 / cols.length}%` : '100%';
      colsHtml = cols.map(c => `<td style="width:${colWidth};vertical-align:top;">${c}</td>`).join('');

      sectionsHtml += `<tr><td style="background-color:${bg};padding:0;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
          <tr style="padding:${padding};">${colsHtml}</tr>
        </table>
      </td></tr>`;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${bodyBg}; }
    table { border-collapse: collapse; }
    img { border: 0; }
    a { text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    ${sectionsHtml}
  </table>
</body>
</html>`;

    return { html, errors };
  } catch (e) {
    errors.push('Parse error: ' + (e as Error).message);
    return { html: '', errors };
  }
}

function renderColumnContent(content: string): string {
  let html = '';

  // mj-text
  content = content.replace(/<mj-text([^>]*)>([\s\S]*?)<\/mj-text>/g, (_, attrs, text) => {
    const styleAttrs: string[] = [];
    const fsMatch = attrs.match(/font-size="([^"]+)"/);
    const colorMatch = attrs.match(/color="([^"]+)"/);
    const fwMatch = attrs.match(/font-weight="([^"]+)"/);
    const alignMatch = attrs.match(/align="([^"]+)"/);
    const ffMatch = attrs.match(/font-family="([^"]+)"/);
    const lhMatch = attrs.match(/line-height="([^"]+)"/);
    if (fsMatch) styleAttrs.push(`font-size:${fsMatch[1]}`);
    if (colorMatch) styleAttrs.push(`color:${colorMatch[1]}`);
    if (fwMatch) styleAttrs.push(`font-weight:${fwMatch[1]}`);
    if (alignMatch) styleAttrs.push(`text-align:${alignMatch[1]}`);
    if (ffMatch) styleAttrs.push(`font-family:${ffMatch[1]}`);
    if (lhMatch) styleAttrs.push(`line-height:${lhMatch[1]}`);
    styleAttrs.push('padding:10px 20px;margin:0;');
    html += `<p style="${styleAttrs.join(';')}">${text.trim()}</p>`;
    return '';
  });

  // mj-button
  content = content.replace(/<mj-button([^>]*)>([\s\S]*?)<\/mj-button>/g, (_, attrs, text) => {
    const bgMatch = attrs.match(/background-color="([^"]+)"/);
    const hrefMatch = attrs.match(/href="([^"]+)"/);
    const brMatch = attrs.match(/border-radius="([^"]+)"/);
    const ffMatch = attrs.match(/font-family="([^"]+)"/);
    const bg = bgMatch ? bgMatch[1] : '#1a73e8';
    const href = hrefMatch ? hrefMatch[1] : '#';
    const br = brMatch ? brMatch[1] : '4px';
    const ff = ffMatch ? ffMatch[1] : 'Arial,sans-serif';
    html += `<p style="text-align:center;padding:10px 20px;">
      <a href="${href}" style="background-color:${bg};color:#ffffff;padding:12px 24px;border-radius:${br};font-family:${ff};font-size:14px;font-weight:bold;display:inline-block;">${text.trim()}</a>
    </p>`;
    return '';
  });

  // mj-divider
  content = content.replace(/<mj-divider([^>]*)\/?>/g, (_, attrs) => {
    const colorMatch = attrs.match(/border-color="([^"]+)"/);
    const color = colorMatch ? colorMatch[1] : '#e0e0e0';
    html += `<hr style="border:none;border-top:1px solid ${color};margin:10px 20px;" />`;
    return '';
  });

  // mj-table
  content = content.replace(/<mj-table([^>]*)>([\s\S]*?)<\/mj-table>/g, (_, __, tableContent) => {
    html += `<div style="padding:10px 20px;"><table width="100%" style="border-collapse:collapse;font-family:Arial,sans-serif;">${tableContent}</table></div>`;
    return '';
  });

  return html || `<div style="padding:10px 20px;">${content.replace(/<[^>]+>/g, '')}</div>`;
}

const SNIPPETS = [
  { label: 'Section', code: `<mj-section background-color="#ffffff" padding="20px">\n  <mj-column>\n    <!-- content -->\n  </mj-column>\n</mj-section>` },
  { label: 'Text', code: `<mj-text font-size="14px" color="#333333">\n  Your text here\n</mj-text>` },
  { label: 'Button', code: `<mj-button background-color="#1a73e8" href="#" border-radius="4px">\n  Click Here\n</mj-button>` },
  { label: 'Divider', code: `<mj-divider border-color="#e0e0e0" />` },
  { label: 'Image', code: `<mj-image src="https://via.placeholder.com/600x200" width="600px" alt="Image" />` },
  { label: 'Two Columns', code: `<mj-section>\n  <mj-column width="50%">\n    <mj-text>Column 1</mj-text>\n  </mj-column>\n  <mj-column width="50%">\n    <mj-text>Column 2</mj-text>\n  </mj-column>\n</mj-section>` },
];

export default function EmailMjmlPreview() {
  const [code, setCode] = useState(SAMPLE_TEMPLATES.newsletter);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [activeTab, setActiveTab] = useState<Tab>('editor');
  const [template, setTemplate] = useState('newsletter');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { html, errors } = mjmlToHtml(code);

  useEffect(() => {
    if (iframeRef.current && html) {
      const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html, viewport]);

  function loadTemplate(name: string) {
    setTemplate(name);
    setCode(SAMPLE_TEMPLATES[name]);
  }

  function insertSnippet(snippetCode: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newCode = code.slice(0, start) + snippetCode + code.slice(end);
    setCode(newCode);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + snippetCode.length;
      ta.focus();
    }, 0);
  }

  function copyHtml() {
    navigator.clipboard.writeText(html).then(() => {
      const btn = document.getElementById('copy-html-btn');
      if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent && (btn.textContent = 'Export HTML'), 1500); }
    });
  }

  const iframeWidth = viewport === 'mobile' ? '375px' : '100%';

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-2">
          {(['newsletter', 'transactional', 'promotional'] as const).map(t => (
            <button
              key={t}
              onClick={() => loadTemplate(t)}
              class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${template === t ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div class="flex gap-2 ml-auto">
          <button
            onClick={() => setViewport('desktop')}
            class={`px-3 py-1.5 rounded text-sm transition-colors ${viewport === 'desktop' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
          >
            🖥 Desktop
          </button>
          <button
            onClick={() => setViewport('mobile')}
            class={`px-3 py-1.5 rounded text-sm transition-colors ${viewport === 'mobile' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
          >
            📱 Mobile (375px)
          </button>
          <button id="copy-html-btn" onClick={copyHtml} class="px-3 py-1.5 rounded text-sm bg-accent text-white hover:bg-accent/90 transition-colors">
            Export HTML
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Editor */}
        <div class="space-y-3">
          {/* Snippets */}
          <div>
            <p class="text-xs text-text-muted mb-1.5 font-medium">MJML Snippets (click to insert at cursor)</p>
            <div class="flex flex-wrap gap-1.5">
              {SNIPPETS.map(s => (
                <button
                  key={s.label}
                  onClick={() => insertSnippet(s.code)}
                  class="px-2 py-1 text-xs rounded bg-surface border border-border hover:border-accent text-text-muted hover:text-accent transition-colors"
                >
                  + {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div class="flex gap-2 border-b border-border">
            {(['editor', 'html'] as const).map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                class={`px-3 py-1.5 text-sm border-b-2 transition-colors -mb-px ${activeTab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {t === 'editor' ? 'MJML Editor' : 'Generated HTML'}
              </button>
            ))}
          </div>

          {activeTab === 'editor' ? (
            <textarea
              ref={textareaRef}
              value={code}
              onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
              class="w-full h-96 font-mono text-xs bg-surface border border-border rounded p-3 text-text resize-y focus:outline-none focus:border-accent"
              spellcheck={false}
            />
          ) : (
            <div class="relative">
              <textarea
                readOnly
                value={html}
                class="w-full h-96 font-mono text-xs bg-surface border border-border rounded p-3 text-text-muted resize-y"
              />
              <button
                onClick={() => navigator.clipboard.writeText(html)}
                class="absolute top-2 right-2 px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90"
              >
                Copy
              </button>
            </div>
          )}

          {errors.length > 0 && (
            <div class="p-3 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
              {errors.map((e, i) => <div key={i}>⚠ {e}</div>)}
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div class="space-y-2">
          <p class="text-xs text-text-muted font-medium">LIVE PREVIEW</p>
          <div class={`border border-border rounded overflow-hidden bg-[#f4f4f4] ${viewport === 'mobile' ? 'flex justify-center' : ''}`}>
            <iframe
              ref={iframeRef}
              style={{ width: iframeWidth, height: '480px', border: 'none', display: 'block' }}
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
          <p class="text-xs text-text-muted">
            {viewport === 'mobile' ? '375px mobile view' : 'Full desktop view (max 600px content width)'}
          </p>
        </div>
      </div>
    </div>
  );
}
