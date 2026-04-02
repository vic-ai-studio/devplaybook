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
