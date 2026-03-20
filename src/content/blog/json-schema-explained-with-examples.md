---
title: "JSON Schema Explained with Examples: The Complete Guide"
description: "Learn JSON Schema from scratch with practical examples. Understand types, validation keywords, composition, and how to validate API payloads and config files."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["json-schema", "json", "api-validation", "data-validation", "javascript"]
readingTime: "13 min read"
---

JSON is everywhere. It powers REST APIs, configuration files, message queues, and data storage across virtually every modern application. But raw JSON has a problem: it has no built-in way to describe what shape the data should take. Enter **JSON Schema** — a powerful vocabulary for annotating and validating JSON documents.

In this complete guide, you will learn JSON Schema from the ground up. We will cover every major concept with practical, copy-paste-ready examples so you can start validating your own JSON data today.

---

## What Is JSON Schema?

**JSON Schema** is a declarative language for describing the structure and constraints of JSON data. It is itself written in JSON, which means it is both human-readable and machine-processable.

A JSON Schema document answers questions like:

- What type should this field be?
- Which fields are required?
- What range of values is acceptable for a number?
- Must a string match a specific format or pattern?
- Can a value come only from a fixed list of options?

JSON Schema is standardized through a series of drafts published at [json-schema.org](https://json-schema.org). As of 2024, the most widely adopted versions are **Draft 7** and **Draft 2020-12**. Many validators and tooling ecosystems support one or both.

### Why Use JSON Schema?

Without JSON Schema, you rely on ad hoc validation code scattered across your application. This leads to:

- **Inconsistent validation** — different endpoints enforce different rules
- **Poor documentation** — the shape of the data only lives inside function bodies
- **Hard-to-catch bugs** — a missing required field slips through at runtime

JSON Schema solves all three problems:

1. **Single source of truth** — define your data contract once, reference it everywhere
2. **Auto-documentation** — tools like Swagger/OpenAPI consume JSON Schema directly
3. **Shift-left validation** — catch bad data at the boundary before it reaches your database

---

## The `$schema` Keyword

Every JSON Schema document should declare which draft it targets using the `$schema` keyword:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema"
}
```

This tells validators which version of JSON Schema rules to apply. When building reusable schemas, always include `$schema` so tooling knows exactly how to interpret your document.

---

## Basic Types in JSON Schema

JSON Schema supports six primitive types, mirroring JSON's own type system.

### `string`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "string"
}
```

**Valid:** `"hello"`, `""`
**Invalid:** `42`, `true`, `null`

### `number` and `integer`

`number` accepts both integers and floating-point values. `integer` accepts only whole numbers.

```json
{ "type": "number" }
```

**Valid:** `3.14`, `42`, `-7`
**Invalid:** `"42"`, `true`

```json
{ "type": "integer" }
```

**Valid:** `0`, `100`, `-5`
**Invalid:** `3.14`, `"10"`

### `boolean`

```json
{ "type": "boolean" }
```

**Valid:** `true`, `false`
**Invalid:** `1`, `"true"`, `null`

### `null`

```json
{ "type": "null" }
```

**Valid:** `null`
**Invalid:** `0`, `""`, `false`

### `array`

```json
{ "type": "array" }
```

**Valid:** `[]`, `[1, 2, 3]`, `["a", "b"]`
**Invalid:** `{}`, `"array"`, `null`

### `object`

```json
{ "type": "object" }
```

**Valid:** `{}`, `{ "key": "value" }`
**Invalid:** `[]`, `"object"`, `42`

---

## Core Validation Keywords

Now that you understand the types, let us look at the keywords that put constraints on those types.

### `required`

Use `required` to list properties that must be present in an object. It takes an array of strings.

```json
{
  "type": "object",
  "required": ["username", "email"],
  "properties": {
    "username": { "type": "string" },
    "email": { "type": "string" },
    "age": { "type": "integer" }
  }
}
```

**Valid:**
```json
{ "username": "vic", "email": "vic@example.com" }
{ "username": "alice", "email": "alice@example.com", "age": 30 }
```

