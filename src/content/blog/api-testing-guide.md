---
title: "API Testing in 2026: From cURL to Automated Test Suites"
description: "Complete guide to API testing: starting with cURL basics, moving to Postman/Insomnia, then automated test suites with JavaScript and Python. Includes real API examples."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["api", "testing", "curl", "http", "postman", "automation"]
readingTime: "12 min read"
---

# API Testing in 2026: From cURL to Automated Test Suites

## Why cURL is Still the Best Starting Point

Before GUI tools, start with cURL. It forces you to understand what's actually happening under the hood.

```bash
# GET request
curl https://api.example.com/users

# GET with headers
curl -H "Authorization: Bearer $TOKEN" \
     -H "Accept: application/json" \
     https://api.example.com/users/123

# POST with JSON body
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# PUT
curl -X PUT https://api.example.com/users/123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated"}'

# DELETE
curl -X DELETE https://api.example.com/users/123

# Save response to file
curl -s https://api.example.com/users > users.json
```

## Real API Testing Workflow

```bash
# 1. Login and extract token
TOKEN=$(curl -s -X POST https://api.example.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}' \
  | jq -r '.token')

# 2. Use token to get protected resource
curl -H "Authorization: Bearer $TOKEN" \
     https://api.example.com/protected
```

## From cURL to JavaScript Tests

```javascript
// test/api.test.js
import { test, expect } from '@playwright/test';

test('GET /users returns 200 and array', async ({ request }) => {
  const response = await request.get('https://jsonplaceholder.typicode.com/users');
  expect(response.status()).toBe(200);
  const users = await response.json();
  expect(Array.isArray(users)).toBe(true);
  expect(users.length).toBeGreaterThan(0);
});

test('POST /users creates new user', async ({ request }) => {
  const newUser = { name: 'Alice', email: 'alice@example.com' };
  const response = await request.post('https://jsonplaceholder.typicode.com/users', {
    data: newUser,
    headers: { 'Content-Type': 'application/json' }
  });
  expect(response.status()).toBe(201);
  const created = await response.json();
  expect(created.name).toBe('Alice');
  expect(created.id).toBeDefined();
});
```

## Python with requests

```python
import requests

BASE = "https://jsonplaceholder.typicode.com"

def test_get_users():
    r = requests.get(f"{BASE}/users")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_create_user():
    payload = {"name": "Alice", "email": "alice@example.com"}
    r = requests.post(f"{BASE}/users", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["name"] == "Alice"
    assert "id" in data
```

## HTTP Status Codes You Must Know

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET, PUT |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid JSON, missing fields |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token, no permission |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit hit |
| 500 | Server Error | API bug |

## Always Test These Edge Cases

1. Empty body on POST → 400
2. Invalid JSON → 400
3. Missing required fields → 400
4. Wrong content-type → 400 or 415
5. Expired token → 401
6. Valid token, wrong permissions → 403
7. Concurrent requests → race condition check
