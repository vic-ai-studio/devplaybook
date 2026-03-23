# React Admin Dashboard

A modern, responsive admin dashboard built with React, TypeScript, Tailwind CSS, and Recharts.

## Tech Stack

- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **Charts**: Recharts
- **Styling**: Tailwind CSS

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
src/
  components/
    Sidebar.tsx       # Collapsible sidebar with navigation
    TopBar.tsx        # Top bar with search, notifications, profile
    StatsCard.tsx     # Statistics display card
    DataTable.tsx     # Sortable, filterable, paginated data table
    Chart.tsx         # Recharts wrapper (line, bar, area)
  pages/
    Dashboard.tsx     # Main dashboard with charts and stats
    Users.tsx         # User management with CRUD modals
    Settings.tsx      # Tabbed settings form
  hooks/
    useAuth.ts        # Authentication state management
    useFetch.ts       # Data fetching with caching and refetch
  lib/
    api.ts            # API client with error handling
  App.tsx             # Router setup with layout
```

## Features

### Dashboard
- 4 stat cards with trend indicators
- Revenue & users area chart
- Weekly traffic bar chart
- Signups vs conversions line chart
- Recent orders feed

### Users Page
- Searchable, sortable data table
- Pagination with configurable page size
- Add user modal
- User detail drawer
- Summary cards (total, active, paid, suspended)

### Settings Page
- Tabbed interface (General, Notifications, Security)
- Toggle switches for boolean settings
- Form validation
- Danger zone for destructive actions

### Components
- **Sidebar**: Collapsible on desktop, slide-out on mobile
- **DataTable**: Generic, type-safe, with search/sort/pagination
- **Chart**: Wrapper around Recharts with consistent styling
- **StatsCard**: Flexible stat display with icons and trends

## Connecting to an API

Update `VITE_API_URL` in your `.env` file:

```env
VITE_API_URL=http://localhost:3001/api
```

The `api.ts` client automatically:
- Attaches JWT tokens from localStorage
- Handles 401 responses (redirects to login)
- Throws typed `ApiError` for error handling

## Customization

### Change the theme color

The dashboard uses blue as the primary color. Search and replace `blue-600` / `blue-500` with your preferred Tailwind color.

### Add a new page

1. Create a component in `src/pages/`
2. Add a route in `src/App.tsx`
3. Add a nav item in `src/components/Sidebar.tsx`

## License

MIT
