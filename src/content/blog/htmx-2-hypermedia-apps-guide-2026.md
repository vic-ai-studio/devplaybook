---
title: "HTMX 2.0: Hypermedia-Driven Apps Without JavaScript Frameworks 2026"
description: "A complete guide to HTMX 2.0 in 2026 — covering hx-get/post/swap attributes, server-sent events, WebSocket extension, and practical FastAPI + HTMX and Go + HTMX examples. Learn when to use HTMX vs React/Vue."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["htmx", "hypermedia", "javascript", "web-development", "fastapi", "go", "server-side"]
readingTime: "14 min read"
draft: false
---

Something unusual happened in 2023-2026: a library that avoids JavaScript frameworks became one of the most talked-about tools in web development. **HTMX** lets you build interactive web applications by extending HTML with custom attributes — no component tree, no virtual DOM, no build step.

In 2026, HTMX 2.0 is stable, battle-tested, and running in production at companies ranging from solo SaaS projects to GitHub-scale applications. This guide covers everything from basic attributes to real-world FastAPI and Go integrations.

---

## The Core Idea: HTML as Hypermedia

Traditional HTML forms can submit to a URL and the browser replaces the entire page. HTMX extends this model: any element can make HTTP requests and replace any part of the page with the response.

```html
<!-- Traditional HTML: full page reload -->
<form action="/search" method="GET">
  <input name="q" />
  <button type="submit">Search</button>
</form>

<!-- HTMX: partial update, no page reload -->
<input
  name="q"
  hx-get="/search"
  hx-trigger="keyup delay:300ms"
  hx-target="#results"
  hx-swap="innerHTML"
/>
<div id="results"></div>
```

The server returns HTML fragments, not JSON. HTMX takes that HTML and inserts it into the page where you specify. No JavaScript needed to make this work.

This is the "hypermedia-driven" philosophy: the server is the source of truth for both data and presentation. The browser is a thin client.

---

## Installation

HTMX is a single JavaScript file. No build step, no npm install required.

```html
<!-- CDN (development/small projects) -->
<script src="https://unpkg.com/htmx.org@2.0.0/dist/htmx.min.js"></script>

<!-- npm (for bundled projects) -->
```

```bash
npm install htmx.org
```

```javascript
// main.js
import 'htmx.org';
```

The entire library is ~14KB gzipped. Compare that to React (45KB) + ReactDOM (130KB) before you write a single line of application code.

---

## Core Attributes

### hx-get, hx-post, hx-put, hx-patch, hx-delete

These replace the default browser behavior with an AJAX request to the given URL.

```html
<!-- GET request on click -->
<button hx-get="/api/items">Load Items</button>

<!-- POST request with form data -->
<form hx-post="/api/items" hx-target="#item-list">
  <input name="title" placeholder="New item" />
  <button type="submit">Add</button>
</form>

<!-- DELETE request -->
<button hx-delete="/api/items/42" hx-target="closest li" hx-swap="outerHTML">
  Delete
</button>
```

### hx-trigger

Controls what event triggers the request.

```html
<!-- Default: click for buttons, submit for forms, change for inputs -->
<button hx-get="/data">Load (on click)</button>

<!-- Keyboard input with debounce -->
<input hx-get="/search" hx-trigger="keyup delay:300ms changed" />

<!-- On page load -->
<div hx-get="/stats" hx-trigger="load"></div>

<!-- Polling every 5 seconds -->
<div hx-get="/live-price" hx-trigger="every 5s"></div>

<!-- Intersection observer (when element enters viewport) -->
<div hx-get="/lazy-content" hx-trigger="intersect once"></div>

<!-- Custom event -->
<div hx-get="/refresh" hx-trigger="refreshData from:body"></div>
```

### hx-target

Specifies which element to update with the response.

```html
<!-- CSS selector -->
<button hx-get="/items" hx-target="#item-list">Load</button>

<!-- Relative selectors -->
<button hx-get="/edit" hx-target="closest .card">Edit</button>
<button hx-get="/next" hx-target="next .section">Next</button>
<button hx-get="/prev" hx-target="previous .section">Previous</button>

<!-- this = the element itself -->
<button hx-get="/inline" hx-target="this">Load inline</button>
```

### hx-swap

Controls how the response HTML is placed into the target.

```html
<!-- Replace inner content (default) -->
<div hx-swap="innerHTML">...</div>

<!-- Replace the entire element -->
<div hx-swap="outerHTML">...</div>

<!-- Prepend to inner content -->
<ul hx-swap="afterbegin">...</ul>

<!-- Append to inner content -->
<ul hx-swap="beforeend">...</ul>

<!-- Insert before the element -->
<div hx-swap="beforebegin">...</div>

<!-- Insert after the element -->
<div hx-swap="afterend">...</div>

<!-- Delete the target element -->
<button hx-delete="/items/1" hx-swap="delete" hx-target="closest li">
  Delete
</button>

<!-- Do nothing with the response -->
<button hx-post="/like" hx-swap="none">Like</button>
```

