---
title: "Turborepo + pnpm Workspaces + TypeScript: Complete Monorepo Setup Guide 2026"
description: "Build a production-ready monorepo with Turborepo, pnpm workspaces, and TypeScript project references. Learn shared packages, cross-app type sharing, testing pipelines, and deploying to Vercel and Fly.io."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["turborepo", "pnpm", "typescript", "monorepo", "vercel", "workspace", "javascript", "build-tools"]
readingTime: "15 min read"
---

A monorepo is only as good as its tooling. Without proper workspace management, TypeScript project references, and a caching build system, a monorepo becomes the worst of both worlds — the complexity of multiple projects without the isolation benefits.

This guide walks through building a production-grade monorepo from scratch: Turborepo for task orchestration, pnpm workspaces for dependency management, TypeScript project references for correct incremental builds, and deployment strategies for real apps.

---

## Why This Stack?

- **pnpm workspaces**: Strict dependency isolation, symlink-based resolution, 40-60% faster than npm in monorepo scenarios
- **Turborepo**: Builds only what changed, caches results locally and remotely, understands package dependency graphs
- **TypeScript project references**: Compiler-level incremental builds, correct cross-package type checking, faster `tsc` in watch mode

Together, they handle a monorepo with 5 packages the same way they handle one with 50.

---

## Project Structure We're Building

```
my-monorepo/
├── apps/
│   ├── web/              # Next.js 14 frontend
│   └── api/              # Express + tRPC backend
├── packages/
│   ├── ui/               # Shared React component library
│   ├── utils/            # Shared utilities (validation, formatting)
│   ├── types/            # Shared TypeScript types
│   └── config/
│       ├── eslint/       # Shared ESLint config
│       └── typescript/   # Shared tsconfig bases
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── tsconfig.json
```

---

## Step 1: Initialize the Repository

```bash
mkdir my-monorepo && cd my-monorepo
git init

# Install pnpm globally if needed
npm install -g pnpm

# Initialize root package.json
pnpm init
```

Edit `package.json`:

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Step 2: Configure pnpm Workspaces

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "packages/config/*"
```

Create a `.npmrc` to enforce strict workspace protocols:

```ini
# .npmrc
strict-peer-dependencies=false
auto-install-peers=true
shamefully-hoist=false
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*
```

Install Turborepo:

```bash
pnpm add -w -D turbo
```

---

## Step 3: Shared TypeScript Configs

Create `packages/config/typescript/` with base configs:

```bash
mkdir -p packages/config/typescript
```

`packages/config/typescript/package.json`:

```json
{
  "name": "@repo/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": ["*.json"]
}
```

`packages/config/typescript/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true  // Required for project references
  }
}
```

`packages/config/typescript/nextjs.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "allowJs": true,
    "plugins": [{ "name": "next" }]
  }
}
```

`packages/config/typescript/react-lib.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  }
}
```

---

## Step 4: Shared Types Package

```bash
mkdir -p packages/types/src
```

`packages/types/package.json`:

```json
{
  "name": "@repo/types",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "type-check": "tsc --noEmit",
    "clean": "rm -rf dist .turbo"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "typescript": "^5.4.0"
  }
}
```

`packages/types/tsconfig.json`:

```json
{
  "extends": "@repo/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/types/src/index.ts`:

```typescript
// Shared domain types used across apps and packages

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member" | "guest";
  createdAt: Date;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  meta?: {
    page?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export type ID = string;

export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Step 5: Shared Utilities Package

```bash
mkdir -p packages/utils/src
```

`packages/utils/package.json`:

```json
{
  "name": "@repo/utils",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "type-check": "tsc --noEmit",
    "test": "vitest run",
    "clean": "rm -rf dist .turbo"
  },
  "dependencies": {
    "@repo/types": "workspace:*"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
```

`packages/utils/src/index.ts`:

```typescript
export * from "./validation";
export * from "./format";
export * from "./api";
```

`packages/utils/src/validation.ts`:

```typescript
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function assertDefined<T>(value: T | undefined | null, message: string): T {
  if (value == null) throw new Error(message);
  return value;
}
```

`packages/utils/src/format.ts`:

```typescript
export function formatDate(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}
```

---

## Step 6: Shared UI Package

```bash
mkdir -p packages/ui/src
```

`packages/ui/package.json`:

```json
{
  "name": "@repo/ui",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc --build",
    "type-check": "tsc --noEmit",
    "dev": "tsc --build --watch",
    "clean": "rm -rf dist .turbo"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "@repo/types": "workspace:*"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "react": "^18",
    "typescript": "^5.4.0"
  }
}
```

`packages/ui/src/Button.tsx`:

```typescript
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  danger: "bg-red-600 text-white hover:bg-red-700",
};

