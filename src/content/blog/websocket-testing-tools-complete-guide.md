---
title: "WebSocket Testing Tools: Complete Guide (2025)"
description: "The best tools for testing WebSocket connections. Covers browser-based testers, CLI tools, load testing, debugging techniques, and common WebSocket issues."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["websocket", "api-testing", "real-time", "developer-tools", "debugging", "networking"]
readingTime: "10 min read"
faq:
  - question: "How do I test a WebSocket connection?"
    answer: "You can test WebSockets in the browser using the JavaScript console (new WebSocket('ws://...')), with browser DevTools Network tab (filter by WS), or with dedicated tools like websocat (CLI) or online WebSocket testers."
  - question: "What is the difference between ws:// and wss://"
    answer: "ws:// is unencrypted WebSocket, similar to HTTP. wss:// is WebSocket over TLS, similar to HTTPS. Always use wss:// in production. ws:// is acceptable only for local development."
  - question: "Why is my WebSocket connection failing?"
    answer: "Common causes: CORS headers missing on the server, incorrect URL (ws vs wss), firewall blocking the port, proxy stripping the Upgrade header, or server rejecting the handshake. Check browser DevTools Network tab for the initial HTTP upgrade request."
---

WebSockets enable real-time bidirectional communication — chat apps, live dashboards, collaborative editing, and push notifications all depend on them. But unlike REST APIs, WebSockets maintain persistent connections, which makes testing them fundamentally different.

This guide covers every tool and technique you need to test WebSocket connections, from browser DevTools to CLI clients to load testing.

---

## Understanding the WebSocket Lifecycle

Before testing, understand what you're testing:

```
Client                          Server
  |                               |
  |---HTTP GET (Upgrade request)->|
  |<--101 Switching Protocols-----|
  |                               |
  |====WebSocket Connection=======|
  |                               |
  |---{ "type": "ping" }--------->|
  |<--{ "type": "pong" }----------|
  |                               |
  |---Connection Close----------->|
  |<--Connection Close------------|
```

The WebSocket connection starts as an HTTP request with an `Upgrade: websocket` header. If the server accepts, it responds with `101 Switching Protocols` and the WebSocket session begins.

What you'll test:
1. **Connection establishment**: Can you connect?
2. **Message sending/receiving**: Are messages delivered correctly?
3. **Message format**: JSON, binary, text?
4. **Reconnection**: Does the client reconnect on disconnect?
5. **Error handling**: What happens when the server sends an error?
6. **Load**: How many concurrent connections can the server handle?

---

## 1. Browser DevTools (Built-in)

**Best for: Inspecting existing WebSocket connections in web apps**

Chrome, Firefox, and Edge all support WebSocket inspection in the Network tab:

1. Open DevTools → Network tab
2. Filter by **WS** (WebSocket)
3. Reload the page or trigger the WebSocket connection
4. Click the WebSocket connection in the list
5. Go to the **Messages** tab to see all frames

**What you can see:**
- Initial HTTP Upgrade request and headers
- All sent and received messages with timestamps
- Message sizes
- Binary vs text frames

**Limitation**: DevTools only shows connections initiated by the current page. You can't initiate new connections from here.

---

## 2. Browser Console

**Best for: Quick ad-hoc WebSocket testing without any tools**

Open any browser console and test a WebSocket directly:

```javascript
// Connect to a WebSocket server
const ws = new WebSocket('wss://echo.websocket.events');

// Set up event handlers
ws.onopen = () => {
  console.log('Connected');
  ws.send('Hello, WebSocket!');
};

ws.onmessage = (event) => {
  console.log('Received:', event.data);
};

ws.onerror = (error) => {
  console.error('Error:', error);
};

ws.onclose = (event) => {
  console.log('Disconnected:', event.code, event.reason);
};
```

**Sending JSON messages:**
```javascript
ws.send(JSON.stringify({ type: 'subscribe', channel: 'updates' }));
```

**Sending messages at intervals:**
```javascript
const interval = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  } else {
    clearInterval(interval);
  }
}, 1000);
```

