---
title: "Feature Flags Best Practices 2026: LaunchDarkly vs Unleash vs Flagsmith"
description: "Implement feature flags correctly in 2026. Compare LaunchDarkly, Unleash, and Flagsmith. Learn gradual rollouts, A/B testing, kill switches, and avoiding flag debt."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["feature-flags", "launchdarkly", "unleash", "feature-toggles", "continuous-deployment"]
readingTime: "11 min read"
---

Feature flags are one of the highest-leverage practices in modern software delivery. They decouple deployment from release, enabling teams to ship code continuously while controlling who sees what—and to instantly roll back a bad feature without a deployment. But used carelessly, they become a maintenance nightmare of stale toggles and dead code paths.

This guide covers the complete picture: how feature flags work, when to use each type, a practical comparison of the top three platforms in 2026 (LaunchDarkly, Unleash, and Flagsmith), and the practices that separate teams who get value from feature flags from those who just accumulate flag debt.

## What Are Feature Flags and Why Do They Matter?

A feature flag (also called a feature toggle) is a conditional check in your code that controls whether a feature is active:

```javascript
if (flagService.isEnabled('new-checkout-flow', user)) {
  renderNewCheckout();
} else {
  renderLegacyCheckout();
}
```

That simple pattern enables:

- **Progressive delivery**: Roll out to 1% → 10% → 50% → 100% of users
- **Kill switches**: Disable a broken feature in 30 seconds without a deploy
- **A/B testing**: Measure conversion, engagement, and performance across variants
- **Beta programs**: Enable features only for specific users or teams
- **Operational flags**: Tune system behavior without code changes (cache TTL, rate limits)

## Types of Feature Flags

Not all flags are the same. Understanding the types prevents misuse:

| Type | Lifespan | Purpose | Example |
|---|---|---|---|
| **Release toggle** | Days–weeks | Hide incomplete features | New onboarding flow |
| **Experiment toggle** | Weeks | A/B test | CTA button color |
| **Ops toggle** | Days–months | Circuit breaker, kill switch | Disable search indexing |
| **Permission toggle** | Long-lived | Entitlements, beta access | Enterprise features |
| **Infrastructure toggle** | Temporary | Migrations | New DB connection pool |

The lifespan determines cleanup urgency. Release toggles should be removed once the feature launches. Permission toggles may live forever.

## LaunchDarkly: The Enterprise Standard

LaunchDarkly is the market leader, used by Atlassian, IBM, and Shopify. Its strength is enterprise-grade reliability, rich targeting rules, and deep ecosystem integrations.

### Setup (Node.js)

```bash
npm install @launchdarkly/node-server-sdk
```

```typescript
// src/featureFlags.ts
import * as ld from '@launchdarkly/node-server-sdk';

const client = ld.init(process.env.LAUNCHDARKLY_SDK_KEY!);

await client.waitForInitialization({ timeout: 10 });

// Basic boolean flag
export async function isEnabled(
  flagKey: string,
  user: { id: string; email?: string; plan?: string }
): Promise<boolean> {
  const context = {
    kind: 'user',
    key: user.id,
    email: user.email,
    custom: { plan: user.plan },
  };

  return client.variation(flagKey, context, false);  // false = default
}

// Multivariate flag (string variant)
export async function getVariant(
  flagKey: string,
  userId: string,
  defaultVariant: string
): Promise<string> {
  const context = { kind: 'user', key: userId };
  return client.variation(flagKey, context, defaultVariant);
}

// Shutdown cleanly
export async function closeFlags() {
  await client.close();
}
```

### Advanced Targeting Rules

LaunchDarkly's targeting UI lets you define complex rules without code changes:

- "Enable for users with `plan = enterprise`"
- "Enable for 20% of users in `country = US`"
- "Enable for email matching `*@beta-testers.com`"
- "Disable for users created before 2024-01-01"

These rules are evaluated in the client SDK without a network call (flags are streamed to the client), giving sub-millisecond latency.

### LaunchDarkly Strengths

- **Reliability**: 99.99%+ uptime SLA, with local flag evaluation fallback
- **Experimentation**: Native A/B testing with statistical significance reporting
- **Audit logs**: Full history of who changed what and when
- **AI/ML targeting**: Automated flag targeting based on user behavior

### LaunchDarkly Weaknesses

- **Cost**: Starts at $12/seat/month, which becomes expensive for large teams
- **Vendor lock-in**: Proprietary flag format
- **Overkill for small teams**: Complex UI for simple use cases

### Pricing (2026)

- **Starter**: Free (up to 1,000 MAU)
- **Pro**: $12/seat/month
- **Enterprise**: Custom

## Unleash: The Open-Source Choice

[Unleash](/tools/unleash) is the leading open-source feature flag platform. You can self-host it for free or use their managed cloud. GitLab uses Unleash internally.

### Self-Host with Docker

