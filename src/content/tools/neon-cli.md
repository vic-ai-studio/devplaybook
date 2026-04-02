---
title: "Neon CLI — Command-Line Tool for Neon Serverless PostgreSQL"
description: "The Neon CLI (neonctl) manages Neon PostgreSQL projects, branches, databases, and connection strings from the command line. Perfect for CI/CD workflows with database-per-PR branching."
category: "Database"
pricing: "Free"
pricingDetail: "Neon CLI is free and open-source. Neon free tier: 10GB storage, 191.9 compute hours/month, 10 branches."
website: "https://neon.tech/docs/reference/neon-cli"
github: "https://github.com/neondatabase/neon"
tags: ["database", "postgresql", "neon", "serverless", "cli", "migrations", "ci-cd", "branching"]
pros:
  - "Branch management: create/delete PostgreSQL branches for PR-based workflows"
  - "Connection strings: instantly get connection URLs for any branch"
  - "Type generation: generate TypeScript types from your schema"
  - "CI/CD integration: non-interactive mode for automated workflows"
  - "Project management: multiple projects, each with independent branches"
cons:
  - "Neon-specific: only works with Neon databases"
  - "Branch creation is fast but branch promotion to main requires migration tooling"
  - "CLI is newer than pscale — some features still being added"
date: "2026-04-02"
---

## What is the Neon CLI?

`neonctl` is the command-line tool for Neon — the serverless PostgreSQL platform with database branching. It creates and manages database branches for development workflows, generates TypeScript types, and integrates with CI/CD pipelines.

## Installation

```bash
# npm
npm install -g neonctl

# macOS
brew install neon

# Verify
neonctl --version
```

## Authentication

```bash
# Login (opens browser)
neonctl auth

# API key (for CI/CD)
export NEON_API_KEY=your-api-key-here
# Or: neonctl <command> --api-key $NEON_API_KEY
```

## Project Management

```bash
# List projects
neonctl projects list

# Create project
neonctl projects create --name my-app

# Get project details
neonctl projects get <project-id>

# Delete project
neonctl projects delete <project-id>
```

## Branch Workflow

```bash
# List branches
neonctl branches list --project-id <project-id>

# Create a branch (instant, uses copy-on-write)
neonctl branches create \
  --project-id <project-id> \
  --name feature/new-auth

# Create from specific parent (e.g., a point in time)
neonctl branches create \
  --project-id <project-id> \
  --name feature/experiment \
  --parent main

# Get connection string for a branch
neonctl connection-string feature/new-auth \
  --project-id <project-id>
# Output: postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Reset branch to parent state (discard all changes)
neonctl branches reset feature/new-auth --project-id <project-id>

# Delete branch
neonctl branches delete feature/new-auth --project-id <project-id>
```

## CI/CD: Database Branch Per Pull Request

```yaml
# .github/workflows/pr-database.yml
name: PR Database Branch
on:
  pull_request:
    types: [opened, synchronize]
  pull_request_target:
    types: [closed]

jobs:
  create-branch:
    if: github.event.action != 'closed'
    runs-on: ubuntu-latest
    outputs:
      db_url: ${{ steps.create.outputs.db_url }}
    steps:
      - uses: actions/checkout@v4

      - name: Create Neon Branch
        id: create
        uses: neondatabase/create-branch-action@v5
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch_name: pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

      - name: Run Migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ steps.create.outputs.db_url }}

      - name: Run Integration Tests
        run: npm run test:integration
        env:
          DATABASE_URL: ${{ steps.create.outputs.db_url }}

  cleanup:
    if: github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - name: Delete Neon Branch
        uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ vars.NEON_PROJECT_ID }}
          branch: pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
```

## Connection Strings

```bash
# Get psql-compatible connection string
neonctl connection-string main \
  --project-id abc123 \
  --database-name myapp \
  --role-name webuser

# Output to file
neonctl connection-string main > .env.local
```

## Neon Branching for Database Testing

The power of Neon CLI in development:

```bash
#!/bin/bash
# Create isolated test database for each developer
BRANCH_NAME="dev-$(whoami)"

# Create personal dev branch
neonctl branches create \
  --project-id $NEON_PROJECT_ID \
  --name $BRANCH_NAME \
  --parent main

# Get connection string
DB_URL=$(neonctl connection-string $BRANCH_NAME --project-id $NEON_PROJECT_ID)

echo "DATABASE_URL=$DB_URL" > .env.local
echo "Branch created: $BRANCH_NAME"
echo "Your database is ready!"
```

The Neon CLI enables the most developer-friendly database workflow available — every branch, PR, and developer gets their own isolated PostgreSQL database in seconds.
