---
title: "PKL: Apple's Type-Safe Configuration Language for Developers 2026"
description: "PKL by Apple solves YAML/JSON/TOML pain points with a type-safe, composable config language. Learn PKL features, CLI usage, Kubernetes examples, and how it compares to CUE, Dhall, and Jsonnet."
pubDate: 2026-03-28
tags: ["pkl", "configuration", "apple", "type-safe", "kubernetes"]
---

Configuration management is one of those problems that doesn't announce itself loudly — it accumulates quietly until a mistyped YAML key ships a broken deployment to production, or a missing required field only surfaces at runtime. Apple's PKL (pronounced "pickle") is a purpose-built configuration language designed to replace the ad-hoc YAML/JSON/TOML ecosystem with something that has actual types, validation, and composability baked in.

This article covers what PKL is, what problems it solves, and how to use it — with real code examples for Kubernetes, app config, and CI/CD pipelines.

---

## The Problem: Why YAML, JSON, and TOML Fall Short

Before diving into PKL, it's worth being precise about what's broken.

**YAML** is human-friendly but treacherous at scale. It has no type system — a port number written as `8080` is a string in some parsers and an integer in others. Indentation errors silently corrupt structure. The Norway problem (`NO` parsing as `false`) has burned real teams. There's no way to express "this field is required and must be a non-empty string between 3 and 64 characters." You add a comment and hope.

**JSON** strips comments and multi-line strings, making it unsuitable for anything a human touches regularly. There's no native way to reference another value or compose fragments. Copy-paste is the standard pattern for reuse.

**TOML** is readable for simple configs but doesn't scale to nested or dynamic structures. It has no templating, no validation primitives, and no module system.

The workarounds teams use — custom validators, JSON Schema, Helm templating, Kustomize patches — each add layers of tooling that still don't give you a real language. PKL attacks the root cause instead of adding another wrapper.

---

## What PKL Actually Is

PKL is a statically typed, expression-based configuration language open-sourced by Apple in early 2024. It produces JSON, YAML, TOML, or Property List output — it's a generator, not a replacement runtime format. You write config in `.pkl` files, run `pkl eval`, and get standard output formats that your existing infrastructure can consume.

Key design choices:

- **Static typing** with inference — you declare types and PKL catches mismatches at eval time, not at deployment time
- **Immutability by default** — values don't change after assignment, eliminating mutation bugs
- **Module system** — configs can extend, amend, and import other PKL modules
- **Template/schema separation** — define a schema once, instantiate it in multiple environment-specific files
- **No Turing-completeness by design** — PKL is intentionally not a general-purpose language, which makes configs auditable and termination-guaranteed

---

## Key Features with Code Examples

### 1. Types and Validation

PKL's type system is the headline feature. You can annotate any field with a type, and PKL validates the value at eval time.

```pkl
// app_config.pkl

module AppConfig

/// Application name (3-64 chars, alphanumeric + dash)
name: String(matches(Regex("[a-zA-Z0-9-]{3,64}")))

/// Port must be in valid user-space range
port: Int(isBetween(1024, 65535))

/// Replicas must be positive
replicas: Int(isPositive)

/// Log level enum
logLevel: "debug" | "info" | "warn" | "error"

// Instantiation
name = "my-api-service"
port = 8080
replicas = 3
logLevel = "info"
```

If you set `port = 80`, PKL throws an error at eval time: the value `80` doesn't satisfy `isBetween(1024, 65535)`. You catch this in CI before the config ever reaches a cluster.

### 2. Composition and Amending

PKL has a powerful module system where files can extend base templates and override specific fields — similar to class inheritance but for config.

```pkl
// base_service.pkl
module BaseService

name: String
image: String
port: Int(isBetween(1, 65535))
replicas: Int(isPositive) = 1
env: Mapping<String, String> = new {}

resources {
  cpuRequest = "100m"
  memoryRequest = "128Mi"
  cpuLimit = "500m"
  memoryLimit = "512Mi"
}
```

