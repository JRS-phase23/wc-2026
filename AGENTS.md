<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Development Standards — Enforce Proactively

The user has explicitly requested that best practices be surfaced during every session. Before completing any task, scan for violations below and raise them. Do not wait to be asked.

## Environment & Safety
- **ALWAYS develop against the DEV Supabase project**, never production. If `.env.local` points at the prod project URL, flag it before writing any code.
- **NEVER commit `.env.local`** — verify `.gitignore` covers it before any commit.
- **Test ALL migrations on dev first.** Never push a new migration file without instructing the user to run it on dev before production.
- **Service role key** must never appear in client-side code or be committed to git.
- Suggest **feature branches** for any non-trivial change. Remind if working directly on `main`.

## Database
- Every schema change needs a **new numbered migration file** — never edit existing ones.
- Every new table needs **RLS enabled + policies** — flag if missing.
- Multi-step DB operations should use **transactions** or at minimum explicit error rollback.
- Flag obvious **missing indexes** on foreign keys or frequently filtered columns.

## Code Quality
- Run `npx tsc --noEmit` before every commit. Never ship with TypeScript errors.
- Run `npm run build` to catch Next.js-specific issues before pushing.
- Every async operation in the UI needs a **loading state and error state**.
- Avoid **N+1 queries** — flag sequential DB calls inside loops; suggest `Promise.all` or joins.

## Security
- Always use `auth.uid()` in RLS — never trust a client-supplied user ID in a policy.
- Validate all user inputs **server-side**, not just client-side.
- New public pages must be intentional — flag any route that bypasses auth unexpectedly.

## UX / Product
- Every destructive action (delete, unsubmit, etc.) should have a **confirmation step**.
- Empty states should always explain what to do next, not just say "nothing here."
- Error messages shown to users should be human-readable, not raw Supabase error strings.
