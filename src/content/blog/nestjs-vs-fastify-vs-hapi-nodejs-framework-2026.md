---
title: "NestJS vs Fastify vs Hapi: Node.js Framework Comparison 2026"
description: "A deep technical comparison of NestJS, Fastify, and Hapi for Node.js backend development in 2026 — covering architecture, performance benchmarks, TypeScript support, ecosystem, and when to use each."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["nestjs", "fastify", "hapi", "nodejs", "backend", "framework", "typescript", "rest-api", "comparison"]
readingTime: "16 min read"
---

Choosing the wrong Node.js framework means rewriting your backend six months later. NestJS, Fastify, and Hapi each occupy a distinct architectural philosophy — and picking the right one depends on your team size, performance requirements, and how much structure you need out of the box.

This guide gives you the technical depth to make that decision confidently in 2026.

---

## Quick Comparison: At a Glance

| | **NestJS** | **Fastify** | **Hapi** |
|---|---|---|---|
| **Architecture** | Opinionated MVC + DI | Minimal, plugin-based | Enterprise, config-driven |
| **Performance** | ~30k req/sec | ~80k req/sec | ~25k req/sec |
| **TypeScript** | First-class (built-in) | Optional | Optional |
| **Learning Curve** | High | Low–Medium | Medium–High |
| **Ecosystem** | Rich (NestJS modules) | Plugin ecosystem | Hapi plugin system |
| **Best For** | Large enterprise apps | High-throughput APIs | Regulated industries |
| **License** | MIT | MIT | BSD-3 |
| **GitHub Stars** | 65k+ | 32k+ | 14k+ |

---

## NestJS: Enterprise Architecture at Scale

NestJS is a full-featured framework built on top of Express (or Fastify) that brings Angular-inspired architecture to the backend. It's opinionated, structured, and designed for teams building large, maintainable applications.

### Core Architecture

NestJS is built around three core concepts: **Modules**, **Controllers**, and **Providers** (services, repositories, etc.). Dependency injection is first-class — the framework manages the instantiation and lifecycle of your services.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [DatabaseModule, UserModule],
})
export class AppModule {}
```

```typescript
// user.controller.ts
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }
}
```

```typescript
// user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(dto);
    return this.userRepository.save(user);
  }
}
```

### NestJS Key Features

**Decorators everywhere.** NestJS leans heavily on TypeScript decorators for routing, validation, guards, interceptors, and more. This is familiar if you come from Angular or Spring Boot.

**Built-in pipes and validation.** Combined with `class-validator` and `class-transformer`, NestJS gives you request validation with a DTO + decorator pattern that scales cleanly:

```typescript
// create-user.dto.ts
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

**Interceptors and middleware.** Logging, caching, response transformation — NestJS has built-in abstractions for all of these. You write once and apply globally or per-route with decorators.

**CLI and code generation.** The NestJS CLI generates boilerplate modules, services, and controllers. This is a significant productivity boost on large teams.

### NestJS Weaknesses

- **Boilerplate-heavy.** A simple CRUD endpoint requires four files (module, controller, service, DTO). For small APIs, this feels excessive.
- **Performance overhead.** The DI container and decorator-heavy approach adds ~15–20% overhead vs raw Fastify. Not a problem for most apps, but measurable.
- **Steep learning curve.** Angular developers adapt quickly; everyone else needs time to understand modules, providers, scopes, and the DI system.

---

## Fastify: Maximum Performance, Minimal Opinion

Fastify is a low-overhead, high-performance web framework. Where NestJS gives you a full architecture, Fastify gives you a fast engine and a plugin system. You build the structure yourself.

### Core Architecture

Fastify's plugin system is its defining feature. Everything — routes, schemas, hooks, decorators — is encapsulated in plugins with automatic dependency injection and scope isolation.

```javascript
// Basic Fastify server
import Fastify from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { Type } from '@sinclair/typebox';

const app = Fastify({ logger: true })
  .withTypeProvider<TypeBoxTypeProvider>();

// Plugin encapsulation
app.register(async function userRoutes(fastify) {
  fastify.get(
    '/users/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        response: {
          200: Type.Object({
            id: Type.String(),
            name: Type.String(),
            email: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const user = await getUserById(id);
      return user;
    }
  );
});

await app.listen({ port: 3000 });
```

### JSON Schema Validation

Fastify uses JSON Schema for input validation and serialization. This is a key reason for its performance — schema-based serialization is significantly faster than `JSON.stringify()`.

```javascript
const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', enum: ['admin', 'user'], default: 'user' },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
};

app.post('/users', { schema: createUserSchema }, async (request, reply) => {
  const user = await createUser(request.body);
  reply.code(201).send(user);
});
```

### Plugin System

Fastify plugins are scoped — a plugin registered in a child context doesn't leak into the parent or sibling contexts. This makes large applications modular without global state pollution:

```javascript
// auth plugin — decorates request with user
app.register(async function authPlugin(fastify) {
  fastify.addHook('preHandler', async (request, reply) => {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });

    try {
      request.user = await verifyJwt(token);
    } catch {
      reply.code(401).send({ error: 'Invalid token' });
    }
  });
});

// Protected routes — only inside this scope
app.register(async function protectedRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/profile', async (request) => {
    return { user: request.user };
  });
});
```

### Fastify Benchmarks (2026)

In simple JSON serialization benchmarks on Node.js 22 LTS:

| Framework | Req/sec | Latency (p99) |
|---|---|---|
| Raw Node.js http | ~100k | ~2ms |
| **Fastify 5** | ~80k | ~3ms |
| Hono (Node adapter) | ~75k | ~3ms |
| Express 5 | ~35k | ~5ms |
| NestJS (Fastify adapter) | ~55k | ~4ms |
| NestJS (Express adapter) | ~28k | ~6ms |
| Hapi | ~22k | ~7ms |

These numbers vary with workload. Under real-world conditions (DB queries, auth, validation), the gap narrows significantly.

### Fastify Weaknesses

- **No built-in structure.** You define your own folder structure, service patterns, and dependency injection. This is fine for small teams but can lead to inconsistency at scale.
- **TypeScript support is improving but still plugin-by-plugin.** Not all community plugins have good typings.
- **Smaller ecosystem** than NestJS for enterprise concerns (CQRS, event sourcing, Swagger codegen, etc.).

---

## Hapi: Enterprise-Grade, Config-Driven

Hapi was built by Walmart Labs to handle Black Friday traffic. It's stable, security-conscious, and designed for large teams in regulated industries. Hapi's philosophy: **configuration over convention**.

### Core Architecture

Unlike NestJS (decorators) or Fastify (functions), Hapi is config-driven. Routes, validation, authentication, and caching are defined through configuration objects:

```javascript
import Hapi from '@hapi/hapi';
import Joi from 'joi';

const server = Hapi.server({
  port: 3000,
  host: 'localhost',
  routes: {
    validate: {
      failAction: async (request, h, err) => {
        throw err; // return validation errors to client
      },
    },
  },
});

// Route registration
server.route([
  {
    method: 'GET',
    path: '/users/{id}',
    options: {
      validate: {
        params: Joi.object({
          id: Joi.number().integer().min(1).required(),
        }),
      },
      auth: 'jwt',
      tags: ['api'],
      description: 'Get user by ID',
    },
    handler: async (request, h) => {
      const user = await getUserById(request.params.id);
      if (!user) return h.response({ error: 'Not found' }).code(404);
      return h.response(user).code(200);
    },
  },
  {
    method: 'POST',
    path: '/users',
    options: {
      validate: {
        payload: Joi.object({
          name: Joi.string().min(1).max(100).required(),
          email: Joi.string().email().required(),
          role: Joi.string().valid('admin', 'user').default('user'),
        }),
      },
      auth: false, // public endpoint
    },
    handler: async (request, h) => {
      const user = await createUser(request.payload);
      return h.response(user).code(201);
    },
  },
]);
```

### Hapi Authentication System

Hapi's auth system is one of its strongest features. Multiple authentication strategies can be defined, each with different scopes:

```javascript
import hapiAuthJwt2 from 'hapi-auth-jwt2';

await server.register(hapiAuthJwt2);

server.auth.strategy('jwt', 'jwt', {
  key: process.env.JWT_SECRET,
  validate: async (decoded, request) => {
    const user = await getUserById(decoded.id);
    if (!user) return { isValid: false };
    return { isValid: true, credentials: user };
  },
  verifyOptions: { algorithms: ['HS256'] },
});

server.auth.default('jwt');
```

### Joi Validation (Native Integration)

Hapi was built alongside Joi, which remains the gold standard for JavaScript object schema validation. The integration is seamless:

```javascript
server.route({
  method: 'POST',
  path: '/products',
  options: {
    validate: {
      payload: Joi.object({
        name: Joi.string().required(),
        price: Joi.number().positive().precision(2).required(),
        category: Joi.string().valid('electronics', 'clothing', 'food').required(),
        inventory: Joi.number().integer().min(0).default(0),
        tags: Joi.array().items(Joi.string()).max(10),
      }),
      headers: Joi.object({
        'content-type': Joi.string().valid('application/json').required(),
      }).unknown(),
    },
    response: {
      schema: Joi.object({
        id: Joi.string().uuid().required(),
        name: Joi.string().required(),
        price: Joi.number().required(),
      }),
      modify: true, // strip unknown fields from response
    },
  },
  handler: async (request, h) => {
    return createProduct(request.payload);
  },
});
```

### Hapi Weaknesses

- **Lowest throughput** of the three frameworks. Acceptable for most enterprise apps, but not for high-frequency trading or real-time data pipelines.
- **Hapi-specific plugins only.** Express and Fastify plugins don't work with Hapi. The ecosystem is smaller.
- **Verbose configuration.** Routes with full validation, auth, and docs can be 40+ lines. This is intentional (traceability) but slows development.
- **Less active community** compared to NestJS or Fastify. Walmart's original team moved on, though community maintainers keep it current.

---

## Side-by-Side: Technical Deep Dive

