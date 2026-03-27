import { useState } from 'preact/hooks';

type Framework = 'react' | 'nextjs' | 'vue' | 'nodejs' | 'python' | 'astro';
type Env = 'production' | 'staging' | 'development';

const FRAMEWORK_LABELS: Record<Framework, string> = {
  react: 'React',
  nextjs: 'Next.js',
  vue: 'Vue 3',
  nodejs: 'Node.js',
  python: 'Python (Flask/Django)',
  astro: 'Astro',
};

function generateCode(dsn: string, framework: Framework, env: Env, sampleRate: number, traceRate: number, replaysRate: number): string {
  const dsnVal = dsn || 'https://examplePublicKey@o0.ingest.sentry.io/0';
  const r = sampleRate / 100;
  const t = traceRate / 100;
  const rep = replaysRate / 100;

  switch (framework) {
    case 'react':
      return `import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "${dsnVal}",
  environment: "${env}",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: ${t},
  replaysSessionSampleRate: ${rep},
  replaysOnErrorSampleRate: 1.0,
  sampleRate: ${r},
});`;

    case 'nextjs':
      return `// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "${dsnVal}",
  environment: "${env}",
  tracesSampleRate: ${t},
  replaysSessionSampleRate: ${rep},
  replaysOnErrorSampleRate: 1.0,
  sampleRate: ${r},
  debug: ${env === 'development'},
});

// Also create sentry.server.config.ts:
// import * as Sentry from "@sentry/nextjs";
// Sentry.init({ dsn: "${dsnVal}", tracesSampleRate: ${t} });`;

    case 'vue':
      return `import * as Sentry from "@sentry/vue";
import { createApp } from "vue";
import App from "./App.vue";

const app = createApp(App);

Sentry.init({
  app,
  dsn: "${dsnVal}",
  environment: "${env}",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: ${t},
  replaysSessionSampleRate: ${rep},
  replaysOnErrorSampleRate: 1.0,
  sampleRate: ${r},
});

app.mount("#app");`;

    case 'nodejs':
      return `import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: "${dsnVal}",
  environment: "${env}",
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: ${t},
  profilesSampleRate: ${r},
});

// IMPORTANT: Must be imported before any other modules
// Place this at the top of your main entry file`;

    case 'python':
      return `import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
# For Django: from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn="${dsnVal}",
    environment="${env}",
    integrations=[
        FlaskIntegration(transaction_style="url"),
    ],
    traces_sample_rate=${t},
    profiles_sample_rate=${r},
    send_default_pii=False,
)`;

    case 'astro':
      return `// astro.config.mjs
import { defineConfig } from "astro/config";
import sentry from "@sentry/astro";

export default defineConfig({
  integrations: [
    sentry({
      dsn: "${dsnVal}",
      environment: "${env}",
      tracesSampleRate: ${t},
      replaysSessionSampleRate: ${rep},
      replaysOnErrorSampleRate: 1.0,
      sourceMapsUploadOptions: {
        project: "your-project-slug",
        authToken: process.env.SENTRY_AUTH_TOKEN,
      },
    }),
  ],
});`;

    default:
      return '';
  }
}

export default function SentryDsnConfig() {
  const [dsn, setDsn] = useState('');
  const [framework, setFramework] = useState<Framework>('react');
  const [env, setEnv] = useState<Env>('production');
  const [sampleRate, setSampleRate] = useState(100);
  const [traceRate, setTraceRate] = useState(10);
  const [replaysRate, setReplaysRate] = useState(10);
  const [copied, setCopied] = useState(false);

  const code = generateCode(dsn, framework, env, sampleRate, traceRate, replaysRate);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* DSN input */}
      <div>
        <label class="block text-sm font-medium mb-1">Sentry DSN</label>
        <input
          value={dsn}
          onInput={e => setDsn((e.target as HTMLInputElement).value)}
          placeholder="https://examplePublicKey@o0.ingest.sentry.io/0"
          class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
        />
        <p class="text-xs text-text-muted mt-1">Found in: Sentry Dashboard → Settings → Projects → Client Keys (DSN)</p>
      </div>

      {/* Framework + Environment */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Framework</label>
          <select
            value={framework}
            onChange={e => setFramework((e.target as HTMLSelectElement).value as Framework)}
            class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary"
          >
            {Object.entries(FRAMEWORK_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Environment</label>
          <select
            value={env}
            onChange={e => setEnv((e.target as HTMLSelectElement).value as Env)}
            class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary"
          >
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </select>
        </div>
      </div>

      {/* Rate sliders */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Error Sample Rate', val: sampleRate, set: setSampleRate, desc: 'Fraction of errors captured' },
          { label: 'Traces Sample Rate', val: traceRate, set: setTraceRate, desc: 'Performance tracing overhead' },
          { label: 'Session Replays', val: replaysRate, set: setReplaysRate, desc: 'Session recording rate' },
        ].map(({ label, val, set, desc }) => (
          <div key={label}>
            <div class="flex justify-between mb-1">
              <label class="text-sm font-medium">{label}</label>
              <span class="text-sm text-primary font-mono">{val}%</span>
            </div>
            <input
              type="range" min="0" max="100" step="5"
              value={val}
              onInput={e => set(parseInt((e.target as HTMLInputElement).value))}
              class="w-full accent-primary"
            />
            <p class="text-xs text-text-muted mt-1">{desc}</p>
          </div>
        ))}
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Generated Config</label>
          <button
            onClick={copy}
            class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-bg border border-border text-sm font-mono overflow-x-auto whitespace-pre">{code}</pre>
      </div>

      {/* Install hint */}
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p class="font-medium mb-2">Install</p>
        <code class="text-xs font-mono text-text-muted">
          {framework === 'python'
            ? 'pip install --upgrade "sentry-sdk[flask]"'
            : framework === 'nextjs'
            ? 'npx @sentry/wizard@latest -i nextjs'
            : `npm install @sentry/${framework === 'astro' ? 'astro' : framework === 'nodejs' ? 'node' : framework === 'vue' ? 'vue' : 'react'}`}
        </code>
      </div>
    </div>
  );
}
