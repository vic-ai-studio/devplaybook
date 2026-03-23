---
title: "GitHub Actions Complete Guide: Build Your First CI/CD Pipeline in 2026"
description: "Learn GitHub Actions from scratch. Set up automated testing, linting, Docker builds, and deployments with real workflow examples. No prior CI/CD experience needed."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["github-actions", "ci-cd", "devops", "automation", "github"]
readingTime: "12 min read"
---

Every professional software team automates the boring parts: running tests on every pull request, building Docker images, deploying to production. **GitHub Actions** is how most teams do it — built directly into GitHub, free for public repos, and powerful enough for enterprise pipelines.

This guide teaches you GitHub Actions from zero. By the end, you will have a working CI/CD pipeline that runs tests, checks code quality, and deploys your app automatically.

---

## What Is GitHub Actions?

GitHub Actions is a **workflow automation platform** built into GitHub. You describe what you want to happen (run tests, build Docker images, deploy to cloud) in YAML files, and GitHub runs those steps on managed servers when you push code or open a pull request.

Key concepts:

| Term | Meaning |
|------|---------|
| **Workflow** | A YAML file defining automation (`/.github/workflows/ci.yml`) |
| **Event** | What triggers the workflow (push, pull_request, schedule) |
| **Job** | A group of steps that run on the same machine |
| **Step** | A single command or action within a job |
| **Runner** | The virtual machine that runs your job (Ubuntu, Windows, macOS) |
| **Action** | A reusable building block (e.g., `actions/checkout@v4`) |

---

## Your First Workflow File

Create `.github/workflows/ci.yml` in your repo:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run linter
        run: npm run lint
```

This workflow:
1. Triggers on every push to `main` or `develop`, and on pull requests targeting `main`
2. Checks out your code
3. Installs Node.js 20 with npm caching (speeds up subsequent runs)
4. Installs dependencies with `npm ci` (faster than `npm install`, uses lockfile exactly)
5. Runs your test suite
6. Runs your linter

Push this file to your repo and open the **Actions** tab — you will see your first workflow run.

---

## Common Workflow Patterns

### Node.js / TypeScript CI

```yaml
name: Node CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - run: npm ci
      - run: npm run build --if-present
      - run: npm test
```

The `matrix` strategy runs your tests across multiple Node.js versions in parallel — essential for library authors.

---

### Python CI

```yaml
name: Python CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ["3.11", "3.12"]

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests with coverage
        run: pytest --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
```

---

### Docker Build and Push

```yaml
name: Docker

on:
  push:
    branches: [main]
    tags: ["v*.*.*"]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha,prefix=sha-

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

This workflow:
- Builds your Docker image on pushes to `main`
- Uses GitHub's built-in Container Registry (free storage for public repos)
- Automatically tags images with branch name, semver version, and commit SHA
- Uses GitHub Actions cache to speed up Docker layer builds

---

## Secrets and Environment Variables

Never hardcode API keys in workflow files. Use **GitHub Secrets**:

1. Go to your repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add your secret (e.g., `DEPLOY_API_KEY`)

Reference it in your workflow:

```yaml
steps:
  - name: Deploy to production
    env:
      API_KEY: ${{ secrets.DEPLOY_API_KEY }}
      NODE_ENV: production
    run: |
      curl -X POST https://your-api.com/deploy \
        -H "Authorization: Bearer $API_KEY"
```

### Built-in Variables

GitHub provides useful context variables automatically:

| Variable | Value |
|----------|-------|
| `github.sha` | Full commit SHA |
| `github.ref` | Branch or tag ref (`refs/heads/main`) |
| `github.actor` | Username who triggered the workflow |
| `github.repository` | `owner/repo` |
| `github.run_number` | Sequential run number |
| `github.event_name` | `push`, `pull_request`, etc. |

---

## Caching Dependencies

Cache expensive operations to speed up workflows:

```yaml
- name: Cache node_modules
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- run: npm ci
```

Or use the built-in cache in `setup-node`:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"   # automatically caches ~/.npm
```

**Cache hit rates matter.** The `hashFiles()` function creates a key from your lockfile — so the cache invalidates whenever dependencies change, but reuses the same cache across multiple runs with identical dependencies.

---

## Conditional Steps and Jobs

Run steps only under certain conditions:

```yaml
# Only run on main branch
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh

