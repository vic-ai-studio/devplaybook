---
title: "Oxc: The Rust-Powered JavaScript Toolchain That Will Replace ESLint and Babel"
description: "Oxc is a blazing-fast JavaScript toolchain built in Rust that promises to replace ESLint, Babel, and more. Learn what it is, its performance benchmarks, and how to migrate your project."
pubDate: 2026-03-28
tags: ["javascript", "tooling", "rust", "eslint", "babel", "performance"]
draft: false
---

If you've ever waited for ESLint to finish linting a large monorepo, or watched Babel transform files at what feels like a crawl, you've felt the pain that Oxc was built to solve. **Oxc** (short for **Oxidation Compiler**) is a collection of JavaScript tooling written entirely in Rust—and it's not just incrementally faster. It's orders of magnitude faster.

In this guide, we'll break down what Oxc is, why it matters, how it benchmarks against existing tools, and how you can start migrating your project today.

---

## What Is Oxc?

Oxc is an open-source project aiming to build a full suite of high-performance JavaScript and TypeScript tooling in Rust. The project includes:

- **oxc_parser** — A spec-compliant ECMAScript/TypeScript parser
- **oxc_linter** — A drop-in ESLint replacement
- **oxc_minifier** — A JavaScript minifier (replaces Terser)
- **oxc_formatter** — A Prettier-compatible formatter
- **oxc_transformer** — A Babel-compatible transpiler
- **oxc_resolver** — A Node.js-compatible module resolver

The entire toolchain shares a single AST (Abstract Syntax Tree) representation, which means tools can share computation instead of each parsing the same files independently. This architectural decision alone unlocks dramatic performance gains.

```bash
# Install oxc via npm
npm install --save-dev oxlint

# Or run directly with npx
npx oxlint .
```

---

## Performance Benchmarks

Numbers speak louder than words. Here's how Oxc compares to its competitors on a representative benchmark of 100,000 lines of JavaScript:

### Linting: oxlint vs ESLint

| Tool | Time | Speed Gain |
|------|------|------------|
| ESLint | 8.4s | baseline |
| oxlint | 0.26s | **~50-100x faster** |

The Oxc team regularly publishes benchmarks showing oxlint running **50 to 100 times faster** than ESLint on real-world repositories. For large monorepos, this can mean the difference between a 2-minute lint check and a 2-second lint check.

### Parsing: oxc_parser vs acorn/swc

The oxc parser is consistently one of the fastest spec-compliant parsers available:

- **~3x faster than SWC** (which itself replaced Babel for many use cases)
- **~10x faster than acorn** (the parser underlying ESLint and many other tools)
- Fully spec-compliant with ESMAScript 2024 and TypeScript

### Real-World Usage

The `oxlint` CLI has been adopted by several high-traffic repositories as a pre-commit check or CI gate because it's fast enough to run on every file change without slowing down developer feedback loops.

---

## Why Rust?

Most JavaScript tooling today is written in JavaScript (ESLint, Prettier, Babel) or TypeScript. While this makes tooling easier to contribute to, it also means performance is bounded by V8/Node.js limitations.

Rust gives Oxc several advantages:

**1. True parallelism** — Rust's ownership model makes safe multi-threading trivial. Oxc can lint files across all CPU cores without the limitations of Node.js's single-threaded event loop.

**2. Zero garbage collection** — No GC pauses, no memory overhead from managed runtimes.

**3. WASM compatibility** — Oxc components can compile to WebAssembly, enabling use in browsers or non-Node environments.

**4. Shared AST** — All Oxc tools operate on the same in-memory AST representation, avoiding redundant parsing across the toolchain.

---

## Migrating from ESLint to oxlint

oxlint is designed as a drop-in complement (and eventual replacement) for ESLint. The migration path is intentionally gradual.

### Step 1: Install oxlint

```bash
npm install --save-dev oxlint
```

### Step 2: Run oxlint alongside ESLint

oxlint can run independently or as an ESLint plugin. Start by running it in parallel:

```json
// package.json
{
  "scripts": {
    "lint": "oxlint . && eslint ."
  }
}
```

This lets you compare results and identify any differences between the two tools before cutting over fully.

### Step 3: Use the ESLint plugin (for gradual migration)

```bash
npm install --save-dev eslint-plugin-oxlint
```

```js
// .eslintrc.js
module.exports = {
  plugins: ['oxlint'],
  extends: ['plugin:oxlint/recommended'],
};
```

This configuration disables ESLint rules that oxlint already handles, so both tools run without redundancy.

### Step 4: Disable ESLint for oxlint-covered rules

Once you've validated that oxlint catches everything you need, you can progressively disable ESLint rules it covers, reducing your ESLint runtime while keeping oxlint as the fast first-pass gate.

### Configuration

oxlint uses a `.oxlintrc.json` file (or accepts inline options):

```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "rules": {
    "no-unused-vars": "error",
    "no-console": "warn",
    "eqeqeq": "error"
  }
}
```

