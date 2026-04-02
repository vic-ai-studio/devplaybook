---
title: "Hasura — Instant GraphQL API for PostgreSQL & More"
description: "Hasura instantly generates a real-time GraphQL API from your PostgreSQL database schema. Features automatic CRUD, subscriptions, REST endpoints, role-based access control, and Actions for custom logic."
category: "Database"
pricing: "Free / Paid"
pricingDetail: "Hasura Community (self-hosted) is free. Hasura Cloud free tier: 1GB storage, 3M API calls/month. Pro: $99/month per project."
website: "https://hasura.io"
github: "https://github.com/hasura/graphql-engine"
tags: ["database", "graphql", "postgresql", "api", "real-time", "subscriptions", "backend", "node"]
pros:
  - "Instant API: full GraphQL CRUD generated automatically from your schema"
  - "Real-time subscriptions: WebSocket-based live data out of the box"
  - "Fine-grained RBAC: row-level and column-level permissions"
  - "Actions: add custom business logic as HTTP webhooks or TypeScript functions"
  - "Remote schemas: merge external GraphQL APIs into one unified API"
cons:
  - "GraphQL-only query language (not all teams want GraphQL)"
  - "Complex permission rules can be hard to debug"
  - "Large applications can hit N+1 query problems without careful tuning"
  - "Hasura Cloud pricing scales steeply for high-traffic applications"
date: "2026-04-02"
---

## What is Hasura?

Hasura is a GraphQL engine that connects to your PostgreSQL database and instantly provides a full GraphQL API — queries, mutations, and real-time subscriptions — without writing a single resolver.

You define your database schema, configure permissions, and Hasura generates the API. Add custom business logic via "Actions" (HTTP webhooks to your code) for non-CRUD operations.

## Quick Start

```bash
# Docker Compose setup
cat > docker-compose.yml << 'EOF'
version: '3'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgrespassword
    volumes:
      - pgdata:/var/lib/postgresql/data

  hasura:
    image: hasura/graphql-engine:v2.39.0
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/postgres
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: myadminsecret
      HASURA_GRAPHQL_JWT_SECRET: '{"type":"RS256","key":"-----BEGIN PUBLIC KEY-----..."}'

volumes:
  pgdata:
EOF

docker-compose up -d
# Console at http://localhost:8080/console
```

## Auto-Generated GraphQL API

After connecting your database and tracking tables:

```graphql
# Hasura auto-generates these from your schema:

# Query
query GetUsers {
  users(where: { active: { _eq: true } }, order_by: { created_at: desc }, limit: 10) {
    id
    name
    email
    posts(where: { published: { _eq: true } }) {
      id
      title
    }
  }
}

# Aggregation query
query PostStats {
  posts_aggregate {
    aggregate {
      count
      avg { views }
      max { created_at }
    }
  }
}

# Mutation
mutation CreateUser($email: String!, $name: String!) {
  insert_users_one(object: { email: $email, name: $name }) {
    id
    email
    created_at
  }
}

# Real-time subscription
subscription OnNewPost {
  posts(
    where: { published: { _eq: true } }
    order_by: { created_at: desc }
    limit: 5
  ) {
    id
    title
    author { name }
  }
}
```

## Row-Level Permissions

Configure RBAC in the Hasura console or via metadata:

```yaml
# Metadata: permissions for "user" role
- table:
    schema: public
    name: posts
  select_permissions:
    - role: user
      permission:
        columns: [id, title, content, published, created_at]
        filter:
          _or:
            - published: { _eq: true }
            - author_id: { _eq: "X-Hasura-User-Id" }  # User's own drafts
  insert_permissions:
    - role: user
      permission:
        columns: [title, content]
        check: {}
        set:
          author_id: "X-Hasura-User-Id"  # Auto-set from JWT
  update_permissions:
    - role: user
      permission:
        columns: [title, content, published]
        filter:
          author_id: { _eq: "X-Hasura-User-Id" }  # Only own posts
  delete_permissions:
    - role: user
      permission:
        filter:
          author_id: { _eq: "X-Hasura-User-Id" }
```

## Actions: Custom Business Logic

```typescript
// TypeScript action handler (Next.js API route or Express)
// POST /api/send-verification-email
export default async function sendVerificationEmail(req: Request) {
  const { userId, email } = req.body.input;

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Send email
  await resend.emails.send({
    from: 'noreply@example.com',
    to: email,
    subject: 'Verify your email',
    html: `<a href="https://app.example.com/verify?token=${generateToken(userId)}">Verify</a>`,
  });

  return { message: 'Verification email sent' };
}
```

```yaml
# Register action in Hasura metadata
- name: SendVerificationEmail
  definition:
    kind: synchronous
    handler: http://localhost:3000/api/send-verification-email
  arguments:
    - name: userId
      type: uuid!
    - name: email
      type: String!
  output_type: SendEmailOutput
```

## Hasura CLI for Version Control

```bash
# Install
npm install -g hasura-cli

# Initialize project
hasura init my-project --endpoint http://localhost:8080

# Export metadata
hasura metadata export

# Apply metadata to remote
hasura metadata apply

# Apply migrations
hasura migrate apply --database-name default

# Console with tracking
hasura console
```

Hasura is the right choice when you want a complete GraphQL API without building resolvers, especially for applications needing real-time subscriptions and complex RBAC.
