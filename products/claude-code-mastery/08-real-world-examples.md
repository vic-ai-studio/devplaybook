# Chapter 08: Real-World Examples

> Theory is great. Practice is better. Here are 10 complete, realistic workflows showing exactly how to use Claude Code in real development scenarios.

---

## Example 1: Build a REST API Endpoint from Scratch

**Scenario:** Add a `POST /api/teams/:teamId/members` endpoint to an Express + TypeScript API.

### The Prompt

```
> Create a new API endpoint: POST /api/teams/:teamId/members
>
> Business rules:
> - Only team admins can add members
> - User must exist in our system (look up by email)
> - Can't add someone who's already a member
> - Maximum 50 members per team
> - Send a welcome email after adding (use our existing emailService)
>
> Follow the patterns in src/routes/teams.ts for structure.
> Include Zod validation, error handling, and tests.
```

### What Claude Does

1. **Reads existing patterns** — Opens `src/routes/teams.ts` to understand the codebase conventions
2. **Checks the database schema** — Reads Prisma schema for Team, User, TeamMember models
3. **Finds the email service** — Locates `src/services/email.ts` to understand the API
4. **Creates the route handler:**

```typescript
// src/routes/team-members.ts
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireTeamAdmin } from '../middleware/auth';
import { prisma } from '../lib/db';
import { emailService } from '../services/email';
import { AppError } from '../lib/errors';

const router = Router();

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['member', 'admin']).default('member'),
});

router.post(
  '/teams/:teamId/members',
  requireAuth,
  requireTeamAdmin,
  async (req, res, next) => {
    try {
      const { teamId } = req.params;
      const { email, role } = addMemberSchema.parse(req.body);

      // Check team exists and member count
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: { _count: { select: { members: true } } },
      });

      if (!team) throw new AppError(404, 'Team not found');
      if (team._count.members >= 50) {
        throw new AppError(400, 'Team has reached the maximum of 50 members');
      }

      // Find user by email
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new AppError(404, 'User not found with this email');

      // Check for existing membership
      const existing = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: user.id } },
      });
      if (existing) throw new AppError(409, 'User is already a member of this team');

      // Add member
      const member = await prisma.teamMember.create({
        data: { teamId, userId: user.id, role },
        include: { user: { select: { id: true, name: true, email: true } } },
      });

      // Send welcome email
      await emailService.sendTeamWelcome({
        to: email,
        teamName: team.name,
        invitedBy: req.user.name,
      });

      res.status(201).json({ data: member });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

5. **Writes tests:**

```typescript
// src/routes/__tests__/team-members.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/db';
import { emailService } from '../../services/email';

vi.mock('../../services/email');

describe('POST /api/teams/:teamId/members', () => {
  it('adds a member and sends welcome email', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/members')
      .set('Authorization', 'Bearer admin-token')
      .send({ email: 'newuser@example.com', role: 'member' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('newuser@example.com');
    expect(emailService.sendTeamWelcome).toHaveBeenCalled();
  });

  it('rejects non-admin users', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/members')
      .set('Authorization', 'Bearer member-token')
      .send({ email: 'someone@example.com' });

    expect(res.status).toBe(403);
  });

  it('prevents duplicate membership', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/members')
      .set('Authorization', 'Bearer admin-token')
      .send({ email: 'existing@example.com' });

    expect(res.status).toBe(409);
  });

  it('enforces 50-member limit', async () => {
    // ... test with a team at 50 members
  });

  it('validates email format', async () => {
    const res = await request(app)
      .post('/api/teams/team-1/members')
      .set('Authorization', 'Bearer admin-token')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
  });
});
```

6. **Registers the route** in `src/app.ts`
7. **Runs tests** to verify everything passes

---

## Example 2: Build a React Component

**Scenario:** Create a data table component with sorting, filtering, and pagination.

### The Prompt

```
> Build a reusable DataTable component with:
> - Column sorting (click header to sort)
> - Text search filter
> - Pagination (10, 25, 50 per page)
> - Row selection with checkboxes
> - Empty state
> - Loading state
>
> Use our existing UI primitives from src/components/ui/.
> TypeScript with proper generics so it works with any data type.
> Follow patterns in src/components/features/ for structure.
```

### What Claude Creates

A complete component directory:

```
src/components/features/data-table/
  DataTable.tsx          # Main component with generics
  DataTableHeader.tsx    # Sortable column headers
  DataTablePagination.tsx # Page controls
  DataTableFilter.tsx    # Search input
  useDataTable.ts        # Hook for table state management
  data-table.test.tsx    # Comprehensive tests
  index.ts               # Barrel export