**Invalid:**
```json
{ "username": "bob" }
```
*(Missing `email`)*

### `properties`

`properties` is a map of property names to their schemas. It defines the expected structure of an object. Note that properties not listed in `properties` are still allowed by default — to restrict extra fields, use `additionalProperties: false`.

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "active": { "type": "boolean" }
  },
  "additionalProperties": false
}
```

### `minimum` and `maximum`

Apply numeric bounds to a `number` or `integer` field.

```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 100
}
```

**Valid:** `1`, `50`, `100`
**Invalid:** `0`, `101`, `-5`

For exclusive bounds, use `exclusiveMinimum` and `exclusiveMaximum`:

```json
{
  "type": "number",
  "exclusiveMinimum": 0,
  "exclusiveMaximum": 1
}
```

**Valid:** `0.5`, `0.001`, `0.999`
**Invalid:** `0`, `1`

### `minLength` and `maxLength`

Constrain the length of a string.

```json
{
  "type": "string",
  "minLength": 3,
  "maxLength": 20
}
```

**Valid:** `"vic"`, `"hello world"`
**Invalid:** `"ab"`, `"this string is way too long for the constraint"`

### `pattern`

Validate a string against a regular expression (ECMA 262 dialect).

```json
{
  "type": "string",
  "pattern": "^[a-zA-Z0-9_]+$"
}
```

**Valid:** `"user_123"`, `"AlphaNumeric"`
**Invalid:** `"has space"`, `"special@char"`

A common use is validating date strings:

```json
{
  "type": "string",
  "pattern": "^\\d{4}-\\d{2}-\\d{2}$"
}
```

**Valid:** `"2026-03-20"`
**Invalid:** `"20-03-2026"`, `"March 20"`

### `enum`

Restrict a value to a fixed set of allowed options. Works on any type.

```json
{
  "type": "string",
  "enum": ["pending", "active", "suspended", "deleted"]
}
```

**Valid:** `"active"`, `"pending"`
**Invalid:** `"enabled"`, `"ACTIVE"`

### `default`

Provide a default value for documentation purposes. Most validators do not automatically apply defaults, but tooling like OpenAPI generators will use this to populate example payloads.

```json
{
  "type": "boolean",
  "default": false
}
```

---

## Validating Arrays in Detail

Arrays have their own set of validation keywords.

### `items`

Defines the schema that every element in the array must match.

```json
{
  "type": "array",
  "items": { "type": "string" }
}
```

**Valid:** `["apple", "banana", "cherry"]`, `[]`
**Invalid:** `["apple", 42, "cherry"]`

### `minItems` and `maxItems`

```json
{
  "type": "array",
  "items": { "type": "integer" },
  "minItems": 1,
  "maxItems": 5
}
```

**Valid:** `[1]`, `[1, 2, 3]`
**Invalid:** `[]`, `[1, 2, 3, 4, 5, 6]`

### `uniqueItems`

Ensure all elements in the array are distinct.

```json
{
  "type": "array",
  "items": { "type": "string" },
  "uniqueItems": true
}
```

**Valid:** `["read", "write", "delete"]`
**Invalid:** `["read", "write", "read"]`

---

## Combining Schemas: `allOf`, `anyOf`, `oneOf`

JSON Schema provides three keywords for combining multiple schemas — analogous to logical AND, OR, and XOR.

### `allOf`

The data must be valid against **all** listed schemas.

```json
{
  "allOf": [
    { "type": "object", "required": ["id"] },
    { "type": "object", "required": ["name"] }
  ]
}
```

**Valid:** `{ "id": 1, "name": "Vic" }`
**Invalid:** `{ "id": 1 }` *(missing `name`)*

### `anyOf`

The data must be valid against **at least one** of the listed schemas.

```json
{
  "anyOf": [
    { "type": "string" },
    { "type": "integer" }
  ]
}
```

**Valid:** `"hello"`, `42`
**Invalid:** `3.14`, `true`, `null`

### `oneOf`

The data must be valid against **exactly one** of the listed schemas. This is useful when schemas are mutually exclusive.

```json
{
  "oneOf": [
    { "type": "integer", "minimum": 0 },
    { "type": "string", "minLength": 1 }
  ]
}
```

**Valid:** `5`, `"hello"`
**Invalid:** `"a"` is valid for the second but not the first — it passes. However, `5.5` fails both, and a value satisfying both schemas simultaneously would also fail.

### `not`

Reject data that matches a given schema.

```json
{
  "not": { "type": "null" }
}
```

**Valid:** `"anything"`, `0`, `false`
**Invalid:** `null`

---

## Real-World Example 1: API Request Validation

Suppose you are building an endpoint to create a new user account. The request body must include `username`, `email`, and `password`, with specific constraints on each.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://api.example.com/schemas/create-user.json",
  "title": "Create User Request",
  "description": "Payload for POST /users",
  "type": "object",
  "required": ["username", "email", "password"],
  "additionalProperties": false,
  "properties": {
    "username": {
      "type": "string",
      "minLength": 3,
      "maxLength": 30,
      "pattern": "^[a-zA-Z0-9_-]+$",
      "description": "Alphanumeric username, underscores and dashes allowed"
    },
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 254
    },
    "password": {
      "type": "string",
      "minLength": 8,
      "maxLength": 128
    },
    "role": {
      "type": "string",
      "enum": ["user", "moderator", "admin"],
      "default": "user"
    },
    "age": {
      "type": "integer",
      "minimum": 13,
      "maximum": 120
    }
  }
}
```

