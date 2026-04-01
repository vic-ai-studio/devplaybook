---
title: "OpenAPI 3.1 Specification Guide: Design-First API Development"
description: "OpenAPI 3.1 specification guide: design-first approach, writing specs in YAML, components/schemas, request/response examples, code generation, and Swagger UI setup."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["OpenAPI", "Swagger", "API design", "YAML", "code generation", "API documentation"]
readingTime: "10 min read"
category: "api"
---

OpenAPI 3.1 is the industry standard for describing HTTP APIs. A well-written spec is a contract between your backend and every consumer — frontend teams, third-party developers, and auto-generated SDKs. This guide walks you through the design-first approach from blank file to production documentation.

## Design-First vs Code-First

There are two philosophies for using OpenAPI:

**Code-first**: Write your server implementation, then generate or annotate the spec from code. Fast to start, but the spec often lags reality and becomes stale.

**Design-first**: Write the OpenAPI spec before writing any code. The spec is the source of truth that drives implementation, client SDKs, and documentation simultaneously.

Design-first wins for teams where:
- Multiple developers work on frontend and backend in parallel
- You ship SDKs or public documentation
- Contract testing is part of your CI pipeline

For solo developers or rapid prototypes, code-first is pragmatic. But for anything you'll maintain for more than a month, design-first pays off.

## OpenAPI 3.1 File Structure

An OpenAPI document has three top-level sections:

```yaml
openapi: 3.1.0        # Spec version (always required)
info: ...             # Metadata about your API
paths: ...            # All endpoints and their operations
components: ...       # Reusable schemas, parameters, responses
```

The jump from 3.0 to 3.1 aligns OpenAPI with JSON Schema Draft 2020-12, enabling features like `$schema`, `if/then/else`, `unevaluatedProperties`, and proper `null` type support.

## Writing the `info` Block

```yaml
openapi: 3.1.0
info:
  title: Orders API
  description: |
    Manages customer orders, order items, and fulfillment status.
    All endpoints require Bearer authentication unless noted otherwise.
  version: 2.1.0
  contact:
    name: API Support
    email: api@example.com
    url: https://docs.example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.example.com/v2
    description: Production
  - url: https://api.staging.example.com/v2
    description: Staging
```

## Defining Paths and Operations

Each path entry maps to one or more HTTP operations:

```yaml
paths:
  /orders:
    get:
      summary: List orders
      operationId: listOrders
      tags: [Orders]
      parameters:
        - name: status
          in: query
          description: Filter by order status
          schema:
            type: string
            enum: [pending, processing, shipped, delivered, cancelled]
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
      responses:
        "200":
          description: Paginated list of orders
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderListResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
    post:
      summary: Create an order
      operationId: createOrder
      tags: [Orders]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateOrderInput"
            example:
              customerId: "cust_123"
              items:
                - productId: "prod_456"
                  quantity: 2
      responses:
        "201":
          description: Order created
          headers:
            Location:
              description: URL of the newly created order
              schema:
                type: string
                format: uri
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"
        "400":
          $ref: "#/components/responses/BadRequest"
        "422":
          $ref: "#/components/responses/ValidationError"
```

## Components and Schemas

The `components` section is where you define reusable building blocks. Reference them with `$ref` to avoid duplication.

