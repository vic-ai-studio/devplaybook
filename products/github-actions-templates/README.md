# GitHub Actions CI/CD Templates Pack

**12 production-ready workflow templates** — copy, customize, ship.

---

## What's Included

| File | Description |
|------|-------------|
| `01-node-ci.yml` | Node.js CI with matrix testing (18/20/22) + npm caching |
| `02-python-ci.yml` | Python CI with pytest + coverage + codecov |
| `03-docker-build-push.yml` | Docker build + push to GHCR with layer caching |
| `04-multi-env-deploy.yml` | dev → staging → production with manual approval gate |
| `05-cloudflare-pages.yml` | Deploy to Cloudflare Pages on push to main |
| `06-vercel-deploy.yml` | Deploy to Vercel (preview on PR, production on main) |
| `07-aws-s3-deploy.yml` | Build → S3 sync → CloudFront invalidation |
| `08-security-scan.yml` | SAST + dependency audit + secret detection |
| `09-auto-changelog.yml` | Generate CHANGELOG.md + create GitHub Release on tag |
| `10-astro-cloudflare.yml` | Astro build + Wrangler deploy to Cloudflare Pages |
| `11-go-ci.yml` | Go CI with go test, go vet, golangci-lint |
| `12-composite-actions.yml` | Reusable composite action: setup-node-cached |

---

## Quick Start

1. Copy the template you need to `.github/workflows/`
2. Read the `# CUSTOMIZE:` comments at the top of each file
3. Set the required secrets in your repo (Settings → Secrets → Actions)
4. Push and watch the Actions tab

---

## Required Secrets Reference

| Template | Required Secrets |
|----------|-----------------|
| `03-docker-build-push.yml` | `GITHUB_TOKEN` (auto-provided) |
| `05-cloudflare-pages.yml` | `CF_API_TOKEN`, `CF_ACCOUNT_ID` |
| `06-vercel-deploy.yml` | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| `07-aws-s3-deploy.yml` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `CF_DIST_ID` |
| `08-security-scan.yml` | None (uses built-in tools) |

---

## License

MIT — use, fork, modify, redistribute freely. No attribution required.
