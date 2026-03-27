---
title: "WebSockets vs Server-Sent Events vs Long Polling: Choosing Real-time Communication in 2026"
description: "A practical deep-dive into WebSockets, Server-Sent Events (SSE), and Long Polling in 2026 — comparing architecture, HTTP/2 and HTTP/3 impact, Node.js examples, and a decision matrix for picking the right real-time strategy."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["websockets", "sse", "server-sent-events", "long-polling", "real-time", "nodejs", "http2", "http3"]
readingTime: "12 min read"
---

Real-time web applications are table stakes in 2026. Whether you're building a live chat, collaborative editor, stock ticker, or notification system, you need a strategy for pushing data from server to client — or exchanging it bidirectionally.

Three approaches dominate: **WebSockets**, **Server-Sent Events (SSE)**, and **Long Polling**. Each has a fundamentally different architecture, latency profile, and set of trade-offs. HTTP/2 and HTTP/3 have further shifted the calculus.

This guide cuts through the confusion with implementation examples, performance comparisons, and a clear decision matrix.

---

## The Core Communication Models

Before comparing specifics, understand the communication model each approach implements:

| Approach | Direction | Transport | Connection |
|----------|-----------|-----------|-----------|
| WebSockets | Bidirectional (full-duplex) | TCP (after HTTP upgrade) | Persistent |
| Server-Sent Events | Server → Client only | HTTP/1.1 or HTTP/2 | Persistent |
| Long Polling | Server → Client (pull-triggered) | HTTP/1.1 | Repeated |

These are not equivalent techniques with different syntax — they solve subtly different problems.

---

## WebSockets: Bidirectional, Full-Duplex

### How WebSockets Work

A WebSocket connection starts as an HTTP GET with an `Upgrade: websocket` header. Once the server sends a `101 Switching Protocols` response, the connection upgrades to a TCP socket. Both client and server can send frames at any time with minimal framing overhead (2–14 bytes per frame).

```
Client → Server: GET /ws HTTP/1.1
                 Upgrade: websocket
                 Connection: Upgrade
                 Sec-WebSocket-Key: <base64>

Server → Client: HTTP/1.1 101 Switching Protocols
                 Upgrade: websocket
                 Connection: Upgrade
                 Sec-WebSocket-Accept: <hash>

// Connection is now a raw TCP socket — full-duplex
```

### Node.js WebSocket Server Example

Using the popular `ws` library:

```js
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('Client connected:', req.socket.remoteAddress);

  ws.on('message', (data) => {
    // Echo to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  // Send welcome message
  ws.send(JSON.stringify({ type: 'welcome', message: 'Connected!' }));
});

server.listen(3000);
```

### Client-Side WebSocket

```js
const ws = new WebSocket('wss://api.example.com/ws');

ws.addEventListener('open', () => {
  ws.send(JSON.stringify({ type: 'join', room: 'general' }));
});

ws.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
});

ws.addEventListener('close', (event) => {
  console.log('Disconnected:', event.code, event.reason);
  // Implement reconnection logic here
});
```

### WebSocket Use Cases

WebSockets are ideal when you need **true bidirectional communication** with low latency:

- **Live chat** — messages flow in both directions simultaneously
- **Multiplayer games** — player positions, game state updates
- **Collaborative editing** — Google Docs-style real-time cursors and content sync
- **Trading platforms** — order placement + real-time price feed in one connection
- **IoT dashboards** — device telemetry in + control commands out

### WebSocket Scaling Considerations

Each WebSocket connection is stateful — it's tied to a specific server process. Horizontal scaling requires a **pub/sub layer** (Redis, NATS) to fan out messages across server instances:

```js
import { createClient } from 'redis';

const publisher = createClient();
const subscriber = createClient();
await publisher.connect();
await subscriber.connect();

// When a message arrives on this server
wss.on('connection', async (ws) => {
  ws.on('message', async (data) => {
    // Publish to Redis — all server instances receive it
    await publisher.publish('chat:general', data.toString());
  });
});

// Subscribe to receive messages from all instances
await subscriber.subscribe('chat:general', (message) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});
```

---

## Server-Sent Events (SSE): Unidirectional Server Push

### How SSE Works

SSE uses a regular HTTP connection with `Content-Type: text/event-stream`. The server holds the response open and writes newline-delimited `data:` events. The client uses the native `EventSource` API.

