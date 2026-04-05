---
title: "Backstage — Open-Source Developer Portal by Spotify"
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

## Best For

- **Orgs with 50+ engineers** where developers waste time finding which team owns a service, where its runbook is, and what its current health looks like
- **Platform engineering teams** building an internal developer platform (IDP) as a product for other engineers
- **Companies with microservices sprawl** — dozens of services across multiple teams where service discovery is a genuine problem
- **Enterprises standardizing golden paths** — enforcing that all new services are created via approved templates with security, observability, and CI/CD pre-wired

## Not a Good Fit If

- Your team is fewer than 20 engineers — a shared Notion page and GitHub org achieves the same result with zero maintenance
- You don't have someone willing to own Backstage as infrastructure — it requires ongoing maintenance and plugin updates
- Your stack is simple monolith — Backstage's value scales with service count

## Alternatives Comparison

| | Backstage | Cortex | Port | OpsLevel |
|--|-----------|--------|------|---------|
| Self-hosted | ✅ | ✗ | ✗ | ✗ |
| Customization | Unlimited (plugins) | Limited | Medium | Limited |
| Setup effort | Very high | Low | Low | Low |
| Cost | Free (hosting only) | $SaaS | $SaaS | $SaaS |
| Best for | Large orgs, full control | Quick start, SaaS | Modern IDP without Backstage complexity | Scorecards focus |

Backstage wins when you need full ownership and deep customization. If you just need a service catalog with minimal setup, Port or Cortex get you there in days instead of weeks.

## Concrete Use Case: Standardizing Service Creation Across a 200-Engineer Organization

A mid-stage fintech company with 200 engineers across 30 teams was struggling with service sprawl. Each team had its own conventions for project scaffolding, CI/CD configuration, observability setup, and documentation structure. When a new engineer joined, onboarding took two weeks just to understand which Slack channels, dashboards, and runbooks belonged to which services. Incident response was slow because on-call engineers could not quickly determine who owned a failing service or where its logs lived. The platform engineering team estimated that engineers spent 15-20% of their time navigating between GitHub, PagerDuty, Datadog, Confluence, and ArgoCD to find information that should have been in one place.

The platform team deployed Backstage as the company's internal developer portal and required every service to include a `catalog-info.yaml` file. They built three golden-path Software Templates: one for Go microservices, one for Node.js APIs, and one for React frontend applications. Each template automatically created a GitHub repository with standardized CI/CD pipelines (GitHub Actions), a pre-configured Dockerfile, Terraform modules for AWS infrastructure, a Datadog dashboard, a PagerDuty service entry, and TechDocs scaffolding. When an engineer clicked "Create" in Backstage, all of this was provisioned in under two minutes with no manual steps. The template also registered the new service in the Software Catalog with correct ownership, dependency links, and lifecycle tags.

Within three months, the company achieved full catalog coverage — every service, library, API, and data pipeline was searchable in Backstage with its owner, documentation, CI status, deployment status, and on-call rotation visible from a single page. New engineer onboarding dropped from two weeks to three days. Incident response improved measurably because on-call engineers could search for a failing service in Backstage and immediately see the owning team, recent deployments, Grafana dashboards, and runbook links without leaving the portal. The platform team also used Backstage's TechDocs integration to enforce that every service ships its documentation alongside its code, ending the problem of outdated Confluence pages that no one maintained.

## When to Use Backstage

**Use Backstage when:**
- Your engineering organization has 50+ engineers and the overhead of navigating disparate tools (GitHub, CI/CD dashboards, monitoring, wikis, on-call systems) is measurably slowing teams down
- You want to enforce golden-path templates so every new service is created with consistent CI/CD, infrastructure, monitoring, and documentation from day one
- You need a single searchable service catalog that answers "who owns this service, where are its docs, and what does it depend on" without tribal knowledge
- Your platform engineering team wants to build a self-service internal developer platform rather than handling repetitive provisioning requests manually
- You need TechDocs to co-locate documentation with source code and render it in a unified portal instead of scattered wiki pages

**When NOT to use Backstage:**
- Your team has fewer than 20-30 engineers and the coordination overhead does not justify the setup and maintenance cost of running a Backstage instance with PostgreSQL
- You do not have a dedicated platform engineering team or at least one engineer who can own Backstage configuration, plugin development, and upgrades over time
- Your organization primarily uses a single monorepo with a unified build system where service discovery and ownership are already well-defined
- You need a quick documentation site and would be better served by a lightweight tool like Docusaurus or MkDocs without the overhead of a full developer portal
