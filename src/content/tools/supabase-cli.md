---
title: "Supabase CLI — Local Development & Deployment for Supabase"
description: "The Supabase CLI enables local development, database migrations, edge function deployment, and project management for Supabase. Run your entire Supabase stack locally with Docker."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "Supabase CLI is free and open-source (Apache 2.0). Supabase free tier: 500MB database, 1GB storage, 50MB edge functions."
website: "https://supabase.com/docs/reference/cli"
github: "https://github.com/supabase/cli"
tags: ["database", "postgresql", "supabase", "cli", "edge-functions", "migrations", "devops"]
pros:
  - "Local development: run full Supabase stack (PostgreSQL, Auth, Storage, Edge Functions) locally"
  - "Database migrations: version-controlled schema changes with rollback support"
  - "Edge Functions: deploy Deno-based serverless functions to Supabase edge"
  - "Type generation: auto-generate TypeScript types from your database schema"
  - "Linked project sync: push/pull migrations between local and remote"
cons:
  - "Docker required for local development"
  - "Docker startup takes 30–60 seconds on first run"
  - "Edge Functions limited to Deno runtime"
  - "Full Docker stack is heavy for simple projects"
date: "2026-04-02"
---

## What is the Supabase CLI?

The Supabase CLI enables local development with the full Supabase stack running in Docker, schema migration management, and deployment of edge functions. It's essential for any serious Supabase application development.

## Installation

```bash
# macOS
brew install supabase/tap/supabase

# npm
npm install -g supabase

# Verify
supabase --version
```

## Local Development

```bash
# Initialize Supabase in your project
supabase init

# Start local Supabase stack (Docker required)
supabase start

# Output:
# API URL: http://localhost:54321
# GraphQL URL: http://localhost:54321/graphql/v1
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
# Inbucket URL: http://localhost:54324  (email testing)
# Anon key: eyJ...
# Service role key: eyJ...

# Stop local stack
supabase stop

# View logs
supabase logs
```

## Database Migrations

```bash
# Create a new migration
supabase migration new create_users_table

# Edit the generated file: supabase/migrations/20260402120000_create_users_table.sql
cat supabase/migrations/20260402120000_create_users_table.sql
```

```sql
-- supabase/migrations/20260402120000_create_users_table.sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

```bash
# Apply migrations to local database
supabase db reset  # Reset and apply all migrations from scratch

# Or push single migration
supabase migration up

# Generate types from schema
supabase gen types typescript --local > src/types/database.ts
```

## Linking to Remote Project

```bash
# Link local project to Supabase cloud project
supabase login
supabase link --project-ref your-project-ref

# Pull remote schema (sync down)
supabase db pull

# Push local migrations to remote
supabase db push

# Diff local vs remote
supabase db diff
```

## Edge Functions

```bash
# Create a new edge function
supabase functions new hello-world

# Edit: supabase/functions/hello-world/index.ts
```

```typescript
// supabase/functions/hello-world/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { name } = await req.json()

  // Access Supabase with service role (from env)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', name)
    .single()

  return new Response(
    JSON.stringify({ profile: data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

```bash
# Serve locally (with hot reload)
supabase functions serve hello-world --env-file .env.local

# Deploy to Supabase
supabase functions deploy hello-world

# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
```

## TypeScript Types Generation

```bash
# Generate types from local database
supabase gen types typescript --local > src/types/database.types.ts

# Generate from remote
supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
```

```typescript
// Using generated types
import { Database } from './types/database.types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Fully typed queries
const { data, error } = await supabase
  .from('profiles')  // autocompleted
  .select('username, full_name, avatar_url')  // autocompleted fields
  .eq('username', 'alice');  // TypeScript validates this
```

The Supabase CLI is the foundation for professional Supabase development — local testing, version-controlled migrations, and type-safe database access.
