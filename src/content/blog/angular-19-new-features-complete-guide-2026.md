---
title: "Angular 19: New Features and What Developers Need to Know (2026)"
description: "Complete guide to Angular 19 covering Incremental Hydration, linked signals, hot module replacement, standalone components by default, resource API, and performance improvements in 2026."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["angular", "angular-19", "typescript", "frontend", "signals", "hydration"]
readingTime: "14 min read"
---

Angular 19 is the most developer-focused release in Angular's history. Released in late 2025, it ships incremental hydration, linked signals, out-of-the-box hot module replacement for templates, a new resource API for async data, and route-level render mode control — all while making standalone components the framework default. If you have been waiting for Angular to close the ergonomics gap with React and Vue, version 19 is the release that does it.

This guide walks through every major feature with working TypeScript examples, explains how they interact, and ends with a practical migration path from Angular 17 or 18.

---

## What's New in Angular 19 — Overview

Angular 19 is built on four pillars:

- **Performance at the network edge**: Incremental hydration and route-level SSR/SSG/CSR mean you ship only what is needed, when it is needed.
- **Reactive primitives that scale**: Linked signals and improved `effect()` semantics give teams a coherent story for reactive state — without RxJS for the common case.
- **Developer experience that matches modern tooling**: HMR for templates, standalone-by-default, and the resource API all reduce boilerplate and feedback loops.
- **Enterprise stability**: The Angular team hardened the compiler, improved tree-shaking, and cut initial bundle sizes by an average of 13% on benchmark apps.

---

## 1. Incremental Hydration — The Biggest Performance Win

Server-side rendering in Angular has historically been an all-or-nothing operation: the server renders HTML, the browser downloads JavaScript, and the whole page hydrates at once. Incremental hydration changes this by tying hydration to Angular's existing `@defer` block syntax.

### How It Works

You annotate sections of your template with `@defer` and a hydration trigger. The server renders static HTML for those blocks. The client hydrates each block independently, only when the trigger fires.

```typescript
// app.config.ts
import { provideClientHydration, withIncrementalHydration } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withIncrementalHydration())
  ]
};
```

```html
<!-- product-page.component.html -->

<!-- Hydrates immediately — above the fold, critical -->
<app-hero [product]="product" />

<!-- Hydrates when the element enters the viewport -->
@defer (hydrate on viewport) {
  <app-product-reviews [productId]="product.id" />
}

<!-- Hydrates only when the user interacts -->
@defer (hydrate on interaction) {
  <app-related-products [category]="product.category" />
}

<!-- Hydrates when the browser is idle -->
@defer (hydrate on idle) {
  <app-footer />
}
```

### Available Hydration Triggers

| Trigger | When it fires |
|---|---|
| `hydrate on viewport` | Element enters the visible area |
| `hydrate on interaction` | User clicks or focuses the element |
| `hydrate on idle` | Browser `requestIdleCallback` |
| `hydrate on timer(3000)` | After N milliseconds |
| `hydrate when condition` | When a signal or expression becomes truthy |
| `hydrate never` | Never hydrates — stays as static HTML |

The `hydrate never` option is particularly powerful for purely decorative or static content that does not need event listeners.

### Real-World Impact

On a typical e-commerce product page, incremental hydration can reduce Time to Interactive (TTI) by 40–60% by deferring hydration of below-the-fold content. The server still renders full HTML for SEO and initial paint, but JavaScript execution is deferred until it is actually needed.

---

## 2. Linked Signals — Computed + Writable Combined

Angular's signal system (introduced in v16 and stabilized in v17) gave developers computed signals and writable signals, but bridging the two required manual synchronization. Angular 19 introduces `linkedSignal()`, which creates a writable signal whose default value is derived from another signal.

For a deep dive into the signal primitives this builds on, see the [Angular Signals guide](/blog/angular-signals-reactive-primitives-complete-guide-2026).

### The Problem linkedSignal Solves

A common pattern: a parent component passes a list, and a child component tracks the currently selected item. When the list changes (e.g., after a filter), the selection should reset — but the selection must also be independently writable by the user.

Before Angular 19, this required either a `computed` you could not write to, or a manual `effect` to keep things in sync. `linkedSignal` handles it declaratively:

```typescript
import { Component, input, linkedSignal } from '@angular/core';

@Component({
  selector: 'app-product-list',
  template: `
    <select (change)="selectProduct($event)">
      @for (product of products(); track product.id) {
        <option [value]="product.id">{{ product.name }}</option>
      }
    </select>
    <p>Selected: {{ selectedProduct()?.name }}</p>
  `
})
export class ProductListComponent {
  products = input.required<Product[]>();

  // Resets to first product whenever `products` changes,
  // but can be independently updated by the user
  selectedProduct = linkedSignal(() => this.products()[0]);

  selectProduct(event: Event) {
    const id = (event.target as HTMLSelectElement).value;
    this.selectedProduct.set(
      this.products().find(p => p.id === id) ?? this.products()[0]
    );
  }
}
```

### Advanced: linkedSignal with Equal and Previous Value

`linkedSignal` also supports an object form that gives you access to the previous value, which is useful for preserving selection across partial list updates:

```typescript
selectedProduct = linkedSignal<Product | undefined>({
  source: this.products,
  computation: (products, previous) => {
    // If previous selection still exists in new list, keep it
    if (previous?.value && products.some(p => p.id === previous.value?.id)) {
      return previous.value;
    }
    return products[0];
  }
});
```

This pattern eliminates an entire class of "stale selection" bugs that previously required careful `effect()` management.

---

## 3. Hot Module Replacement for Templates — Zero Config

Hot module replacement (HMR) for TypeScript class changes existed in Angular's toolchain via esbuild. Angular 19 extends this to template changes without requiring any configuration.

When you edit an `.html` template file (or an inline template), the browser updates the affected component in place — without losing application state. Forms retain their values, dialogs stay open, and router state is preserved.

### What Changed Under the Hood

Angular 19 added a new HMR runtime that intercepts template changes at the component definition level. Rather than destroying and re-creating the entire component tree, it patches the component's template factory and triggers change detection only on affected views.

This is enabled automatically when you run the dev server:

```bash
ng serve
# HMR is active by default — no flags needed
```

To disable it explicitly:

```bash
ng serve --no-hmr
```

### HMR Scope in Angular 19

| Change type | HMR behavior |
|---|---|
| Template HTML | Full HMR, state preserved |
| Component styles | Full HMR, state preserved |
| Component class logic | Module-level reload |
| Signal updates | Reflected immediately |
| Service changes | Full page reload |

---

## 4. Standalone Components as Default

From Angular 19, `standalone: true` is the default. You no longer need to declare it explicitly. Creating a new component with the CLI produces a standalone component out of the box.

```typescript
// Angular 18 — explicit standalone flag required
@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="card">{{ title }}</div>`
})
export class CardComponent { ... }

// Angular 19 — standalone is the default
@Component({
  selector: 'app-card',
  imports: [CommonModule],
  template: `<div class="card">{{ title }}</div>`
})
export class CardComponent { ... }
```

NgModules still work and are not deprecated. But for greenfield projects started in Angular 19, the recommended architecture is entirely standalone: components, directives, pipes, and `provideX()` functions used directly in `bootstrapApplication()`.

The Angular CLI's `ng generate component` command no longer adds `standalone: true` to the output, and `ng new` scaffolds a module-free project structure by default.

---

## 5. Resource API — Async Data Loading with Signals

The resource API is Angular 19's answer to React Query and SWR — a first-party way to manage async data loading that integrates natively with the signals reactivity model.

### resource()

`resource()` is for plain Promise-based async operations:

```typescript
import { Component, signal, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-user-profile',
  template: `
    @if (userResource.isLoading()) {
      <app-skeleton />
    } @else if (userResource.error()) {
      <p class="error">Failed to load user: {{ userResource.error() }}</p>
    } @else {
      <app-user-card [user]="userResource.value()" />
    }
  `
})
export class UserProfileComponent {
  userId = signal<string>('');

  userResource = resource({
    request: () => ({ id: this.userId() }),
    loader: async ({ request, abortSignal }) => {
      const response = await fetch(`/api/users/${request.id}`, { signal: abortSignal });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json() as Promise<User>;
    }
  });
}
```

When `userId` changes, the resource automatically cancels the in-flight request (via the `abortSignal`) and initiates a new one.

### rxResource()

`rxResource()` is the RxJS-integrated variant for teams already using Observable streams:

```typescript
import { rxResource } from '@angular/core/rxjs-interop';