SSE is **unidirectional** — server pushes to client. The client sends data via separate HTTP requests.

```
Server → Client (continuous HTTP response):
  Content-Type: text/event-stream
  Cache-Control: no-cache

  data: {"type":"price","symbol":"AAPL","price":182.45}\n\n
  data: {"type":"price","symbol":"AAPL","price":182.47}\n\n
  event: alert
  data: {"message":"Circuit breaker triggered"}\n\n
```

### Node.js SSE Server Example

```js
import express from 'express';

const app = express();

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers immediately

  // Send an event every second
  const interval = setInterval(() => {
    const data = JSON.stringify({ timestamp: Date.now(), value: Math.random() });
    res.write(`data: ${data}\n\n`);
  }, 1000);

  // Named events
  setTimeout(() => {
    res.write(`event: alert\ndata: ${JSON.stringify({ message: 'Threshold reached' })}\n\n`);
  }, 5000);

  // Cleanup on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.listen(3000);
```

### Client-Side SSE

```js
const source = new EventSource('/events');

// Default message listener
source.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  updateDashboard(data);
});

// Named event listener
source.addEventListener('alert', (event) => {
  const alert = JSON.parse(event.data);
  showNotification(alert.message);
});

// Reconnect on error (EventSource does this automatically)
source.addEventListener('error', (event) => {
  if (source.readyState === EventSource.CLOSED) {
    console.log('Connection closed, will reconnect...');
  }
});
```

SSE provides **automatic reconnection** natively in the browser — if the connection drops, `EventSource` waits and retries automatically. The `Last-Event-ID` header allows the server to resume from where it left off.

### SSE Use Cases

SSE excels at **one-way push from server to client** without client message overhead:

- **Live notifications** — "You have a new message", order status updates
- **Progress indicators** — file upload progress, AI generation streaming
- **Live feeds** — news ticker, social media timeline, sports scores
- **Server log tailing** — streaming build logs, deployment status
- **LLM response streaming** — OpenAI/Anthropic stream their API responses via SSE

### HTTP/2 and SSE

SSE over HTTP/1.1 hits the browser's per-domain connection limit (typically 6). On HTTP/2, SSE uses stream multiplexing — **thousands of SSE connections can share a single TCP connection**. This dramatically improves SSE scalability for notification systems.

```
HTTP/1.1: 6 max SSE connections per domain
HTTP/2:   Effectively unlimited (multiplexed over one TCP)
```

---

## Long Polling: The Reliable Fallback

### How Long Polling Works

Long polling simulates push by having the client repeatedly make HTTP requests. The server **holds the response open** until new data is available (or a timeout expires), then responds. The client immediately fires another request after receiving a response.

```
Client → Server: GET /poll
                 (server holds connection open for up to 30s)

Server → Client: 200 OK { "message": "New notification", "id": 42 }
                 (responds as soon as data is available or timeout)

Client → Server: GET /poll?lastId=42
                 (immediately reconnects)
```

### Node.js Long Polling Example

```js
import express from 'express';

const app = express();
const waiters = new Map(); // Map<requestId, {res, timeout}>

// Simulate an event bus
function emitEvent(data) {
  waiters.forEach(({ res, timeout }, id) => {
    clearTimeout(timeout);
    res.json({ data, id });
    waiters.delete(id);
  });
}

app.get('/poll', (req, res) => {
  const id = Math.random().toString(36).slice(2);

  const timeout = setTimeout(() => {
    waiters.delete(id);
    res.json({ data: null, timeout: true }); // Return empty on timeout
  }, 25000); // 25s timeout

  waiters.set(id, { res, timeout });

  req.on('close', () => {
    const waiter = waiters.get(id);
    if (waiter) {
      clearTimeout(waiter.timeout);
      waiters.delete(id);
    }
  });
});

// Trigger an event (e.g., from a database change)
setInterval(() => emitEvent({ value: Math.random() }), 3000);

app.listen(3000);
```

### Long Polling Use Cases

Long polling is most valuable when:

- **Legacy browser or corporate proxy support** is required
- **WebSocket connections are blocked** (some enterprise firewalls block Upgrade headers)
- **Serverless environments** where persistent connections aren't feasible
- **Compatibility is more important than performance**

---

