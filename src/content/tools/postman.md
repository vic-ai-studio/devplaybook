---
title: "Postman"
description: "The industry-standard API platform — design, test, document, and share APIs with a GUI client, automated testing, mock servers, and team workspaces."
category: "API Testing & CI/CD"
pricing: "Freemium"
pricingDetail: "Free for individuals; Basic $14/user/month; Professional $29/user/month; Enterprise custom"
website: "https://postman.com"
github: ""
tags: [api-testing, rest, graphql, grpc, http, testing, developer-tools]
pros:
  - "Most complete API platform — design, mock, test, document, monitor in one tool"
  - "Collections: organize and share API requests as versioned files"
  - "Newman: run Postman collections in CI/CD from the CLI"
  - "Pre-request scripts and test scripts (JavaScript) for complex workflows"
  - "API documentation auto-generated from collections"
cons:
  - "Heavy Electron app — slower startup than lightweight alternatives"
  - "Free tier limits cloud sync, collaboration features"
  - "Privacy: API requests go through Postman's servers (use offline mode for sensitive data)"
  - "Alternatives like Bruno provide open-source collection format"
date: "2026-04-02"
---

## Overview

Postman is the most widely used API testing and development tool. It's evolved from a simple REST client into a full API platform covering the API lifecycle from design to production monitoring.

## Collections and Environments

**Collections** organize related API requests. **Environments** hold variables that change per environment (dev/staging/prod):

```javascript
// Pre-request script: get auth token before each request
const tokenResponse = pm.sendRequest({
    url: pm.environment.get('BASE_URL') + '/auth/token',
    method: 'POST',
    body: {
        mode: 'raw',
        raw: JSON.stringify({
            client_id: pm.environment.get('CLIENT_ID'),
            client_secret: pm.environment.get('CLIENT_SECRET'),
        })
    }
}, (err, response) => {
    pm.environment.set('ACCESS_TOKEN', response.json().access_token);
});
```

## Test Scripts

```javascript
// Tests tab: run after every request
pm.test('Status is 201', () => {
    pm.response.to.have.status(201);
});

pm.test('Response has order ID', () => {
    const body = pm.response.json();
    pm.expect(body).to.have.property('orderId');
    pm.expect(body.orderId).to.match(/^ord-[a-z0-9]+$/);
});

pm.test('Response time under 500ms', () => {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// Store response data for chaining requests
pm.environment.set('ORDER_ID', pm.response.json().orderId);
```

## Newman: Run in CI

```bash
npm install -g newman newman-reporter-htmlextra

# Run a collection
newman run my-collection.json \
  -e production.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export results/report.html

# GitHub Actions
- name: Run API tests
  run: |
    newman run postman/collection.json \
      -e postman/env.staging.json \
      --bail  # Stop on first test failure
```
