const DEFAULT_SETUPS = [
  {
    id: '1',
    name: 'Sarah K.',
    ide: 'VS Code',
    os: 'macOS',
    terminal: 'Warp',
    tools: ['GitHub Copilot', 'Docker Desktop', 'Raycast'],
    comment: 'Copilot changed my workflow completely. Warp terminal is gorgeous.',
    upvotes: 87,
    createdAt: '2026-02-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Marcus T.',
    ide: 'Neovim',
    os: 'Ubuntu',
    terminal: 'Alacritty',
    tools: ['tmux', 'Oh My Zsh', 'Homebrew'],
    comment: 'Keyboard-driven workflow. Once you go Neovim you never go back.',
    upvotes: 74,
    createdAt: '2026-02-18T14:00:00Z',
  },
  {
    id: '3',
    name: 'Priya R.',
    ide: 'JetBrains (IntelliJ/WebStorm)',
    os: 'Windows 11',
    terminal: 'Windows Terminal',
    tools: ['Docker Desktop', 'Postman', 'TablePlus'],
    comment: 'IntelliJ refactoring tools are unmatched for large codebases.',
    upvotes: 61,
    createdAt: '2026-02-20T09:00:00Z',
  },
  {
    id: '4',
    name: 'Alex Chen',
    ide: 'Cursor',
    os: 'macOS',
    terminal: 'iTerm2',
    tools: ['GitHub Copilot', 'Obsidian', 'Homebrew', 'Oh My Zsh'],
    comment: 'Cursor AI pair programming is insane for productivity.',
    upvotes: 55,
    createdAt: '2026-03-01T11:00:00Z',
  },
  {
    id: '5',
    name: 'Lena M.',
    ide: 'Zed',
    os: 'macOS',
    terminal: 'Kitty',
    tools: ['Raycast', 'Docker Desktop'],
    comment: "Zed is blazing fast. Can't go back to anything else.",
    upvotes: 43,
    createdAt: '2026-03-05T16:00:00Z',
  },
];

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function getSetups(env) {
  if (!env.DEV_SETUPS) return [...DEFAULT_SETUPS];
  const stored = await env.DEV_SETUPS.get('setups');
  if (!stored) {
    await env.DEV_SETUPS.put('setups', JSON.stringify(DEFAULT_SETUPS));
    return [...DEFAULT_SETUPS];
  }
  return JSON.parse(stored);
}

export async function onRequestGet({ env }) {
  const setups = await getSetups(env);
  const sorted = [...setups].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
  return new Response(JSON.stringify(sorted), { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS_HEADERS });
  }

  if (!body.name || !body.ide || !body.os) {
    return new Response(JSON.stringify({ error: 'name, ide, and os are required' }), { status: 400, headers: CORS_HEADERS });
  }

  const newSetup = {
    id: crypto.randomUUID(),
    name: String(body.name).trim().slice(0, 50),
    ide: String(body.ide).trim().slice(0, 50),
    os: String(body.os).trim().slice(0, 50),
    terminal: String(body.terminal || '').trim().slice(0, 50),
    tools: (Array.isArray(body.tools) ? body.tools : [])
      .slice(0, 10)
      .map((t) => String(t).trim().slice(0, 30))
      .filter(Boolean),
    comment: String(body.comment || '').trim().slice(0, 200),
    upvotes: 0,
    createdAt: new Date().toISOString(),
  };

  if (env.DEV_SETUPS) {
    const setups = await getSetups(env);
    setups.unshift(newSetup);
    await env.DEV_SETUPS.put('setups', JSON.stringify(setups.slice(0, 500)));
  }

  return new Response(JSON.stringify(newSetup), { status: 201, headers: CORS_HEADERS });
}

export async function onRequestPatch({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS_HEADERS });
  }

  const { id } = body;
  if (!id) {
    return new Response(JSON.stringify({ error: 'id required' }), { status: 400, headers: CORS_HEADERS });
  }

  const setups = await getSetups(env);
  const idx = setups.findIndex((s) => s.id === id);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'Setup not found' }), { status: 404, headers: CORS_HEADERS });
  }

  setups[idx].upvotes = (setups[idx].upvotes || 0) + 1;

  if (env.DEV_SETUPS) {
    await env.DEV_SETUPS.put('setups', JSON.stringify(setups));
  }

  return new Response(JSON.stringify(setups[idx]), { headers: CORS_HEADERS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}