**Closing the connection:**
```javascript
ws.close(1000, 'Normal closure');
```

---

## 3. websocat (CLI)

**Best for: Terminal-based WebSocket testing and scripting**

`websocat` is the WebSocket equivalent of `netcat` — a powerful CLI client.

**Install:**
```bash
# macOS
brew install websocat

# Linux (download binary)
wget https://github.com/vi/websocat/releases/latest/download/websocat.x86_64-unknown-linux-musl
chmod +x websocat.x86_64-unknown-linux-musl
sudo mv websocat.x86_64-unknown-linux-musl /usr/local/bin/websocat
```

**Basic usage:**
```bash
# Connect and interact interactively
websocat wss://echo.websocket.events

# Type messages, see responses
```

**Pipe messages:**
```bash
# Send a single message and exit
echo "Hello" | websocat wss://echo.websocket.events

# Send JSON
echo '{"type":"ping"}' | websocat wss://your-server.com/ws
```

**With authentication headers:**
```bash
websocat -H "Authorization: Bearer YOUR_TOKEN" wss://api.example.com/ws
```

**Continuous message stream:**
```bash
# Send a new message every second
while true; do
  echo '{"type":"heartbeat","ts":'$(date +%s)'}'
  sleep 1
done | websocat wss://api.example.com/ws
```

**Listen for N messages then exit:**
```bash
websocat --no-close -n 5 wss://api.example.com/ws
```

---

## 4. Postman

**Best for: Teams already using Postman for REST API testing**

Postman added WebSocket support in 2021. It provides a GUI for WebSocket testing alongside your existing REST collections.

**To use:**
1. Click **New** → **WebSocket Request**
2. Enter the WebSocket URL
3. Add headers if needed (under the Headers tab)
4. Click **Connect**
5. Type messages in the Message input and press Send

**Postman WebSocket features:**
- Save connections and messages to collections
- Add authentication headers
- Support for JSON and text messages
- Message history per session

**Limitation**: WebSocket collections can't be automated in the same way as REST collections.

---

## 5. Insomnia

**Best for: Developers using Insomnia for API testing**

Insomnia supports WebSocket connections alongside REST and GraphQL:

1. Create a new WebSocket request
2. Set the URL, headers, and connection settings
3. Connect and send messages interactively

Insomnia supports environment variables in WebSocket URLs, making it easy to switch between dev/staging/production.

---

## 6. wscat (Node.js CLI)

**Best for: Node.js developers who want a familiar tool**

```bash
# Install globally
npm install -g wscat

# Connect
wscat -c wss://echo.websocket.events

# With headers
wscat -c wss://api.example.com/ws \
  -H "Authorization: Bearer TOKEN"

# With subprotocols
wscat -c wss://api.example.com/ws \
  --subprotocol "chat,notifications"
```

---

## 7. Testing WebSockets in Node.js Scripts

**Best for: Automated tests and CI pipelines**

Use the `ws` library for programmatic WebSocket testing:

```javascript
const WebSocket = require('ws');

async function testWebSocket(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket timeout'));
    }, 5000);

    ws.on('open', () => {
      console.log('Connected to', url);
      ws.send(JSON.stringify({ type: 'ping' }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      messages.push(msg);

      if (msg.type === 'pong') {
        clearTimeout(timeout);
        ws.close();
        resolve(messages);
      }
    });

    ws.on('error', reject);
  });
}

// Run the test
testWebSocket('wss://your-server.com/ws')
  .then(messages => console.log('Test passed:', messages))
  .catch(err => console.error('Test failed:', err));
```

