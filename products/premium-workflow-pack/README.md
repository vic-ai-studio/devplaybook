# DevPlaybook Premium Workflow Pack

**Everything you need to ship production-grade software.** 10 CI/CD workflows, 5 architecture guides, a code review checklist, PR process guide, and 5 deployment scripts — all copy-paste ready.

---

## What's Included

### 🔄 CI/CD Workflows (GitHub Actions)

| File | What it does |
|------|-------------|
| `01-monorepo-ci.yml` | Affected-only CI for Nx/Turborepo monorepos |
| `02-blue-green-deploy.yml` | Zero-downtime blue-green deployment |
| `03-canary-release.yml` | Gradual rollout: 5% → 25% → 100% |
| `04-database-migration.yml` | Safe DB migrations with backup + dry-run |
| `05-e2e-playwright.yml` | Sharded Playwright E2E tests (parallel) |
| `06-dependency-updates.yml` | Weekly automated dependency update PRs |
| `07-container-security-scan.yml` | Trivy + Grype + gitleaks security scanning |
| `08-performance-lighthouse.yml` | Lighthouse CI with score thresholds |
| `09-automated-rollback.yml` | Event-triggered rollback with health verify |
| `10-release-management.yml` | Conventional commits → auto-version → GitHub Release |

### 🏗️ Architecture Guides

| File | What it covers |
|------|---------------|
| `01-microservices.md` | Service decomposition, communication patterns, observability |
| `02-monorepo-structure.md` | Turborepo/Nx setup, versioning, affected CI |
| `03-serverless-architecture.md` | Cold starts, DB patterns, IaC templates |
| `04-event-driven.md` | Event design, queues, saga pattern, DLQ |
| `05-api-gateway-pattern.md` | Auth, rate limiting, routing, BFF aggregation |

### ✅ Checklists & Process

| File | What it covers |
|------|---------------|
| `code-review-checklist.md` | Security, performance, design, testing, readability |
| `pr-workflow-guide.md` | Branch naming, conventional commits, PR template, merge strategy |

### 🛠️ Deployment Scripts (Bash)

| File | What it does |
|------|-------------|
| `deploy.sh` | Full deploy: build → push → deploy → health check → notify |
| `rollback.sh` | Revert to previous version with confirmation |
| `db-migrate.sh` | Database migration with backup + dry-run mode |
| `health-check.sh` | Multi-service health check with watch mode |
| `setup-env.sh` | Bootstrap local dev environment (idempotent) |

---

## Quick Start

### Using a Workflow

1. Copy the `.yml` file to `.github/workflows/` in your repo
2. Read the `# CUSTOMIZE:` comments — they tell you exactly what to change
3. Set required secrets in **Settings → Secrets → Actions**
4. Push to trigger

### Using an Architecture Guide

Open any `.md` file in `architecture/`. Each guide includes:
- Diagrams (ASCII)
- Code samples (TypeScript/Python/Shell)
- Technology comparisons
- Checklists

### Using the Scripts

```bash
# Make executable
chmod +x scripts/*.sh

# Deploy to staging
./scripts/deploy.sh staging

# Dry-run production deploy
APP_VERSION=v1.2.0 ./scripts/deploy.sh production --dry-run

# Check all services
./scripts/health-check.sh production

# Set up local dev environment
./scripts/setup-env.sh
```

---

## License

MIT — use, fork, and modify freely. No attribution required.

---

## Support

Questions? Issues? Open an issue at [devplaybook.cc](https://devplaybook.cc) or email support@devplaybook.cc