---

## Practical Patterns

### Search with Live Results

```html
<!-- search.html -->
<input
  type="search"
  name="q"
  placeholder="Search..."
  hx-get="/search"
  hx-trigger="keyup delay:300ms changed"
  hx-target="#results"
  hx-indicator="#spinner"
/>
<span id="spinner" class="htmx-indicator">Searching...</span>
<div id="results"></div>
```

The `htmx-indicator` class is added to `#spinner` during the request and removed when done. No JavaScript needed for loading states.

### Infinite Scroll

```html
<!-- items.html -->
<ul id="item-list">
  <!-- items rendered here -->
  <li>Item 1</li>
  <li>Item 2</li>
  <!-- last item triggers next page load -->
  <li
    hx-get="/items?page=2"
    hx-trigger="intersect once"
    hx-target="#item-list"
    hx-swap="beforeend"
  >
    Item 20
  </li>
</ul>
```

The server returns the next page of `<li>` elements plus a new trigger element pointing to page 3.

### Optimistic Delete

```html
<ul>
  <li id="item-42">
    Item title
    <button
      hx-delete="/items/42"
      hx-target="#item-42"
      hx-swap="outerHTML swap:1s"
      hx-confirm="Delete this item?"
    >
      Delete
    </button>
  </li>
</ul>
```

The `hx-confirm` shows a browser confirm dialog. `swap:1s` delays the DOM swap by 1 second — useful for CSS fade-out animations.

### Inline Editing

```html
<!-- Item in view mode -->
<div id="item-42">
  <span>Item title</span>
  <button hx-get="/items/42/edit" hx-target="#item-42" hx-swap="outerHTML">
    Edit
  </button>
</div>
```

Server returns the edit form:

```html
<!-- Server responds with -->
<form id="item-42" hx-put="/items/42" hx-target="#item-42" hx-swap="outerHTML">
  <input name="title" value="Item title" />
  <button type="submit">Save</button>
  <button hx-get="/items/42" hx-target="#item-42" hx-swap="outerHTML">
    Cancel
  </button>
</form>
```

After save, the server returns the view mode HTML. Full inline edit cycle with no JavaScript.

---

## Server-Sent Events (SSE)

HTMX 2.0 includes SSE support via the `sse` extension for real-time updates.

```html
<!-- Load the SSE extension -->
<script src="https://unpkg.com/htmx-ext-sse@2.0.0/sse.js"></script>

<!-- Connect to SSE endpoint and update on messages -->
<div
  hx-ext="sse"
  sse-connect="/events/notifications"
  sse-swap="message"
  hx-target="#notification-list"
  hx-swap="beforeend"
>
  <ul id="notification-list"></ul>
</div>
```

The server sends HTML fragments as SSE events:

```python
# FastAPI SSE endpoint
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

@app.get("/events/notifications")
async def notifications():
    async def event_generator():
        while True:
            # Your notification logic here
            notification = await get_next_notification()
            html = f"<li>{notification.message}</li>"
            yield f"data: {html}\n\n"
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## WebSocket Support

```html
<!-- WebSocket extension -->
<script src="https://unpkg.com/htmx-ext-ws@2.0.0/ws.js"></script>

<div hx-ext="ws" ws-connect="/ws/chat">
  <div id="chat-messages"></div>

  <form ws-send>
    <input name="message" placeholder="Type a message..." />
    <button type="submit">Send</button>
  </form>
</div>
```

`ws-send` sends the form data over the WebSocket. The server responds with HTML that HTMX inserts into the page.

---

## FastAPI + HTMX Example

Here is a complete task list application with FastAPI:

```python
# main.py
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# In-memory store (use a real DB in production)
tasks = [
    {"id": 1, "title": "Buy groceries", "done": False},
    {"id": 2, "title": "Write tests", "done": True},
]
next_id = 3

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "tasks": tasks
    })

@app.post("/tasks", response_class=HTMLResponse)
async def create_task(request: Request, title: str = Form(...)):
    global next_id
    task = {"id": next_id, "title": title, "done": False}
    tasks.append(task)
    next_id += 1
    # Return just the new task HTML, not the full page
    return templates.TemplateResponse("partials/task.html", {
        "request": request,
        "task": task
    })

