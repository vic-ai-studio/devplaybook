import Link from "next/link";
import { PricingTable } from "@/components/PricingTable";

export default function HomePage() {
  return (
    <div className="relative isolate">
      {/* Hero Section */}
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl flex-shrink-0 lg:mx-0 lg:max-w-xl lg:pt-8">
          <div className="mt-24 sm:mt-32 lg:mt-16">
            <span className="inline-flex items-center space-x-2 rounded-full bg-brand-600/10 px-3 py-1 text-sm font-medium text-brand-600 ring-1 ring-inset ring-brand-600/20">
              <span>Now in Beta</span>
            </span>
          </div>
          <h1 className="mt-10 text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Build your SaaS{" "}
            <span className="text-brand-600">10x faster</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Stop wasting weeks on boilerplate. Get authentication, billing, team
            management, and a beautiful UI out of the box. Focus on what makes
            your product unique.
          </p>
          <div className="mt-10 flex items-center gap-x-6">
            <Link
              href="/auth/signin"
              className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-600 transition-colors"
            >
              View Pricing <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:ml-10 lg:mr-0 lg:mt-0 lg:max-w-none lg:flex-none xl:ml-32">
          <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
            <div className="rounded-xl bg-white/5 p-2 ring-1 ring-gray-200 lg:-m-4 lg:rounded-2xl lg:p-4">
              <div className="rounded-md bg-gradient-to-br from-brand-100 to-brand-50 w-[600px] h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">&#9889;</div>
                  <p className="text-brand-800 font-medium">
                    Your Dashboard Preview
                  </p>
                  <p className="text-brand-600 text-sm mt-1">
                    Replace with a screenshot of your app
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-brand-600">
            Ship Faster
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Everything you need to launch
          </p>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Built with the modern stack you already know and love.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {[
              {
                icon: "&#128274;",
                name: "Authentication",
                description:
                  "Google, GitHub, and magic link sign-in powered by NextAuth.js. Session management with database-backed sessions.",
              },
              {
                icon: "&#128179;",
                name: "Stripe Billing",
                description:
                  "Subscription management with free trials, upgrade/downgrade flows, and webhook handling. Billing portal included.",
              },
              {
                icon: "&#128101;",
                name: "Team Management",
                description:
                  "Create teams, invite members via email, manage roles. Perfect for B2B SaaS with collaborative features.",
              },
              {
                icon: "&#127760;",
                name: "Database Ready",
                description:
                  "Prisma ORM with PostgreSQL. Type-safe queries, migrations, and a comprehensive schema to build on.",
              },
              {
                icon: "&#127912;",
                name: "Beautiful UI",
                description:
                  "Tailwind CSS with a clean, responsive design. Dark mode ready. Customize the color palette in one place.",
              },
              {
                icon: "&#128640;",
                name: "Deploy Anywhere",
                description:
                  "Optimized for Vercel but works with any Node.js hosting. Docker support included for self-hosting.",
              },
            ].map((feature) => (
              <div key={feature.name} className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                  <span
                    className="text-2xl"
                    dangerouslySetInnerHTML={{ __html: feature.icon }}
                  />
                  {feature.name}
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                  <p className="flex-auto">{feature.description}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Start free and scale as you grow. No hidden fees.
            </p>
          </div>
          <PricingTable />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <p className="text-center text-sm leading-5 text-gray-500">
            &copy; {new Date().getFullYear()} Your Company. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