```

The main component uses TypeScript generics:

```typescript
interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  onRowSelect?: (selected: T[]) => void;
  pageSize?: 10 | 25 | 50;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading,
  onRowSelect,
  pageSize = 10,
}: DataTableProps<T>) {
  // ... implementation
}
```

---

## Example 3: Database Migration

**Scenario:** Add multi-tenancy to an existing single-tenant app.

### The Prompt

```
> We need to add multi-tenancy with row-level security.
>
> Current state: Single-tenant app with users, projects, and tasks tables.
> Target state: Organizations own projects; users belong to organizations.
>
> Steps needed:
> 1. Create organizations table
> 2. Add org_id to projects and tasks
> 3. Migrate existing data (all current data belongs to a default org)
> 4. Add RLS policies
> 5. Update Prisma schema
> 6. Update all queries to be org-scoped
>
> This is a production database. The migration must be safe and reversible.
> Show me the plan before executing.
```

### What Claude Produces

**Migration plan** with safety checks, a multi-step migration that can be rolled back at each stage, updated Prisma schema, and modified queries throughout the codebase.

Key: Claude generates a **reversible** migration with `up` and `down` functions, includes data backfill logic, and adds the RLS policies.

---

## Example 4: Bug Fix

**Scenario:** Users report that file uploads fail intermittently.

### The Prompt

```
> Bug: File uploads fail about 20% of the time with a generic "Upload failed" error.
>
> Here's what I know:
> - Started after we deployed the new upload service last week
> - Only affects files larger than 2MB
> - Backend logs show "ECONNRESET" errors
> - The upload endpoint is in src/routes/uploads.ts
> - We use Multer for file handling and S3 for storage
>
> Diagnose and fix this.
```

### Claude's Process

1. **Reads the upload route** and the Multer configuration
2. **Finds the root cause** — Multer's default memory storage limits combined with a race condition when streaming to S3
3. **Identifies the specific issue:**

```typescript
// The bug: streaming to S3 while Multer still holds the buffer
// If the S3 upload takes too long, Multer's cleanup runs and
// the buffer is garbage collected mid-stream

// Before (buggy):
const upload = multer({ storage: multer.memoryStorage() });