**Valid request body:**
```json
{
  "username": "vic_nail",
  "email": "vic@example.com",
  "password": "S3cur3P@ss!"
}
```

**Invalid — missing required fields:**
```json
{
  "username": "vic_nail"
}
```

**Invalid — username has a space:**
```json
{
  "username": "vic nail",
  "email": "vic@example.com",
  "password": "S3cur3P@ss!"
}
```

Once you have your schema ready, you can use a tool like the [API Request Builder](/tools/api-request-builder) to test APIs with JSON Schema validation directly in your browser — no setup required.

---

## Real-World Example 2: Configuration File Validation

Configuration files are a perfect use case for JSON Schema. A mistyped key or wrong type in a config can silently break your entire application. Here is a schema for a server configuration file:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/server-config.json",
  "title": "Server Configuration",
  "type": "object",
  "required": ["host", "port", "database"],
  "additionalProperties": false,
  "properties": {
    "host": {
      "type": "string",
      "default": "localhost"
    },
    "port": {
      "type": "integer",
      "minimum": 1,
      "maximum": 65535,
      "default": 3000
    },
    "debug": {
      "type": "boolean",
      "default": false
    },
    "logLevel": {
      "type": "string",
      "enum": ["error", "warn", "info", "debug", "verbose"],
      "default": "info"
    },
    "database": {
      "type": "object",
      "required": ["host", "port", "name"],
      "additionalProperties": false,
      "properties": {
        "host": { "type": "string" },
        "port": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535
        },
        "name": { "type": "string", "minLength": 1 },
        "ssl": { "type": "boolean", "default": false },
        "poolSize": {
          "type": "integer",
          "minimum": 1,
          "maximum": 100,
          "default": 10
        }
      }
    },
    "allowedOrigins": {
      "type": "array",
      "items": { "type": "string" },
      "uniqueItems": true
    }
  }
}
```

**Valid config:**
```json
{
  "host": "0.0.0.0",
  "port": 8080,
  "debug": true,
  "logLevel": "debug",
  "database": {
    "host": "db.internal",
    "port": 5432,
    "name": "myapp_prod",
    "ssl": true
  },
  "allowedOrigins": ["https://app.example.com", "https://admin.example.com"]
}
```

**Invalid — port out of range:**
```json
{
  "host": "0.0.0.0",
  "port": 99999,
  "database": { "host": "db.internal", "port": 5432, "name": "myapp" }
}
```

**Invalid — unknown logLevel:**
```json
{
  "host": "0.0.0.0",
  "port": 3000,
  "logLevel": "trace",
  "database": { "host": "db.internal", "port": 5432, "name": "myapp" }
}
```

When debugging configurations with nested fields, it helps to [compare your JSON schemas](/tools/json-diff-viewer) side by side to spot the differences between a working and a broken config.

---

## Real-World Example 3: Form Validation Schema

JSON Schema is increasingly used on the front end to power dynamic form validation. Libraries like `react-jsonschema-form` and `Ajv` render and validate forms directly from a schema definition.

Here is a checkout form schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Checkout Form",
  "type": "object",
  "required": ["firstName", "lastName", "email", "address", "paymentMethod"],
  "properties": {
    "firstName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "title": "First Name"
    },
    "lastName": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "title": "Last Name"
    },
    "email": {
      "type": "string",
      "format": "email",
      "title": "Email Address"
    },
    "phone": {
      "type": "string",
      "pattern": "^\\+?[1-9]\\d{1,14}$",
      "title": "Phone Number (E.164 format)"
    },
    "address": {
      "type": "object",
      "required": ["line1", "city", "country", "postalCode"],
      "properties": {
        "line1": { "type": "string", "minLength": 1 },
        "line2": { "type": "string" },
        "city": { "type": "string", "minLength": 1 },
        "state": { "type": "string" },
        "country": {
          "type": "string",
          "pattern": "^[A-Z]{2}$",
          "description": "ISO 3166-1 alpha-2 country code"
        },
        "postalCode": { "type": "string", "minLength": 1 }
      }
    },
    "paymentMethod": {
      "type": "string",
      "enum": ["credit_card", "paypal", "bank_transfer"],
      "title": "Payment Method"
    },
    "saveDetails": {
      "type": "boolean",
      "default": false,
      "title": "Save for future orders"
    }
  }
}
```

