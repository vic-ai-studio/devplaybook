---
title: "Buildkite — Scalable CI/CD on Your Own Infrastructure"
description: "Hybrid CI/CD platform — Buildkite manages the orchestration and UI in the cloud, while your own infrastructure runs the build agents, giving you speed without cloud vendor lock-in."
category: "API Testing & CI/CD"
pricing: "Freemium"
pricingDetail: "Free for open source; Developer $45/month (25 users); Business from $450/month; Enterprise custom"
website: "https://buildkite.com"
github: "https://github.com/buildkite/agent"
tags: [ci-cd, automation, devops, hybrid, deployment, pipelines, self-hosted]
pros:
  - "Hybrid model: your agents run your code, Buildkite handles orchestration only"
  - "No secrets leave your infrastructure — agents pull jobs, never receive secrets via Buildkite"
  - "Elastic CI Stack: official AWS CloudFormation to auto-scale agents"
  - "Dynamic pipelines: generate pipeline YAML at runtime from scripts"
  - "Test Analytics: built-in flaky test detection and performance tracking"
cons:
  - "You manage agent infrastructure (unlike fully-managed cloud CI)"
  - "Smaller ecosystem than GitHub Actions or Jenkins"
  - "Pricing per user can get expensive for large engineering orgs"
  - "Less turnkey than GitHub Actions for simple projects"
date: "2026-04-02"
---

## Overview

Buildkite takes a hybrid approach to CI/CD: the control plane (scheduling, UI, API) is Buildkite's cloud, but the actual build execution happens on agents you run on your own infrastructure. This means your code and secrets never touch Buildkite's servers — only job metadata and results do. It's popular at companies like Shopify, Airbnb, and Canva that run tens of thousands of builds per day.

## Basic Pipeline

```yaml
# .buildkite/pipeline.yml
steps:
  - label: ":npm: Install"
    command: npm ci
    key: install

  - label: ":test_tube: Test"
    command: npm test
    depends_on: install
    parallelism: 4  # Split across 4 agents

  - label: ":hammer: Build"
    command: npm run build
    depends_on: test
    artifact_paths: "dist/**/*"

  - wait  # All above must pass before continuing

  - label: ":rocket: Deploy"
    command: ./scripts/deploy.sh
    branches: "main"
```

## Dynamic Pipelines

Buildkite's killer feature: generate pipeline steps at runtime:

```bash
#!/bin/bash
# .buildkite/generate-pipeline.sh

# Determine which services changed
CHANGED=$(git diff --name-only origin/main...HEAD)

cat << EOF
steps:
EOF

if echo "$CHANGED" | grep -q "^services/api/"; then
  cat << EOF
  - label: "Test API"
    command: "cd services/api && npm test"
EOF
fi

if echo "$CHANGED" | grep -q "^services/web/"; then
  cat << EOF
  - label: "Test Web"
    command: "cd services/web && npm test"
EOF
fi
```

```yaml
# .buildkite/pipeline.yml
steps:
  - label: ":pipeline: Generate pipeline"
    command: .buildkite/generate-pipeline.sh | buildkite-agent pipeline upload
```

## Running Agents

Install the Buildkite agent on any machine:

```bash
# Linux/macOS
curl -sL https://raw.githubusercontent.com/buildkite/agent/main/install.sh | bash

# Configure
vim /etc/buildkite-agent/buildkite-agent.cfg
# token="your-agent-token"
# name="my-agent-%n"
# tags="queue=default,os=linux"

# Start
buildkite-agent start
```

## Elastic CI on AWS

Auto-scale agents with official CloudFormation stack:

```bash
# Deploy auto-scaling agent pool
aws cloudformation create-stack \
  --stack-name buildkite-agents \
  --template-url https://s3.amazonaws.com/buildkite-aws-stack/latest/aws-stack.yml \
  --parameters \
    ParameterKey=BuildkiteAgentToken,ParameterValue=xxx \
    ParameterKey=MaxSize,ParameterValue=20 \
    ParameterKey=MinSize,ParameterValue=0 \
    ParameterKey=InstanceType,ParameterValue=c5.2xlarge \
    ParameterKey=SpotPrice,ParameterValue=0.20
```

## Plugin Ecosystem

```yaml
steps:
  - label: ":docker: Build"
    plugins:
      # Official Docker plugin
      - docker-compose#v4.0.0:
          run: app
          config: docker-compose.test.yml

      # Secrets from AWS SSM
      - aws-ssm#v1.0.0:
          parameters:
            - path: /myapp/prod/db-password
              env: DB_PASSWORD

      # Slack notifications
      - slack-notification#v1.6.0:
          channels: ["#deployments"]
          message: "Deploy complete: ${BUILDKITE_BUILD_URL}"
```

## Test Analytics

```bash
# Upload JUnit XML results for flaky test detection
npm test -- --reporter junit --outputFile test-results.xml

# Upload via Buildkite CLI
buildkite-agent artifact upload test-results.xml
```

Buildkite Test Analytics tracks test duration trends, flaky tests, and which tests fail most — helping prioritize stability work.
