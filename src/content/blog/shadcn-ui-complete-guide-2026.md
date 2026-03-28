---
title: "shadcn/ui: The Component Library That Changes Everything - 2026 Guide"
description: "A complete guide to shadcn/ui: setup, customization, theming, best components, and how it compares to other libraries. Learn why developers choose it over Chakra, MUI, and Radix."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["shadcn-ui", "react", "component-library", "radix-ui", "tailwindcss", "ui-design"]
readingTime: "14 min read"
---

shadcn/ui isn't a component library in the traditional sense. You don't install it as a dependency. You don't import components from a package. Instead, you copy the source code directly into your project — and that single design decision changes everything about how UI components work.

Released in 2023 and now the default choice for most new React projects, shadcn/ui has over 80,000 GitHub stars and is used by Vercel, Linear, and thousands of production apps. This guide explains why it won, how to use it effectively, and how to make it your own.

---

## What Is shadcn/ui, Really?

shadcn/ui is a collection of reusable UI components built on top of Radix UI primitives and styled with Tailwind CSS. When you add a component, you run a CLI command that copies the source file into your project:

```bash
npx shadcn@latest add button
```

This creates `components/ui/button.tsx` in your project. That file is yours. Modify it, delete it, version it in Git — you have full ownership.

Compare this to traditional component libraries:

| Approach | Ownership | Customization | Updates |
|----------|-----------|---------------|---------|
| npm package (MUI, Chakra) | None | Limited (theme tokens) | `npm update` |
| shadcn/ui | Full | Unlimited (source code) | Manual copy, then customize |

This isn't a regression — it's a deliberate design choice. "Copy-paste components" sounds primitive, but it solves the real problem: every production app eventually needs to modify component internals. With an npm package, you fight the library's abstractions. With shadcn/ui, you just open the file.

---

## Installation

### Prerequisites

- React 18+
- Tailwind CSS (v3 or v4)
- TypeScript (recommended, not required)
- A supported framework: Next.js, Vite, Remix, Astro, or others

### New Project Setup

For a new Next.js project:

```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint
cd my-app
npx shadcn@latest init
```

The `init` command asks a few questions:

```
Which style would you like to use? › New York
Which color would you like to use as base color? › Zinc
Do you want to use CSS variables for colors? › yes
```

It then updates `tailwind.config.ts`, creates `components/ui/` directory, and sets up `lib/utils.ts` with the `cn` utility function.

### Adding to an Existing Project

If you already have a project with Tailwind CSS:

```bash
npx shadcn@latest init
```

It's non-destructive — it adds configuration without overwriting your existing files.

### The `cn` Utility

Every shadcn/ui component uses `cn`, a small utility that merges Tailwind classes intelligently:

```ts
// lib/utils.ts (auto-generated)
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`clsx` handles conditional class names. `twMerge` resolves Tailwind class conflicts (e.g., `"px-4 px-6"` → `"px-6"`). You'll use this throughout your own components too.

---

## Adding Components

Browse available components at `ui.shadcn.com/components` and add them with:

```bash
npx shadcn@latest add <component-name>
```

Examples:

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
npx shadcn@latest add data-table
```

To add multiple at once:

```bash
npx shadcn@latest add button card badge dialog sheet
```

Each command copies the component source into `components/ui/`.

---

## Best Components to Know

### Button

The foundation. More flexible than it looks:

```tsx
import { Button } from "@/components/ui/button"

// Variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Menu item</Button>
<Button variant="link">Click here</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>

// As child (renders as different element)
<Button asChild>
  <Link href="/dashboard">Go to Dashboard</Link>
</Button>
```

The `asChild` pattern is important. It lets you apply button styles to any element — links, form submits, custom components — without wrapping or prop drilling.

### Dialog

Accessible modal built on Radix Dialog primitive:

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Settings</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Edit Profile</DialogTitle>
      <DialogDescription>
        Make changes to your profile here.
      </DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Form content */}
    </div>
  </DialogContent>
