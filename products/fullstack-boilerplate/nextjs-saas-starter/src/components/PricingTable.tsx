"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

const plans = [
  {
    name: "Free",
    key: "FREE" as const,
    price: 0,
    description: "Get started with basic features",
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 team member",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    key: "PRO" as const,
    price: 29,
    description: "Everything you need to grow",
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Up to 10 team members",
      "Custom integrations",
      "API access",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    key: "ENTERPRISE" as const,
    price: 99,
    description: "For large-scale operations",
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "SSO / SAML",
      "Dedicated support",
      "Custom contracts",
      "SLA guarantee",
      "Audit logs",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function PricingTable() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const handleSubscribe = async (planKey: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    if (planKey === "FREE") return;

    setLoading(planKey);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-10">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <span
          className={`text-sm font-medium ${
            billingPeriod === "monthly" ? "text-gray-900" : "text-gray-500"
          }`}
        >
          Monthly
        </span>
        <button
          onClick={() =>
            setBillingPeriod(
              billingPeriod === "monthly" ? "yearly" : "monthly"
            )
          }
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            billingPeriod === "yearly" ? "bg-brand-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              billingPeriod === "yearly" ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
        <span
          className={`text-sm font-medium ${
            billingPeriod === "yearly" ? "text-gray-900" : "text-gray-500"
          }`}
        >
          Yearly{" "}
          <span className="text-green-600 font-semibold">(Save 20%)</span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {plans.map((plan) => {
          const displayPrice =
            billingPeriod === "yearly"
              ? Math.round(plan.price * 0.8)
              : plan.price;

          const isCurrentPlan = session?.user?.plan === plan.key;

          return (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.highlighted
                  ? "bg-brand-600 text-white ring-2 ring-brand-600 shadow-xl scale-105"
                  : "bg-white text-gray-900 ring-1 ring-gray-200 shadow-sm"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-5">
                <h3
                  className={`text-lg font-semibold ${
                    plan.highlighted ? "text-white" : "text-gray-900"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    plan.highlighted ? "text-brand-100" : "text-gray-500"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold">${displayPrice}</span>
                {plan.price > 0 && (
                  <span
                    className={`text-sm ${
                      plan.highlighted ? "text-brand-200" : "text-gray-500"
                    }`}
                  >
                    /month
                  </span>
                )}
              </div>

              <ul className="mb-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <svg
                      className={`h-5 w-5 flex-shrink-0 ${
                        plan.highlighted ? "text-brand-200" : "text-brand-500"
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span
                      className={`text-sm ${
                        plan.highlighted ? "text-brand-100" : "text-gray-600"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.key)}
                disabled={loading === plan.key || isCurrentPlan}
                className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  isCurrentPlan
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : plan.highlighted
                    ? "bg-white text-brand-600 hover:bg-brand-50"
                    : "bg-brand-600 text-white hover:bg-brand-500"
                } disabled:opacity-50`}
              >
                {loading === plan.key
                  ? "Loading..."
                  : isCurrentPlan
                  ? "Current Plan"
                  : plan.cta}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
