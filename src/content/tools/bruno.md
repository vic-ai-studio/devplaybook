---
title: "Bruno"
description: "Open-source API client that stores collections as plain-text files in your Git repo — no cloud sync or subscription required, just files in your codebase."
category: "API Testing & CI/CD"
pricing: "Free"
pricingDetail: "Open source (MIT); Bruno Golden Edition (one-time $19) for advanced features"
website: "https://www.usebruno.com"
github: "https://github.com/usebruno/bruno"
tags: [api-testing, rest, graphql, open-source, git, developer-tools, offline]
pros:
  - "Collections stored as plain text .bru files — native Git versioning"
  - "No cloud account required — fully offline and private"
  - "Bru scripting language for pre-request and test scripts"
  - "Secrets via .env files (gitignored) — no secrets in collection files"
  - "Free forever for core features"
cons:
  - "Newer tool — smaller ecosystem than Postman or Insomnia"
  - "No cloud collaboration (by design — use Git instead)"
  - "Limited plugin/integration ecosystem"
  - "Some advanced Postman features not yet available"
date: "2026-04-02"
---

## Overview

Bruno challenges the Postman/Insomnia model of cloud-synced proprietary collections. Instead, Bruno stores your API collections as plain `.bru` text files that live alongside your code in Git. No accounts, no SaaS, no secrets uploaded to someone else's cloud.

## Collection Structure

```
my-api/
├── environments/
│   ├── local.bru
│   └── production.bru
├── auth/
│   └── login.bru
├── users/
│   ├── get-user.bru
│   ├── create-user.bru
│   └── delete-user.bru
└── orders/
    └── create-order.bru
```

## .bru File Format

```bru
# users/create-user.bru
meta {
  name: Create User
  type: http
  seq: 1
}

post {
  url: {{base_url}}/api/users
  body: json
  auth: bearer
}

auth:bearer {
  token: {{auth_token}}
}

body:json {
  {
    "name": "Alice Johnson",
    "email": "alice@example.com",
    "role": "user"
  }
}

pre:request {
  // Bru script: run before request
  bru.setVar("timestamp", Date.now());
}

tests {
  test("Status is 201", function() {
    expect(res.status).to.equal(201);
  });

  test("Has user ID", function() {
    expect(res.body.id).to.match(/^usr-[a-z0-9]+/);
  });

  // Save for use in subsequent requests
  bru.setVar("created_user_id", res.body.id);
}
```

## Environment Files

```bru
# environments/local.bru
vars {
  base_url: http://localhost:3000
}

vars:secret [
  auth_token  # Stored in .env, not committed
]
```

```bash
# .env (gitignored — keeps secrets out of the repo)
auth_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Bruno CLI for CI

```bash
npm install -g @usebruno/cli

# Run all tests in a collection
bru run --env local

# Run specific folder
bru run users/ --env staging

# GitHub Actions
- name: Run Bruno API Tests
  run: |
    npm install -g @usebruno/cli
    bru run --env production --reporter junit --output results.xml
```

## Why Developers Choose Bruno

Bruno's Git-native approach means: no subscription to maintain, no secrets in a third-party cloud, collections get code review with PRs, and API changes are visible in git history. It's particularly popular in security-conscious organizations and teams that want to keep their API definitions alongside the code that uses them.

## Use Cases

- **API development alongside code**: Because `.bru` files are plain text, you commit your API collection in the same PR as the backend code that implements the endpoint. Code reviewers can see the request, expected response, and tests in the same diff. When the API changes, the collection update is part of the same commit history — no "our Postman collection is out of date" problem.

- **Security-sensitive projects**: Organizations in finance, healthcare, or government often have policies preventing API credentials from being uploaded to third-party cloud services. Bruno's model of keeping secrets in a local `.env` file (never committed) and collections on your own Git server satisfies these policies without sacrificing team collaboration.

- **Replacing Postman without a subscription**: Teams that relied on Postman's free tier before its feature restrictions can migrate to Bruno with minimal friction. Bruno can import Postman collections (File → Import), and the `bru` CLI lets you run the same tests in CI. The one-time $19 Golden Edition covers advanced features for the entire team per-developer lifetime cost.

- **API contract testing in CI/CD**: The `bru` CLI integrates directly with GitHub Actions, GitLab CI, or any pipeline runner. Teams use it to run their API test suite against staging on every PR, blocking merges if any endpoint behavior changes unexpectedly. The JUnit XML output integrates with standard test reporting dashboards.

- **Microservice development with multiple APIs**: In a microservices project, each service can have its own Bruno collection in its own directory, versioned with that service's code. A monorepo works naturally — different teams own different collection folders, and there's no shared Postman workspace with permission management headaches.
