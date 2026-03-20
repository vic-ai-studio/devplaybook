function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text, maxLen) {
  if (text.length <= maxLen) return [text];
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxLen) {
      if (line) lines.push(line.trim());
      line = word;
    } else {
      line = (line + ' ' + word).trim();
    }
  }
  if (line) lines.push(line.trim());
  return lines.slice(0, 2);
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const name = escapeXml(url.searchParams.get('name') || 'Dev');
  const ide = escapeXml(url.searchParams.get('ide') || 'VS Code');
  const os = escapeXml(url.searchParams.get('os') || 'Linux');
  const terminal = escapeXml(url.searchParams.get('terminal') || '');
  const tools = escapeXml(url.searchParams.get('tools') || '');

  const commentRaw = url.searchParams.get('comment') || '';
  const commentLines = wrapText(commentRaw, 55);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1200" height="630" fill="#0f172a"/>

  <!-- Top accent bar -->
  <rect width="1200" height="6" fill="#6366f1"/>

  <!-- Card border -->
  <rect x="30" y="30" width="1140" height="570" rx="18" fill="none" stroke="#334155" stroke-width="1.5"/>

  <!-- DevPlaybook brand -->
  <text x="70" y="95" font-family="system-ui,-apple-system,sans-serif" font-size="26" font-weight="700" fill="#6366f1">DevPlaybook.cc</text>
  <text x="70" y="125" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#475569">Dev Setup Showcase</text>

  <!-- Name headline -->
  <text x="70" y="195" font-family="system-ui,-apple-system,sans-serif" font-size="52" font-weight="700" fill="#f8fafc">${name}</text>
  <text x="70" y="235" font-family="system-ui,-apple-system,sans-serif" font-size="26" fill="#94a3b8">Developer Setup</text>

  <!-- Divider -->
  <line x1="70" y1="260" x2="1130" y2="260" stroke="#1e293b" stroke-width="1.5"/>

  <!-- IDE column -->
  <text x="70" y="305" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#64748b" letter-spacing="1">IDE / EDITOR</text>
  <text x="70" y="348" font-family="system-ui,-apple-system,sans-serif" font-size="36" font-weight="600" fill="#818cf8">${ide}</text>

  <!-- OS column -->
  <text x="450" y="305" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#64748b" letter-spacing="1">OS</text>
  <text x="450" y="348" font-family="system-ui,-apple-system,sans-serif" font-size="36" font-weight="600" fill="#f8fafc">${os}</text>

  ${terminal ? `
  <!-- Terminal column -->
  <text x="800" y="305" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#64748b" letter-spacing="1">TERMINAL</text>
  <text x="800" y="348" font-family="system-ui,-apple-system,sans-serif" font-size="32" font-weight="600" fill="#f8fafc">${terminal}</text>
  ` : ''}

  ${tools ? `
  <!-- Tools -->
  <text x="70" y="415" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="#64748b" letter-spacing="1">KEY TOOLS</text>
  <text x="70" y="452" font-family="system-ui,-apple-system,sans-serif" font-size="28" fill="#10b981">${tools}</text>
  ` : ''}

  ${commentLines.length > 0 ? `
  <!-- Comment -->
  <text x="70" y="${tools ? '510' : '430'}" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#475569" font-style="italic">&quot;${commentLines[0]}${commentLines[1] ? '' : '"'}</text>
  ${commentLines[1] ? `<text x="70" y="${tools ? '542' : '462'}" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#475569" font-style="italic">${commentLines[1]}&quot;</text>` : ''}
  ` : ''}

  <!-- CTA footer -->
  <text x="70" y="595" font-family="system-ui,-apple-system,sans-serif" font-size="22" fill="#4f46e5">Share your dev setup → devplaybook.cc/my-dev-setup</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
