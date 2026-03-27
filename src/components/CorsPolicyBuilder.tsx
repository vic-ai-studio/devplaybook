import { useState } from 'preact/hooks';

type Framework = 'express' | 'nginx' | 'fastapi' | 'django' | 'koa' | 'laravel' | 'springboot' | 'raw';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
const COMMON_HEADERS = ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'X-API-Key', 'X-CSRF-Token'];

function generateCode(framework: Framework, origins: string[], methods: string[], headers: string[], credentials: boolean, maxAge: number): string {
  const originsStr = origins.length === 1 && origins[0] === '*' ? '*' : origins.join(', ');
  const methodsStr = methods.join(', ');
  const headersStr = headers.join(', ');
  const originsArray = origins.map(o => `'${o}'`).join(', ');

  switch (framework) {
    case 'express':
      return `const cors = require('cors');

const corsOptions = {
  origin: ${origins[0] === '*' ? "'*'" : `[${originsArray}]`},
  methods: [${methods.map(m => `'${m}'`).join(', ')}],
  allowedHeaders: [${headers.map(h => `'${h}'`).join(', ')}],
  credentials: ${credentials},
  maxAge: ${maxAge},
};

app.use(cors(corsOptions));

// For specific routes:
// app.use('/api', cors(corsOptions));`;

    case 'nginx':
      return `# Add inside your server {} or location {} block
add_header 'Access-Control-Allow-Origin' '${originsStr}';
add_header 'Access-Control-Allow-Methods' '${methodsStr}';
add_header 'Access-Control-Allow-Headers' '${headersStr}';
${credentials ? "add_header 'Access-Control-Allow-Credentials' 'true';\n" : ''}add_header 'Access-Control-Max-Age' ${maxAge};

# Handle preflight
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '${originsStr}';
    add_header 'Access-Control-Allow-Methods' '${methodsStr}';
    add_header 'Access-Control-Allow-Headers' '${headersStr}';
    add_header 'Access-Control-Max-Age' ${maxAge};
    add_header 'Content-Length' 0;
    add_header 'Content-Type' 'text/plain charset=UTF-8';
    return 204;
}`;

    case 'fastapi':
      return `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[${originsArray}],
    allow_methods=[${methods.map(m => `"${m}"`).join(', ')}],
    allow_headers=[${headers.map(h => `"${h}"`).join(', ')}],
    allow_credentials=${credentials ? 'True' : 'False'},
    max_age=${maxAge},
)`;

    case 'django':
      return `# settings.py — install django-cors-headers first:
# pip install django-cors-headers

INSTALLED_APPS = [
    ...
    'corsheaders',
    ...
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # must be first
    'django.middleware.common.CommonMiddleware',
    ...
]

CORS_ALLOWED_ORIGINS = [
${origins[0] === '*' ? '    # Using wildcard — set CORS_ALLOW_ALL_ORIGINS = True instead' : origins.map(o => `    "${o}",`).join('\n')}
]
${origins[0] === '*' ? '\nCORS_ALLOW_ALL_ORIGINS = True' : ''}

CORS_ALLOW_METHODS = [
${methods.map(m => `    "${m}",`).join('\n')}
]

CORS_ALLOW_HEADERS = [
${headers.map(h => `    "${h}",`).join('\n')}
]

CORS_ALLOW_CREDENTIALS = ${credentials}

CORS_PREFLIGHT_MAX_AGE = ${maxAge}`;

    case 'koa':
      return `const Koa = require('koa');
const cors = require('@koa/cors');

const app = new Koa();

app.use(cors({
  origin: (ctx) => {
    const allowed = [${originsArray}];
${origins[0] === '*' ? "    return '*';" : "    return allowed.includes(ctx.request.header.origin) ? ctx.request.header.origin : false;"}
  },
  allowMethods: [${methods.map(m => `'${m}'`).join(', ')}],
  allowHeaders: [${headers.map(h => `'${h}'`).join(', ')}],
  credentials: ${credentials},
  maxAge: ${maxAge},
}));`;

    case 'laravel':
      return `// config/cors.php
return [
    'paths' => ['api/*'],
    'allowed_methods' => [${methods.map(m => `'${m}'`).join(', ')}],
    'allowed_origins' => [${originsArray}],
    'allowed_origins_patterns' => [],
    'allowed_headers' => [${headers.map(h => `'${h}'`).join(', ')}],
    'exposed_headers' => [],
    'max_age' => ${maxAge},
    'supports_credentials' => ${credentials},
];`;

    case 'springboot':
      return `// Global CORS config (Spring Boot)
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
${origins.map(o => `                .allowedOrigins("${o}")`).join('\n')}
                .allowedMethods(${methods.map(m => `"${m}"`).join(', ')})
                .allowedHeaders(${headers.map(h => `"${h}"`).join(', ')})
                .allowCredentials(${credentials})
                .maxAge(${maxAge});
    }
}`;

    case 'raw':
    default:
      return `# HTTP Response Headers
Access-Control-Allow-Origin: ${originsStr}
Access-Control-Allow-Methods: ${methodsStr}
Access-Control-Allow-Headers: ${headersStr}
${credentials ? 'Access-Control-Allow-Credentials: true\n' : ''}Access-Control-Max-Age: ${maxAge}`;
  }
}