userResource = rxResource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) =>
    this.http.get<User>(`/api/users/${request.id}`)
});
```

Both `resource()` and `rxResource()` expose the same reactive interface: `value()`, `isLoading()`, `error()`, `status()`, and `reload()`.

### Manual Refresh

```typescript
// Trigger a manual reload — useful after a mutation
async saveUser(updates: Partial<User>) {
  await this.userService.update(updates);
  this.userResource.reload(); // Re-fetches with current signals
}
```

---

## 6. Effect() Improvements — When to Use Effects vs Computed

Angular 19 cleans up `effect()` semantics that confused many developers in v17 and v18.

### What Changed

- Effects no longer run synchronously during component initialization by default. They are scheduled after the initial render, which prevents a class of `ExpressionChangedAfterItHasBeenCheckedError` issues.
- `effect()` now warns in development mode if you write to a signal inside an effect without explicitly opting in via `allowSignalWrites: true`. This discourages effects that create reactive cycles.
- A new `afterRenderEffect()` hook is available for effects that need to run after DOM rendering (replacing most use cases for `afterViewInit`).

### Decision Guide: computed vs effect

```typescript
// Use computed() for derived state — synchronous, pure
readonly fullName = computed(() => `${this.firstName()} ${this.lastName()}`);
readonly isValid = computed(() => this.fullName().length > 2);

// Use effect() for side effects — logging, analytics, storage sync
constructor() {
  effect(() => {
    localStorage.setItem('user-prefs', JSON.stringify(this.prefs()));
  });
}

// Use afterRenderEffect() for DOM interactions
constructor() {
  afterRenderEffect(() => {
    this.chart.render(this.chartData());
  });
}

// Avoid: writing signals inside effects without clear intent
// This creates hard-to-trace reactive cycles
effect(() => {
  if (this.count() > 10) {
    this.count.set(0); // Requires allowSignalWrites: true in v19
  }
});
```

---

## 7. Route-Level Render Mode

Angular 19 introduces per-route control over rendering strategy. Rather than choosing SSR or CSR for the entire application, you define a render mode for each route in your router configuration.

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Prerender  // SSG — build time
  },
  {
    path: 'blog/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const posts = await fetch('/api/posts').then(r => r.json());
      return posts.map((post: Post) => ({ slug: post.slug }));
    }
  },
  {
    path: 'dashboard',
    renderMode: RenderMode.Server  // SSR — per request
  },
  {
    path: 'playground',
    renderMode: RenderMode.Client  // CSR — no server rendering
  }
];
```

This composable approach means a single Angular application can serve a statically generated marketing site, a server-rendered data-heavy dashboard, and a fully client-rendered interactive tool — all without separate projects.

---

## 8. Angular 19 vs React 19 for Enterprise Apps

Both Angular 19 and React 19 shipped major updates in the same cycle. Here is how they compare for enterprise decision-making:

| Dimension | Angular 19 | React 19 |
|---|---|---|
| **Reactivity model** | Signals (fine-grained, built in) | Actions + use() hook + transitions |
| **SSR/hydration** | Incremental hydration + route-level render mode | React Server Components + Selective Hydration |
| **Async data** | resource() / rxResource() | use() + Suspense + server actions |
| **Form handling** | Reactive Forms + signal integration | React Hook Form (third-party) or new Actions API |
| **TypeScript** | First-class, compiler-enforced | Excellent but via community tooling (ts-jest, etc.) |
| **Bundle size (hello world)** | ~45 KB gzipped | ~40 KB gzipped (with RSC: lower) |
| **Migration story** | Angular Update Guide + ng update | React Codemods (usually minor for v18→v19) |
| **Testing** | Angular TestBed, Jasmine, Jest | React Testing Library, Vitest |
| **Enterprise support** | Google-backed LTS 18 months | Meta-backed, community LTS |

**Verdict for enterprise**: Angular 19 wins on structural consistency — one team can own the full stack with a single framework opinion. React 19 with Next.js 15 wins on ecosystem breadth and RSC for content-heavy apps. For financial, healthcare, or large-scale SaaS applications where maintainability and strict typing matter most, Angular 19's cohesive defaults and built-in dependency injection remain a significant advantage.

---

## 9. Performance Benchmarks and Bundle Size Improvements