### Middleware / Hooks Lifecycle

```
NestJS Request Lifecycle:
Request → Middleware → Guards → Interceptors → Pipes → Controller → Interceptors → Response

Fastify Request Lifecycle:
onRequest → preParsing → preValidation → preHandler → handler → preSerialization → onSend → onResponse

Hapi Request Lifecycle:
onPreAuth → onCredentials → onPostAuth → onPreHandler → handler → onPostHandler → onPreResponse
```

### Dependency Injection

**NestJS:** Built-in, class-based DI. Services are singletons by default.

```typescript
@Injectable()
class EmailService {
  sendWelcome(email: string) { /* ... */ }
}

@Controller('users')
class UserController {
  constructor(private email: EmailService) {}
  // NestJS injects EmailService automatically
}
```

**Fastify:** No built-in DI. Use `fastify-plugin` + decorators or bring your own (Awilix, tsyringe):

```javascript
import fp from 'fastify-plugin';

export default fp(async function emailPlugin(fastify) {
  fastify.decorate('email', {
    sendWelcome: async (to) => { /* ... */ },
  });
});

// In routes
app.post('/users', async (request) => {
  await request.server.email.sendWelcome(request.body.email);
});
```

**Hapi:** Plugin-based, manual. Services are shared via server state or `server.app`:

```javascript
server.app.emailService = {
  sendWelcome: async (to) => { /* ... */ },
};

// In handler
handler: async (request, h) => {
  await request.server.app.emailService.sendWelcome(request.payload.email);
}
```

### OpenAPI / Swagger Documentation

| | NestJS | Fastify | Hapi |
|---|---|---|---|
| **Integration** | `@nestjs/swagger` | `@fastify/swagger` | `hapi-swagger` |
| **Approach** | Decorator-based | Schema-based | Config-based |
| **Code-gen support** | Yes | Yes | Limited |
| **Effort** | Low (decorators auto-generate) | Low (schema reuse) | Medium (manual tags) |

---

## When to Choose Each Framework

### Choose NestJS when:
- You're building a **large enterprise application** with 5+ backend developers
- Your team has Angular experience or prefers a structured, opinionated architecture
- You need built-in support for **microservices, CQRS, event sourcing**
- TypeScript is mandatory and you want decorators for everything
- You want a **monorepo-friendly** structure with code generation

### Choose Fastify when:
- **Raw performance is a priority** (IoT backends, high-frequency APIs, real-time services)
- You prefer a **minimal core** and want to choose your own tools (ORMs, DI, caching)
- Your team is small and experienced enough to enforce their own conventions
- You're building **serverless functions** or microservices where cold start time matters
- You want the best Node.js HTTP performance without dropping to raw `http` module

### Choose Hapi when:
- You're building for **regulated industries** (finance, healthcare, government) where auditability matters
- Your organization requires strict **input/output validation** with Joi schemas
- You need proven **battle-tested stability** — Hapi's API has been stable for years
- Your team prefers **configuration over code** for security and traceability
- You're maintaining a legacy Hapi codebase and need to extend it

---

## 2026 Ecosystem Update

### NestJS 11 (2026)
NestJS 11 ships with improved support for Node.js 22 LTS, better ESM compatibility, and a new `@nestjs/mcp` module for Model Context Protocol integration — relevant if you're building AI agent backends.

### Fastify 5 (2025/2026)
Fastify 5 is the current stable release with full ESM support, improved TypeBox integration for end-to-end type safety, and better compatibility with the WHATWG Fetch API. The `@fastify/vite` plugin enables SSR applications.

### Hapi 21 (2026)
Hapi 21 maintains stability with Node.js 22 support. No breaking changes since v20. The team focuses on security patches and compatibility rather than new features — which is exactly what its target audience wants.

---

## Migration Considerations

### From Express to Fastify
The closest migration path. Fastify's API is familiar, middleware maps to hooks, and most Express plugins have Fastify equivalents. Expect 1–2 weeks for a medium-sized service.

### From Express to NestJS
Requires architectural changes. You'll restructure around modules, controllers, and services. Budget 2–4 weeks per service plus team training time.

### From Hapi to NestJS
The largest conceptual shift — from config-driven to decorator-driven. Joi validation stays (NestJS supports it), but authentication, plugins, and lifecycle hooks all change.

---

## Final Verdict

**NestJS** wins for enterprise teams that prioritize maintainability, structure, and developer onboarding speed. The performance overhead is acceptable for 99% of applications, and the ecosystem (Swagger, TypeORM, Prisma, Redis, queues) is unmatched.

**Fastify** wins for performance-sensitive services, microservices, and teams that prefer building their own architecture. It's the right choice when you're hitting the limits of Express and don't want NestJS's overhead.

**Hapi** wins for stability-first organizations — teams building for regulated industries where the framework hasn't changed its API in years is a feature, not a bug.

For most new projects in 2026: start with **NestJS** if you have a team, **Fastify** if you're a solo developer or small team who knows what they're doing. Only choose **Hapi** if you have specific enterprise or compliance requirements that push you there.
