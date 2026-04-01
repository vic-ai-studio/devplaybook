---
title: "UploadThing: The Best File Upload Solution for Next.js in 2026"
description: "Complete guide to UploadThing covering setup with Next.js App Router, file type validation, image optimization, middleware auth, S3 alternatives comparison, and production patterns."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["uploadthing", "nextjs", "file-upload", "s3", "react", "typescript"]
readingTime: "13 min read"
---

File uploads in Next.js used to be painful. You needed an AWS account, a bucket policy you'd inevitably misconfigure, presigned URL infrastructure, and a weekend of debugging CORS errors before your users could upload a single profile picture. UploadThing changed that calculus entirely.

Released by Theo Browne and the T3 community, UploadThing is purpose-built for full-stack TypeScript apps. It abstracts away object storage entirely — no AWS console, no IAM roles, no presigned URL dance. You define what files you accept, protect the route with your auth middleware, and ship. That's the pitch, and after years of S3 DIY work, it lands.

This guide covers everything from initial setup to production hardening with [Next.js 15](/blog/next-js-15-new-features-developers-guide) and the App Router.

---

## What Is UploadThing and Why Developers Love It

UploadThing is a managed file upload service built specifically for TypeScript full-stack apps. At its core, it handles three things the hard way so you don't have to:

1. **Storage infrastructure** — files land on UploadThing's CDN-backed storage (built on AWS under the hood, but fully abstracted)
2. **Upload routing** — a type-safe `FileRouter` defines your upload endpoints with validation and middleware
3. **Client SDK** — React hooks that handle multipart uploads, progress tracking, and retry logic

The killer feature isn't any single capability — it's that the entire thing is typesafe end-to-end. Your client-side `useUploadThing` hook knows exactly which file types and sizes your server accepts because both sides share the same `FileRouter` type. TypeScript catches mismatches at compile time, not at 2am when a user complains their avatar won't upload.

For teams already using the T3 stack (Next.js, TypeScript, tRPC, Prisma), UploadThing slots in with near-zero friction. But it works equally well with plain Next.js App Router projects.

---

## Installation and Setup with Next.js 15 App Router

Start with a fresh or existing Next.js 15 project. UploadThing's SDK supports the App Router natively.

```bash
npm install uploadthing @uploadthing/react
```

You'll need an API key from [uploadthing.com](https://uploadthing.com). After creating an app in the dashboard, copy your secret and app ID.

Add them to your `.env.local`:

```bash
UPLOADTHING_SECRET=your_uploadthing_secret_key_here
UPLOADTHING_APP_ID=your-app-id
```

For the App Router, you need to create an API route that handles UploadThing's webhook and upload requests. Create the file at `app/api/uploadthing/route.ts`:

```typescript
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

Notice we're importing `ourFileRouter` from a `core.ts` file in the same directory. That's where the actual logic lives. Let's build it.

---

## Defining a FileRouter with File Type and Size Validation

The `FileRouter` is the heart of UploadThing. It's a plain object where each key is a named upload route ("endpoint") and each value defines what that endpoint accepts, who can use it, and what happens after upload.

Create `app/api/uploadthing/core.ts`:

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const f = createUploadthing();

export const ourFileRouter = {
  // Profile image upload — authenticated users only, single image
  profileImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) {
        throw new Error("Unauthorized");
      }

      // Return metadata that gets passed to onUploadComplete
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.user.update({
        where: { id: metadata.userId },
        data: { avatarUrl: file.url },
      });

      return { uploadedBy: metadata.userId };
    }),

  // Document upload — PDFs and Word docs up to 32MB, multiple files
  documentUpload: f({
    pdf: { maxFileSize: "32MB", maxFileCount: 10 },
    "application/msword": { maxFileSize: "32MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      maxFileSize: "32MB",
    },
  })
    .middleware(async ({ req }) => {
      const session = await getServerSession(authOptions);

      if (!session?.user?.id) throw new Error("Unauthorized");

      // Check user's storage quota
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { plan: true, storageUsedBytes: true },
      });

      const maxStorage = user?.plan === "pro" ? 10_000_000_000 : 1_000_000_000;

      if ((user?.storageUsedBytes ?? 0) >= maxStorage) {
        throw new Error("Storage quota exceeded");
      }

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await db.document.create({
        data: {
          userId: metadata.userId,
          name: file.name,
          url: file.url,
          sizeBytes: file.size,
          key: file.key,
        },
      });
    }),

  // Product images — no auth required for public listings, but rate limited via middleware
  productImage: f({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
  })
    .middleware(async ({ req }) => {
      // Can use any header-based rate limiting here
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

The `satisfies FileRouter` line is important — it keeps the type inference working downstream. Export `OurFileRouter` as a type; you'll import it in your React components to get fully-typed hooks.

UploadThing supports the following file type specifiers: `image`, `video`, `audio`, `pdf`, `text`, `blob`, or any MIME type string. The `maxFileSize` accepts human-readable strings: `"512KB"`, `"4MB"`, `"1GB"`.

---

## Uploading from React with the useUploadThing Hook

Now the client side. The `@uploadthing/react` package exports two primary APIs: the `useUploadThing` hook for custom UI, and the `UploadButton`/`UploadDropzone` components for drop-in UX.

First, create a typed utility file at `lib/uploadthing.ts`:

```typescript
import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

