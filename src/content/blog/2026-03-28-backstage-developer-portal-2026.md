---
title: "Backstage Developer Portal 2026: Internal Platforms That Scale"
description: "Backstage by Spotify is the gold standard for internal developer portals. Learn how to set up Backstage, configure the software catalog, add TechDocs, and build plugins to scale developer productivity."
date: "2026-03-28"
tags: [backstage, platform-engineering, developer-portal, devops, kubernetes]
readingTime: "10 min read"
author: "DevPlaybook Team"
---

# Backstage Developer Portal 2026: Internal Platforms That Scale

Every engineering organization above a certain size faces the same problem: developers waste hours figuring out where things live. Which microservice handles auth? Where are the runbooks? Who owns the payments API? How do I provision a new database?

Backstage, created by Spotify and now a CNCF graduated project, solves this with a unified developer portal. A software catalog, documentation hub, scaffolding tool, and plugin platform in one place. As of 2026, Backstage powers internal platforms at thousands of companies including Spotify, Expedia, American Airlines, and Netflix.

This guide covers setting up Backstage, configuring the software catalog, deploying TechDocs, and building custom plugins.

## What Backstage Actually Is

Backstage is a framework for building developer portals, not a SaaS product. You deploy and maintain your own instance, which gives you full control over customization but means infrastructure responsibility.

The core components:

**Software Catalog**: A centralized inventory of all your services, APIs, libraries, resources, websites, and teams. Every entity in your organization lives here with ownership, documentation, and status information.

**TechDocs**: Docs-as-code documentation system. Engineers write docs in Markdown alongside their code; Backstage renders them in a unified documentation hub.

**Software Templates (Scaffolder)**: Golden path templates for creating new services, libraries, and resources. Developers get a UI to select a template, fill in parameters, and Backstage creates the repository, CI pipeline, monitoring, and registers the service in the catalog automatically.

**Search**: Full-text search across the catalog, docs, and any data source you integrate.

**Plugins**: Extensible plugin architecture for integrating third-party tools — GitHub Actions, PagerDuty, Datadog, ArgoCD, Kubernetes, Snyk, and hundreds more.

## Setup and Installation

Backstage requires Node.js 18+ and Yarn. Create a new app:

```bash
npx @backstage/create-app@latest
cd backstage
yarn dev
```

This creates a complete Backstage instance with the software catalog, TechDocs, and scaffolder enabled.

Project structure:

```
backstage/
├── app-config.yaml          # Main configuration
├── app-config.local.yaml    # Local overrides (gitignored)
├── packages/
│   ├── app/                 # Frontend React app
│   └── backend/             # Node.js backend
└── plugins/                 # Custom plugins
```

The key configuration file is `app-config.yaml`:

```yaml
app:
  title: ACME Developer Portal
  baseUrl: https://backstage.acme.internal

organization:
  name: ACME Corp

backend:
  baseUrl: https://backstage.acme.internal
  listen:
    port: 7007

catalog:
  rules:
    - allow: [Component, API, Resource, System, Domain, Location]
  locations:
    - type: file
      target: ../../examples/entities.yaml

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

techdocs:
  builder: 'local'
  generator:
    runIn: 'local'
  publisher:
    type: 'local'

auth:
  providers:
    github:
      development:
        clientId: ${AUTH_GITHUB_CLIENT_ID}
        clientSecret: ${AUTH_GITHUB_CLIENT_SECRET}
```

## The Software Catalog

The catalog is Backstage's core value proposition. Every entity is defined in a YAML file colocated with the code it describes.

A service entity (`catalog-info.yaml` in your repo root):

```yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payments-api
  title: Payments API
  description: Handles payment processing for all product lines
  annotations:
    github.com/project-slug: acme/payments-api
    backstage.io/techdocs-ref: dir:.
    pagerduty.com/service-id: P123456
    backstage.io/kubernetes-id: payments-api
  tags:
    - payments
    - critical
    - typescript
  links:
    - url: https://payments.acme.internal
      title: Production
    - url: https://grafana.acme.internal/d/payments
      title: Grafana Dashboard
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: commerce
  dependsOn:
    - component:postgres-payments
    - component:stripe-integration
  providesApis:
    - payments-api-v2
```

