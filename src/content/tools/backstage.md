---
title: "Backstage"
description: "Spotify's open-source developer portal — centralize service catalogs, documentation, scaffolding, and tooling into one internal developer platform for large engineering orgs."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (Apache 2.0); Spotify-hosted Backstage.io SaaS available"
website: "https://backstage.io"
github: "https://github.com/backstage/backstage"
tags: ["developer-portal", "service-catalog", "platform-engineering", "open-source", "documentation", "devops", "kubernetes", "internal-developer-platform"]
pros:
  - "Software Catalog: single source of truth for all services, APIs, libraries, and pipelines"
  - "TechDocs: auto-generate docs sites from markdown in each repo"
  - "Software Templates: scaffold new services with golden-path templates"
  - "Plugin ecosystem: 200+ plugins for K8s, PagerDuty, GitHub Actions, etc."
  - "Reduces cognitive load — engineers find everything in one place"
cons:
  - "Significant setup and maintenance investment — not a weekend project"
  - "TypeScript/React knowledge required for plugin development"
  - "Requires a running PostgreSQL database"
  - "Best for 50+ engineer orgs — overkill for small teams"
date: "2026-04-02"
---

## Overview

Backstage is Spotify's internal developer platform, open-sourced in 2020. It solves the "too many tools" problem in large engineering organizations — instead of navigating 20 different dashboards, engineers have one portal for service catalogs, documentation, scaffolding, CI status, on-call schedules, and more.

## Quick Start

```bash
npx @backstage/create-app@latest
cd my-backstage-app
yarn dev  # Opens at http://localhost:3000
```

## Software Catalog

Every service registers itself via a `catalog-info.yaml` file:

```yaml
# catalog-info.yaml (in each service's repo)
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Handles payment processing
  tags:
    - nodejs
    - payments
  annotations:
    github.com/project-slug: org/payment-service
    backstage.io/techdocs-ref: dir:.
links:
  - url: https://grafana.internal/d/payments
    title: Grafana Dashboard
    icon: dashboard
spec:
  type: service
  lifecycle: production
  owner: payments-team
  system: e-commerce
  dependsOn:
    - component:stripe-integration
    - resource:payments-db
```

Backstage discovers these files via GitHub/GitLab scanning.

## Software Templates (Scaffolding)

Golden-path templates for creating new services:

```yaml
# template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: nodejs-microservice
  title: Node.js Microservice
spec:
  parameters:
    - title: Service Info
      properties:
        name:
          type: string
          title: Service Name
        owner:
          type: string
          title: Team

  steps:
    - id: fetch-template
      action: fetch:template
      input:
        url: ./skeleton
        values:
          name: ${{ parameters.name }}

    - id: create-repo
      action: github:repo:create
      input:
        repoUrl: github.com?repo=${{ parameters.name }}&owner=my-org

    - id: register
      action: catalog:register
      input:
        repoContentsUrl: ${{ steps['create-repo'].output.repoContentsUrl }}
        catalogInfoPath: /catalog-info.yaml
```

## TechDocs

Auto-generate docs from Markdown in each repo:

```yaml
# catalog-info.yaml annotation
annotations:
  backstage.io/techdocs-ref: dir:.

# docs/index.md in the service repo
# Backstage renders this as a docs site
```

## Plugin Installation

```typescript
// packages/app/src/App.tsx
import { KubernetesPage } from '@backstage/plugin-kubernetes';
import { PagerDutyPage } from '@pagerduty/backstage-plugin';

// Add to routes
<Route path="/kubernetes" element={<KubernetesPage />} />
<Route path="/pagerduty" element={<PagerDutyPage />} />
```

Popular plugins: Kubernetes cluster viewer, GitHub Actions pipeline status, PagerDuty on-call schedule, cost insights, API explorer.