```pkl
// production_api.pkl
amends "base_service.pkl"

name = "payment-api"
image = "registry.company.com/payment-api:v2.3.1"
port = 8443
replicas = 5

env {
  ["DATABASE_URL"] = "postgres://prod-db:5432/payments"
  ["CACHE_TTL"] = "300"
}

resources {
  cpuRequest = "250m"
  memoryRequest = "512Mi"
  cpuLimit = "2000m"
  memoryLimit = "2Gi"
}
```

The `amends` keyword pulls in all defaults from `base_service.pkl` and lets you override exactly what differs. Fields you don't touch stay at their base values. This is the pattern Helm templates approximate with 200 lines of `{{ if .Values.something }}` syntax — PKL does it cleanly in a dozen lines.

### 3. Listings and Mappings

PKL has proper collection types — `Listing` (ordered) and `Mapping` (key-value) — with typed elements.

```pkl
// database_config.pkl

databases: Listing<DatabaseConfig> = new {
  new {
    host = "primary.db.internal"
    port = 5432
    name = "app_production"
    poolSize = 20
  }
  new {
    host = "replica-1.db.internal"
    port = 5432
    name = "app_production"
    poolSize = 10
    readOnly = true
  }
}

class DatabaseConfig {
  host: String
  port: Int = 5432
  name: String
  poolSize: Int(isBetween(1, 100)) = 5
  readOnly: Boolean = false
}
```

### 4. Computed Values and Interpolation

PKL supports string interpolation and computed fields that reference other values in the same module.

```pkl
// service_config.pkl

environment: "production"
region: "us-east-1"

// Computed field — no duplication
serviceEndpoint: String = "https://api-\(environment)-\(region).company.com"

// Conditional expression
logLevel: String = if (environment == "production") "warn" else "debug"

// This evaluates to: "https://api-production-us-east-1.company.com"
```

---

## Real-World: Kubernetes Manifests with PKL

PKL ships with first-class Kubernetes package support via `pkl-pantry` (the official package registry). Here's generating a Deployment manifest:

```pkl
// k8s_deployment.pkl
import "package://pkg.pkl-lang.org/pkl-k8s/k8s@1.0.1#/api/apps/v1/Deployment.pkl"

res: Deployment = new {
  metadata {
    name = "web-frontend"
    namespace = "production"
    labels {
      ["app"] = "web-frontend"
      ["version"] = "v3.1.0"
      ["managed-by"] = "pkl"
    }
  }
  spec {
    replicas = 4
    selector {
      matchLabels {
        ["app"] = "web-frontend"
      }
    }
    template {
      metadata {
        labels {
          ["app"] = "web-frontend"
        }
      }
      spec {
        containers {
          new {
            name = "frontend"
            image = "gcr.io/company/web-frontend:v3.1.0"
            ports {
              new { containerPort = 3000 }
            }
            resources {
              requests {
                ["cpu"] = "100m"
                ["memory"] = "256Mi"
              }
              limits {
                ["cpu"] = "500m"
                ["memory"] = "512Mi"
              }
            }
            env {
              new {
                name = "NODE_ENV"
                value = "production"
              }
              new {
                name = "API_URL"
                valueFrom {
                  configMapKeyRef {
                    name = "frontend-config"
                    key = "api-url"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

Run `pkl eval --format yaml k8s_deployment.pkl` to get a valid, type-checked Kubernetes YAML manifest. Any field that doesn't match the Kubernetes schema (port out of range, unknown field name, wrong type) throws an error before the file is generated.

For multi-environment deployments, create a base template and amend per environment:

```pkl
// base_deployment.pkl
module BaseDeployment

appName: String
imageTag: String
replicas: Int = 1
namespace: String = "default"
```

```pkl
// staging.pkl
amends "base_deployment.pkl"

appName = "payment-service"
imageTag = "v2.1.0-rc1"
replicas = 2
namespace = "staging"
```

```pkl
// production.pkl
amends "base_deployment.pkl"