This is the key move: by passing `OurFileRouter` as the generic, the generated hook knows which endpoints exist and what they accept.

For a custom profile image uploader component:

```tsx
"use client";

import { useState, useCallback } from "react";
import { useUploadThing } from "@/lib/uploadthing";
import { useDropzone } from "react-dropzone";

export function ProfileImageUploader() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { startUpload, isUploading } = useUploadThing("profileImage", {
    onClientUploadComplete: (res) => {
      console.log("Upload complete:", res);
      // Optimistic UI — refresh router or update local state
    },
    onUploadError: (error) => {
      console.error("Upload error:", error.message);
    },
    onUploadProgress: (progress) => {
      setUploadProgress(progress);
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Generate local preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      await startUpload([file]);
    },
    [startUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
      }`}
    >
      <input {...getInputProps()} />
      {preview && (
        <img src={preview} alt="Preview" className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
      )}
      {isUploading ? (
        <div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500">Uploading... {uploadProgress}%</p>
        </div>
      ) : (
        <p className="text-gray-500">
          {isDragActive ? "Drop your image here" : "Drag and drop or click to upload"}
        </p>
      )}
    </div>
  );
}
```

For simpler use cases, the drop-in `UploadButton` is a two-liner:

```tsx
import { UploadButton } from "@/lib/uploadthing";

export function SimpleUpload() {
  return (
    <UploadButton
      endpoint="profileImage"
      onClientUploadComplete={(res) => alert(`Uploaded ${res.length} files`)}
      onUploadError={(error) => alert(`Error: ${error.message}`)}
    />
  );
}
```

This pattern pairs naturally with the [React state management patterns covered here](/blog/react-query-zustand-server-client-state-pattern) — you can store the returned file URLs in Zustand and invalidate React Query caches from `onClientUploadComplete`.

---

## Middleware for Authentication: Protecting Upload Routes

The `.middleware()` callback runs on the server before any upload is accepted. It receives the raw `Request` object and whatever headers you've set. This is where you enforce auth, rate limits, and quota checks.

Three common patterns:

**1. NextAuth session check:**

```typescript
.middleware(async ({ req }) => {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");
  return { userId: session.user.id };
})
```

**2. Clerk authentication:**

```typescript
import { auth } from "@clerk/nextjs/server";

.middleware(async () => {
  const { userId } = auth();
  if (!userId) throw new Error("Unauthorized");
  return { userId };
})
```

**3. Custom JWT verification:**

```typescript
import { verifyJwt } from "@/lib/jwt";

.middleware(async ({ req }) => {
  const token = req.headers.get("authorization")?.split(" ")[1];
  if (!token) throw new Error("No token");

  const payload = await verifyJwt(token);
  return { userId: payload.sub, role: payload.role };
})
```

Whatever you return from `.middleware()` is injected as `metadata` in `.onUploadComplete()`. This is how you associate uploads with the user who created them without any stateful session lookup in the callback.

---

## Handling Upload Callbacks and Saving to Database

The `.onUploadComplete()` callback fires server-side after UploadThing confirms the file landed in storage. The `file` object contains:

- `file.url` — public CDN URL
- `file.key` — unique identifier (needed for deletion)
- `file.name` — original filename
- `file.size` — size in bytes

A robust database save pattern with error handling:

```typescript
.onUploadComplete(async ({ metadata, file }) => {
  try {
    const record = await db.upload.create({
      data: {
        userId: metadata.userId,
        fileKey: file.key,
        fileUrl: file.url,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
      },
    });

    // Update user storage usage
    await db.user.update({
      where: { id: metadata.userId },
      data: { storageUsedBytes: { increment: file.size } },
    });

    // Return value is sent to onClientUploadComplete in the browser
    return { dbId: record.id, url: file.url };
  } catch (error) {
    console.error("Failed to save upload record:", error);
    // The file is already uploaded — log this for cleanup
    throw new Error("Database save failed");
  }
})
```

The return value of `onUploadComplete` flows back to `onClientUploadComplete` on the client. This is useful for sending back a database ID so the client can immediately reference the record.

---

## Image Optimization and Transformations

UploadThing's CDN supports basic URL-based image transformations. Append query parameters to the file URL:

```typescript
// Original URL from UploadThing
const originalUrl = file.url;
// e.g. https://utfs.io/f/abc123-photo.jpg