Most ESLint rule names map directly. oxlint currently supports 200+ rules and is actively expanding coverage.

---

## Replacing Babel with oxc_transformer

Babel remains ubiquitous in build pipelines, but it's slow—particularly for large TypeScript codebases. The `oxc_transformer` aims to be a drop-in replacement for Babel's most common use cases.

### Current support

- TypeScript stripping (removing type annotations)
- JSX transformation (React, Solid, Vue JSX)
- Modern syntax downleveling (ES2015+)
- CommonJS module transformation

### Using oxc via Rollup/Vite

The `unplugin-oxc` package integrates Oxc into Vite and Rollup build pipelines:

```bash
npm install --save-dev unplugin-oxc
```

```js
// vite.config.ts
import oxc from 'unplugin-oxc/vite';

export default {
  plugins: [
    oxc({
      transform: {
        typescript: true,
        jsx: { runtime: 'automatic' },
      },
    }),
  ],
};
```

For TypeScript-only projects that don't need Babel's transformation plugins, switching to oxc_transformer can dramatically reduce build times.

---

## Oxc in the Broader Ecosystem

Oxc isn't operating in isolation. Several major projects have already adopted or are adopting Oxc components:

**Vite** — The Vite team has been collaborating with the Oxc project to explore using oxc's resolver and transformer for faster development builds.

**Rolldown** — The upcoming Rust-based Rollup replacement uses oxc's parser and resolver as its foundation.

**Biome** — While Biome (formerly Rome) is a separate project with similar goals, both projects are pushing JavaScript tooling toward compiled languages, and oxc has learned from Biome's experience.

**ESLint compatibility** — The oxlint team has committed to maintaining a high level of compatibility with popular ESLint rulesets (airbnb, unicorn, etc.) to lower the migration barrier.

---

## Comparing Oxc, Biome, and SWC

It's worth understanding where Oxc fits relative to other Rust-based JS tools:

| Feature | Oxc | Biome | SWC |
|---------|-----|-------|-----|
| Linting | ✅ oxlint | ✅ | ❌ |
| Formatting | 🚧 WIP | ✅ | ❌ |
| Parsing | ✅ | ✅ | ✅ |
| Transformation | ✅ | ❌ | ✅ |
| Minification | 🚧 WIP | ❌ | ✅ |
| Module bundling | Via Rolldown | ❌ | Via rspack |
| ESLint plugin compat | ❌ | ❌ | ❌ |

**Biome** is the most complete all-in-one tool today but focuses on formatting + linting without transformation. **SWC** is mature and widely used for transformation (Next.js uses it) but lacks linting. **Oxc** aims to cover the full toolchain and has the most ambitious scope.

---

## Current Limitations

Oxc is not yet a complete drop-in replacement for ESLint in all scenarios:

- **Rule coverage** — oxlint has ~200+ rules but ESLint has thousands via plugins. Projects relying on niche ESLint plugins (react-hooks, testing-library, etc.) still need ESLint.
- **Plugin ecosystem** — ESLint's plugin API allows custom rules. oxlint does not yet support custom rule plugins.
- **Auto-fix** — Basic auto-fix is available but not as comprehensive as ESLint's fixers.
- **TypeScript-aware rules** — Rules that require full TypeScript type information (like `@typescript-eslint/no-unsafe-assignment`) are not yet supported.

The recommended approach for most teams today is to **run oxlint as a fast first pass** in CI, then ESLint for full coverage. This gives you the speed benefit where it matters most (developer feedback loop) while maintaining full rule coverage.

---

## Should You Adopt Oxc Today?

**Yes, for:**
- Large repositories where ESLint is a CI bottleneck
- Projects using standard ESLint rules (no heavy custom plugins)
- Teams wanting to future-proof their toolchain
- Anyone building with Rolldown/Vite who wants deeper integration

**Wait, if:**
- You rely heavily on custom ESLint plugins (testing-library, react-hooks, etc.)
- You need auto-fix for complex issues
- Your project requires TypeScript type-aware linting rules

---

## Getting Started Right Now

The fastest way to experience Oxc is to just run oxlint on your project without any configuration:

```bash
npx oxlint .
```

You'll immediately see how fast it is. From there, explore the [Oxc documentation](https://oxc.rs/docs) to understand which rules it covers and whether they meet your project's needs.

For most JavaScript projects, adding oxlint as a pre-commit hook and a fast CI check requires less than 10 minutes of setup and could save your team significant time every day.

---

## Conclusion

Oxc represents the next generation of JavaScript tooling. By leveraging Rust's performance characteristics and designing tools that share infrastructure, the Oxc project is building something significantly faster than what JavaScript-based tools can achieve.

The **oxc javascript toolchain** isn't a distant future—it's available today. oxlint is production-ready for most use cases, and the broader ecosystem is catching up quickly. The question isn't whether Rust-based tooling will dominate the JavaScript ecosystem; it's how fast the migration will happen.

Start by adding `npx oxlint .` to your workflow today. The performance difference will be immediately obvious.