const sizes = {
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`rounded font-medium transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? "Loading..." : children}
    </button>
  );
}
```

`packages/ui/src/index.ts`:

```typescript
export { Button } from "./Button";
```

---

## Step 7: Configure Turborepo

`turbo.json`:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json", "package.json"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tests/**", "vitest.config.ts"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^lint"],
      "inputs": ["src/**", ".eslintrc.*"]
    },
    "type-check": {
      "dependsOn": ["^build"],
      "inputs": ["src/**", "tsconfig.json"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

Key concepts:
- `"^build"` means "build all dependencies first"
- `dependsOn: []` for lint means packages can lint in parallel
- `cache: false` for dev (we always want fresh dev servers)
- `persistent: true` for dev (Turborepo keeps it running)

---

## Step 8: Apps Setup

### Web App (Next.js)

```bash
cd apps && pnpm create next-app web --typescript --tailwind --app
```

`apps/web/package.json` (add workspace deps):

```json
{
  "name": "web",
  "dependencies": {
    "@repo/ui": "workspace:*",
    "@repo/utils": "workspace:*",
    "@repo/types": "workspace:*"
  }
}
```

`apps/web/tsconfig.json`:

```json
{
  "extends": "@repo/tsconfig/nextjs.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "references": [
    { "path": "../../packages/ui" },
    { "path": "../../packages/utils" },
    { "path": "../../packages/types" }
  ],
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

Using shared components in Next.js:

```typescript
// apps/web/src/app/page.tsx
import { Button } from "@repo/ui";
import { formatDate } from "@repo/utils";
import type { User } from "@repo/types";

export default function HomePage() {
  const user: User = {
    id: "1",
    email: "alice@example.com",
    name: "Alice",
    role: "admin",
    createdAt: new Date(),
  };

  return (
    <main className="p-8">
      <h1>Welcome, {user.name}</h1>
      <p>Joined: {formatDate(user.createdAt)}</p>
      <Button variant="primary" onClick={() => console.log("clicked")}>
        Get Started
      </Button>
    </main>
  );
}
```

---

## Step 9: Filtering and Running Tasks

Turborepo's `--filter` flag lets you target specific packages:

```bash
# Run dev for only the web app and its dependencies
turbo dev --filter=web

# Build a specific package
turbo build --filter=@repo/ui

# Run tests for all packages that changed vs main
turbo test --filter=[origin/main]

# Run for a package and all packages that depend on it
turbo build --filter=@repo/types...

# Run for a package and all its dependencies
turbo build --filter=...@repo/ui
```

---

## Step 10: Remote Caching

Local caching helps individual developers. Remote caching shares build artifacts across the team and CI.

### Using Vercel Remote Cache (Free)

```bash
# Authenticate
npx turbo login

# Link this repo to your Vercel account
npx turbo link
```

Add to `turbo.json`:

```json
{
  "remoteCache": {
    "enabled": true
  }
}
```

### GitHub Actions with Remote Cache

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2  # Needed for --filter=[HEAD^1]

      - uses: pnpm/action-setup@v3
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile

      - run: pnpm turbo build test lint
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

## Step 11: Deploying Individual Apps

### Vercel (Next.js)

In Vercel project settings:
- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && pnpm turbo build --filter=web`
- **Install Command**: `pnpm install --frozen-lockfile`

Or use `vercel.json` in `apps/web/`:

```json
{
  "buildCommand": "cd ../.. && pnpm turbo build --filter=web",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

### Fly.io (API)

`apps/api/Dockerfile`:

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm turbo

FROM base AS builder
WORKDIR /app
COPY . .
RUN turbo prune --scope=api --docker

FROM base AS installer
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

FROM installer AS runner
COPY --from=builder /app/out/full/ .
RUN pnpm turbo build --filter=api

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

The `turbo prune` command creates a minimal subset of the monorepo containing only the packages needed for `api` — perfect for Docker builds.

---

## Adding New Packages

```bash
# Create a new package
mkdir -p packages/email/src
cd packages/email

# Add package.json with workspace:* deps
cat > package.json << 'EOF'
{
  "name": "@repo/email",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "tsc --build",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/types": "workspace:*"
  },
  "devDependencies": {
    "@repo/tsconfig": "workspace:*"
  }
}
EOF

# Install from root
cd ../..
pnpm install
```

The package is immediately available to all apps via `workspace:*`.

---

## Common Pitfalls

### 1. Build Order Issues

If you get "Cannot find module '@repo/ui'" errors, the package likely wasn't built. Fix:

```bash
# Build all packages first
turbo build --filter=@repo/...

# Or ensure dependent packages list it in dependsOn
# turbo.json: "build": { "dependsOn": ["^build"] }
```

### 2. TypeScript Project References Out of Sync

After adding a new package dependency, update `tsconfig.json` references:

```json
// apps/web/tsconfig.json
"references": [
  { "path": "../../packages/ui" },
  { "path": "../../packages/utils" },
  { "path": "../../packages/types" },
  { "path": "../../packages/email" }  // <- add new package here
]
```

### 3. pnpm Hoisting Issues

If a package can't find peer dependencies, add to `.npmrc`:

```ini
public-hoist-pattern[]=*your-package*
```

Or install it as a direct dependency in the affected package.

---

## Summary

| Tool | Role |
|------|------|
| pnpm workspaces | Dependency management, symlinks, fast installs |
| Turborepo | Task runner, caching, dependency graph awareness |
| TypeScript project refs | Correct incremental builds, cross-package type checking |
| `workspace:*` protocol | Always resolves to local package, not npm registry |
| `turbo prune` | Creates minimal Docker build context |

This stack scales from 3 packages to 50 without changing your workflow. The same `pnpm turbo build` command from the root handles everything — and with remote caching, CI times drop dramatically as the repo grows.

**Target keywords:** turborepo monorepo guide, turborepo pnpm workspace, turborepo typescript setup, turborepo vs nx 2026, monorepo setup 2026