// Resize to 400x400 thumbnail
const thumbnailUrl = `${originalUrl}?w=400&h=400&fit=crop`;

// Compress for web
const webOptimized = `${originalUrl}?q=80&f=webp`;
```

For more advanced transformations, pipe through a Next.js Image component with a custom loader:

```typescript
// next.config.ts
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
    ],
  },
};
```

```tsx
import Image from "next/image";

export function UserAvatar({ url, name }: { url: string; name: string }) {
  return (
    <Image
      src={url}
      alt={name}
      width={64}
      height={64}
      className="rounded-full object-cover"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
    />
  );
}
```

For apps where image quality is critical (portfolio sites, product photography), consider running uploads through Sharp server-side before sending to UploadThing, or integrating Cloudinary transformations after retrieving from UploadThing's CDN.

---

## Handling File Deletions

UploadThing provides a server-side SDK function for deletion. You'll need the file's key, not its URL.

```typescript
import { UTApi } from "uploadthing/server";

const utapi = new UTApi();

// Single file deletion
export async function deleteUpload(fileKey: string, userId: string) {
  // Verify ownership before deleting
  const upload = await db.upload.findUnique({
    where: { fileKey },
    select: { userId: true },
  });

  if (upload?.userId !== userId) {
    throw new Error("Unauthorized deletion attempt");
  }

  await utapi.deleteFiles(fileKey);

  await db.upload.delete({ where: { fileKey } });
  await db.user.update({
    where: { id: userId },
    data: { storageUsedBytes: { decrement: upload.fileSize } },
  });
}

// Bulk deletion
export async function deleteMultipleUploads(fileKeys: string[]) {
  await utapi.deleteFiles(fileKeys);
}
```

Always verify ownership server-side before deletion. Never accept a file key from the client and delete it without checking the requesting user owns that record.

---

## UploadThing vs AWS S3 + Presigned URLs vs Cloudflare R2 + Workers

| Factor | UploadThing | AWS S3 + Presigned URLs | Cloudflare R2 + Workers |
|--------|-------------|------------------------|------------------------|
| **Setup time** | ~30 minutes | 2-4 hours | 1-2 hours |
| **CORS config** | Handled automatically | Manual, error-prone | Manual |
| **TypeScript DX** | Excellent (typed router) | None out of box | Minimal |
| **Egress fees** | Included in plan | $0.09/GB out | $0 egress |
| **Storage pricing** | $0.02/GB/month (paid tier) | $0.023/GB/month | $0.015/GB/month |
| **CDN** | Built-in | CloudFront add-on | Included |
| **Auth integration** | Built-in middleware | Custom lambda/edge | Custom workers |
| **Vendor lock-in** | High | Medium | Medium |
| **Free tier** | 2GB storage, 2GB bandwidth/month | 5GB for 12 months | 10GB/month forever |

**When to choose UploadThing:** TypeScript-first teams who want file uploads done in an afternoon and are willing to pay for the DX. Perfect for SaaS apps, internal tools, and anything in the T3 stack ecosystem.

**When to choose S3:** You need fine-grained IAM control, you're already deep in the AWS ecosystem, or you have compliance requirements that mandate specific data residency. Also better if you're uploading files programmatically (server-to-server) rather than browser-to-storage.

**When to choose Cloudflare R2:** Zero egress fees matter (high-bandwidth video/media apps), you're already on Cloudflare Workers, or you need maximum cost efficiency at scale. R2's API is S3-compatible, so migration is straightforward.

---

## UploadThing vs Uploadcare vs Cloudinary

| Feature | UploadThing | Uploadcare | Cloudinary |
|---------|-------------|------------|------------|
| **Primary audience** | Next.js/TypeScript devs | Web apps, broad CMS support | Media-heavy apps, marketing teams |
| **Image transformations** | Basic (URL params) | Rich (CDN-based) | Industry-leading |
| **Video support** | Upload only | Basic | Full processing pipeline |
| **AI features** | None | Background removal, face detection | Auto-tagging, generative fill |
| **TypeScript SDK** | First-class | Available | Available |
| **Free tier** | 2GB storage | 3GB storage, 3GB traffic | 25GB storage + bandwidth combined |
| **Paid pricing** | $10/month (25GB) | $30/month (100GB) | $89/month (225GB) |
| **DAM (media library UI)** | Minimal dashboard | Yes | Yes (advanced) |
| **Self-hostable** | No | No | No |

**Verdict:** UploadThing wins on developer experience for TypeScript apps. Cloudinary wins on transformation capability. Uploadcare sits in the middle. If your app is primarily about displaying and transforming images (e-commerce, media publishing), Cloudinary's processing pipeline is worth the cost. If you just need reliable file uploads with auth in a Next.js app, UploadThing is the pragmatic choice.

---

## Production Tips: CDN, CORS, Rate Limiting

**CDN behavior:** UploadThing serves files through a CDN automatically. Files are public by default via their `utfs.io` URL. There's currently no private/signed URL mechanism — if you need files to be access-controlled, put them behind a Next.js API route that proxies the download after verifying session.

```typescript
// app/api/files/[key]/route.ts
import { auth } from "@clerk/nextjs/server";

