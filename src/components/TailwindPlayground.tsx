import { useState, useEffect, useRef } from 'preact/hooks';

const DEFAULT_HTML = `<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
  <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
    <div class="flex items-center gap-3 mb-6">
      <div class="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
        <span class="text-white font-bold">T</span>
      </div>
      <h1 class="text-2xl font-bold text-gray-800">Tailwind Playground</h1>
    </div>

    <p class="text-gray-500 mb-6 leading-relaxed">
      Edit the HTML on the left to see live Tailwind CSS changes here.
      All classes are powered by the Tailwind CDN.
    </p>

    <div class="space-y-3">
      <button class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors">
        Primary Button
      </button>
      <button class="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg border border-gray-200 transition-colors">
        Secondary Button
      </button>
    </div>

    <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
      <p class="text-green-700 text-sm font-medium">✓ All changes render live!</p>
    </div>
  </div>
</div>`;

const TEMPLATES = [
  { name: 'Card', html: DEFAULT_HTML },
  {
    name: 'Flex Layout',
    html: `<div class="min-h-screen bg-gray-100 p-8">
  <div class="flex gap-4 flex-wrap">
    <div class="flex-1 min-w-[200px] bg-white rounded-xl p-6 shadow-md">
      <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <span class="text-blue-600 text-xl">🚀</span>
      </div>
      <h3 class="font-bold text-gray-800 mb-2">Feature One</h3>
      <p class="text-gray-500 text-sm">Description of this feature goes here.</p>
    </div>
    <div class="flex-1 min-w-[200px] bg-white rounded-xl p-6 shadow-md">
      <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
        <span class="text-green-600 text-xl">⚡</span>
      </div>
      <h3 class="font-bold text-gray-800 mb-2">Feature Two</h3>
      <p class="text-gray-500 text-sm">Description of this feature goes here.</p>
    </div>
    <div class="flex-1 min-w-[200px] bg-white rounded-xl p-6 shadow-md">
      <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
        <span class="text-purple-600 text-xl">🎯</span>
      </div>
      <h3 class="font-bold text-gray-800 mb-2">Feature Three</h3>
      <p class="text-gray-500 text-sm">Description of this feature goes here.</p>
    </div>
  </div>
</div>`,
  },
  {
    name: 'Form',
    html: `<div class="min-h-screen bg-gray-50 flex items-center justify-center p-8">
  <form class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">Sign In</h2>
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input type="email" placeholder="you@example.com"
          class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input type="password" placeholder="••••••••"
          class="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
      </div>
      <button type="submit"
        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2">
        Sign In
      </button>
    </div>
    <p class="text-center text-sm text-gray-500 mt-4">
      Don't have an account? <a href="#" class="text-indigo-600 hover:underline">Sign up</a>
    </p>
  </form>
</div>`,
  },
  {
    name: 'Hero',
    html: `<div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center p-8">
  <div class="text-center max-w-2xl">
    <span class="inline-block bg-indigo-500 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-6">
      New Release
    </span>
    <h1 class="text-5xl font-extrabold mb-6 leading-tight">
      Build Faster with<br>
      <span class="text-indigo-400">Tailwind CSS</span>
    </h1>
    <p class="text-gray-400 text-lg mb-8 leading-relaxed">
      Utility-first CSS framework for rapid UI development. Edit the classes to see live changes.
    </p>
    <div class="flex gap-4 justify-center">
      <button class="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
        Get Started
      </button>
      <button class="border border-gray-600 hover:border-gray-400 text-gray-300 font-semibold px-8 py-3 rounded-lg transition-colors">
        Learn More
      </button>
    </div>
  </div>
</div>`,
  },
];

export default function TailwindPlayground() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [activeTemplate, setActiveTemplate] = useState('Card');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcdoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; }</style>
</head>
<body>
${html}
</body>
</html>`;

  const handleTemplateChange = (t: (typeof TEMPLATES)[number]) => {
    setHtml(t.html);
    setActiveTemplate(t.name);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-4">
      {/* Template picker */}
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-text-muted">Templates:</span>
        {TEMPLATES.map((t) => (
          <button
            key={t.name}
            onClick={() => handleTemplateChange(t)}
            class={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              activeTemplate === t.name
                ? 'bg-accent text-white'
                : 'bg-bg-secondary border border-border text-text-muted hover:text-text'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Split editor/preview */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" style="height: 500px;">
        {/* Editor */}
        <div class="relative flex flex-col">
          <div class="flex items-center justify-between bg-bg-secondary border border-border rounded-t-lg px-3 py-2">
            <span class="text-xs text-text-muted font-medium">HTML + Tailwind Classes</span>
            <button
              onClick={handleCopy}
              class="text-xs px-2 py-1 rounded bg-accent text-white hover:opacity-90 transition-opacity"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            value={html}
            onInput={(e) => setHtml((e.target as HTMLTextAreaElement).value)}
            class="flex-1 bg-bg-secondary border-x border-b border-border rounded-b-lg p-4 text-xs font-mono text-text resize-none focus:outline-none focus:border-accent leading-relaxed"
            spellcheck={false}
          />
        </div>

        {/* Live preview */}
        <div class="flex flex-col">
          <div class="bg-bg-secondary border border-border rounded-t-lg px-3 py-2 flex items-center gap-2">
            <div class="flex gap-1.5">
              <div class="w-3 h-3 rounded-full bg-red-400" />
              <div class="w-3 h-3 rounded-full bg-yellow-400" />
              <div class="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span class="text-xs text-text-muted font-medium">Live Preview</span>
          </div>
          <iframe
            ref={iframeRef}
            srcdoc={srcdoc}
            class="flex-1 border-x border-b border-border rounded-b-lg bg-white"
            sandbox="allow-scripts"
            title="Tailwind CSS Preview"
          />
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Powered by{' '}
        <a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" class="underline hover:text-text">
          Tailwind CSS CDN
        </a>
        . All rendering happens in your browser. Tailwind loads from the official CDN.
      </p>
    </div>
  );
}
