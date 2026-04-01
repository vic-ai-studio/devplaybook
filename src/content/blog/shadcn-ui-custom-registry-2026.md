---
title: "Building a Custom shadcn/ui Registry: Share Components Across Projects"
description: "Learn how to build and host a custom shadcn/ui component registry in 2026. Covers registry.json format, CLI installation, versioning, monorepo patterns, and when to choose a registry over npm packages."
date: "2026-04-01"
tags: [react, shadcn-ui, components, developer-tools, design-system]
readingTime: "13 min read"
---

# Building a Custom shadcn/ui Registry: Share Components Across Projects

shadcn/ui changed the game by making components something you own rather than import. Instead of `npm install @shadcn/button`, you copy the component source into your project, style it with your design tokens, and own it forever.

But what happens when you have 5 projects that all need the same customized set of components? Copying and pasting across repos is not sustainable. That's where a custom registry comes in.

## What Is a shadcn/ui Registry?

A registry is a JSON file (served over HTTP) that describes a collection of components, hooks, utilities, and styles. The shadcn CLI reads this file to install components into any project.

When you run `npx shadcn add button`, the CLI queries the official registry at `https://ui.shadcn.com/r`. You can point it at your own registry instead:

```bash
npx shadcn add button --registry https://ui.mycompany.com/r
```

Your registry can include:
- Custom components not in the official shadcn registry
- Modified versions of official components (your themed Button, your branded Input)
- Utility hooks specific to your stack
- Composite components (a DataTable that combines shadcn Table + react-table + tanstack-query)
- App-specific patterns (your AuthGuard, your PageLayout)

---

## registry.json Format

The registry format is a JSON file that follows the `Registry` schema:

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "my-company-registry",
  "homepage": "https://ui.mycompany.com",
  "items": [
    {
      "name": "data-table",
      "type": "registry:ui",
      "title": "Data Table",
      "description": "A powerful data table with sorting, filtering, and pagination.",
      "dependencies": [
        "@tanstack/react-table",
        "lucide-react"
      ],
      "registryDependencies": [
        "button",
        "input",
        "select"
      ],
      "files": [
        {
          "path": "ui/data-table.tsx",
          "content": "...",
          "type": "registry:ui"
        },
        {
          "path": "ui/data-table-toolbar.tsx",
          "content": "...",
          "type": "registry:ui"
        }
      ],
      "tailwind": {
        "config": {
          "theme": {
            "extend": {
              "colors": {
                "table-header": "hsl(var(--table-header))"
              }
            }
          }
        }
      }
    }
  ]
}
```

### Item Types

| Type | Description |
|------|-------------|
| `registry:ui` | React component (added to `components/ui/`) |
| `registry:component` | Application component (added to `components/`) |
| `registry:hook` | Custom hook (added to `hooks/`) |
| `registry:lib` | Utility library (added to `lib/`) |
| `registry:page` | Page/route component |
| `registry:file` | Arbitrary file (config, types, etc.) |

---

## Setting Up Your Registry

### Project Structure

```
my-registry/
├── public/
│   └── r/
│       └── index.json          # Main registry file
├── registry/
│   ├── ui/
│   │   ├── data-table.tsx
│   │   ├── command-palette.tsx
│   │   └── file-uploader.tsx
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   └── use-local-storage.ts
│   └── lib/
│       └── format.ts
├── scripts/
│   └── build-registry.ts       # Generates index.json from source
└── package.json
```

### Building the Registry JSON

Manually maintaining `registry.json` is error-prone. A build script is much better:

```typescript
// scripts/build-registry.ts
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

interface RegistryItem {
  name: string
  type: string
  title: string
  description: string
  files: Array<{ path: string; content: string; type: string }>
  dependencies?: string[]
  registryDependencies?: string[]
}

function extractMetadata(content: string): Record<string, string | string[]> {
  const metadata: Record<string, string | string[]> = {}

  // Extract from comment block at top of file
  // /**
  //  * @name DataTable
  //  * @description A powerful data table
  //  * @deps @tanstack/react-table,lucide-react
  //  * @registryDeps button,input
  //  */
  const commentMatch = content.match(/\/\*\*([\s\S]*?)\*\//)
  if (commentMatch) {
    const lines = commentMatch[1].split('\n')
    for (const line of lines) {
      const match = line.match(/@(\w+)\s+(.+)/)
      if (match) {
        const key = match[1]
        const value = match[2].trim()
        if (key === 'deps' || key === 'registryDeps') {
          metadata[key] = value.split(',').map(s => s.trim())
        } else {
          metadata[key] = value
        }
      }
    }
  }

  return metadata
}

function buildRegistry() {
  const registryDir = join(process.cwd(), 'registry')
  const items: RegistryItem[] = []

  function processDir(dir: string, type: string) {
    const files = readdirSync(dir)
    for (const file of files) {
      const filePath = join(dir, file)
      const stat = statSync(filePath)
      if (stat.isDirectory()) continue

      const content = readFileSync(filePath, 'utf-8')
      const meta = extractMetadata(content)
      const name = file.replace(/\.(tsx|ts)$/, '')

      items.push({
        name: meta.name as string || name,
        type: `registry:${type}`,
        title: (meta.title as string) || name,
        description: (meta.description as string) || '',
        dependencies: (meta.deps as string[]) || [],
        registryDependencies: (meta.registryDeps as string[]) || [],
        files: [{
          path: `${type}/${file}`,
          content,
          type: `registry:${type}`,
        }],
      })
    }
  }

  processDir(join(registryDir, 'ui'), 'ui')
  processDir(join(registryDir, 'hooks'), 'hook')
  processDir(join(registryDir, 'lib'), 'lib')

  const registry = {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'my-company-registry',
    homepage: 'https://ui.mycompany.com',
    items,
  }

  writeFileSync(
    join(process.cwd(), 'public', 'r', 'index.json'),
    JSON.stringify(registry, null, 2)
  )

  console.log(`Built registry with ${items.length} items`)
}

buildRegistry()
```

### Hosting

The registry just needs to serve static JSON. Options:

**Vercel (easiest):**
```bash
# Deploy to Vercel
vercel --prod

# Registry available at:
# https://my-registry.vercel.app/r/index.json
```

**GitHub Pages:**
```yaml
# .github/workflows/deploy-registry.yml
name: Deploy Registry
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci && npm run build-registry
      - uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./public
```

**Cloudflare Pages:** Zero-config static hosting, global CDN. Deploy the `public/` directory.

---

## Installing Components from Your Registry

```bash
# Install a specific component
npx shadcn add data-table --registry https://ui.mycompany.com/r

# Or set a default registry in your project's components.json
```

### components.json Configuration

```json
{
  "$schema": "https://ui.shadcn.com/schema/components.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "registries": {
    "mycompany": {
      "url": "https://ui.mycompany.com/r",
      "description": "MyCompany internal component registry"
    }
  }
}
```

With this config, developers can install from your registry with:
```bash
npx shadcn add mycompany/data-table
```

---

## Monorepo Registry Patterns

In a monorepo, you can serve your registry from a local path instead of a hosted URL:

```
packages/
  design-system/
    registry/
      ui/
      hooks/
    package.json       # includes build-registry script
