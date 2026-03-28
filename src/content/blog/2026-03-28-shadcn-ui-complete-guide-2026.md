---
title: "shadcn/ui: The Complete Component Library Guide for 2026"
description: "Complete guide to shadcn/ui covering installation across Next.js, Vite, Remix, and Astro, theming with CSS variables, new 2025-2026 components, customization patterns, registry system, and comparison with Radix/MUI/Ant Design."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["shadcn", "react", "ui", "components", "tailwind", "design-system"]
readingTime: "15 min read"
---

shadcn/ui isn't a component library in the traditional sense — you don't install it as an npm package and import from it. Instead, you copy the components directly into your project. They become yours. You read them, modify them, and own them completely.

This unconventional approach turned out to be exactly what the React ecosystem needed. No more fighting library authors over customization. No more version lock-in. No more wondering what that component does internally. In 2026, shadcn/ui is the default starting point for serious React projects.

---

## What Makes shadcn/ui Different

**Traditional component libraries** (MUI, Ant Design, Chakra):
- Installed as `node_modules` package
- You import components and pass props
- Customization happens through theme objects, `sx` props, or CSS overrides
- You're at the mercy of the library's API design choices
- Bundle includes all components, even unused ones

**shadcn/ui**:
- Components are **copied into your `src/components/ui/` directory**
- Built on Radix UI primitives (accessibility for free) + Tailwind CSS
- Complete source code in your repo — no black boxes
- Customize by editing the file directly
- Bundle only includes components you actually added

```bash
# You don't install shadcn as a dependency
# You use the CLI to copy components into your project
npx shadcn@latest add button
# Creates: src/components/ui/button.tsx
```

---

## Installation

### Next.js (App Router)

```bash
# New project
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app

# Initialize shadcn
npx shadcn@latest init
```

The init command asks:
- Which style? (Default / New York)
- Which base color? (Slate / Gray / Zinc / Neutral / Stone)
- Where is your global CSS file?
- Use CSS variables for theming? (yes)
- Where is your tailwind.config.js?

After init, your project gets:
```
src/
├── components/
│   └── ui/          # Components land here
├── lib/
│   └── utils.ts     # cn() utility
tailwind.config.ts   # Updated with shadcn theme tokens
src/app/globals.css  # CSS variables added
```

### Vite + React

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Configure path alias in vite.config.ts
npm install -D @types/node

# Then init shadcn
npx shadcn@latest init
```

You'll need to configure path aliases:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

```json
// tsconfig.json — add paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Remix

```bash
npx create-remix@latest my-app
cd my-app
npx shadcn@latest init
```

Remix works well with shadcn. The main consideration: server-side rendering means your components render on the server first, so avoid browser-only APIs in component code.

### Astro

```bash
npm create astro@latest my-site
npx astro add react tailwind
npx shadcn@latest init
```

In Astro, shadcn components work in `.astro` files via the React integration, or in standalone `.tsx` files. Remember to add `client:load` (or `client:visible`) directives when interactivity is needed:

```astro
---
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
---

<!-- Static button — no interactivity needed -->
<Button>Click me</Button>

<!-- Dialog needs client-side JS -->
<Dialog client:load>
  <!-- dialog content -->
</Dialog>
```

---

## Adding Components

```bash
# Single component
npx shadcn@latest add button

# Multiple at once
npx shadcn@latest add button input label card

# Interactive browser (see all available)
npx shadcn@latest add
```

Each component pulls in its dependencies automatically. `dialog` also adds `button` if you don't have it. Components are placed in `src/components/ui/`.

### Core Components

```bash
# Form primitives
npx shadcn@latest add button input textarea label select checkbox radio-group switch

# Layout
npx shadcn@latest add card separator sheet sidebar

# Overlays
npx shadcn@latest add dialog drawer alert-dialog popover tooltip

# Navigation
npx shadcn@latest add navigation-menu tabs breadcrumb

# Data display
npx shadcn@latest add table badge avatar progress skeleton

# Feedback
npx shadcn@latest add alert toast sonner

# Forms (with react-hook-form + zod)
npx shadcn@latest add form
```

