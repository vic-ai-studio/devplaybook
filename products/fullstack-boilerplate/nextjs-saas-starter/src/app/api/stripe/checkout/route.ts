import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, createBillingPortalSession, PLANS, PlanKey } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { plan, action } = body as { plan?: PlanKey; action?: "portal" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer ID. Please contact support." },
        { status: 400 }
      );
    }

    // If user wants to manage existing subscription, redirect to billing portal
    if (action === "portal") {
      const portalSession = await createBillingPortalSession({
        customerId: user.stripeCustomerId,
        returnUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    // Create new checkout session
    if (!plan || !PLANS[plan]) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan];

    if (!selectedPlan.priceId) {
      return NextResponse.json(
        { error: "This plan does not require payment" },
        { status: 400 }
      );
    }

    // Check if user already has an active subscription
    if (
      user.subscription?.status === "ACTIVE" ||
      user.subscription?.status === "TRIALING"
    ) {
      // Redirect to billing portal for plan changes
      const portalSession = await createBillingPortalSession({
        customerId: user.stripeCustomerId,
        returnUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
      });

      return NextResponse.json({ url: portalSession.url });
    }

    const checkoutSession = await createCheckoutSession({
      customerId: user.stripeCustomerId,
      priceId: selectedPlan.priceId,
      successUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