export async function GET(
  req: Request,
  { params }: { params: { key: string } }
) {
  const { userId } = auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Verify the user owns this file
  const upload = await db.upload.findUnique({
    where: { fileKey: params.key, userId },
  });

  if (!upload) return new Response("Not found", { status: 404 });

  const fileResponse = await fetch(upload.fileUrl);
  return new Response(fileResponse.body, {
    headers: {
      "Content-Type": fileResponse.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${upload.fileName}"`,
    },
  });
}
```

**Rate limiting:** UploadThing has built-in abuse protection, but add your own rate limiting in the middleware for finer control. The Upstash Redis rate limiter integrates cleanly:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

.middleware(async ({ req }) => {
  const ip = req.headers.get("x-forwarded-for") ?? "anonymous";
  const { success } = await ratelimit.limit(ip);

  if (!success) throw new Error("Rate limit exceeded");

  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Unauthorized");

  return { userId: session.user.id };
})
```

**CORS:** UploadThing handles CORS configuration automatically for its own endpoints. If you're building the frontend on a different domain than your API, set `UPLOADTHING_URL` in your environment to your API base URL so UploadThing generates correct callback URLs.

**Monitoring:** Log upload completions and failures to your observability stack. Upload failures are silent from the user's perspective unless you handle `onUploadError` explicitly. Consider sending failed upload metadata to Sentry or LogRocket for debugging.

---

## Pricing Breakdown

UploadThing's pricing in 2026 is structured around storage and bandwidth:

| Plan | Price | Storage | Bandwidth |
|------|-------|---------|-----------|
| **Free** | $0/month | 2 GB | 2 GB/month |
| **Standard** | $10/month | 25 GB | 100 GB/month |
| **Pro** | $40/month | 100 GB | 500 GB/month |
| **Business** | $100/month | 500 GB | 2 TB/month |
| **Overage** | — | $0.02/GB | $0.05/GB |

For most early-stage SaaS apps, the Standard plan at $10/month is the entry point. With 25GB storage and 100GB monthly bandwidth, you can comfortably support thousands of users uploading profile images and documents.

The free tier is genuinely useful for development and small side projects — 2GB of storage covers a lot of prototyping.

Compared to a self-managed S3 + CloudFront setup, UploadThing is more expensive at scale but dramatically cheaper in engineering time. For a solo developer or small team, the math almost always favors UploadThing until you're processing terabytes of user data monthly.

---

## Wrapping Up

UploadThing has earned its place as the default file upload solution for the Next.js ecosystem. The typesafe `FileRouter` pattern eliminates an entire class of bugs, the middleware auth integration is clean, and the zero-config CDN story means you're shipping in hours instead of days.

The limitations are real — no private URLs, limited transformation capability, and vendor lock-in if you go all-in. For apps where those constraints matter, Cloudflare R2 or AWS S3 are still worth the setup cost. But for the majority of Next.js applications that need reliable, authenticated file uploads without infrastructure overhead, UploadThing is the right call.

Start with the App Router setup above, protect your endpoints with middleware, and save the file metadata to your database in `onUploadComplete`. That pattern covers 90% of what any production app needs.

For deeper state management patterns around handling upload state and caching file URLs, the [React Query + Zustand patterns guide](/blog/react-query-zustand-server-client-state-pattern) covers exactly how to structure your client-side state after UploadThing returns the completed file metadata.
