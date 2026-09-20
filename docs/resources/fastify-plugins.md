# Fastify Plugins
Resource: https://fastify.dev/docs/latest/Reference/Plugins/

## What Are Fastify Plugins?

A plugin in Fastify is a **self-contained piece of functionality** that you register once and it becomes available everywhere. Think of it as "installing a capability into your server."

---

## How They Work

```ts
// 1. You define a plugin (encapsulated logic)
const prismaPlugin = fp(async (app) => {
  const prisma = new PrismaClient();
  app.decorate("prisma", prisma);   // ← makes app.prisma available everywhere
});

// 2. You register it once in server.ts
await app.register(prismaPlugin);

// 3. Now EVERY route, handler, and middleware can use it
app.prisma.user.findUnique(...)     // ← available anywhere
```

**`decorate`** is used to attach something to the Fastify instance so every part of your app can reach it. That something can be a database client, an auth guard, a rate limiter, or anything else you want to share across your app.

---

## Our 4 Plugins — What Each One Does

| Plugin | Registers | What it decorates | Where it's used |
|--------|-----------|-------------------|-----------------|
| `prisma.plugin.ts` | `PrismaClient` | `app.prisma` | Every route, every service, the socket auth middleware — anything that touches the DB |
| `auth.plugin.ts` | `@fastify/jwt` + `@fastify/cookie` | `app.auth` (a preHandler guard) | REST routes: `{ preHandler: [app.auth] }` protects endpoints |
| `rate-limit.plugin.ts` | `@fastify/rate-limit` | Nothing — it's a hook | Routes use `config: { rateLimit: { max: 10 } }` to set per-route limits |
| `multipart.plugin.ts` | `@fastify/multipart` | Nothing — adds `request.file()` | The avatar upload route: `const file = await request.file()` |

---

## The Mental Model

```
┌─────────────────────────────────────────────┐
│                 Fastify App                  │
│                                             │
│  Plugins add capabilities:                  │
│  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
│  │  prisma  │ │   jwt    │ │ rate-limit │  │
│  │  (DB)    │ │ (auth)   │ │ (throttle) │  │
│  └──────────┘ └──────────┘ └────────────┘  │
│                                             │
│  Routes use those capabilities:             │
│  "I need DB → app.prisma"                  │
│  "I need auth → app.auth"                   │
│  "I need rate limit → config.rateLimit"     │
└─────────────────────────────────────────────┘
```

---

## Why Plugins Instead of Just Importing?

**Without plugins**, you'd have to pass `prisma` and `jwt` around manually to every route:

```ts
// ❌ Without plugins — you pass everything manually
authRoutes(app, prisma, jwt, rateLimiter)
userRoutes(app, prisma, jwt)
profileRoutes(app, prisma, jwt, multipart)
```

**With plugins**, everything is on `app` — routes just use `app.prisma`, `app.jwt`, `app.auth`:

```ts
// ✅ With plugins — routes are self-sufficient
await app.register(authRoutes, { prefix: "/api/auth" })
await app.register(userRoutes, { prefix: "/api/users" })
```

It's Fastify's version of **dependency injection**.
