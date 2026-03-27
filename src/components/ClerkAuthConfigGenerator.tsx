import { useState } from 'preact/hooks';

type Framework = 'nextjs' | 'remix' | 'astro';
type SocialProvider = 'google' | 'github' | 'twitter' | 'discord' | 'facebook' | 'microsoft';

const PROVIDERS: { id: SocialProvider; label: string; icon: string }[] = [
  { id: 'google', label: 'Google', icon: '🔵' },
  { id: 'github', label: 'GitHub', icon: '⚫' },
  { id: 'twitter', label: 'Twitter / X', icon: '🐦' },
  { id: 'discord', label: 'Discord', icon: '💬' },
  { id: 'facebook', label: 'Facebook', icon: '🔷' },
  { id: 'microsoft', label: 'Microsoft', icon: '🟦' },
];

const FRAMEWORKS: { id: Framework; label: string; version: string }[] = [
  { id: 'nextjs', label: 'Next.js', version: 'App Router (v14+)' },
  { id: 'remix', label: 'Remix', version: 'v2+' },
  { id: 'astro', label: 'Astro', version: 'v4+' },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
        <span class="text-xs font-mono text-text-muted">{label}</span>
        <CopyButton value={code} />
      </div>
      <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">{code}</pre>
    </div>
  );
}

function generateNextjsCode(
  protectedRoutes: string[],
  publicRoutes: string[],
  providers: SocialProvider[],
  enableEmail: boolean,
  enableMfa: boolean,
): { middleware: string; envFile: string; layout: string } {
  const middleware = `import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
${protectedRoutes.map((r) => `  '${r}',`).join('\n')}
]);

const isPublicRoute = createRouteMatcher([
${publicRoutes.map((r) => `  '${r}',`).join('\n')}
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};`;

  const envFile = `# Clerk Environment Variables
# Get these from https://dashboard.clerk.com

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
CLERK_SECRET_KEY=sk_test_YOUR_SECRET

# Optional: Custom URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard`;

  const socialSection =
    providers.length > 0
      ? `\n  {/* Social providers configured in Clerk Dashboard: ${providers.join(', ')} */}`
      : '';

  const layout = `// app/layout.tsx
import { ClerkProvider, SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <header>
            <SignedOut>
              <SignInButton />${socialSection}
            </SignedOut>
            <SignedIn>
              <UserButton />${enableMfa ? '\n              {/* MFA enabled in Clerk Dashboard > User & Authentication */}' : ''}
            </SignedIn>
          </header>
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}`;

  return { middleware, envFile, layout };
}

function generateRemixCode(
  protectedRoutes: string[],
  providers: SocialProvider[],
  enableEmail: boolean,
): { rootLoader: string; envFile: string } {
  const rootLoader = `// app/root.tsx
import { rootAuthLoader } from '@clerk/remix/ssr.server';
import { ClerkApp } from '@clerk/remix';
import { LoaderFunctionArgs } from '@remix-run/node';

export const loader = (args: LoaderFunctionArgs) => rootAuthLoader(args);

function App() {
  return (
    <html lang="en">
      <head />
      <body>
        <Outlet />
      </body>
    </html>
  );
}

export default ClerkApp(App);

// Protected route example (app/routes/dashboard.tsx):
// import { getAuth } from '@clerk/remix/ssr.server';
// export const loader = async (args: LoaderFunctionArgs) => {
//   const { userId } = await getAuth(args);
//   if (!userId) return redirect('/sign-in');
//   return json({ userId });
// };`;

  const envFile = `# Clerk Environment Variables for Remix
# Get these from https://dashboard.clerk.com

CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
CLERK_SECRET_KEY=sk_test_YOUR_SECRET`;

  return { rootLoader, envFile };
}

function generateAstroCode(
  protectedRoutes: string[],
  providers: SocialProvider[],
): { middleware: string; envFile: string } {
  const middleware = `// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';

const isProtectedRoute = createRouteMatcher([
${protectedRoutes.map((r) => `  '${r}',`).join('\n')}
]);

export const onRequest = clerkMiddleware((auth, context, next) => {
  if (isProtectedRoute(context.request)) {
    auth().protect();
  }
  return next();
});`;

  const envFile = `# Clerk Environment Variables for Astro
# Get these from https://dashboard.clerk.com

PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
CLERK_SECRET_KEY=sk_test_YOUR_SECRET`;

  return { middleware, envFile };
}

