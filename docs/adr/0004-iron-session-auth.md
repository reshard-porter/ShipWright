# 4. Encrypted cookie sessions (iron-session) with email and password

**Status:** accepted

## Context
The app needs accounts with roles. A third-party auth provider would add external setup (OAuth apps, secrets) just to run the demo.

## Decision
Use iron-session (the approach shown in the Next.js Cache Components auth guide), storing only the `userId` in an encrypted, httpOnly, SameSite=Lax cookie. Hash passwords with bcrypt. When the email doesn't exist, sign-in still compares against a dummy hash, so response timing doesn't reveal which emails are registered.

## Consequences
- The demo runs with nothing to configure beyond a secret.
- Roles are read from the database on every write, never trusted from the cookie.
- Not yet built: rate limiting, password reset, OAuth. These are noted in the README as next steps.