appName = "payment-service"
imageTag = "v2.1.0"
replicas = 8
namespace = "production"
```

---

## Installation and CLI Usage

### Installing PKL CLI

**macOS (Homebrew):**
```bash
brew install pkl
```

**Linux (direct binary):**
```bash
curl -L -o pkl "https://github.com/apple/pkl/releases/download/0.26.0/pkl-linux-amd64"
chmod +x pkl
sudo mv pkl /usr/local/bin/
```

**Windows (via Scoop):**
```powershell
scoop install pkl
```

**Verify:**
```bash
pkl --version
# pkl 0.26.0
```

### Core CLI Commands

**Evaluate a PKL file to YAML:**
```bash
pkl eval --format yaml config.pkl
```

**Evaluate to JSON:**
```bash
pkl eval --format json config.pkl -o output.json
```

**Evaluate multiple files:**
```bash
pkl eval --format yaml k8s/*.pkl
```

**Initialize a new PKL project:**
```bash
pkl project init
```

**Download package dependencies:**
```bash
pkl project package
```

**Validate without output (useful in CI):**
```bash
pkl eval config.pkl --output-path /dev/null
```

### PKL Project Structure

For non-trivial configs, `PklProject` file defines the module:

```pkl
// PklProject
amends "pkl:Project"

package {
  name = "my-infra-config"
  baseUri = "package://config.company.com/infra-config"
  version = "1.2.0"
  packageZipUrl = "https://config.company.com/infra-config/\(version)/infra-config-\(version).zip"
}
```

---

## PKL vs YAML vs CUE vs Dhall vs Jsonnet

| Feature | YAML | JSON | TOML | PKL | CUE | Dhall | Jsonnet |
|---|---|---|---|---|---|---|---|
| Static types | No | No | Partial | Yes | Yes | Yes | No |
| Validation built-in | No | No | No | Yes | Yes | Yes | No |
| Imports / modules | No | No | No | Yes | Yes | Yes | Yes |
| Templating / composition | No | No | No | Yes | Yes | Yes | Yes |
| Comments | Yes | No | Yes | Yes | No | Yes | Yes |
| Human-readable output | Native | Native | Native | Generates YAML/JSON | Generates | Generates | Generates JSON |
| Learning curve | Low | Low | Low | Medium | High | High | Medium |
| Turing complete | No | No | No | No | No | No | Yes |
| Kubernetes support | Native | N/A | N/A | pkg-pantry | Native | Via lib | Via lib |
| IDE support | Good | Good | Good | VS Code | VS Code | VS Code | Limited |
| Active maintenance | Community | Community | Community | Apple | CNCF | Community | Google |

**CUE** is the closest conceptual competitor — it's a superset of JSON with types and constraints and has deep Kubernetes tooling. CUE's data/schema unification model is more powerful for certain validation scenarios but has a steep learning curve and unfamiliar syntax. PKL is more approachable for teams coming from YAML.

**Dhall** is fully type-safe and strongly normalizing (guaranteed to terminate), which makes it excellent for provable correctness. The syntax is Haskell-influenced and feels foreign to most developers. Its ecosystem is smaller and the output is primarily JSON/YAML via `dhall-to-yaml`.

**Jsonnet** extends JSON with functions, variables, and imports, and is widely used in the Grafana and Kubernetes ecosystems (Tanka). It's Turing-complete, which gives maximum flexibility but also means configs can have runtime errors or infinite loops. No static types.

For most teams migrating from YAML to something better, PKL offers the best balance: genuine type safety, a readable syntax, excellent Kubernetes support, and Apple's backing as a long-term maintainer.

---

## VS Code Extension Setup

The official PKL VS Code extension provides syntax highlighting, type checking, and go-to-definition for imports.

**Install from VS Code:**
1. Open Extensions panel (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for `pkl`
3. Install "PKL" by Apple

**Or via CLI:**
```bash
code --install-extension apple.pkl
```

The extension requires the PKL CLI to be on your PATH — install it first. Once both are installed, `.pkl` files get:

- Syntax highlighting
- Inline type errors as you type
- Hover documentation for built-in functions and types
- Auto-complete for module fields
- Go-to-definition for `amends` and `import` paths

For `.pkl` files that generate YAML, add this to `.vscode/settings.json` for the best experience:

```json
{
  "pkl.cli.path": "/usr/local/bin/pkl",
  "editor.formatOnSave": true,
  "[pkl]": {
    "editor.defaultFormatter": "apple.pkl"
  }
}
```

---

## CI/CD Pipeline Integration

### GitHub Actions

```yaml
# .github/workflows/validate-config.yml
name: Validate PKL Configs

on:
  pull_request:
    paths:
      - 'config/**/*.pkl'
      - 'k8s/**/*.pkl'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install PKL
        run: |
          curl -L -o pkl "https://github.com/apple/pkl/releases/download/0.26.0/pkl-linux-amd64"
          chmod +x pkl
          sudo mv pkl /usr/local/bin/

      - name: Validate all PKL configs
        run: |
          find config/ k8s/ -name "*.pkl" | xargs -I{} pkl eval {} --output-path /dev/null

      - name: Generate Kubernetes manifests
        run: |
          mkdir -p dist/k8s
          pkl eval --format yaml k8s/production/*.pkl -o dist/k8s/

      - name: Upload generated manifests
        uses: actions/upload-artifact@v4
        with:
          name: k8s-manifests
          path: dist/k8s/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
validate-pkl:
  stage: validate
  image: ubuntu:22.04
  before_script:
    - curl -L -o /usr/local/bin/pkl "https://github.com/apple/pkl/releases/download/0.26.0/pkl-linux-amd64"
    - chmod +x /usr/local/bin/pkl
  script:
    - find config/ -name "*.pkl" | xargs -I{} pkl eval {} --output-path /dev/null
    - pkl eval --format yaml k8s/staging/*.pkl -o dist/staging/
  artifacts:
    paths:
      - dist/
    expire_in: 1 week
  rules:
    - changes:
        - "**/*.pkl"
