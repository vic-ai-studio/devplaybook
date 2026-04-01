---
title: "Keycloak — Open Source Identity & Access Management"
description: "Keycloak is the leading open-source identity provider. Add SSO, OAuth2, OpenID Connect, and SAML to any application without writing auth code. Self-host or use Red Hat's managed cloud."
category: "Auth & Identity"
pricing: "Open Source"
pricingDetail: "Free and open source (Apache 2.0). Red Hat SSO (enterprise support) available commercially."
website: "https://www.keycloak.org"
github: "https://github.com/keycloak/keycloak"
tags: ["auth", "sso", "oauth2", "oidc", "saml", "identity", "open-source", "security"]
pros:
  - "Full SSO across all your apps — one login to rule them all"
  - "Built-in support for OAuth2, OpenID Connect, SAML 2.0, LDAP, Active Directory"
  - "Social login (Google, GitHub, Facebook, etc.) out of the box"
  - "Admin UI for user/group/role management — no code needed for many tasks"
  - "Fine-grained authorization with policies, scopes, and permissions"
  - "MFA, brute-force protection, password policies built-in"
cons:
  - "Resource-heavy: baseline memory 512MB–1GB; scales up in prod"
  - "Complex to configure properly — many concepts (realms, clients, flows)"
  - "Default UI is dated; custom themes require FreeMarker templating"
  - "Upgrade process historically painful (DB migrations, config changes)"
date: "2026-04-01"
---

## What is Keycloak?

Keycloak is an open-source Identity and Access Management (IAM) solution that handles authentication and authorization for applications so you don't have to. Instead of building login flows, session management, MFA, and token issuance yourself, you integrate your apps with Keycloak and delegate all of that complexity to a dedicated, battle-tested service.

## Core Architecture

Keycloak organizes everything into **Realms** — isolated tenants. Each realm has its own users, clients (applications), identity providers, and authentication flows. You can run one realm per environment (dev/staging/prod) or one realm per product.

```bash
# Quick start with Docker
docker run -p 8080:8080 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=change_me \
  quay.io/keycloak/keycloak:latest start-dev
```

## Key Features

### OIDC / OAuth2 Integration

Any app that supports OIDC can integrate with Keycloak in minutes. Configure a "client" in the admin UI, set redirect URIs, and you're done:

```javascript
// Node.js example with passport-keycloak-bearer
const KeycloakBearerStrategy = require('passport-keycloak-bearer');
passport.use(new KeycloakBearerStrategy({
  realm: 'myrealm',
  url: 'https://keycloak.example.com'
}, (jwtPayload, done) => done(null, jwtPayload)));
```

### LDAP / Active Directory Sync

Federate your existing corporate directory into Keycloak. Users authenticate with their AD credentials, and Keycloak issues OIDC tokens your modern apps understand. Bridge the gap between legacy enterprise infra and new services.

### Custom Authentication Flows

Keycloak's authentication flow engine lets you wire together conditions: require MFA only for admin roles, step-up auth for sensitive operations, or custom OTP via SMS. All configurable in the admin UI without code changes.

### Fine-Grained Authorization

Beyond role-based access, Keycloak supports attribute-based access control (ABAC) with its Authorization Services. Define policies at the resource level and evaluate them server-side.

## Best For

- Startups that want enterprise-grade auth without buying Okta or Auth0
- Internal tooling with LDAP/AD user directories needing modern OIDC tokens
- Microservice architectures requiring centralized token issuance and validation
- Teams building multi-tenant SaaS who need realm-per-tenant isolation
