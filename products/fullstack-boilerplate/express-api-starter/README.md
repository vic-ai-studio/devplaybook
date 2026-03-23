# Express API Starter

A production-ready Express.js REST API with JWT authentication, Prisma ORM, Zod validation, rate limiting, and Docker support.

## Tech Stack

- **Runtime**: Node.js 20 + Express 4
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (access + refresh token rotation)
- **Validation**: Zod
- **Security**: Helmet, CORS, rate limiting
- **Deployment**: Docker + Docker Compose

## Getting Started

### Option 1: Docker Compose (Recommended)

```bash
cp .env.example .env
docker-compose up -d
```

The API will be available at http://localhost:3001

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start PostgreSQL (if not using Docker)
# Update DATABASE_URL in .env

# Push schema to database
npx prisma db push

# Start dev server with hot reload
npm run dev
```

## API Endpoints

### Health Check

```
GET /health
```

### Authentication

```
POST /api/auth/register    # Create account
POST /api/auth/login       # Sign in
POST /api/auth/refresh     # Refresh access token
POST /api/auth/logout      # Invalidate session
POST /api/auth/logout-all  # Invalidate all sessions
GET  /api/auth/me          # Get current user
```

### Users (authenticated, admin for create/delete)

```
GET    /api/users          # List users (paginated, filterable)
GET    /api/users/:id      # Get user by ID
POST   /api/users          # Create user (admin only)
PATCH  /api/users/:id      # Update user
DELETE /api/users/:id      # Delete user (admin only)
```

## Authentication Flow

1. **Register/Login** returns an `accessToken` (15 min) and `refreshToken` (7 days)
2. Include the access token in requests: `Authorization: Bearer <token>`
3. When the access token expires, call `/auth/refresh` with your refresh token
4. Refresh tokens are rotated on each use (old token invalidated, new one issued)

### Example

```bash
# Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","password":"Password123"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123"}'

# Access protected route
curl http://localhost:3001/api/users \
  -H "Authorization: Bearer <access_token>"

# Refresh token
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
```

## Project Structure

```
src/
  index.ts                 # Server entry point
  routes/
    auth.ts                # Auth routes (register, login, refresh, logout)
    users.ts               # CRUD user routes with pagination
  middleware/
    auth.ts                # JWT authentication + role-based access
    validate.ts            # Zod validation middleware
    errorHandler.ts        # Global error handler + AppError class
    rateLimiter.ts         # Rate limiting (general + auth-specific)
  lib/
    prisma.ts              # Prisma client singleton
    jwt.ts                 # JWT token generation + verification
  types/
    index.ts               # TypeScript type definitions
prisma/
  schema.prisma            # Database schema (User, Session)
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Descriptive error message",
  "code": "ERROR_CODE",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

Built-in error handling for:
- Validation errors (Zod) -> 400
- Authentication errors -> 401
- Authorization errors -> 403
- Not found errors -> 404
- Conflict errors (duplicate) -> 409
- Rate limit errors -> 429
- Prisma errors (P2002 duplicate, P2025 not found)
- Unhandled errors -> 500 (details hidden in production)

## Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Auth endpoints: 10 requests per 15 minutes per IP
- Custom limits available via `createLimiter()` utility

## Security Features

- **Helmet**: Sets secure HTTP headers
- **CORS**: Configurable origin whitelist
- **Rate limiting**: Per-route request throttling
- **Password hashing**: bcrypt with 12 rounds
- **JWT rotation**: Refresh tokens are single-use
- **Input validation**: All inputs validated with Zod
- **Error sanitization**: Stack traces hidden in production

## Customization

### Add a new route

1. Create a route file in `src/routes/`
2. Define Zod schemas for request validation
3. Register the route in `src/index.ts`:

```ts
import newRoutes from "./routes/new";
app.use("/api/new", newRoutes);
```

### Add a new database model

1. Add the model to `prisma/schema.prisma`
2. Run `npx prisma db push`
3. Create routes that use the new model

## License

MIT
