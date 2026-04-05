---
title: "AWS Lambda@Edge — Run Code at CloudFront Edge Locations"
description: "Run Lambda functions at CloudFront edge locations — customize CDN behavior, implement A/B testing, add authentication, and transform requests/responses without a central origin."
category: "WebAssembly & Edge Computing"
pricing: "Paid"
pricingDetail: "$0.60 per 1M requests + $0.00005001 per 100ms of duration; No free tier for Lambda@Edge"
website: "https://aws.amazon.com/lambda/edge"
github: ""
tags: ["edge-computing", "aws", "lambda", "cloudfront", "cdn", "serverless", "cloud", "javascript"]
pros:
  - "Deep CloudFront integration — hooks for all four request/response lifecycle events"
  - "Full Lambda feature set (IAM, VPC, layers) at the edge"
  - "Geolocation and viewer headers available in edge functions"
  - "Suitable for auth, A/B testing, URL rewrites, header manipulation"
  - "Lambda Function URLs as a simpler alternative for some cases"
cons:
  - "Cold starts at 1-3 seconds (much slower than Cloudflare Workers)"
  - "No local development — must deploy to test"
  - "5-second execution limit (viewer triggers), 30 seconds (origin triggers)"
  - "No direct data storage — must call back to AWS services"
  - "Replication delay: code changes take minutes to propagate globally"
date: "2026-04-02"
---

## Overview

Lambda@Edge attaches Lambda functions to CloudFront distribution events. Unlike traditional Lambdas that run in a single region, Lambda@Edge code runs at the closest CloudFront PoP to the viewer, reducing latency for compute-heavy CDN customization.

## The Four Trigger Points

```
Viewer Request → [Viewer Request Lambda] → CloudFront Cache → [Origin Request Lambda]
                                                ↓ (cache miss)
Origin Server → [Origin Response Lambda] → CloudFront Cache → [Viewer Response Lambda] → Viewer
```

- **Viewer Request**: Runs for every request before cache check. Use for: auth, bot filtering, device detection.
- **Origin Request**: Runs only on cache miss before forwarding to origin. Use for: request transformation, A/B routing.
- **Origin Response**: Runs after origin response before caching. Use for: response transformation, adding headers.
- **Viewer Response**: Runs for every response to the viewer. Use for: security headers, cookie manipulation.

## Authentication Example (Viewer Request)

```javascript
// lambda/viewer-request.mjs
export const handler = async (event) => {
  const { request } = event.Records[0].cf;
  const headers = request.headers;

  // Check for auth token
  const authHeader = headers['authorization']?.[0]?.value;

  if (!authHeader?.startsWith('Bearer ')) {
    return {
      status: '401',
      statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': [{ key: 'WWW-Authenticate', value: 'Bearer' }],
        'content-type': [{ key: 'Content-Type', value: 'application/json' }],
      },
      body: JSON.stringify({ error: 'Missing authorization header' }),
    };
  }

  const token = authHeader.slice(7);
  // Verify JWT (use a lightweight library — no Node.js crypto module)
  const isValid = verifyJwt(token, process.env.JWT_SECRET);

  if (!isValid) {
    return { status: '403', statusDescription: 'Forbidden', body: '{"error":"Invalid token"}' };
  }

  // Add user context to forward to origin
  const decoded = decodeJwt(token);
  request.headers['x-user-id'] = [{ key: 'X-User-Id', value: decoded.sub }];

  return request; // Forward modified request
};
```

## A/B Testing (Origin Request)

```javascript
export const handler = async (event) => {
  const { request } = event.Records[0].cf;
  const cookies = parseCookies(request.headers.cookie?.[0]?.value ?? '');

  // Assign variant if not set
  let variant = cookies['ab-variant'];
  if (!variant) {
    variant = Math.random() < 0.5 ? 'A' : 'B';
  }

  // Route to different origins
  if (variant === 'B') {
    request.origin.custom.domainName = 'new-api.example.com';
  }

  request.headers['x-ab-variant'] = [{ key: 'X-AB-Variant', value: variant }];
  return request;
};
```

## Security Headers (Viewer Response)

```javascript
export const handler = async (event) => {
  const { response } = event.Records[0].cf;

  response.headers['strict-transport-security'] = [{
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload'
  }];
  response.headers['content-security-policy'] = [{
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'nonce-{nonce}'"
  }];
  response.headers['x-frame-options'] = [{ key: 'X-Frame-Options', value: 'DENY' }];

  return response;
};
```

## Lambda@Edge vs CloudFront Functions

AWS offers two edge compute options:
- **Lambda@Edge**: Full Node.js runtime, up to 30s, all four trigger points. Use for complex logic.
- **CloudFront Functions**: 1ms max, JavaScript only, viewer triggers only. Use for simple URL rewrites, header manipulation (free tier included).

## Best For

- **Request/response transformation at the CDN edge** — modify headers, rewrite URLs, redirect based on geo or device type before content reaches viewers
- **Authentication at the edge** — validate JWT tokens or session cookies in Lambda@Edge to protect CloudFront-served content without hitting the origin
- **A/B testing with CloudFront** — serve different content variants by modifying origin or request based on cookies/headers at the viewer-request stage
- **Dynamic image optimization** — resize and format images based on device type and Accept headers at the origin-response stage, then cache the result

## Lambda@Edge vs. CloudFront Functions

| | Lambda@Edge | CloudFront Functions |
|--|------------|---------------------|
| Max execution time | 30s (origin), 5s (viewer) | 1ms |
| Memory | Up to 10GB | 2MB |
| Runtime | Node.js | JavaScript (ES5.1) |
| Network access | ✅ | ✗ |
| Trigger points | All 4 | Viewer request/response only |
| Cost | ~$0.60/1M | ~$0.10/1M |
| Best for | Complex logic, API calls, auth | Simple header/URL rewrites |

Use Lambda@Edge when your logic requires network calls, large dependencies, or complex computation. Use CloudFront Functions for simple, sub-millisecond transformations like header injection or URL normalization — it's 6x cheaper and has no cold start.