# Skip on draft PRs
- name: Run integration tests
  if: github.event.pull_request.draft == false
  run: npm run test:integration

# Run only if previous step failed
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
```

---

## Deployment Examples

### Deploy to Cloudflare Pages

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CF_API_TOKEN }}
    accountId: ${{ secrets.CF_ACCOUNT_ID }}
    projectName: my-project
    directory: dist
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Deploy to Vercel

```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.ORG_ID }}
    vercel-project-id: ${{ secrets.PROJECT_ID }}
    vercel-args: "--prod"
```

### Deploy to AWS S3

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1

- name: Deploy static site to S3
  run: aws s3 sync ./dist s3://my-bucket --delete

- name: Invalidate CloudFront
  run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
```

---

## Complete Full-Stack Pipeline

Here is a production-ready pipeline that covers the full CI/CD lifecycle:

```yaml
name: Full CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ─── Stage 1: Quality Gates ───────────────────────────────────
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run type-check   # TypeScript check
      - run: npm run lint          # ESLint
      - run: npm run format:check  # Prettier

  # ─── Stage 2: Tests ───────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: quality  # Only runs if quality passes
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage report
        uses: codecov/codecov-action@v4

  # ─── Stage 3: Build ───────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test  # Only runs if tests pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1

  # ─── Stage 4: Deploy (main branch only) ───────────────────────
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://your-site.com
    steps:
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: Deploy
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          echo "Deploying to production..."
          # your deploy command here
```

This pipeline:
- Runs **quality checks** first (fastest, cheapest to fail early)
- Runs **tests** only if quality passes (no wasted minutes)
- **Builds** only if tests pass
- **Deploys** only on `main` branch pushes, not PRs
- Uses **environments** for deployment protection rules (require manual approval)

---

## Scheduled Workflows (Cron Jobs)

Run workflows on a schedule:

```yaml
on:
  schedule:
    - cron: "0 9 * * 1"  # Every Monday at 9 AM UTC
```

Use [DevPlaybook's Cron Generator](https://devplaybook.cc/tools/cron-generator) to build cron expressions without memorizing the syntax.

Common schedules:

| Schedule | Cron |
|----------|------|
| Every day at midnight | `0 0 * * *` |
| Every Monday 9 AM | `0 9 * * 1` |
| Every 6 hours | `0 */6 * * *` |
| First day of month | `0 0 1 * *` |

---

## Debugging Failed Workflows

When a workflow fails:

1. **Read the red X** — click the failed step to see the full output
2. **Check exit codes** — non-zero = failure. `echo $?` after commands helps
3. **Add debug logging** — set the `ACTIONS_STEP_DEBUG` secret to `true` for verbose runner output
4. **Run locally** — use [act](https://github.com/nektos/act) to run GitHub Actions locally:
   ```bash
   brew install act
   act push  # simulates a push event locally
   ```

---

## GitHub Actions vs Alternatives

| Feature | GitHub Actions | GitLab CI | CircleCI | Jenkins |
|---------|---------------|-----------|----------|---------|
| Free minutes (public) | Unlimited | Unlimited | Free tier | Self-hosted |
| Free minutes (private) | 2,000/month | 400/month | 6,000/month | Self-hosted |
| Setup complexity | Low | Low | Medium | High |
| GitHub integration | Native | Plugin | Plugin | Plugin |
| Self-hosted runners | Yes | Yes | Yes | Native |

For most teams using GitHub, Actions is the default choice. The native integration (no tokens needed for repo access, automatic PR status checks) is a significant DX advantage.

---

## Key Takeaways

- Create workflows in `.github/workflows/*.yml`
- Use `on:` to define triggers (push, pull_request, schedule)
- Chain jobs with `needs:` to create pipeline stages
- Store secrets in GitHub Settings, never in code
- Cache dependencies with `actions/cache@v4` or via `setup-*` actions
- Use `if: github.ref == 'refs/heads/main'` to gate deployments to specific branches
- Run locally with `act` to debug without burning CI minutes

---

## Related Tools on DevPlaybook

- [Cron Expression Generator](https://devplaybook.cc/tools/cron-generator) — build `schedule:` cron values visually
- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — validate workflow output
- [Git Command Generator](https://devplaybook.cc/tools/git-command-generator) — generate git commands for your scripts
- [Regex Tester](https://devplaybook.cc/tools/regex-tester) — test patterns used in `if:` conditions