</Dialog>
```

Handles focus trapping, keyboard navigation, and ARIA attributes automatically.

### Form

The most complex component — integrates React Hook Form with Zod validation:

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

const formSchema = z.object({
  username: z.string().min(2).max(50),
  email: z.string().email(),
})

function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "" },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>Your public display name.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

The `FormMessage` component automatically displays Zod validation errors.

### Data Table

The most powerful component — built on TanStack Table v8:

```tsx
npx shadcn@latest add data-table
```

After adding, follow the [Data Table docs](https://ui.shadcn.com/docs/components/data-table) to define columns and wire up your data. It gives you sorting, filtering, pagination, and row selection out of the box.

### Command

A versatile command palette component (used by many apps as Cmd+K):

```tsx
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function CommandMenu() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem>Dashboard</CommandItem>
          <CommandItem>Settings</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
```

---

## Theming

### CSS Variables Approach

shadcn/ui stores all design tokens as CSS variables in your global stylesheet:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark values */
  }
}
```

To customize the brand color, change `--primary`. Every component that uses `bg-primary`, `text-primary`, etc. updates automatically.

### Using the Theme Editor

The easiest way to generate a custom theme: visit [ui.shadcn.com/themes](https://ui.shadcn.com/themes), pick your colors and radius, then copy the generated CSS.

### Changing the Base Style

shadcn/ui offers two base styles:

- **Default** — square-ish, flat
- **New York** — slightly more opinionated, rounded, with subtle shadows

Set during `init`. To switch later, reinstall components with the new style:

```bash
npx shadcn@latest add button --style new-york
```

---

## Customization

Since you own the source, customization is unrestricted.

### Adding Variants

Open the component file and add to the `variants` object:

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "...",
        outline: "...",
        secondary: "...",
        ghost: "...",
        link: "...",
        // Add your own:
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-500 text-black hover:bg-yellow-600",
      },
    },
  }
)
```

Now `<Button variant="success">` works like any other variant.

### Extending Components

Create your own components that wrap shadcn/ui components:

```tsx
// components/ui/icon-button.tsx
import { Button, ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface IconButtonProps extends ButtonProps {
  loading?: boolean
  icon?: React.ReactNode
}

export function IconButton({ loading, icon, children, className, ...props }: IconButtonProps) {
  return (
    <Button className={cn("gap-2", className)} disabled={loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </Button>
  )
}
```

### Updating Components

When shadcn/ui releases a new version of a component, you can update with:

```bash
npx shadcn@latest add button --overwrite
```

This overwrites the file. If you've customized it, your changes will be lost — you'll need to re-apply them. This is the intended workflow: update, then re-apply customizations. For this reason, document your customizations clearly in comments.

---

## shadcn/ui vs Other Libraries

### vs Material UI (MUI)

**MUI**: Rich, opinionated, Google Material Design aesthetic. Deep theming system. Large bundle size. Tight control over your JSX — components accept specific props, wrapping is verbose.

**shadcn/ui**: Lighter, more flexible, more modern aesthetic. You own the code. Bundle size includes only what you add. Works with any Tailwind-based design.

Choose MUI for: admin dashboards where you want comprehensive pre-built patterns with minimal setup.
Choose shadcn/ui for: consumer apps or design-conscious products where visual distinctiveness matters.

### vs Chakra UI

**Chakra**: JSX-based styling props (`<Box px="4" bg="blue.500">`), runtime CSS-in-JS, good accessibility, strong ecosystem. Heavier runtime overhead.

**shadcn/ui**: Utility classes in JSX, zero CSS-in-JS runtime, Radix accessibility. Faster runtime performance.

Choose Chakra for: teams that prefer JSX-prop styling and need an extensive component palette fast.
Choose shadcn/ui for: teams that use Tailwind, want smaller bundles, or need more component control.

### vs Radix UI (Primitives)

**Radix**: Headless primitives — perfect accessibility, zero styling. You build all the styles yourself.

**shadcn/ui**: Radix primitives + pre-styled with Tailwind. You get the accessibility for free plus a reasonable default appearance.

shadcn/ui is essentially Radix with the first pass of styling done for you. If you find yourself building the same Radix wrappers repeatedly, shadcn/ui eliminates that work.

### vs Mantine

**Mantine**: Full-featured, opinionated library with hooks, forms, notifications, charts, and more. Large ecosystem. Good TypeScript support.

**shadcn/ui**: Focused on core UI components. Less opinionated about the rest of your stack. Smaller footprint.

Choose Mantine for: teams that want a complete UI framework with utilities and hooks included.
Choose shadcn/ui for: teams that already have solutions for state/forms/data-fetching and want composable UI components.

---

## Patterns for Production

### Component Organization

Keep shadcn/ui components in `components/ui/` (default location) and your application components in `components/` or feature-specific directories:

```
components/
  ui/                   # shadcn/ui source files (don't import from anywhere else)
    button.tsx
    dialog.tsx
    form.tsx
  layout/               # App-specific layout components
    sidebar.tsx
    header.tsx
  features/             # Feature components
    auth/
      login-form.tsx
    dashboard/
      metrics-card.tsx
```

### Compound Components Pattern

shadcn/ui uses compound components extensively. Embrace this pattern in your own components:

```tsx
function DashboardCard({ children }: { children: React.ReactNode }) {
  return <Card>{children}</Card>
}

DashboardCard.Header = CardHeader
DashboardCard.Title = CardTitle
DashboardCard.Content = CardContent

// Usage:
<DashboardCard>
  <DashboardCard.Header>
    <DashboardCard.Title>Revenue</DashboardCard.Title>
  </DashboardCard.Header>
  <DashboardCard.Content>
    <MetricsDisplay value={revenue} />
  </DashboardCard.Content>
</DashboardCard>
```

### Server Components Compatibility

Most shadcn/ui components work as Client Components (they use hooks or event handlers). But you can use them in Server Component trees by keeping interactivity at the leaves:

```tsx
// Server Component
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ProfileEditButton userId={userId} /> {/* Client Component */}
      </CardContent>
    </Card>
  )
}
```

`Card`, `CardHeader`, `CardTitle`, `CardContent` are all passive components — no hooks, no event handlers. They render fine on the server.

---

## Accessibility Built In

Every shadcn/ui component is built on Radix UI primitives, which means:

- Full keyboard navigation (Tab, Enter, Space, Arrow keys, Escape)
- ARIA attributes applied correctly
- Focus management (modals trap focus, popups return focus on close)
- Screen reader announcements for dynamic content
- High contrast and reduced motion support

This is the biggest hidden value of shadcn/ui. Getting accessibility right from scratch takes weeks. With shadcn/ui, it comes for free.

---

## Getting Started Checklist

1. Set up a project with Next.js + Tailwind CSS + TypeScript
2. Run `npx shadcn@latest init`
3. Open `ui.shadcn.com/themes`, pick a color scheme, copy the CSS
4. Add your first components: `button`, `card`, `dialog`, `form`
5. Read the source code for each component you add — understand what you own
6. Build one small feature (a modal, a form) before committing to the library for your whole project

---

## Key Takeaways

- shadcn/ui copies source into your project — you own and can modify every component
- Built on Radix UI primitives for bulletproof accessibility
- CSS variables drive theming — dark mode and rebranding are simple token swaps
- No runtime CSS-in-JS overhead
- Best choice for teams using Tailwind CSS who want composable, customizable UI
- The `cn` utility function is the glue — use it in your own components too
- Update components with `--overwrite` flag, then re-apply your customizations

The copy-paste model felt wrong the first time I heard it. After using it in production, it's obviously right. You stop fighting the library and start building your product.
