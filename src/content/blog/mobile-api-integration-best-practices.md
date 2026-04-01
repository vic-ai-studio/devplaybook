---
title: "Mobile API Integration Best Practices 2026"
description: "Best practices for mobile API integration in 2026: Axios vs fetch in React Native, retry with exponential backoff, React Query caching, offline-first with MMKV/WatermelonDB, certificate pinning, secure token storage, and error handling patterns."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: [react-native, api, axios, react-query, offline-first, security, mobile]
readingTime: "10 min read"
category: "mobile"
---

# Mobile API Integration Best Practices 2026

Connecting a mobile app to an API introduces problems you don't face in browser development: flaky connections, background/foreground transitions, certificate trust, and secure token storage. This guide covers every layer of mobile API integration from transport decisions to offline-first architecture.

## Axios vs fetch in React Native

Both work, but they have different trade-offs in a React Native context:

**fetch** is built-in (no install), Promise-based, and supported by React Query and SWR natively. The main limitation is that fetch doesn't throw on non-2xx responses — you must check `response.ok` manually, and it has no built-in interceptor system.

**Axios** adds ~20KB but provides interceptors, automatic JSON parsing, automatic error throwing on non-2xx, request cancellation via `AbortController`, and better timeout handling. Axios also has `transformRequest`/`transformResponse` hooks that are useful for auth token injection.

```javascript
// Configured Axios instance — the recommended approach
import axios from 'axios';
import { getAuthToken, refreshToken } from './auth';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example.com',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: inject auth token
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 with token refresh
api.interceptors.response.use(
  response => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const newToken = await refreshToken();
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    }
    return Promise.reject(error);
  }
);

export default api;
```

The response interceptor handles the most common mobile auth pattern: silently refresh the token when a 401 is received and replay the original request. The `_retry` flag prevents infinite loops if the refresh itself fails.

## Retry Logic with Exponential Backoff

Mobile networks are unreliable. Implement exponential backoff with jitter to avoid retry storms:

```javascript
// utils/retry.ts
interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelay = 1000, maxDelay = 30000 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;

      // Exponential backoff with full jitter
      const exponentialDelay = Math.min(baseDelay * 2 ** (attempt - 1), maxDelay);
      const jitter = Math.random() * exponentialDelay;
      const delay = Math.floor(jitter);

      console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max attempts reached');
}

// Usage
const data = await withRetry(() => api.get('/products'), {
  maxAttempts: 3,
  baseDelay: 500,
});
```

React Query's `retry` option handles this automatically with configurable backoff — when using React Query, you rarely need to implement this manually.

## React Query for API Caching

React Query is the best tool for server state in React Native apps. Configure it with sensible defaults:

```javascript
// App.tsx — QueryClient configuration
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { focusManager } from '@tanstack/react-query';

// Refetch on app foreground (replaces browser focus events)
AppState.addEventListener('change', status => {
  focusManager.setFocused(status === 'active');
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,    // 2 min before background refetch
      gcTime: 10 * 60 * 1000,      // 10 min cache retention
      retry: 2,                    // retry failed requests twice
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
      networkMode: 'offlineFirst', // serve cache even when offline
    },
    mutations: {
      retry: 0, // don't retry mutations automatically
    },
  },
});
```

```javascript
// hooks/useProducts.ts — typed query hook
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => api.get<Product>(`/products/${id}`).then(r => r.data),
    enabled: !!id, // only fetch when id is defined
    select: (data) => ({
      ...data,
      formattedPrice: `$${data.price.toFixed(2)}`,
    }),
  });
}
```

The `select` option transforms data after fetching and memoizes the result — components re-render only when the selected/transformed data changes, not when any part of the cached data changes.

## Offline-First with MMKV and WatermelonDB

Mobile apps must handle offline gracefully. Choose the storage layer based on complexity:

**MMKV** — For simple key-value persistence (user prefs, auth tokens, cached API responses). Synchronous reads, 10x faster than AsyncStorage:

```javascript
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'api-cache' });

// Cache API responses
export function cacheResponse(key: string, data: unknown, ttlMs = 5 * 60 * 1000) {
  storage.set(key, JSON.stringify({ data, expiresAt: Date.now() + ttlMs }));
}

export function getCachedResponse<T>(key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  const cached = JSON.parse(raw);
  if (Date.now() > cached.expiresAt) return null;
  return cached.data as T;
}
```

**WatermelonDB** — For complex relational data, large datasets, or apps that need full offline CRUD with sync:

```javascript
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Post, Comment } from './models';
import schema from './schema';

const adapter = new SQLiteAdapter({ schema, dbName: 'myapp' });
const database = new Database({ adapter, modelClasses: [Post, Comment] });

// Offline-first data access
const posts = await database.collections.get('posts').query().fetch();
```

## Certificate Pinning

Certificate pinning prevents man-in-the-middle attacks by checking that the server's certificate matches a known public key or certificate hash:

```javascript
// For React Native, use react-native-ssl-pinning
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

const response = await pinnedFetch('https://api.example.com/data', {
  method: 'GET',
  sslPinning: {
    certs: ['api.example.com'], // Certificate file name in app bundle
  },
  headers: { Authorization: `Bearer ${token}` },
});
```

Store certificate `.cer` files in `android/app/src/main/assets/` and `ios/YourApp/` respectively. When your server certificate renews, update the pinned certificate before the old one expires — failing to do so will break production for all users.

## Handling Auth Tokens Securely

Never store tokens in AsyncStorage (it's plaintext on the device filesystem). Use platform secure storage:

```javascript
// Using react-native-keychain for secure token storage
import * as Keychain from 'react-native-keychain';

export const tokenStorage = {
  async save(accessToken: string, refreshToken: string) {
    await Keychain.setGenericPassword('tokens', JSON.stringify({
      accessToken,
      refreshToken,
    }), {
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
      service: 'com.myapp.auth',
    });
  },

  async get() {
    const creds = await Keychain.getGenericPassword({ service: 'com.myapp.auth' });
    if (!creds) return null;
    return JSON.parse(creds.password) as { accessToken: string; refreshToken: string };
  },

  async clear() {
    await Keychain.resetGenericPassword({ service: 'com.myapp.auth' });
  },
};
```

`WHEN_UNLOCKED` means the token can only be read when the device is unlocked, providing protection if the device is seized while locked. For extra security, use `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY` — this invalidates tokens if the device passcode is removed.

## Error Handling Patterns

Standardize error handling across your API layer:

```javascript
// types/api.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// utils/apiError.ts
export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? 0;
    const message = error.response?.data?.message ?? error.message;
    const code = error.response?.data?.code;
    return new ApiError(message, status, code, error.response?.data);
  }
  if (error instanceof Error) {
    return new ApiError(error.message, 0);
  }
  return new ApiError('Unknown error', 0);
}

// In components — differentiate error types
const { error } = useProduct(id);

if (error instanceof ApiError) {
  if (error.status === 404) return <NotFoundScreen />;
  if (error.status === 403) return <UnauthorizedScreen />;
  return <ErrorScreen message={error.message} />;
}
```

A typed `ApiError` class lets you write clean conditional UI and log errors to Sentry with structured metadata rather than raw error objects. This separation between network errors, application errors, and unexpected errors makes debugging in production dramatically easier.
