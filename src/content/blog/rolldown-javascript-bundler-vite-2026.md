---
title: "Rolldown: The Next-Gen JavaScript Bundler Powering Vite 6+ (Complete Guide 2026)"
description: "Complete guide to Rolldown in 2026 — the Rust-based bundler built on oxc that powers Vite 6+. Rollup API compatibility, performance benchmarks, migration path, and current status."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["rolldown", "vite", "bundler", "rust", "oxc", "build-tools", "javascript", "frontend"]
readingTime: "10 min read"
---

The JavaScript build tooling landscape has been reshaping itself around Rust-native performance for several years. Tools like esbuild proved that leaving JavaScript runtime overhead behind could yield order-of-magnitude speed improvements. Rolldown is the next major step in that evolution — a Rust-based bundler designed to serve as the unified build engine inside Vite while remaining fully compatible with the Rollup plugin ecosystem. This guide covers everything you need to know about Rolldown in 2026: what it is, how it relates to Vite 6+, how it compares to existing tools, and how to start using it today.

## What Is Rolldown?

Rolldown is an open-source JavaScript and TypeScript bundler written in Rust. It was created by Evan You (the author of Vue.js and Vite) along with contributors from the Vite core team. The project is hosted under the `rolldown-rs` organization on GitHub and is built on top of **oxc** — a high-performance JavaScript and TypeScript toolchain also written in Rust.

The primary design goals of Rolldown are:

- **Rollup API compatibility**: Rolldown exposes an API surface that is intentionally compatible with Rollup, meaning existing Rollup configuration files and plugins require little to no modification.
- **Native performance**: By running as compiled Rust code rather than Node.js JavaScript, Rolldown avoids the overhead of the V8 engine for CPU-intensive parsing and transformation work.
- **Unified bundling for Vite**: Before Rolldown, Vite used esbuild for development (dependency pre-bundling) and Rollup for production builds. This split caused subtle behavior differences between dev and prod. Rolldown replaces both with a single consistent engine.

Rolldown is not intended to be a general-purpose replacement for every bundler in existence. Its scope is focused: serve as the foundation for Vite's build pipeline and provide a fast, compatible alternative for teams currently using Rollup directly.

## The oxc Foundation

To understand Rolldown, you need to understand **oxc** (the Oxidation Compiler). oxc is a collection of JavaScript tooling built in Rust, covering:

- A parser that produces a compliant AST from JavaScript and TypeScript source
- A linter (`oxlint`) with rules compatible with ESLint
- A transformer for JSX and TypeScript stripping
- A resolver for module paths (compatible with Node.js and bundler resolution algorithms)
- A minifier

Rolldown uses oxc's parser and transformer as its core processing layer. Because oxc is implemented in Rust and compiled to native machine code, parse times are dramatically faster than those achieved by JavaScript-based parsers like Acorn or even the TypeScript compiler's own parser.

The oxc project is developed in parallel with Rolldown and the two share the same organization. Improvements to the oxc parser automatically benefit Rolldown's throughput.

## Rolldown's Relationship with Vite 6+

Vite has been the dominant frontend development server and build tool for several years, but its architecture carried a fundamental inconsistency. During development, Vite pre-bundled CommonJS and UMD dependencies using esbuild and served ES modules directly from the file system. During production builds, it used Rollup to create optimized bundles. The two tools have different behaviors around module resolution, tree-shaking, and plugin hooks, which meant that what worked in development could occasionally break in production.

Rolldown was created specifically to eliminate this split. Starting with Vite 6, Rolldown serves as the unified bundler for both the development pipeline and production builds. The result is a single consistent code path: the same module graph, the same tree-shaking algorithm, and the same plugin execution for both environments.

From a user perspective, if you are running a standard Vite project, you benefit from Rolldown automatically without changing your configuration. Vite abstracts the bundler layer and handles the wiring internally. The visible effect is faster cold starts, faster production builds, and fewer behavior discrepancies between dev and prod.