```yaml
# docker-compose.yml
services:
  unleash-db:
    image: postgres:15
    environment:
      POSTGRES_DB: unleash
      POSTGRES_USER: unleash
      POSTGRES_PASSWORD: unleash_password

  unleash:
    image: unleashorg/unleash-server:latest
    ports:
      - "4242:4242"
    environment:
      DATABASE_URL: postgresql://unleash:unleash_password@unleash-db/unleash
      INIT_FRONTEND_API_TOKENS: "default:development.unleash-insecure-frontend-api-token"
    depends_on:
      - unleash-db
```

```bash
docker-compose up -d
# Unleash UI at http://localhost:4242
# Default login: admin / unleash4all
```

### Node.js SDK

```bash
npm install unleash-client
```

```typescript
// src/unleash.ts
import { initialize, isEnabled, getVariant } from 'unleash-client';

initialize({
  url: 'http://localhost:4242/api/',
  appName: 'my-api',
  customHeaders: { Authorization: 'YOUR_API_TOKEN' },
});

// Feature check with context
export function checkFeature(
  flagName: string,
  userId: string,
  properties?: Record<string, string>
): boolean {
  const context = {
    userId,
    properties,
  };
  return isEnabled(flagName, context);
}

// Variant (for A/B tests)
export function getFeatureVariant(flagName: string, userId: string): string {
  const context = { userId };
  const variant = getVariant(flagName, context);
  return variant.enabled ? variant.name : 'control';
}
```

### Unleash Strategy Types

Unleash has a powerful strategy system:

```typescript
// Percentage rollout with sticky assignment
// (same user always gets same variant)
{
  name: "flexibleRollout",
  parameters: {
    rollout: "25",
    stickiness: "userId",
    groupId: "new-dashboard"
  }
}

// User ID targeting
{
  name: "userWithId",
  parameters: {
    userIds: "user-123,user-456,user-789"
  }
}

// Custom strategy for complex rules
{
  name: "subscriptionLevel",
  parameters: {
    levels: "professional,enterprise"
  }
}
```

### Unleash Strengths

- **Free self-hosted**: No per-seat costs when running your own instance
- **Open-source**: Full control, no vendor lock-in
- **GitLab integration**: Native support for GitLab Feature Flags
- **Custom strategies**: Write your own targeting logic in code

### Unleash Weaknesses

- **Self-hosting overhead**: You manage uptime, backups, and upgrades
- **Less polished UI**: The Unleash UI is functional but not as refined as LaunchDarkly
- **Limited built-in analytics**: Need external tools for A/B test analysis

### Pricing (2026)

- **Open source**: Free (self-hosted)
- **Pro**: $80/month (up to 5 team members, managed)
- **Enterprise**: Custom

## Flagsmith: The Modern Middle Ground

[Flagsmith](/tools/flagsmith) positions itself between LaunchDarkly and Unleash: open source with a generous managed tier, a clean modern UI, and strong remote config support.

### Setup

```bash
npm install flagsmith-nodejs
```

```typescript
// src/flags.ts
import Flagsmith from 'flagsmith-nodejs';

const flagsmith = new Flagsmith({
  environmentKey: process.env.FLAGSMITH_ENV_KEY!,
  enableLocalEvaluation: true,  // Cache flags locally for performance
});

// Get all flags for a user
export async function getFlagsForUser(userId: string) {
  const flags = await flagsmith.getIdentityFlags(userId, {
    plan: 'professional',
    country: 'US',
  });

  return {
    isEnabled: (key: string) => flags.isFeatureEnabled(key),
    getValue: (key: string) => flags.getFeatureValue(key),
  };
}

// Remote config (not just on/off — return values)
export async function getSearchConfig(userId: string) {
  const flags = await getFlagsForUser(userId);
  return {
    enabled: flags.isEnabled('search_v2'),
    maxResults: Number(flags.getValue('search_max_results') ?? 20),
    indexName: flags.getValue('search_index') ?? 'default',
  };
}
```

### Remote Config: Flagsmith's Killer Feature

Unlike LaunchDarkly and Unleash, Flagsmith treats remote config as a first-class feature. Each flag can return a value (string, number, JSON) not just a boolean:

```typescript
// Configure behavior without code changes
const config = {
  rateLimitPerMinute: Number(flags.getValue('api_rate_limit')),  // e.g., 100
  cacheTimeSeconds: Number(flags.getValue('cache_ttl')),  // e.g., 300
  maxUploadMb: Number(flags.getValue('max_upload_size')),  // e.g., 10
  maintenanceMessage: flags.getValue('maintenance_message'),  // e.g., "We're back at 6 PM"
};
```

This eliminates the need for a separate configuration management system for many use cases.

### Flagsmith Strengths

- **Open source + SaaS**: Same feature set self-hosted or managed
- **Remote config**: First-class support for returning values, not just booleans
- **Generous free tier**: 50,000 requests/month free on managed
- **Clean UX**: Modern interface that's easy for non-engineers to use

### Flagsmith Weaknesses