Using `anyOf`, you can even make certain fields conditionally required. For example, requiring `cardNumber` only when `paymentMethod` is `credit_card`:

```json
{
  "anyOf": [
    {
      "properties": { "paymentMethod": { "const": "credit_card" } },
      "required": ["cardNumber", "cardExpiry", "cardCvc"]
    },
    {
      "properties": {
        "paymentMethod": { "enum": ["paypal", "bank_transfer"] }
      }
    }
  ]
}
```

---

## Using `$ref` for Schema Reuse

As your schemas grow, you will want to avoid repeating yourself. The `$ref` keyword lets you reference a schema definition defined elsewhere — either in the same document under `$defs` (Draft 2020-12) or in a separate file.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$defs": {
    "Address": {
      "type": "object",
      "required": ["city", "country"],
      "properties": {
        "line1": { "type": "string" },
        "city": { "type": "string" },
        "country": { "type": "string", "pattern": "^[A-Z]{2}$" }
      }
    }
  },
  "type": "object",
  "properties": {
    "billingAddress": { "$ref": "#/$defs/Address" },
    "shippingAddress": { "$ref": "#/$defs/Address" }
  }
}
```

This keeps your schema DRY and makes it easier to maintain a single `Address` definition that is reused across multiple places.

---

## Validating JWT Payloads with JSON Schema

JWT tokens carry a JSON payload (claims) that your server must validate. Beyond signature verification, you should also validate the shape of the claims with JSON Schema.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JWT Claims",
  "type": "object",
  "required": ["sub", "iat", "exp", "role"],
  "properties": {
    "sub": { "type": "string", "minLength": 1 },
    "iat": { "type": "integer" },
    "exp": { "type": "integer" },
    "role": {
      "type": "string",
      "enum": ["user", "moderator", "admin"]
    },
    "email": { "type": "string", "format": "email" }
  }
}
```

You can inspect and decode JWT tokens directly with the [JWT Decoder](/tools/jwt-decoder) to check whether your claims match the expected schema before wiring up server-side validation.

---

## Popular JSON Schema Validators

JSON Schema has mature implementations in virtually every language:

| Language | Library |
|---|---|
| JavaScript / Node.js | Ajv, @cfworker/json-schema |
| Python | jsonschema, fastjsonschema |
| Go | gojsonschema, santhosh-tekuri/jsonschema |
| Java | networknt/json-schema-validator |
| Ruby | json_schemer |
| PHP | opis/json-schema |
| Rust | jsonschema-rs |

**Ajv example (Node.js):**

```javascript
import Ajv from "ajv";

const ajv = new Ajv();

const schema = {
  type: "object",
  required: ["username", "email"],
  properties: {
    username: { type: "string", minLength: 3 },
    email: { type: "string", format: "email" },
  },
};

const validate = ajv.compile(schema);

const data = { username: "vic", email: "vic@example.com" };

if (validate(data)) {
  console.log("Valid!");
} else {
  console.log("Errors:", validate.errors);
}
```

**Python example:**

```python
import jsonschema

schema = {
    "type": "object",
    "required": ["username", "email"],
    "properties": {
        "username": {"type": "string", "minLength": 3},
        "email": {"type": "string"},
    },
}

data = {"username": "vic", "email": "vic@example.com"}

jsonschema.validate(instance=data, schema=schema)  # raises if invalid
```

---

## JSON Schema and OpenAPI

If you are building REST APIs, you have likely encountered OpenAPI (formerly Swagger). OpenAPI uses a **dialect of JSON Schema** to define request bodies, response payloads, and query parameters. When you write an OpenAPI spec, you are essentially writing JSON Schema embedded inside a larger API description document.

This means mastering JSON Schema directly improves your ability to write precise, well-documented OpenAPI specs — and by extension, auto-generate SDKs, mock servers, and API documentation.

---

## Common Mistakes to Avoid

**1. Forgetting `required`**
Defining `properties` does not make them required. Always explicitly list required fields.

**2. Using `additionalProperties: false` without `properties`**
This rejects every property, making your schema accept only empty objects.

**3. Confusing `anyOf` and `oneOf`**
`anyOf` passes if one or more schemas match. `oneOf` passes only if exactly one matches. For mutually exclusive types, use `oneOf`.

**4. Mixing Draft versions**
A schema written for Draft 7 may behave differently under Draft 2020-12. Always set `$schema` and use a validator that targets the same draft.

**5. Ignoring `format` validation**
`format: "email"` is a hint, not an enforced constraint by default. Enable format validation explicitly in your validator (e.g., `new Ajv({ formats: require("ajv-formats") })`).

---

## Summary

JSON Schema gives you a precise, language-agnostic way to describe and validate the shape of JSON data. Here is what we covered:

- **`$schema`** — declare the target draft
- **Types** — `string`, `number`, `integer`, `boolean`, `array`, `object`, `null`
- **Object keywords** — `required`, `properties`, `additionalProperties`
- **String keywords** — `minLength`, `maxLength`, `pattern`, `format`
- **Number keywords** — `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`
- **Array keywords** — `items`, `minItems`, `maxItems`, `uniqueItems`
- **Value keywords** — `enum`, `default`, `const`
- **Combining keywords** — `allOf`, `anyOf`, `oneOf`, `not`
- **Reuse** — `$ref` and `$defs`
- **Real-world applications** — API validation, config files, forms, JWT claims

Whether you are building a public API, a configuration system, or a dynamic form, JSON Schema is the tool that turns implicit data assumptions into explicit, testable contracts.

---

## Try It Free at DevPlaybook.cc

Ready to put JSON Schema into practice? DevPlaybook.cc has everything you need:

- **[JSON Diff Viewer](/tools/json-diff-viewer)** — compare your JSON schemas side by side, spot regressions instantly
- **[API Request Builder](/tools/api-request-builder)** — test APIs with JSON Schema validation without writing a single line of setup code
- **[JWT Decoder](/tools/jwt-decoder)** — decode and inspect JWT payloads to verify your claims schema

All tools are available instantly in your browser — no account required, no install, no configuration.

**Try it free at [devplaybook.cc](https://devplaybook.cc) and take your JSON validation workflow to the next level.**