For plugin authors, Rolldown implements the Rollup plugin hook interface. Plugins written for Rollup work with Rolldown with minimal changes, though some advanced lifecycle hooks may have implementation differences that require attention.

## Rollup API Compatibility

One of Rolldown's most important design decisions is its commitment to Rollup API compatibility. The Rollup ecosystem contains thousands of community plugins covering everything from SVG imports to bundle size analysis. Abandoning that ecosystem would have been a significant adoption barrier.

Rolldown supports the core Rollup plugin hooks:

- `resolveId` — custom module resolution
- `load` — virtual modules and file loading overrides
- `transform` — source transformation (Babel, TypeScript, MDX, etc.)
- `generateBundle` / `writeBundle` — post-build asset manipulation
- `buildStart` / `buildEnd` — lifecycle hooks

A standard `rolldown.config.js` file looks nearly identical to a `rollup.config.js`:

```js
// rolldown.config.js
import { defineConfig } from 'rolldown';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default defineConfig({
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
  ],
});
```

To run a build directly with Rolldown (outside of Vite):

```bash
npx rolldown --config rolldown.config.js
```

Or using the programmatic API:

```js
import { rolldown } from 'rolldown';

const bundle = await rolldown({
  input: 'src/index.js',
  plugins: [],
});

await bundle.write({
  dir: 'dist',
  format: 'esm',
});
```

The programmatic API mirrors Rollup's own `rollup()` / `bundle.write()` pattern, making it straightforward to swap Rolldown into build scripts that previously called Rollup directly.

Not every Rollup plugin works perfectly out of the box. Plugins that rely on internal Rollup implementation details rather than the documented plugin API may need updates. The Rolldown team maintains a compatibility tracker in the repository that documents the status of popular community plugins.

## Performance Benchmarks vs Rollup and esbuild

Performance is the headline feature of Rolldown, and the benchmarks are compelling. The following figures are representative of results published by the Rolldown team and reproduced by community members across typical application codebases in 2025 and early 2026. Exact numbers vary by project size, module count, and hardware.

**Cold build times (large application, ~1,000 modules):**

| Bundler | Build Time |
|---------|-----------|
| Rollup 4 (JavaScript) | ~18s |
| esbuild | ~1.2s |
| Rolldown | ~0.9s |

**Incremental rebuild (single file change):**

| Bundler | Rebuild Time |
|---------|-------------|
| Rollup 4 | ~4s |
| esbuild | ~0.3s |
| Rolldown | ~0.2s |

Rolldown's performance is consistently on par with or faster than esbuild, with the added advantage of Rollup plugin compatibility. esbuild is extremely fast but uses its own plugin API that is not compatible with the Rollup ecosystem. Teams that need both performance and access to Rollup plugins have historically had no clean option — Rolldown fills that gap.

For smaller projects under 100 modules, the performance difference between tools is less dramatic. The gains become most visible at scale, in monorepos, or in CI pipelines where build time directly affects deployment velocity.

It is worth noting that Rolldown's tree-shaking and code splitting are implemented at the Rust layer, which means these passes also run significantly faster than their Rollup equivalents.

## Current Status in 2026

As of early 2026, Rolldown has reached a stable release for use within Vite. If you are running Vite 6, you are already using Rolldown as your production bundler. The Vite team has considered this integration production-ready.

For teams wanting to use Rolldown **directly** (outside of Vite, as a standalone bundler replacing Rollup), the project is in a mature beta state. The core build pipeline, plugin hooks, and output formats are stable. The areas still being actively developed include:

- Full support for all advanced Rollup plugin hooks (some less-common hooks have partial implementations)
- Complete CommonJS interoperability edge cases
- The built-in minifier (still catching up to Terser/esbuild in coverage of optimization cases)
- Windows path handling edge cases

The Rolldown changelog and GitHub issues tracker are the best places to check compatibility status for specific features before adopting it as a Rollup replacement in production.

For Vite users, no action is needed — Rolldown is already working for you behind the scenes.

## Migrating from Rollup to Rolldown

If you are using Rollup directly and want to migrate to Rolldown, the process is straightforward for most projects.