export default function ClerkAuthConfigGenerator() {
  const [framework, setFramework] = useState<Framework>('nextjs');
  const [protectedRoutes, setProtectedRoutes] = useState('/dashboard(.*)\n/account(.*)\n/settings(.*)');
  const [publicRoutes, setPublicRoutes] = useState('/\n/about\n/sign-in(.*)\n/sign-up(.*)');
  const [providers, setProviders] = useState<SocialProvider[]>(['google', 'github']);
  const [enableEmail, setEnableEmail] = useState(true);
  const [enableMfa, setEnableMfa] = useState(false);

  const toggleProvider = (p: SocialProvider) => {
    setProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const parseRoutes = (text: string) =>
    text
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

  const protectedList = parseRoutes(protectedRoutes);
  const publicList = parseRoutes(publicRoutes);

  const nextjs = generateNextjsCode(protectedList, publicList, providers, enableEmail, enableMfa);
  const remix = generateRemixCode(protectedList, providers, enableEmail);
  const astro = generateAstroCode(protectedList, providers);

  return (
    <div class="space-y-6">
      {/* Framework selector */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Framework</div>
        <div class="grid grid-cols-3 gap-2">
          {FRAMEWORKS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFramework(f.id)}
              class={`p-3 rounded-lg text-left border transition-colors ${
                framework === f.id
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              <div class="text-sm font-medium">{f.label}</div>
              <div class="text-xs text-text-muted mt-0.5">{f.version}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Route configuration */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-semibold text-text">Route Configuration</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Protected Routes (one per line)</label>
            <textarea
              value={protectedRoutes}
              onInput={(e: any) => setProtectedRoutes(e.target.value)}
              rows={5}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary resize-none"
              spellcheck={false}
            />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1.5 block">Public Routes (one per line)</label>
            <textarea
              value={publicRoutes}
              onInput={(e: any) => setPublicRoutes(e.target.value)}
              rows={5}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary resize-none"
              spellcheck={false}
            />
          </div>
        </div>
      </div>

      {/* Social providers */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Social Providers</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => toggleProvider(p.id)}
              class={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                providers.includes(p.id)
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-border-hover hover:text-text'
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
              {providers.includes(p.id) && <span class="ml-auto text-xs">✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Options</div>
        <div class="space-y-2">
          {[
            { id: 'email', label: 'Email / Password authentication', value: enableEmail, set: setEnableEmail },
            { id: 'mfa', label: 'Multi-factor authentication (MFA)', value: enableMfa, set: setEnableMfa },
          ].map((opt) => (
            <label key={opt.id} class="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => opt.set(!opt.value)}
                class={`w-9 h-5 rounded-full transition-colors relative ${opt.value ? 'bg-primary' : 'bg-gray-600'}`}
              >
                <span
                  class={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${
                    opt.value ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </div>
              <span class="text-sm text-text">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Generated code */}
      <div class="space-y-4">
        <div class="text-sm font-semibold text-text">Generated Configuration</div>

        {framework === 'nextjs' && (
          <>
            <CodeBlock code={nextjs.middleware} label="middleware.ts" />
            <CodeBlock code={nextjs.layout} label="app/layout.tsx" />
            <CodeBlock code={nextjs.envFile} label=".env.local" />
          </>
        )}
        {framework === 'remix' && (
          <>
            <CodeBlock code={remix.rootLoader} label="app/root.tsx" />
            <CodeBlock code={remix.envFile} label=".env" />
          </>
        )}
        {framework === 'astro' && (
          <>
            <CodeBlock code={astro.middleware} label="src/middleware.ts" />
            <CodeBlock code={astro.envFile} label=".env" />
          </>
        )}

        <div class="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300 space-y-1.5">
          <div class="font-medium">Next steps</div>
          <ul class="list-disc list-inside space-y-1 text-blue-300/80 text-xs">
            <li>
              Install: <code class="font-mono bg-blue-950/50 px-1 rounded">npm install @clerk/{framework === 'nextjs' ? 'nextjs' : framework === 'remix' ? 'remix' : 'astro'}</code>
            </li>
            <li>Create your app at <strong>dashboard.clerk.com</strong> and copy the keys above</li>
            {providers.length > 0 && (
              <li>Enable {providers.join(', ')} in Clerk Dashboard → User &amp; Authentication → Social Connections</li>
            )}
            {enableMfa && <li>Enable MFA in Clerk Dashboard → User &amp; Authentication → Multi-factor</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
