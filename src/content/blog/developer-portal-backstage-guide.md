---
title: "Building a Developer Portal with Backstage: Complete 2026 Guide"
description: "Set up Spotify's Backstage to build your Internal Developer Platform: software catalog, TechDocs, scaffolder templates, plugin ecosystem, and integrations with GitHub, Kubernetes, and PagerDuty."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["backstage", "developer portal", "internal docs", "service catalog", "internal developer platform", "platform engineering"]
readingTime: "10 min read"
---

**Backstage** is the open-source developer portal framework built by Spotify and donated to the CNCF. In 2026, it's become the foundation for Internal Developer Platforms at thousands of companies — from startups to enterprises. With the right configuration, Backstage reduces the time to onboard new engineers, eliminates the "where does this service live?" question, and gives every team a single pane of glass for their software portfolio.

This guide covers standing up a Backstage instance, populating the software catalog, writing TechDocs, creating Scaffolder templates, and integrating the essential plugins.

---

## What Backstage Provides

Backstage is organized into three core features:

| Feature | What It Does |
|---|---|
| **Software Catalog** | Register and discover all services, libraries, APIs, pipelines, and teams |
| **TechDocs** | Markdown documentation generated from source repos, searchable across all services |
| **Scaffolder** | Template-based service creation — deploy a new microservice with one click |

And an extensive **plugin ecosystem** (~200+ plugins) for integrations with GitHub, Kubernetes, PagerDuty, Datadog, ArgoCD, Vault, and more.

---

## Standing Up Backstage

### Prerequisites

- Node.js 20+
- Yarn 4+
- PostgreSQL (production) or SQLite (dev)

### Create a New Backstage App

```bash
# Create a new Backstage app
npx @backstage/create-app@latest

# Scaffolder asks for:
# - App name (e.g., "my-company-portal")
# Output: full Backstage app in ./my-company-portal/

cd my-company-portal
yarn dev  # Starts at http://localhost:3000
```

### Docker Deployment (Production)

```bash
# Build Docker image
yarn build:backend --config app-config.yaml

# Or use the multi-stage Dockerfile included
docker build . -f packages/backend/Dockerfile \
  --tag backstage:latest

docker run -p 7007:7007 \
  -e POSTGRES_HOST=your-db-host \
  -e POSTGRES_PORT=5432 \
  -e POSTGRES_USER=backstage \
  -e POSTGRES_PASSWORD=secret \
  backstage:latest
```

---

## Configuring `app-config.yaml`

The core configuration file controls integrations, authentication, and catalog sources:

```yaml
app:
  title: My Company Dev Portal
  baseUrl: https://backstage.company.com

backend:
  baseUrl: https://backstage.company.com
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}

auth:
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

catalog:
  rules:
    - allow: [Component, System, API, Resource, Location, User, Group]
  locations:
    # Auto-discover catalog-info.yaml files across all repos
    - type: github-discovery
      target: https://github.com/your-org
      rules:
        - allow: [Component, API, System]

techdocs:
  builder: 'local'       # or 'external' for production
  generator:
    runIn: 'local'
  publisher:
    type: 'awsS3'
    awsS3:
      bucketName: your-techdocs-bucket
      region: us-east-1
```

---

## Registering Services in the Software Catalog

Every service, library, or API gets a `catalog-info.yaml` file in its repo root:

```yaml
# catalog-info.yaml — in your service's GitHub repo
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Handles payment processing and Stripe integration
  tags:
    - nodejs
    - payments
    - critical
  annotations:
    github.com/project-slug: your-org/payment-service
    backstage.io/techdocs-ref: dir:.  # TechDocs source location
    pagerduty.com/service-id: P1234567
    argocd/app-name: payment-service-prod
    datadoghq.com/service-name: payment-service
spec:
  type: service
  lifecycle: production          # production | experimental | deprecated
  owner: group:payments-team
  system: checkout
  dependsOn:
    - component:stripe-adapter
    - resource:payments-database
  providesApis:
    - payment-api
```

**Automatic discovery**: With `github-discovery`, Backstage scans all repos in your org for `catalog-info.yaml` files. New services appear in the catalog automatically when the file is committed.

---

## TechDocs: Documentation as Code

TechDocs generates searchable documentation from Markdown files in each repository.

### Setup in a Service Repo

