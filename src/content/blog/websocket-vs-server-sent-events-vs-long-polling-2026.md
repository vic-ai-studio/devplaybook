---
title: "WebSocket vs Server-Sent Events vs Long Polling: Real-Time Web Communication in 2026"
description: "Compare WebSocket, Server-Sent Events (SSE), and Long Polling for real-time web apps. Covers use cases, performance, browser support, scaling, and code examples to help you pick the right approach."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["websocket", "server-sent-events", "sse", "long-polling", "real-time", "web-development", "javascript"]
readingTime: "14 min read"
---

Building real-time features — chat, live dashboards, collaborative editing, notifications — means choosing how your server pushes data to the browser. Three approaches dominate: WebSockets, Server-Sent Events (SSE), and Long Polling. Each solves the same problem differently, and picking the wrong one adds complexity without benefit.

This guide explains how each approach works, when to use it, and what the tradeoffs look like in production.

---

## The Problem: HTTP Was Built for Request-Response

Standard HTTP works on a pull model: the browser asks, the server answers, the connection closes. For real-time data — stock prices, chat messages, live scores — you need the server to push updates without waiting for a request.

Three techniques emerged to bridge this gap:

- **Long Polling** — simulate push by holding requests open
- **Server-Sent Events (SSE)** — one-way server-to-client stream over HTTP
- **WebSockets** — full-duplex bidirectional connection

They differ in protocol, direction, latency, overhead, and how hard they are to scale. Understanding those differences prevents expensive rewrites.

---

## Long Polling: The Oldest Trick

### How It Works

The browser sends an HTTP request. Instead of responding immediately with "no new data," the server holds the connection open until data arrives (or a timeout fires). When the server sends a response, the browser immediately sends another request. This creates an illusion of continuous push.

```javascript
// Client-side long polling
async function longPoll(url) {
  while (true) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      const data = await res.json();
      handleUpdate(data);
    } catch (err) {
      if (err.name !== 'TimeoutError') {
        await new Promise(r => setTimeout(r, 2000)); // backoff on error
      }
    }
  }
}

longPoll('/api/updates');
```

```python
# Server-side long polling (FastAPI)
import asyncio
from fastapi import FastAPI
from asyncio import Queue

app = FastAPI()
event_queue: Queue = Queue()

@app.get("/api/updates")
async def long_poll():
    try:
        # Wait up to 29 seconds for an event
        event = await asyncio.wait_for(event_queue.get(), timeout=29)
        return {"data": event}
    except asyncio.TimeoutError:
        return {"data": None}  # Client will re-connect
```

### Characteristics

| Property | Long Polling |
|----------|-------------|
| Direction | Server → Client (one at a time) |
| Protocol | HTTP/1.1 or HTTP/2 |
| Latency | Medium (one RTT per message) |
| Server load | High (many open connections) |
| Proxy/firewall support | Excellent |
| Browser support | Universal |

### When to Use Long Polling

Long polling is rarely the right choice for new projects, but it remains useful when:

- You need to support very old browsers or constrained environments
- Firewalls or proxies aggressively close long-lived connections
- You're behind an HTTP gateway that doesn't support streaming responses
- You need a quick fallback for when SSE or WebSocket fails

The main drawback is inefficiency: every message requires a new HTTP handshake. Each request carries full headers (hundreds of bytes). Under load, this generates significant overhead compared to alternatives.

---

## Server-Sent Events: Simple One-Way Streaming

### How It Works

SSE opens a single, persistent HTTP connection. The server writes newline-delimited messages in a specific text format. The browser's `EventSource` API handles reconnection automatically.

```javascript
// Client-side SSE
const source = new EventSource('/api/stream');

source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

source.addEventListener('notification', (event) => {
  showNotification(JSON.parse(event.data));
});

source.onerror = () => {
  console.log('SSE connection lost, browser will reconnect automatically');
};
```

```python
# Server-side SSE (FastAPI)
import asyncio
from fastapi import FastAPI
from fastapi.responses import StreamingResponse

app = FastAPI()

async def generate_events():
    event_id = 0
    while True:
        data = await get_next_event()  # your data source
        event_id += 1
        yield f"id: {event_id}\ndata: {json.dumps(data)}\n\n"
        await asyncio.sleep(0)  # yield control

@app.get("/api/stream")
async def sse_endpoint():
    return StreamingResponse(
        generate_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
```

```javascript
// Node.js SSE server
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const sendEvent = (data, eventType = 'message') => {
      res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // Send a heartbeat every 15s to keep the connection alive
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });

    // Subscribe to your event source
    const unsubscribe = eventEmitter.on('update', (data) => sendEvent(data));
    req.on('close', unsubscribe);
  }
});
```

### The SSE Wire Format

SSE is plain text with a defined structure:

```
id: 42
event: price-update
data: {"symbol":"BTC","price":95420}

data: {"type":"heartbeat"}

```

- `id` — used by the browser to resume after reconnection (`Last-Event-ID` header)
- `event` — custom event type (default: `message`)
- `data` — the payload (can span multiple lines)
- Blank line — terminates the event

The browser sends `Last-Event-ID` on reconnect, letting you replay missed events.

