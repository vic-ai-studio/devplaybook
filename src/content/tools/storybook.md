---
title: "Storybook"
description: "The standard UI component development environment — build, document, and test components in isolation, with addons for accessibility, visual testing, and design system docs."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT); Chromatic (visual testing cloud) free up to 5,000 snapshots/month"
website: "https://storybook.js.org"
github: "https://github.com/storybookjs/storybook"
tags: [ui-components, react, vue, angular, documentation, testing, design-system]
pros:
  - "Component isolation — develop UI components without running full app"
  - "Stories as tests — visual states become the source of truth for visual regression"
  - "Addon ecosystem: a11y, viewport, interactions, design tokens"
  - "Works with React, Vue, Angular, Svelte, Web Components"
  - "Chromatic integration for automated visual regression testing"
cons:
  - "Setup complexity increases for complex apps with providers/routing"
  - "Storybook adds significant bundle overhead to dev setup"
  - "Maintaining stories alongside component changes can be burdensome"
  - "Full Storybook 8 migration from v6/v7 requires config changes"
date: "2026-04-02"
---

## Overview

Storybook is the industry standard for building component libraries and design systems. It lets you develop UI components in isolation, document every variant, and run accessibility and visual regression tests. Used by Airbnb, IBM, GitHub, and thousands of design systems teams.

## Quick Start

```bash
npx storybook@latest init
npm run storybook  # Opens at http://localhost:6006
```

## Writing Stories (CSF3 Format)

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],  // Auto-generate docs page
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'destructive'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    label: 'Click me',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    label: 'Saving...',
    disabled: true,
    loading: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="primary" label="Primary" />
      <Button variant="secondary" label="Secondary" />
      <Button variant="destructive" label="Delete" />
    </div>
  ),
};
```

## Accessibility Addon

```bash
npm install @storybook/addon-a11y
```

```javascript
// .storybook/main.ts
export default {
  addons: ['@storybook/addon-a11y'],
};
```

Every story now shows an Accessibility panel with WCAG violation reports.

## Interaction Testing

```typescript
// Form.stories.tsx
import { userEvent, within, expect } from '@storybook/test';

export const FilledForm: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Email'), 'test@example.com');
    await userEvent.type(canvas.getByLabelText('Password'), 'password123');
    await userEvent.click(canvas.getByRole('button', { name: 'Sign in' }));

    await expect(canvas.getByText('Welcome back!')).toBeInTheDocument();
  },
};
```

## Visual Regression with Chromatic

```bash
npm install chromatic --save-dev

# Run after Storybook build
npx chromatic --project-token=<token>
```

Chromatic captures every story as a screenshot and alerts on visual changes in PRs.

## Storybook as Docs

With `tags: ['autodocs']` on your meta, Storybook generates a full documentation page showing all props, controls, and stories for each component — a living style guide that's always in sync with your code.

---

## Concrete Use-Case: Building a Design System

Imagine you're building a company-wide design system with three components: `Button`, `Input`, and `Modal`. Here's how Storybook, its a11y addon, and Chromatic work together in a real workflow.

### The Stories

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'DesignSystem/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

export const Primary: Story = {
  args: { variant: 'primary', label: 'Submit' },
};

export const Destructive: Story = {
  args: { variant: 'destructive', label: 'Delete Account' },
};
```

```typescript
// Input.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'DesignSystem/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;

export const Default: Story = {
  args: { label: 'Email address', placeholder: 'you@example.com' },
};

export const WithError: Story = {
  args: { label: 'Email address', value: 'not-an-email', error: 'Invalid format' },
};
```

```typescript
// Modal.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';

const meta: Meta<typeof Modal> = {
  title: 'DesignSystem/Modal',
  component: Modal,
  tags: ['autodocs'],
};
export default meta;

export const Default: Story = {
  render: () => (
    <Modal title="Confirm Action">
      <p>Are you sure you want to proceed?</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button variant="secondary" label="Cancel" />
        <Button variant="primary" label="Confirm" />
      </div>
    </Modal>
  ),
};
```

### Catching an Accessibility Violation

After writing these stories, a developer adds a new `SearchInput` component — but forgets the `label` prop:

