---
title: "Insomnia"
description: "Open-source REST, GraphQL, and gRPC API client — Git-based sync, design-first API workflow, and a clean interface without Postman's enterprise overhead."
category: "API Testing & CI/CD"
pricing: "Free"
pricingDetail: "Open source (free); Insomnia Cloud collaboration from $16/user/month"
website: "https://insomnia.rest"
github: "https://github.com/Kong/insomnia"
tags: [api-testing, rest, graphql, grpc, http, developer-tools, open-source]
pros:
  - "Clean, minimal interface — faster to navigate than Postman"
  - "Native GraphQL support with schema introspection"
  - "gRPC support with .proto file import"
  - "Git Sync: store workspaces in your own Git repository"
  - "Insomnia CLI (inso) for CI/CD integration"
cons:
  - "Smaller ecosystem than Postman (fewer integrations)"
  - "Cloud sync requires paid tier for teams"
  - "Kong acquired Insomnia — some users concerned about open-source commitment"
  - "Limited test scripting vs Postman's full JavaScript environment"
date: "2026-04-02"
---

## Overview

Insomnia (owned by Kong) is a popular open-source alternative to Postman with a cleaner UI and better GraphQL/gRPC support. Its Git Sync feature stores workspaces in your own repository, addressing privacy concerns about cloud-synced API credentials.

## Key Features

**GraphQL Explorer**:
- Auto-discover schema via introspection
- IntelliSense for queries and mutations
- Variable editor with JSON validation

```graphql
# Insomnia sends the request and shows formatted results
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    orders {
      id
      total
      status
    }
  }
}
```

**Environment Variables**:
```json
{
  "base_url": "https://api.example.com",
  "token": "Bearer {{ _.auth_token }}",
  "api_version": "v2"
}
```

**Request Chaining** (via Response references):
```
Request 1: POST /auth/login → saves token to env
Request 2: GET /profile → uses {{ response.body.access_token }}
```

## inso CLI for CI

```bash
npm install -g insomnia-inso

# Run a test suite from a collection
inso run test "My API Tests" \
  --env "Production" \
  --ci

# Export collection for sharing
inso export spec "My API" --output openapi.yaml

# GitHub Actions
- name: Run API Tests
  run: inso run test "Integration Tests" --env staging --ci
```

## Insomnia vs Postman vs Bruno

| Feature | Insomnia | Postman | Bruno |
|---------|----------|---------|-------|
| Open source | ✅ | ❌ | ✅ |
| GraphQL | Excellent | Good | Good |
| gRPC | ✅ | ✅ | ❌ |
| Git-based storage | ✅ (paid team) | ❌ | ✅ (native) |
| Test scripting | Basic | Full JS | Basic |
| Offline collection format | Proprietary JSON | Proprietary JSON | Markdown-like |