### Characteristics

| Property | Server-Sent Events |
|----------|-------------------|
| Direction | Server → Client only |
| Protocol | HTTP/1.1 or HTTP/2 |
| Latency | Low (streaming, no re-connect per message) |
| Auto-reconnect | Built-in (EventSource API) |
| Proxy/firewall support | Good (standard HTTP) |
| Browser support | All modern browsers (no IE11) |
| Max connections | 6 per origin (HTTP/1.1), unlimited (HTTP/2) |

### HTTP/2 and the Connection Limit

HTTP/1.1 caps browsers at 6 simultaneous connections per origin. With SSE, one connection is permanent — meaning you're down to 5 for everything else, which is a real problem for apps with multiple SSE streams.

HTTP/2 multiplexes streams over one connection, making this a non-issue. If you're running HTTP/2 (most production setups do), SSE connection limits don't apply.

### When to Use SSE

SSE is the right choice when:

- Data flows server → client only (notifications, live feeds, progress bars, log streaming)
- You want simplicity — no special protocol, works through most proxies, automatic reconnect
- You're building with HTTP/2 infrastructure
- You need to resume streams after disconnect without custom logic

SSE is underused. Developers reach for WebSockets out of habit, then add complexity managing bidirectional state they never actually needed.

---

## WebSockets: Full-Duplex Bidirectional Communication

### How It Works

WebSocket starts as an HTTP request and upgrades to a persistent TCP connection using a handshake:

```
GET /chat HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

After upgrade, both sides can send messages at any time without waiting for a request. The protocol uses framing: each message is prefixed with a small header indicating type and length.

```javascript
// Client-side WebSocket
const ws = new WebSocket('wss://api.example.com/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'prices' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  handleMessage(msg);
};

ws.onclose = (event) => {
  console.log(`Closed: ${event.code} ${event.reason}`);
  setTimeout(reconnect, 1000); // manual reconnect
};

ws.onerror = (err) => {
  console.error('WebSocket error:', err);
};

function sendMessage(data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}
```

```python
# Server-side WebSocket (FastAPI + websockets)
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from typing import List

app = FastAPI()

class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.connections.remove(ws)

    async def broadcast(self, message: str):
        for ws in self.connections:
            await ws.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            data = await ws.receive_json()
            await handle_client_message(ws, data)
    except WebSocketDisconnect:
        manager.disconnect(ws)
```

```javascript
// Node.js WebSocket server (ws library)
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (socket, request) => {
  console.log(`Client connected: ${request.socket.remoteAddress}`);

  socket.on('message', (raw) => {
    const msg = JSON.parse(raw);
    handleMessage(socket, msg);
  });

  socket.on('close', (code, reason) => {
    handleDisconnect(socket, code, reason.toString());
  });

  // Ping/pong for keepalive detection
  socket.isAlive = true;
  socket.on('pong', () => { socket.isAlive = true; });
});

// Heartbeat interval to detect dead connections
setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30_000);
```

### Characteristics

| Property | WebSockets |
|----------|-----------|
| Direction | Bidirectional (full-duplex) |
| Protocol | ws:// / wss:// (custom framing over TCP) |
| Latency | Very low (persistent connection, no HTTP overhead) |
| Auto-reconnect | Manual (must implement yourself) |
| Proxy/firewall support | Variable (some proxies block upgrades) |
| Browser support | Universal |
| Scaling complexity | High (sticky sessions or pub/sub broker required) |

### Scaling WebSockets

WebSockets are stateful: each connection is bound to a specific server instance. Load balancers using round-robin routing will break reconnection unless you implement:

**Option 1: Sticky sessions** — route each client to the same server instance using IP hash or a cookie. Simple, but creates uneven load distribution.

**Option 2: Pub/Sub broker** — route messages through Redis Pub/Sub, Kafka, or similar. Any server instance can handle any connection because messages are broadcast through the broker.

```javascript
// Redis pub/sub pattern for WebSocket scaling
const Redis = require('ioredis');
const sub = new Redis();
const pub = new Redis();