```

### Makefile Integration

For local development, a simple Makefile target:

```makefile
PKL := pkl
CONFIG_DIR := config
K8S_DIR := k8s
DIST_DIR := dist

.PHONY: validate generate clean

validate:
	find $(CONFIG_DIR) $(K8S_DIR) -name "*.pkl" | xargs -I{} $(PKL) eval {} --output-path /dev/null
	@echo "All PKL configs valid."

generate: validate
	mkdir -p $(DIST_DIR)/k8s
	$(PKL) eval --format yaml $(K8S_DIR)/production/*.pkl -o $(DIST_DIR)/k8s/

clean:
	rm -rf $(DIST_DIR)
```

---

## Practical Migration Strategy

Migrating an existing YAML-heavy codebase to PKL doesn't have to happen all at once. A sensible path:

1. **Start with the most error-prone configs** — Kubernetes manifests with many optional fields, app configs with dozens of environment variables, anything that's caused a production incident due to a config mistake.

2. **Write schemas first** — Create `.pkl` class definitions that mirror your existing structure. This forces you to document what's actually required vs optional and what the valid ranges are.

3. **Amend pattern for environments** — Replace `base.yaml` + env-specific patches with a base PKL template and `amends` files per environment. The diff is much smaller and the inheritance is explicit.

4. **Add to CI first** — Run PKL validation in CI before running generators. Catch errors on PRs without changing the final YAML output format yet.

5. **Generate YAML/JSON as output** — Keep your existing deployment tooling (kubectl, Helm, Terraform) consuming standard formats. PKL generates these — you don't need to change downstream tooling.

---

## When PKL Makes Sense

PKL is worth adopting if your team has experienced any of: production incidents caused by config errors, significant YAML duplication across environments, lack of validation until deployment, or custom validation scripts that are themselves untested.

It's less compelling for simple, static configs that rarely change and are managed by a single person. The overhead of learning PKL syntax and tooling is real — it pays off at scale.

For teams already using CUE or Dhall, switching to PKL is probably not worth the migration cost unless the ergonomics gap matters to you. For teams currently on raw YAML or JSON with no validation layer, PKL is one of the most practical upgrades available in 2026.

The PKL repository is at `github.com/apple/pkl`, the package registry (Pkl-Pantry) at `github.com/apple/pkl-pantry`, and the documentation at `pkl-lang.org`. The project has been in active development since the open-source release and has official packages for Kubernetes, Spring Boot, and several cloud providers.
