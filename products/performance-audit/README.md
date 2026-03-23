# Frontend Performance Audit Checklist — $12 Digital Product

## What You Get

A battle-tested performance audit toolkit used by senior frontend engineers to systematically identify and fix performance bottlenecks. This is not a blog post repackaged as a product — it is a working system with checklists, scripts, and templates you can drop into any project today.

### Included

| File | Purpose |
|------|---------|
| `checklist-core-web-vitals.md` | LCP, INP, CLS optimization — 40+ specific actions |
| `checklist-images.md` | Image optimization — formats, lazy loading, srcset, CDN |
| `checklist-javascript.md` | JS performance — code splitting, tree shaking, Web Workers |
| `checklist-css.md` | CSS performance — critical CSS, purging, containment |
| `checklist-network.md` | Network optimization — caching, compression, preload, HTTP/2 |
| `checklist-server.md` | Server-side — SSR, edge functions, database, API response |
| `scripts/lighthouse-ci.yml` | GitHub Actions workflow for automated Lighthouse CI |
| `scripts/performance-budget.json` | Performance budget configuration (Lighthouse CI format) |
| `scripts/measure-cwv.js` | Drop-in script to measure Core Web Vitals in production |
| `scripts/analyze-bundle.sh` | Bundle size analysis + historical tracking script |
| `templates/audit-report.md` | Professional audit report template |
| `templates/before-after.md` | Before/after comparison template with metrics |

### Total: 6 checklists, 4 scripts, 2 templates

---

## How to Use This Toolkit

### For a Full Audit (Recommended First Time)

1. **Baseline** — Run `scripts/measure-cwv.js` on your production site and fill in `templates/audit-report.md` with current numbers
2. **Checklists** — Work through each checklist in this order:
   - Core Web Vitals (highest impact)
   - Images (usually the biggest quick win)
   - JavaScript (largest payload source)
   - CSS (rendering bottleneck)
   - Network (infrastructure layer)
   - Server (backend bottleneck)
3. **Fix** — Address Critical and High items first. Each item has expected impact noted.
4. **Measure** — Re-run measurements, fill in `templates/before-after.md`
5. **Automate** — Set up `scripts/lighthouse-ci.yml` to prevent regressions

### For Ongoing Monitoring

1. Add `scripts/lighthouse-ci.yml` to your CI pipeline
2. Configure `scripts/performance-budget.json` with your target thresholds
3. Run the audit quarterly using the checklists

### Priority System

Each checklist item is tagged:

- **[CRITICAL]** — Directly causes poor Core Web Vitals scores. Fix immediately.
- **[HIGH]** — Significant impact on load time or user experience. Fix this sprint.
- **[MEDIUM]** — Measurable improvement. Schedule for next sprint.
- **[LOW]** — Minor optimization. Address when convenient.

---

## Who This Is For

- Frontend developers optimizing existing apps
- Tech leads preparing for performance reviews
- Freelancers auditing client sites
- Teams setting up performance monitoring in CI

## Tech Stack Coverage

These checklists are framework-agnostic but include specific guidance for:
- React / Next.js
- Vue / Nuxt
- Vanilla JS / static sites
- WordPress (where applicable)

## Requirements

- Node.js 18+ (for scripts)
- GitHub Actions (for CI workflow, adaptable to other CI)
- A modern browser (for CWV measurement)

---

## License

Personal and commercial use permitted. Do not redistribute or resell.

## Support

File issues at the DevPlaybook GitHub repository or email support.