---

## Theming with CSS Variables

shadcn's theming system uses CSS custom properties, making it framework-agnostic and easy to customize.

### The Variable System

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;

  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;

  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;

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
  /* ... dark mode overrides */
}
```

Values use `h s% l%` format (HSL without the `hsl()` wrapper) so Tailwind can compose opacity modifiers: `bg-primary/80` becomes `hsl(var(--primary) / 0.8)`.

### Creating a Custom Theme

To brand shadcn for your product, override the CSS variables:

```css
/* Your brand theme */
:root {
  --primary: 262.1 83.3% 57.8%;        /* Purple */
  --primary-foreground: 210 20% 98%;

  --secondary: 220 14.3% 95.9%;
  --secondary-foreground: 220.9 39.3% 11%;

  --accent: 262.1 83.3% 95%;
  --accent-foreground: 262.1 83.3% 30%;

  --radius: 0.75rem;                    /* More rounded */
}
```

The theme generator at `ui.shadcn.com/themes` lets you preview and export themes visually.

### Dark Mode

```typescript
// With next-themes
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```typescript
// Theme toggle
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

---

## New Components in 2025–2026

### Sidebar (2025)

The most requested component. A complete sidebar system with collapsible, icon-only mode, nested items, and keyboard navigation:

```bash
npx shadcn@latest add sidebar
```

```typescript
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="/dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <main>
        <SidebarTrigger />
        {/* page content */}
      </main>
    </SidebarProvider>
  );
}
```

### Chart (2025)

Built on Recharts, with consistent theming and a clean API:

```bash
npx shadcn@latest add chart
```

```typescript
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const chartData = [
  { month: "Jan", desktop: 186, mobile: 80 },
  { month: "Feb", desktop: 305, mobile: 200 },
  // ...
];

const chartConfig = {
  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
};

export function BarChartComponent() {
  return (
    <ChartContainer config={chartConfig}>
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="desktop" fill="var(--color-desktop)" />
        <Bar dataKey="mobile" fill="var(--color-mobile)" />
      </BarChart>
    </ChartContainer>
  );
}
```

### Sonner (Toast replacement)

`sonner` replaces the original toast component with a cleaner API:

```bash
npx shadcn@latest add sonner
```

```typescript
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// In your layout
<Toaster position="bottom-right" />

// Anywhere in your app
toast.success("Post created!");
toast.error("Failed to save", { description: "Network error" });
toast.promise(savePost(), {
  loading: "Saving...",
  success: "Saved!",
  error: "Failed to save",
});
```

---

## Customization Patterns

### Extending a Component

The beauty of shadcn: open the file and edit it.

```typescript
// src/components/ui/button.tsx — the generated file
// Add a new variant directly:

const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground ...",
        destructive: "bg-destructive text-destructive-foreground ...",
        outline: "border border-input bg-background ...",
        secondary: "bg-secondary text-secondary-foreground ...",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Add your custom variant:
        brand: "bg-violet-600 text-white hover:bg-violet-700 shadow-lg",
        success: "bg-green-600 text-white hover:bg-green-700",
      },
      // ...
    },
  }
);
```

### Building Composite Components

Use shadcn primitives as building blocks:

```typescript
// src/components/ui/stat-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
}

export function StatCard({ title, value, change, changeLabel }: StatCardProps) {
  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge variant={isPositive ? "default" : "destructive"}>
          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {Math.abs(change)}%
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{changeLabel}</p>
      </CardContent>
    </Card>
  );
}
```

### Forms with react-hook-form + Zod

shadcn's `form` component wraps react-hook-form with accessible label/error associations:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
});

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", name: "" },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>Your primary email address.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Save changes</Button>
      </form>
    </Form>
  );
}
```

---

## The Registry System