apps/
  web-app/
  mobile-app/
  admin/
```

```json
// packages/design-system/package.json
{
  "name": "@mycompany/design-system",
  "scripts": {
    "registry:build": "tsx scripts/build-registry.ts",
    "registry:serve": "npx serve public -p 3001"
  }
}
```

During development:
```bash
# Terminal 1: serve the registry locally
cd packages/design-system && npm run registry:serve

# Terminal 2: install from local registry
cd apps/web-app
npx shadcn add data-table --registry http://localhost:3001/r
```

For CI, build the registry as part of the monorepo build and install with the full URL.

---

## Registry vs npm Package: When to Use Which

| Consideration | Custom Registry | npm Package |
|---------------|----------------|-------------|
| Component source control | You own it, customize freely | Owned by package author |
| Updates | Pull when you want them | `npm update` (can break) |
| Tailwind/CSS Variables | Integrated with your theme | Requires theme integration |
| Bundle size | Tree-shaken automatically | Depends on package |
| Discovery | Via CLI or docs | npm search |
| Versioning | Manual (copy is the version) | Semantic versioning |
| Multi-package | Works perfectly | Each install is independent |

**Use a registry when:**
- Components are highly theme-dependent (colors, spacing, fonts)
- You want to own the component code
- Components are composite (combine multiple shadcn primitives)
- The team needs to customize without forking

**Use an npm package when:**
- Component has no visual customization needed
- Strong version compatibility is important
- The component is a utility, not UI (date-fns, zod, etc.)
- You're distributing to external teams

---

## Versioning Strategy

Since registry installs copy code, there's no automatic version tracking. Two approaches:

**Changelog approach:** Maintain a `CHANGELOG.md` in your registry and bump a version field in `registry.json`. Document breaking changes. Developers check the changelog and re-install when they want updates.

**Git tag approach:** Tag your registry repo on each "release". Document install commands with specific tags:
```bash
npx shadcn add data-table --registry https://registry.mycompany.com/r@v1.2.0
```

For most internal teams, the changelog approach is sufficient. External distribution benefits from semantic versioning.

---

## Real-World Component Example

Here's a complete component with registry metadata:

```tsx
// registry/ui/async-combobox.tsx
/**
 * @name AsyncCombobox
 * @title Async Combobox
 * @description A combobox that fetches options from an API with debounce and loading states.
 * @deps lucide-react,@radix-ui/react-popover
 * @registryDeps button,command,popover,badge
 */
'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface Option {
  value: string
  label: string
}

interface AsyncComboboxProps {
  placeholder?: string
  onFetch: (query: string) => Promise<Option[]>
  onSelect: (value: string) => void
  debounceMs?: number
}

export function AsyncCombobox({
  placeholder = 'Search...',
  onFetch,
  onSelect,
  debounceMs = 300,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState('')
  const [options, setOptions] = React.useState<Option[]>([])
  const [loading, setLoading] = React.useState(false)
  const debounceRef = React.useRef<NodeJS.Timeout>()

  const handleSearch = (query: string) => {
    clearTimeout(debounceRef.current)
    if (!query) { setOptions([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await onFetch(query)
        setOptions(results)
      } finally {
        setLoading(false)
      }
    }, debounceMs)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} onValueChange={handleSearch} />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!loading && options.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option.value} value={option.value}
                  onSelect={(v) => { setValue(option.label); onSelect(v); setOpen(false) }}>
                  <Check className={cn('mr-2 h-4 w-4', value === option.label ? 'opacity-100' : 'opacity-0')} />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

This component doesn't exist in the official shadcn registry, but it's exactly the kind of composite component that belongs in a team registry.

Use the [shadcn Registry Builder](/tools/shadcn-registry-builder) to generate the `registry.json` structure for your components without memorizing the schema.

---

A custom shadcn/ui registry is the right choice once you have 2+ projects sharing design system components. The investment in setup (2-4 hours) pays back immediately in eliminating copy-paste drift and keeping your component library in sync across projects.
