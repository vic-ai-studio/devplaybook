---
title: "How to Use curl for API Testing"
description: "Master curl for API testing: GET, POST, auth tokens, JSON payloads, debugging flags, and real-world examples every backend developer needs."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["curl", "api", "rest", "developer-tools", "command-line"]
readingTime: "8 min read"
---

`curl` is the fastest way to test an API without opening Postman, writing a script, or spinning up a tool. It's available everywhere — Linux, macOS, Windows — and once you know a handful of flags, you can test virtually any HTTP endpoint from your terminal.

## Basic GET Request

The simplest curl command: fetch a URL.

```bash
curl https://api.github.com/users/octocat
```

This sends a GET request and prints the response body. To also see response headers:

```bash
curl -i https://api.github.com/users/octocat
```

`-i` (include) shows HTTP status and headers before the body. `-I` (uppercase) fetches only headers (HEAD request) — useful for checking if an endpoint is alive without downloading the body.

## Pretty-Printing JSON

curl outputs raw JSON with no formatting. Pipe it through Python's json module:

```bash
curl -s https://api.github.com/users/octocat | python3 -m json.tool
```

`-s` (silent) suppresses the progress meter. Or use `jq` if installed:

```bash
curl -s https://api.github.com/users/octocat | jq '.name, .public_repos'
```

## POST Request with JSON Body

Sending data to an API requires the method flag and a body.

```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

Breaking this down:
- `-X POST` sets the HTTP method
- `-H` adds a header (can be used multiple times)
- `-d` provides the request body

For larger payloads, read from a file:

```bash
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d @user.json
```

The `@` prefix tells curl to read the content from the file `user.json`.

## Authentication

### Bearer Token

```bash
curl -H "Authorization: Bearer eyJhbGc..." https://api.example.com/protected
```

### API Key in Header

```bash
curl -H "X-API-Key: your_api_key_here" https://api.example.com/data
```

### Basic Auth

```bash
curl -u username:password https://api.example.com/admin
# or let curl prompt for password:
curl -u username https://api.example.com/admin
```

`-u` handles base64 encoding automatically.

## PUT and PATCH Requests

```bash
# Full update (PUT)
curl -X PUT https://api.example.com/users/42 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith", "email": "alice@example.com"}'

# Partial update (PATCH)
curl -X PATCH https://api.example.com/users/42 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "newalice@example.com"}'
```

## DELETE Request

```bash
curl -X DELETE https://api.example.com/users/42 \
  -H "Authorization: Bearer $TOKEN"
```

## Useful Debugging Flags

### `-v` (verbose)

Shows everything: request headers, response headers, TLS handshake, redirect chain.

```bash
curl -v https://api.example.com/users
```

Look for `< ` prefixed lines (response headers) and `> ` prefixed lines (request headers).

### `-w` (write-out)

Extracts specific metrics after the request completes.

```bash
curl -s -o /dev/null -w "Status: %{http_code}\nTime: %{time_total}s\n" https://api.example.com/users
```

Common write-out variables:
- `%{http_code}` — HTTP status code
- `%{time_total}` — total time in seconds
- `%{size_download}` — bytes downloaded
- `%{url_effective}` — final URL after redirects

### `--max-time`

Prevents hanging on slow endpoints:

```bash
curl --max-time 5 https://api.example.com/slow-endpoint
```

## Handling Redirects

By default curl doesn't follow redirects. Add `-L`:

```bash
curl -L https://api.example.com/redirect
```

## Saving Response to File

```bash
curl -o response.json https://api.example.com/data
```

`-o` writes to a named file. `-O` uses the server's filename.

## Sending Form Data

For `application/x-www-form-urlencoded` (traditional HTML forms):

```bash
curl -X POST https://api.example.com/login \
  -d "username=alice&password=secret"
```

For multipart form data (file uploads):

```bash
curl -X POST https://api.example.com/upload \
  -F "file=@photo.jpg" \
  -F "description=Profile photo"
```

## Query Parameters

Encode them directly in the URL or use `--data-urlencode` for values with special characters:

```bash
curl "https://api.example.com/search?q=hello+world&limit=10"

# Safe encoding for complex values:
curl -G https://api.example.com/search \
  --data-urlencode "q=hello world & more" \
  --data-urlencode "limit=10"
```

## A Real-World Example: GitHub API

```bash
# List your repos (replace TOKEN)
curl -s \
  -H "Authorization: Bearer ghp_yourtoken" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/user/repos?per_page=5&sort=updated" \
  | python3 -m json.tool

# Create an issue
curl -s -X POST \
  -H "Authorization: Bearer ghp_yourtoken" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/owner/repo/issues" \
  -d '{"title": "Bug: login fails", "body": "Steps to reproduce..."}'
```

## Real-World Scenario: Debugging a Broken Webhook Integration

Imagine you're integrating a third-party payment provider and their webhooks aren't reaching your server. You have an endpoint at `https://yourapp.com/webhooks/payment` and you need to verify it behaves correctly before pointing the payment provider at it. curl is the fastest way to simulate the exact request the provider sends.

Start by inspecting what a real webhook payload looks like from the provider's documentation, then replay it manually. Use `-v` to capture the full request/response cycle and `-w` to measure response time — if your endpoint takes more than a second to respond, most webhook providers will retry and you'll get duplicate events:

```bash
curl -v -X POST https://yourapp.com/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=abc123" \
  -d @sample_webhook.json \
  -w "\nHTTP %{http_code} in %{time_total}s\n"
```

Once the endpoint is responding correctly, you can automate regression checks by saving the command in a shell script alongside your test fixtures. This gives you a lightweight integration test you can run against any environment — local, staging, or production — without spinning up a full test suite. Store common requests as `.sh` files or use shell variables for tokens so the commands are reusable across the team.

---

## Quick Tips

1. **Store tokens as environment variables, never hardcoded.** Use `curl -H "Authorization: Bearer $API_TOKEN"` and set `API_TOKEN` in your shell profile or `.env`. This keeps credentials out of your shell history and makes commands safe to share.

2. **Use `-s -o /dev/null -w "%{http_code}"` for health checks.** The combination suppresses output noise and returns just the status code — perfect for monitoring scripts or CI pipeline smoke tests.

3. **Pipe JSON responses through `jq` with a filter to drill into nested data immediately.** For example, `| jq '.data.users[0].email'` extracts a deeply nested field without needing to read the full response.

4. **When a request fails, add `--trace-ascii -` to dump the full wire-level conversation** including request body bytes. This is more detailed than `-v` and essential for debugging encoding or content-type mismatches.

5. **Use `--netrc` to load credentials from `~/.netrc`** instead of passing them on the command line. This keeps sensitive credentials out of shell history (`~/.bash_history`) entirely.

---

## Quick Reference

| Task | Flag |
|------|------|
| Set HTTP method | `-X POST` / `-X PUT` / `-X DELETE` |
| Add header | `-H "Key: Value"` |
| Send JSON body | `-d '{"key":"val"}'` |
| Read body from file | `-d @file.json` |
| Bearer auth | `-H "Authorization: Bearer TOKEN"` |
| Basic auth | `-u user:pass` |
| Follow redirects | `-L` |
| Show headers in output | `-i` |
| Verbose debug | `-v` |
| Silent (no progress) | `-s` |
| Save to file | `-o filename` |
| Timeout | `--max-time 10` |

curl covers 90% of API testing scenarios directly from the terminal. Once you internalize these flags, you'll reach for it instinctively before opening any GUI tool.