Angular 19's compiler improvements target two metrics: initial bundle size and change detection overhead.

### Bundle Size

The Angular team applied more aggressive tree-shaking to the framework's own internals. Applications that use standalone components exclusively and avoid NgModules see the most benefit:

| Scenario | Angular 18 | Angular 19 | Delta |
|---|---|---|---|
| Minimal hello-world app | 51 KB | 44 KB | -14% |
| Mid-size CRUD app | 180 KB | 158 KB | -12% |
| Enterprise app (lazy routes) | 340 KB initial | 296 KB initial | -13% |

### Change Detection

Angular 19 enables zoneless change detection for all new projects by default when combined with signals. Without `zone.js`, Angular does not need to patch every browser API to detect changes — instead, signal writes trigger targeted re-renders. On CPU-intensive UIs (large data grids, real-time charts), zoneless mode reduces main-thread CPU usage by 20–35%.

```typescript
// app.config.ts — zoneless mode
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    // ... other providers
  ]
};
```

Remove `zone.js` from `angular.json` polyfills after enabling zoneless mode.

---

## 10. Migration Guide from Angular 17/18 to 19

### Step 1 — Run ng update

```bash
npx ng update @angular/core@19 @angular/cli@19
```

The Angular Update Guide at update.angular.io generates a personalized checklist based on your current version.

### Step 2 — Remove explicit standalone: true (optional, but clean)

Angular 19 is backward-compatible — `standalone: true` still works. But if you want clean code, run the provided schematic:

```bash
npx ng generate @angular/core:remove-standalone-flag
```

### Step 3 — Migrate to the Resource API

If you are using `@ngrx/component-store` or manual `Subject` + `switchMap` patterns for HTTP data loading, the resource API is a drop-in improvement for most cases:

```typescript
// Before (Angular 17/18 — manual approach)
private readonly destroy$ = new Subject<void>();
readonly user$: Observable<User>;

constructor(private userService: UserService) {
  this.user$ = this.userId$.pipe(
    switchMap(id => this.userService.getUser(id)),
    takeUntil(this.destroy$)
  );
}

ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

// After (Angular 19 — resource API)
readonly userResource = rxResource({
  request: () => ({ id: this.userId() }),
  loader: ({ request }) => this.userService.getUser(request.id)
});
// No ngOnDestroy needed — resource manages its own lifecycle
```

### Step 4 — Enable Incremental Hydration (SSR projects only)

If your project uses `@angular/ssr`:

```bash
npx ng update @angular/ssr@19
```

Then update `app.config.ts` to add `withIncrementalHydration()`, and annotate below-the-fold sections of your templates with `@defer (hydrate on viewport)`.

### Step 5 — Adopt Route-Level Render Mode

Replace the flat `provideServerRendering()` call with `serverRoutes` to specify render strategy per route. This is particularly impactful for apps that mix marketing content (suitable for SSG) with authenticated dashboards (SSR or CSR).

### Breaking Changes to Watch

- The `APP_INITIALIZER` token behavior changed slightly — initializers now run after `provideRouter()` resolves the first route. Check your initializers if they depend on router state.
- `NgOptimizedImage` now defaults to `priority="false"` for images below the fold. Review images that previously relied on implicit priority.
- The `TestBed.inject()` signature now requires the provider token type parameter in strict mode TypeScript projects.

---

## Conclusion

Angular 19 is a coherent, production-ready release. Incremental hydration closes the performance gap with React Server Components for SSR-heavy apps. Linked signals and the resource API replace most ad-hoc RxJS patterns without removing RxJS from the ecosystem. HMR for templates makes the development inner loop significantly faster. And route-level render mode gives enterprise teams the flexibility to choose the right rendering strategy for each part of their application without splitting into separate projects.

For teams already on Angular 17 or 18, the migration is low-risk and the upgrade guide is detailed. For teams evaluating Angular vs. React in 2026, Angular 19's built-in answers to reactivity, SSR, and async data loading make it a genuinely competitive choice — not just for large teams who value structure, but for any team that wants a framework with a clear, opinionated answer to every common problem.

---

## Further Reading

- [Angular Signals guide](/blog/angular-signals-reactive-primitives-complete-guide-2026)
- [Angular official update guide](https://update.angular.io)
- [Angular SSR and Incremental Hydration RFC](https://github.com/angular/angular/discussions)
