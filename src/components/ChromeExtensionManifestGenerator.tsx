import { useState } from 'preact/hooks';

const PERMISSIONS_LIST = [
  'activeTab', 'alarms', 'bookmarks', 'browsingData', 'clipboardRead', 'clipboardWrite',
  'contextMenus', 'cookies', 'declarativeContent', 'declarativeNetRequest',
  'downloads', 'history', 'identity', 'idle', 'notifications',
  'offscreen', 'scripting', 'search', 'sidePanel', 'storage',
  'tabGroups', 'tabs', 'tts', 'webNavigation', 'webRequest',
];

const HOST_PERMISSIONS_PRESETS = [
  { label: 'All URLs', value: '<all_urls>' },
  { label: 'All HTTPS', value: 'https://*/*' },
  { label: 'All HTTP', value: 'http://*/*' },
  { label: 'Custom', value: '' },
];

export default function ChromeExtensionManifestGenerator() {
  const [name, setName] = useState('My Extension');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('A helpful Chrome extension');
  const [permissions, setPermissions] = useState<string[]>(['storage', 'activeTab']);
  const [hostPermissions, setHostPermissions] = useState<string[]>([]);
  const [customHost, setCustomHost] = useState('');
  const [hasPopup, setHasPopup] = useState(true);
  const [popupFile, setPopupFile] = useState('popup.html');
  const [hasBackground, setHasBackground] = useState(false);
  const [bgWorkerFile, setBgWorkerFile] = useState('background.js');
  const [hasContentScript, setHasContentScript] = useState(false);
  const [csFile, setCsFile] = useState('content.js');
  const [csMatches, setCsMatches] = useState('<all_urls>');
  const [csRunAt, setCsRunAt] = useState('document_idle');
  const [hasOptions, setHasOptions] = useState(false);
  const [optionsFile, setOptionsFile] = useState('options.html');
  const [hasIcons, setHasIcons] = useState(true);
  const [copied, setCopied] = useState(false);

  const togglePermission = (p: string) => {
    setPermissions(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const addHostPermission = (val: string) => {
    const v = val.trim();
    if (v && !hostPermissions.includes(v)) {
      setHostPermissions(prev => [...prev, v]);
    }
  };

  const removeHostPermission = (val: string) => {
    setHostPermissions(prev => prev.filter(x => x !== val));
  };

  const generateManifest = () => {
    const manifest: any = {
      manifest_version: 3,
      name: name || 'My Extension',
      version: version || '1.0.0',
      description: description || '',
    };

    if (hasIcons) {
      manifest.icons = {
        "16": "icons/icon16.png",
        "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png",
      };
    }

    if (hasPopup) {
      manifest.action = {
        default_popup: popupFile || 'popup.html',
        default_icon: hasIcons ? { "16": "icons/icon16.png", "32": "icons/icon32.png" } : undefined,
      };
      if (!hasIcons) delete manifest.action.default_icon;
    }

    if (permissions.length > 0) {
      manifest.permissions = [...permissions].sort();
    }

    if (hostPermissions.length > 0) {
      manifest.host_permissions = hostPermissions;
    }

    if (hasBackground) {
      manifest.background = {
        service_worker: bgWorkerFile || 'background.js',
        type: 'module',
      };
    }

    if (hasContentScript) {
      manifest.content_scripts = [
        {
          matches: [csMatches || '<all_urls>'],
          js: [csFile || 'content.js'],
          run_at: csRunAt,
        },
      ];
    }

    if (hasOptions) {
      manifest.options_ui = {
        page: optionsFile || 'options.html',
        open_in_tab: true,
      };
    }

    return JSON.stringify(manifest, null, 2);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateManifest()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-5">
      {/* Basic info */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <h2 class="text-sm font-semibold text-text">Extension Info</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-text-muted mb-1 block">Name</label>
            <input type="text" value={name} onInput={e => setName((e.target as HTMLInputElement).value)}
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Version</label>
            <input type="text" value={version} onInput={e => setVersion((e.target as HTMLInputElement).value)}
              placeholder="1.0.0"
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
          </div>
          <div class="sm:col-span-1 col-span-1">
            <label class="text-xs text-text-muted mb-1 block">Description</label>
            <input type="text" value={description} onInput={e => setDescription((e.target as HTMLInputElement).value)}
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <h2 class="text-sm font-semibold text-text">Permissions</h2>
        <div class="flex flex-wrap gap-2">
          {PERMISSIONS_LIST.map(p => (
            <button
              key={p}
              onClick={() => togglePermission(p)}
              class={`text-xs px-2 py-1 rounded border transition-colors ${
                permissions.includes(p)
                  ? 'bg-accent/20 text-accent border-accent/50'
                  : 'bg-background border-border hover:border-accent text-text-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Host Permissions */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <h2 class="text-sm font-semibold text-text">Host Permissions</h2>
        <div class="flex flex-wrap gap-2">
          {HOST_PERMISSIONS_PRESETS.filter(p => p.value).map(preset => (
            <button
              key={preset.value}
              onClick={() => addHostPermission(preset.value)}
              disabled={hostPermissions.includes(preset.value)}
              class={`text-xs px-2 py-1 rounded border transition-colors ${
                hostPermissions.includes(preset.value)
                  ? 'bg-accent/20 text-accent border-accent/50 opacity-60'
                  : 'bg-background border-border hover:border-accent'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div class="flex gap-2">
          <input type="text" value={customHost} onInput={e => setCustomHost((e.target as HTMLInputElement).value)}
            placeholder="https://api.example.com/*"
            class="flex-1 text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
          <button onClick={() => { addHostPermission(customHost); setCustomHost(''); }}
            class="text-xs px-3 py-1.5 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/20 transition-colors">
            Add
          </button>
        </div>
        {hostPermissions.length > 0 && (
          <div class="flex flex-wrap gap-2">
            {hostPermissions.map(h => (
              <span key={h} class="flex items-center gap-1 text-xs bg-background border border-border rounded px-2 py-1 font-mono">
                {h}
                <button onClick={() => removeHostPermission(h)} class="text-red-400 hover:text-red-300 ml-1">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-4">
        <h2 class="text-sm font-semibold text-text">Features</h2>

        <div class="space-y-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={hasIcons} onChange={e => setHasIcons((e.target as HTMLInputElement).checked)} class="accent-accent" />
            <span class="text-sm">Extension icons (16/32/48/128px)</span>
          </label>

          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasPopup} onChange={e => setHasPopup((e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span class="text-sm">Popup (toolbar button)</span>
            </label>
            {hasPopup && (
              <input type="text" value={popupFile} onInput={e => setPopupFile((e.target as HTMLInputElement).value)}
                placeholder="popup.html"
                class="ml-6 text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
            )}
          </div>

          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasBackground} onChange={e => setHasBackground((e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span class="text-sm">Background service worker</span>
            </label>
            {hasBackground && (
              <input type="text" value={bgWorkerFile} onInput={e => setBgWorkerFile((e.target as HTMLInputElement).value)}
                placeholder="background.js"
                class="ml-6 text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
            )}
          </div>

          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasContentScript} onChange={e => setHasContentScript((e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span class="text-sm">Content script (injected into pages)</span>
            </label>
            {hasContentScript && (
              <div class="ml-6 space-y-2">
                <input type="text" value={csFile} onInput={e => setCsFile((e.target as HTMLInputElement).value)}
                  placeholder="content.js"
                  class="text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
                <input type="text" value={csMatches} onInput={e => setCsMatches((e.target as HTMLInputElement).value)}
                  placeholder="<all_urls>"
                  class="text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent w-full" />
                <select value={csRunAt} onChange={e => setCsRunAt((e.target as HTMLSelectElement).value)}
                  class="text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent">
                  <option value="document_start">document_start (before DOM)</option>
                  <option value="document_end">document_end (after DOM)</option>
                  <option value="document_idle">document_idle (after load)</option>
                </select>
              </div>
            )}
          </div>

          <div class="space-y-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={hasOptions} onChange={e => setHasOptions((e.target as HTMLInputElement).checked)} class="accent-accent" />
              <span class="text-sm">Options page</span>
            </label>
            {hasOptions && (
              <input type="text" value={optionsFile} onInput={e => setOptionsFile((e.target as HTMLInputElement).value)}
                placeholder="options.html"
                class="ml-6 text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent" />
            )}
          </div>
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">manifest.json (Manifest V3)</label>
          <button
            onClick={handleCopy}
            class={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${copied ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-surface border-border hover:border-accent'}`}
          >
            {copied ? '✓ Copied!' : 'Copy manifest'}
          </button>
        </div>
        <pre class="w-full font-mono text-sm bg-background border border-border rounded-lg p-4 overflow-x-auto whitespace-pre text-text leading-relaxed">{generateManifest()}</pre>
      </div>

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Next steps</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Save as <code class="bg-background px-1 rounded">manifest.json</code> in your extension root directory</li>
          <li>Create the referenced HTML/JS files (popup.html, background.js, etc.)</li>
          <li>In Chrome: go to <code class="bg-background px-1 rounded">chrome://extensions</code>, enable Developer mode, click "Load unpacked"</li>
          <li>For publication: create a <a href="https://chrome.google.com/webstore/devconsole" class="text-accent hover:underline" target="_blank" rel="noopener">Chrome Web Store developer account</a> and upload a .zip of your extension folder</li>
        </ul>
      </div>
    </div>
  );
}