export default function CorsPolicyBuilder() {
  const [originInput, setOriginInput] = useState('https://yourapp.com');
  const [origins, setOrigins] = useState<string[]>(['https://yourapp.com']);
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(['Content-Type', 'Authorization']);
  const [credentials, setCredentials] = useState(false);
  const [maxAge, setMaxAge] = useState(3600);
  const [framework, setFramework] = useState<Framework>('express');
  const [copied, setCopied] = useState(false);
  const [customHeader, setCustomHeader] = useState('');

  const toggleMethod = (m: string) => {
    setSelectedMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleHeader = (h: string) => {
    setSelectedHeaders(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  };

  const addOrigin = () => {
    const o = originInput.trim();
    if (o && !origins.includes(o)) {
      setOrigins(prev => [...prev, o]);
    }
    setOriginInput('');
  };

  const removeOrigin = (o: string) => setOrigins(prev => prev.filter(x => x !== o));

  const setWildcard = () => {
    setOrigins(['*']);
    setCredentials(false);
  };

  const addCustomHeader = () => {
    const h = customHeader.trim();
    if (h && !selectedHeaders.includes(h)) {
      setSelectedHeaders(prev => [...prev, h]);
    }
    setCustomHeader('');
  };

  const code = generateCode(framework, origins, selectedMethods, selectedHeaders, credentials, maxAge);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const FRAMEWORKS: { key: Framework; label: string }[] = [
    { key: 'express', label: 'Express.js' },
    { key: 'fastapi', label: 'FastAPI' },
    { key: 'django', label: 'Django' },
    { key: 'nginx', label: 'Nginx' },
    { key: 'koa', label: 'Koa.js' },
    { key: 'laravel', label: 'Laravel' },
    { key: 'springboot', label: 'Spring Boot' },
    { key: 'raw', label: 'Raw Headers' },
  ];

  return (
    <div class="space-y-5">
      {/* Framework selector */}
      <div>
        <label class="block text-sm font-medium mb-2">Framework / Platform</label>
        <div class="flex gap-2 flex-wrap">
          {FRAMEWORKS.map(f => (
            <button
              key={f.key}
              onClick={() => setFramework(f.key)}
              class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                framework === f.key
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-muted hover:bg-surface-hover'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Origins */}
      <div>
        <label class="block text-sm font-medium mb-2">Allowed Origins</label>
        <div class="flex gap-2 mb-2">
          <input
            type="text"
            value={originInput}
            onInput={e => setOriginInput((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && addOrigin()}
            placeholder="https://yourapp.com"
            class="flex-1 font-mono text-sm bg-surface border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={addOrigin} class="px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/80">Add</button>
          <button onClick={setWildcard} class="px-3 py-1.5 bg-surface border border-border text-sm rounded hover:bg-surface-hover">Use *</button>
        </div>
        <div class="flex gap-2 flex-wrap">
          {origins.map(o => (
            <span key={o} class="flex items-center gap-1 bg-surface border border-border rounded px-2 py-0.5 text-sm font-mono">
              {o}
              <button onClick={() => removeOrigin(o)} class="text-text-muted hover:text-red-400 ml-1">×</button>
            </span>
          ))}
        </div>
        {credentials && origins.includes('*') && (
          <p class="text-xs text-yellow-500 mt-1">⚠️ Cannot use credentials with wildcard origin. Either remove * or disable credentials.</p>
        )}
      </div>

      {/* Methods */}
      <div>
        <label class="block text-sm font-medium mb-2">Allowed Methods</label>
        <div class="flex gap-2 flex-wrap">
          {METHODS.map(m => (
            <button
              key={m}
              onClick={() => toggleMethod(m)}
              class={`px-3 py-1 rounded text-sm font-mono transition-colors ${
                selectedMethods.includes(m)
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-surface text-text-muted border border-border'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Headers */}
      <div>
        <label class="block text-sm font-medium mb-2">Allowed Headers</label>
        <div class="flex gap-2 flex-wrap mb-2">
          {COMMON_HEADERS.map(h => (
            <button
              key={h}
              onClick={() => toggleHeader(h)}
              class={`px-2 py-0.5 rounded text-sm font-mono transition-colors ${
                selectedHeaders.includes(h)
                  ? 'bg-primary/20 text-primary border border-primary/40'
                  : 'bg-surface text-text-muted border border-border'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
        <div class="flex gap-2">
          <input
            type="text"
            value={customHeader}
            onInput={e => setCustomHeader((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && addCustomHeader()}
            placeholder="X-Custom-Header"
            class="flex-1 font-mono text-sm bg-surface border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={addCustomHeader} class="px-3 py-1.5 bg-surface border border-border text-sm rounded hover:bg-surface-hover">Add Custom</button>
        </div>
        {selectedHeaders.filter(h => !COMMON_HEADERS.includes(h)).length > 0 && (
          <div class="flex gap-2 flex-wrap mt-2">
            {selectedHeaders.filter(h => !COMMON_HEADERS.includes(h)).map(h => (
              <span key={h} class="flex items-center gap-1 bg-surface border border-border rounded px-2 py-0.5 text-sm font-mono">
                {h}
                <button onClick={() => toggleHeader(h)} class="text-text-muted hover:text-red-400 ml-1">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Options */}
      <div class="flex gap-6 flex-wrap">
        <label class="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={credentials}
            onChange={e => setCredentials((e.target as HTMLInputElement).checked)}
            class="rounded"
            disabled={origins.includes('*')}
          />
          <span class={origins.includes('*') ? 'text-text-muted' : ''}>Allow Credentials (cookies / auth headers)</span>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-text-muted">Max-Age:</span>
          <input
            type="number"
            value={maxAge}
            onInput={e => setMaxAge(parseInt((e.target as HTMLInputElement).value) || 3600)}
            class="w-24 font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span class="text-text-muted">seconds</span>
        </label>
      </div>

      {/* Generated code */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Generated Config</label>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/80 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-sm font-mono overflow-auto max-h-80 text-text whitespace-pre-wrap">
          {code}
        </pre>
      </div>
    </div>
  );
}