```
payment-service/
├── catalog-info.yaml
├── docs/
│   ├── index.md         # Landing page
│   ├── api-reference.md
│   ├── runbook.md
│   └── architecture.md
└── mkdocs.yml

# mkdocs.yml
site_name: Payment Service
docs_dir: docs
plugins:
  - techdocs-core
nav:
  - Home: index.md
  - API Reference: api-reference.md
  - Runbook: runbook.md
  - Architecture: architecture.md
```

TechDocs renders these Markdown files into a searchable documentation site within Backstage. Engineers can search across all service docs from a single interface.

---

## Scaffolder: Golden Path Templates

The Scaffolder allows developers to create new services from templates without understanding the underlying infrastructure:

```yaml
# template.yaml — in your templates repo
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: nodejs-microservice
  title: Node.js Microservice
  description: Creates a production-ready Node.js API service
  tags: [nodejs, recommended]
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Service Details
      required: [name, description, owner]
      properties:
        name:
          title: Service Name
          type: string
          pattern: '^[a-z][a-z0-9-]+$'
          description: Kebab-case service name (e.g., payment-processor)
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

  steps:
    - id: fetch-template
      name: Fetch Template
      action: fetch:template
      input:
        url: ./skeleton  # template files directory
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
        repoUrl: github.com?owner=your-org&repo=${{ parameters.name }}

    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps.publish.output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml
```

The template scaffolds a full repository with Dockerfile, CI pipeline, Kubernetes manifests, and catalog-info.yaml — all in a few clicks.

---

## Essential Plugin Integrations

### Kubernetes Plugin

Shows running pods, deployments, and health status for each service directly in the catalog:

```bash
yarn --cwd packages/backend add @backstage/plugin-kubernetes-backend
yarn --cwd packages/app add @backstage/plugin-kubernetes
```

```yaml
# app-config.yaml
kubernetes:
  serviceLocatorMethod:
    type: multiTenant
  clusterLocatorMethods:
    - type: config
      clusters:
        - url: https://k8s.example.com
          name: production
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_PROD_TOKEN}
```

### PagerDuty Plugin

Shows on-call schedule and recent incidents directly on the service page:

```bash
yarn --cwd packages/app add @pagerduty/backstage-plugin
```

Add `pagerduty.com/service-id: P1234567` to the service's `catalog-info.yaml` annotations.

### ArgoCD Plugin

Shows deployment status and history for each service:

```bash
yarn --cwd packages/backend add @roadiehq/backstage-plugin-argo-cd-backend
```

---

## Search Configuration

Enable full-text search across the catalog, TechDocs, and all registered entities:

```bash
yarn --cwd packages/backend add @backstage/plugin-search-backend-module-pg
```

With PostgreSQL search, engineers can find any service, API, team, or documentation page with a single search.

---

## Team and Group Management

Backstage supports team hierarchy through `Group` and `User` entities:

```yaml
# groups/payments-team.yaml
apiVersion: backstage.io/v1alpha1
kind: Group
metadata:
  name: payments-team
spec:
  type: team
  parent: engineering
  children: []
  members:
    - user:alice
    - user:bob
```

Sync groups automatically from your identity provider (GitHub Teams, Okta, Google Workspace) using the relevant Backstage provider plugin.

---

## Measuring Portal Adoption

A developer portal that nobody uses fails silently. Track:

- **Catalog completeness**: % of services with `catalog-info.yaml` registered
- **TechDocs coverage**: % of services with documentation
- **Scaffolder usage**: new services created via templates vs. created manually
- **Search queries**: what are engineers searching for? (reveals missing content)
- **Portal DAU/MAU**: unique engineers using the portal weekly

Backstage has a built-in analytics API. Integrate with your analytics backend to track these metrics over time.

---

## 2026 Backstage Trends

**AI-powered catalog enrichment**: LLM plugins that automatically generate descriptions, tags, and documentation stubs by analyzing source code.

**Backstage Cloud (Roadie)**: Managed Backstage hosting with pre-configured plugins, reducing operational overhead for teams that don't want to self-host.

**RBAC V2**: Backstage 1.26+ ships substantially improved role-based access control, making multi-team portals more practical.

**IDP-as-Code**: Defining Backstage catalog, templates, and plugins entirely as code in a GitOps workflow.

---

Building a developer portal pays dividends in proportion to how well it reflects reality. Keep the catalog accurate, templates current, and documentation alive — and Backstage becomes the first place engineers look for anything, rather than asking a Slack channel.
