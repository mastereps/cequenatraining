# CLAUDE.md

## Project layout

- `server/` — the real backend. Express 4 + PostgreSQL, ESM (`type: "module"`). Runs on port 5001.
- `webinar/` — React 19 + TS + Vite + Tailwind v4 frontend. Vite proxies `/api` → `localhost:5001`.
- `webinar/server/` — **legacy duplicate wrappers. Not the backend.** Never edit this to fix backend behavior; use `server/`.
- Root `package.json` is vestigial. Install and run each side separately.

## Things that are easy to get wrong here

- **Schema lives in two places.** `fullstack_testv10.sql` is a stale snapshot; the current schema is that dump *plus* everything in `server/migrations/`. Never assume the dump is current.
- **`server/server.js` is two codebases.** Books, cart, contact, and events are inline route handlers; auth/webinars/payments/content use routes → controllers → services. New work follows the layered pattern.
- **Email never sends in the request path.** Requests insert into `email_outbox`; `server/workers/emailOutboxWorker.js` polls and sends. The contact form is the one exception.
- **Auth is a hand-rolled signed cookie**, not JWT. `attachAuthUser` parses cookies manually (no `cookie-parser`). Frontend fetches need `credentials: "include"`.
- **Commerce is built but flag-gated off.** `CART_CHECKOUT_ENABLED = false` hides the cart/PayMongo checkout path. The code works; don't treat it as dead.
- **Content sections degrade to hardcoded defaults.** `sectionRegistry.tsx` falls back to `DEFAULT_ORDER` and each component falls back to bundled assets when a field is empty. Preserve that fallback when editing section components — it's what keeps the site up if the DB is unreachable.

## Commands

```
cd server   && npm run dev     # backend :5001
cd webinar  && npm run dev     # frontend
cd server   && npm test        # node --test
cd webinar  && npm test        # vitest
cd webinar  && npm run build   # tsc -b && vite build
```

## Skills

On-demand rule sets live in `.claude/skills/`. Invoke `/refactoring` before restructuring `server.js`,
`/legacy-code` when touching untested areas, `/software-design` for new module or API boundaries, and
`/production-readiness` for anything involving the email worker, webhooks, or outbound calls.

---

# Behavioral guidelines

Adapted from [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills).

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