// Subscribe to broadcast channel
sub.subscribe('broadcast');
sub.on('message', (channel, message) => {
  // Forward to all local WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

// To send a message that reaches all servers
async function broadcastAll(data) {
  await pub.publish('broadcast', JSON.stringify(data));
}
```

### When to Use WebSockets

WebSockets are justified when:

- Clients send data frequently (chat, multiplayer games, collaborative editing)
- You need sub-100ms latency with minimal overhead
- Bidirectional flow is intrinsic to the feature, not an afterthought
- You control the infrastructure and can handle sticky sessions or a message broker

---

## Head-to-Head Comparison

| Criteria | Long Polling | SSE | WebSocket |
|----------|-------------|-----|-----------|
| Data direction | Server → Client | Server → Client | Both directions |
| Protocol overhead | High (HTTP per message) | Low (persistent stream) | Very low (framing) |
| Latency | Medium | Low | Very low |
| Auto-reconnect | Manual | Built-in | Manual |
| Proxy support | Excellent | Good | Variable |
| Scaling complexity | Low | Low | High |
| Browser support | Universal | All modern | Universal |
| Server resource usage | High | Medium | Low per connection |
| Implementation complexity | Low | Low | Medium–High |

---

## Performance at Scale

**Long Polling under load:**
Each message requires a new TCP handshake (HTTP/1.1) or stream (HTTP/2). With 10,000 users receiving one update per second, you're processing 10,000 requests/second with full HTTP overhead. This is expensive.

**SSE under load:**
One persistent connection per client. The server writes to an open stream. Memory per connection is small; no handshake per message. 10,000 concurrent SSE connections is achievable on a single Node.js process with `async` generators.

**WebSocket under load:**
WebSockets use less bandwidth per message than HTTP (2–10 bytes framing vs. hundreds of bytes headers). At high message frequency, this matters. But connection state must be tracked in-process or externalized, adding infrastructure complexity.

**Real numbers (rough benchmarks on a 4-core server):**
- Long polling: ~2,000–5,000 concurrent clients before connection bottlenecks
- SSE: ~10,000–50,000 concurrent clients depending on message rate
- WebSocket: ~50,000–100,000+ with proper scaling infrastructure

---

## Decision Framework

Use this flow to choose:

```
Is the client sending data to the server frequently?
├── Yes → WebSocket
└── No: Does the client send data at all?
    ├── No → SSE (or Long Polling if proxy issues)
    └── Occasionally (e.g. user actions):
        ├── Use SSE for server push + regular HTTP POST for client requests
        └── (WebSocket is overkill unless latency is critical)
```

**Concrete examples:**

| Feature | Right Choice | Why |
|---------|-------------|-----|
| Live stock ticker | SSE | Server-to-client only, simple |
| Chat application | WebSocket | Both sides send frequently |
| CI/CD build logs | SSE | Stream output, no client input |
| Multiplayer game | WebSocket | High-frequency bidirectional |
| Push notifications | SSE | One-way, auto-reconnect is valuable |
| Collaborative editor | WebSocket | Low-latency bidirectional edits |
| Progress bar | SSE | Server pushes progress updates |

---

## Common Pitfalls

**WebSocket pitfalls:**
- No built-in reconnect — implement exponential backoff with jitter
- Corporate proxies may block `ws://` upgrades — always use `wss://` (TLS)
- Forgetting ping/pong heartbeats causes silent dead connections
- Load balancer timeout settings (many default to 60s) kill idle WebSocket connections

**SSE pitfalls:**
- HTTP/1.1 connection limit: deploy HTTP/2 or limit SSE to one stream per page
- Nginx buffers SSE by default — add `X-Accel-Buffering: no` header
- Long-lived connections consume server file descriptors — tune OS limits

**Long Polling pitfalls:**
- Race conditions when multiple tabs share state
- Missing the backoff on errors leads to request storms on server restart
- Response size: sending full state instead of deltas on every poll

---

## Choosing a Library

Rather than raw WebSocket or EventSource APIs, consider:

- **Socket.io** — WebSocket with fallback to long polling, rooms, namespaces. Good for chat and collaboration. Be aware it's opinionated and adds ~30KB client bundle.
- **Ably / Pusher / Supabase Realtime** — managed WebSocket infrastructure. Removes scaling concerns at the cost of vendor dependency.
- **EventSource polyfill** — adds SSE support to environments where `EventSource` is unavailable (some older mobile browsers).
- **@microsoft/fetch-event-source** — modern SSE client with POST support, retry logic, and abort signal.

---

## Practical Checklist Before You Build

Before implementing real-time features:

- [ ] Confirm whether the client actually needs to send data to the server in real time
- [ ] Check your load balancer's timeout settings for long-lived connections
- [ ] Verify HTTP/2 is enabled in production (critical for SSE connection limits)
- [ ] Plan for reconnection: what state does the client need to recover?
- [ ] Define your message format early (JSON envelope with `type` and `data` fields)
- [ ] Add server-side heartbeats to detect dead connections before the OS does
- [ ] Decide on authentication: WebSocket headers are limited; SSE uses standard HTTP cookies/headers

---

## Summary

Long Polling is a legacy approach worth knowing but rarely worth choosing. Server-Sent Events cover the majority of real-time use cases — notifications, feeds, progress, log streaming — with simplicity and solid HTTP compatibility. WebSockets are the right tool when you genuinely need bidirectional, low-latency communication, but they bring scaling complexity that SSE avoids.

The most common mistake is reaching for WebSockets by default because they're familiar. Before adding a WebSocket server, ask whether your feature actually requires the client to push data at high frequency. If not, SSE with regular HTTP requests for user actions is simpler, scales better, and works through more infrastructure.

---

## Tools Referenced in This Article

Explore related developer tools at DevPlaybook:

- [WebSocket Tester](/tools/websocket-tester) — test WebSocket connections and inspect messages in real time
- [JSON Formatter](/tools/json-formatter) — format and validate JSON payloads from WebSocket/SSE streams
- [HTTP Headers Reference](/tools/http-headers) — look up request/response headers for SSE and WebSocket upgrades
- [Regex Tester](/tools/regex) — build patterns to parse event stream data