@app.delete("/tasks/{task_id}", response_class=HTMLResponse)
async def delete_task(task_id: int):
    global tasks
    tasks = [t for t in tasks if t["id"] != task_id]
    return ""  # Empty response: HTMX removes the element

@app.put("/tasks/{task_id}/toggle", response_class=HTMLResponse)
async def toggle_task(request: Request, task_id: int):
    for task in tasks:
        if task["id"] == task_id:
            task["done"] = not task["done"]
            return templates.TemplateResponse("partials/task.html", {
                "request": request,
                "task": task
            })
```

```html
<!-- templates/index.html -->
<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/htmx.org@2.0.0/dist/htmx.min.js"></script>
</head>
<body>
  <h1>Task List</h1>

  <form hx-post="/tasks" hx-target="#task-list" hx-swap="beforeend" hx-on::after-request="this.reset()">
    <input name="title" placeholder="New task..." required />
    <button type="submit">Add</button>
  </form>

  <ul id="task-list">
    {% for task in tasks %}
      {% include "partials/task.html" %}
    {% endfor %}
  </ul>
</body>
</html>
```

```html
<!-- templates/partials/task.html -->
<li id="task-{{ task.id }}">
  <input
    type="checkbox"
    {% if task.done %}checked{% endif %}
    hx-put="/tasks/{{ task.id }}/toggle"
    hx-target="#task-{{ task.id }}"
    hx-swap="outerHTML"
  />
  <span {% if task.done %}style="text-decoration: line-through"{% endif %}>
    {{ task.title }}
  </span>
  <button
    hx-delete="/tasks/{{ task.id }}"
    hx-target="#task-{{ task.id }}"
    hx-swap="outerHTML"
  >
    Delete
  </button>
</li>
```

Full CRUD with real-time updates, no JavaScript, ~60 lines of Python.

---

## Go + HTMX Example

Go's `html/template` package pairs naturally with HTMX:

```go
// main.go
package main

import (
    "html/template"
    "net/http"
    "strconv"
    "sync"
)

type Task struct {
    ID    int
    Title string
    Done  bool
}

var (
    mu     sync.Mutex
    tasks  = []Task{{1, "Buy groceries", false}, {2, "Write tests", true}}
    nextID = 3
)

var taskTmpl = template.Must(template.New("task").Parse(`
<li id="task-{{.ID}}">
  <input type="checkbox" {{if .Done}}checked{{end}}
    hx-put="/tasks/{{.ID}}/toggle"
    hx-target="#task-{{.ID}}"
    hx-swap="outerHTML" />
  <span {{if .Done}}style="text-decoration:line-through"{{end}}>{{.Title}}</span>
  <button hx-delete="/tasks/{{.ID}}" hx-target="#task-{{.ID}}" hx-swap="outerHTML">
    Delete
  </button>
</li>
`))

func main() {
    mux := http.NewServeMux()

    mux.HandleFunc("POST /tasks", func(w http.ResponseWriter, r *http.Request) {
        mu.Lock()
        task := Task{ID: nextID, Title: r.FormValue("title"), Done: false}
        tasks = append(tasks, task)
        nextID++
        mu.Unlock()
        taskTmpl.Execute(w, task)
    })

    mux.HandleFunc("DELETE /tasks/{id}", func(w http.ResponseWriter, r *http.Request) {
        id, _ := strconv.Atoi(r.PathValue("id"))
        mu.Lock()
        for i, t := range tasks {
            if t.ID == id {
                tasks = append(tasks[:i], tasks[i+1:]...)
                break
            }
        }
        mu.Unlock()
        // Empty response = HTMX deletes the element
    })

    http.ListenAndServe(":8080", mux)
}
```

Go's standard library is all you need — no framework required.

---

## HTMX vs React/Vue: When to Use Each

This is the question everyone asks. The honest answer: it depends on your application's complexity.

### HTMX Wins When:

**Server-side rendering is already your model** — if you use Django, Rails, FastAPI, Go, Laravel, or any server-side framework, HTMX slots in with zero architectural change.

**Your interactions are CRUD-heavy** — creating, reading, updating, deleting records with form submissions. This is most business software.

**SEO is critical** — HTMX pages are server-rendered HTML. Search engines index them perfectly without any SSR configuration.

**You want minimal frontend complexity** — no build step, no state management library, no component lifecycle to reason about.

**Your team is backend-heavy** — backend developers can build full interactive UIs without deep JavaScript knowledge.

### React/Vue Win When:

**Client state is complex** — real-time collaborative features, complex multi-step forms, draggable/sortable interfaces where client state diverges significantly from server state.

**You need rich interactivity** — data visualizations, canvas, WebGL, complex animations.

**Offline support is required** — Progressive Web Apps with service workers and local data sync.

**Your team is frontend-heavy** — React/Vue have better tooling, better debugging, and larger talent pools.

**Performance at scale** — for pages with hundreds of dynamically updating elements, virtual DOM diffing outperforms replacing large HTML chunks.

### The Pragmatic Take in 2026

The "HTMX vs React" framing is a false dichotomy for most teams. Many applications use:

- HTMX for 80% of interactions (CRUD, navigation, modals, search)
- React/Svelte components for the 20% that needs rich client interactivity (data tables with sorting, file uploaders, complex forms)

HTMX includes `hx-boost` for SPA-like navigation and integrates with any web component library.

---

## hx-boost: SPA Navigation

```html
<!-- Apply to entire app: all links become fetch requests -->
<body hx-boost="true">
  <nav>
    <a href="/home">Home</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
  <!-- Links now replace #content without full page reload -->
  <div id="content">...</div>
