import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
  typescript: true,
});

export const PLANS = {
  FREE: {
    name: "Free",
    description: "Get started with basic features",
    price: 0,
    priceId: null,
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 team member",
    ],
    limits: {
      projects: 3,
      teamMembers: 1,
      apiCalls: 1000,
    },
  },
  PRO: {
    name: "Pro",
    description: "Everything you need to grow",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "Up to 10 team members",
      "Custom integrations",
      "API access",
    ],
    limits: {
      projects: -1,
      teamMembers: 10,
      apiCalls: 50000,
    },
  },
  ENTERPRISE: {
    name: "Enterprise",
    description: "For large-scale operations",
    price: 99,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      "Everything in Pro",
      "Unlimited team members",
      "SSO / SAML",
      "Dedicated support",
      "Custom contracts",
      "SLA guarantee",
      "Audit logs",
    ],
    limits: {
      projects: -1,
      teamMembers: -1,
      apiCalls: -1,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function createCheckoutSession({
  customerId,
  priceId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      trial_period_days: 14,
    },
    allow_promotion_codes: true,
  });
}

export async function createBillingPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}
