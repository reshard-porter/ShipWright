# 1. Server Actions for mutations instead of REST endpoints

**Status:** accepted

## Context
Every mutation in the app comes from our own UI. We need type safety from form to database, progressive enhancement for forms, and invalidation of cached reads.

## Decision
Use Server Actions for all writes. Each action follows the same shape: authorize (`requireActor`), validate (Zod), call a service, then `updateTag`. They return a typed `ActionResult`, never a thrown error, through `safeAction`.

## Consequences
- No hand-written fetch layer or duplicated request/response types.
- Forms work before JavaScript loads (`useActionState` + `<form action>`).
- Business logic lives in services rather than actions, so adding a public REST API later only means writing thin route handlers that call the same services.
