---
title: "curl Command Examples for REST APIs (2025 Reference)"
description: "Practical curl command examples for testing REST APIs. Covers GET, POST, PUT, DELETE, authentication, headers, file uploads, response handling, and debugging flags."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["curl", "rest-api", "api-testing", "command-line", "http", "developer-tools"]
readingTime: "10 min read"
faq:
  - question: "What is curl used for in API development?"
    answer: "curl is a command-line tool for making HTTP requests. Developers use it to test API endpoints, debug responses, automate data fetching in scripts, and replicate requests outside of the browser."
  - question: "How do I send JSON data with curl?"
    answer: "Use -H 'Content-Type: application/json' and -d with the JSON body: curl -X POST -H 'Content-Type: application/json' -d '{\"key\": \"value\"}' https://api.example.com/endpoint"
  - question: "How do I handle curl authentication?"
    answer: "For Bearer tokens: -H 'Authorization: Bearer YOUR_TOKEN'. For Basic auth: -u username:password. For API keys: -H 'X-API-Key: YOUR_KEY' or as a query parameter ?api_key=YOUR_KEY."
---

`curl` is the universal tool for interacting with HTTP APIs. It runs on every platform, requires no setup, and outputs raw responses you can inspect, pipe, and script. Once you know the core flags, you can test any REST API without opening Postman.

This is a practical reference — organized by task, with real-world examples you can copy and adapt.

---

## Essential Flags to Know First

```bash
-X METHOD       # HTTP method (GET is default)
-H "Header"     # Add a request header
-d "data"       # Request body (implies POST)
-s              # Silent mode (no progress meter)
-i              # Include response headers in output
-I              # Fetch only headers (HEAD request)
-v              # Verbose: show full request + response
-o file.json    # Save response to a file
-w "format"     # Write-out (print specific values after response)
-L              # Follow redirects
-k              # Skip SSL verification (dev only, never production)
--compressed    # Request and decompress gzip responses
```

---

## GET Requests

### Basic GET

```bash
curl https://api.github.com/users/octocat
```

### Pretty-print JSON response

```bash
curl -s https://api.github.com/users/octocat | python3 -m json.tool

# Or with jq (better formatting + filtering)
curl -s https://api.github.com/users/octocat | jq .
```

### Extract specific fields with jq

```bash
# Get just the name and public_repos
curl -s https://api.github.com/users/octocat | jq '{name: .name, repos: .public_repos}'

# Get all items from an array
curl -s https://api.github.com/orgs/github/repos | jq '.[].name'
```

### Query parameters

```bash
# URL-encode query parameters manually
curl "https://api.github.com/search/repositories?q=language:javascript&sort=stars&order=desc"

# Or use --data-urlencode with GET
curl -G \
  --data-urlencode "q=language:javascript" \
  --data-urlencode "sort=stars" \
  https://api.github.com/search/repositories
```

---

## POST Requests

### JSON body

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "email": "alice@example.com"}' \
  https://api.example.com/users
```

### Read body from a file

```bash
# Create payload.json, then:
curl -X POST \
  -H "Content-Type: application/json" \
  -d @payload.json \
  https://api.example.com/users
```

### Form data (application/x-www-form-urlencoded)

```bash
curl -X POST \
  -d "username=alice&password=secret" \
  https://api.example.com/login
```

### Multipart form (file upload)

```bash
curl -X POST \
  -F "file=@/path/to/image.png" \
  -F "description=Profile photo" \
  https://api.example.com/upload
```

### Multi-file upload

```bash
curl -X POST \
  -F "files[]=@file1.pdf" \
  -F "files[]=@file2.pdf" \
  https://api.example.com/upload-batch
```

---

## PUT and PATCH

```bash
# PUT: replace the entire resource
curl -X PUT \
  -H "Content-Type: application/json" \
  -d '{"id": 1, "name": "Alice Updated", "role": "admin"}' \
  https://api.example.com/users/1

# PATCH: update specific fields
curl -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}' \
  https://api.example.com/users/1
```

---

## DELETE

```bash
# Simple delete
curl -X DELETE https://api.example.com/users/1

# Delete with confirmation body
curl -X DELETE \
  -H "Content-Type: application/json" \
  -d '{"confirm": true}' \
  https://api.example.com/users/1
```

---

## Authentication

### Bearer Token (JWT)

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/protected/resource
```

### Basic Auth

```bash
# curl handles base64 encoding automatically
curl -u alice:password123 https://api.example.com/resource

# Or send the header directly
curl -H "Authorization: Basic $(echo -n 'alice:password123' | base64)" \
  https://api.example.com/resource
```

### API Key in Header

```bash
curl -H "X-API-Key: your-api-key-here" \
  https://api.example.com/resource
```

### API Key in Query String

```bash
curl "https://api.example.com/resource?api_key=your-api-key-here"
```