- **Smaller ecosystem**: Fewer integrations than LaunchDarkly
- **Less enterprise focus**: No advanced experimentation engine built in

### Pricing (2026)

- **Free**: Up to 50,000 requests/month
- **Startup**: $45/month (unlimited flags, 3 team members)
- **Scale**: $150/month (unlimited everything)

## Implementation Patterns

### Gradual Rollout Pattern

```typescript
// Roll out to increasing percentages
async function rolloutFeature(userId: string): Promise<boolean> {
  const rolloutPercentage = await getRemoteConfig('new_feature_rollout_pct', 0);

  // Hash user ID to get consistent 0-100 assignment
  const hash = cyrb53(userId) % 100;
  return hash < rolloutPercentage;
}

// Simple hash function for consistent assignment
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
```

Most flag platforms handle this hashing automatically—but understanding it helps debug why a user does or doesn't see a feature.

### Kill Switch Pattern

```typescript
// Protect a critical external service call
export async function callPaymentService(data: PaymentData) {
  const isEnabled = await flagService.isEnabled('payment_service_v2');

  if (!isEnabled) {
    // Immediately fall back to v1 without a deploy
    return callPaymentServiceV1(data);
  }

  try {
    return await callPaymentServiceV2(data);
  } catch (error) {
    // Log and re-throw — team will disable the flag
    logger.error('Payment service v2 failed', { error, data });
    throw error;
  }
}
```

### A/B Test Pattern

```typescript
type CheckoutVariant = 'control' | 'new-flow' | 'simplified';

export async function getCheckoutExperiment(userId: string): Promise<CheckoutVariant> {
  const variant = await flagService.getVariant('checkout_experiment', userId);

  // Track exposure for statistical analysis
  analytics.track('experiment_exposure', {
    userId,
    experiment: 'checkout_experiment',
    variant,
  });

  return variant as CheckoutVariant;
}

// In your component
const variant = await getCheckoutExperiment(user.id);

switch (variant) {
  case 'new-flow':
    return <NewCheckoutFlow />;
  case 'simplified':
    return <SimplifiedCheckout />;
  default:
    return <LegacyCheckout />;
}
```

## Avoiding Flag Debt

Flag debt is the #1 problem with feature flags at scale. Stale flags are dead code that confuses developers and creates risk.

### Flag Lifecycle Rules

```
1. Every flag must have:
   - An owner (team or person)
   - A removal date (or justification for permanence)
   - A Jira/Linear ticket for cleanup

2. Release flags → remove within 2 weeks of full rollout
3. Experiment flags → remove within 1 week of analysis
4. Ops flags → review quarterly

5. Automated cleanup detection:
   - Flag hasn't changed in 90 days? Auto-create cleanup ticket
   - Flag is 100% on for 30 days? Schedule removal
```

### Code Cleanup Process

When removing a flag, don't just delete the check—remove the dead code path:

```typescript
// BEFORE: Flag being removed (new-checkout-flow is 100% on)
if (flagService.isEnabled('new-checkout-flow', user)) {
  return <NewCheckoutFlow />;  // Keep this
} else {
  return <LegacyCheckout />;  // Delete this
}

// AFTER: Flag removed, dead code cleaned up
return <NewCheckoutFlow />;
```

### Testing with Feature Flags

```typescript
// Test both code paths
describe('CheckoutPage', () => {
  it('renders new flow when flag is enabled', async () => {
    mockFlagService.setFlag('new-checkout-flow', true);
    render(<CheckoutPage user={mockUser} />);
    expect(screen.getByTestId('new-checkout')).toBeInTheDocument();
  });

  it('renders legacy flow when flag is disabled', async () => {
    mockFlagService.setFlag('new-checkout-flow', false);
    render(<CheckoutPage user={mockUser} />);
    expect(screen.getByTestId('legacy-checkout')).toBeInTheDocument();
  });
});
```

Always test both branches of a flag. The most common source of feature flag bugs is the "off" path being untested.

## Which Platform Should You Choose?

| Scenario | Recommendation |
|---|---|
| Enterprise team, compliance requirements | LaunchDarkly |
| Startup wanting free self-hosted | Unleash |
| Need remote config + feature flags | Flagsmith |
| GitLab-first workflow | Unleash |
| Best A/B testing + stats | LaunchDarkly |
| Smallest cloud bill | Unleash (self-hosted) |

## Conclusion

Feature flags are infrastructure, not an afterthought. Invest in a flag platform before you need it—retrofitting flags into a system that doesn't expect them is painful. The platforms in 2026 have all matured significantly; the right choice depends more on your team size, budget, and existing tooling than on feature gaps.

The teams that get the most value from feature flags treat them as a deployment and experimentation primitive—not just a way to hide unfinished work. Build the habit of adding flags for any significant change, establish a cleanup culture, and flag debt stays manageable.

Explore [feature flag tools](/tools/feature-flags) and [deployment tooling](/tools/deployment) in the DevPlaybook collection.