**Jest integration:**
```javascript
describe('WebSocket server', () => {
  let ws;

  beforeEach((done) => {
    ws = new WebSocket('ws://localhost:3001');
    ws.on('open', done);
  });

  afterEach(() => {
    ws.close();
  });

  test('responds to ping with pong', (done) => {
    ws.send(JSON.stringify({ type: 'ping' }));
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      expect(msg.type).toBe('pong');
      done();
    });
  });

  test('broadcasts messages to all clients', (done) => {
    const ws2 = new WebSocket('ws://localhost:3001');
    ws2.on('open', () => {
      ws.send(JSON.stringify({ type: 'broadcast', text: 'hello' }));
    });
    ws2.on('message', (data) => {
      const msg = JSON.parse(data);
      expect(msg.text).toBe('hello');
      ws2.close();
      done();
    });
  });
});
```

---

## Load Testing WebSockets

### Using Artillery

```yaml
# artillery-ws.yml
config:
  target: "wss://your-server.com"
  phases:
    - duration: 60
      arrivalRate: 10  # 10 new connections per second

scenarios:
  - engine: "ws"
    flow:
      - connect: "/ws"
      - send: '{"type": "subscribe", "channel": "updates"}'
      - think: 5
      - send: '{"type": "ping"}'
      - think: 10
```

```bash
npm install -g artillery
artillery run artillery-ws.yml
```

### Using k6

```javascript
// k6-ws-test.js
import ws from 'k6/ws';
import { check } from 'k6';

export const options = {
  vus: 100,         // 100 virtual users
  duration: '30s',
};

export default function () {
  const url = 'wss://your-server.com/ws';
  const response = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'subscribe' }));
    });

    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      check(msg, { 'message received': (m) => m.type !== undefined });
    });

    socket.setTimeout(() => socket.close(), 5000);
  });

  check(response, { 'status is 101': (r) => r && r.status === 101 });
}
```

---

## Common WebSocket Issues and Fixes

### Connection Fails with 403

The server is rejecting the handshake. Common causes:
- Missing or incorrect `Origin` header
- Authentication required
- CORS misconfiguration

```bash
# Check what the server expects
websocat -v wss://api.example.com/ws 2>&1 | head -30
```

### Messages Drop Under Load

Implement a message queue and acknowledgment system:
```javascript
const pendingAcks = new Map();

function sendWithAck(ws, message) {
  const id = Date.now();
  const payload = { ...message, id };
  pendingAcks.set(id, payload);
  ws.send(JSON.stringify(payload));

  setTimeout(() => {
    if (pendingAcks.has(id)) {
      console.warn('Message not acknowledged, resending:', id);
      ws.send(JSON.stringify(payload));
    }
  }, 3000);
}
```

### Connection Dies After 30-60 Seconds

Load balancers and proxies close idle connections. Implement heartbeat:
```javascript
const heartbeat = setInterval(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'ping' }));
  }
}, 25000);  // Every 25 seconds
```

### `ECONNREFUSED` in Tests

Your WebSocket server isn't starting before the tests run. Add a wait:
```javascript
function waitForWebSocket(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const ws = new WebSocket(url);
      ws.on('open', () => { ws.close(); resolve(); });
      ws.on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Timeout'));
        else setTimeout(attempt, 100);
      });
    }
    attempt();
  });
}
```

---

## Quick Testing Checklist

- [ ] Can you establish a connection?
- [ ] Does the server send a welcome/connected message?
- [ ] Can you send a message and receive a response?
- [ ] Does the server handle malformed JSON gracefully?
- [ ] Does the server close the connection cleanly?
- [ ] Does your client reconnect after a disconnect?
- [ ] Does the connection survive a 30-second idle period (heartbeat working)?
- [ ] Under load, are messages delivered without dropping?

---

## Related Tools

- [DevPlaybook API Tester](/tools/api-tester) — Test REST APIs alongside WebSocket services
- [DevPlaybook CORS Tester](/tools/cors-tester) — Debug CORS issues affecting WebSocket upgrades
- [DevPlaybook API Request Builder](/tools/api-request-builder) — Build authentication flows before connecting

---

## Level Up Your Real-Time Stack

Building a production WebSocket service? The **[Full-Stack Boilerplate Collection](/products)** includes a Node.js API starter with WebSocket support, Redis pub/sub integration, and reconnection handling already built in.
