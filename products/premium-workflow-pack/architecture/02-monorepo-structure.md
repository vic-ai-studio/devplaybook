# Monorepo Structure Design Guide

## When to Use a Monorepo

✅ Use when:
- Multiple apps share significant code (components, types, utils)
- Cross-team changes happen frequently (API + client must update together)
- You want unified tooling and CI

❌ Avoid when:
- Teams have completely separate tech stacks
- Different deployment cadences are essential
- Repo would grow to 100k+ files (use a federated approach instead)

---

## Recommended Structure

### Tool-Agnostic Layout

```
my-monorepo/
├── apps/
│   ├── web/               # Next.js frontend
│   ├── api/               # Node.js backend
│   ├── mobile/            # React Native
│   └── admin/             # Internal dashboard
├── packages/
│   ├── ui/                # Shared React component library
│   ├── types/             # Shared TypeScript types
│   ├── config/            # ESLint, TS, Tailwind configs
│   ├── utils/             # Pure utility functions
│   └── db/                # Prisma schema + client
├── tools/
│   ├── scripts/           # Repo management scripts
│   └── generators/        # Scaffolding templates
├── .github/
│   └── workflows/
│       ├── ci.yml         # Affected-only CI
│       └── release.yml    # Per-package versioning
├── package.json           # Root workspace config
├── turbo.json             # or nx.json
└── pnpm-workspace.yaml    # or npm workspaces
```

---

## Tool Selection

| Tool | Best for | Weakness |
|------|----------|----------|
| **Turborepo** | Simple pipelines, Vercel deployments | Less powerful task graph |
| **Nx** | Complex task orchestration, plugin ecosystem | Steeper learning curve |
| **pnpm workspaces** | Minimal setup, any build tool | Manual affected detection |
| **Bazel** | Google-scale (1M+ files) | Very high setup cost |

**Recommendation for most teams:** Turborepo + pnpm workspaces.

---

## turbo.json Reference

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

---

## Package Versioning Strategies

### 1. Fixed Versioning (Lerna default)
All packages share the same version number. Simple, good for tightly coupled packages.
```
@my-org/ui@1.2.0, @my-org/utils@1.2.0, @my-org/types@1.2.0
```

### 2. Independent Versioning
Each package versions independently. More flexible, requires more coordination.
```
@my-org/ui@2.1.0, @my-org/utils@1.5.3, @my-org/types@3.0.1
```

### 3. Internal packages (no versioning)
For packages only used within the monorepo, use `"version": "0.0.0"` and reference via workspace protocol:
```json
{ "dependencies": { "@my-org/ui": "workspace:*" } }
```

---

## CI: Affected-Only Builds

```yaml
# With Turborepo
- name: Build affected
  run: npx turbo run build --filter="...[HEAD^1]"

# With Nx
- name: Test affected
  run: npx nx affected -t test --base=origin/main
```

**Pipeline caching (GitHub Actions):**
```yaml
- name: Cache Turbo
  uses: actions/cache@v4
  with:
    path: .turbo
    key: ${{ runner.os }}-turbo-${{ github.sha }}
    restore-keys: ${{ runner.os }}-turbo-
```

---

## Internal Package Setup (TypeScript)

```json
// packages/utils/package.json
{
  "name": "@my-org/utils",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```json
// apps/web/tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@my-org/utils": ["../../packages/utils/src/index.ts"]
    }
  }
}
```

This avoids build steps for internal packages during development.

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| `node_modules` hoisting conflicts | Use `pnpm` strict mode or per-package hoisting overrides |
| Circular dependencies | `madge --circular` in pre-commit hook |
| Slow CI (builds everything) | Implement affected detection from day 1 |
| Version drift in configs | Shared `packages/config` with strict re-exports |
| Git history pollution | Use `--squash` PRs or conventional commits |
