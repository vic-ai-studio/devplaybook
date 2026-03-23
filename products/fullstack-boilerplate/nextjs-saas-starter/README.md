# Next.js SaaS Starter

A production-ready Next.js 14 SaaS starter with authentication, Stripe billing, team management, and a clean UI.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (Google, GitHub, Email magic link)
- **Payments**: Stripe (subscriptions, checkout, billing portal)
- **Styling**: Tailwind CSS

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the values in `.env.local`:
- Generate `NEXTAUTH_SECRET` with `openssl rand -base64 32`
- Set up Google OAuth at https://console.cloud.google.com
- Set up GitHub OAuth at https://github.com/settings/developers
- Set up Stripe at https://dashboard.stripe.com

### 3. Set up the database

```bash
# Start PostgreSQL (Docker)
docker run -d --name postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=saas_starter -p 5432:5432 postgres:16

# Push schema to database
npx prisma db push

# (Optional) View database in Prisma Studio
npx prisma studio
```

### 4. Set up Stripe

1. Create products and prices in Stripe Dashboard
2. Copy the price IDs to `.env.local`
3. Set up the webhook endpoint:
   ```bash
   # Local development
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret to `.env.local`

### 5. Run the development server

```bash
npm run dev
```

Open http://localhost:3000

## Project Structure

```
src/
  app/
    api/
      auth/[...nextauth]/   # NextAuth API routes
      stripe/
        checkout/            # Stripe checkout session
        webhook/             # Stripe webhook handler
    dashboard/               # Protected dashboard pages
    page.tsx                 # Landing page
  components/
    Navbar.tsx               # Navigation with auth state
    PricingTable.tsx         # Pricing plans with Stripe checkout
  lib/
    auth.ts                  # NextAuth configuration
    prisma.ts                # Prisma client singleton
    stripe.ts                # Stripe client + plan definitions
prisma/
  schema.prisma              # Database schema
```

## Database Schema

- **User** — Core user with role (USER/ADMIN)
- **Account** — OAuth provider accounts
- **Session** — Database-backed sessions
- **Subscription** — Stripe subscription state (plan, status, period)
- **Team** — Collaborative workspaces
- **TeamMember** — Team membership with roles (OWNER/ADMIN/MEMBER)
- **Invitation** — Email-based team invitations with expiry

## Customization

### Change the brand color

Edit `tailwind.config.ts` — update the `brand` color palette.

### Add a new OAuth provider

1. Add the provider in `src/lib/auth.ts`
2. Add the required environment variables
3. The Prisma schema already supports any OAuth provider via the Account model

### Add a new pricing plan

1. Create the price in Stripe Dashboard
2. Add the price ID to `.env.local`
3. Update the `PLANS` object in `src/lib/stripe.ts`
4. Update the `Plan` enum in `prisma/schema.prisma`

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## License

MIT