```yaml
components:
  schemas:
    Order:
      type: object
      required: [id, customerId, status, total, createdAt]
      properties:
        id:
          type: string
          description: Unique order identifier
          example: "ord_789"
        customerId:
          type: string
          example: "cust_123"
        status:
          $ref: "#/components/schemas/OrderStatus"
        items:
          type: array
          items:
            $ref: "#/components/schemas/OrderItem"
        total:
          type: number
          format: float
          minimum: 0
          example: 49.99
        createdAt:
          type: string
          format: date-time
          example: "2026-04-02T10:30:00Z"

    OrderStatus:
      type: string
      enum: [pending, processing, shipped, delivered, cancelled]

    OrderItem:
      type: object
      required: [productId, quantity, price]
      properties:
        productId:
          type: string
        quantity:
          type: integer
          minimum: 1
        price:
          type: number
          format: float

    CreateOrderInput:
      type: object
      required: [customerId, items]
      properties:
        customerId:
          type: string
        items:
          type: array
          minItems: 1
          items:
            type: object
            required: [productId, quantity]
            properties:
              productId:
                type: string
              quantity:
                type: integer
                minimum: 1

    ProblemDetail:
      type: object
      properties:
        type:
          type: string
          format: uri
        title:
          type: string
        status:
          type: integer
        detail:
          type: string

    OrderListResponse:
      type: object
      properties:
        data:
          type: array
          items:
            $ref: "#/components/schemas/Order"
        pagination:
          type: object
          properties:
            next_cursor:
              type: string
              nullable: true
            has_next:
              type: boolean
            total:
              type: integer

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    BadRequest:
      description: Malformed request
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ProblemDetail"
```

## Using `allOf`, `oneOf`, and `anyOf`

OpenAPI 3.1's JSON Schema alignment means you can use composition keywords:

```yaml
# allOf — extends a base schema
OrderWithCustomer:
  allOf:
    - $ref: "#/components/schemas/Order"
    - type: object
      properties:
        customer:
          $ref: "#/components/schemas/Customer"

# oneOf — exactly one of these schemas must match
PaymentMethod:
  oneOf:
    - $ref: "#/components/schemas/CreditCard"
    - $ref: "#/components/schemas/BankTransfer"
    - $ref: "#/components/schemas/Crypto"
  discriminator:
    propertyName: type
    mapping:
      card: "#/components/schemas/CreditCard"
      bank: "#/components/schemas/BankTransfer"
      crypto: "#/components/schemas/Crypto"
```

## Security Schemes

Define authentication in `components/securitySchemes`, then apply globally or per-operation:

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            orders:read: Read orders
            orders:write: Create and modify orders

security:
  - BearerAuth: []  # Applied globally

paths:
  /public/health:
    get:
      security: []  # Override: no auth required
```

## Code Generation with openapi-generator

Once your spec is written, generate server stubs and client SDKs:

```bash
# Install
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript Axios client
openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g typescript-axios \
  -o ./generated/client

# Generate Node.js Express server stub
openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g nodejs-express-server \
  -o ./generated/server

# Generate Python client
openapi-generator-cli generate \
  -i ./openapi.yaml \
  -g python \
  -o ./generated/python-client
```

For TypeScript specifically, `openapi-typescript` is a lighter alternative that generates types only (not a full client):

```bash
npx openapi-typescript ./openapi.yaml -o ./types/api.d.ts
```

## Swagger UI Setup

Add interactive documentation to your Node.js app:

```javascript
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const app = express();
const spec = YAML.load('./openapi.yaml');

app.use('/docs', swaggerUi.serve, swaggerUi.setup(spec, {
  customSiteTitle: 'Orders API Docs',
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true
  }
}));
```

For a more modern alternative, use **Scalar** or **Redoc**:

```javascript
import { apiReference } from '@scalar/express-api-reference';

app.use('/docs', apiReference({
  spec: { url: '/openapi.yaml' },
  theme: 'purple'
}));
```

## Linting with Spectral

Spectral validates your spec against best-practice rules:

```bash
npm install -g @stoplight/spectral-cli

# Run against your spec
spectral lint openapi.yaml

# Use a ruleset
spectral lint openapi.yaml --ruleset .spectral.yaml
```

Custom `.spectral.yaml` example:

```yaml
extends: ["spectral:oas"]
rules:
  operation-tag-defined: error
  operation-operationId: error
  info-contact: warn
  no-$ref-siblings: error
```

Add Spectral to your CI pipeline to catch spec regressions before they ship.

## Summary

A strong OpenAPI spec is one of the highest-leverage investments in your API lifecycle. Write it before coding, keep it as your source of truth, and generate everything else — docs, SDKs, server stubs, and contract tests — from it. The initial investment pays back tenfold in team alignment and reduced integration bugs.
