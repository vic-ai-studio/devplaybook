# Full-Stack Boilerplate Collection

Production-ready starter templates for building modern web applications. Skip weeks of setup and start building features immediately.

## What's Included

| Boilerplate | Stack | Best For |
|---|---|---|
| **Next.js SaaS Starter** | Next.js 14, Prisma, NextAuth, Stripe, Tailwind | SaaS products with auth & billing |
| **React Admin Dashboard** | React 18, React Router, Recharts, Tailwind | Internal tools & admin panels |
| **Express API Starter** | Express, Prisma, JWT, Zod, Docker | REST APIs & microservices |

## Quick Comparison

| Feature | Next.js SaaS | React Admin | Express API |
|---|---|---|---|
| Authentication | NextAuth (Google, GitHub, Email) | Hook-based (JWT) | JWT + Refresh Tokens |
| Database | Prisma + PostgreSQL | API-driven | Prisma + PostgreSQL |
| Validation | Zod (server) | Client-side | Zod middleware |
| Styling | Tailwind CSS | Tailwind CSS | N/A (API only) |
| Payments | Stripe (subscriptions) | — | — |
| Deployment | Vercel / Docker | Vercel / Netlify | Docker Compose |
| TypeScript | Yes | Yes | Yes |

## Getting Started

### 1. Next.js SaaS Starter

```bash
cd nextjs-saas-starter
cp .env.example .env.local
npm install
npx prisma db push
npm run dev
```

Features:
- Multi-provider authentication (Google, GitHub, magic link)
- Stripe subscription billing with webhook handling
- Team management with invitations
- Responsive dashboard layout
- Database-backed sessions with Prisma

### 2. React Admin Dashboard

```bash
cd react-admin-dashboard
npm install
npm run dev
```

Features:
- Collapsible sidebar navigation
- Interactive charts with Recharts
- Sortable, filterable data tables
- User management CRUD
- Settings page with form handling
- Responsive design

### 3. Express API Starter

```bash
cd express-api-starter
cp .env.example .env
docker-compose up -d  # starts PostgreSQL
npm install
npx prisma db push
npm run dev
```

Features:
- JWT authentication with refresh token rotation
- Request validation with Zod schemas
- Rate limiting per route
- Global error handling
- Multi-stage Docker build
- CORS and Helmet security headers

## Architecture Patterns

All three boilerplates follow these principles:

1. **Separation of concerns** — Routes, middleware, business logic, and data access are cleanly separated
2. **Type safety** — Full TypeScript with strict mode enabled
3. **Environment configuration** — All secrets and config via environment variables with `.env.example` templates
4. **Error handling** — Consistent error responses with proper HTTP status codes
5. **Security defaults** — CORS, rate limiting, input validation, and secure headers out of the box

## Combining the Boilerplates

These boilerplates are designed to work together:

- **Next.js SaaS** (frontend + auth + billing) → calls **Express API** (backend services)
- **React Admin** (internal dashboard) → calls **Express API** (data management)
- **Express API** (standalone) → serves any frontend

## Customization Guide

### Adding a new database model

1. Add the model to `prisma/schema.prisma`
2. Run `npx prisma db push` (development) or `npx prisma migrate dev` (production)
3. Create routes/pages that use the new model

### Adding a new API route (Express)

1. Create a route file in `src/routes/`
2. Define Zod schemas for request validation
3. Register the route in `src/index.ts`

### Adding a new page (Next.js / React)

1. Create the page component in the appropriate directory
2. Add navigation links in the sidebar/navbar
3. Add any required API routes

## License

MIT — use these boilerplates for any project, commercial or personal.
