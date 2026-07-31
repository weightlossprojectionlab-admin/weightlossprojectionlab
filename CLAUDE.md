- Session: Checking for build errors

## DOSI Code Standard

Four pillars — each with the caveat that keeps it from biting when taken literally.

- **DRY** — Centralize domain logic and validation into shared utilities and custom hooks; build
  composable UI shells over copy-paste blocks.
  - *Caveat (rule-of-three):* Tolerate duplication over a premature or incorrect abstraction — extract
    only after a pattern repeats a third time.
- **Optimize** — Target re-renders by narrowing state and context scope; code-split heavy views.
  - *Caveats:* Optimize where instrumented, never by guess. In Next.js the primary lever is React
    Server Components — fetch on the server and ship less client JavaScript.
- **Single Source** — Maintain one canonical origin for schemas, API contracts, and core state;
  downstream components derive from it.
  - *Caveat:* Optimistic/local copies are permitted but must reconcile back to the canonical origin
    (Firestore) — e.g. the notes component does an optimistic append, then a reload reads Firestore back.
- **Semantic Intent** — File paths, folders, and names mirror the domain; explicit types;
  self-documenting code over dense abstractions.
- **Config-driven behavior** — Phase definitions, permission schemas, and structural rules live in ONE
  constants/config module (e.g. `PREDEFINED_DUTIES` in `types/household-duties.ts`), never scattered
  across components.