Register this in Backstage via auto-discovery. Point Backstage at your GitHub organization and it scans every repo for `catalog-info.yaml` files:

```yaml
# app-config.yaml
catalog:
  providers:
    github:
      myOrg:
        organization: 'acme-corp'
        catalogPath: '/catalog-info.yaml'
        filters:
          branch: 'main'
          repository: '.*'  # All repos
        schedule:
          frequency:
            minutes: 60
          timeout:
            minutes: 3
```

### Entity Relationships

The catalog models your entire software ecosystem:

```yaml
# System: groups related components
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: commerce
  description: Commerce platform
spec:
  owner: commerce-team
  domain: product

# API: describes an interface
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: payments-api-v2
  description: Payments API v2 spec
  annotations:
    backstage.io/techdocs-ref: dir:.
spec:
  type: openapi
  lifecycle: production
  owner: payments-team
  system: commerce
  definition:
    $text: ./openapi.yaml

# Resource: infrastructure components
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: postgres-payments
  description: Payments PostgreSQL database
spec:
  type: database
  owner: payments-team
  system: commerce
```

## TechDocs

TechDocs gives every service a documentation home that developers actually update (because it lives in the code repo).

Setup in your service repo:

```
payments-api/
├── catalog-info.yaml
├── docs/
│   ├── index.md
│   ├── architecture.md
│   ├── runbooks/
│   │   ├── incident-response.md
│   │   └── database-migration.md
│   └── api/
│       └── endpoints.md
└── mkdocs.yml
```

`mkdocs.yml`:

```yaml
site_name: Payments API
site_description: Documentation for the Payments API service
docs_dir: docs

nav:
  - Home: index.md
  - Architecture: architecture.md
  - Runbooks:
    - Incident Response: runbooks/incident-response.md
    - Database Migration: runbooks/database-migration.md
  - API: api/endpoints.md

plugins:
  - techdocs-core
```

For production TechDocs, use an object storage backend (S3, GCS) so docs are pre-built and served statically:

```yaml
# app-config.yaml
techdocs:
  builder: 'external'  # Built in CI, not on-demand
  publisher:
    type: 'awsS3'
    awsS3:
      bucketName: ${TECHDOCS_S3_BUCKET}
      region: us-east-1
      credentials:
        roleArn: ${TECHDOCS_ROLE_ARN}
```

## Software Templates (Golden Paths)

Templates are the killer feature for reducing inconsistency across your engineering organization. Instead of every team reinventing service setup, they use a template that encodes your best practices.

Template definition:

```yaml
# template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: typescript-microservice
  title: TypeScript Microservice
  description: Create a production-ready TypeScript microservice with logging, metrics, and CI/CD
  tags:
    - typescript
    - microservice
    - recommended
spec:
  owner: platform-team
  type: service

  parameters:
    - title: Service Details
      required: [name, owner, description]
      properties:
        name:
          title: Service name
          type: string
          description: Kebab-case service identifier
          ui:autofocus: true
        owner:
          title: Owner team
          type: string
          ui:field: OwnerPicker
          ui:options:
            allowedKinds: ['Group']
        description:
          title: Description
          type: string
        database:
          title: Include database?
          type: boolean
          default: false

  steps:
    - id: fetch
      name: Fetch base template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}
          owner: ${{ parameters.owner }}
          description: ${{ parameters.description }}
          database: ${{ parameters.database }}

    - id: publish
      name: Publish to GitHub
      action: publish:github
      input:
        allowedHosts: ['github.com']
        description: ${{ parameters.description }}
        repoUrl: github.com?repo=${{ parameters.name }}&owner=acme-corp
        defaultBranch: main
        repoVisibility: private

    - id: catalog-write
      name: Register in catalog
      action: catalog:write
      input:
        entity:
          apiVersion: backstage.io/v1alpha1
          kind: Component
          metadata:
            name: ${{ parameters.name }}
            description: ${{ parameters.description }}
            annotations:
              github.com/project-slug: acme-corp/${{ parameters.name }}
          spec:
            type: service
            lifecycle: development
            owner: ${{ parameters.owner }}

  output:
    links:
      - title: Repository
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in catalog
        icon: catalog
        entityRef: ${{ steps.catalog-write.output.entityRef }}
```

