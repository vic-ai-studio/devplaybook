# Frontend Component Snippets

**20 React + 5 Vue production-ready UI components — $14**

Copy-paste into any project. Zero dependencies. TypeScript. Accessible. Dark mode ready.

---

## What's Included

### React Components (20)

| Component | Description |
|-----------|-------------|
| **Modal** | Dialog with focus trap, keyboard close, overlay click, sizes |
| **Dropdown** | Select menu with keyboard nav, search, disabled options |
| **Toast** | Notifications with auto-dismiss, progress bar, 4 variants |
| **DataTable** | Sortable, searchable table with custom cell rendering |
| **Pagination** | Page numbers with ellipsis, prev/next, sibling count |
| **FileUpload** | Drag-and-drop with file validation, size limits, preview |
| **Tabs** | Tabbed interface with line/pill variants, keyboard nav |
| **Accordion** | Collapsible sections, single or multiple open |
| **SearchInput** | Debounced search with loading spinner, clear button |
| **ConfirmDialog** | Confirmation modal with danger/warning/default variants |
| **Tooltip** | Hover/focus tooltip with smart positioning |
| **Badge** | Status badges with dot indicator, removable, 6 colors |
| **Avatar** | Image with initials fallback, status dot, AvatarGroup |
| **Skeleton** | Loading placeholders — text, circle, card, table, list |
| **EmptyState** | Empty list/table placeholder with icon and CTA |
| **CopyButton** | Clipboard copy with feedback — button, icon, minimal |
| **ThemeToggle** | Dark/light/system toggle — icon, switch, dropdown |
| **ProgressBar** | Linear + circular progress, animated stripes, indeterminate |
| **Breadcrumbs** | Navigation breadcrumbs with collapse and SPA support |
| **CommandPalette** | Cmd+K palette with search, grouping, keyboard nav |

### Vue Components (5)

| Component | Description |
|-----------|-------------|
| **Modal.vue** | Dialog with Teleport, focus trap, scoped styles |
| **Dropdown.vue** | v-model select with keyboard navigation |
| **Toast.vue** | Notification with auto-dismiss and progress bar |
| **DataTable.vue** | Sortable table with scoped slot cell rendering |
| **Tabs.vue** | Tabbed interface with v-model and named slots |

### Styles

| File | Description |
|------|-------------|
| **components.css** | CSS variables (light + dark), focus styles, button/input utilities, animations |

---

## Installation

No package to install. Copy the files you need:

```bash
# Copy a single component
cp react/Modal.tsx your-project/src/components/Modal.tsx

# Copy everything
cp -r react/ your-project/src/components/
cp styles/components.css your-project/src/styles/
```

### Requirements

- **React**: React 18+ with TypeScript
- **Vue**: Vue 3.3+ with `<script setup>` and TypeScript
- **CSS**: Import `components.css` once in your app entry point

```tsx
// React — in App.tsx or index.tsx
import './styles/components.css';
```

```ts
// Vue — in main.ts
import './styles/components.css';
```

---

## Usage Examples

### Modal

```tsx
import { Modal } from './components/Modal';

function App() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Open Modal</button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Edit Profile"
        size="md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn btn-primary">Save</button>
          </>
        }
      >
        <p>Modal content goes here.</p>
      </Modal>
    </>
  );
}
```

### Dropdown

```tsx
import { Dropdown } from './components/Dropdown';

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'angular', label: 'Angular', disabled: true },
];

<Dropdown
  options={options}
  value={selected}
  onChange={setSelected}
  label="Framework"
  placeholder="Choose a framework"
/>
```

### Toast

```tsx
import { Toast, useToast } from './components/Toast';

function App() {
  const { toasts, addToast, removeToast } = useToast();

  return (
    <>
      <button onClick={() => addToast('File saved!', 'success')}>Show Toast</button>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </>
  );
}
```

### DataTable

```tsx
import { DataTable } from './components/DataTable';

const columns = [
  { key: 'name', title: 'Name' },
  { key: 'email', title: 'Email' },
  { key: 'role', title: 'Role', width: '120px' },
];

const data = [
  { id: 1, name: 'Alice', email: 'alice@example.com', role: 'Admin' },
  { id: 2, name: 'Bob', email: 'bob@example.com', role: 'User' },
];

<DataTable
  columns={columns}
  data={data}
  rowKey="id"
  searchable
  onRowClick={(row) => console.log(row)}
/>
```

### Pagination

```tsx
import { Pagination } from './components/Pagination';

<Pagination
  currentPage={page}
  totalPages={20}
  onPageChange={setPage}
  siblingCount={1}
/>
```

### FileUpload

```tsx
import { FileUpload } from './components/FileUpload';

<FileUpload
  onUpload={(files) => console.log(files)}
  accept="image/*,.pdf"
  multiple
  maxSizeMB={5}
/>
```

### Tabs