**Step 1: Install Rolldown**

```bash
npm install rolldown --save-dev
# or
pnpm add -D rolldown
```

**Step 2: Rename your config file**

```bash
mv rollup.config.js rolldown.config.js
```

**Step 3: Update the import**

```js
// Before (rollup.config.js)
import { defineConfig } from 'rollup';

// After (rolldown.config.js)
import { defineConfig } from 'rolldown';
```

**Step 4: Update package.json scripts**

```json
{
  "scripts": {
    "build": "rolldown --config rolldown.config.js",
    "build:watch": "rolldown --config rolldown.config.js --watch"
  }
}
```

**Step 5: Test your plugins**

Run the build and check whether your existing Rollup plugins produce the expected output. Most plugins from `@rollup/plugin-*` work without modification. Community plugins that use only documented hooks will also typically work. Review any plugins that hook into Rollup's internal module graph APIs, as those are the most likely to need updates.

**Handling CommonJS modules:**

Rolldown has built-in CommonJS support, so for many projects you can remove `@rollup/plugin-commonjs` from your config. Test carefully before removing it, as complex CJS interop scenarios may still benefit from the plugin.

```js
// rolldown.config.js — CJS handled natively in many cases
import { defineConfig } from 'rolldown';
import nodeResolve from '@rollup/plugin-node-resolve';

export default defineConfig({
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    nodeResolve({ extensions: ['.ts', '.js'] }),
    // @rollup/plugin-commonjs often not needed
  ],
});
```

## When to Use Rolldown vs Vite vs Other Bundlers

Choosing the right tool depends on your use case.

**Use Vite (with Rolldown under the hood) when:**
- You are building a frontend application (React, Vue, Svelte, etc.)
- You want a full development server with HMR, not just a bundler
- You want zero-config setup with sensible defaults
- You are targeting browsers as your primary runtime

**Use Rolldown directly when:**
- You are building a library (npm package) and need fine-grained control over output formats
- You are migrating an existing Rollup-based build pipeline and want a drop-in speed upgrade
- You need programmatic bundler access in a custom build script
- You are building a tool that embeds a bundler (like a framework or CLI tool)

**Use esbuild directly when:**
- You do not need Rollup plugin compatibility
- You are doing simple transpilation or bundling where the full Rollup feature set is unnecessary
- You need the absolute minimum dependency surface

**Stick with Webpack when:**
- You have a large legacy codebase with hundreds of Webpack-specific loaders and plugins with no Rollup equivalents
- Your team relies on Module Federation (Webpack's multi-app feature)
- Migrating is not currently feasible given team bandwidth

**Stick with Rollup 4 when:**
- You need full production stability for a library build pipeline right now and prefer not to use beta software
- You rely on advanced Rollup hooks that Rolldown has not yet fully implemented

The practical guidance for most teams in 2026: if you are on Vite, you are already using Rolldown and getting its benefits automatically. If you maintain a library built with Rollup, Rolldown is worth evaluating — run your existing config, verify the output, and benchmark the build times. The migration cost is low and the speed gains are real.

## Summary

Rolldown represents a significant architectural step forward for the JavaScript build tooling ecosystem. By combining Rust-native performance through the oxc toolchain with genuine Rollup API compatibility, it solves a problem that esbuild could not: being fast without requiring teams to abandon their existing plugin investments.

For Vite users, the benefit is already in production — Vite 6 ships with Rolldown as its unified build engine, eliminating the dev/prod behavior gap that plagued earlier versions. For library authors and teams running standalone Rollup builds, Rolldown offers a migration path that is low-friction and high-reward.

The project is moving quickly and the stable release trajectory suggests that by the end of 2026, Rolldown will be the default choice for any new Rollup-based pipeline. Keeping an eye on the official Rolldown repository and the Vite changelog is the best way to track readiness for your specific use case.

The Rust-based build tooling revolution that esbuild started has found its most complete expression in Rolldown — a tool that is fast, compatible, and designed to serve as the long-term foundation for modern JavaScript development workflows.
