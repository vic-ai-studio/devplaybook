---
title: "PlanetScale CLI — Command-Line Tool for PlanetScale MySQL"
description: "Operate PlanetScale MySQL from CLI — pscale branches databases like Git, reviews schema changes via deploy requests, and tunnels connections securely for CI/CD."
category: "Database"
pricing: "Free"
pricingDetail: "pscale CLI is free and open-source (Apache 2.0). PlanetScale platform pricing applies separately."
website: "https://planetscale.com/docs/reference/planetscale-cli"
github: "https://github.com/planetscale/cli"
tags: ["database", "mysql", "planetscale", "cli", "migrations", "devops", "ci-cd"]
pros:
  - "Branch management: create, merge, and delete database branches like Git"
  - "Deploy requests: review schema changes before deploying to production"
  - "Secure connections: authenticated tunnel without exposing credentials"
  - "CI/CD friendly: non-interactive mode for automated workflows"
  - "Schema analysis: show schema diffs between branches"
cons:
  - "PlanetScale-specific: only works with PlanetScale databases"
  - "Some operations require web console for full context"
  - "Tunnel connections have overhead vs direct connections"
date: "2026-04-02"
---

## What is the PlanetScale CLI?

`pscale` is the command-line tool for PlanetScale — the serverless MySQL platform powered by Vitess. It manages database branches (PlanetScale's Git-like database workflow), deploy requests (review schema changes), and secure connections.

## Installation

```bash
# macOS
brew install planetscale/tap/pscale

# Linux
curl -fsSL https://raw.githubusercontent.com/planetscale/cli/main/install.sh | bash

# Verify
pscale version
```

## Authentication

```bash
# Login (opens browser)
pscale auth login

# Service token for CI/CD (no browser)
pscale auth login --service-token $TOKEN --service-token-id $TOKEN_ID
```

## Database Management

```bash
# List databases
pscale database list

# Create database
pscale database create my-app --region us-east

# Show database info
pscale database show my-app

# Delete database
pscale database delete my-app
```

## Branch Workflow (Core Feature)

PlanetScale's Git-like database workflow:

```bash
# List branches
pscale branch list my-app

# Create development branch
pscale branch create my-app feature/add-user-roles

# Create branch from another branch
pscale branch create my-app staging --from main

# Show branch status
pscale branch show my-app feature/add-user-roles

# Delete branch
pscale branch delete my-app feature/add-user-roles
```

## Connecting Locally

```bash
# Open a secure connection to a branch (acts as local MySQL proxy)
pscale connect my-app main --port 3309

# In another terminal:
mysql -h 127.0.0.1 -P 3309 -u root

# Or use with any MySQL client:
DATABASE_URL="mysql://root@127.0.0.1:3309/my-app" node app.js
```

## Deploy Requests (Schema Changes)

```bash
# Create a deploy request (request to merge branch into main)
pscale deploy-request create my-app feature/add-user-roles

# List deploy requests
pscale deploy-request list my-app

# Show changes in deploy request
pscale deploy-request diff my-app 1

# Deploy (merge to main)
pscale deploy-request deploy my-app 1

# Close without deploying
pscale deploy-request close my-app 1
```

## Schema Management

```bash
# Show current schema
pscale branch schema my-app main

# Show diff between branches
pscale branch diff my-app main..feature/add-user-roles

# Apply a SQL script to a branch
pscale branch schema apply my-app feature/add-user-roles < migration.sql
```

## CI/CD Integration

```yaml
# GitHub Actions: Apply migrations
name: Apply Database Migrations
on:
  push:
    branches: [main]
    paths: ['migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pscale CLI
        uses: planetscale/setup-pscale-action@v1

      - name: Create branch
        run: |
          pscale branch create ${{ vars.PLANET_DB }} deploy-${{ github.run_id }} \
            --org ${{ vars.PLANET_ORG }}

      - name: Apply migrations
        run: |
          pscale connect ${{ vars.PLANET_DB }} deploy-${{ github.run_id }} \
            --org ${{ vars.PLANET_ORG }} \
            --execute "npx prisma migrate deploy"

      - name: Create deploy request
        run: |
          pscale deploy-request create ${{ vars.PLANET_DB }} deploy-${{ github.run_id }} \
            --org ${{ vars.PLANET_ORG }}
        env:
          PLANETSCALE_SERVICE_TOKEN: ${{ secrets.PLANET_TOKEN }}
          PLANETSCALE_SERVICE_TOKEN_ID: ${{ secrets.PLANET_TOKEN_ID }}
```

The PlanetScale CLI is the foundation of a database-as-code workflow where schema changes are reviewed, tested, and deployed just like application code.

## Best For

- **Teams with frequent schema changes** who need to review, test, and deploy database schema changes with the same rigor as application code
- **High-traffic MySQL workloads** needing horizontal scaling — PlanetScale's Vitess-based sharding handles hundreds of billions of rows without manual sharding
- **Multi-tenant SaaS** where tenant isolation and database-per-tenant branching maps well to PlanetScale's branch model
- **Organizations treating schema migrations as code** — deploy requests give DBAs and tech leads a reviewable, stageable process for schema changes

## PlanetScale vs. Alternatives

| | PlanetScale | Neon | Supabase | AWS RDS |
|--|------------|------|----------|---------|
| Database | MySQL (Vitess) | PostgreSQL | PostgreSQL | MySQL/PostgreSQL |
| Schema branching | ✅ Deploy requests | ✅ | ✗ | ✗ |
| Horizontal scale | ✅ (Vitess sharding) | Vertical only | Vertical only | Read replicas |
| Prisma integration | ✅ | ✅ | ✅ | ✅ |
| Free tier | 5GB, 1B reads/mo | 0.5 CU | 500MB | None |
| Best for | MySQL at scale, schema workflows | PostgreSQL branching | Full-stack backend | Enterprise RDS |

PlanetScale is the best choice for teams that need MySQL's ecosystem with branching-based schema deployment. For PostgreSQL with branching, Neon is the equivalent. For a complete backend-as-a-service, Supabase includes auth, storage, and real-time.