Vite 6 enabled a new feature in shadcn: the registry system. You can publish your own component library using the shadcn format — your components, your team's design system, distributed the same way shadcn distributes its own components.

```json
// registry.json — your component registry
{
  "name": "my-company-ui",
  "homepage": "https://ui.mycompany.com",
  "items": [
    {
      "name": "stat-card",
      "type": "registry:ui",
      "dependencies": ["@/components/ui/card", "@/components/ui/badge"],
      "files": ["components/ui/stat-card.tsx"]
    }
  ]
}
```

Team members install your components the same way they'd install official shadcn components:

```bash
npx shadcn@latest add https://ui.mycompany.com/r/stat-card.json
```

This is how large organizations are building internal design systems in 2026: use shadcn's distribution mechanism for their own components without maintaining a separate npm package.

---

## shadcn/ui vs Radix UI vs MUI vs Ant Design

### Radix UI

shadcn is built ON Radix UI. Radix provides the unstyled, accessible primitives; shadcn adds Tailwind styling. You can use Radix directly if you want complete style control, but you're responsible for all styling:

```typescript
// Raw Radix — you write all the CSS
import * as Dialog from "@radix-ui/react-dialog";
<Dialog.Root>
  <Dialog.Overlay className="your-overlay-styles" />
  <Dialog.Content className="your-content-styles">
    ...
  </Dialog.Content>
</Dialog.Root>
```

**Use Radix when**: you have a custom design system with no Tailwind, or you're building a component library that needs to be style-agnostic.

### Material UI (MUI)

MUI is battle-tested and comprehensive. 80+ components, excellent TypeScript support, and the Material Design visual language baked in. The cost: bundle size (~300KB), theming complexity, and the `sx` prop system that fights Tailwind.

**Use MUI when**: your design requirements align with Material Design, your team already knows it, or you need the comprehensive component coverage (DataGrid, DatePicker, etc.).

### Ant Design

Ant Design is the enterprise choice, especially in Asian tech companies. Comprehensive, opinionated, and with enterprise-specific components (virtual tables, complex forms, tree views). The visual style is distinctly "enterprise" and takes significant effort to rebrand.

**Use Ant Design when**: you're building enterprise software with complex data tables and forms, or your target users expect enterprise UX patterns.

### shadcn/ui

**Use shadcn when**: you want full code ownership, Tailwind-first styling, modern React patterns, and a design that you can make distinctly yours.

---

## Performance Considerations

shadcn components are code that lives in your project — you're responsible for their performance. Key considerations:

**Tree-shaking**: since shadcn components are local files, they're always tree-shaken correctly. Unused components aren't in your bundle.

**Radix UI bundle size**: each Radix primitive (Dialog, Popover, etc.) adds to your bundle. Be deliberate about which components you add. A simple tooltip doesn't need the full Dialog primitive.

**Tailwind purging**: ensure your `tailwind.config.ts` content array includes your UI components:

```typescript
content: [
  "./src/**/*.{ts,tsx}",
  "./components/**/*.{ts,tsx}",
],
```

---

## Conclusion

shadcn/ui solved a real problem: the tension between needing production-ready components and needing the ability to fully customize them. By making component source code the distribution unit, it gives you both.

The 2025–2026 additions (Sidebar, Chart, improved theming, Registry) mature it from a clever experiment into a full design system foundation. The ecosystem around it — the theme generators, the block libraries, the CLI tooling — reflects genuine community investment.

For new React projects in 2026: start with shadcn. Add components as you need them. Build a small internal component library on top. Use the Registry when your team grows. By the time you need the advanced enterprise components that MUI offers, you'll know exactly what custom components you've built and what gaps remain.

**Related tools on DevPlaybook:**
- [Tailwind Color Palette Generator](/tools/tailwind-color-generator) — generate Tailwind color scales
- [CSS Variables Inspector](/tools/css-variables-inspector) — debug CSS custom properties
- [shadcn Theme Generator](/tools/shadcn-theme-generator) — create shadcn themes visually