```typescript
// SearchInput.stories.tsx (intentionally broken for demo)
export const Default: Story = {
  render: () => <SearchInput placeholder="Search..." />, // Missing label!
};
```

When that story loads in Storybook, the **a11y addon** immediately shows a WCAG 2.1 AA violation in the Accessibility panel: "Form element has no accessible name." The addon pinpoints the exact DOM element and cites the failure criterion (4.1.2 Name, Role, Value). The developer fixes it before the PR even reaches review.

### Chromatic Catching a Regression

A separate PR modifies the `Button` component's padding. The diff looks harmless — `padding: 8px 16px` changed to `padding: 6px 14px`. But Chromatic's CI check compares the new screenshot against the baseline for every `Button` story and surfaces a visual diff with a red overlay highlighting the pixel-level change. Reviewers see that the button appears noticeably smaller in every variant. The PR is flagged, the change is reviewed, and the padding is corrected before it reaches production. This is the core value of visual regression testing: catching visual changes that linting, type-checking, and unit tests all miss.

---

## Storybook vs Styleguidist vs Ladle

| Feature | Storybook | Styleguidist | Ladle |
|---------|-----------|-------------|-------|
| **Framework** | React, Vue, Angular, Svelte, Web Components | React only | React (static output) |
| **Setup complexity** | Medium–High (Webpack/Vite config) | Medium | Low |
| **Build output** | Dev server + static build | Dev server + static build | Static HTML/JS (fast) |
| **Performance** | Slower at scale (heavy iframe per story) | Moderate | Fast (Vite-based) |
| **Addon ecosystem** | Extensive (a11y, interactions, viewport, docs) | Limited | Growing (Vite plugin compatibility) |
| **Visual regression** | Chromatic (first-class integration) | via Ladle or third-party | Built-in via `@ladle/report` |
| **Documentation** | Auto-generated docs via `autodocs` | Built-in (reads JSDoc/propTypes) | Limited (static pages) |
| **CSF3 support** | Yes | No (uses JSX/JSON) | Yes |
| **Maintenance** | Active (large open-source org) | Low activity (mostly stable) | Active (modern, lightweight) |
| **Use case fit** | Full design systems with many addons | Simple React component docs | Fast teams that want static output |

**Key takeaway:** Styleguidist is effectively in maintenance mode — prefer it only for existing projects already invested in it. Ladle is the lean alternative when you want fast builds and static output without Storybook's overhead. Storybook is the default for teams that need the full addon ecosystem, multi-framework support, and Chromatic integration.

---

## When to Use / When Not to Use

### When to use Storybook

- **Building a shared design system or component library** that multiple teams or projects consume. Storybook's autodocs, controls, and a11y panel make it the best living documentation for this.
- **Visual regression testing is a priority.** Chromatic's integration is best-in-class; it catches visual regressions in every story across every PR without requiring manual screenshot comparison.
- **Accessibility compliance matters.** The `@storybook/addon-a11y` runs automated WCAG checks on every story and surfaces violations in the Storybook UI — far better than forgetting a11y until an audit.
- **Multi-framework components.** If your design system serves React, Vue, and Angular consumers, Storybook handles all three in one repo with separate `title` namespaces.
- **Interaction-heavy components.** The `play` function and `@storybook/test` let you write full user interaction sequences (typing, clicking, waiting for async data) as stories — these double as integration tests.

### When not to use Storybook

- **Simple projects with a handful of static pages.** If you don't have a component library, the setup overhead and bundle cost aren't justified.
- **Teams that can't maintain stories.** Stories drift from component APIs without active discipline. If your team won't keep them updated, they become misleading documentation that actively hurts onboarding.
- **Performance-sensitive CI pipelines.** Storybook's iframe-per-story architecture makes full-storybook builds slow. For large component sets, consider whether Ladle's static output or a more targeted approach fits your pipeline better.
- **Pure design handoff with no React/Vue component implementation.** Figma + Principle or similar is a better workflow when the component doesn't exist yet and you're iterating purely on design.
- **Migrating from Storybook v6/v7 to v8.** The config changes are non-trivial and the upgrade can surface silent breaking changes in addons. Budget engineering time accordingly and test thoroughly before migrating in a large repo.
