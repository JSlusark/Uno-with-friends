# Socket.IO Authentication — Why & How

## Why Auth Exists at All

When a player connects via WebSocket and says "play card #3", the server needs to know **who** that player is. Without auth, anyone could send `play_card` claiming to be any player in any room.

We need to **authenticate** the player and **authorize** their actions. This is done by sending a **JWT token** during the Socket.IO handshake, which the server verifies and uses to identify the player.



---

## Three Ways to Pass a Token to Socket.IO

Socket.IO connections begin as an **HTTP handshake** before upgrading to WebSocket. During that HTTP request, you can send credentials three ways:

### 1. Cookie (what we use now)

```
Browser sends automatically:
  GET /socket.io/?EIO=4&transport=polling
  Cookie: token=eyJhbGciOi...

Server reads:
  socket.handshake.headers.cookie
```

| Pros | Cons |
|------|------|
| ✅ Browser sends it **automatically** — zero client code | ❌ Vulnerable to **CSRF** if not using `SameSite` |
| ✅ Works even if JS is blocked during page load | ❌ Cross-origin requires CORS + `withCredentials` |
| ✅ HttpOnly flag prevents JS from reading it (XSS protection) | ❌ Harder to debug (can't `console.log` it) |
| ✅ Natural fit: same cookie used for REST + WebSocket | ❌ In React Native / non-browser clients, no automatic cookie jar |

### 2. Handshake Auth (explicit)

```
Client code:
  const socket = io({
    auth: { token: "eyJhbGci..." }
  });

Server reads:
  socket.handshake.auth.token
```

| Pros | Cons |
|------|------|
| ✅ **Explicit** — you see exactly what's sent | ❌ Must manually pass token in every client connection |
| ✅ Works everywhere: browser, React Native, CLI | ❌ Token visible in JS memory (not HttpOnly) |
| ✅ No CORS cookie complexity | ❌ If token is stored in localStorage, it's vulnerable to XSS |
| ✅ Easy to debug | ❌ Token refresh requires reconnection |

### 3. Authorization Header

```
Client code:
  const socket = io({
    extraHeaders: {
      Authorization: "Bearer eyJhbGci..."
    }
  });

Server reads:
  socket.handshake.headers.authorization
```

| Pros | Cons |
|------|------|
| ✅ Follows REST convention — same as `Authorization: Bearer` | ❌ Browser doesn't send it automatically |
| ✅ Standardized format | ❌ Same XSS concerns as handshake auth |
| | ❌ Slightly more verbose |

---

## What We Do (Cookie) — Why It's Fine

We already have `@fastify/cookie` + `@fastify/jwt` setting an **HttpOnly cookie** called `token` when the user logs in via REST. The browser automatically attaches it to every request to our domain — including the Socket.IO handshake. This means:

1. User logs in → server sets `Set-Cookie: token=...; HttpOnly; SameSite=Lax`
2. Browser stores it
3. Page loads, `io()` connects → browser sends `Cookie: token=...` automatically
4. Socket middleware reads it, verifies the JWT, attaches user identity

**One code path, two transports.** That's the main benefit.

---

## Our Implementation (Cookie-First with Fallbacks)

Our middleware tries cookie first, then `handshake.auth.token`, then `Authorization` header:

```ts
const token =
  cookies.token ||                                          // ← cookie (primary)
  socket.handshake.auth?.token ||                           // ← explicit fallback
  (socket.handshake.headers.authorization || "")
    .replace(/^Bearer\s+/i, "");                            // ← header fallback
```

This is the ideal approach: **cookie-first for the browser client, with fallbacks for non-browser clients** (React Native, CLI tools, tests).
