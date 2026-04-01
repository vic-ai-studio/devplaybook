---
title: "CI/CD Pipeline Optimization: Speed Up GitHub Actions & Jenkins"
description: "CI/CD pipeline optimization guide: caching dependencies, parallel jobs, docker layer caching, test splitting, artifact reuse, GitHub Actions matrix, and reducing build times by 50-80%."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["CI/CD", "GitHub Actions", "Jenkins", "pipeline optimization", "Docker", "caching", "DevOps"]
readingTime: "10 min read"
category: "devops"
---

Slow CI/CD pipelines destroy developer productivity. A 20-minute build means developers switch context, lose focus, and often push more commits before the first one is verified — creating a feedback loop of queued failures. Optimizing your pipeline from 20 minutes to 4 minutes is not a luxury; it is a productivity multiplier that compounds across every engineer on your team every single day.

This guide covers the concrete techniques that consistently yield 50–80% build time reductions in real projects.

## 1. Cache Dependencies Aggressively

Dependency installation is usually the single largest time sink in a pipeline. Cache it.

```yaml
# GitHub Actions — Node.js with npm cache
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: "npm"           # Built-in cache for npm/yarn/pnpm

# Or manually for more control
- name: Cache node_modules
  uses: actions/cache@v4
  id: npm-cache
  with:
    path: node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-

- name: Install dependencies
  if: steps.npm-cache.outputs.cache-hit != 'true'
  run: npm ci
```

```yaml
# Python with pip cache
- name: Cache pip packages
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('requirements*.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-

# Go modules cache
- name: Cache Go modules
  uses: actions/cache@v4
  with:
    path: |
      ~/go/pkg/mod
      ~/.cache/go-build
    key: ${{ runner.os }}-go-${{ hashFiles('go.sum') }}
```

The cache key must include a hash of your lockfile. When dependencies change, the lockfile changes, invalidating the cache and triggering a fresh install. On cache hits, dependency installation drops from 2–3 minutes to under 5 seconds.

## 2. Run Jobs in Parallel

Most pipelines run lint, test, and build sequentially when they could run concurrently. Structure your workflow to fan out where possible and fan in for deployment:

```yaml
jobs:
  # These three jobs run in parallel
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run lint

  type-check:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run type-check

  unit-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:unit

  # This job waits for all three to complete
  integration-tests:
    needs: [lint, type-check, unit-tests]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: npm ci
    - run: npm run test:integration

  # Deploy only after everything passes
  deploy:
    needs: [integration-tests]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
    - run: ./scripts/deploy.sh
```

If lint takes 2 minutes and unit tests take 4 minutes running sequentially that is 6 minutes. Running them in parallel collapses to 4 minutes — the slower of the two.

## 3. Use a Build Matrix for Cross-Platform Testing

Instead of writing separate jobs for each platform or version, use matrix strategy:

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: ["18", "20", "22"]
        exclude:
          # Skip Windows + Node 18 to save runner minutes
          - os: windows-latest
            node: "18"
      fail-fast: false   # Don't cancel all jobs if one fails

    runs-on: ${{ matrix.os }}
    name: Test on ${{ matrix.os }} / Node ${{ matrix.node }}

    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node }}
        cache: "npm"
    - run: npm ci
    - run: npm test
```

`fail-fast: false` is important — if you want full test coverage across all combinations, you need every matrix job to run to completion, not stop at the first failure.

## 4. Docker Layer Caching

Docker builds are often the slowest part of a pipeline. Optimizing your Dockerfile layer order and using GitHub Actions cache or registry cache can cut image build times by 70%+.

**Order layers from least to most frequently changing:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 1. System dependencies (changes rarely)
RUN apk add --no-cache curl

# 2. Package files (changes when dependencies change)
COPY package*.json ./
RUN npm ci --only=production

# 3. Application code (changes on every commit)
COPY . .

RUN npm run build
CMD ["node", "dist/server.js"]
```

**Use GitHub Actions cache for Docker layers:**

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: ${{ env.IMAGE_TAG }}
    cache-from: type=gha           # Read cache from GitHub Actions cache
    cache-to: type=gha,mode=max    # Write all layers to cache
