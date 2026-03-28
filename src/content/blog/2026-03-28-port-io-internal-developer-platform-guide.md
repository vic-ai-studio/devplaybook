---
title: "Port.io Internal Developer Platform: The Complete Guide"
description: "Port.io is a no-code internal developer platform for building software catalogs, self-service portals, and scorecards. Learn blueprints, actions, scorecards, and how Port compares to Backstage."
date: "2026-03-28"
tags: [port-io, platform-engineering, developer-portal, idp, devops]
readingTime: "9 min read"
author: "DevPlaybook Team"
---

# Port.io Internal Developer Platform: The Complete Guide

Port.io is an Internal Developer Platform (IDP) that promises to do what Backstage does — software catalog, self-service portal, scorecards — without requiring you to build and maintain the infrastructure yourself.

While Backstage is a framework you deploy and customize, Port is a SaaS platform. You connect your data sources, define your entities, and get a working developer portal without writing React components or managing Kubernetes deployments.

This guide covers Port's core concepts, how to get started, and when to choose Port over Backstage.

## Core Concepts

### Blueprints

Blueprints are Port's entity type definitions. A Blueprint defines the schema for a class of entity — what properties it has, what relationships it can have with other blueprints, and what it looks like in the catalog.

Example blueprints:
- **Service**: A microservice or application
- **Environment**: A deployment environment (production, staging, dev)
- **Incident**: A production incident
- **Pull Request**: A GitHub pull request
- **Kubernetes Cluster**: A K8s cluster

You create blueprints in Port's UI or via the API:

```json
{
  "identifier": "service",
  "title": "Service",
  "description": "A microservice or application",
  "icon": "Service",
  "schema": {
    "properties": {
      "language": {
        "title": "Language",
        "type": "string",
        "enum": ["TypeScript", "Python", "Go", "Java"],
        "enumColors": {
          "TypeScript": "blue",
          "Python": "yellow",
          "Go": "turquoise",
          "Java": "red"
        }
      },
      "lifecycle": {
        "title": "Lifecycle",
        "type": "string",
        "enum": ["development", "production", "deprecated"]
      },
      "on_call": {
        "title": "On Call",
        "type": "string",
        "format": "user"
      },
      "repo_url": {
        "title": "Repository",
        "type": "string",
        "format": "url"
      },
      "deployment_frequency": {
        "title": "Deploys/Week",
        "type": "number"
      }
    },
    "required": ["language", "lifecycle"]
  },
  "relations": {
    "owns_endpoints": {
      "title": "Endpoints",
      "target": "api_endpoint",
      "required": false,
      "many": true
    },
    "deployed_to": {
      "title": "Deployed To",
      "target": "environment",
      "required": false,
      "many": true
    }
  }
}
```

### Entities

Entities are instances of blueprints — actual services, environments, or resources in your organization. You populate entities via:

1. **GitHub Integration**: Reads `port.yml` files from your repositories
2. **API**: Programmatic entity creation and updates
3. **Port Ocean**: Data source integrations (Terraform, AWS, GCP, PagerDuty, etc.)
4. **Webhooks**: Real-time updates from external systems

`port.yml` in your repository:

```yaml
identifier: payments-api
title: Payments API
blueprint: service
properties:
  language: TypeScript
  lifecycle: production
  on_call: alice@acme.com
  repo_url: https://github.com/acme/payments-api
  deployment_frequency: 14
relations:
  deployed_to:
    - production
    - staging
```

Port's GitHub app scans your repositories for these files and creates/updates entities automatically.

### Actions

Actions are self-service workflows that developers can trigger from Port's UI. They integrate with your existing automation infrastructure — GitHub Actions, Jenkins, Terraform, or any webhook.

An action definition:

```json
{
  "identifier": "create_service",
  "title": "Create New Service",
  "description": "Scaffold a new production-ready service",
  "trigger": {
    "type": "self-service",
    "operation": "CREATE",
    "userInputs": {
      "properties": {
        "name": {
          "title": "Service name",
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$"
        },
        "language": {
          "title": "Language",
          "type": "string",
          "enum": ["typescript", "python", "go"]
        },
        "owner_team": {
          "title": "Owner team",
          "type": "string",
          "format": "team"
        },
        "database": {
          "title": "Include database",
          "type": "boolean",
          "default": false
        }
      },
      "required": ["name", "language", "owner_team"]
    }
  },
  "invocationMethod": {
    "type": "GITHUB",
    "org": "acme-corp",
    "repo": "platform-automation",
    "workflow": "create-service.yml",
    "workflowInputs": {
      "service_name": "{{ .inputs.name }}",
      "language": "{{ .inputs.language }}",
      "owner_team": "{{ .inputs.owner_team }}",
      "include_database": "{{ .inputs.database }}",
      "port_run_id": "{{ .run.id }}"
    }
  }
}
```

GitHub Actions workflow triggered by the action:

```yaml
# .github/workflows/create-service.yml
name: Create Service
on:
  workflow_dispatch:
    inputs:
      service_name:
        required: true
      language:
        required: true
      owner_team:
        required: true
      include_database:
        required: false
        default: 'false'
      port_run_id:
        required: true

jobs:
  create:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Scaffold service
        run: |
          ./scripts/scaffold-service.sh \
            --name "${{ inputs.service_name }}" \
            --language "${{ inputs.language }}" \
            --database "${{ inputs.include_database }}"

      - name: Update Port run status
        uses: port-labs/port-github-action@v1
        with:
          clientId: ${{ secrets.PORT_CLIENT_ID }}
          clientSecret: ${{ secrets.PORT_CLIENT_SECRET }}
          operation: PATCH_RUN
          runId: ${{ inputs.port_run_id }}
          status: 'SUCCESS'
          logMessage: "Service ${{ inputs.service_name }} created successfully"
          link: "https://github.com/acme/${{ inputs.service_name }}"
```

When a developer triggers "Create New Service" in Port, they see a form with the defined inputs, and the GitHub Actions workflow runs with real-time status updates in Port's UI.

### Scorecards

Scorecards are Port's most distinctive feature. They let you define standards and measure service compliance automatically.

Example scorecard: Production Readiness:

```json
{
  "identifier": "production_readiness",
  "title": "Production Readiness",
  "blueprint": "service",
  "levels": [
    {
      "color": "paleBlue",
      "title": "Basic"
    },
    {
      "color": "bronze",
      "title": "Bronze"
    },
    {
      "color": "silver",
      "title": "Silver"
    },
    {
      "color": "gold",
      "title": "Gold"
    }
  ],
  "rules": [
    {
      "identifier": "has_owner",
      "title": "Has an owner",
      "description": "Service must have an assigned owner team",
      "level": "Basic",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "operator": "isNotEmpty",
            "property": "owner_team"
          }
        ]
      }
    },
    {
      "identifier": "has_documentation",
      "title": "Has documentation",
      "level": "Bronze",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "operator": "isNotEmpty",
            "property": "docs_url"
          }
        ]
      }
    },
    {
      "identifier": "has_on_call",
      "title": "Has on-call assignment",
      "level": "Silver",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "operator": "isNotEmpty",
            "property": "on_call"
          }
        ]
      }
    },
    {
      "identifier": "deployment_frequency",
      "title": "Deploys at least weekly",
      "level": "Gold",
      "query": {
        "combinator": "and",
        "conditions": [
          {
            "operator": ">=",
            "property": "deployment_frequency",
            "value": 7
          }
        ]
      }
    }
  ]
}
```

Every service in your catalog gets automatically scored against these rules. Platform teams can see which services need attention, and development teams can see what they need to do to reach Gold status.

## Port Ocean: Data Integrations

Port Ocean is the data ingestion framework for bringing external data into Port. It provides pre-built integrations for:

- **Cloud**: AWS, GCP, Azure (resources, costs, security findings)
- **Source control**: GitHub, GitLab, Bitbucket
- **CI/CD**: GitHub Actions, Jenkins, CircleCI
- **Incident management**: PagerDuty, Opsgenie, Incident.io
- **Monitoring**: Datadog, Grafana, New Relic
- **Security**: Snyk, Wiz, Checkov
- **Infrastructure**: Terraform, Pulumi, Kubernetes, ArgoCD, Flux

Example: Syncing PagerDuty services to Port:

```yaml
# port-ocean-config.yaml
integration:
  identifier: pagerduty
  type: pagerduty
  config:
    token: ${PAGERDUTY_TOKEN}

resources:
  - kind: services
    selector:
      query: 'true'
    port:
      entity:
        mappings:
          identifier: .id
          title: .name
          blueprint: '"pagerduty_service"'
          properties:
            status: .status
            url: .html_url
            escalation_policy: .escalation_policy.name
            teams: '[.teams[].name]'
```

The integration runs on a schedule (or via webhook) and keeps Port entities synchronized with PagerDuty.

## Port vs Backstage: When to Choose

### Choose Port when:

**Speed to value matters**: Port can have a basic software catalog running in hours. Backstage requires infrastructure setup, plugin configuration, and often custom development before it's useful.

**No platform engineering team**: Backstage requires maintenance. Someone needs to manage the Backstage deployment, update plugins, and develop custom components. Port's SaaS model eliminates this.

**Strong scorecard requirements**: Port's scorecard system is more mature and flexible than Backstage's equivalent (`techInsights` plugin). If measuring and reporting service standards is a priority, Port wins.

**Non-technical users need access**: Port's no-code configuration is accessible to product managers and engineering managers who want visibility without needing to understand YAML or React.

**Enterprise compliance**: Port includes RBAC, audit logs, SSO, and compliance reporting built-in. In Backstage, these require configuration and often custom plugins.

### Choose Backstage when:

**Full customization is required**: Backstage lets you build exactly the portal you want. Custom React plugins, custom data sources, custom UI components. Port's customization is limited to its data model and UI framework.

**Open source requirement**: Some organizations can't use SaaS tools for their internal developer portal. Backstage is fully open source and self-hosted.

**Existing engineering investment**: If your team has already invested in Backstage and has working plugins, migration to Port doesn't pay off.

**Complex plugin ecosystem**: Backstage's plugin ecosystem includes hundreds of integrations. Some niche tools you use may only have Backstage plugins.

**Cost**: For large organizations, Port's per-seat pricing can exceed the cost of self-hosting Backstage.

## Getting Started with Port

1. Sign up at `app.getport.io`
2. Connect your GitHub organization (OAuth)
3. Install Port's GitHub app
4. Port automatically scans repos and creates a basic catalog
5. Define blueprints to model your entities
6. Add `port.yml` files to repositories for detailed data
7. Configure scorecards for your standards
8. Build actions for your most common workflows

Port's onboarding wizard guides through these steps with sensible defaults. A basic catalog with GitHub data can be running in under an hour.

## Pricing Consideration

Port offers a free tier for small teams (up to 15 engineers). Paid plans are seat-based. For large organizations, this is a significant budget consideration compared to Backstage's self-hosted (infrastructure cost only) model.

Run the math: if Backstage requires 0.5 FTE of platform engineering to maintain, and Port costs N × $X/seat/month, Port often wins economically for teams under ~200 engineers.

## Conclusion

Port.io delivers a production-ready internal developer platform with significantly less setup time than Backstage. The blueprint system is flexible enough to model any software organization, scorecards provide automatic compliance visibility, and actions enable real self-service without writing automation from scratch.

The trade-off is customization depth and vendor lock-in. For most platform engineering teams without dedicated frontend resources, Port's SaaS model and visual configuration remove more friction than they add.