// After (fixed): Stream directly to S3 using multer-s3
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.S3_BUCKET,
    key: (req, file, cb) => cb(null, `uploads/${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
```

4. **Writes a test** that reproduces the issue with a large file
5. **Verifies** the fix resolves the test

---

## Example 5: Performance Optimization

**Scenario:** Dashboard API endpoint takes 3+ seconds to respond.

### The Prompt

```
> GET /api/dashboard is taking 3.2 seconds average.
> It needs to return: user stats, recent activity, team metrics, notifications.
>
> Currently it makes 8 sequential database queries.
> Help me optimize this to under 500ms.
```

### What Claude Does

1. **Reads the endpoint** and identifies all 8 queries
2. **Analyzes dependencies** — finds that 6 of 8 queries are independent
3. **Optimizes:**

```typescript
// Before: Sequential queries (3.2s)
const userStats = await getUserStats(userId);
const activity = await getRecentActivity(userId);
const teamMetrics = await getTeamMetrics(teamId);
const notifications = await getNotifications(userId);
// ... 4 more sequential queries

// After: Parallel queries + smart caching (380ms)
const [userStats, activity, teamMetrics, notifications] = await Promise.all([
  cache.wrap(`user-stats:${userId}`, () => getUserStats(userId), { ttl: 300 }),
  getRecentActivity(userId), // No cache — must be fresh
  cache.wrap(`team-metrics:${teamId}`, () => getTeamMetrics(teamId), { ttl: 600 }),
  getNotifications(userId), // No cache — must be fresh
]);
```

4. **Adds database indexes** for the slow queries identified via EXPLAIN
5. **Implements response caching** with appropriate TTLs
6. **Before/after benchmarks** showing the improvement

---

## Example 6: API Integration

**Scenario:** Integrate Stripe for subscription billing.

### The Prompt

```
> Integrate Stripe for subscription billing.
>
> Requirements:
> - Three plans: Free, Pro ($19/mo), Enterprise ($99/mo)
> - Stripe Checkout for payment
> - Webhook handling for subscription lifecycle events
> - Billing portal for customers to manage subscriptions
> - Usage tracking for metered billing (API calls)
>
> We need: route handlers, webhook handler, Stripe utility module,
> database changes, and frontend checkout flow.
```

### What Claude Creates

```
src/
  lib/stripe.ts                    # Stripe client, plan configs, helpers
  routes/billing.ts                # Checkout, portal, and billing endpoints
  routes/webhooks/stripe.ts        # Webhook handler with signature verification
  services/subscription.ts         # Subscription business logic
  services/usage-tracking.ts       # Metered billing tracker
  middleware/check-subscription.ts # Middleware to enforce plan limits
```

Key details Claude handles:
- Webhook signature verification
- Idempotent event processing (stores processed event IDs)
- Graceful handling of all lifecycle events (created, updated, deleted, payment_failed)
- Type-safe Stripe event handling

---

## Example 7: Authentication System

**Scenario:** Add magic link authentication to an existing app.

### The Prompt

```
> Add passwordless magic link authentication alongside our existing
> email/password auth.
>
> Flow:
> 1. User enters email on login page
> 2. We send a magic link to their email
> 3. Link contains a signed token valid for 15 minutes
> 4. Clicking the link logs them in and creates a session
> 5. If user doesn't exist, create their account
>
> Security requirements:
> - Tokens are single-use (can't click the link twice)
> - Rate limit: max 5 magic link requests per email per hour
> - Token is cryptographically signed (HMAC-SHA256)
> - Link includes the user's IP for additional verification
```

### Claude's Implementation Highlights

```typescript
// Token generation with HMAC signing
function generateMagicToken(email: string, ip: string): string {
  const payload = {
    email,
    ip,
    exp: Date.now() + 15 * 60 * 1000, // 15 min
    jti: crypto.randomUUID(), // Unique token ID for single-use enforcement
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.MAGIC_LINK_SECRET!)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}
```

---

## Example 8: Test Suite Creation

**Scenario:** Legacy module has zero tests. Add comprehensive coverage.

### The Prompt

```
> src/lib/pricing-engine.ts has zero tests and handles all pricing
> calculations for our SaaS. It's 400 lines with complex discount
> logic, tiered pricing, and proration.
>
> Write a comprehensive test suite. I need:
> - Unit tests for every exported function
> - Edge cases: zero quantities, negative values, currency rounding
> - Discount stacking scenarios
> - Proration calculations for mid-cycle upgrades/downgrades
> - Regression tests for known bugs (see CHANGELOG.md)
>
> Use Vitest. Target: every code path covered.
```

### What Claude Produces

```typescript
describe('PricingEngine', () => {
  describe('calculateBasePrice', () => {
    it('returns 0 for free tier', () => { /* ... */ });
    it('applies per-seat pricing correctly', () => { /* ... */ });
    it('handles fractional cents with banker rounding', () => { /* ... */ });
    it('throws on negative quantity', () => { /* ... */ });
  });

  describe('applyDiscount', () => {
    it('applies percentage discount', () => { /* ... */ });
    it('applies fixed amount discount', () => { /* ... */ });
    it('never goes below zero', () => { /* ... */ });
    it('stacks multiple discounts in correct order', () => {
      // Percentage discounts apply first, then fixed
      const base = 100;
      const discounts = [
        { type: 'percentage', value: 20 }, // -$20
        { type: 'fixed', value: 10 },      // -$10
      ];
      expect(applyDiscounts(base, discounts)).toBe(70); // Not 72
    });
  });

  describe('calculateProration', () => {
    it('prorates upgrade for remaining days', () => {
      // Upgrading from $10/mo to $20/mo on day 15 of 30
      expect(calculateProration({
        oldPrice: 1000, // cents
        newPrice: 2000,
        daysPassed: 15,
        totalDays: 30,
      })).toBe(500); // $5.00 credit + $10 new = $5 charge
    });

    it('handles leap year February correctly', () => { /* ... */ });
    it('handles timezone boundaries', () => { /* ... */ });
  });

  // 60+ more tests covering every edge case
});
```

---

## Example 9: CI/CD Pipeline Setup

**Scenario:** Set up GitHub Actions for a monorepo.

### The Prompt

```
> Create a complete GitHub Actions CI/CD pipeline for our Turborepo monorepo.
>
> Structure:
> - packages/web (Next.js frontend)
> - packages/api (Express backend)
> - packages/shared (shared types and utilities)
>
> Requirements:
> - Run on PR: lint, typecheck, test (only for changed packages)
> - Run on merge to main: build and deploy
> - Web deploys to Vercel
> - API deploys to Railway
> - Cache: Turborepo remote cache, npm cache, Next.js build cache
> - Notifications: Slack on deploy success/failure
```

### What Claude Creates

```yaml
# .github/workflows/ci.yml — Runs on every PR
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      web: ${{ steps.filter.outputs.web }}
      api: ${{ steps.filter.outputs.api }}
      shared: ${{ steps.filter.outputs.shared }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            web: 'packages/web/**'
            api: 'packages/api/**'
            shared: 'packages/shared/**'

  lint-and-typecheck:
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx turbo lint typecheck --filter='...[origin/main]'

  test:
    needs: changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx turbo test --filter='...[origin/main]'
```

Plus a deployment workflow, Slack notification integration, and caching optimization.

---

## Example 10: Full-Stack Feature with Claude as Pair Programmer

**Scenario:** Build a real-time notification system over a multi-hour session.

### Session Flow

**Hour 1: Planning**

```
> I need a real-time notification system. Let's plan before coding.
>
> Requirements:
> - In-app notifications (toast + notification center)
> - Email notifications for important events
> - User preferences (which notifications, which channels)
> - Real-time delivery via WebSocket
> - Persist to database for notification history
>
> Design the system architecture first.
```

Claude produces:
- System architecture diagram (text-based)
- Database schema (notifications, notification_preferences tables)
- Event taxonomy (which events generate which notifications)
- Technology decisions (WebSocket library, email provider, queue for background processing)

**Hour 2: Backend**

```
> Let's build the backend. Start with:
> 1. Database migrations
> 2. Notification service (create, mark read, delete)
> 3. WebSocket server for real-time delivery
> 4. Background job for email notifications
> 5. User preference API
```

Claude implements each piece, running tests along the way.

**Hour 3: Frontend**

```
> Now the frontend:
> 1. NotificationBell component (with unread count badge)
> 2. NotificationDropdown (recent notifications list)
> 3. NotificationCenter page (full history with filters)
> 4. Toast notifications for real-time events
> 5. Notification preferences settings page
>
> Use our WebSocket hook pattern from src/hooks/useWebSocket.ts
```

**Hour 4: Integration and Polish**

```
> Let's wire everything together:
> 1. Connect WebSocket to notification bell
> 2. Add notification triggers to existing events
>    (new comment, task assigned, team invite)
> 3. End-to-end test the full flow
> 4. Add error handling and reconnection logic
> 5. Performance: batch notification reads, debounce WebSocket
```

**End of Session:**

```
> Review everything we built today:
> - Run the full test suite
> - Check for any security issues
> - Generate a PR description
> - List any follow-up items for next session
```

---

## Key Takeaways from These Examples

1. **Context is everything** — The more specific your prompt, the better the output
2. **Ask Claude to read existing patterns first** — "Follow the patterns in..." produces much better code
3. **Break large tasks into phases** — Plan, implement, test, review
4. **Verify at each step** — Run tests between phases, not just at the end
5. **Claude handles the boring parts** — Let it write boilerplate, tests, and migrations while you focus on architecture and business logic
6. **Iteration is fast** — Don't try to get everything perfect in one prompt; iterate
7. **Review everything** — Claude is powerful but not infallible; always review before committing

---

**Next Chapter:** [09 - Tips & Tricks](09-tips-and-tricks.md) — Power user secrets and hidden features.
