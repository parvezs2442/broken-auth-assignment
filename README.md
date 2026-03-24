# Broken Authentication Assignment — Bug Fix Submission

## Overview

This repository contains the debugged version of a broken Node.js/Express authentication server. The task was to identify and fix all bugs across the authentication flow so that a user can:

1. Login to receive a session ID and OTP
2. Verify the OTP to receive a session cookie
3. Exchange the session cookie for a JWT access token
4. Access a protected route using the JWT

---

## Bugs Found & Fixed

### Bug 1 — `utils/tokenGenerator.js`: Empty catch block

**Problem:**
The `catch` block was completely empty. When `getSecretFromDB()` threw an error (e.g. due to a missing `APPLICATION_SECRET` env var), the error was silently swallowed and the function returned `undefined` instead of a token. This made failures completely invisible to the caller.

**Fix:**
Re-throw the error with a meaningful message so the caller knows what went wrong.

```js
// Before
} catch (error) {
  // THE BUG: Empty catch block. Error is swallowed and undefined is returned.
}

// After
} catch (error) {
  throw new Error(`Token generation failed: ${error.message}`);
}
```

---

### Bug 2 — `middleware/logger.js`: Missing `next()`

**Problem:**
The logger middleware never called `next()`. In Express, every middleware must either send a response or call `next()` to pass control to the next middleware. Without it, every incoming request would hang indefinitely after being logged.

**Fix:**
Add `next()` at the end of the middleware function.

```js
// Before
  console.log(`${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
  });
};

// After
  console.log(`${req.method} ${req.url} -> ${res.statusCode} (${duration}ms)`);
  });
  next(); // ← ADDED
};
```

---

### Bug 3 — `middleware/auth.js`: Missing `next()` after token verification

**Problem:**
After successfully verifying the JWT and setting `req.user`, the middleware never called `next()`. This meant that even with a valid token, the request would hang and never reach the protected route handler.

**Fix:**
Add `next()` after setting `req.user`.

```js
// Before
    const decoded = jwt.verify(token.replace("Bearer ", ""), secret);
    req.user = decoded;
  } catch (error) {

// After
    const decoded = jwt.verify(token.replace("Bearer ", ""), secret);
    req.user = decoded;
    next(); // ← ADDED
  } catch (error) {
```

---

### Bug 4 — `server.js`: `cookieParser()` not registered as middleware

**Problem:**
`cookie-parser` was imported at the top of `server.js` but never added to the Express middleware stack. Without it, `req.cookies` is always `undefined`, so reading `req.cookies.session_token` in the `/auth/token` endpoint would always fail.

**Fix:**
Register `cookieParser()` in the middleware stack.

```js
// Before
app.use(requestLogger);
app.use(express.json());

// After
app.use(requestLogger);
app.use(express.json());
app.use(cookieParser()); // ← ADDED
```

---

### Bug 5 — `server.js`: `/auth/token` reading session from wrong source

**Problem:**
The `/auth/token` endpoint was trying to read the session ID from the `Authorization` header (`req.headers.authorization`). However, the session ID is stored as a cookie (`session_token`) after OTP verification in Task 2. Reading the wrong source always resulted in an `Invalid session` error.

**Fix:**
Read the session ID from the cookie instead.

```js
// Before
const token = req.headers.authorization;
const session = loginSessions[token.replace("Bearer ", "")];

// After
const sessionId = req.cookies.session_token;
const session = loginSessions[sessionId];
```

---

## Authentication Flow (After Fix)

```
POST /auth/login
  → Returns: loginSessionId + logs OTP to console

POST /auth/verify-otp  { loginSessionId, otp }
  → Returns: "OTP verified" + sets session_token cookie

POST /auth/token  (with session_token cookie)
  → Returns: { access_token: <JWT> }

GET /protected  (with Authorization: Bearer <JWT>)
  → Returns: { message: "Access granted", user: {...}, success_flag: "FLAG-..." }
```

---

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Create a .env file in the project root
echo "APPLICATION_SECRET=supersecretkey123" >> .env
echo "JWT_SECRET=default-secret-key" >> .env

# 3. Start the server
npm start
```

Server runs at: `http://localhost:3000`

---

## Test Commands

Run these in order. Replace values from previous responses as instructed.

```bash
# Task 1: Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"password123"}'

# Task 2: Verify OTP (replace loginSessionId and otp from Task 1 output/logs)
curl -c cookies.txt -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"loginSessionId":"<loginSessionId>","otp":"<otp_from_logs>"}'

# Task 3: Get JWT (uses cookie from Task 2)
curl -b cookies.txt -X POST http://localhost:3000/auth/token

# Task 4: Access protected route (replace <jwt> with token from Task 3)
curl -H "Authorization: Bearer <jwt>" http://localhost:3000/protected
```

---

## Key Concepts Demonstrated

- **Express middleware chain**: Every middleware must call `next()` or send a response — missing `next()` silently breaks the entire request chain.
- **Cookie-based sessions**: Session data passed between requests via `httpOnly` cookies, not request bodies or headers.
- **JWT authentication**: Stateless token-based auth using `jsonwebtoken`, signed with a secret and verified in middleware.
- **Error propagation**: Empty catch blocks hide failures — errors should always be re-thrown or handled explicitly.
- **Environment variables**: Secrets like `JWT_SECRET` and `APPLICATION_SECRET` must never be hardcoded; loaded via `.env`.

---

## Files Changed

| File | Change |
|---|---|
| `utils/tokenGenerator.js` | Re-throw error in catch block |
| `middleware/logger.js` | Added `next()` |
| `middleware/auth.js` | Added `next()` after token verify |
| `server.js` | Registered `cookieParser()` middleware |
| `server.js` | Fixed `/auth/token` to read from `req.cookies.session_token` |
"# brokrn-auth-assignment" 