## HTTP/2 and HTTP/3: Impact on Each Approach

### HTTP/2 Multiplexing

HTTP/2 allows multiple concurrent request/response pairs over a single TCP connection. This changes the calculus for SSE (as noted above) but doesn't help WebSockets much — WebSockets already use a single persistent connection.

For long polling, HTTP/2 multiplexing allows hundreds of pending poll requests over one TCP connection, significantly reducing OS-level connection overhead.

### HTTP/3 and QUIC

HTTP/3 replaces TCP with QUIC (UDP-based). The key implications:

- **WebSockets over HTTP/3**: the spec (RFC 9220) enables WebSocket upgrades over QUIC. Browser support is maturing in 2026. Benefit: no head-of-line blocking at the transport layer.
- **SSE over HTTP/3**: SSE streams benefit from QUIC's improved packet loss recovery — a dropped packet doesn't block the entire stream.
- **Long Polling**: less impact — HTTP/3 reduces round-trip overhead slightly but doesn't change the fundamental polling pattern.

### TLS and Proxy Considerations

| Approach | Corporate Proxy Compatibility |
|----------|------------------------------|
| WebSockets | Sometimes blocked (requires `wss://` + proper proxy config) |
| SSE | Generally passes through (standard HTTP) |
| Long Polling | Almost always works (plain HTTP GET/POST) |

---

## Performance Comparison

| Metric | WebSockets | SSE | Long Polling |
|--------|-----------|-----|-------------|
| Latency | ~5–15ms | ~10–50ms | ~50–500ms |
| Bandwidth efficiency | High | High | Low (HTTP overhead per poll) |
| Server connections | 1 per client | 1 per client | Multiple (polling cycle) |
| CPU per message | Minimal | Minimal | Higher (new HTTP parse) |
| Reconnection overhead | Manual | Automatic | Automatic |
| Mobile battery impact | Low | Low | Higher |

---

## Decision Matrix: Which Should You Use?

### Use WebSockets when:

- **Bidirectional** communication is required (client sends AND receives frequently)
- **Low latency** is critical (< 20ms round trip)
- Building: **chat, multiplayer, collaborative tools, trading platforms, IoT dashboards**
- You control the infrastructure and can handle stateful connections

### Use Server-Sent Events when:

- Only the **server pushes** to the client (client sends data via normal HTTP)
- You want **automatic reconnection** without custom logic
- Building: **notifications, live feeds, progress tracking, LLM streaming, log tailing**
- Deploying behind HTTP/2 infrastructure (multiplexing solves connection limits)

### Use Long Polling when:

- Supporting environments where **WebSocket or SSE may be blocked**
- Deploying to **serverless functions** (Lambda, Cloudflare Workers, Vercel Edge) where persistent connections are costly
- **Simplicity** is more important than optimal performance
- Building a **fallback layer** for environments with limited connection support

---

## Choosing in Practice: A Flowchart

```
Does the client need to SEND data in real-time? (not just receive)
  ├── Yes → WebSockets
  └── No → Does the environment support persistent HTTP connections?
              ├── Yes (dedicated server, VPS) → SSE
              └── No (serverless, Lambda) → Long Polling
```

A common pattern is using **SSE for notifications** combined with **regular HTTP POST** for client-sent actions. This avoids WebSocket complexity while still delivering real-time push for most features.

---

## Conclusion

There's no universally "best" approach — the right choice depends on your communication pattern, infrastructure, and scale targets:

- **WebSockets** win when you need full-duplex, low-latency, bidirectional communication.
- **SSE** wins for unidirectional server-push with the simplicity of HTTP and native auto-reconnection.
- **Long Polling** wins when compatibility, portability, or serverless constraints rule out persistent connections.

HTTP/2 has strengthened SSE's position by removing the connection-count limitation. HTTP/3 (QUIC) is beginning to reduce WebSocket's head-of-line blocking problem. In 2026, SSE has become significantly more competitive for notification-style use cases than it was a few years ago.

Start simple: if you only push from server to client, use SSE. Add WebSockets only when you genuinely need the client to send real-time messages. Use Long Polling as a compatibility fallback, not a first choice.

---

*Related tools on DevPlaybook: [JSON Formatter](/tools/json-formatter) · [Base64 Encoder](/tools/base64-encoder) · [Regex Tester](/tools/regex-tester)*
