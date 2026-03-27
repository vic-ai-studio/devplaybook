---
title: "Backstage Internal Developer Portal: Complete Setup Guide 2026"
description: "Learn how to set up Backstage IDP from scratch. Covers software catalog, TechDocs, plugins, CI/CD integration, and building a self-service developer platform your team will actually use."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["backstage", "developer-portal", "platform-engineering", "devops", "dx", "infrastructure"]
readingTime: "13 min read"
---

Backstage is Spotify's open-source developer portal, now a CNCF incubating project. It solves a real problem: as engineering organizations grow, developers spend more time finding things — documentation, services, runbooks, ownership — than building them.

A well-configured Backstage instance becomes the single pane of glass for your engineering org: every service catalogued, every doc discoverable, every workflow self-serviceable. This guide walks through setting it up properly.

---

## What Backstage Actually Is

Backstage is a React + Node.js application you host yourself. At its core it provides three things:

1. **Software Catalog** — a registry of every service, library, website, pipeline, and team in your org
2. **TechDocs** — documentation as code, sourced from repos and rendered in-portal
3. **Software Templates** — scaffolding for creating new services with pre-configured CI/CD, logging, and standards baked in

On top of that foundation, a plugin ecosystem (~200+ plugins) handles observability, incident management, cost allocation, API docs, and anything else your stack needs.

---

## Prerequisites

- Node.js 18+
- Yarn 1.x or 3.x
- PostgreSQL (for production; SQLite works for development)
- A GitHub/GitLab/Bitbucket account (for catalog entity discovery)

---

## Initial Setup

```bash
npx @backstage/create-app@latest
cd my-backstage-app
yarn dev
```

The CLI scaffolds a full Backstage app. You'll see a working portal at `http://localhost:3000` with example catalog entries.

**Directory structure:**
```
my-backstage-app/
├── app-config.yaml          # Main configuration
├── app-config.production.yaml
├── packages/
│   ├── app/                 # Frontend (React)
│   └── backend/             # Backend (Node.js)
└── plugins/                 # Custom plugins
```

---

## The Software Catalog

The catalog is the heart of Backstage. Every entity is described by a YAML file (called a "catalog-info.yaml") stored in the entity's repository.

### Entity Kinds

| Kind | What it represents |
|------|--------------------|
| `Component` | A service, library, website, or CLI tool |
| `API` | An interface exposed by a component |
| `System` | A collection of related components |
| `Domain` | A business area containing systems |
| `Resource` | Infrastructure (databases, S3 buckets, queues) |
| `Group` | A team or organizational unit |
| `User` | An individual developer |

### A Typical catalog-info.yaml

```yaml
# In your service's repository: ./catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Handles all payment processing and billing
  annotations:
    github.com/project-slug: myorg/payment-service
    backstage.io/techdocs-ref: dir:.
    pagerduty.com/service-id: P1234567
  tags:
    - payments
    - critical
    - nodejs
  links:
    - url: https://grafana.internal/d/payments
      title: Grafana Dashboard
      icon: dashboard
spec:
  type: service
  owner: group:payments-team
  lifecycle: production
  system: checkout-system
  dependsOn:
    - component:postgres-payments
    - component:stripe-api
  providesApis:
    - payment-api
```

### Configuring Catalog Discovery

Tell Backstage where to find `catalog-info.yaml` files in `app-config.yaml`:

```yaml
catalog:
  rules:
    - allow: [Component, API, System, Domain, Resource, Group, User]
  providers:
    github:
      default:
        organization: myorg
        catalogPath: /catalog-info.yaml
        filters:
          branch: main
          repository: '.*'  # All repos
        schedule:
          frequency: { minutes: 30 }
          timeout: { minutes: 3 }
```

For GitLab or Bitbucket, install the corresponding discovery plugin:

```bash
yarn --cwd packages/backend add @backstage/plugin-catalog-backend-module-gitlab
```

---

## TechDocs: Documentation as Code

TechDocs renders Markdown docs (written in MkDocs format) from your repos into Backstage. Engineers update docs in PRs alongside code — no separate wiki, no drift.

### Setup in a Service Repo

1. Add to `catalog-info.yaml`:
```yaml
metadata:
  annotations:
    backstage.io/techdocs-ref: dir:.
```

2. Create `mkdocs.yml`:
```yaml
site_name: Payment Service Docs
nav:
  - Overview: index.md
  - Architecture: architecture.md
  - API Reference: api.md
  - Runbooks:
    - Incident Response: runbooks/incidents.md
    - Deployment: runbooks/deploy.md
plugins:
  - techdocs-core
```

3. Create `docs/index.md` — your documentation

### Backstage TechDocs Configuration

For development (basic, no pre-building):
```yaml
techdocs:
  builder: 'local'
  generator:
    runIn: 'local'
  publisher:
    type: 'local'
```

For production (pre-build and store in cloud storage):
```yaml
techdocs:
  builder: 'external'
  generator:
    runIn: 'docker'
  publisher:
    type: 'googleGcs'  # or 'awsS3', 'azureBlobStorage'
    googleGcs:
      bucketName: my-techdocs-bucket
      credentials:
        $file: /path/to/service-account.json
```

Build docs in CI and publish to the bucket — Backstage serves them directly without rebuilding on every request.