```

The `type=gha` cache backend stores Docker layer cache in GitHub's cache storage (up to 10GB free). For large images, use `type=registry` to cache layers in your container registry instead.

## 5. Split Tests by Duration

Running all tests in a single process is wasteful when you have fast runners that could be processing tests in parallel. Use test splitting tools to distribute your test suite:

```yaml
# Jest with --shard flag (Jest 29+)
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]   # Split into 4 parallel shards
    steps:
    - run: |
        npx jest \
          --shard=${{ matrix.shard }}/4 \
          --coverage \
          --coverageDirectory=coverage/${{ matrix.shard }}

  coverage-merge:
    needs: test
    steps:
    - name: Download all coverage reports
      uses: actions/download-artifact@v4
    - run: npx nyc merge coverage/ merged-coverage.json
```

```yaml
# pytest with pytest-split
- run: |
    pytest --splits 4 --group ${{ matrix.group }} \
      --store-durations  # Track test durations for smarter splitting
```

For a 500-test suite that runs in 8 minutes sequentially, splitting across 4 runners reduces it to approximately 2 minutes — a 4x speedup for the cost of 3 additional runner minutes.

## 6. Reuse Build Artifacts Between Jobs

When multiple jobs need the same built output, build once and share via artifacts:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - run: npm ci && npm run build
    - name: Upload build artifact
      uses: actions/upload-artifact@v4
      with:
        name: dist
        path: dist/
        retention-days: 1

  test-e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Download build artifact
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - run: npm run test:e2e  # Uses pre-built dist, no rebuild needed

  deploy-staging:
    needs: [build, test-e2e]
    steps:
    - uses: actions/download-artifact@v4
      with:
        name: dist
        path: dist/
    - run: ./deploy.sh staging
```

Without artifact reuse, every downstream job would rebuild the application. With artifact reuse, the build happens exactly once.

## 7. Jenkins Pipeline Optimization

For Jenkins users, the equivalent optimizations:

```groovy
pipeline {
  agent none

  options {
    buildDiscarder(logRotator(numToKeepStr: '10'))
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  stages {
    stage('Parallel Checks') {
      parallel {
        stage('Lint') {
          agent { label 'node' }
          steps {
            sh 'npm ci'
            sh 'npm run lint'
          }
        }
        stage('Unit Tests') {
          agent { label 'node' }
          steps {
            // Use stash to cache node_modules across stages
            sh 'npm ci'
            sh 'npm test -- --shard=1/2'
            stash includes: 'coverage/**', name: 'coverage-1'
          }
        }
      }
    }

    stage('Build Docker Image') {
      agent { label 'docker' }
      steps {
        script {
          docker.build(
            "${IMAGE_NAME}:${GIT_COMMIT}",
            "--cache-from ${IMAGE_NAME}:latest ."
          )
        }
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}
```

The `--cache-from` flag pulls the previous image's layers as a cache source. Combined with properly ordered Dockerfile layers, this makes subsequent builds significantly faster.

## 8. Targeted Pipeline Triggers

Not every commit needs to run the full pipeline. Use path filters to run only relevant jobs:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    if: |
      github.event_name == 'push' ||
      contains(github.event.pull_request.changed_files, 'backend/')
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: dorny/paths-filter@v3
      id: changes
      with:
        filters: |
          backend:
            - 'backend/**'
          frontend:
            - 'frontend/**'
    - if: steps.changes.outputs.backend == 'true'
      run: cd backend && npm test
```

```yaml
# Simpler: use paths in the trigger itself
on:
  push:
    paths:
      - "backend/**"
      - "shared/**"
```

A change to a README file or a frontend asset should not trigger your full backend test suite.

## Measuring Your Improvements

Before optimizing, establish your baseline. GitHub Actions provides timing data per step — check the pipeline run summary. Look for:

- Steps that run sequentially but could be parallel
- Dependency installation steps without cache hits
- Docker builds without layer caching
- Test suites running on a single runner

A well-optimized pipeline typically has 80%+ cache hit rates, nearly all parallelizable work running in parallel, and Docker builds completing in under 60 seconds. Track your average pipeline duration week-over-week and set a target — most teams can reach under 5 minutes for their primary pipeline with these techniques.