</body>
```

`hx-boost` intercepts all link clicks within the element and replaces the `body` content with an AJAX fetch. This gives SPA-like navigation without a client-side router.

---

## Performance Considerations

HTMX has different performance characteristics than React apps:

**Network:** Every interaction requires a round trip to the server. This means latency matters more. Use server-side caching aggressively.

**Parsing:** The browser re-parses HTML on every swap. For small fragments this is negligible; for large tables it is slower than virtual DOM diffing.

**State:** No client-side state means less memory usage and no stale state bugs. Complex local state (like a multi-step wizard) requires workarounds.

**First Load:** HTMX pages are typically faster to first-contentful-paint than React SPAs because there is no JavaScript hydration step.

**Tips for HTMX performance:**

```html
<!-- Preload on hover -->
<a href="/heavy-page" hx-preload>Heavy Page</a>

<!-- Boost with push-url for proper browser history -->
<div hx-boost="true" hx-push-url="true">
  <a href="/page2">Page 2</a>
</div>

<!-- Cache busting: add version to URLs if response is cached -->
<div hx-get="/data?v=2" hx-trigger="load"></div>
```

---

## HTMX Response Headers

Servers can control HTMX behavior via response headers:

```python
# FastAPI examples
from fastapi import Response

@app.post("/items")
async def create_item(response: Response, title: str = Form(...)):
    item = create_item_in_db(title)
    # Redirect browser after successful POST
    response.headers["HX-Redirect"] = "/items"
    # Trigger a client-side event
    response.headers["HX-Trigger"] = "itemCreated"
    # Replace a different target than specified in HTML
    response.headers["HX-Retarget"] = "#notification"
    # Change the swap method
    response.headers["HX-Reswap"] = "beforeend"
    return f"<li>{item.title}</li>"
```

---

## Quick Reference

```html
<!-- GET on click, replace #target -->
<button hx-get="/url" hx-target="#target">Load</button>

<!-- POST form, append to list -->
<form hx-post="/items" hx-target="#list" hx-swap="beforeend">...</form>

<!-- DELETE, remove element -->
<button hx-delete="/items/1" hx-target="closest li" hx-swap="outerHTML">Del</button>

<!-- Live search with debounce -->
<input hx-get="/search" hx-trigger="keyup delay:300ms changed" hx-target="#results" />

<!-- Polling -->
<div hx-get="/live" hx-trigger="every 5s" hx-swap="innerHTML">...</div>

<!-- Lazy load on scroll -->
<div hx-get="/lazy" hx-trigger="intersect once">...</div>

<!-- Confirm dialog -->
<button hx-delete="/items/1" hx-confirm="Sure?">Delete</button>

<!-- Loading indicator -->
<button hx-get="/slow" hx-indicator="#spinner">Load</button>
<span id="spinner" class="htmx-indicator">Loading...</span>

<!-- Boost all links in section -->
<nav hx-boost="true">...</nav>
```

---

## Conclusion

HTMX 2.0 represents a genuine alternative to JavaScript framework-driven development — not a toy, not a weekend experiment, but a production-proven approach used by thousands of applications.

If you are building server-rendered applications with standard CRUD patterns, HTMX eliminates an entire category of complexity: no state management, no component lifecycle, no build configuration, no hydration mismatches. Your backend developers can build interactive UIs. Your pages are SEO-friendly by default. Your bundle is 14KB.

The right question is not "HTMX or React?" but "what does my application actually need?" For most business applications, HTMX covers 80-100% of the interactivity requirements. For applications with genuinely complex client-side state, React and Vue are still the right tools.

Try HTMX on your next server-side project. You might be surprised how little JavaScript you actually need.

---

*Documentation: htmx.org. Examples tested with HTMX 2.0.0, FastAPI 0.115.x, Go 1.22.*