---

## Software Templates: Self-Service Scaffolding

Software Templates let developers create new services with your standards pre-baked: CI/CD pipelines, logging setup, code owners, Backstage catalog registration, everything.

### A Minimal Template

```yaml
# templates/new-nodejs-service/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: nodejs-service-template
  title: Node.js Microservice
  description: Creates a production-ready Node.js service
  tags: [recommended, nodejs]
spec:
  owner: group:platform-team
  type: service

  parameters:
    - title: Service Information
      required: [name, description, owner]
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z0-9-]+$'
        description:
          title: Description
          type: string
        owner:
          title: Owner Team
          type: string
          ui:field: OwnerPicker
          ui:options:
            catalogFilter:
              kind: Group

    - title: Repository
      required: [repoUrl]
      properties:
        repoUrl:
          title: Repository Location
          type: string
          ui:field: RepoUrlPicker
          ui:options:
            allowedHosts: [github.com]

  steps:
    - id: fetch-base
      name: Fetch Base Template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}

    - id: publish
      name: Publish to GitHub
      action: publish:github
      input:
        allowedHosts: [github.com]
        description: ${{ parameters.description }}
        repoUrl: ${{ parameters.repoUrl }}
        defaultBranch: main

    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['publish'].output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml

  output:
    links:
      - title: Repository
        url: ${{ steps['publish'].output.remoteUrl }}
      - title: Open in Catalog
        entityRef: ${{ steps['register'].output.entityRef }}
```

The `skeleton/` directory contains your template files with Nunjucks variable substitution.

---

## Essential Plugins

### GitHub Actions Plugin

Shows CI/CD status for each component directly in the catalog:

```bash
yarn --cwd packages/app add @backstage/plugin-github-actions
```

```typescript
// packages/app/src/components/catalog/EntityPage.tsx
import { EntityGithubActionsContent } from '@backstage/plugin-github-actions';

const cicdContent = (
  <EntitySwitch>
    <EntitySwitch.Case if={isGithubActionsAvailable}>
      <EntityGithubActionsContent />
    </EntitySwitch.Case>
  </EntitySwitch>
);
```

### PagerDuty Plugin

```bash
yarn --cwd packages/app add @backstage/plugin-pagerduty
yarn --cwd packages/backend add @backstage/plugin-pagerduty-backend
```

Adds an on-call card and recent incidents to every service's catalog page. Requires the `pagerduty.com/service-id` annotation on your entities.

### Kubernetes Plugin

Shows pod status, resource usage, and recent deployments:

```bash
yarn --cwd packages/app add @backstage/plugin-kubernetes
yarn --cwd packages/backend add @backstage/plugin-kubernetes-backend
```

```yaml
# app-config.yaml
kubernetes:
  serviceLocatorMethod:
    type: 'multiTenant'
  clusterLocatorMethods:
    - type: 'config'
      clusters:
        - url: https://k8s.internal
          name: production
          authProvider: 'serviceAccount'
          serviceAccountToken: ${K8S_TOKEN}
          caData: ${K8S_CA}
```

### Cost Insights Plugin

Integrates with AWS Cost Explorer, GCP Billing, or other cost backends to surface cloud spend per team/service.

---

## Production Deployment

### Database: PostgreSQL

```yaml
# app-config.production.yaml
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: 5432
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
      database: backstage
      ssl:
        rejectUnauthorized: true
```

### Authentication

Backstage supports OAuth via GitHub, Google, Okta, Azure AD, and others. For GitHub:

```yaml
auth:
  environment: production
  providers:
    github:
      production:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
        signIn:
          resolvers:
            - resolver: usernameMatchingUserEntityName
```

### Docker Deployment

```dockerfile
FROM node:18-bookworm-slim

WORKDIR /app

COPY --chown=node:node yarn.lock package.json packages/backend/dist/bundle.tar.gz ./
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

RUN yarn install --frozen-lockfile --production --network-timeout 300000

ENV NODE_ENV production
EXPOSE 7007

CMD ["node", "packages/backend", "--config", "app-config.yaml", "--config", "app-config.production.yaml"]
```

---

## Scaling Backstage Adoption

The technical setup is the easy part. Getting engineers to actually use it requires:

**For catalog adoption:**
- Make `catalog-info.yaml` required in new service templates
- Run a cataloging sprint — assign each team to add their services
- Gate deployments on catalog registration (enforce via CI)

**For TechDocs adoption:**
- Pre-populate docs stubs in your service template skeleton
- Make TechDocs the canonical source, deprecate other wikis
- Reward teams with complete, up-to-date docs (engineering metrics)

**For template adoption:**
- Start with templates for your most common service types
- Show the time savings: new service from scratch vs. template
- Track template usage in Backstage's own metrics

---

## Key Takeaways

- Backstage's value compounds with adoption — 10 services catalogued is a demo, 200 services is a platform
- Start with the software catalog and TechDocs; add plugins as needs arise
- Software Templates drive ROI fastest — self-service reduces platform team toil
- Treat `catalog-info.yaml` files like code: PR review, CI validation, ownership
- Self-hosting means you control the data; the tradeoff is operational overhead

Backstage is not a quick install — it's an investment in platform engineering. The payoff is an org where finding and understanding any service takes seconds, not Slack threads.