## Kubernetes Plugin

The Kubernetes plugin integrates cluster status directly in the service catalog page:

```bash
yarn workspace app add @backstage/plugin-kubernetes
yarn workspace backend add @backstage/plugin-kubernetes-backend
```

Configuration:

```yaml
kubernetes:
  serviceLocatorMethod:
    type: multiTenant
  clusterLocatorMethods:
    - type: config
      clusters:
        - url: https://k8s.acme.internal
          name: production
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_TOKEN}
          caData: ${K8S_CA_DATA}
        - url: https://k8s-staging.acme.internal
          name: staging
          authProvider: serviceAccount
          serviceAccountToken: ${K8S_STAGING_TOKEN}
```

Services with the `backstage.io/kubernetes-id` annotation get a Kubernetes tab showing deployment status, pod health, events, and resource usage directly in Backstage.

## Building Custom Plugins

When existing plugins don't cover your needs, build your own:

```bash
cd packages
npx @backstage/cli create-plugin
# Name: my-deployment-tracker
```

Plugin structure:

```
plugins/my-deployment-tracker/
├── src/
│   ├── components/
│   │   ├── DeploymentCard/
│   │   │   ├── DeploymentCard.tsx
│   │   │   └── index.ts
│   │   └── EntityDeploymentContent.tsx
│   ├── index.ts
│   └── plugin.ts
└── package.json
```

`plugin.ts`:

```typescript
import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const myDeploymentTrackerPlugin = createPlugin({
  id: 'my-deployment-tracker',
  routes: {
    root: rootRouteRef,
  },
});

export const EntityDeploymentContent = myDeploymentTrackerPlugin.provide(
  createRoutableExtension({
    name: 'EntityDeploymentContent',
    component: () =>
      import('./components/EntityDeploymentContent').then(
        m => m.EntityDeploymentContent,
      ),
    mountPoint: rootRouteRef,
  }),
);
```

Register in the app's `EntityPage`:

```tsx
// packages/app/src/components/catalog/EntityPage.tsx
import { EntityDeploymentContent } from '@internal/plugin-my-deployment-tracker';

const serviceEntityPage = (
  <EntityLayout>
    {/* ... other tabs */}
    <EntityLayout.Route path="/deployments" title="Deployments">
      <EntityDeploymentContent />
    </EntityLayout.Route>
  </EntityLayout>
);
```

## Production Deployment

For production, deploy Backstage as a Docker container:

```bash
yarn build:backend
yarn build-image
```

The generated `Dockerfile`:

```dockerfile
FROM node:18-bookworm-slim

WORKDIR /app

COPY --chown=node:node yarn.lock package.json packages/backend/dist/skeleton.tar.gz ./
RUN tar xzf skeleton.tar.gz && rm skeleton.tar.gz

RUN --mount=type=cache,target=/home/node/.yarn/berry/cache \
    --mount=type=cache,target=/home/node/.cache/yarn \
    yarn workspaces focus --all --production

COPY --chown=node:node packages/backend/dist/bundle.tar.gz .
RUN tar xzf bundle.tar.gz && rm bundle.tar.gz

CMD ["node", "packages/backend", "--config", "app-config.yaml"]
```

Deploy with Kubernetes via Helm:

```bash
helm repo add backstage https://backstage.github.io/charts
helm install backstage backstage/backstage \
  --values values.yaml \
  --namespace backstage \
  --create-namespace
```

## ROI and Adoption

Backstage's value is hard to measure but real. Spotify reported after deploying Backstage that developer onboarding time dropped by 55%. Service discovery time — "find the right thing to change" — dropped dramatically across engineering organizations.

The key to adoption: populate the catalog automatically via GitHub integration, not manual entry. If developers have to manually register services, they won't. If Backstage automatically discovers everything from `catalog-info.yaml` files, the catalog stays current with minimal maintenance.

Start with the catalog, add TechDocs, then add templates for new services. Each step delivers compounding value as your catalog grows.