### OAuth2 — Get a Token First

```bash
# Step 1: Get access token
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"client_id": "YOUR_ID", "client_secret": "YOUR_SECRET", "grant_type": "client_credentials"}' \
  https://auth.example.com/oauth/token | jq -r '.access_token')

# Step 2: Use it
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/resource
```

---

## Working with Headers

### View response headers

```bash
# Include headers in output
curl -i https://api.example.com/resource

# Headers only
curl -I https://api.example.com/resource

# Verbose (shows request headers too)
curl -v https://api.example.com/resource
```

### Custom headers

```bash
curl -H "Accept: application/json" \
  -H "Accept-Language: en-US" \
  -H "X-Request-ID: $(uuidgen)" \
  https://api.example.com/resource
```

### Capture specific header values

```bash
# Get the Content-Type header value
curl -sI https://api.example.com | grep -i content-type

# Get the status code only
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/resource
```

---

## Response Handling

### Save to file

```bash
curl -o response.json https://api.example.com/data
```

### Check HTTP status code

```bash
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health)
echo "Status: $STATUS"

# Use in scripts
if [ "$STATUS" -ne 200 ]; then
  echo "API is down!"
  exit 1
fi
```

### Measure response time

```bash
curl -s -o /dev/null -w "
DNS lookup:    %{time_namelookup}s
TCP connect:   %{time_connect}s
TLS handshake: %{time_appconnect}s
TTFB:          %{time_starttransfer}s
Total:         %{time_total}s
" https://api.example.com/resource
```

### Follow redirects

```bash
curl -L https://bit.ly/shortened-url
```

---

## Scripting with curl

### Loop through API pages

```bash
#!/bin/bash
PAGE=1
while true; do
  RESPONSE=$(curl -s "https://api.example.com/items?page=$PAGE&limit=100")
  ITEMS=$(echo "$RESPONSE" | jq '.items | length')

  echo "$RESPONSE" >> all_items.json

  if [ "$ITEMS" -lt 100 ]; then
    break
  fi
  ((PAGE++))
done
```

### Health check script

```bash
#!/bin/bash
ENDPOINTS=(
  "https://api.example.com/health"
  "https://api.example.com/users"
  "https://api.example.com/products"
)

for URL in "${ENDPOINTS[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL")
  if [ "$STATUS" = "200" ]; then
    echo "✓ $URL"
  else
    echo "✗ $URL (HTTP $STATUS)"
  fi
done
```

### Retry on failure

```bash
curl --retry 3 \
  --retry-delay 2 \
  --retry-on-http-error 429,503 \
  https://api.example.com/resource
```

---

## Debugging

### Full verbose output

```bash
# Show everything: headers, TLS info, timing
curl -v https://api.example.com/resource

# Save verbose output to stderr (separate from response)
curl -v -o response.json https://api.example.com/resource 2>debug.log
```

### Simulate a browser request

```bash
curl -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" \
  -H "Accept-Language: en-US,en;q=0.5" \
  -H "Connection: keep-alive" \
  https://www.example.com
```

### Handle compressed responses

```bash
curl --compressed https://api.example.com/data
# curl will send Accept-Encoding: gzip, deflate and decompress automatically
```

### Skip SSL for dev environments

```bash
# Only use this for local development, never production
curl -k https://localhost:8443/api/test
```

---

## Quick Reference Card

| Task | Command |
|------|---------|
| GET JSON | `curl -s URL \| jq .` |
| POST JSON | `curl -X POST -H "Content-Type: application/json" -d '{}' URL` |
| Bearer auth | `curl -H "Authorization: Bearer TOKEN" URL` |
| Upload file | `curl -F "file=@path" URL` |
| Follow redirect | `curl -L URL` |
| Status code only | `curl -s -o /dev/null -w "%{http_code}" URL` |
| Save response | `curl -o output.json URL` |
| Verbose debug | `curl -v URL` |
| Retry on failure | `curl --retry 3 URL` |
| Response time | `curl -w "%{time_total}" URL` |

---

## Beyond curl: Visual API Testing

For complex API workflows, authentication flows, or when you need to share requests with teammates, a visual tool complements curl:

- [DevPlaybook API Tester](/tools/api-tester) — Browser-based REST client, no install required
- [DevPlaybook API Request Builder](/tools/api-request-builder) — Build and export curl commands visually
- [DevPlaybook API Response Formatter](/tools/api-response-formatter) — Prettify and inspect JSON responses

---

## Download the Developer Productivity Bundle

The **[Developer Productivity Bundle](https://vicnail.gumroad.com/l/dev-productivity-bundle?utm_source=devplaybook&utm_medium=blog&utm_campaign=curl-examples-article)** includes a collection of curl one-liners, API health check scripts, and automation templates for common API tasks — ready to drop into your workflow.
