---
title: "How to Set Up a Local HTTPS Development Environment in 2025 (mkcert Guide)"
description: "A step-by-step guide to running your local development server over HTTPS using mkcert — covering macOS, Windows, and Linux, plus integration with Vite, Next.js, and nginx."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["https", "ssl", "mkcert", "local-development", "vite", "next-js", "developer-tools"]
readingTime: "8 min read"
---

Some features only work over HTTPS: Secure cookies, Service Workers, Web Crypto API, HTTP/2, and certain OAuth flows. Developing without HTTPS means running into these walls repeatedly — or deploying to staging just to test basic functionality.

The solution is a local HTTPS setup. In 2025, this takes about 10 minutes with the right tool.

---

## Why Not Just Use `localhost` HTTP?

HTTP localhost works for most things, but breaks for:

- **Cookies with `Secure` flag**: Won't be sent over HTTP — breaks auth flows
- **Service Workers**: Registration requires HTTPS (localhost is an exception, but some tools don't honor it)
- **Camera/Microphone access**: Requires secure context in most browsers
- **Web Crypto API**: `crypto.subtle` requires HTTPS
- **HTTP/2**: Browsers only support HTTP/2 over TLS
- **Mixed content warnings**: Your local app calling HTTPS APIs may hit issues
- **OAuth redirects**: Some providers require HTTPS redirect URIs

If you're building anything beyond a basic CRUD app, local HTTPS is worth setting up.

---

## The Tool: mkcert

[mkcert](https://github.com/FiloSottile/mkcert) is a simple tool that:

1. Creates a local Certificate Authority (CA) on your machine
2. Installs that CA as trusted in your system and browsers
3. Issues certificates for any domain you specify

The result: certificates that your browser trusts completely — no warnings, no clicks, no security exceptions.

---

## Installation

### macOS

```bash
# Install via Homebrew
brew install mkcert

# Install the local CA (one-time setup)
mkcert -install
```

### Linux (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt install libnss3-tools

# Download mkcert binary
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Install the local CA
mkcert -install
```

### Windows

```powershell
# Using Chocolatey
choco install mkcert

# Or using Scoop
scoop install mkcert

# Install the local CA (run as Administrator)
mkcert -install
```

**What `-install` does**: Creates a root CA certificate and installs it in your system trust store (macOS Keychain, Windows Certificate Store, or Firefox/Chrome's trust store on Linux). From this point, any certificate signed by this CA is trusted by your browser.

---

## Generate a Certificate

```bash
# Generate a certificate for localhost
mkcert localhost

# Output:
# Created a new certificate valid for the following names:
#  - "localhost"
# The certificate is at "./localhost.pem"
# The key is at "./localhost-key.pem"
```

```bash
# Generate for multiple domains (useful if you use custom local domains)
mkcert localhost 127.0.0.1 ::1 myapp.local

# Or for a custom domain
mkcert myapp.local
```

You now have two files:
- `localhost.pem`: The certificate
- `localhost-key.pem`: The private key

Move these to a directory you'll reference in your dev server config.

---

## Integrate With Your Dev Server

### Vite

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.join(__dirname, 'certs/localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'certs/localhost.pem')),
    },
    port: 3000,
  },
})
```

Now `npm run dev` serves your app at `https://localhost:3000`.

**Alternatively, use the vite-plugin-mkcert plugin:**

```bash
npm install --save-dev vite-plugin-mkcert
```

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

export default defineConfig({
  plugins: [react(), mkcert()],  // Handles mkcert automatically
  server: {
    https: true,
    port: 3000,
  },
})
```

This plugin installs mkcert, generates certificates, and configures HTTPS automatically.

---

### Next.js

**Next.js 13.5+ with experimental HTTPS:**

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Note: this feature is experimental as of 2025
  },
}

module.exports = nextConfig
```

```bash
# Start with HTTPS (Next.js 14.1+)
next dev --experimental-https
```

This auto-generates a certificate using mkcert if installed.

**Manual certificate approach:**

```json
// package.json
{
  "scripts": {
    "dev": "node server.js"
  }
}
```

```js
// server.js
const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')

const app = next({ dev: true })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost.pem'),
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, () => {
    console.log('> Ready on https://localhost:3000')
  })
})
```

---

### Express / Node.js

```js
const express = require('express')
const https = require('https')
const fs = require('fs')

const app = express()

app.get('/', (req, res) => {
  res.send('Hello HTTPS!')
})

const options = {
  key: fs.readFileSync('./certs/localhost-key.pem'),
  cert: fs.readFileSync('./certs/localhost.pem'),
}

https.createServer(options, app).listen(3000, () => {
  console.log('Server running at https://localhost:3000/')
})
```

---

### nginx (for proxying multiple services)

If you run multiple local services and want to proxy them through a single HTTPS endpoint:

```nginx
# /etc/nginx/sites-available/local-dev
server {
    listen 443 ssl;
    server_name myapp.local;

    ssl_certificate /path/to/certs/myapp.local.pem;
    ssl_certificate_key /path/to/certs/myapp.local-key.pem;

    # Proxy to your dev server
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl;
    server_name api.myapp.local;

    ssl_certificate /path/to/certs/api.myapp.local.pem;
    ssl_certificate_key /path/to/certs/api.myapp.local-key.pem;

    location / {
        proxy_pass http://localhost:4000;  # Your API server
    }
}
```

Add to `/etc/hosts`:

```
127.0.0.1 myapp.local
127.0.0.1 api.myapp.local
```

---

## Custom Local Domains

Using `myapp.local` instead of `localhost` more closely mirrors production and makes multi-service development cleaner.

```bash
# Generate cert for custom domain
mkcert myapp.local api.myapp.local
```

Add to `/etc/hosts` (macOS/Linux):

```bash
sudo nano /etc/hosts
# Add:
127.0.0.1 myapp.local
127.0.0.1 api.myapp.local
```

Windows (`C:\Windows\System32\drivers\etc\hosts`):

```
127.0.0.1 myapp.local
127.0.0.1 api.myapp.local
```

---

## Troubleshooting

### "Your connection is not private" still showing

The CA wasn't installed correctly. Re-run:

```bash
mkcert -install
```

On Linux, you may need to restart the browser after installation.

### Firefox doesn't trust the certificate

Firefox uses its own certificate store. mkcert handles this with `nss` installed:

```bash
# Linux
sudo apt install libnss3-tools
mkcert -install

# macOS: Firefox should work automatically after mkcert -install
```

### Certificate expired

mkcert certificates are valid for 2 years by default. Regenerate:

```bash
mkcert localhost
```

### Works in Chrome but not Firefox

Firefox requires NSS tools. On Linux:

```bash
sudo apt install libnss3-tools
mkcert -uninstall && mkcert -install
```

### iOS/Android device testing

For testing on physical devices over your local network:

```bash
# Generate cert for your local network IP
mkcert localhost 192.168.1.100  # Your machine's local IP

# Install the CA on the device
# Export: mkcert -CAROOT
# Then transfer rootCA.pem to the device and install it
```

iOS: Settings → General → Profile → Install the certificate, then go to Settings → General → About → Certificate Trust Settings and enable it.

---

## Security Considerations

The mkcert CA private key lives at `$(mkcert -CAROOT)/rootCA-key.pem`. This key is sensitive:

- Never share it
- Never commit it to git
- If compromised, run `mkcert -uninstall` and regenerate

The certificates mkcert generates are for development only. They have no security value for production — don't use them there.

---

## Summary

1. Install mkcert: `brew install mkcert` (or equivalent)
2. Install the CA: `mkcert -install`
3. Generate a certificate: `mkcert localhost`
4. Configure your dev server to use the cert
5. Visit `https://localhost:3000` — no warnings

Done in under 10 minutes. Now your local environment matches production security requirements.

---

*More free developer tools at [DevPlaybook.cc](https://devplaybook.cc) — including [JSON Formatter](https://devplaybook.cc/tools/json-formatter), [JWT Decoder](https://devplaybook.cc/tools/jwt-decoder), and [Base64 Encoder](https://devplaybook.cc/tools/base64-encoder).*