```tsx
import { Tabs } from './components/Tabs';

<Tabs
  variant="pill"
  tabs={[
    { value: 'code', label: 'Code', content: <CodeEditor /> },
    { value: 'preview', label: 'Preview', content: <Preview /> },
    { value: 'tests', label: 'Tests', content: <TestRunner /> },
  ]}
/>
```

### Accordion

```tsx
import { Accordion } from './components/Accordion';

<Accordion
  multiple
  items={[
    { value: 'faq1', title: 'How do I install?', content: <p>Run npm install...</p> },
    { value: 'faq2', title: 'Is it accessible?', content: <p>Yes, full ARIA support.</p> },
  ]}
/>
```

### SearchInput

```tsx
import { SearchInput } from './components/SearchInput';

<SearchInput
  onSearch={(q) => fetchResults(q)}
  placeholder="Search users..."
  debounceMs={300}
  loading={isSearching}
/>
```

### ConfirmDialog

```tsx
import { ConfirmDialog } from './components/ConfirmDialog';

<ConfirmDialog
  isOpen={showConfirm}
  onConfirm={handleDelete}
  onCancel={() => setShowConfirm(false)}
  title="Delete item?"
  message="This action cannot be undone."
  confirmText="Delete"
  variant="danger"
/>
```

### Tooltip

```tsx
import { Tooltip } from './components/Tooltip';

<Tooltip content="Copy to clipboard" position="top">
  <button>Copy</button>
</Tooltip>
```

### Badge

```tsx
import { Badge } from './components/Badge';

<Badge variant="success" dot>Active</Badge>
<Badge variant="error" removable onRemove={() => {}}>Error</Badge>
<Badge variant="purple" outline>Pro</Badge>
```

### Avatar

```tsx
import { Avatar, AvatarGroup } from './components/Avatar';

<Avatar src="/photo.jpg" name="Jane Doe" size="lg" status="online" />

<AvatarGroup max={3}>
  <Avatar name="Alice" />
  <Avatar name="Bob" />
  <Avatar name="Charlie" />
  <Avatar name="Diana" />
</AvatarGroup>
```

### Skeleton

```tsx
import { Skeleton, SkeletonTable, SkeletonList } from './components/Skeleton';

<Skeleton variant="text" lines={3} />
<Skeleton variant="circle" width={48} height={48} />
<SkeletonTable rows={5} cols={4} />
<SkeletonList items={3} />
```

### EmptyState

```tsx
import { EmptyState } from './components/EmptyState';

<EmptyState
  title="No results found"
  description="Try adjusting your search or filters."
  action={<button className="btn btn-primary">Clear filters</button>}
/>
```

### CopyButton

```tsx
import { CopyButton } from './components/CopyButton';

<CopyButton text="npm install react" />
<CopyButton text={code} variant="icon" />
<CopyButton text={snippet} variant="minimal" label="Copy code" />
```

### ThemeToggle

```tsx
import { ThemeToggle } from './components/ThemeToggle';

<ThemeToggle variant="icon" />
<ThemeToggle variant="switch" />
<ThemeToggle variant="dropdown" onChange={(theme) => console.log(theme)} />
```

### ProgressBar

```tsx
import { ProgressBar, CircularProgress } from './components/ProgressBar';

<ProgressBar value={65} label="Upload progress" showValue variant="gradient" />
<ProgressBar value={0} indeterminate label="Loading..." />
<CircularProgress value={75} size={80} color="#8b5cf6" />
```

### Breadcrumbs

```tsx
import { Breadcrumbs } from './components/Breadcrumbs';

<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Products', href: '/products' },
    { label: 'Widget Pro', current: true },
  ]}
  maxItems={4}
  onNavigate={(href) => router.push(href)}
/>
```

### CommandPalette

```tsx
import { CommandPalette, useCommandPalette } from './components/CommandPalette';

function App() {
  const { isOpen, close } = useCommandPalette(); // Opens with Cmd+K

  const commands = [
    { id: '1', label: 'New File', shortcut: 'Ctrl+N', group: 'File', action: () => {} },
    { id: '2', label: 'Search', shortcut: 'Ctrl+F', group: 'Edit', action: () => {} },
    { id: '3', label: 'Toggle Theme', group: 'View', action: toggleTheme },
  ];

  return <CommandPalette isOpen={isOpen} onClose={close} items={commands} />;
}
```

---

## Customization

All components use CSS custom properties. Override them in your CSS:

```css
:root {
  --primary: #8b5cf6;        /* Change accent color */
  --radius-md: 12px;          /* Rounder corners */
  --border-color: #ddd;       /* Custom borders */
}
```

Dark mode activates automatically with `data-theme="dark"` on `<html>` or the `.dark` class. The `ThemeToggle` component handles this for you.

---

## Screenshot Description

The component library renders as a clean, modern design system preview page showing:
- A grid of cards, each displaying one component in its default state
- Light and dark theme variants side by side
- Components use a neutral blue accent color with generous whitespace
- Typography is system-font based for fast loading
- All interactive components show hover/focus states

---

## License

This is a digital product for personal and commercial use. You may use these components in unlimited projects. Redistribution of the source files as a competing product is not permitted.
